'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { motion, useReducedMotion } from 'framer-motion';
import { AppSidebarProvider } from './AppSidebarContext';
import { AppSidebar } from './AppSidebar';
import { MobileAppHeader } from './MobileAppHeader';
import { MobileTabBar } from './MobileTabBar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';
import { InstallPrompt } from './InstallPrompt';
import { OfflineBanner } from './OfflineBanner';
import type { CaptainTeamOverview } from '@/lib/actions/captain';
import type { DashboardData } from '@/lib/actions/dashboard';
import { isFocusedDashboardFlow } from '@/lib/onboarding/routing';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  captainTeams: CaptainTeamOverview[];
  dashboardData: DashboardData | null;
  isSubscribed: boolean;
  isPlatformAdmin: boolean;
  ownerViewLeagueId?: string | null;
  topBanner?: React.ReactNode;
}

function DashboardContent({
  children,
  dashboardData,
  topBanner,
  isFocusedFlow,
  pathname,
}: {
  children: React.ReactNode;
  dashboardData: DashboardData | null;
  topBanner?: React.ReactNode;
  isFocusedFlow: boolean;
  pathname: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <main
      className={cn(
        'min-h-screen transition-all duration-200 ease-in-out aurora-bg',
        isFocusedFlow
          ? 'px-0 py-0'
          : [
              'pt-14 pb-20 md:pt-0 md:pb-0',
              'md:ml-[280px]',
            ]
      )}
    >
      {topBanner}
      {!isFocusedFlow ? <Breadcrumbs dashboardData={dashboardData} /> : null}
      <motion.div
        key={pathname}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </main>
  );
}

export default function DashboardLayoutClient({
  children,
  captainTeams,
  dashboardData,
  isSubscribed,
  isPlatformAdmin,
  ownerViewLeagueId = null,
  topBanner,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const isFocusedFlow = isFocusedDashboardFlow(pathname);

  return (
    <AppSidebarProvider>
      <div className="dashboard-shell min-h-screen bg-neutral-950">
        {/* Mobile header — visible on mobile only */}
        {!isFocusedFlow ? <MobileAppHeader dashboardData={dashboardData} /> : null}

        {/* Sidebar — always visible on desktop, slide-in on mobile */}
        {!isFocusedFlow ? (
          <AppSidebar
            dashboardData={dashboardData}
            captainTeams={captainTeams}
            isSubscribed={isSubscribed}
            isPlatformAdmin={isPlatformAdmin}
            ownerViewLeagueId={ownerViewLeagueId}
          />
        ) : null}

        <DashboardContent
          dashboardData={dashboardData}
          topBanner={topBanner}
          isFocusedFlow={isFocusedFlow}
          pathname={pathname}
        >
          {children}
        </DashboardContent>

        {/* Mobile bottom tab bar — visible on mobile only */}
        {!isFocusedFlow ? <MobileTabBar /> : null}

        {/* Command palette (Cmd+K) */}
        <CommandPalette />

        {/* PWA install prompt + offline banner */}
        <InstallPrompt />
        <OfflineBanner />
      </div>
    </AppSidebarProvider>
  );
}
