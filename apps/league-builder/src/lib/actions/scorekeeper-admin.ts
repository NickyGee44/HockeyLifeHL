'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendScorekeeperAssignmentEmail } from '@/lib/email/scorekeeper-emails';
import { randomBytes } from 'crypto';
import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';

/**
 * Check if the current user is a platform admin.
 * Used as fallback when league membership check fails.
 */
async function checkPlatformAdmin(userId: string): Promise<boolean> {
  return isUserPlatformAdmin(userId);
}

function getLeagueSiteOrigin(league: {
  slug?: string | null;
  custom_domain?: string | null;
  custom_domain_verified?: boolean | null;
}): string {
  const baseDomain = process.env.NEXT_PUBLIC_SITES_BASE_DOMAIN || 'beerleaguehockey.ca';
  const customDomain = league.custom_domain_verified ? league.custom_domain : null;
  if (customDomain) return `https://${customDomain}`;
  if (!league.slug) return process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';
  return `https://${league.slug}.${baseDomain}`;
}

/**
 * Generate a cryptographically secure 16-character alphanumeric token
 *
 * Security: Uses crypto.randomBytes() instead of Math.random() to prevent
 * token prediction attacks. Math.random() only has 2^32 possible seeds,
 * making it vulnerable to brute force. crypto.randomBytes() provides
 * cryptographically secure randomness.
 *
 * Format: 16 uppercase alphanumeric characters (A-Z, 0-9)
 * Entropy: ~83 bits (36^16 ≈ 7.9e24 combinations)
 */
function generateToken(): string {
  const bytes = randomBytes(24);
  const token = bytes
    .toString('base64')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .substring(0, 16);

  if (token.length < 16) {
    return generateToken();
  }

  return token;
}

/**
 * Assign a scorekeeper to a game and generate access token
 */
export async function assignScorekeeperToGame(params: {
  gameId: string;
  scorekeeperName?: string;
  scorekeeperEmail: string;
  sendEmail?: boolean;
}): Promise<{
  success: boolean;
  token?: string;
  accessLink?: string;
  sessionId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceRoleClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get game details to verify ownership and get league info
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        id,
        league_id,
        home_team_id,
        away_team_id,
        scheduled_at,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name),
        leagues!inner(
          id,
          name,
          created_by,
          slug,
          custom_domain,
          custom_domain_verified
        )
      `)
      .eq('id', params.gameId)
      .single();

    if (gameError || !game) {
      return { success: false, error: 'Game not found' };
    }

    // Verify user has permission (owner or admin)
    const league = game.leagues as any;
    const isCreator = league.created_by === user.id;
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', game.league_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const isAuthorized = isCreator || (membership && ['owner', 'admin'].includes(membership.role));

    if (!isAuthorized) {
      // Fallback: platform admins get owner-level access to all leagues
      const isPlatformAdmin = await checkPlatformAdmin(user.id);
      if (!isPlatformAdmin) {
        return { success: false, error: 'Not authorized to assign scorekeepers for this game' };
      }
    }

    // Generate unique token
    let token = generateToken();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure token is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await serviceClient
        .from('scorekeeper_sessions')
        .select('id')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (!existing) break;
      token = generateToken();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return { success: false, error: 'Failed to generate unique token' };
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Revoke any previous active sessions for this game before issuing a fresh token.
    await serviceClient
      .from('scorekeeper_sessions')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id,
        deactivation_reason: 'Reassigned by admin',
      })
      .eq('game_id', params.gameId)
      .eq('is_active', true);

    // Best-effort resolution: if this email matches a league scorekeeper profile,
    // write both assignment + session ownership fields for downstream dashboards.
    const normalizedEmail = params.scorekeeperEmail.trim().toLowerCase();

    const { data: matchedLeagueScorekeeper } = await serviceClient
      .from('league_scorekeepers')
      .select('id, scorekeeper_id')
      .eq('league_id', game.league_id)
      .eq('is_active', true)
      .ilike('email', normalizedEmail)
      .maybeSingle();

    let resolvedScorekeeperId = (matchedLeagueScorekeeper as any)?.scorekeeper_id as string | undefined;
    let resolvedLeagueScorekeeperId = (matchedLeagueScorekeeper as any)?.id as string | undefined;

    // Fallback: direct profile match by email (useful when league_scorekeepers row is missing)
    if (!resolvedScorekeeperId) {
      const { data: profileByEmail } = await serviceClient
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      resolvedScorekeeperId = (profileByEmail as any)?.id as string | undefined;

      if (resolvedScorekeeperId && !resolvedLeagueScorekeeperId) {
        const { data: leagueScorekeeperByProfile } = await serviceClient
          .from('league_scorekeepers')
          .select('id')
          .eq('league_id', game.league_id)
          .eq('scorekeeper_id', resolvedScorekeeperId)
          .eq('is_active', true)
          .maybeSingle();
        resolvedLeagueScorekeeperId = (leagueScorekeeperByProfile as any)?.id as string | undefined;
      }
    }

    // Create scorekeeper session using service role client (bypasses RLS)
    const { data: session, error: sessionError } = await serviceClient
      .from('scorekeeper_sessions')
      .insert({
        game_id: params.gameId,
        league_id: game.league_id,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        scorekeeper_id: resolvedScorekeeperId ?? null,
        league_scorekeeper_id: resolvedLeagueScorekeeperId ?? null,
        session_type: 'single',
        session_origin: 'assigned_scorekeeper',
        is_active: true,
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('Session creation error:', sessionError);
      return { success: false, error: 'Failed to create scorekeeper session' };
    }

    // Keep assignment table in sync for schedule/admin views when a profile is resolvable.
    if (resolvedScorekeeperId) {
      const { data: existingAssignment } = await serviceClient
        .from('game_scorekeeper_assignments')
        .select('id')
        .eq('game_id', params.gameId)
        .maybeSingle();

      if (existingAssignment?.id) {
        await serviceClient
          .from('game_scorekeeper_assignments')
          .update({
            scorekeeper_id: resolvedScorekeeperId,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
          })
          .eq('id', existingAssignment.id);
      } else {
        await serviceClient
          .from('game_scorekeeper_assignments')
          .insert({
            game_id: params.gameId,
            league_id: game.league_id,
            scorekeeper_id: resolvedScorekeeperId,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
          });
      }
    }

    // Scorekeeper app lives on league sites (subdomain/custom domain), not locale-prefixed builder routes.
    const accessLink = `${getLeagueSiteOrigin(league)}/scorekeeper?token=${token}`;

    // Send email if requested
    if (params.sendEmail && params.scorekeeperEmail) {
      const homeTeam = game.home_team as { id: string; name: string };
      const awayTeam = game.away_team as { id: string; name: string };

      try {
        await sendScorekeeperAssignmentEmail({
          to: params.scorekeeperEmail,
          scorekeeperName: params.scorekeeperName || 'Scorekeeper',
          leagueName: league.name,
          homeTeamName: homeTeam.name,
          awayTeamName: awayTeam.name,
          gameDate: new Date(game.scheduled_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          gameTime: new Date(game.scheduled_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
          token,
          accessLink,
          expiresAt: expiresAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
        });
      } catch (emailError) {
        console.error('Scorekeeper assignment email failed:', emailError);
      }
    }

    return {
      success: true,
      token,
      accessLink,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Assign scorekeeper error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign scorekeeper',
    };
  }
}

/**
 * Get all scorekeeper assignments for a league
 */
export async function getScorekeeperAssignments(leagueId: string): Promise<{
  success: boolean;
  assignments?: Array<{
    id: string;
    gameId: string;
    token: string;
    expiresAt: string;
    isActive: boolean;
    accessCount: number;
    lastAccessedAt: string | null;
    createdAt: string;
    homeTeamName: string;
    awayTeamName: string;
    scheduledAt: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user has permission for this league
    const { data: league } = await supabase
      .from('leagues')
      .select(`
        id,
        created_by
      `)
      .eq('id', leagueId)
      .single();

    if (!league) {
      return { success: false, error: 'League not found' };
    }

    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const isCreator = (league as any).created_by === user.id;
    const isAuthorized = isCreator || (membership && ['owner', 'admin'].includes(membership.role));

    if (!isAuthorized) {
      // Fallback: platform admins get owner-level access to all leagues
      const isPlatformAdmin = await checkPlatformAdmin(user.id);
      if (!isPlatformAdmin) {
        return { success: false, error: 'Not authorized to view scorekeeper assignments' };
      }
    }

    // Get all scorekeeper sessions for this league
    const { data: sessions, error: sessionsError } = await supabase
      .from('scorekeeper_sessions')
      .select(`
        id,
        game_id,
        token,
        expires_at,
        is_active,
        access_count,
        last_accessed_at,
        created_at,
        games!inner(
          id,
          scheduled_at,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        )
      `)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError);
      return { success: false, error: 'Failed to load scorekeeper assignments' };
    }

    const assignments = (sessions || []).map((session) => {
      const game = session.games as any;
      return {
        id: session.id,
        gameId: session.game_id,
        token: session.token,
        expiresAt: session.expires_at,
        isActive: session.is_active || false,
        accessCount: session.access_count || 0,
        lastAccessedAt: session.last_accessed_at,
        createdAt: session.created_at || '',
        homeTeamName: game.home_team.name,
        awayTeamName: game.away_team.name,
        scheduledAt: game.scheduled_at,
      };
    });

    return { success: true, assignments };
  } catch (error) {
    console.error('Get assignments error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load assignments',
    };
  }
}

/**
 * Get scorekeeper assignment for a specific game
 */
export async function getGameScorekeeperAssignment(gameId: string): Promise<{
  success: boolean;
  assignment?: {
    id: string;
    token: string;
    expiresAt: string;
    isActive: boolean;
    accessCount: number;
    lastAccessedAt: string | null;
    createdAt: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get game to verify ownership
    const { data: game } = await supabase
      .from('games')
      .select(`
        id,
        league_id,
        leagues!inner(
          id,
          created_by
        )
      `)
      .eq('id', gameId)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const league = game.leagues as any;
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', game.league_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const isCreator = league.created_by === user.id;
    const isAuthorized = isCreator || (membership && ['owner', 'admin'].includes(membership.role));

    if (!isAuthorized) {
      // Fallback: platform admins get owner-level access to all leagues
      const isPlatformAdmin = await checkPlatformAdmin(user.id);
      if (!isPlatformAdmin) {
        return { success: false, error: 'Not authorized' };
      }
    }

    // Get active scorekeeper session for this game
    const { data: session, error: sessionError } = await supabase
      .from('scorekeeper_sessions')
      .select('id, token, expires_at, is_active, access_count, last_accessed_at, created_at')
      .eq('game_id', gameId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error('Session query error:', sessionError);
      return { success: false, error: 'Failed to load scorekeeper assignment' };
    }

    if (!session) {
      return { success: false, error: 'No active scorekeeper assigned' };
    }

    return {
      success: true,
      assignment: {
        id: session.id,
        token: session.token,
        expiresAt: session.expires_at,
        isActive: session.is_active || false,
        accessCount: session.access_count || 0,
        lastAccessedAt: session.last_accessed_at,
        createdAt: session.created_at || '',
      },
    };
  } catch (error) {
    console.error('Get game assignment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load assignment',
    };
  }
}

/**
 * Deactivate a scorekeeper session
 */
export async function deactivateScorekeeperSession(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Deactivate session
    const { error: updateError } = await supabase
      .from('scorekeeper_sessions')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id,
        deactivation_reason: 'Manual deactivation by admin',
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Deactivation error:', updateError);
      return { success: false, error: 'Failed to deactivate session' };
    }

    return { success: true };
  } catch (error) {
    console.error('Deactivate session error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate session',
    };
  }
}
