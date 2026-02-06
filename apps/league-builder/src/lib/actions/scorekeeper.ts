'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { cookies, headers } from 'next/headers';
import { randomBytes } from 'crypto';
import {
  checkScorekeeperRateLimit,
  recordTokenFailure,
  clearTokenFailures,
  getClientIp,
} from '@/lib/middleware/scorekeeper-rate-limit';

// Session cookie name for scorekeeper tokens
const SCOREKEEPER_SESSION_COOKIE = 'sk_session';

/**
 * Verify that there is an active, valid scorekeeper session for the given game.
 *
 * CRITICAL SECURITY: This function MUST be called before ANY service role operation
 * that modifies game stats. Without this check, anyone can call stat entry functions
 * directly and manipulate game data without authentication.
 *
 * Defense-in-depth: Even though we use service role client (which bypasses RLS),
 * we validate session authorization at the application layer.
 *
 * @param gameId - The game ID to verify session for
 * @returns Session ID if valid, throws error if invalid/expired
 */
async function verifyActiveScorekeeperSession(gameId: string): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SCOREKEEPER_SESSION_COOKIE)?.value;

  if (!token) {
    throw new Error('No scorekeeper session found. Please log in with a valid token.');
  }

  // Validate token and get session
  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase.rpc('validate_scorekeeper_token', {
    p_token: token.toUpperCase().trim(),
  });

  if (error || !data || data.length === 0) {
    throw new Error('Invalid scorekeeper session. Token may be expired or revoked.');
  }

  const session = data[0];

  // Verify session is for this game
  if (session.game_id !== gameId) {
    throw new Error(
      `Session mismatch: This scorekeeper session is for game ${session.game_id}, not ${gameId}.`
    );
  }

  // Verify session is active and not expired
  if (!session.is_valid) {
    throw new Error('Scorekeeper session is expired or inactive.');
  }

  // Return session ID for audit logging
  return session.session_id;
}

export interface ScorekeeperSession {
  sessionId: string;
  gameId: string;
  leagueId: string;
  isValid: boolean;
  expiresAt: string;
  gameStatus: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
}

export interface GameData {
  id: string;
  homeTeam: TeamData;
  awayTeam: TeamData;
  scheduledAt: string;
  status: string;
  periodCount: number;
  periodLengthMinutes: number;
  homeScore: number;
  awayScore: number;
  currentPeriod: number;
  homeVerifiedAt: string | null;
  awayVerifiedAt: string | null;
  statsLockedAt: string | null;
}

export interface TeamData {
  id: string;
  name: string;
  shortName: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  roster: PlayerData[];
  captainId: string | null;
  captainName: string | null;
}

export interface PlayerData {
  id: string;
  fullName: string;
  jerseyNumber: number;
  position: 'Forward' | 'Defense' | 'Goalie';
  isCaptain: boolean;
  isAssistantCaptain: boolean;
}

export interface GameEventData {
  id: string;
  clientEventId: string;
  eventType: string;
  period: number;
  gameTimeSeconds: number | null;
  teamId: string;
  teamType: 'home' | 'away';
  playerId: string;
  playerName: string;
  playerNumber: number;
  assist1PlayerId: string | null;
  assist1Name: string | null;
  assist1Number: number | null;
  assist2PlayerId: string | null;
  assist2Name: string | null;
  assist2Number: number | null;
  penaltyType: string | null;
  penaltyMinutes: number | null;
  isPowerPlay: boolean;
  isShortHanded: boolean;
  isEmptyNet: boolean;
  createdAt: string;
  deletedAt: string | null;
}

/**
 * Validate a scorekeeper token and return session info
 *
 * CRITICAL SECURITY: Implements rate limiting to prevent brute force attacks:
 * - 5 attempts per minute per IP
 * - 10 failed attempts per token before 15-minute lockout
 * - Exponential backoff on repeated failures
 * - CAPTCHA after 3 failed attempts
 */
export async function validateScorekeeperToken(token: string): Promise<{
  success: boolean;
  session?: ScorekeeperSession;
  error?: string;
  shouldShowCaptcha?: boolean;
  retryAfterMs?: number;
}> {
  try {
    // Get client IP for rate limiting
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    // CRITICAL SECURITY: Check rate limits BEFORE validating token
    const rateLimitCheck = checkScorekeeperRateLimit(clientIp, token);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: rateLimitCheck.error,
        shouldShowCaptcha: rateLimitCheck.shouldShowCaptcha,
        retryAfterMs: rateLimitCheck.retryAfterMs,
      };
    }

    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase.rpc('validate_scorekeeper_token', {
      p_token: token.toUpperCase().trim(),
    });

    if (error) {
      console.error('Token validation error:', error);
      recordTokenFailure(token); // Track failure for rate limiting
      return { success: false, error: 'Invalid token' };
    }

    if (!data || data.length === 0 || !data[0].is_valid) {
      recordTokenFailure(token); // Track failure for rate limiting
      return {
        success: false,
        error: 'Token expired or invalid',
        shouldShowCaptcha: rateLimitCheck.shouldShowCaptcha,
      };
    }

    const session = data[0];

    // SUCCESS: Clear any failure tracking for this token
    clearTokenFailures(token);

    // Store token in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(SCOREKEEPER_SESSION_COOKIE, token.toUpperCase().trim(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return {
      success: true,
      session: {
        sessionId: session.session_id,
        gameId: session.game_id,
        leagueId: session.league_id,
        isValid: session.is_valid,
        expiresAt: session.expires_at,
        gameStatus: session.game_status,
        homeTeamName: session.home_team_name,
        awayTeamName: session.away_team_name,
        scheduledAt: session.scheduled_at,
      },
    };
  } catch (error) {
    console.error('Token validation error:', error);
    recordTokenFailure(token); // Track failure even on exceptions
    return { success: false, error: 'Failed to validate token' };
  }
}

/**
 * Get current scorekeeper session from cookie
 */
export async function getScorekeeperSession(): Promise<{
  success: boolean;
  session?: ScorekeeperSession;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SCOREKEEPER_SESSION_COOKIE)?.value;

    if (!token) {
      return { success: false, error: 'No session found' };
    }

    return validateScorekeeperToken(token);
  } catch (error) {
    console.error('Get session error:', error);
    return { success: false, error: 'Failed to get session' };
  }
}

/**
 * Clear scorekeeper session
 */
export async function clearScorekeeperSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SCOREKEEPER_SESSION_COOKIE);
}

/**
 * Get full game data for scorekeeper
 */
export async function getScorekeeperGameData(gameId: string): Promise<{
  success: boolean;
  game?: GameData;
  error?: string;
}> {
  try {
    // CRITICAL SECURITY: Verify active scorekeeper session before exposing game data
    await verifyActiveScorekeeperSession(gameId);

    const supabase = await createServiceRoleClient();

    // Get game with teams
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: game, error: gameError } = await (supabase as any)
      .from('games')
      .select(`
        id,
        scheduled_at,
        status,
        period_count,
        period_length_minutes,
        home_score,
        away_score,
        current_period,
        home_verified_at,
        away_verified_at,
        stats_locked_at,
        home_team:teams!games_home_team_id_fkey(
          id,
          name,
          short_name,
          primary_color,
          secondary_color,
          captain_id
        ),
        away_team:teams!games_away_team_id_fkey(
          id,
          name,
          short_name,
          primary_color,
          secondary_color,
          captain_id
        )
      `)
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return { success: false, error: 'Game not found' };
    }

    // Get rosters for both teams
     
    const [homeRosterResult, awayRosterResult] = await Promise.all([
      (supabase as any)
        .from('team_rosters')
        .select(`
          player_id,
          jersey_number,
          position,
          is_captain,
          is_assistant_captain,
          profiles!team_rosters_player_id_fkey(
            id,
            full_name
          )
        `)
        .eq('team_id', (game.home_team as { id: string }).id)
        .eq('status', 'active'),
      (supabase as any)
        .from('team_rosters')
        .select(`
          player_id,
          jersey_number,
          position,
          is_captain,
          is_assistant_captain,
          profiles!team_rosters_player_id_fkey(
            id,
            full_name
          )
        `)
        .eq('team_id', (game.away_team as { id: string }).id)
        .eq('status', 'active'),
    ]);

    const homeTeam = game.home_team as {
      id: string;
      name: string;
      short_name: string | null;
      primary_color: string | null;
      secondary_color: string | null;
      captain_id: string | null;
    };

    const awayTeam = game.away_team as {
      id: string;
      name: string;
      short_name: string | null;
      primary_color: string | null;
      secondary_color: string | null;
      captain_id: string | null;
    };

    const formatRoster = (roster: Array<{
      player_id: string;
      jersey_number: number;
      position: string;
      is_captain: boolean;
      is_assistant_captain: boolean;
      profiles: { id: string; full_name: string } | null;
    }> | null): PlayerData[] => {
      if (!roster) return [];
      return roster
        .filter(r => r.profiles)
        .map(r => ({
          id: r.player_id,
          fullName: r.profiles!.full_name,
          jerseyNumber: r.jersey_number,
          position: r.position as 'Forward' | 'Defense' | 'Goalie',
          isCaptain: r.is_captain,
          isAssistantCaptain: r.is_assistant_captain,
        }))
        .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
    };

    const homeRoster = formatRoster(homeRosterResult.data);
    const awayRoster = formatRoster(awayRosterResult.data);

    const homeCaptain = homeRoster.find(p => p.isCaptain);
    const awayCaptain = awayRoster.find(p => p.isCaptain);

    return {
      success: true,
      game: {
        id: game.id,
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.name,
          shortName: homeTeam.short_name,
          primaryColor: homeTeam.primary_color,
          secondaryColor: homeTeam.secondary_color,
          roster: homeRoster,
          captainId: homeCaptain?.id || null,
          captainName: homeCaptain?.fullName || null,
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.name,
          shortName: awayTeam.short_name,
          primaryColor: awayTeam.primary_color,
          secondaryColor: awayTeam.secondary_color,
          roster: awayRoster,
          captainId: awayCaptain?.id || null,
          captainName: awayCaptain?.fullName || null,
        },
        scheduledAt: game.scheduled_at,
        status: game.status || 'scheduled',
        periodCount: game.period_count || 3,
        periodLengthMinutes: game.period_length_minutes || 20,
        homeScore: game.home_score || 0,
        awayScore: game.away_score || 0,
        currentPeriod: game.current_period || 1,
        homeVerifiedAt: game.home_verified_at,
        awayVerifiedAt: game.away_verified_at,
        statsLockedAt: game.stats_locked_at,
      },
    };
  } catch (error) {
    console.error('Get game data error:', error);
    return { success: false, error: 'Failed to load game data' };
  }
}

/**
 * Get all events for a game
 */
export async function getGameEvents(gameId: string): Promise<{
  success: boolean;
  events?: GameEventData[];
  error?: string;
}> {
  try {
    // CRITICAL SECURITY: Verify active scorekeeper session before exposing event data
    await verifyActiveScorekeeperSession(gameId);

    const supabase = await createServiceRoleClient();

    const { data: events, error } = await supabase
      .from('game_events')
      .select(`
        id,
        client_event_id,
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
        created_at,
        deleted_at,
        player:profiles!game_events_player_id_fkey(full_name),
        assist1:profiles!game_events_assist1_player_id_fkey(full_name),
        assist2:profiles!game_events_assist2_player_id_fkey(full_name)
      `)
      .eq('game_id', gameId)
      .order('period', { ascending: true })
      .order('game_time_seconds', { ascending: false });

    if (error) {
      console.error('Get events error:', error);
      return { success: false, error: 'Failed to load events' };
    }

    // Get jersey numbers from rosters
    const { data: game } = await supabase
      .from('games')
      .select('home_team_id, away_team_id')
      .eq('id', gameId)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const { data: rosters } = await supabase
      .from('team_rosters')
      .select('player_id, jersey_number')
      .in('team_id', [game.home_team_id, game.away_team_id]);

    const jerseyMap = new Map(rosters?.map(r => [r.player_id, r.jersey_number]) || []);

    const formattedEvents: GameEventData[] = (events || []).map(e => ({
      id: e.id,
      clientEventId: e.client_event_id,
      eventType: e.event_type,
      period: e.period,
      gameTimeSeconds: e.game_time_seconds,
      teamId: e.team_id,
      teamType: e.team_type as 'home' | 'away',
      playerId: e.player_id,
      playerName: (e.player as { full_name: string })?.full_name || 'Unknown',
      playerNumber: jerseyMap.get(e.player_id) || 0,
      assist1PlayerId: e.assist1_player_id,
      assist1Name: (e.assist1 as { full_name: string } | null)?.full_name || null,
      assist1Number: e.assist1_player_id ? jerseyMap.get(e.assist1_player_id) || null : null,
      assist2PlayerId: e.assist2_player_id,
      assist2Name: (e.assist2 as { full_name: string } | null)?.full_name || null,
      assist2Number: e.assist2_player_id ? jerseyMap.get(e.assist2_player_id) || null : null,
      penaltyType: e.penalty_type,
      penaltyMinutes: e.penalty_minutes,
      isPowerPlay: e.is_power_play || false,
      isShortHanded: e.is_short_handed || false,
      isEmptyNet: e.is_empty_net || false,
      createdAt: (e.created_at ?? new Date().toISOString()) as string,
      deletedAt: e.deleted_at,
    }));

    return { success: true, events: formattedEvents };
  } catch (error) {
    console.error('Get events error:', error);
    return { success: false, error: 'Failed to load events' };
  }
}

/**
 * Add a goal event
 */
export async function addGoalEvent(data: {
  gameId: string;
  teamId: string;
  teamType: 'home' | 'away';
  scorerId: string;
  assist1Id?: string;
  assist2Id?: string;
  period: number;
  gameTimeSeconds?: number;
  isPowerPlay?: boolean;
  isShortHanded?: boolean;
  isEmptyNet?: boolean;
  goalieInNetId?: string; // The opposing goalie who was in net when the goal was scored
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // CRITICAL SECURITY: Verify active scorekeeper session BEFORE allowing stats modification
    const sessionId = await verifyActiveScorekeeperSession(data.gameId);

    const supabase = await createServiceRoleClient();

    // Get league_id from game
    const { data: game } = await supabase
      .from('games')
      .select('league_id')
      .eq('id', data.gameId)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const clientEventId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;

    const { data: event, error } = await supabase
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
        player_id: data.scorerId,
        event_type: 'goal',
        period: data.period,
        game_time_seconds: data.gameTimeSeconds || null,
        assist1_player_id: data.assist1Id || null,
        assist2_player_id: data.assist2Id || null,
        is_power_play: data.isPowerPlay || false,
        is_short_handed: data.isShortHanded || false,
        is_empty_net: data.isEmptyNet || false,
        goalie_in_net_id: data.goalieInNetId || null,
        entered_by: sessionId,
        entered_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Add goal error:', error);
      return { success: false, error: 'Failed to add goal' };
    }

    // Update game score
    const scoreField = data.teamType === 'home' ? 'home_score' : 'away_score';
    await supabase.rpc('increment_game_score', {
      p_game_id: data.gameId,
      p_team_type: data.teamType,
    });

    return { success: true, eventId: event.id };
  } catch (error) {
    console.error('Add goal error:', error);
    return { success: false, error: 'Failed to add goal' };
  }
}

/**
 * Add a penalty event
 */
export async function addPenaltyEvent(data: {
  gameId: string;
  teamId: string;
  teamType: 'home' | 'away';
  playerId: string;
  period: number;
  gameTimeSeconds?: number;
  penaltyType: 'minor' | 'major' | 'misconduct' | 'game_misconduct' | 'match';
  penaltyMinutes: number;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // CRITICAL SECURITY: Verify active scorekeeper session BEFORE allowing stats modification
    const sessionId = await verifyActiveScorekeeperSession(data.gameId);

    const supabase = await createServiceRoleClient();

    // Get league_id from game
    const { data: game } = await supabase
      .from('games')
      .select('league_id')
      .eq('id', data.gameId)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const clientEventId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;

    const { data: event, error } = await supabase
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
        event_type: 'penalty',
        period: data.period,
        game_time_seconds: data.gameTimeSeconds || null,
        penalty_type: data.penaltyType,
        penalty_minutes: data.penaltyMinutes,
        entered_by: sessionId,
        entered_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Add penalty error:', error);
      return { success: false, error: 'Failed to add penalty' };
    }

    return { success: true, eventId: event.id };
  } catch (error) {
    console.error('Add penalty error:', error);
    return { success: false, error: 'Failed to add penalty' };
  }
}

/**
 * Add a save event (goalie)
 */
export async function addSaveEvent(data: {
  gameId: string;
  teamId: string;
  teamType: 'home' | 'away';
  goalieId: string;
  period: number;
  gameTimeSeconds?: number;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // CRITICAL SECURITY: Verify active scorekeeper session BEFORE allowing stats modification
    const sessionId = await verifyActiveScorekeeperSession(data.gameId);

    const supabase = await createServiceRoleClient();

    // Get league_id from game
    const { data: game } = await supabase
      .from('games')
      .select('league_id')
      .eq('id', data.gameId)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const clientEventId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;

    const { data: event, error } = await supabase
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
        player_id: data.goalieId,
        event_type: 'save',
        period: data.period,
        game_time_seconds: data.gameTimeSeconds || null,
        entered_by: sessionId,
        entered_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Add save error:', error);
      return { success: false, error: 'Failed to add save' };
    }

    return { success: true, eventId: event.id };
  } catch (error) {
    console.error('Add save error:', error);
    return { success: false, error: 'Failed to add save' };
  }
}

/**
 * Undo/delete an event (soft delete)
 */
export async function undoEvent(eventId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServiceRoleClient();

    // Get game_id for the event to verify session
    const { data: event } = await supabase
      .from('game_events')
      .select('game_id')
      .eq('id', eventId)
      .single();

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // CRITICAL SECURITY: Verify active scorekeeper session BEFORE allowing stats modification
    const sessionId = await verifyActiveScorekeeperSession(event.game_id);

    const { error } = await supabase
      .from('game_events')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: sessionId,
      })
      .eq('id', eventId);

    if (error) {
      console.error('Undo event error:', error);
      return { success: false, error: 'Failed to undo event' };
    }

    return { success: true };
  } catch (error) {
    console.error('Undo event error:', error);
    return { success: false, error: 'Failed to undo event' };
  }
}

/**
 * Submit game for captain verification
 */
export async function submitGameForVerification(gameId: string): Promise<{
  success: boolean;
  homeToken?: string;
  awayToken?: string;
  error?: string;
}> {
  try {
    // CRITICAL SECURITY: Verify active scorekeeper session before generating verification tokens
    await verifyActiveScorekeeperSession(gameId);

    const supabase = await createServiceRoleClient();

    // Generate cryptographically secure verification tokens
    // Security: Uses crypto.randomBytes() instead of Math.random() to prevent
    // token prediction via timestamp correlation attacks
    const homeToken = randomBytes(8).toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 12);
    const awayToken = randomBytes(8).toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 12);

    // Set token expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase
      .from('games')
      .update({
        status: 'pending_verification',
        home_verification_token: homeToken,
        away_verification_token: awayToken,
        home_verification_token_expires_at: expiresAt.toISOString(),
        away_verification_token_expires_at: expiresAt.toISOString(),
        stats_submitted_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (error) {
      console.error('Submit for verification error:', error);
      return { success: false, error: 'Failed to submit for verification' };
    }

    return { success: true, homeToken, awayToken };
  } catch (error) {
    console.error('Submit for verification error:', error);
    return { success: false, error: 'Failed to submit for verification' };
  }
}

/**
 * Look up a captain verification token (without verifying)
 */
export async function lookupCaptainVerificationToken(token: string): Promise<{
  success: boolean;
  gameId?: string;
  teamType?: 'home' | 'away';
  error?: string;
}> {
  try {
    const supabase = await createServiceRoleClient();

    // Find game by verification token using RPC function
    const { data, error } = await supabase.rpc('validate_captain_token', {
      p_token: token,
    });

    if (error) {
      console.error('Validate captain token error:', error);
      return { success: false, error: 'Invalid verification token' };
    }

    if (!data || data.length === 0 || !data[0].is_valid) {
      return { success: false, error: 'Invalid verification token' };
    }

    return {
      success: true,
      gameId: data[0].game_id,
      teamType: data[0].team_type as 'home' | 'away',
    };
  } catch (error) {
    console.error('Lookup token error:', error);
    return { success: false, error: 'Failed to lookup token' };
  }
}

/**
 * Verify game stats as captain
 */
export async function verifyCaptainStats(
  token: string,
  signature?: string
): Promise<{
  success: boolean;
  gameId?: string;
  teamType?: 'home' | 'away';
  error?: string;
}> {
  try {
    const supabase = await createServiceRoleClient();

    // Find game by verification token (sanitize to prevent filter injection)
    const safeToken = token.replace(/[,.()"\\]/g, '');
    const { data: game, error: findError } = await supabase
      .from('games')
      .select('id, home_verification_token, away_verification_token')
      .or(`home_verification_token.eq.${safeToken},away_verification_token.eq.${safeToken}`)
      .single();

    if (findError || !game) {
      return { success: false, error: 'Invalid verification token' };
    }

    const isHome = game.home_verification_token === token;
    const teamType = isHome ? 'home' : 'away';
    const verifiedAtField = isHome ? 'home_verified_at' : 'away_verified_at';
    const captainVerifiedField = isHome ? 'home_captain_verified' : 'away_captain_verified';

    const { error: updateError } = await supabase
      .from('games')
      .update({
        [verifiedAtField]: new Date().toISOString(),
        [captainVerifiedField]: true,
      })
      .eq('id', game.id);

    if (updateError) {
      console.error('Verify captain error:', updateError);
      return { success: false, error: 'Failed to verify' };
    }

    return { success: true, gameId: game.id, teamType };
  } catch (error) {
    console.error('Verify captain error:', error);
    return { success: false, error: 'Failed to verify' };
  }
}

/**
 * Get game summary stats
 */
export async function getGameSummary(gameId: string): Promise<{
  success: boolean;
  summary?: {
    homeGoals: number;
    awayGoals: number;
    homePenaltyMinutes: number;
    awayPenaltyMinutes: number;
    homeSaves: number;
    awaySaves: number;
    homeShots: number;
    awayShots: number;
    homePPGoals: number;
    awayPPGoals: number;
    homeSHGoals: number;
    awaySHGoals: number;
    homeENGoals: number;
    awayENGoals: number;
    periods: Array<{
      period: number;
      homeGoals: number;
      awayGoals: number;
      homeSaves: number;
      awaySaves: number;
    }>;
    scorers: Array<{
      playerId: string;
      playerName: string;
      teamType: 'home' | 'away';
      goals: number;
      assists: number;
      ppGoals: number;
      ppAssists: number;
      shGoals: number;
      shAssists: number;
    }>;
    goalies: Array<{
      playerId: string;
      playerName: string;
      teamType: 'home' | 'away';
      saves: number;
      goalsAgainst: number;
      shotsAgainst: number;
      savePercentage: number;
      periodStats: Array<{
        period: number;
        saves: number;
        goalsAgainst: number;
      }>;
    }>;
  };
  error?: string;
}> {
  try {
    // CRITICAL SECURITY: Verify active scorekeeper session before exposing summary data
    await verifyActiveScorekeeperSession(gameId);

    const supabase = await createServiceRoleClient();

    const { data: events, error } = await supabase
      .from('game_events')
      .select(`
        event_type,
        team_type,
        player_id,
        assist1_player_id,
        assist2_player_id,
        period,
        penalty_minutes,
        is_power_play,
        is_short_handed,
        is_empty_net,
        goalie_in_net_id,
        player:profiles!game_events_player_id_fkey(full_name)
      `)
      .eq('game_id', gameId)
      .is('deleted_at', null);

    if (error) {
      return { success: false, error: 'Failed to load events' };
    }

    const goals = events?.filter(e => e.event_type === 'goal') || [];
    const penalties = events?.filter(e => e.event_type === 'penalty') || [];
    const saves = events?.filter(e => e.event_type === 'save') || [];

    // Calculate period breakdown with saves
    const periods = [1, 2, 3].map(period => ({
      period,
      homeGoals: goals.filter(g => g.period === period && g.team_type === 'home').length,
      awayGoals: goals.filter(g => g.period === period && g.team_type === 'away').length,
      homeSaves: saves.filter(s => s.period === period && s.team_type === 'home').length,
      awaySaves: saves.filter(s => s.period === period && s.team_type === 'away').length,
    }));

    // Calculate scorer stats with PP/SH breakdown
    const scorerMap = new Map<string, {
      playerId: string;
      playerName: string;
      teamType: 'home' | 'away';
      goals: number;
      assists: number;
      ppGoals: number;
      ppAssists: number;
      shGoals: number;
      shAssists: number;
    }>();

    goals.forEach(g => {
      const key = g.player_id;
      const existing = scorerMap.get(key);
      const isPP = g.is_power_play || false;
      const isSH = g.is_short_handed || false;

      if (existing) {
        existing.goals += 1;
        if (isPP) existing.ppGoals += 1;
        if (isSH) existing.shGoals += 1;
      } else {
        scorerMap.set(key, {
          playerId: g.player_id,
          playerName: (g.player as { full_name: string })?.full_name || 'Unknown',
          teamType: g.team_type as 'home' | 'away',
          goals: 1,
          assists: 0,
          ppGoals: isPP ? 1 : 0,
          ppAssists: 0,
          shGoals: isSH ? 1 : 0,
          shAssists: 0,
        });
      }

      // Count assists with PP/SH tracking
      [g.assist1_player_id, g.assist2_player_id].forEach(assistId => {
        if (assistId) {
          const assistKey = assistId;
          const assistExisting = scorerMap.get(assistKey);
          if (assistExisting) {
            assistExisting.assists += 1;
            if (isPP) assistExisting.ppAssists += 1;
            if (isSH) assistExisting.shAssists += 1;
          } else {
            scorerMap.set(assistKey, {
              playerId: assistId,
              playerName: 'Unknown',
              teamType: g.team_type as 'home' | 'away',
              goals: 0,
              assists: 1,
              ppGoals: 0,
              ppAssists: isPP ? 1 : 0,
              shGoals: 0,
              shAssists: isSH ? 1 : 0,
            });
          }
        }
      });
    });

    // Calculate goalie stats with period breakdown and proper GA tracking
    const goalieMap = new Map<string, {
      playerId: string;
      playerName: string;
      teamType: 'home' | 'away';
      saves: number;
      goalsAgainst: number;
      periodSaves: Record<number, number>;
      periodGA: Record<number, number>;
    }>();

    saves.forEach(s => {
      const key = s.player_id;
      const existing = goalieMap.get(key);
      if (existing) {
        existing.saves += 1;
        existing.periodSaves[s.period] = (existing.periodSaves[s.period] || 0) + 1;
      } else {
        goalieMap.set(key, {
          playerId: s.player_id,
          playerName: (s.player as { full_name: string })?.full_name || 'Unknown',
          teamType: s.team_type as 'home' | 'away',
          saves: 1,
          goalsAgainst: 0,
          periodSaves: { [s.period]: 1 },
          periodGA: {},
        });
      }
    });

    // Goals against for goalies - use goalie_in_net_id if available
    goals.forEach(g => {
      if (g.goalie_in_net_id) {
        // Use the specific goalie who was in net
        const goalie = goalieMap.get(g.goalie_in_net_id);
        if (goalie) {
          goalie.goalsAgainst += 1;
          goalie.periodGA[g.period] = (goalie.periodGA[g.period] || 0) + 1;
        } else {
          // Goalie not in map yet (no saves recorded), add them
          goalieMap.set(g.goalie_in_net_id, {
            playerId: g.goalie_in_net_id,
            playerName: 'Unknown',
            teamType: g.team_type === 'home' ? 'away' : 'home',
            saves: 0,
            goalsAgainst: 1,
            periodSaves: {},
            periodGA: { [g.period]: 1 },
          });
        }
      } else {
        // Fallback: distribute to all goalies of opposite team
        const oppositeTeam = g.team_type === 'home' ? 'away' : 'home';
        goalieMap.forEach(goalie => {
          if (goalie.teamType === oppositeTeam) {
            goalie.goalsAgainst += 1;
            goalie.periodGA[g.period] = (goalie.periodGA[g.period] || 0) + 1;
          }
        });
      }
    });

    // Convert goalie map to array with calculated stats
    const goalies = Array.from(goalieMap.values()).map(g => {
      const shotsAgainst = g.saves + g.goalsAgainst;
      const savePercentage = shotsAgainst > 0 ? Math.round((g.saves / shotsAgainst) * 1000) / 10 : 100;

      return {
        playerId: g.playerId,
        playerName: g.playerName,
        teamType: g.teamType,
        saves: g.saves,
        goalsAgainst: g.goalsAgainst,
        shotsAgainst,
        savePercentage,
        periodStats: [1, 2, 3].map(period => ({
          period,
          saves: g.periodSaves[period] || 0,
          goalsAgainst: g.periodGA[period] || 0,
        })),
      };
    });

    const summary = {
      homeGoals: goals.filter(g => g.team_type === 'home').length,
      awayGoals: goals.filter(g => g.team_type === 'away').length,
      homePenaltyMinutes: penalties.filter(p => p.team_type === 'home').reduce((sum, p) => sum + (p.penalty_minutes || 0), 0),
      awayPenaltyMinutes: penalties.filter(p => p.team_type === 'away').reduce((sum, p) => sum + (p.penalty_minutes || 0), 0),
      homeSaves: saves.filter(s => s.team_type === 'home').length,
      awaySaves: saves.filter(s => s.team_type === 'away').length,
      homeShots: goals.filter(g => g.team_type === 'away').length + saves.filter(s => s.team_type === 'home').length,
      awayShots: goals.filter(g => g.team_type === 'home').length + saves.filter(s => s.team_type === 'away').length,
      // PP/SH/EN breakdown
      homePPGoals: goals.filter(g => g.team_type === 'home' && g.is_power_play).length,
      awayPPGoals: goals.filter(g => g.team_type === 'away' && g.is_power_play).length,
      homeSHGoals: goals.filter(g => g.team_type === 'home' && g.is_short_handed).length,
      awaySHGoals: goals.filter(g => g.team_type === 'away' && g.is_short_handed).length,
      homeENGoals: goals.filter(g => g.team_type === 'home' && g.is_empty_net).length,
      awayENGoals: goals.filter(g => g.team_type === 'away' && g.is_empty_net).length,
      periods,
      scorers: Array.from(scorerMap.values()).sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists)),
      goalies,
    };

    return { success: true, summary };
  } catch (error) {
    console.error('Get game summary error:', error);
    return { success: false, error: 'Failed to load summary' };
  }
}

/**
 * Roll up game stats to player_stats and standings
 */
export async function finalizeGameStats(gameId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // CRITICAL SECURITY: Verify active scorekeeper session before finalizing stats
    await verifyActiveScorekeeperSession(gameId);

    const supabase = await createServiceRoleClient();

    // Call the rollup RPC function if it exists
    const { error } = await supabase.rpc('rollup_game_stats', {
      p_game_id: gameId,
    });

    if (error) {
      // If RPC doesn't exist, just update game status
      console.warn('Rollup RPC not found, updating game status only');
    }

    // Update game status to completed
    await supabase
      .from('games')
      .update({
        status: 'completed',
      })
      .eq('id', gameId);

    return { success: true };
  } catch (error) {
    console.error('Finalize stats error:', error);
    return { success: false, error: 'Failed to finalize stats' };
  }
}
