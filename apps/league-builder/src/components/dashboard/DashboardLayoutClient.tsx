'use client';

import * as React from 'react';
import { cn } from '@hockey-life/ui';
import { AppSidebarProvider } from './AppSidebarContext';
import { AppSidebar } from './AppSidebar';
import { MobileAppHeader } from './MobileAppHeader';
import { MobileTabBar } from './MobileTabBar';
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
  return (
    <main
      className={cn(
        'transition-all duration-200 ease-in-out aurora-bg min-h-screen',
        // Mobile: top padding for header, bottom padding for tab bar
        'pt-14 pb-20 md:pt-0 md:pb-0',
        // Desktop: always 280px sidebar
        'md:ml-[280px]'
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
    <AppSidebarProvider>
      <div className="min-h-screen bg-neutral-950">
        {/* Mobile header — visible on mobile only */}
        <MobileAppHeader dashboardData={dashboardData} />

        {/* Sidebar — always visible on desktop, slide-in on mobile */}
        <AppSidebar
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

        {/* Mobile bottom tab bar — visible on mobile only */}
        <MobileTabBar />

        {/* Command palette (Cmd+K) */}
        <CommandPalette />

        {/* PWA install prompt + offline banner */}
        <InstallPrompt />
        <OfflineBanner />
      </div>
    </AppSidebarProvider>
  );
}
