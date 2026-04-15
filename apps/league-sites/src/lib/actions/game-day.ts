'use server';

import type { ScheduleGame } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { pickOperationalSeason } from '@/lib/seasons/operational';
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getCaptainGameLineupEditorData } from '@/lib/actions/game-lineups';
import type { CheckinStatus } from '@/lib/actions/checkins';
import type { GameLineupEditorData } from '@/lib/lineups/types';

type RelevantGameRow = {
  id: string;
  league_id: string;
  season_id: string | null;
  scheduled_at: string;
  location: string | null;
  home_score: number | null;
  away_score: number | null;
  status: ScheduleGame['status'];
  home_team_id: string;
  away_team_id: string;
  home_team: any;
  away_team: any;
};

export type CaptainAttendanceStatus = CheckinStatus | 'no_response';

export interface GameDayAttendancePlayer {
  playerId: string;
  fullName: string;
  avatarUrl: string | null;
  jerseyNumber: number | null;
  position: string | null;
  status: CaptainAttendanceStatus;
  isSub: boolean;
}

export interface CaptainGameDayData {
  resolvedGameId: string | null;
  game: ScheduleGame | null;
  attendance: GameDayAttendancePlayer[];
  lineup: GameLineupEditorData['lineup'];
  teamId: string;
  leagueId: string;
  leagueSlug: string;
  leagueTimezone: string | null;
  teamName: string;
  opponentName: string;
  scoreSelfEnabled: boolean;
  scoreDisabledReason: string | null;
  counts: {
    in: number;
    out: number;
    unsure: number;
    noResponse: number;
    subs: number;
  };
  rosterPlayerIds: string[];
}

async function verifyCaptainAccess(teamId: string) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return { authorized: false as const, error: 'Not authenticated' };
  }

  const supabase = createServiceRoleClient();
  const { data: membership } = await (supabase.from('team_rosters') as any)
    .select('player_id, leadership_role')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .eq('status', 'active')
    .is('end_date', null)
    .limit(1)
    .maybeSingle();

  if (!membership || !['captain', 'alternate_captain'].includes(membership.leadership_role || '')) {
    return { authorized: false as const, error: 'Not authorized' };
  }

  return { authorized: true as const, userId: user.id, supabase };
}

function normalizeGameTeam(rawTeam: any) {
  const team = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam;
  return {
    id: team?.id ?? '',
    name: team?.name ?? 'TBD',
    slug: team?.slug ?? '',
    logo: team?.logo_url ?? null,
    colors: team?.primary_color ?? null,
  };
}

function selectRelevantGame(games: RelevantGameRow[], now: Date) {
  const inProgress = games
    .filter((game) => game.status === 'in_progress')
    .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())[0];

  if (inProgress) {
    return inProgress;
  }

  const upcoming = games
    .filter((game) => game.status === 'scheduled' && new Date(game.scheduled_at).getTime() >= now.getTime())
    .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())[0];

  if (upcoming) {
    return upcoming;
  }

  return games
    .filter((game) => game.status === 'scheduled')
    .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())[0] ?? null;
}

export async function getCaptainGameDayData(
  teamId: string,
  _requestedGameId?: string,
): Promise<{ success: true; data: CaptainGameDayData | null } | { success: false; error: string }> {
  const access = await verifyCaptainAccess(teamId);
  if (!access.authorized) {
    return { success: false, error: access.error };
  }

  const { supabase } = access;

  const { data: team } = await (supabase.from('teams') as any)
    .select(`
      id,
      name,
      league_id,
      leagues!inner(
        id,
        slug,
        timezone,
        settings
      )
    `)
    .eq('id', teamId)
    .maybeSingle();

  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  const rawLeague = Array.isArray(team.leagues) ? team.leagues[0] : team.leagues;

  const { data: seasons } = await (supabase.from('seasons') as any)
    .select('id, status, start_date, end_date, created_at')
    .eq('league_id', team.league_id)
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false });

  const operationalSeason = pickOperationalSeason(seasons || []);
  let gamesQuery = (supabase.from('games') as any)
    .select(`
      id,
      league_id,
      season_id,
      scheduled_at,
      location,
      home_score,
      away_score,
      status,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color)
    `)
    .eq('league_id', team.league_id)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_at', { ascending: true })
    .limit(12);

  if (operationalSeason?.id) {
    gamesQuery = gamesQuery.eq('season_id', operationalSeason.id);
  }

  const { data: gameRows } = await gamesQuery;
  const resolvedGame = selectRelevantGame((gameRows || []) as RelevantGameRow[], new Date());

  if (!resolvedGame) {
    return {
      success: true,
      data: null,
    };
  }

  const lineupResult = await getCaptainGameLineupEditorData(resolvedGame.id, teamId);
  if (!lineupResult.success) {
    return { success: false, error: lineupResult.error };
  }

  const leagueSettings = (rawLeague?.settings as Record<string, unknown> | null) ?? {};
  const scoreSelfEnabled =
    leagueSettings.self_scorekeeper_enabled === true ||
    leagueSettings.scorekeepingMode === 'self_scorekeeping' ||
    leagueSettings.statEntryMode === 'captain';

  const scoreDisabledReason = scoreSelfEnabled
    ? (resolvedGame.status === 'scheduled' || resolvedGame.status === 'in_progress'
        ? null
        : 'Scoring is only available for scheduled or live games.')
    : 'This league requires an assigned scorekeeper.';

  const attendance: GameDayAttendancePlayer[] = lineupResult.data.lineup.layout.roster.map((player) => ({
    playerId: player.playerId,
    fullName: player.fullName ?? 'Player',
    avatarUrl: player.avatarUrl,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    status: player.availability,
    isSub: player.isSub === true,
  }));

  const counts = attendance.reduce(
    (summary, player) => {
      if (player.status === 'confirmed') summary.in += 1;
      else if (player.status === 'out') summary.out += 1;
      else if (player.status === 'tentative') summary.unsure += 1;
      else summary.noResponse += 1;

      if (player.isSub) summary.subs += 1;
      return summary;
    },
    { in: 0, out: 0, unsure: 0, noResponse: 0, subs: 0 },
  );

  const game: ScheduleGame = {
    id: resolvedGame.id,
    league_id: resolvedGame.league_id,
    season_id: resolvedGame.season_id ?? operationalSeason?.id ?? '',
    scheduled_at: resolvedGame.scheduled_at,
    venue: resolvedGame.location ?? null,
    home_score: resolvedGame.home_score,
    away_score: resolvedGame.away_score,
    status: resolvedGame.status,
    home_team: normalizeGameTeam(resolvedGame.home_team),
    away_team: normalizeGameTeam(resolvedGame.away_team),
  };

  const opponentName =
    resolvedGame.home_team_id === teamId
      ? normalizeGameTeam(resolvedGame.away_team).name
      : normalizeGameTeam(resolvedGame.home_team).name;

  return {
    success: true,
    data: {
      resolvedGameId: resolvedGame.id,
      game,
      attendance,
      lineup: lineupResult.data.lineup,
      teamId,
      leagueId: team.league_id,
      leagueSlug: rawLeague?.slug ?? '',
      leagueTimezone: rawLeague?.timezone ?? null,
      teamName: lineupResult.data.game.team.name,
      opponentName,
      scoreSelfEnabled,
      scoreDisabledReason,
      counts,
      rosterPlayerIds: attendance.filter((player) => !player.isSub).map((player) => player.playerId),
    },
  };
}

export async function updateCaptainGameAttendanceStatus(input: {
  gameId: string;
  teamId: string;
  playerId: string;
  status: CaptainAttendanceStatus;
  leagueSlug: string;
}) {
  const access = await verifyCaptainAccess(input.teamId);
  if (!access.authorized) {
    return { success: false, error: access.error };
  }

  const { supabase } = access;
  const { data: game } = await (supabase.from('games') as any)
    .select('id, status, home_team_id, away_team_id')
    .eq('id', input.gameId)
    .maybeSingle();

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.home_team_id !== input.teamId && game.away_team_id !== input.teamId) {
    return { success: false, error: 'That team is not assigned to this game' };
  }

  if (game.status === 'completed' || game.status === 'cancelled') {
    return { success: false, error: 'Completed or cancelled games can no longer be edited.' };
  }

  if (input.status === 'no_response') {
    const { error } = await (supabase.from('game_checkins') as any)
      .delete()
      .eq('game_id', input.gameId)
      .eq('team_id', input.teamId)
      .eq('player_id', input.playerId);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await (supabase.from('game_checkins') as any)
      .upsert(
        {
          game_id: input.gameId,
          team_id: input.teamId,
          player_id: input.playerId,
          status: input.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'game_id,player_id' },
      );

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath(`/${input.leagueSlug}/captain/lineups/${input.gameId}`);
  return { success: true };
}
