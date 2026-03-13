import { createServiceRoleClient } from '@/lib/supabase/server';
import { buildPenaltyTrackerFromEvents, compareEventsReverseChronological, getShotsForTeam } from '@/lib/scorekeeper/event-replay';
import type { PublicLiveGameState, LiveGameEvent, LivePenaltyState } from './live-state';

function formatCountdown(gameTimeSeconds: number | null): string | null {
  if (gameTimeSeconds == null || !Number.isFinite(gameTimeSeconds)) return null;
  const minutes = Math.floor(gameTimeSeconds / 60);
  const seconds = Math.floor(gameTimeSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export async function getPublicLiveGameState(gameId: string): Promise<PublicLiveGameState | null> {
  const supabase = createServiceRoleClient();

  const { data: game, error: gameError } = await (supabase as any)
    .from('games')
    .select(`
      id,
      season_id,
      status,
      home_score,
      away_score,
      current_period,
      timer_elapsed_seconds,
      period_length_minutes,
      home_team_id,
      away_team_id
    `)
    .eq('id', gameId)
    .maybeSingle();

  if (gameError || !game) {
    return null;
  }

  const { data: rawEvents, error: eventsError } = await (supabase as any)
    .from('game_events')
    .select(`
      id,
      event_type,
      team_type,
      player_id,
      period,
      game_time_seconds,
      assist1_player_id,
      assist2_player_id,
      penalty_type,
      penalty_minutes,
      is_power_play,
      is_short_handed,
      is_empty_net,
      is_gwg,
      created_at,
      deleted_at,
      player:profiles!game_events_player_id_fkey(full_name),
      assist1:profiles!game_events_assist1_player_id_fkey(full_name),
      assist2:profiles!game_events_assist2_player_id_fkey(full_name)
    `)
    .eq('game_id', gameId)
    .order('period', { ascending: true })
    .order('game_time_seconds', { ascending: false })
    .order('created_at', { ascending: false });

  if (eventsError) {
    return null;
  }

  let rosterQuery = (supabase as any)
    .from('team_rosters')
    .select('player_id, jersey_number, team_id, profiles!team_rosters_player_id_fkey(full_name)')
    .in('team_id', [game.home_team_id, game.away_team_id])
    .eq('status', 'active')
    .is('end_date', null);

  if (game.season_id) {
    rosterQuery = rosterQuery.eq('season_id', game.season_id);
  }

  const { data: rosterRows } = await rosterQuery;

  const jerseyByPlayerId = new Map<string, number>();
  const nameByPlayerId = new Map<string, string>();
  for (const row of rosterRows || []) {
    if (row.player_id) {
      jerseyByPlayerId.set(row.player_id, row.jersey_number ?? 0);
      nameByPlayerId.set(
        row.player_id,
        (Array.isArray(row.profiles) ? row.profiles[0]?.full_name : row.profiles?.full_name) || 'Unknown'
      );
    }
  }

  const events: LiveGameEvent[] = (rawEvents || []).map((event: any) => ({
    id: event.id,
    eventType: event.event_type,
    teamType: event.team_type as 'home' | 'away',
    period: event.period,
    gameTimeSeconds: event.game_time_seconds,
    playerId: event.player_id,
    playerName: (event.player as { full_name: string } | null)?.full_name || nameByPlayerId.get(event.player_id) || 'Unknown',
    playerNumber: jerseyByPlayerId.get(event.player_id) ?? 0,
    assist1Name: (event.assist1 as { full_name: string } | null)?.full_name || null,
    assist1Number: event.assist1_player_id ? (jerseyByPlayerId.get(event.assist1_player_id) ?? null) : null,
    assist2Name: (event.assist2 as { full_name: string } | null)?.full_name || null,
    assist2Number: event.assist2_player_id ? (jerseyByPlayerId.get(event.assist2_player_id) ?? null) : null,
    penaltyType: event.penalty_type,
    penaltyMinutes: event.penalty_minutes,
    isPowerPlay: event.is_power_play || false,
    isShortHanded: event.is_short_handed || false,
    isEmptyNet: event.is_empty_net || false,
    isGWG: event.is_gwg || false,
    createdAt: event.created_at ?? new Date().toISOString(),
    deletedAt: event.deleted_at,
  }));

  const penaltyTracker = buildPenaltyTrackerFromEvents(
    events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      teamType: event.teamType,
      playerId: event.playerId,
      period: event.period,
      gameTimeSeconds: event.gameTimeSeconds,
      penaltyMinutes: event.penaltyMinutes,
      penaltyType: event.penaltyType,
      deletedAt: event.deletedAt,
      createdAt: event.createdAt,
    })),
    game.period_length_minutes ?? 20
  );

  const currentPeriod = game.current_period ?? null;
  const periodLengthSeconds = (game.period_length_minutes ?? 20) * 60;
  const elapsedSeconds = Math.max(0, game.timer_elapsed_seconds ?? 0);
  const gameTimeSeconds = currentPeriod ? Math.max(0, periodLengthSeconds - elapsedSeconds) : null;

  const homePenalties = currentPeriod
    ? penaltyTracker.getPenaltiesForDisplay('home', gameTimeSeconds ?? 0, currentPeriod)
    : [];
  const awayPenalties = currentPeriod
    ? penaltyTracker.getPenaltiesForDisplay('away', gameTimeSeconds ?? 0, currentPeriod)
    : [];

  const toLivePenalty = (penalty: any): LivePenaltyState => ({
    eventId: penalty.eventId,
    teamType: penalty.teamType,
    playerId: penalty.playerId,
    playerName: nameByPlayerId.get(penalty.playerId) || 'Unknown',
    playerNumber: jerseyByPlayerId.get(penalty.playerId) ?? 0,
    penaltyType: penalty.penaltyType ?? null,
    penaltyMinutes: penalty.penaltyMinutes,
    remainingSeconds: currentPeriod
      ? penaltyTracker.getRemainingSeconds(penalty, gameTimeSeconds ?? 0, currentPeriod)
      : penalty.penaltyMinutes * 60,
  });

  let strengthLabel: string | null = null;
  if (currentPeriod) {
    const homeStrength = penaltyTracker.getTeamStrength('home', gameTimeSeconds ?? 0, currentPeriod);
    const awayStrength = penaltyTracker.getTeamStrength('away', gameTimeSeconds ?? 0, currentPeriod);
    if (homeStrength !== 5 || awayStrength !== 5) {
      strengthLabel = `${homeStrength}v${awayStrength}`;
    }
  }

  return {
    game: {
      id: game.id,
      status: game.status,
      homeScore: game.home_score ?? 0,
      awayScore: game.away_score ?? 0,
      period: currentPeriod,
      periodTime: formatCountdown(gameTimeSeconds),
      homeShots: getShotsForTeam(events, 'home'),
      awayShots: getShotsForTeam(events, 'away'),
    },
    events: [...events]
      .filter((event) => !event.deletedAt)
      .sort(compareEventsReverseChronological)
      .slice(0, 12),
    activePenalties: {
      home: homePenalties.map(toLivePenalty),
      away: awayPenalties.map(toLivePenalty),
      strengthLabel,
    },
  };
}
