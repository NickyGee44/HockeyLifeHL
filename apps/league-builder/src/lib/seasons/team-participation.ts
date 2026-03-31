import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@hockey-life/database/types';

type DbClient = SupabaseClient<Database>;

type TeamPreferenceSeedRow = Pick<
  Database['public']['Tables']['team_schedule_preferences']['Row'],
  | 'team_id'
  | 'home_venue_id'
  | 'seniority_level'
  | 'preferred_game_times'
  | 'avoided_game_times'
  | 'preferred_days'
  | 'avoided_days'
  | 'max_late_night_games'
  | 'max_early_morning_games'
  | 'weekend_preference'
  | 'min_hours_between_games'
  | 'notes'
>;

export type SeasonParticipationTeam = Pick<
  Database['public']['Tables']['teams']['Row'],
  | 'id'
  | 'name'
  | 'short_name'
  | 'logo_url'
  | 'primary_color'
  | 'secondary_color'
  | 'division_id'
  | 'home_venue_id'
  | 'status'
>;

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function resolveSeasonParticipationTeamIds(params: {
  seasonPreferenceTeamIds: Array<string | null | undefined>;
  rosterTeamIds: Array<string | null | undefined>;
  registrationTeamIds: Array<string | null | undefined>;
  gameTeamIds: Array<string | null | undefined>;
}): string[] {
  const hardParticipationIds = uniqueIds([
    ...params.rosterTeamIds,
    ...params.registrationTeamIds,
    ...params.gameTeamIds,
  ]);

  if (hardParticipationIds.length > 0) {
    return hardParticipationIds;
  }

  return uniqueIds(params.seasonPreferenceTeamIds);
}

function buildSeedRow(
  leagueId: string,
  seasonId: string,
  teamId: string,
  createdBy: string,
  seed?: TeamPreferenceSeedRow,
  fallbackHomeVenueId?: string | null
): Database['public']['Tables']['team_schedule_preferences']['Insert'] {
  return {
    league_id: leagueId,
    team_id: teamId,
    season_id: seasonId,
    home_venue_id: seed?.home_venue_id ?? fallbackHomeVenueId ?? null,
    seniority_level: seed?.seniority_level ?? 5,
    preferred_game_times: (seed?.preferred_game_times as Json[]) ?? [],
    avoided_game_times: (seed?.avoided_game_times as Json[]) ?? [],
    preferred_days: (seed?.preferred_days as Json[]) ?? [],
    avoided_days: (seed?.avoided_days as Json[]) ?? [],
    max_late_night_games: seed?.max_late_night_games ?? null,
    max_early_morning_games: seed?.max_early_morning_games ?? null,
    weekend_preference: seed?.weekend_preference ?? 0.5,
    min_hours_between_games: seed?.min_hours_between_games ?? 24,
    notes: seed?.notes ?? null,
    created_by: createdBy,
  };
}

export async function getSeasonParticipationTeamIds(
  supabase: DbClient,
  leagueId: string,
  seasonId: string
): Promise<string[]> {
  const [
    seasonPreferenceResult,
    rosterResult,
    registrationResult,
    gameResult,
  ] = await Promise.all([
    supabase
      .from('team_schedule_preferences')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    supabase
      .from('team_rosters')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'active'),
    supabase
      .from('registration_submissions')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .not('team_id', 'is', null)
      .not('submitted_at', 'is', null)
      .in('status', ['pending', 'approved', 'waitlisted']),
    supabase
      .from('games')
      .select('home_team_id, away_team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
  ]);

  return resolveSeasonParticipationTeamIds({
    seasonPreferenceTeamIds: (seasonPreferenceResult.data ?? []).map((row) => row.team_id),
    rosterTeamIds: (rosterResult.data ?? []).map((row) => row.team_id),
    registrationTeamIds: (registrationResult.data ?? []).map((row) => row.team_id),
    gameTeamIds: (gameResult.data ?? []).flatMap((row) => [row.home_team_id, row.away_team_id]),
  });
}

export async function getSeasonParticipationTeams(
  supabase: DbClient,
  leagueId: string,
  seasonId: string
): Promise<SeasonParticipationTeam[]> {
  const teamIds = await getSeasonParticipationTeamIds(supabase, leagueId, seasonId);

  if (teamIds.length === 0) {
    return [];
  }

  const { data } = await supabase
    .from('teams')
    .select('id, name, short_name, logo_url, primary_color, secondary_color, division_id, home_venue_id, status')
    .eq('league_id', leagueId)
    .in('id', teamIds)
    .neq('status', 'inactive')
    .order('name');

  return (data ?? []) as SeasonParticipationTeam[];
}

export async function seedSeasonParticipationTeams(params: {
  supabase: DbClient;
  leagueId: string;
  seasonId: string;
  teamIds: string[];
  createdBy: string;
  sourceSeasonId?: string | null;
}): Promise<{ importedCount: number; skippedCount: number }> {
  const {
    supabase,
    leagueId,
    seasonId,
    teamIds,
    createdBy,
    sourceSeasonId,
  } = params;

  if (teamIds.length === 0) {
    return { importedCount: 0, skippedCount: 0 };
  }

  const dedupedTeamIds = [...new Set(teamIds)];

  const { data: existingSeasonRows } = await supabase
    .from('team_schedule_preferences')
    .select('team_id')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .in('team_id', dedupedTeamIds);

  const existingTeamIds = new Set((existingSeasonRows ?? []).map((row) => row.team_id));
  const missingTeamIds = dedupedTeamIds.filter((teamId) => !existingTeamIds.has(teamId));

  if (missingTeamIds.length === 0) {
    return { importedCount: 0, skippedCount: dedupedTeamIds.length };
  }

  const [
    sourceSeasonRowsResult,
    defaultRowsResult,
    teamsResult,
  ] = await Promise.all([
    sourceSeasonId
      ? supabase
          .from('team_schedule_preferences')
          .select(
            'team_id, home_venue_id, seniority_level, preferred_game_times, avoided_game_times, preferred_days, avoided_days, max_late_night_games, max_early_morning_games, weekend_preference, min_hours_between_games, notes'
          )
          .eq('league_id', leagueId)
          .eq('season_id', sourceSeasonId)
          .in('team_id', missingTeamIds)
      : Promise.resolve({ data: [] as TeamPreferenceSeedRow[], error: null }),
    supabase
      .from('team_schedule_preferences')
      .select(
        'team_id, home_venue_id, seniority_level, preferred_game_times, avoided_game_times, preferred_days, avoided_days, max_late_night_games, max_early_morning_games, weekend_preference, min_hours_between_games, notes'
      )
      .eq('league_id', leagueId)
      .is('season_id', null)
      .in('team_id', missingTeamIds),
    supabase
      .from('teams')
      .select('id, home_venue_id')
      .eq('league_id', leagueId)
      .in('id', missingTeamIds),
  ]);

  const sourceSeasonRows = (sourceSeasonRowsResult.data ?? []) as TeamPreferenceSeedRow[];
  const defaultRows = (defaultRowsResult.data ?? []) as TeamPreferenceSeedRow[];
  const teams = teamsResult.data ?? [];

  const sourceByTeamId = new Map(sourceSeasonRows.map((row) => [row.team_id, row]));
  const defaultByTeamId = new Map(defaultRows.map((row) => [row.team_id, row]));
  const homeVenueByTeamId = new Map(teams.map((team) => [team.id, team.home_venue_id]));

  const rowsToInsert = missingTeamIds.map((teamId) =>
    buildSeedRow(
      leagueId,
      seasonId,
      teamId,
      createdBy,
      sourceByTeamId.get(teamId) ?? defaultByTeamId.get(teamId),
      homeVenueByTeamId.get(teamId) ?? null
    )
  );

  const { error } = await supabase
    .from('team_schedule_preferences')
    .insert(rowsToInsert);

  if (error) {
    throw error;
  }

  return {
    importedCount: rowsToInsert.length,
    skippedCount: dedupedTeamIds.length - rowsToInsert.length,
  };
}
