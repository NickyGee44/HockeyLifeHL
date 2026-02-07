"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * League Context Management
 *
 * Provides server-side utilities for managing the user's active league context.
 * In a multi-tenant SaaS, users can belong to multiple leagues and need to
 * switch between them.
 */

export type LeagueRole = 'owner' | 'admin' | 'captain' | 'scorekeeper' | 'player';

export type LeagueMembership = {
  league_id: string;
  user_id: string;
  role: LeagueRole;
  status: 'active' | 'invited' | 'suspended';
  created_at: string;
  league: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    primary_color?: string;
  };
};

type ProfileAccess = {
  is_platform_admin: boolean | null;
  role: string | null;
};

async function getProfileAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ProfileAccess | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin, role')
    .eq('id', userId)
    .single();

  return (profile as ProfileAccess | null) ?? null;
}

function hasPlatformAdminAccess(profile: ProfileAccess | null): boolean {
  if (!profile) return false;
  return profile.is_platform_admin === true;
}

/**
 * Get the active league ID from the session/cookie
 * This is used to scope all queries to the current league
 */
export async function getActiveLeagueId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const activeLeagueId = cookieStore.get('active_league_id')?.value;
    return activeLeagueId || null;
  } catch (error) {
    console.error('Error getting active league ID:', error);
    return null;
  }
}

/**
 * Set the active league ID in the session/cookie
 * Called when user switches leagues via the league switcher
 */
export async function setActiveLeagueId(leagueId: string): Promise<{ error?: string; success?: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const profile = await getProfileAccess(supabase, user.id);
    const isPlatformAdmin = hasPlatformAdminAccess(profile);

    if (isPlatformAdmin) {
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('id')
        .eq('id', leagueId)
        .eq('status', 'active')
        .single();

      if (leagueError || !league) {
        return { error: 'League not found or inactive' };
      }
    } else {
      // Verify user has access to this league
      const { data: membership, error } = await supabase
        .from('league_memberships')
        .select('league_id')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .eq('status', 'active')
        .single();

      if (error || !membership) {
        return { error: 'You do not have access to this league' };
      }
    }

    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set('active_league_id', leagueId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error setting active league ID:', error);
    return { error: error.message || 'Failed to switch league' };
  }
}

/**
 * Get all leagues the current user belongs to
 */
export async function getUserLeagues(): Promise<{ leagues: LeagueMembership[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { leagues: [], error: 'Not authenticated' };
    }

    const profile = await getProfileAccess(supabase, user.id);
    const isPlatformAdmin = hasPlatformAdminAccess(profile);

    const { data: memberships, error } = await supabase
      .from('league_memberships')
      .select(`
        league_id,
        user_id,
        role,
        status,
        created_at,
        league:leagues (
          id,
          name,
          slug,
          logo_url,
          primary_color,
          custom_domain,
          custom_domain_verified
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user leagues:', error);
      return { leagues: [], error: error.message };
    }

    const membershipLeagues = (memberships as any[]) || [];

    if (!isPlatformAdmin) {
      return { leagues: membershipLeagues };
    }

    const { data: allLeagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, slug, logo_url, primary_color, custom_domain, custom_domain_verified, created_at')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (leaguesError || !allLeagues) {
      return { leagues: membershipLeagues };
    }

    const membershipByLeagueId = new Map(
      membershipLeagues.map((membership: any) => [membership.league_id, membership]),
    );

    const merged: LeagueMembership[] = allLeagues.map((league: any) => {
      const membership = membershipByLeagueId.get(league.id);
      if (membership) {
        return membership as LeagueMembership;
      }

      return {
        league_id: league.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        created_at: league.created_at,
        league,
        _isPlatformAdminAccess: true,
      } as LeagueMembership & { _isPlatformAdminAccess: boolean };
    });

    return { leagues: merged };
  } catch (error: any) {
    console.error('Error in getUserLeagues:', error);
    return { leagues: [], error: error.message || 'Failed to fetch leagues' };
  }
}

/**
 * Get the user's role in a specific league
 */
export async function getUserRoleInLeague(leagueId: string): Promise<{ role: LeagueRole | null; isPlatformAdmin?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { role: null, error: 'Not authenticated' };
    }

    const { data: membership, error } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .single();

    if (!error && membership) {
      return { role: membership.role as LeagueRole };
    }

    const profile = await getProfileAccess(supabase, user.id);
    if (hasPlatformAdminAccess(profile)) {
      return { role: 'owner', isPlatformAdmin: true };
    }

    return { role: null };
  } catch (error: any) {
    console.error('Error getting user role:', error);
    return { role: null, error: error.message };
  }
}

/**
 * Check if the current user has a specific role in the active league
 */
export async function hasLeagueRole(requiredRoles: LeagueRole[]): Promise<boolean> {
  try {
    const leagueId = await getActiveLeagueId();
    if (!leagueId) return false;

    const { role } = await getUserRoleInLeague(leagueId);
    if (!role) return false;

    return requiredRoles.includes(role);
  } catch (error) {
    console.error('Error checking league role:', error);
    return false;
  }
}

/**
 * Require that the user has one of the specified roles in the active league
 * Throws an error if not authorized
 */
export async function requireLeagueRole(
  requiredRoles: LeagueRole[]
): Promise<{ leagueId: string; userId: string; role: LeagueRole }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const leagueId = await getActiveLeagueId();
  if (!leagueId) {
    throw new Error('No active league selected');
  }

  const { role, error } = await getUserRoleInLeague(leagueId);
  if (error || !role) {
    throw new Error('Not a member of the active league');
  }

  if (!requiredRoles.includes(role)) {
    throw new Error(`Unauthorized - requires one of: ${requiredRoles.join(', ')}`);
  }

  return { leagueId, userId: user.id, role };
}

/**
 * Check if user is league owner (highest permission)
 */
export async function isLeagueOwner(leagueId: string): Promise<boolean> {
  const { role } = await getUserRoleInLeague(leagueId);
  return role === 'owner';
}

/**
 * Check if user is league admin or owner
 */
export async function isLeagueAdmin(leagueId: string): Promise<boolean> {
  const { role } = await getUserRoleInLeague(leagueId);
  return role === 'owner' || role === 'admin';
}

/**
 * Get league by slug (for subdomain routing)
 */
export async function getLeagueBySlug(slug: string): Promise<{ league: any; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: league, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error || !league) {
      return { league: null, error: 'League not found' };
    }

    return { league };
  } catch (error: any) {
    console.error('Error fetching league by slug:', error);
    return { league: null, error: error.message };
  }
}

/**
 * Validate league access for the current user
 * Used in middleware and route handlers
 */
export async function validateLeagueAccess(leagueId: string): Promise<{ hasAccess: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { hasAccess: false, error: 'Not authenticated' };
    }

    const profile = await getProfileAccess(supabase, user.id);
    if (hasPlatformAdminAccess(profile)) {
      return { hasAccess: true };
    }

    const { data: membership, error } = await supabase
      .from('league_memberships')
      .select('league_id')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .single();

    if (error || !membership) {
      return { hasAccess: false, error: 'No access to this league' };
    }

    return { hasAccess: true };
  } catch (error: any) {
    console.error('Error validating league access:', error);
    return { hasAccess: false, error: error.message };
  }
}
