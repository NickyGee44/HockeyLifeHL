'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { Team } from './teams';
import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * CRITICAL: Single source of truth for team authorization
 *
 * This module enforces the following invariants:
 * 1. Captains can ONLY manage teams where teams.captain_id = auth.uid()
 * 2. Organization owners can manage ALL teams in their organizations
 * 3. Access checks ALWAYS use database queries with auth.uid() (never trust client)
 * 4. All operations are auditable via auth.uid()
 */

/**
 * Result type for authorization checks
 */
export interface AuthorizationResult {
  authorized: boolean;
  error?: string;
}

/**
 * Extended authorization result with access type
 */
export interface ExtendedAuthorizationResult extends AuthorizationResult {
  accessType?: 'captain' | 'org_owner' | 'league_admin' | 'platform_admin';
  team?: Team;
  organizationId?: string;
}

/**
 * Result type for captain access check
 */
export interface CaptainAccessResult extends AuthorizationResult {
  isCaptain: boolean;
  team?: Team;
}

/**
 * Verify if the authenticated user is captain of a specific team
 *
 * @param teamId - UUID of the team to check
 * @returns CaptainAccessResult with captain status and team data
 *
 * @example
 * const result = await verifyCaptainAccess(teamId);
 * if (!result.authorized || !result.isCaptain) {
 *   return { error: result.error || 'Not team captain' };
 * }
 */
export async function verifyCaptainAccess(teamId: string): Promise<CaptainAccessResult> {
  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authorized: false, isCaptain: false, error: 'Not authenticated' };
  }

  try {
    // SECURITY: Use indexed lookup (idx_teams_captain_team_lookup)
    // This query can be satisfied by index-only scan
    const { data: team, error } = await serviceClient
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .eq('captain_id', user.id)
      .single();

    if (error || !team) {
      // Not an error, just not a captain
      return {
        authorized: false,
        isCaptain: false,
        error: 'Not captain of this team'
      };
    }

    return {
      authorized: true,
      isCaptain: true,
      team: team as Team
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Error verifying captain access:', error);
    }
    return {
      authorized: false,
      isCaptain: false,
      error: 'Failed to verify captain access'
    };
  }
}

/**
 * Verify if user is captain OR organization owner OR league admin
 *
 * This is the primary authorization check for team management operations.
 * It checks in order of specificity:
 * 1. Captain access (fastest, most common for captain operations)
 * 2. Organization owner access (full access to all teams in org)
 * 3. League admin access (can manage teams in specific league)
 *
 * @param teamId - UUID of the team to check
 * @returns ExtendedAuthorizationResult with access type and context
 *
 * @example
 * const access = await verifyCaptainOrAdminAccess(teamId);
 * if (!access.authorized) {
 *   return { error: access.error || 'Not authorized' };
 * }
 * // User has access via access.accessType ('captain' | 'org_owner' | 'league_admin')
 */
export async function verifyCaptainOrAdminAccess(teamId: string): Promise<ExtendedAuthorizationResult> {
  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authorized: false, error: 'Not authenticated' };
  }

  try {
    // Step 1: Check captain access (most common for this use case)
    const captainCheck = await verifyCaptainAccess(teamId);
    if (captainCheck.authorized && captainCheck.isCaptain) {
      return {
        authorized: true,
        accessType: 'captain',
        team: captainCheck.team
      };
    }

    // Step 2: Check organization owner access (fetch separately to avoid FK join RLS issues)
    const { data: team, error: teamError } = await serviceClient
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      if (isDevelopment) {
        console.error('Error fetching team for org check:', teamError);
      }
      return { authorized: false, error: 'Team not found' };
    }

    // Fetch league and organization separately
    const { data: league } = await serviceClient
      .from('leagues')
      .select('id, organization_id, owner_id, created_by')
      .eq('id', team.league_id)
      .single();

    if (league && (league.owner_id === user.id || league.created_by === user.id)) {
      return {
        authorized: true,
        accessType: 'league_admin',
        team: team as Team,
      };
    }

    if (league?.organization_id) {
      const { data: org } = await serviceClient
        .from('organizations')
        .select('owner_user_id')
        .eq('id', league.organization_id)
        .single();

      // Check if user owns the organization
      if (org?.owner_user_id === user.id) {
        return {
          authorized: true,
          accessType: 'org_owner',
          team: team as Team,
          organizationId: league.organization_id
        };
      }
    }

    // Step 3: Check league admin access
    const { data: leagueMembership } = await serviceClient
      .from('league_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('league_id', team.league_id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .single();

    if (leagueMembership) {
      return {
        authorized: true,
        accessType: 'league_admin',
        team: team as Team
      };
    }

    // Step 4: Fallback check for platform admin
    const isPlatformAdmin = await isUserPlatformAdmin(user.id);
    if (isPlatformAdmin) {
      return {
        authorized: true,
        accessType: 'platform_admin',
        team: team as Team
      };
    }

    // No access found
    return {
      authorized: false,
      error: 'Not authorized to manage this team'
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Error in verifyCaptainOrAdminAccess:', error);
    }
    return {
      authorized: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Get all teams where the user is captain
 *
 * Used for captain dashboard views and navigation.
 *
 * @param userId - Optional user ID (defaults to authenticated user)
 * @returns Array of teams where user is captain
 *
 * @example
 * const result = await getTeamsWhereCaptain();
 * if (result.success) {
 *   console.log(`User captains ${result.data.length} teams`);
 * }
 */
export async function getTeamsWhereCaptain(userId?: string): Promise<{
  success: boolean;
  data?: Team[];
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Get user ID
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }
      targetUserId = user.id;
    }

    // SECURITY: Use indexed lookup (idx_teams_captain_id)
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        leagues!inner(id, name, organization_id),
        divisions:division_id (id, name)
      `)
      .eq('captain_id', targetUserId)
      .eq('status', 'active')
      .order('name');

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching captain teams:', error);
      }
      return { success: false, error: 'Failed to fetch teams' };
    }

    return {
      success: true,
      data: (teams || []) as Team[]
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamsWhereCaptain:', error);
    }
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Check if user can approve join requests for a team
 *
 * Join requests can be approved by:
 * - Team captain
 * - Organization owner
 * - League admin
 *
 * @param teamId - UUID of the team
 * @returns boolean indicating approval permission
 *
 * @example
 * if (await canApproveJoinRequests(teamId)) {
 *   // Show approve/reject buttons
 * }
 */
export async function canApproveJoinRequests(teamId: string): Promise<boolean> {
  const access = await verifyCaptainOrAdminAccess(teamId);
  return access.authorized;
}

/**
 * Verify if user is organization owner for a league
 *
 * @param leagueId - UUID of the league
 * @returns AuthorizationResult with organization context
 */
export async function verifyLeagueOwnerAccess(leagueId: string): Promise<{
  authorized: boolean;
  organizationId?: string;
  accessType?: 'org_owner' | 'league_admin' | 'platform_admin';
  error?: string;
}> {
  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authorized: false, error: 'Not authenticated' };
  }

  try {
    // Fetch league (without !inner so it doesn't fail if no org)
    const { data: league, error } = await serviceClient
      .from('leagues')
      .select('id, organization_id, owner_id, created_by')
      .eq('id', leagueId)
      .single();

    if (error || !league) {
      if (isDevelopment) {
        console.error('Error fetching league:', error);
      }
      return { authorized: false, error: 'League not found' };
    }

    // Check 1: Direct league ownership
    if (league.owner_id === user.id || league.created_by === user.id) {
      return {
        authorized: true,
        organizationId: league.organization_id ?? undefined,
        accessType: 'league_admin',
      };
    }

    // Check 2: Organization owner
    if (league.organization_id) {
      const { data: org } = await serviceClient
        .from('organizations')
        .select('owner_user_id')
        .eq('id', league.organization_id)
        .maybeSingle();

      if (org?.owner_user_id === user.id) {
        return {
          authorized: true,
          organizationId: league.organization_id ?? undefined,
          accessType: 'org_owner',
        };
      }
    }

    // Check 3: League membership (owner or admin role)
    const { data: membership } = await serviceClient
      .from('league_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .single();

    if (membership) {
      return {
        authorized: true,
        organizationId: league.organization_id ?? undefined,
        accessType: 'league_admin',
      };
    }

    // Check 4: Platform admin fallback
    const isPlatformAdmin = await isUserPlatformAdmin(user.id);
    if (isPlatformAdmin) {
      return {
        authorized: true,
        organizationId: league.organization_id ?? undefined,
        accessType: 'platform_admin',
      };
    }

    return { authorized: false, error: 'Not authorized to manage this league' };
  } catch (error) {
    if (isDevelopment) {
      console.error('Error in verifyLeagueOwnerAccess:', error);
    }
    return {
      authorized: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Get user's role for a team (captain, org_owner, league_admin, or none)
 *
 * Useful for UI that needs to show different options based on role.
 *
 * @param teamId - UUID of the team
 * @returns Role type or null if no access
 */
export async function getUserTeamRole(teamId: string): Promise<'captain' | 'org_owner' | 'league_admin' | 'platform_admin' | null> {
  const access = await verifyCaptainOrAdminAccess(teamId);
  return access.authorized ? (access.accessType || null) : null;
}
