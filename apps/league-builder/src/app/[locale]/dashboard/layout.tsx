import * as React from 'react';
import { getCaptainTeams } from '@/lib/actions/captain';
import { getCachedDashboardData } from '@/lib/actions/dashboard';
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch captain teams and dashboard data for the sidebar in parallel
  const [captainTeamsResult, dashboardData] = await Promise.all([
    getCaptainTeams(),
    getCachedDashboardData(),
  ]);
  const captainTeams = captainTeamsResult.data || [];

  return (
    <DashboardLayoutClient
      captainTeams={captainTeams}
      dashboardData={dashboardData}
    >
      {children}
    </DashboardLayoutClient>
  );
}
