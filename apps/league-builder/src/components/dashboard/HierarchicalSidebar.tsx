'use client';

import * as React from 'react';
import { IconRail } from './IconRail';
import { SecondaryPanel } from './SecondaryPanel';
import type { CaptainTeamOverview } from '@/lib/actions/captain';
import type { DashboardData } from '@/lib/actions/dashboard';

interface HierarchicalSidebarProps {
  dashboardData: DashboardData | null;
  captainTeams: CaptainTeamOverview[];
  isSubscribed: boolean;
  isPlatformAdmin: boolean;
}

export default function HierarchicalSidebar({
  dashboardData,
  captainTeams,
  isSubscribed,
  isPlatformAdmin,
}: HierarchicalSidebarProps) {
  const isOrgOwner = (dashboardData?.organizations?.length ?? 0) > 0;

  return (
    <>
      <IconRail
        captainTeams={captainTeams}
        isPlatformAdmin={isPlatformAdmin}
        isOrgOwner={isOrgOwner}
      />
      <SecondaryPanel
        dashboardData={dashboardData}
        isSubscribed={isSubscribed}
      />
    </>
  );
}
