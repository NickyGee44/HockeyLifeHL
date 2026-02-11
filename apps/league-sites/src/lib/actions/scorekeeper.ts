'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies, headers } from 'next/headers';

// Session cookie name for scorekeeper tokens
const SCOREKEEPER_SESSION_COOKIE = 'sk_session';

// =============================================================================
// Rate limiting (in-memory, same approach as league-builder)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface TokenFailureEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptTime: number;
}

const ipRateLimitStore = new Map<string, RateLimitEntry>();
const tokenFailureStore = new Map<string, TokenFailureEntry>();

const IP_RATE_LIMIT = 5;
const IP_WINDOW_MS = 60 * 1000;
const TOKEN_FAILURE_LIMIT = 10;
const TOKEN_LOCKOUT_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string, token: string): {
  allowed: boolean;
  error?: string;
  shouldShowCaptcha?: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const ipKey = `ip:${ip}`;

  // Check IP rate limit
  let ipEntry = ipRateLimitStore.get(ipKey);
  if (!ipEntry || ipEntry.resetTime < now) {
    ipEntry = { count: 1, resetTime: now + IP_WINDOW_MS };
    ipRateLimitStore.set(ipKey, ipEntry);
  } else {
    ipEntry.count++;
    if (ipEntry.count > IP_RATE_LIMIT) {
      return {
        allowed: false,
        error: `Too many attempts. Please try again in ${Math.ceil((ipEntry.resetTime - now) / 1000)} seconds.`,
        shouldShowCaptcha: true,
        retryAfterMs: ipEntry.resetTime - now,
      };
    }
  }

  // Check token failure limit
  const tokenKey = `token:${token.toUpperCase()}`;
  const tokenEntry = tokenFailureStore.get(tokenKey);
  if (tokenEntry) {
    if (tokenEntry.lockedUntil && tokenEntry.lockedUntil > now) {
      return {
        allowed: false,
        error: `Token locked. Try again in ${Math.ceil((tokenEntry.lockedUntil - now) / 60000)} minutes.`,
        retryAfterMs: tokenEntry.lockedUntil - now,
      };
    }
    if (tokenEntry.lockedUntil && tokenEntry.lockedUntil <= now) {
      tokenFailureStore.delete(tokenKey);
    }
  }

  return { allowed: true, shouldShowCaptcha: (ipEntry.count) >= 3 };
}

function recordFailure(token: string) {
  const now = Date.now();
  const key = `token:${token.toUpperCase()}`;
  const entry = tokenFailureStore.get(key);
  if (!entry) {
    tokenFailureStore.set(key, { failedAttempts: 1, lockedUntil: null, lastAttemptTime: now });
  } else {
    entry.failedAttempts++;
    entry.lastAttemptTime = now;
    if (entry.failedAttempts >= TOKEN_FAILURE_LIMIT) {
      entry.lockedUntil = now + TOKEN_LOCKOUT_MS;
    }
  }
}

function clearFailures(token: string) {
  tokenFailureStore.delete(`token:${token.toUpperCase()}`);
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of ipRateLimitStore) {
      if (entry.resetTime < now) ipRateLimitStore.delete(key);
    }
    for (const [key, entry] of tokenFailureStore) {
      if (entry.lockedUntil && entry.lockedUntil < now) tokenFailureStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

// =============================================================================
// Types (shared with components)
// =============================================================================

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
  sessionType: 'single' | 'multi';
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
  timerRunning: boolean;
  timerStartedAt: string | null;
  timerElapsedSeconds: number;
  homeGoaliePulled: boolean;
  awayGoaliePulled: boolean;
}

export interface TeamData {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  roster: PlayerData[];
  captainId: string | null;
  captainName: string | null;
}

export interface PlayerData {
  id: string;
  fullName: string;
  avatarUrl: string | null;
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
  isGWG: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface SessionGameInfo {
  gameId: string;
  gameOrder: number;
  startedAt: string | null;
  completedAt: string | null;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
  status: string;
  homeScore: number;
  awayScore: number;
}

// =============================================================================
// Session lookup helper
// =============================================================================

type SessionLookupResult = {
  sessionId: string;
  gameId: string;
  leagueId: string;
  expiresAt: string;
  isValid: boolean;
  gameStatus: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
  sessionType: 'single' | 'multi';
  accessCount: number;
};

async function lookupSessionByToken(
  rawToken: string,
  options?: { touchAccess?: boolean }
): Promise<SessionLookupResult | null> {
  const token = rawToken.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  if (!token) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await (supabase as any)
    .from('scorekeeper_sessions')
    .select(`
      id,
      game_id,
      league_id,
      expires_at,
      is_active,
      access_count,
      session_type,
      games!inner(
        status,
        scheduled_at,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name)
      )
    `)
    .eq('token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;

  const nowMs = Date.now();
  const expiresAtMs = new Date(data.expires_at as string).getTime();
  const isValid = Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
  const accessCount = Number((data.access_count as number | null) ?? 0);

  if (options?.touchAccess && isValid) {
    await (supabase as any)
      .from('scorekeeper_sessions')
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: accessCount + 1,
      })
      .eq('id', data.id);
  }

  const game = data.games as {
    status: string | null;
    scheduled_at: string;
    home_team: { name: string } | null;
    away_team: { name: string } | null;
  };

  return {
    sessionId: data.id,
    gameId: data.game_id,
    leagueId: data.league_id,
    expiresAt: data.expires_at,
    isValid,
    gameStatus: game?.status || 'scheduled',
    homeTeamName: game?.home_team?.name || 'Home',
    awayTeamName: game?.away_team?.name || 'Away',
    scheduledAt: game?.scheduled_at || new Date().toISOString(),
    sessionType: (data.session_type as 'single' | 'multi') || 'single',
    accessCount,
  };
}

/**
 * Verify active scorekeeper session for a given game.
 * Supports both single-game and multi-game sessions.
 */
async function verifyActiveSession(gameId: string): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SCOREKEEPER_SESSION_COOKIE)?.value;

  if (!token) {
    throw new Error('No scorekeeper session found. Please log in with a valid token.');
  }

  const session = await lookupSessionByToken(token, { touchAccess: false });

  if (!session || !session.isValid) {
    throw new Error('Invalid scorekeeper session. Token may be expired or revoked.');
  }

  // For single-game sessions, verify direct match
  if (session.sessionType === 'single') {
    if (session.gameId !== gameId) {
      throw new Error('Session mismatch: This session is not for this game.');
    }
    return session.sessionId;
  }

  // For multi-game sessions, check if gameId is in session_games
  const supabase = createServiceRoleClient();
  const { data: sessionGame } = await (supabase as any)
    .from('scorekeeper_session_games')
    .select('id')
    .eq('session_id', session.sessionId)
    .eq('game_id', gameId)
    .maybeSingle();

  if (!sessionGame) {
    throw new Error('This game is not part of your scorekeeper session.');
  }

  return session.sessionId;
}

// =============================================================================
// Public server actions
// =============================================================================

/**
 * Validate a scorekeeper token and set session cookie
 */
export async function validateScorekeeperToken(token: string): Promise<{
  success: boolean;
  session?: ScorekeeperSession;
  error?: string;
  shouldShowCaptcha?: boolean;
  retryAfterMs?: number;
}> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    const rateLimitCheck = checkRateLimit(clientIp, token);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: rateLimitCheck.error,
        shouldShowCaptcha: rateLimitCheck.shouldShowCaptcha,
        retryAfterMs: rateLimitCheck.retryAfterMs,
      };
    }

    const normalizedToken = token.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    const session = await lookupSessionByToken(normalizedToken, { touchAccess: true });

    if (!session || !session.isValid) {
      recordFailure(token);
      return {
        success: false,
        error: 'Token expired or invalid',
        shouldShowCaptcha: rateLimitCheck.shouldShowCaptcha,
      };
    }

    clearFailures(token);

    // Store token in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(SCOREKEEPER_SESSION_COOKIE, normalizedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return {
      success: true,
      session: {
        sessionId: session.sessionId,
        gameId: session.gameId,
        leagueId: session.leagueId,
        isValid: session.isValid,
        expiresAt: session.expiresAt,
        gameStatus: session.gameStatus,
        homeTeamName: session.homeTeamName,
        awayTeamName: session.awayTeamName,
        scheduledAt: session.scheduledAt,
        sessionType: session.sessionType,
      },
    };
  } catch (error) {
    console.error('Token validation error:', error);
    recordFailure(token);
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
 * Get all games in a multi-game session
 */
export async function getSessionGames(token?: string): Promise<{
  success: boolean;
  games?: SessionGameInfo[];
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const sessionToken = token || cookieStore.get(SCOREKEEPER_SESSION_COOKIE)?.value;
    if (!sessionToken) {
      return { success: false, error: 'No session found' };
    }

    const session = await lookupSessionByToken(sessionToken);
    if (!session || !session.isValid) {
      return { success: false, error: 'Invalid session' };
    }

    if (session.sessionType === 'single') {
      // Return the single game
      return {
        success: true,
        games: [{
          gameId: session.gameId,
          gameOrder: 0,
          startedAt: null,
          completedAt: null,
          homeTeamName: session.homeTeamName,
          awayTeamName: session.awayTeamName,
          scheduledAt: session.scheduledAt,
          status: session.gameStatus,
          homeScore: 0,
          awayScore: 0,
        }],
      };
    }

    // Multi-game session: fetch from scorekeeper_session_games
    const supabase = createServiceRoleClient();
    const { data, error } = await (supabase as any)
      .from('scorekeeper_session_games')
      .select(`
        game_id,
        game_order,
        started_at,
        completed_at,
        games!inner(
          status,
          scheduled_at,
          home_score,
          away_score,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        )
      `)
      .eq('session_id', session.sessionId)
      .order('game_order', { ascending: true });

    if (error) {
      console.error('Get session games error:', error);
      return { success: false, error: 'Failed to load session games' };
    }

    const games: SessionGameInfo[] = (data || []).map((row: any) => ({
      gameId: row.game_id,
      gameOrder: row.game_order,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      homeTeamName: row.games?.home_team?.name || 'Home',
      awayTeamName: row.games?.away_team?.name || 'Away',
      scheduledAt: row.games?.scheduled_at || '',
      status: row.games?.status || 'scheduled',
      homeScore: row.games?.home_score || 0,
      awayScore: row.games?.away_score || 0,
    }));

    return { success: true, games };
  } catch (error) {
    console.error('Get session games error:', error);
    return { success: false, error: 'Failed to load session games' };
  }
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
    await verifyActiveSession(gameId);

    const supabase = createServiceRoleClient();

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
        timer_running,
        timer_started_at,
        timer_elapsed_seconds,
        home_goalie_pulled,
        away_goalie_pulled,
        home_team:teams!games_home_team_id_fkey(
          id, name, short_name, logo_url, primary_color, secondary_color, captain_id
        ),
        away_team:teams!games_away_team_id_fkey(
          id, name, short_name, logo_url, primary_color, secondary_color, captain_id
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
          player_id, jersey_number, position, leadership_role,
          profiles!team_rosters_player_id_fkey(id, full_name, avatar_url)
        `)
        .eq('team_id', (game.home_team as { id: string }).id)
        .eq('status', 'active'),
      (supabase as any)
        .from('team_rosters')
        .select(`
          player_id, jersey_number, position, leadership_role,
          profiles!team_rosters_player_id_fkey(id, full_name, avatar_url)
        `)
        .eq('team_id', (game.away_team as { id: string }).id)
        .eq('status', 'active'),
    ]);

    const formatRoster = (roster: any[] | null): PlayerData[] => {
      if (!roster) return [];
      return roster
        .filter(r => r.profiles)
        .map(r => ({
          id: r.player_id,
          fullName: r.profiles.full_name,
          avatarUrl: r.profiles.avatar_url || null,
          jerseyNumber: r.jersey_number,
          position: r.position as 'Forward' | 'Defense' | 'Goalie',
          isCaptain: r.leadership_role === 'captain',
          isAssistantCaptain: r.leadership_role === 'alternate_captain',
        }))
        .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
    };

    const homeRoster = formatRoster(homeRosterResult.data);
    const awayRoster = formatRoster(awayRosterResult.data);
    const homeCaptain = homeRoster.find(p => p.isCaptain);
    const awayCaptain = awayRoster.find(p => p.isCaptain);

    const homeTeam = game.home_team as any;
    const awayTeam = game.away_team as any;

    return {
      success: true,
      game: {
        id: game.id,
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.name,
          shortName: homeTeam.short_name,
          logoUrl: homeTeam.logo_url,
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
          logoUrl: awayTeam.logo_url,
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
        timerRunning: game.timer_running || false,
        timerStartedAt: game.timer_started_at || null,
        timerElapsedSeconds: game.timer_elapsed_seconds || 0,
        homeGoaliePulled: game.home_goalie_pulled || false,
        awayGoaliePulled: game.away_goalie_pulled || false,
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
    await verifyActiveSession(gameId);

    const supabase = createServiceRoleClient();

    const { data: events, error } = await supabase
      .from('game_events')
      .select(`
        id, client_event_id, event_type, period, game_time_seconds,
        team_id, team_type, player_id,
        assist1_player_id, assist2_player_id,
        penalty_type, penalty_minutes,
        is_power_play, is_short_handed, is_empty_net,
        created_at, deleted_at,
        player:profiles!game_events_player_id_fkey(full_name),
        assist1:profiles!game_events_assist1_player_id_fkey(full_name),
        assist2:profiles!game_events_assist2_player_id_fkey(full_name)
      `)
      .eq('game_id', gameId)
      .order('period', { ascending: true })
      .order('game_time_seconds', { ascending: false });

    if (error) {
      return { success: false, error: 'Failed to load events' };
    }

    const { data: game } = await supabase
      .from('games')
      .select('home_team_id, away_team_id')
      .eq('id', gameId)
      .single();

    if (!game) return { success: false, error: 'Game not found' };

    const { data: rosters } = await supabase
      .from('team_rosters')
      .select('player_id, jersey_number')
      .in('team_id', [game.home_team_id, game.away_team_id]);

    const jerseyMap = new Map(rosters?.map((r: { player_id: string; jersey_number: number | null }) => [r.player_id, r.jersey_number]) || []);

    // Check for is_gwg column existence
    const formattedEvents: GameEventData[] = (events || []).map((e: any) => ({
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
      isGWG: e.is_gwg || false,
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
  goalieInNetId?: string;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const sessionId = await verifyActiveSession(data.gameId);
    const supabase = createServiceRoleClient();

    const { data: game } = await supabase
      .from('games')
      .select('league_id')
      .eq('id', data.gameId)
      .single();

    if (!game) return { success: false, error: 'Game not found' };

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
  penaltyType: string;
  penaltyMinutes: number;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const sessionId = await verifyActiveSession(data.gameId);
    const supabase = createServiceRoleClient();

    const { data: game } = await supabase
      .from('games')
      .select('league_id')
      .eq('id', data.gameId)
      .single();

    if (!game) return { success: false, error: 'Game not found' };

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
 * Add a shot/save event
 */
export async function addShotEvent(data: {
  gameId: string;
  teamId: string;
  teamType: 'home' | 'away';
  goalieId: string;
  shotByPlayerId?: string;
  period: number;
  gameTimeSeconds?: number;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const sessionId = await verifyActiveSession(data.gameId);
    const supabase = createServiceRoleClient();

    const { data: game } = await supabase
      .from('games')
      .select('league_id')
      .eq('id', data.gameId)
      .single();

    if (!game) return { success: false, error: 'Game not found' };

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
        assist1_player_id: data.shotByPlayerId || null,
        event_type: 'save',
        period: data.period,
        game_time_seconds: data.gameTimeSeconds || null,
        entered_by: sessionId,
        entered_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Add shot error:', error);
      return { success: false, error: 'Failed to record shot' };
    }

    return { success: true, eventId: event.id };
  } catch (error) {
    console.error('Add shot error:', error);
    return { success: false, error: 'Failed to record shot' };
  }
}

/**
 * Undo/soft-delete an event
 */
export async function undoEvent(eventId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createServiceRoleClient();

    const { data: event } = await supabase
      .from('game_events')
      .select('game_id')
      .eq('id', eventId)
      .single();

    if (!event) return { success: false, error: 'Event not found' };

    const sessionId = await verifyActiveSession(event.game_id);

    const { error } = await supabase
      .from('game_events')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: sessionId,
      })
      .eq('id', eventId);

    if (error) {
      return { success: false, error: 'Failed to undo event' };
    }

    return { success: true };
  } catch (error) {
    console.error('Undo event error:', error);
    return { success: false, error: 'Failed to undo event' };
  }
}

/**
 * Sync timer state to server
 */
export async function syncTimerState(
  gameId: string,
  state: {
    timerRunning: boolean;
    timerElapsedSeconds: number;
    currentPeriod: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyActiveSession(gameId);

    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('games')
      .update({
        timer_running: state.timerRunning,
        timer_elapsed_seconds: state.timerElapsedSeconds,
        current_period: state.currentPeriod,
        timer_started_at: state.timerRunning ? new Date().toISOString() : null,
      })
      .eq('id', gameId);

    if (error) {
      console.error('Sync timer error:', error);
      return { success: false, error: 'Failed to sync timer' };
    }

    return { success: true };
  } catch (error) {
    console.error('Sync timer error:', error);
    return { success: false, error: 'Failed to sync timer' };
  }
}

/**
 * Toggle goalie pull state
 */
export async function toggleGoaliePull(
  gameId: string,
  teamType: 'home' | 'away'
): Promise<{ success: boolean; pulled?: boolean; error?: string }> {
  try {
    await verifyActiveSession(gameId);

    const supabase = createServiceRoleClient();
    const column = teamType === 'home' ? 'home_goalie_pulled' : 'away_goalie_pulled';

    // Get current state
    const { data: game } = await supabase
      .from('games')
      .select(column)
      .eq('id', gameId)
      .single();

    if (!game) return { success: false, error: 'Game not found' };

    const currentPulled = (game as any)[column] || false;
    const newPulled = !currentPulled;

    const { error } = await supabase
      .from('games')
      .update({ [column]: newPulled })
      .eq('id', gameId);

    if (error) {
      return { success: false, error: 'Failed to toggle goalie' };
    }

    return { success: true, pulled: newPulled };
  } catch (error) {
    console.error('Toggle goalie error:', error);
    return { success: false, error: 'Failed to toggle goalie' };
  }
}

/**
 * Update game status (e.g., to 'in_progress' when starting)
 */
export async function updateGameStatus(
  gameId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyActiveSession(gameId);

    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('games')
      .update({ status })
      .eq('id', gameId);

    if (error) {
      return { success: false, error: 'Failed to update game status' };
    }

    return { success: true };
  } catch (error) {
    console.error('Update game status error:', error);
    return { success: false, error: 'Failed to update game status' };
  }
}
