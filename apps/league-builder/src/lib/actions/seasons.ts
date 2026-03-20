'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { verifyLeagueOwnerAccess } from './permissions';
import {
  getSeasonParticipationTeamIds,
  getSeasonParticipationTeams,
  seedSeasonParticipationTeams,
} from '@/lib/seasons/team-participation';

const isDevelopment = process.env.NODE_ENV !== 'production';

export type SeasonStatus = 'draft' | 'active' | 'playoffs' | 'completed' | 'archived';

export interface SeasonWithCounts {
  id: string;
  name: string;
  status: SeasonStatus | null;
  start_date: string;
  end_date: string | null;
  league_id: string;
  registration_type: string | null;
  created_at: string | null;
  updated_at: string | null;
  teams_count: number;
  games_count: number;
  registrations_count: number;
}

// Valid status transitions: draft→active→playoffs→completed→archived
// Exception: archived→completed (reactivation)
const VALID_TRANSITIONS: Record<SeasonStatus, SeasonStatus[]> = {
  draft: ['active'],
  active: ['playoffs', 'completed'],
  playoffs: ['completed'],
  completed: ['archived'],
  archived: ['completed'],
};

function isValidTransition(from: SeasonStatus, to: SeasonStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all seasons for a league with counts
 */
export async function getLeagueSeasons(leagueId: string, options?: { status?: SeasonStatus }) {
  const supabase = await createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('seasons')
      .select('*')
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data: seasons, error } = await query;

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching league seasons:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch seasons' };
    }

    if (!seasons || seasons.length === 0) {
      return { success: true, data: [] as SeasonWithCounts[] };
    }

    const seasonIds = seasons.map((s: any) => s.id);

    // Get teams count per season (teams linked to the league)
    const { count: teamsCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'active');

    // Get games count per season
    const { data: gameCounts } = await supabase
      .from('games')
      .select('season_id')
      .in('season_id', seasonIds);

    const gameCountMap = new Map<string, number>();
    gameCounts?.forEach(g => {
      gameCountMap.set(g.season_id, (gameCountMap.get(g.season_id) || 0) + 1);
    });

    // Get registrations count per season
    const { data: regCounts } = await supabase
      .from('team_rosters')
      .select('season_id')
      .in('season_id', seasonIds);

    const regCountMap = new Map<string, number>();
    regCounts?.forEach(r => {
      if (r.season_id) {
        regCountMap.set(r.season_id, (regCountMap.get(r.season_id) || 0) + 1);
      }
    });

    const seasonsWithCounts: SeasonWithCounts[] = seasons.map((season: any) => ({
      id: season.id,
      name: season.name,
      status: season.status as SeasonStatus | null,
      start_date: season.start_date,
      end_date: season.end_date,
      league_id: season.league_id,
      registration_type: season.registration_type,
      created_at: season.created_at,
      updated_at: season.updated_at,
      teams_count: teamsCount || 0,
      games_count: gameCountMap.get(season.id) || 0,
      registrations_count: regCountMap.get(season.id) || 0,
    }));

    return { success: true, data: seasonsWithCounts };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getLeagueSeasons:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update season status with transition validation
 */
export async function updateSeasonStatus(seasonId: string, newStatus: SeasonStatus) {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  try {
    // Fetch current season to get league_id and current status
    const { data: season, error: fetchError } = await supabase
      .from('seasons')
      .select('id, league_id, status')
      .eq('id', seasonId)
      .single();

    if (fetchError || !season) {
      return { error: 'Season not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(season.league_id);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized' };
    }

    const currentStatus = (season.status || 'draft') as SeasonStatus;

    if (!isValidTransition(currentStatus, newStatus)) {
      return {
        error: `Cannot change status from "${currentStatus}" to "${newStatus}". Valid transitions from "${currentStatus}": ${VALID_TRANSITIONS[currentStatus]?.join(', ') || 'none'}.`
      };
    }

    const { data: updatedSeason, error: updateError } = await serviceSupabase
      .from('seasons')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', seasonId)
      .select('id, league_id, status')
      .single();

    if (updateError || !updatedSeason) {
      if (isDevelopment) {
        console.error('Error updating season status:', sanitizeErrorForLogging(updateError));
      }
      return { error: updateError?.message || 'Failed to update season status' };
    }

    revalidatePath(`/dashboard/leagues/${season.league_id}/seasons`);
    revalidatePath(`/dashboard/leagues/${season.league_id}`);
    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in updateSeasonStatus:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Archive the most recent completed season for a league.
 * Only seasons in "completed" status can be archived.
 */
export async function archiveLeagueSeason(leagueId: string) {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = createServiceRoleClient();

  // Find the most recent completed season
  const { data: season, error: fetchError } = await supabase
    .from('seasons')
    .select('id, name, status')
    .eq('league_id', leagueId)
    .eq('status', 'completed')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return { error: 'Failed to look up seasons' };
  }

  if (!season) {
    return { error: 'No completed season found to archive. Only completed seasons can be archived.' };
  }

  const { error: updateError } = await supabase
    .from('seasons')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', season.id);

  if (updateError) {
    if (isDevelopment) console.error('Error archiving season:', updateError);
    return { error: 'Failed to archive the season' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}`);
  revalidatePath(`/dashboard/leagues/${leagueId}/seasons`);
  return { success: true, seasonName: season.name };
}

/**
 * Update a season's details
 */
export async function updateSeason(seasonId: string, data: {
  name?: string;
  start_date?: string;
  end_date?: string;
  registration_type?: string;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  games_per_cycle?: number;
  max_players_per_team?: number;
  allow_team_selection?: boolean;
  status?: SeasonStatus;
  playoff_format?: string;
}) {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  try {
    // Fetch current season
    const { data: season, error: fetchError } = await supabase
      .from('seasons')
      .select('id, league_id, status')
      .eq('id', seasonId)
      .single();

    if (fetchError || !season) {
      return { error: 'Season not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(season.league_id);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized' };
    }

    // If status is being changed, validate the transition
    if (data.status && data.status !== season.status) {
      const currentStatus = (season.status || 'draft') as SeasonStatus;
      if (!isValidTransition(currentStatus, data.status)) {
        return {
          error: `Cannot change status from "${currentStatus}" to "${data.status}".`
        };
      }
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.start_date !== undefined) updateData.start_date = data.start_date;
    if (data.end_date !== undefined) updateData.end_date = data.end_date;
    if (data.registration_type !== undefined) updateData.registration_type = data.registration_type;
    if (data.registration_opens_at !== undefined) {
      updateData.registration_opens_at = data.registration_opens_at;
    }
    if (data.registration_closes_at !== undefined) {
      updateData.registration_closes_at = data.registration_closes_at;
    }
    if (data.games_per_cycle !== undefined) updateData.games_per_cycle = data.games_per_cycle;
    if (data.max_players_per_team !== undefined) updateData.max_players_per_team = data.max_players_per_team;
    if (data.allow_team_selection !== undefined) updateData.allow_team_selection = data.allow_team_selection;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.playoff_format !== undefined) updateData.playoff_format = data.playoff_format;

    const { data: updatedSeason, error: updateError } = await serviceSupabase
      .from('seasons')
      .update(updateData)
      .eq('id', seasonId)
      .select('id')
      .single();

    if (updateError || !updatedSeason) {
      if (isDevelopment) {
        console.error('Error updating season:', sanitizeErrorForLogging(updateError));
      }
      return { error: updateError?.message || 'Failed to update season' };
    }

    revalidatePath(`/dashboard/leagues/${season.league_id}/seasons`);
    revalidatePath(`/dashboard/leagues/${season.league_id}/seasons/${seasonId}`);
    revalidatePath(`/dashboard/leagues/${season.league_id}`);
    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in updateSeason:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a season (only if no games exist)
 */
export async function deleteSeason(seasonId: string) {
  const supabase = await createClient();

  try {
    // Fetch current season
    const { data: season, error: fetchError } = await supabase
      .from('seasons')
      .select('id, league_id')
      .eq('id', seasonId)
      .single();

    if (fetchError || !season) {
      return { error: 'Season not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(season.league_id);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized' };
    }

    // Check for existing games
    const { count: gamesCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId);

    if (gamesCount && gamesCount > 0) {
      return { error: 'Cannot delete a season that has games. Archive it instead.' };
    }

    const { error: deleteError } = await supabase
      .from('seasons')
      .delete()
      .eq('id', seasonId);

    if (deleteError) {
      if (isDevelopment) {
        console.error('Error deleting season:', sanitizeErrorForLogging(deleteError));
      }
      return { error: 'Failed to delete season' };
    }

    revalidatePath(`/dashboard/leagues/${season.league_id}/seasons`);
    revalidatePath(`/dashboard/leagues/${season.league_id}`);
    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in deleteSeason:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Clone a season (copy teams, divisions, fee config - NOT games, stats, or registrations)
 */
export async function cloneSeason(seasonId: string, newName: string) {
  const supabase = await createClient();

  try {
    // Fetch source season
    const { data: source, error: fetchError } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single();

    if (fetchError || !source) {
      return { error: 'Season not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(source.league_id);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized' };
    }

    // Create new season with copied settings
    const { data: newSeason, error: insertError } = await supabase
      .from('seasons')
      .insert({
        league_id: source.league_id,
        name: newName,
        status: 'draft' as const,
        start_date: source.start_date,
        end_date: source.end_date,
        registration_type: source.registration_type,
        games_per_cycle: source.games_per_cycle,
        max_players_per_team: source.max_players_per_team,
        allow_team_selection: source.allow_team_selection,
        game_days: source.game_days,
        game_times: source.game_times,
        game_duration_minutes: source.game_duration_minutes,
        period_count: source.period_count,
        period_length_minutes: source.period_length_minutes,
        default_location: source.default_location,
        playoff_format: source.playoff_format,
      })
      .select()
      .single();

    if (insertError || !newSeason) {
      if (isDevelopment) {
        console.error('Error cloning season:', sanitizeErrorForLogging(insertError));
      }
      return { error: 'Failed to clone season' };
    }

    revalidatePath(`/dashboard/leagues/${source.league_id}/seasons`);
    revalidatePath(`/dashboard/leagues/${source.league_id}`);
    return { success: true, data: newSeason };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in cloneSeason:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

export async function importSeasonTeamsFromPreviousSeason(params: {
  leagueId: string;
  seasonId: string;
  sourceSeasonId: string;
  teamIds: string[];
}) {
  const authSupabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  try {
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return { error: 'Authentication required' };
    }

    const access = await verifyLeagueOwnerAccess(params.leagueId);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized' };
    }

    const [{ data: targetSeason }, { data: sourceSeason }] = await Promise.all([
      serviceSupabase
        .from('seasons')
        .select('id, name, league_id')
        .eq('id', params.seasonId)
        .eq('league_id', params.leagueId)
        .maybeSingle(),
      serviceSupabase
        .from('seasons')
        .select('id, name, league_id')
        .eq('id', params.sourceSeasonId)
        .eq('league_id', params.leagueId)
        .maybeSingle(),
    ]);

    if (!targetSeason) {
      return { error: 'Target season not found' };
    }

    if (!sourceSeason) {
      return { error: 'Source season not found' };
    }

    const requestedTeamIds = [...new Set(params.teamIds.filter(Boolean))];
    if (requestedTeamIds.length === 0) {
      return { error: 'Select at least one team to import' };
    }

    const [sourceTeams, currentSeasonTeamIds] = await Promise.all([
      getSeasonParticipationTeams(serviceSupabase, params.leagueId, params.sourceSeasonId),
      getSeasonParticipationTeamIds(serviceSupabase, params.leagueId, params.seasonId),
    ]);

    const sourceTeamIds = new Set(sourceTeams.map((team) => team.id));
    const existingTeamIds = new Set(currentSeasonTeamIds);
    const eligibleTeamIds = requestedTeamIds.filter(
      (teamId) => sourceTeamIds.has(teamId) && !existingTeamIds.has(teamId)
    );

    if (eligibleTeamIds.length === 0) {
      return {
        error: 'All selected teams are already in this season or were not found in the previous season.',
      };
    }

    const result = await seedSeasonParticipationTeams({
      supabase: serviceSupabase,
      leagueId: params.leagueId,
      seasonId: params.seasonId,
      teamIds: eligibleTeamIds,
      createdBy: user.id,
      sourceSeasonId: params.sourceSeasonId,
    });

    revalidatePath(`/dashboard/leagues/${params.leagueId}/seasons`);
    revalidatePath(`/dashboard/leagues/${params.leagueId}/seasons/${params.seasonId}`);
    revalidatePath(`/dashboard/leagues/${params.leagueId}/schedule?season=${params.seasonId}`);
    revalidatePath(`/dashboard/leagues/${params.leagueId}/teams`);
    revalidatePath(`/dashboard/leagues/${params.leagueId}/teams-divisions`);

    return {
      success: true,
      data: {
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
        sourceSeasonName: sourceSeason.name,
        targetSeasonName: targetSeason.name,
      },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error(
        'Unexpected error in importSeasonTeamsFromPreviousSeason:',
        sanitizeErrorForLogging(error)
      );
    }
    return { error: 'An unexpected error occurred' };
  }
}
