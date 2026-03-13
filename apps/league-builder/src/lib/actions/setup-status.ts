'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  hasDraftSeason,
  isOperationalSeasonStatus,
  pickOperationalSeason,
} from '@/lib/seasons/operational';
import { getConnectAccountInfo } from '@/lib/leagues/stripe-connect';

export interface LeagueSetupIssue {
  type: 'draft' | 'no_teams' | 'no_season' | 'billing_incomplete' | 'next_season';
  leagueId: string;
  leagueName: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
}

/**
 * Checks whether the current user has any leagues with incomplete setup.
 *
 * Incomplete setup is defined as:
 * 1. League status is 'draft' (wizard not finished)
 * 2. League has paid registration enabled but no Stripe Connect account
 * 3. League has no teams
 * 4. League has no season
 */
export async function getSetupIssues(): Promise<LeagueSetupIssue[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get all leagues the user owns
  const { data: memberships } = await supabase
    .from('league_memberships')
    .select('league_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .eq('status', 'active');

  if (!memberships || memberships.length === 0) return [];

  const leagueIds = memberships.map((m) => m.league_id);

  // Fetch leagues with related data
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, slug, status, settings, stripe_account_id, stripe_account_status')
    .in('id', leagueIds);

  if (!leagues || leagues.length === 0) return [];

  const issues: LeagueSetupIssue[] = [];
  const serviceSupabase = createServiceRoleClient();

  for (const league of leagues) {
    const settings = league.settings as Record<string, any> | null;

    // 1. Draft leagues — wizard not completed
    if (league.status === 'draft') {
      issues.push({
        type: 'draft',
        leagueId: league.id,
        leagueName: league.name,
        message: 'League setup is incomplete. Complete the wizard to launch your league.',
        actionUrl: `/dashboard/leagues/new`,
        actionLabel: 'Continue Setup',
      });
      continue; // Draft leagues won't have teams/seasons yet, skip other checks
    }

    // 2. Stripe billing not fully connected
    const feesEnabled = settings?.fees?.enablePaidRegistration === true;
    const paymentSkipped = settings?.payment?.skipPaymentSetup === true;
    const liveStripeInfo = league.stripe_account_id
      ? await getConnectAccountInfo(league.stripe_account_id)
      : null;
    const effectiveStripeStatus = liveStripeInfo?.status ?? league.stripe_account_status;
    const stripeConnected = Boolean(liveStripeInfo?.chargesEnabled);
    const stripeStartedButIncomplete =
      Boolean(league.stripe_account_id) && !stripeConnected;

    if (league.stripe_account_id && liveStripeInfo && effectiveStripeStatus !== league.stripe_account_status) {
      await serviceSupabase
        .from('leagues')
        .update({
          stripe_account_status: effectiveStripeStatus,
          payment_mode: liveStripeInfo.chargesEnabled ? 'stripe' : 'manual',
          updated_at: new Date().toISOString(),
        })
        .eq('id', league.id);
    }

    if (feesEnabled && !paymentSkipped && !stripeConnected) {
      issues.push({
        type: 'billing_incomplete',
        leagueId: league.id,
        leagueName: league.name,
        message:
          'Payment registration is enabled but Stripe is not connected. Players cannot pay until billing is set up.',
        actionUrl: `/dashboard/leagues/${league.id}/billing`,
        actionLabel: 'Set Up Billing',
      });
    } else if (stripeStartedButIncomplete) {
      // User started Stripe onboarding but didn't finish (regardless of fees setting)
      issues.push({
        type: 'billing_incomplete',
        leagueId: league.id,
        leagueName: league.name,
        message:
          effectiveStripeStatus === 'disabled'
            ? 'Stripe needs attention before payments can be accepted. Review the billing page to reconnect or finish any remaining verification steps.'
            : 'Stripe setup still needs follow-up before card payments can go live.',
        actionUrl: `/dashboard/leagues/${league.id}/billing`,
        actionLabel: effectiveStripeStatus === 'disabled' ? 'Review Billing' : 'Finish Setup',
      });
    }

    // 3. No teams
    const { count: teamCount } = await supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id);

    if (teamCount === 0) {
      issues.push({
        type: 'no_teams',
        leagueId: league.id,
        leagueName: league.name,
        message: 'No teams have been created. Add teams so players can register.',
        actionUrl: `/dashboard/leagues/${league.id}?tab=teams`,
        actionLabel: 'Add Teams',
      });
    }

    // 4. Current season / next season readiness
    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, status, start_date, end_date, created_at')
      .eq('league_id', league.id)
      .order('start_date', { ascending: false });

    const currentSeason = pickOperationalSeason(seasons ?? []);

    if (!currentSeason || !isOperationalSeasonStatus(currentSeason.status)) {
      issues.push({
        type: 'no_season',
        leagueId: league.id,
        leagueName: league.name,
        message: 'No active season found. Create a season to start scheduling games.',
        actionUrl: `/dashboard/leagues/${league.id}?tab=seasons`,
        actionLabel: 'Create Season',
      });
    } else if (
      currentSeason.status === 'playoffs' &&
      !hasDraftSeason(seasons ?? [], { excludeSeasonId: currentSeason.id })
    ) {
      issues.push({
        type: 'next_season',
        leagueId: league.id,
        leagueName: league.name,
        message: 'Playoffs are underway. Create the next season now so registration and scheduling can start early.',
        actionUrl: `/dashboard/leagues/${league.id}/seasons/new`,
        actionLabel: 'Create Next Season',
      });
    }
  }

  return issues;
}
