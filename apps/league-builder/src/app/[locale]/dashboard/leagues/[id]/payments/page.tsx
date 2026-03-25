import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import {
  getLeaguePlayerPayments,
  getPaymentSummary,
} from '@/lib/payments/payment-actions';
import { pickOperationalSeason } from '@/lib/seasons/operational';
import { getBillingReadiness } from '@/lib/payments/billing-readiness';
import { reconcileSeasonRegistrationFees } from '@/lib/payments/registration-fee-reconciliation';
import { PaymentDashboard } from './PaymentDashboard';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PaymentTrackingPage({ params, searchParams }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
    return null;
  }

  const supabase = await createClient();

  // Verify league access
  const { data: membership, error: membershipError } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', userData.user.id)
    .single();

  if (membershipError || !membership) {
    notFound();
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-neutral-400">Only league owners and admins can access payments.</p>
        </div>
      </div>
    );
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

  // Get active seasons
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, status, start_date, end_date')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  // Get teams for filtering
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .order('name');

  // Parse search params
  const search = await searchParams;
  const selectedSeasonId = search?.season as string | undefined;
  const statusFilter = search?.status as string | undefined;
  const includeArchived = search?.archived === '1';
  const focusedPaymentId = search?.payment as string | undefined;
  const page = Number(search?.page || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  // Determine which season to show (default to most recent active)
  const activeSeason =
    seasons?.find((s) => s.id === selectedSeasonId) ||
    pickOperationalSeason(seasons ?? []) ||
    seasons?.[0];
  const billingReadiness = await getBillingReadiness(leagueId);

  let payments: any[] = [];
  let total = 0;
  let summary = null;
  let focusedPayment: any = null;

  if (activeSeason) {
    await reconcileSeasonRegistrationFees(leagueId, activeSeason.id);

    // Get payments for the selected season
    const paymentsResult = await getLeaguePlayerPayments(leagueId, {
      seasonId: activeSeason.id,
      status: statusFilter,
      limit,
      offset,
      includeArchived,
    });

    if (paymentsResult.success) {
      payments = paymentsResult.data.payments;
      total = paymentsResult.data.total;
    }

    // Get payment summary
    const summaryResult = await getPaymentSummary(leagueId, activeSeason.id);
    if (summaryResult.success) {
      summary = summaryResult.data;
    }

    if (focusedPaymentId) {
      const focusedPaymentResult = await supabase
        .from('player_payments')
        .select(
          `
          *,
          player:player_id (id, full_name, email, avatar_url),
          season_fee:season_fee_id (id, name, amount_cents),
          team:team_id (id, name, short_name)
        `
        )
        .eq('id', focusedPaymentId)
        .eq('league_id', leagueId)
        .eq('season_id', activeSeason.id)
        .maybeSingle();

      if (!focusedPaymentResult.error && focusedPaymentResult.data) {
        const paymentRow = focusedPaymentResult.data as any;
        if (includeArchived || !paymentRow.archived_at) {
          focusedPayment = paymentRow;
        }
      }
    }
  }

  return (
    <PaymentDashboard
      locale={locale}
      leagueId={leagueId}
      leagueName={league.name}
      seasons={(seasons || []).map((s) => ({ ...s, status: s.status ?? 'draft' }))}
      selectedSeason={
        activeSeason ? { ...activeSeason, status: activeSeason.status ?? 'draft' } : null
      }
      payments={payments}
      summary={summary}
      total={total}
      currentPage={page}
      limit={limit}
      statusFilter={statusFilter}
      includeArchived={includeArchived}
      teams={(teams || []).map((t) => ({ id: t.id, name: t.name }))}
      billingReadiness={billingReadiness}
      focusedPayment={focusedPayment}
      viewerRole={membership.role as 'owner' | 'admin'}
    />
  );
}
