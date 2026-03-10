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
  isSubscribed: boolean;
  isPlatformAdmin: boolean;
  ownerViewLeagueId?: string | null;
  topBanner?: React.ReactNode;
}

function DashboardContent({
  children,
  setupIssues,
  dashboardData,
  topBanner,
}: {
  children: React.ReactNode;
  setupIssues: LeagueSetupIssue[];
  dashboardData: DashboardData | null;
  topBanner?: React.ReactNode;
}) {
  const { activeSection, isCollapsed } = useSidebar();

  // Icon rail = 64px (w-16). Secondary panel = 240px (w-60). Total when pinned = 304px.
  const hasSecondary = !isCollapsed && activeSection !== null;

  return (
    <main
      className={cn(
        'transition-all duration-200 ease-in-out aurora-bg min-h-screen',
        // Mobile: no left margin, top padding for header, bottom padding for nav
        'pt-14 pb-20 md:pt-0 md:pb-0',
        // Desktop: collapsed = no sidebar width, expanded icon rail (64px) + optional secondary panel (240px)
        isCollapsed ? 'md:ml-0' : hasSecondary ? 'md:ml-[304px]' : 'md:ml-16'
      )}
    >
      {topBanner}
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
  isSubscribed,
  isPlatformAdmin,
  ownerViewLeagueId = null,
  topBanner,
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
          isSubscribed={isSubscribed}
          isPlatformAdmin={isPlatformAdmin}
          ownerViewLeagueId={ownerViewLeagueId}
        />

        <DashboardContent
          setupIssues={setupIssues}
          dashboardData={dashboardData}
          topBanner={topBanner}
        >
          {children}
        </DashboardContent>

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
