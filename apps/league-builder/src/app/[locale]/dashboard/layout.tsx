import * as React from 'react';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCaptainTeams } from '@/lib/actions/captain';
import { getCachedDashboardData } from '@/lib/actions/dashboard';
import { getSetupIssues } from '@/lib/actions/setup-status';
import { getCurrentUser } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  // Check if user is authenticated
  const userData = await getCurrentUser();
  if (!userData) {
    redirect(`/${locale}/login`);
  }

  // If user has no memberships at all and no org ownership, they might be new — allow dashboard
  // (the dashboard handles empty state with "Create your first league" CTA)

  // Fetch captain teams, dashboard data, and setup issues in parallel
  const [captainTeamsResult, dashboardData, setupIssues] = await Promise.all([
    getCaptainTeams(),
    getCachedDashboardData(),
    getSetupIssues(),
  ]);
  const captainTeams = captainTeamsResult.data || [];

  return (
    <DashboardLayoutClient
      captainTeams={captainTeams}
      dashboardData={dashboardData}
      setupIssues={setupIssues}
    >
      {children}
    </DashboardLayoutClient>
  );
}
