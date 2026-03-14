import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getConnectAccountInfo,
  type ConnectAccountInfo,
} from '@/lib/leagues/stripe-connect';
import {
  getRegistrationPaymentMode,
  getSeasonPaymentSettings,
  isPlayerFeeConfigurationMissing,
  usesTeamBilling,
} from '@/lib/payments/fee-collection-model';
import { pickOperationalSeason } from '@/lib/seasons/operational';

type SeasonRow = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  fee_collection_model?: 'individual' | 'team' | 'hybrid' | null;
};

export interface ActiveBillingSeasonContext {
  id: string;
  name: string;
  status: string;
  feeCollectionModel: 'individual' | 'team' | 'hybrid';
  feeAmountCents: number;
  feeBasis: 'player' | 'team';
  paymentMode: 'hidden' | 'required' | 'optional' | 'team_contribution';
  currency: string;
  hasActiveFee: boolean;
}

export interface BillingReadiness {
  stripeStatus: ConnectAccountInfo['status'];
  canAcceptPayments: boolean;
  canPayout: boolean;
  needsOwnerAttention: boolean;
  needsSeasonFee: boolean;
  needsInvoiceGeneration: boolean;
  activeBillingSeason: ActiveBillingSeasonContext | null;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  accountInfo: ConnectAccountInfo;
}

function normalizeSeasonStatus(status: string | null | undefined): string {
  return status || 'draft';
}

export function pickBillingSeason(seasons: SeasonRow[]): SeasonRow | null {
  const activeTeamBillingSeason =
    seasons.find(
      (season) =>
        (season.fee_collection_model === 'team' ||
          season.fee_collection_model === 'hybrid') &&
        season.status !== 'completed'
    ) ?? null;

  return activeTeamBillingSeason ?? pickOperationalSeason(seasons) ?? seasons[0] ?? null;
}

async function syncStripeStatus(
  leagueId: string,
  stripeAccountId: string | null
): Promise<ConnectAccountInfo> {
  const accountInfo = await getConnectAccountInfo(stripeAccountId);
  const serviceSupabase = createServiceRoleClient();

  await serviceSupabase
    .from('leagues')
    .update({
      stripe_account_status: accountInfo.status,
      payment_mode: accountInfo.chargesEnabled ? 'stripe' : 'manual',
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  return accountInfo;
}

export async function getBillingReadiness(leagueId: string): Promise<BillingReadiness> {
  const supabase = createServiceRoleClient();

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, stripe_account_id')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    throw leagueError || new Error('League not found');
  }

  const { data: seasonsData, error: seasonsError } = await (supabase as any)
    .from('seasons')
    .select('id, name, status, start_date, end_date, created_at, fee_collection_model')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  if (seasonsError) {
    throw seasonsError;
  }

  const seasons = ((seasonsData || []) as SeasonRow[]).map((season) => ({
    ...season,
    status: normalizeSeasonStatus(season.status),
  }));
  const preferredSeason = pickBillingSeason(seasons);

  const accountInfo = await syncStripeStatus(leagueId, league.stripe_account_id);
  const canAcceptPayments = accountInfo.chargesEnabled;
  const canPayout = accountInfo.payoutsEnabled;

  let activeBillingSeason: ActiveBillingSeasonContext | null = null;
  let needsSeasonFee = false;
  let needsInvoiceGeneration = false;

  if (preferredSeason) {
    const paymentSettings = await getSeasonPaymentSettings(
      supabase as any,
      leagueId,
      preferredSeason.id
    );
    const paymentMode = getRegistrationPaymentMode(
      paymentSettings.feeCollectionModel,
      paymentSettings.feeAmountCents,
      paymentSettings.feeBasis
    );

    activeBillingSeason = {
      id: preferredSeason.id,
      name: preferredSeason.name,
      status: normalizeSeasonStatus(preferredSeason.status),
      feeCollectionModel: paymentSettings.feeCollectionModel,
      feeAmountCents: paymentSettings.feeAmountCents,
      feeBasis: paymentSettings.feeBasis,
      paymentMode,
      currency: paymentSettings.currency,
      hasActiveFee: paymentSettings.feeAmountCents > 0,
    };

    needsSeasonFee = isPlayerFeeConfigurationMissing(
      paymentSettings.feeCollectionModel,
      paymentSettings.feeAmountCents,
      paymentSettings.feeBasis
    );

    if (usesTeamBilling(paymentSettings.feeCollectionModel, paymentSettings.feeBasis)) {
      const { count: invoiceCount } = await (supabase as any)
        .from('team_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('season_id', preferredSeason.id);

      needsInvoiceGeneration = (invoiceCount || 0) === 0;
    }
  }

  let message = 'Payments are ready.';
  let ctaLabel = 'Open Stripe Dashboard';
  let ctaUrl = `/dashboard/leagues/${leagueId}/billing`;
  let needsOwnerAttention = false;

  if (!league.stripe_account_id) {
    message = 'Stripe is not connected yet. Complete payment setup to start collecting registration fees.';
    ctaLabel = 'Set Up Payments';
    needsOwnerAttention = true;
  } else if (!canAcceptPayments) {
    message =
      accountInfo.status === 'disabled'
        ? 'Stripe is currently blocked from accepting payments. Review your billing setup and Stripe verification details.'
        : 'Stripe needs more information before card payments can be accepted.';
    ctaLabel = accountInfo.status === 'disabled' ? 'Review Billing' : 'Finish Setup';
    needsOwnerAttention = true;
  } else if (needsSeasonFee) {
    message = 'Add an active season fee before opening player payment collection for this season.';
    ctaLabel = 'Set Season Fee';
    ctaUrl = `/dashboard/leagues/${leagueId}/seasons/${activeBillingSeason?.id}`;
    needsOwnerAttention = true;
  } else if (needsInvoiceGeneration && activeBillingSeason) {
    message = 'Team billing is ready, but invoices have not been generated for the current billing season yet.';
    ctaLabel = 'Open Team Billing';
    ctaUrl = `/dashboard/leagues/${leagueId}/billing`;
    needsOwnerAttention = true;
  } else if (accountInfo.status === 'restricted' || accountInfo.requiresAction) {
    message =
      'Payments are live, but Stripe still has follow-up items. Review billing to keep payouts and verification healthy.';
    ctaLabel = 'Review Billing';
    needsOwnerAttention = true;
  }

  return {
    stripeStatus: accountInfo.status,
    canAcceptPayments,
    canPayout,
    needsOwnerAttention,
    needsSeasonFee,
    needsInvoiceGeneration,
    activeBillingSeason,
    message,
    ctaLabel,
    ctaUrl,
    accountInfo,
  };
}
