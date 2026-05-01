'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ==============================================================================
// TYPES
// ==============================================================================

export interface GameEventForCorrection {
  id: string;
  event_type: string;
  period: number;
  game_time_seconds: number | null;
  team_id: string;
  team_type: 'home' | 'away';
  player_id: string;
  player_name: string;
  player_number: number | null;
  assist1_player_id: string | null;
  assist1_name: string | null;
  assist2_player_id: string | null;
  assist2_name: string | null;
  penalty_type: string | null;
  penalty_minutes: number | null;
  is_power_play: boolean;
  is_short_handed: boolean;
  is_empty_net: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface RosterPlayer {
  id: string;
  full_name: string;
  jersey_number: number;
  team_id: string;
  position: string;
}

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==============================================================================
// VALIDATION
// ==============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

// ==============================================================================
// HELPER: Verify user has admin access to league
// ==============================================================================

async function verifyLeagueAdmin(leagueId: string): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: league } = await supabase
    .from('leagues')
    .select('created_by, organizations(owner_user_id)')
    .eq('id', leagueId)
    .maybeSingle();

  const org = (league as any)?.organizations as { owner_user_id?: string } | null | undefined;
  if ((league as any)?.created_by === user.id || org?.owner_user_id === user.id) {
    return { userId: user.id };
  }

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membership && ['owner', 'admin'].includes(membership.role)) {
    return { userId: user.id };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .maybeSingle();

  if ((profile as any)?.is_platform_admin === true) {
    return { userId: user.id };
  }

  return null;
}

// ==============================================================================
// GET GAME EVENTS FOR CORRECTION
// ==============================================================================

export async function getGameEventsForCorrection(gameId: string): Promise<ActionResult<{
  events: GameEventForCorrection[];
  rosters: RosterPlayer[];
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  seasonId: string;
  leagueId: string;
}>> {
  try {
    if (!isValidUUID(gameId)) {
      return { success: false, error: 'Invalid game ID' };
    }

    const serviceClient = createServiceRoleClient();

    // Get game info
    const { data: game, error: gameError } = await serviceClient
      .from('games')
      .select('id, league_id, season_id, home_team_id, away_team_id, home_score, away_score, status')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return { success: false, error: 'Game not found' };
    }

    // Verify admin access
    const auth = await verifyLeagueAdmin(game.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get events with player names
    const { data: events, error: eventsError } = await serviceClient
      .from('game_events')
      .select(`
        id,
        event_type,
        period,
        game_time_seconds,
        team_id,
        team_type,
        player_id,
        assist1_player_id,
        assist2_player_id,
        penalty_type,
        penalty_minutes,
        is_power_play,
        is_short_handed,
        is_empty_net,
        deleted_at,
        created_at,
        player:profiles!game_events_player_id_fkey(full_name),
        assist1:profiles!game_events_assist1_player_id_fkey(full_name),
        assist2:profiles!game_events_assist2_player_id_fkey(full_name)
      `)
      .eq('game_id', gameId)
      .order('period', { ascending: true })
      .order('game_time_seconds', { ascending: false, nullsFirst: false });

    if (eventsError) {
      return { success: false, error: 'Failed to load events' };
    }

    // Get rosters for both teams
    let rosterQuery = serviceClient
      .from('team_rosters')
      .select(`
        player_id,
        jersey_number,
        team_id,
        season_id,
        end_date,
        position,
        profiles!team_rosters_player_id_fkey(full_name)
      `)
      .in('team_id', [game.home_team_id, game.away_team_id])
      .eq('status', 'active')
      .is('end_date', null);

    if (game.season_id) {
      rosterQuery = rosterQuery.eq('season_id', game.season_id);
    }

    const { data: rosters } = await rosterQuery;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jerseyMap = new Map(
      rosters?.map((r: any) => [r.player_id, r.jersey_number ?? 0] as [string, number]) || []
    );

    const formattedEvents: GameEventForCorrection[] = (events || []).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      period: e.period ?? 1,
      game_time_seconds: e.game_time_seconds,
      team_id: e.team_id,
      team_type: e.team_type as 'home' | 'away',
      player_id: e.player_id,
      player_name: (e.player as { full_name: string } | null)?.full_name || 'Unknown',
      player_number: jerseyMap.get(e.player_id) ?? null,
      assist1_player_id: e.assist1_player_id,
      assist1_name: (e.assist1 as { full_name: string } | null)?.full_name || null,
      assist2_player_id: e.assist2_player_id,
      assist2_name: (e.assist2 as { full_name: string } | null)?.full_name || null,
      penalty_type: e.penalty_type,
      penalty_minutes: e.penalty_minutes,
      is_power_play: e.is_power_play || false,
      is_short_handed: e.is_short_handed || false,
      is_empty_net: e.is_empty_net || false,
      deleted_at: e.deleted_at,
      created_at: e.created_at ?? new Date().toISOString(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedRosters: RosterPlayer[] = (rosters || []).map((r: any) => ({
      id: r.player_id,
      full_name: (Array.isArray(r.profiles) ? r.profiles[0]?.full_name : r.profiles?.full_name) || 'Unknown',
      jersey_number: r.jersey_number ?? 0,
      team_id: r.team_id,
      position: r.position || 'Forward',
    }));

    return {
      success: true,
      data: {
        events: formattedEvents,
        rosters: formattedRosters,
        homeTeamId: game.home_team_id,
        awayTeamId: game.away_team_id,
        homeScore: game.home_score ?? 0,
        awayScore: game.away_score ?? 0,
        seasonId: game.season_id,
        leagueId: game.league_id,
      },
    };
  } catch (error) {
    console.error('getGameEventsForCorrection error:', error);
    return { success: false, error: 'Failed to load game events' };
  }
}

// ==============================================================================
// DELETE GAME EVENT (soft delete)
// ==============================================================================

export async function deleteGameEvent(
  eventId: string,
  reason: string
): Promise<ActionResult<void>> {
  try {
    if (!isValidUUID(eventId)) {
      return { success: false, error: 'Invalid event ID' };
    }

    const serviceClient = createServiceRoleClient();

    // Get event and game info
    const { data: event, error: eventError } = await serviceClient
      .from('game_events')
      .select('id, game_id, event_type, player_id, period, game_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Event not found' };
    }

    // Get league_id for auth check
    const { data: game } = await serviceClient
      .from('games')
      .select('league_id')
      .eq('id', event.game_id)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const auth = await verifyLeagueAdmin(game.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    // Soft delete the event
    const { error: updateError } = await serviceClient
      .from('game_events')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: auth.userId,
      })
      .eq('id', eventId);

    if (updateError) {
      return { success: false, error: 'Failed to delete event' };
    }

    // Audit log
    await serviceClient.from('game_audit_log').insert({
      game_id: event.game_id,
      league_id: game.league_id,
      action: 'stat_correction_delete',
      changed_by: auth.userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      previous_data: { event_id: eventId, event_type: event.event_type, player_id: event.player_id, period: event.period } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new_data: { deleted: true } as any,
      reason: reason || 'Admin stat correction',
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error('deleteGameEvent error:', error);
    return { success: false, error: 'Failed to delete event' };
  }
}

// ==============================================================================
// ADD GAME EVENT
// ==============================================================================

export async function addGameEvent(data: {
  gameId: string;
  eventType: 'goal' | 'penalty' | 'save';
  period: number;
  gameTimeSeconds?: number;
  teamId: string;
  teamType: 'home' | 'away';
  playerId: string;
  assist1PlayerId?: string;
  assist2PlayerId?: string;
  penaltyType?: string;
  penaltyMinutes?: number;
  isPowerPlay?: boolean;
  isShortHanded?: boolean;
  isEmptyNet?: boolean;
  reason?: string;
}): Promise<ActionResult<{ eventId: string }>> {
  try {
    if (!isValidUUID(data.gameId) || !isValidUUID(data.playerId) || !isValidUUID(data.teamId)) {
      return { success: false, error: 'Invalid ID format' };
    }

    const serviceClient = createServiceRoleClient();

    // Get game info
    const { data: game } = await serviceClient
      .from('games')
      .select('league_id')
      .eq('id', data.gameId)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const auth = await verifyLeagueAdmin(game.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const clientEventId = `admin-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;

    const { data: newEvent, error: insertError } = await serviceClient
      .from('game_events')
      .insert({
        client_event_id: clientEventId,
        event_version: 1,
        sync_status: 'synced',
        created_offline: false,
        game_id: data.gameId,
        league_id: game.league_id,
        team_id: data.teamId,
        team_type: data.teamType,
        player_id: data.playerId,
        event_type: data.eventType,
        period: data.period,
        game_time_seconds: data.gameTimeSeconds ?? null,
        assist1_player_id: data.assist1PlayerId || null,
        assist2_player_id: data.assist2PlayerId || null,
        penalty_type: data.penaltyType || null,
        penalty_minutes: data.penaltyMinutes ?? null,
        is_power_play: data.isPowerPlay || false,
        is_short_handed: data.isShortHanded || false,
        is_empty_net: data.isEmptyNet || false,
        entered_by: auth.userId,
        entered_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !newEvent) {
      console.error('Insert event error:', insertError);
      return { success: false, error: 'Failed to add event' };
    }

    // Audit log
    await serviceClient.from('game_audit_log').insert({
      game_id: data.gameId,
      league_id: game.league_id,
      action: 'stat_correction_add',
      changed_by: auth.userId,
      previous_data: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new_data: {
        event_id: newEvent.id,
        event_type: data.eventType,
        player_id: data.playerId,
        period: data.period,
        team_type: data.teamType,
      } as any,
      reason: data.reason || 'Admin stat correction',
    });

    return { success: true, data: { eventId: newEvent.id } };
  } catch (error) {
    console.error('addGameEvent error:', error);
    return { success: false, error: 'Failed to add event' };
  }
}

// ==============================================================================
// RECALCULATE GAME STATS
// ==============================================================================

export async function recalculateGameStats(gameId: string): Promise<ActionResult<{
  homeScore: number;
  awayScore: number;
}>> {
  try {
    if (!isValidUUID(gameId)) {
      return { success: false, error: 'Invalid game ID' };
    }

    const serviceClient = createServiceRoleClient();

    // Get game info for auth check
    const { data: game } = await serviceClient
      .from('games')
      .select('league_id, season_id')
      .eq('id', gameId)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const auth = await verifyLeagueAdmin(game.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    // Preferred RPC recalculation path
    let usedFallback = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (serviceClient as any).rpc('recalculate_game_stats_from_events', {
      p_game_id: gameId,
    });

    if (rpcError) {
      console.error('Recalculate game stats RPC error:', rpcError);
      usedFallback = true;

      // Fallback: recompute only the game score directly from active goal events.
      // This prevents hard-failure when RPCs drift across environments.
      const [{ count: homeGoals }, { count: awayGoals }] = await Promise.all([
        serviceClient
          .from('game_events')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', gameId)
          .eq('event_type', 'goal')
          .eq('team_type', 'home')
          .is('deleted_at', null),
        serviceClient
          .from('game_events')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', gameId)
          .eq('event_type', 'goal')
          .eq('team_type', 'away')
          .is('deleted_at', null),
      ]);

      const homeScore = homeGoals ?? 0;
      const awayScore = awayGoals ?? 0;

      const { error: scoreUpdateError } = await serviceClient
        .from('games')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (scoreUpdateError) {
        return { success: false, error: 'Failed to recalculate stats (fallback update failed)' };
      }

      // Best-effort season-wide stat refresh for environments where this RPC exists.
      if (game.season_id) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (serviceClient as any).rpc('recalculate_all_season_stats', {
            p_season_id: game.season_id,
          });
        } catch (seasonRecalcError) {
          console.warn('Season stats recalc RPC unavailable or failed:', seasonRecalcError);
        }
      }
    }

    // Get updated scores
    const { data: updatedGame } = await serviceClient
      .from('games')
      .select('home_score, away_score')
      .eq('id', gameId)
      .single();

    // Audit log
    await serviceClient.from('game_audit_log').insert({
      game_id: gameId,
      league_id: game.league_id,
      action: 'stat_correction_recalculate',
      changed_by: auth.userId,
      previous_data: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new_data: {
        home_score: updatedGame?.home_score,
        away_score: updatedGame?.away_score,
        used_fallback: usedFallback,
      } as any,
      reason: 'Stats recalculated after correction',
    });

    revalidatePath('/');

    return {
      success: true,
      data: {
        homeScore: updatedGame?.home_score ?? 0,
        awayScore: updatedGame?.away_score ?? 0,
      },
    };
  } catch (error) {
    console.error('recalculateGameStats error:', error);
    return { success: false, error: 'Failed to recalculate stats' };
  }
}

// ==============================================================================
// UPDATE FINAL SCORE (override without recalculation)
// ==============================================================================

export async function updateFinalScore(
  gameId: string,
  homeScore: number,
  awayScore: number,
  reason: string
): Promise<ActionResult<void>> {
  try {
    if (!isValidUUID(gameId)) {
      return { success: false, error: 'Invalid game ID' };
    }

    if (homeScore < 0 || homeScore > 99 || awayScore < 0 || awayScore > 99) {
      return { success: false, error: 'Score must be between 0 and 99' };
    }

    const serviceClient = createServiceRoleClient();

    const { data: game } = await serviceClient
      .from('games')
      .select('league_id, home_score, away_score')
      .eq('id', gameId)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const auth = await verifyLeagueAdmin(game.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error: updateError } = await serviceClient
      .from('games')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (updateError) {
      return { success: false, error: 'Failed to update score' };
    }

    // Audit log
    await serviceClient.from('game_audit_log').insert({
      game_id: gameId,
      league_id: game.league_id,
      action: 'stat_correction_score',
      changed_by: auth.userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      previous_data: { home_score: game.home_score, away_score: game.away_score } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new_data: { home_score: homeScore, away_score: awayScore } as any,
      reason: reason || 'Admin score correction',
    });

    revalidatePath('/');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('updateFinalScore error:', error);
    return { success: false, error: 'Failed to update score' };
  }
}
