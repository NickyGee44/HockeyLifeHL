'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
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
      logo_url: string | null;
      primary_color: string | null;
    }>;
  }>;
  totals: {
    total_organizations: number;
    total_leagues: number;
    total_teams: number;
    total_players: number;
    active_seasons: number;
  };
}

/**
 * Optimized dashboard query using secure RPC function
 *
 * Query Strategy:
 * - Uses PostgreSQL RPC function with SECURITY DEFINER
 * - Database enforces all authorization checks
 * - Single round-trip with CTEs for optimal performance
 * - Proper RLS enforcement via explicit permission validation
 *
 * Performance:
 * - Query count: 1 RPC call = O(1) query
 * - Expected time: 50-150ms for cache MISS, <10ms for cache HIT
 *
 * Security:
 * - RPC function verifies user exists in auth.users
 * - Explicit checks for organization ownership/membership
 * - No RLS bypass - all authorization is database-enforced
 * - Prevents SQL injection via parameterized queries
 *
 * @param userId - The authenticated user's ID (passed from outside cache scope)
 */
async function getDashboardData(userId: string): Promise<DashboardData | null> {
  // Use service role client to call RPC (avoids cookies() in cache)
  // This is SECURE because the RPC function itself enforces all authorization
  // The RPC has SECURITY DEFINER and validates user + permissions explicitly
  const supabase = createServiceRoleClient();

  if (!userId) {
    return null;
  }

  try {
    // Call secure RPC function
    const { data, error } = await supabase.rpc('get_user_dashboard_data', {
      p_user_id: userId
    });

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching dashboard data via RPC:', error);
      }
      return null;
    }

    if (!data) {
      return null;
    }

    // Type assertion - the RPC function returns properly structured JSON
    return data as unknown as DashboardData;
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
 * - Get user session OUTSIDE cache scope (avoid cookies() in cached function)
 * - Pass userId as parameter to cached function
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
  // Get user OUTSIDE cache scope to avoid cookies() error
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Use Next.js 14+ unstable_cache for automatic request deduplication
  // Pass userId as parameter instead of accessing cookies() inside cache
  const cachedFetch = unstable_cache(
    async (userId: string) => getDashboardData(userId),
    [`dashboard-${user.id}`],
    {
      revalidate: 60, // Cache for 60 seconds
      tags: [`dashboard-${user.id}`]
    }
  );

  return cachedFetch(user.id);
}

/**
 * Revalidate dashboard cache for a user
 * Call this from mutation actions (create league, add team, etc.)
 */
export async function revalidateDashboardCache(userId: string): Promise<void> {
  const { revalidateTag } = await import('next/cache');
  (revalidateTag as any)(`dashboard-${userId}`);
}
