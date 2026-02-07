'use client';

import * as React from 'react';
import { cn } from '@hockey-life/ui';
import { SidebarProvider, useSidebar } from './SidebarContext';
import HierarchicalSidebar from './HierarchicalSidebar';
import type { CaptainTeamOverview } from '@/lib/actions/captain';
import type { DashboardData } from '@/lib/actions/dashboard';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  captainTeams: CaptainTeamOverview[];
  dashboardData: DashboardData | null;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <main
      className={cn(
        'transition-all duration-300 ease-in-out aurora-bg min-h-screen',
        isCollapsed ? 'ml-16' : 'ml-16 lg:ml-72'
      )}
    >
      {children}
    </main>
  );
}

export default function DashboardLayoutClient({
  children,
  captainTeams,
  dashboardData,
}: DashboardLayoutClientProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-neutral-950">
        <HierarchicalSidebar
          dashboardData={dashboardData}
          captainTeams={captainTeams}
        />
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
