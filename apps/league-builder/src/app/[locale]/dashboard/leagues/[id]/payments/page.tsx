import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import {
  getLeaguePlayerPayments,
  getPaymentSummary,
  sendPaymentReminder,
  refundPlayerPayment,
  exportPaymentReport,
} from '@/lib/payments/payment-actions';
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
  }

  const supabase = await createClient();

  // Verify league access
  const { data: membership, error: membershipError } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', userData.id)
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

  // Parse search params
  const search = await searchParams;
  const selectedSeasonId = search?.season as string | undefined;
  const statusFilter = search?.status as string | undefined;
  const page = Number(search?.page || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  // Determine which season to show (default to most recent active)
  const activeSeason =
    seasons?.find((s) => s.id === selectedSeasonId) ||
    seasons?.find((s) => s.status === 'active') ||
    seasons?.[0];

  let payments: any[] = [];
  let total = 0;
  let summary = null;

  if (activeSeason) {
    // Get payments for the selected season
    const paymentsResult = await getLeaguePlayerPayments(leagueId, {
      seasonId: activeSeason.id,
      status: statusFilter,
      limit,
      offset,
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
  }

  return (
    <PaymentDashboard
      locale={locale}
      leagueId={leagueId}
      leagueName={league.name}
      seasons={seasons || []}
      selectedSeason={activeSeason}
      payments={payments}
      summary={summary}
      total={total}
      currentPage={page}
      limit={limit}
      statusFilter={statusFilter}
      hasStripeConnected={
        !!league.stripe_account_id && league.stripe_account_status === 'complete'
      }
    />
  );
}
