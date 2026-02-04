/**
 * League Billing Page
 *
 * Stripe Connect billing management for leagues.
 * Requires owner or admin role on the league.
 */

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LeagueBillingDashboard } from '@/components/billing';
import { getPlatformFeeConfig } from '@/lib/fees/platform-fees';

export const metadata = {
  title: 'League Billing | Beer League Hockey',
  description: 'Manage payments and payouts for your league',
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    onboarding?: string;
  }>;
}

export default async function LeagueBillingPage({ params, searchParams }: PageProps) {
  // Await params as required in Next.js 16
  const { id: leagueId } = await params;
  const resolvedSearchParams = await searchParams;

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?redirect=/dashboard/leagues/${leagueId}/billing`);
  }

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, stripe_account_id, stripe_account_status')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Verify user is owner or admin of this league
  const { data: membership, error: membershipError } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    // Check if they created the league (owner via leagues.created_by)
    if (league && (league as any).created_by !== user.id) {
      redirect('/dashboard?error=unauthorized');
    }
  } else {
    // Check membership role
    if (!['owner', 'admin'].includes(membership.role)) {
      redirect('/dashboard?error=unauthorized');
    }

    if (membership.status !== 'active') {
      redirect('/dashboard?error=membership-inactive');
    }
  }

  const feeConfig = await getPlatformFeeConfig();

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <LeagueBillingDashboard leagueId={leagueId} leagueName={league.name} platformFeePercent={feeConfig.processingFeePercent} />

      {/* Handle onboarding return */}
      {resolvedSearchParams.onboarding === 'complete' && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.history.replaceState({}, '', window.location.pathname);
              window.dispatchEvent(new CustomEvent('stripe-onboarding-complete'));
            `,
          }}
        />
      )}

      {resolvedSearchParams.onboarding === 'refresh' && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.history.replaceState({}, '', window.location.pathname);
              window.location.reload();
            `,
          }}
        />
      )}
    </div>
  );
}
