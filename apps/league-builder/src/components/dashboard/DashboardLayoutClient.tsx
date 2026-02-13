'use client';

import * as React from 'react';
import { cn } from '@hockey-life/ui';
import { SidebarProvider, useSidebar } from './SidebarContext';
import HierarchicalSidebar from './HierarchicalSidebar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { SetupBanner } from './SetupBanner';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';
import { InstallPrompt } from './InstallPrompt';
import { OfflineBanner } from './OfflineBanner';
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
  dashboardData,
}: {
  children: React.ReactNode;
  setupIssues: LeagueSetupIssue[];
  dashboardData: DashboardData | null;
}) {
  const { isCollapsed } = useSidebar();

  return (
    <main
      className={cn(
        'transition-all duration-300 ease-in-out aurora-bg min-h-screen',
        // Mobile: no left margin, top padding for header, bottom padding for nav
        'pt-14 pb-20 md:pt-0 md:pb-0',
        // Desktop: sidebar margin
        isCollapsed ? 'md:ml-16' : 'md:ml-16 lg:ml-72'
      )}
    >
      {setupIssues.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <SetupBanner issues={setupIssues} />
        </div>
      )}
      <Breadcrumbs dashboardData={dashboardData} />
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
        {/* Mobile header — visible on mobile only */}
        <MobileHeader dashboardData={dashboardData} />

        {/* Desktop sidebar — hidden on mobile */}
        <HierarchicalSidebar
          dashboardData={dashboardData}
          captainTeams={captainTeams}
        />

        <DashboardContent setupIssues={setupIssues} dashboardData={dashboardData}>{children}</DashboardContent>

        {/* Mobile bottom nav — visible on mobile only */}
        <MobileBottomNav />

        {/* Command palette (Cmd+K) */}
        <CommandPalette />

        {/* PWA install prompt + offline banner */}
        <InstallPrompt />
        <OfflineBanner />
      </div>
    </SidebarProvider>
  );
}
