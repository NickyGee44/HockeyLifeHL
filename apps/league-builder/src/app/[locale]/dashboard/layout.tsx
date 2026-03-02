import * as React from 'react';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCaptainTeams } from '@/lib/actions/captain';
import { getCachedDashboardData } from '@/lib/actions/dashboard';
import { getSetupIssues } from '@/lib/actions/setup-status';
import { getCurrentUser } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { hasPlatformSubscription } from '@/lib/utils/addon-helpers';
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient';
import { PostHogIdentifier } from '@/components/analytics/PostHogIdentifier';

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

  // Check if the user's primary organization has an active Platform subscription
  const orgId = dashboardData?.organizations?.[0]?.id;
  const isSubscribed = orgId ? await hasPlatformSubscription(orgId) : false;
  const isPlatformAdmin = !!(userData.profile as any)?.is_platform_admin;

  const profile = userData.profile as any;

  return (
    <>
      <PostHogIdentifier
        userId={userData.user.id}
        email={userData.user.email}
        displayName={profile?.display_name || profile?.username}
      />
      <DashboardLayoutClient
      captainTeams={captainTeams}
      dashboardData={dashboardData}
      setupIssues={setupIssues}
      isSubscribed={isSubscribed}
      isPlatformAdmin={isPlatformAdmin}
    >
      {children}
    </DashboardLayoutClient>
    </>
  );
}
