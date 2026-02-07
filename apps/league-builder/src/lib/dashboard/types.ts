// Types for Admin Dashboard

export interface DateRange {
  start: Date;
  end: Date;
  label?: string;
}

export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface RevenueDataPoint {
  period_start: string;
  period_label: string;
  payment_count: number;
  total_revenue_cents: number;
  failed_revenue_cents: number;
  failed_payment_count: number;
  platform_fee_cents: number;
}

export interface GameStatsDataPoint {
  scheduled_at: string;
  total_scheduled: number;
  completed_count: number;
  cancelled_count: number;
  in_progress_count: number;
  overdue_count: number;
  completion_rate: number;
}

export interface UserRoleCounts {
  active_players: number;
  captains: number;
  staff_members: number;
  scorekeepers: number;
  admins: number;
  total_users: number;
}

export interface RegistrationFunnelDataPoint {
  signup_date: string;
  total_signups: number;
  roster_assigned: number;
  paid_registrations: number;
  signup_to_roster_rate: number;
  roster_to_paid_rate: number;
}

export interface HealthInsight {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface HealthScore {
  overall_score: number;
  revenue_score: number;
  game_completion_score: number;
  user_engagement_score: number;
  registration_conversion_score: number;
  health_status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  insights: HealthInsight[];
}

export interface DashboardSummary {
  organization_id: string;
  date_range: {
    start: string;
    end: string;
  };
  revenue: RevenueDataPoint[];
  games: GameStatsDataPoint[];
  users: UserRoleCounts;
  funnel: RegistrationFunnelDataPoint[];
  health: HealthScore;
  generated_at: string;
}

// Quick date range presets
export const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This month', type: 'thisMonth' },
  { label: 'Last month', type: 'lastMonth' },
  { label: 'This year', type: 'thisYear' },
] as const;

// Helper to format currency from cents
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

// Helper to format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// Helper to format percentage
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Calculate date range from preset
export function getDateRangeFromPreset(preset: typeof DATE_PRESETS[number]): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  let start = new Date();

  if ('days' in preset) {
    start.setDate(start.getDate() - preset.days);
    start.setHours(0, 0, 0, 0);
  } else if (preset.type === 'thisMonth') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else if (preset.type === 'lastMonth') {
    start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    end.setDate(0); // Last day of previous month
  } else if (preset.type === 'thisYear') {
    start = new Date(end.getFullYear(), 0, 1);
  }

  return { start, end, label: preset.label };
}

// Format date for API calls (YYYY-MM-DD)
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}
