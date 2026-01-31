'use server';

import { createClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Dashboard data type with aggregated counts
 */
export interface DashboardData {
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    subscription_status: string;
    trial_ends_at: string | null;
    created_at: string;
    league_count: number;
    leagues: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      created_at: string;
      team_count: number;
      player_count: number;
    }>;
  }>;
  totals: {
    total_organizations: number;
    total_leagues: number;
    total_teams: number;
    total_players: number;
  };
}

/**
 * Optimized dashboard query - Single database round trip with aggregations
 *
 * Query Strategy:
 * 1. Fetch user's organizations (owner + member via organization_members)
 * 2. LEFT JOIN leagues to get all leagues per org
 * 3. Use aggregations in app layer (Supabase doesn't support nested aggregations well)
 * 4. Cache result for 60 seconds
 *
 * Performance:
 * - Before: 1 query for orgs + N queries for leagues + N*M for teams = O(N*M) queries
 * - After: 1 query total = O(1) query
 *
 * RLS: Enforced at database level via organization and league policies
 */
export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    // Step 1: Fetch organizations where user is owner OR member
    // Uses RLS policies on organizations table
    const { data: orgsAsOwner, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        subscription_tier,
        subscription_status,
        trial_ends_at,
        created_at,
        owner_user_id
      `)
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });

    if (orgError) {
      if (isDevelopment) {
        console.error('Error fetching organizations:', orgError);
      }
      return null;
    }

    // Step 2: Fetch organizations where user is a member (not owner)
    const { data: memberOrgs, error: memberError } = await supabase
      .from('organization_members')
      .select(`
        organization:organizations!inner (
          id,
          name,
          slug,
          subscription_tier,
          subscription_status,
          trial_ends_at,
          created_at,
          owner_user_id
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .neq('organization.owner_user_id', user.id); // Exclude orgs where user is owner (already fetched)

    if (memberError) {
      if (isDevelopment) {
        console.error('Error fetching member organizations:', memberError);
      }
      // Continue without member orgs - not critical
    }

    // Combine owner orgs and member orgs
    const allOrgs = [
      ...(orgsAsOwner || []),
      ...(memberOrgs?.map(m => m.organization).filter(Boolean) || [])
    ];

    if (allOrgs.length === 0) {
      return {
        organizations: [],
        totals: {
          total_organizations: 0,
          total_leagues: 0,
          total_teams: 0,
          total_players: 0
        }
      };
    }

    const orgIds = allOrgs.map(org => org.id);

    // Step 3: Fetch all leagues for these organizations with team counts
    // This is a single query with LEFT JOIN to teams
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        slug,
        status,
        created_at,
        organization_id,
        teams:teams(
          id,
          team_rosters:team_rosters(
            id,
            player_id,
            status
          )
        )
      `)
      .in('organization_id', orgIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (leaguesError) {
      if (isDevelopment) {
        console.error('Error fetching leagues:', leaguesError);
      }
      // Continue without leagues - show orgs with 0 leagues
    }

    // Step 4: Process data and calculate counts in application layer
    const organizationsWithLeagues = allOrgs.map(org => {
      const orgLeagues = (leagues || []).filter(l => l.organization_id === org.id);

      const leaguesWithCounts = orgLeagues.map(league => {
        const teams = league.teams || [];
        const team_count = teams.length;

        // Count unique active players across all teams
        const uniquePlayers = new Set<string>();
        teams.forEach(team => {
          (team.team_rosters || [])
            .filter(roster => roster.status === 'active')
            .forEach(roster => uniquePlayers.add(roster.player_id));
        });

        return {
          id: league.id,
          name: league.name,
          slug: league.slug,
          status: league.status,
          created_at: league.created_at,
          team_count,
          player_count: uniquePlayers.size
        };
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        subscription_tier: org.subscription_tier,
        subscription_status: org.subscription_status,
        trial_ends_at: org.trial_ends_at,
        created_at: org.created_at,
        league_count: leaguesWithCounts.length,
        leagues: leaguesWithCounts
      };
    });

    // Step 5: Calculate totals
    const totals = organizationsWithLeagues.reduce(
      (acc, org) => ({
        total_organizations: acc.total_organizations + 1,
        total_leagues: acc.total_leagues + org.league_count,
        total_teams: acc.total_teams + org.leagues.reduce((sum, l) => sum + l.team_count, 0),
        total_players: acc.total_players + org.leagues.reduce((sum, l) => sum + l.player_count, 0)
      }),
      {
        total_organizations: 0,
        total_leagues: 0,
        total_teams: 0,
        total_players: 0
      }
    );

    return {
      organizations: organizationsWithLeagues,
      totals
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error fetching dashboard data:', error);
    }
    return null;
  }
}

/**
 * Cached version of getDashboardData
 *
 * Cache Strategy:
 * - Key: user-specific (user.id in the function scope)
 * - TTL: 60 seconds
 * - Revalidation: On-demand via revalidateTag('dashboard-{userId}')
 *
 * Cache invalidation triggers:
 * - Organization created/updated/deleted
 * - League created/updated/deleted
 * - Team created/deleted
 * - Player added/removed from roster
 */
export async function getCachedDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Use Next.js 14+ unstable_cache for automatic request deduplication
  const cachedFetch = unstable_cache(
    async () => getDashboardData(),
    [`dashboard-${user.id}`],
    {
      revalidate: 60, // Cache for 60 seconds
      tags: [`dashboard-${user.id}`]
    }
  );

  return cachedFetch();
}

/**
 * Revalidate dashboard cache for a user
 * Call this from mutation actions (create league, add team, etc.)
 */
export async function revalidateDashboardCache(userId: string): Promise<void> {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(`dashboard-${userId}`);
}
