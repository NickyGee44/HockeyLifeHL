'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@hockey-life/ui';
import { DateRange, getDateRangeFromPreset, DATE_PRESETS } from '@/lib/dashboard';
import {
  DateRangePicker,
  RevenueChart,
  GameCompletionChart,
  RegistrationFunnel,
  ActiveUsersByRole,
  HealthScoreWidget,
} from '@/components/dashboard';

/**
 * Admin Analytics Dashboard
 * Real-time insights with SWR caching
 * Dark mode with gold accents per BRAND-KIT.md
 */
export default function AnalyticsPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    getDateRangeFromPreset(DATE_PRESETS[1]) // Last 30 days
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's organizations
  useEffect(() => {
    async function loadOrganizations() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from('organization_members')
        .select('organization:organizations(id, name)')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin']);

      if (data && data.length > 0) {
        const orgs = data
          .map((d: any) => d.organization)
          .filter(Boolean) as { id: string; name: string }[];
        setOrganizations(orgs);
        setOrganizationId(orgs[0]?.id || null);
      }
      setIsLoading(false);
    }

    loadOrganizations();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Analytics</h1>
            <p className="text-neutral-400 mt-1">
              Track performance and insights for your organization
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Organization Selector */}
            {organizations.length > 1 && (
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium',
                  'bg-neutral-900 border border-gold-500/20 text-white',
                  'focus:outline-none focus:ring-2 focus:ring-gold-500/50'
                )}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}

            {/* Date Range Picker */}
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Health Score - Sidebar */}
          <div className="lg:col-span-3">
            <HealthScoreWidget organizationId={organizationId} className="h-full" />
          </div>

          {/* Active Users - Sidebar */}
          <div className="lg:col-span-3">
            <ActiveUsersByRole organizationId={organizationId} className="h-full" />
          </div>

          {/* Revenue Chart - Main */}
          <div className="lg:col-span-6">
            <RevenueChart
              organizationId={organizationId}
              dateRange={dateRange}
              className="h-full"
            />
          </div>

          {/* Game Completion Chart */}
          <div className="lg:col-span-6">
            <GameCompletionChart
              organizationId={organizationId}
              dateRange={dateRange}
            />
          </div>

          {/* Registration Funnel */}
          <div className="lg:col-span-6">
            <RegistrationFunnel
              organizationId={organizationId}
              dateRange={dateRange}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-neutral-600">
            Data refreshes automatically every minute. Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
      <p className="text-neutral-400">Loading analytics...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-neutral-900 border border-gold-500/20 rounded-2xl p-8 text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gold-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Organizations</h2>
        <p className="text-neutral-400 mb-6">
          You need to be an owner or admin of an organization to view analytics.
        </p>
        <a
          href="/dashboard"
          className={cn(
            'inline-block px-6 py-3 rounded-xl font-semibold text-sm',
            'bg-gradient-to-r from-gold-500 to-gold-600 text-black',
            'hover:shadow-lg hover:shadow-gold-500/20 transition-all'
          )}
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
