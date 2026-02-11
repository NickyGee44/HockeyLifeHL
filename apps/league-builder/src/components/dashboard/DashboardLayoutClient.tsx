'use client';

import * as React from 'react';
import { cn } from '@hockey-life/ui';
import { SidebarProvider, useSidebar } from './SidebarContext';
import HierarchicalSidebar from './HierarchicalSidebar';
import { SetupBanner } from './SetupBanner';
import type { CaptainTeamOverview } from '@/lib/actions/captain';
import type { DashboardData } from '@/lib/actions/dashboard';
import type { LeagueSetupIssue } from '@/lib/actions/setup-status';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  captainTeams: CaptainTeamOverview[];
  dashboardData: DashboardData | null;
  setupIssues: LeagueSetupIssue[];
}

function DashboardContent({
  children,
  setupIssues,
}: {
  children: React.ReactNode;
  setupIssues: LeagueSetupIssue[];
}) {
  const { isCollapsed } = useSidebar();

  return (
    <main
      className={cn(
        'transition-all duration-300 ease-in-out aurora-bg min-h-screen',
        isCollapsed ? 'ml-16' : 'ml-16 lg:ml-72'
      )}
    >
      {setupIssues.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <SetupBanner issues={setupIssues} />
        </div>
      )}
      {children}
    </main>
  );
}

export default function DashboardLayoutClient({
  children,
  captainTeams,
  dashboardData,
  setupIssues,
}: DashboardLayoutClientProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-neutral-950">
        <HierarchicalSidebar
          dashboardData={dashboardData}
          captainTeams={captainTeams}
        />
        <DashboardContent setupIssues={setupIssues}>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
