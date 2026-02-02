'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import {
  DashboardSummary,
  RevenueDataPoint,
  GameStatsDataPoint,
  UserRoleCounts,
  RegistrationFunnelDataPoint,
  HealthScore,
  DateRange,
  Granularity,
  formatDateForAPI,
} from './types';

const supabase = createClient();

// SWR fetcher for dashboard data
async function fetchDashboardSummary(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<DashboardSummary> {
  const { data, error } = await (supabase as any).rpc('get_org_dashboard_summary', {
    p_organization_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data;
}

async function fetchRevenueStats(
  orgId: string,
  startDate: string,
  endDate: string,
  granularity: Granularity
): Promise<RevenueDataPoint[]> {
  const { data, error } = await (supabase as any).rpc('get_org_revenue_stats', {
    p_organization_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_granularity: granularity,
  });

  if (error) throw error;
  return data || [];
}

async function fetchGameStats(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<GameStatsDataPoint[]> {
  const { data, error } = await (supabase as any).rpc('get_org_game_stats', {
    p_organization_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data || [];
}

async function fetchUserRoleCounts(orgId: string): Promise<UserRoleCounts> {
  const { data, error } = await (supabase as any).rpc('get_org_user_role_counts', {
    p_organization_id: orgId,
  });

  if (error) throw error;
  return data?.[0] || {
    active_players: 0,
    captains: 0,
    staff_members: 0,
    scorekeepers: 0,
    admins: 0,
    total_users: 0,
  };
}

async function fetchRegistrationFunnel(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<RegistrationFunnelDataPoint[]> {
  const { data, error } = await (supabase as any).rpc('get_org_registration_funnel', {
    p_organization_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data || [];
}

async function fetchHealthScore(orgId: string): Promise<HealthScore> {
  const { data, error } = await (supabase as any).rpc('get_org_health_score', {
    p_organization_id: orgId,
  });

  if (error) throw error;
  return data?.[0] || {
    overall_score: 0,
    revenue_score: 0,
    game_completion_score: 0,
    user_engagement_score: 0,
    registration_conversion_score: 0,
    health_status: 'Needs Attention',
    insights: [],
  };
}

// ============= Hooks =============

/**
 * Hook to fetch all dashboard data in a single call
 */
export function useDashboardSummary(orgId: string | null, dateRange: DateRange) {
  const startDate = formatDateForAPI(dateRange.start);
  const endDate = formatDateForAPI(dateRange.end);

  return useSWR(
    orgId ? ['dashboard-summary', orgId, startDate, endDate] : null,
    () => fetchDashboardSummary(orgId!, startDate, endDate),
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );
}

/**
 * Hook for revenue data with granularity
 */
export function useRevenueStats(
  orgId: string | null,
  dateRange: DateRange,
  granularity: Granularity = 'daily'
) {
  const startDate = formatDateForAPI(dateRange.start);
  const endDate = formatDateForAPI(dateRange.end);

  return useSWR(
    orgId ? ['revenue-stats', orgId, startDate, endDate, granularity] : null,
    () => fetchRevenueStats(orgId!, startDate, endDate, granularity),
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  );
}

/**
 * Hook for game completion stats
 */
export function useGameStats(orgId: string | null, dateRange: DateRange) {
  const startDate = formatDateForAPI(dateRange.start);
  const endDate = formatDateForAPI(dateRange.end);

  return useSWR(
    orgId ? ['game-stats', orgId, startDate, endDate] : null,
    () => fetchGameStats(orgId!, startDate, endDate),
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  );
}

/**
 * Hook for user role counts
 */
export function useUserRoleCounts(orgId: string | null) {
  return useSWR(
    orgId ? ['user-role-counts', orgId] : null,
    () => fetchUserRoleCounts(orgId!),
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
    }
  );
}

/**
 * Hook for registration funnel data
 */
export function useRegistrationFunnel(orgId: string | null, dateRange: DateRange) {
  const startDate = formatDateForAPI(dateRange.start);
  const endDate = formatDateForAPI(dateRange.end);

  return useSWR(
    orgId ? ['registration-funnel', orgId, startDate, endDate] : null,
    () => fetchRegistrationFunnel(orgId!, startDate, endDate),
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  );
}

/**
 * Hook for health score
 */
export function useHealthScore(orgId: string | null) {
  return useSWR(
    orgId ? ['health-score', orgId] : null,
    () => fetchHealthScore(orgId!),
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
    }
  );
}

// ============= CSV Export =============

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: { key: string; label: string }[]
): void {
  if (!data.length) return;

  const keys = headers?.map((h) => h.key) || Object.keys(data[0]);
  const headerRow = headers?.map((h) => h.label).join(',') || keys.join(',');

  const rows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value ?? '';
      })
      .join(',')
  );

  const csv = [headerRow, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
