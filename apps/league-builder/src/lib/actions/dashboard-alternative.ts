'use server';

import { createClient } from '@/lib/supabase/server';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * ALTERNATIVE IMPLEMENTATION: PostgreSQL Aggregation Query
 *
 * This version uses a single PostgreSQL query with CTEs and aggregations
 * instead of application-layer processing. Use this if Supabase nested
 * selects are slow or if you need true database-level aggregation.
 *
 * Performance Comparison:
 * - dashboard.ts (Supabase joins): ~50-100ms, 1 HTTP request, multiple SQL queries
 * - dashboard-alternative.ts (SQL CTEs): ~30-80ms, 1 HTTP request, 1 SQL query
 *
 * Trade-offs:
 * - PRO: Faster (true database aggregation, fewer round trips)
 * - PRO: Less application memory (no large JSON responses)
 * - CON: More complex SQL (harder to maintain)
 * - CON: Requires RPC function (not type-safe in Supabase client)
 * - CON: Harder to debug (SQL execution plan vs TypeScript stack trace)
 *
 * When to use this:
 * - Dashboard consistently >150ms with standard approach
 * - >100 organizations per user
 * - Need real-time aggregation (no cache)
 */

export interface DashboardDataAggregated {
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    subscription_status: string;
    trial_ends_at: string | null;
    created_at: string;
    league_count: number;
    team_count: number;
    player_count: number;
  }>;
  totals: {
    total_organizations: number;
    total_leagues: number;
    total_teams: number;
    total_players: number;
  };
}

/**
 * Optimized dashboard query using PostgreSQL CTEs and aggregations
 *
 * SQL Strategy:
 * 1. CTE: user_orgs - Get all organizations user has access to (owner + member)
 * 2. CTE: org_stats - Aggregate league/team/player counts per organization
 * 3. Final SELECT: Join user_orgs with org_stats
 *
 * Single query executed via Supabase RPC function
 */
export async function getDashboardDataAggregated(): Promise<DashboardDataAggregated | null> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    // Execute PostgreSQL function that returns aggregated dashboard data
    const { data, error } = await supabase.rpc('get_dashboard_stats_v1' as any, {
      p_user_id: user.id
    });

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching dashboard stats:', error);
      }
      return null;
    }

    if (!data || data.length === 0) {
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

    // Calculate totals
    const totals = (data as any[]).reduce(
      (acc: { total_organizations: number; total_leagues: number; total_teams: number; total_players: number }, org: any) => ({
        total_organizations: acc.total_organizations + 1,
        total_leagues: acc.total_leagues + (org.league_count || 0),
        total_teams: acc.total_teams + (org.team_count || 0),
        total_players: acc.total_players + (org.player_count || 0)
      }),
      {
        total_organizations: 0,
        total_leagues: 0,
        total_teams: 0,
        total_players: 0
      }
    );

    return {
      organizations: data,
      totals
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error fetching dashboard stats:', error);
    }
    return null;
  }
}
