'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies, headers } from 'next/headers';

// Session cookie name for referee tokens
const REFEREE_SESSION_COOKIE = 'ref_session';

// =============================================================================
// Rate limiting (in-memory, mirrors scorekeeper pattern)
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
  const ipKey = `ref-ip:${ip}`;

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

  const tokenKey = `ref-token:${token.toUpperCase()}`;
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
  const key = `ref-token:${token.toUpperCase()}`;
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
  tokenFailureStore.delete(`ref-token:${token.toUpperCase()}`);
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
// Types
// =============================================================================

export interface RefereeSession {
  sessionId: string;
  leagueId: string;
  leagueRefereeId: string;
  refereeId: string | null;
  displayName: string;
  isValid: boolean;
  expiresAt: string;
}

export interface RefereeDashboardData {
  referee: {
    id: string;
    displayName: string;
    email: string | null;
    leagueId: string;
    leagueName: string;
    certification: string | null;
    canReferee: boolean;
    canLinesman: boolean;
    totalAssignments: number;
    completedAssignments: number;
  };
  upcomingGames: RefereeDashboardGame[];
  completedGames: RefereeDashboardGame[];
}

export interface RefereeDashboardGame {
  id: string;
  scheduledAt: string;
  status: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  venueName: string | null;
  role: string;
  assignmentStatus: string;
}

// =============================================================================
// Session lookup helper
// =============================================================================

async function lookupRefereeSessionByToken(
  rawToken: string,
  options?: { touchAccess?: boolean }
): Promise<{
  sessionId: string;
  leagueId: string;
  leagueRefereeId: string;
  refereeId: string | null;
  expiresAt: string;
  isValid: boolean;
} | null> {
  const token = rawToken.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  if (!token) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await (supabase as any)
    .from('referee_sessions')
    .select('id, league_id, league_referee_id, referee_id, expires_at, is_active, access_count')
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
      .from('referee_sessions')
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: accessCount + 1,
      })
      .eq('id', data.id);
  }

  return {
    sessionId: data.id,
    leagueId: data.league_id,
    leagueRefereeId: data.league_referee_id,
    refereeId: data.referee_id,
    expiresAt: data.expires_at,
    isValid,
  };
}

// =============================================================================
// Public server actions
// =============================================================================

/**
 * Validate a referee token and set session cookie
 */
export async function validateRefereeToken(token: string): Promise<{
  success: boolean;
  session?: RefereeSession;
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
    const session = await lookupRefereeSessionByToken(normalizedToken, { touchAccess: true });

    if (!session || !session.isValid) {
      recordFailure(token);
      return {
        success: false,
        error: 'Token expired or invalid',
        shouldShowCaptcha: rateLimitCheck.shouldShowCaptcha,
      };
    }

    // Get display name from league_referees
    const supabase = createServiceRoleClient();
    const { data: referee } = await (supabase as any)
      .from('league_referees')
      .select('display_name')
      .eq('id', session.leagueRefereeId)
      .single();

    clearFailures(token);

    // Store token in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(REFEREE_SESSION_COOKIE, normalizedToken, {
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
        leagueId: session.leagueId,
        leagueRefereeId: session.leagueRefereeId,
        refereeId: session.refereeId,
        displayName: referee?.display_name || 'Referee',
        isValid: session.isValid,
        expiresAt: session.expiresAt,
      },
    };
  } catch (error) {
    console.error('Referee token validation error:', error);
    recordFailure(token);
    return { success: false, error: 'Failed to validate token' };
  }
}

/**
 * Get current referee session from cookie.
 */
export async function getRefereeSession(): Promise<{
  success: boolean;
  session?: RefereeSession;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(REFEREE_SESSION_COOKIE)?.value;
    if (!token) {
      return { success: false, error: 'No session found' };
    }

    const session = await lookupRefereeSessionByToken(token);
    if (!session || !session.isValid) {
      return { success: false, error: 'Session expired or invalid' };
    }

    // Get display name
    const supabase = createServiceRoleClient();
    const { data: referee } = await (supabase as any)
      .from('league_referees')
      .select('display_name')
      .eq('id', session.leagueRefereeId)
      .single();

    return {
      success: true,
      session: {
        sessionId: session.sessionId,
        leagueId: session.leagueId,
        leagueRefereeId: session.leagueRefereeId,
        refereeId: session.refereeId,
        displayName: referee?.display_name || 'Referee',
        isValid: session.isValid,
        expiresAt: session.expiresAt,
      },
    };
  } catch (error) {
    console.error('Get referee session error:', error);
    return { success: false, error: 'Failed to get session' };
  }
}

/**
 * Clear referee session
 */
export async function clearRefereeSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(REFEREE_SESSION_COOKIE);
}

/**
 * Get referee dashboard data (assignments from game_officials + league_referees profile)
 */
export async function getRefereeDashboard(): Promise<{
  success: boolean;
  data?: RefereeDashboardData;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(REFEREE_SESSION_COOKIE)?.value;
    if (!token) {
      return { success: false, error: 'No valid referee session found' };
    }

    const session = await lookupRefereeSessionByToken(token);
    if (!session || !session.isValid) {
      return { success: false, error: 'Session expired or invalid' };
    }

    const supabase = createServiceRoleClient();
    const { leagueRefereeId, leagueId } = session;

    // Get referee profile
    const { data: referee, error: refError } = await (supabase as any)
      .from('league_referees')
      .select(`
        id,
        display_name,
        email,
        league_id,
        certification,
        can_referee,
        can_linesman,
        total_assignments,
        completed_assignments,
        leagues!league_referees_league_id_fkey(name)
      `)
      .eq('id', leagueRefereeId)
      .single();

    if (refError || !referee) {
      return { success: false, error: 'Referee profile not found' };
    }

    // Get assigned games via game_officials (linked by league_referee_id)
    const { data: assignments } = await (supabase as any)
      .from('game_officials')
      .select(`
        id,
        role,
        assignment_status,
        games!inner(
          id,
          scheduled_at,
          status,
          home_score,
          away_score,
          location,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        )
      `)
      .eq('league_referee_id', leagueRefereeId);

    const now = new Date();
    const allGames: RefereeDashboardGame[] = (assignments || []).map((a: any) => ({
      id: a.games.id,
      scheduledAt: a.games.scheduled_at,
      status: a.games.status || 'scheduled',
      homeTeamName: a.games.home_team?.name || 'Home',
      awayTeamName: a.games.away_team?.name || 'Away',
      homeScore: a.games.home_score ?? 0,
      awayScore: a.games.away_score ?? 0,
      venueName: a.games.location || null,
      role: a.role || 'referee',
      assignmentStatus: a.assignment_status || 'confirmed',
    }));

    const upcomingGames = allGames
      .filter(g => new Date(g.scheduledAt) >= now && g.status !== 'completed' && g.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const completedGames = allGames
      .filter(g => g.status === 'completed' || new Date(g.scheduledAt) < now)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    const leagueName = (referee.leagues as any)?.name || 'League';

    return {
      success: true,
      data: {
        referee: {
          id: referee.id,
          displayName: referee.display_name,
          email: referee.email,
          leagueId: referee.league_id,
          leagueName,
          certification: referee.certification,
          canReferee: referee.can_referee,
          canLinesman: referee.can_linesman,
          totalAssignments: referee.total_assignments ?? 0,
          completedAssignments: referee.completed_assignments ?? 0,
        },
        upcomingGames,
        completedGames,
      },
    };
  } catch (error) {
    console.error('Get referee dashboard error:', error);
    return { success: false, error: 'Failed to load dashboard' };
  }
}
