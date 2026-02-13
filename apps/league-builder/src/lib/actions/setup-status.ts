'use server';

import { createClient } from '@/lib/supabase/server';

export interface LeagueSetupIssue {
  type: 'draft' | 'no_teams' | 'no_season' | 'billing_incomplete';
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

    // 2. Paid registration enabled but no Stripe connected
    const feesEnabled = settings?.fees?.enablePaidRegistration === true;
    const paymentSkipped = settings?.payment?.skipPaymentSetup === true;
    const stripeConnected =
      league.stripe_account_id && league.stripe_account_status === 'complete';

    if (feesEnabled && !paymentSkipped && !stripeConnected) {
      issues.push({
        type: 'billing_incomplete',
        leagueId: league.id,
        leagueName: league.name,
        message:
          'Payment registration is enabled but Stripe is not connected. Players cannot pay until billing is set up.',
        actionUrl: `/dashboard/leagues/${league.id}?tab=billing`,
        actionLabel: 'Set Up Billing',
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

    // 4. No active season
    const { count: seasonCount } = await supabase
      .from('seasons')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id)
      .in('status', ['active', 'draft']);

    if (seasonCount === 0) {
      issues.push({
        type: 'no_season',
        leagueId: league.id,
        leagueName: league.name,
        message: 'No active season found. Create a season to start scheduling games.',
        actionUrl: `/dashboard/leagues/${league.id}?tab=seasons`,
        actionLabel: 'Create Season',
      });
    }
  }

  return issues;
}
