/**
 * Billing Dashboard Component
 *
 * Data-driven billing overview with Stripe status, per-team collection,
 * and unpaid player tracking. Links out to Stripe dashboard for management.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  DollarSign,
  CreditCard,
  Wallet,
  Percent,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getConnectAccountStatus,
  getPaymentStatistics,
  initializeConnectAccount,
  startConnectOnboarding,
  getStripeDashboardLink,
} from '@/lib/actions/stripe-connect-payments';
import type { ConnectAccountInfo } from '@/lib/leagues/stripe-connect';
import { pickOperationalSeason } from '@/lib/seasons/operational';
import { TeamFeesDashboard } from './TeamFeesDashboard';

interface EmbeddedBillingDashboardProps {
  leagueId: string;
  leagueName: string;
  locale: string;
  platformFeePercent: number;
}

interface PaymentStats {
  totalRevenue: number;
  totalFeesPaid: number;
  netRevenue: number;
  paymentCount: number;
  successRate: number;
  averagePayment: number;
}

type BillingSeason = {
  id: string;
  name: string;
  feeCollectionModel: 'individual' | 'team' | 'hybrid';
  feeBasis: 'player' | 'team';
};

type SeasonRow = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  fee_collection_model?: 'individual' | 'team' | 'hybrid' | null;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

export function EmbeddedBillingDashboard({
  leagueId,
  leagueName,
  locale,
  platformFeePercent,
}: EmbeddedBillingDashboardProps) {
  const t = useTranslations('billing.embedded');
  const [accountInfo, setAccountInfo] = useState<ConnectAccountInfo | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [stripeActionLoading, setStripeActionLoading] = useState(false);
  const [activeSeason, setActiveSeason] = useState<BillingSeason | null>(null);

  const loadingRef = useRef(false);

  const loadData = useCallback(async () => {
    // Prevent concurrent loads that could cause cascading re-renders
    if (loadingRef.current) return;
    loadingRef.current = true;
    setInitialLoading(true);

    try {
      // Load account status + stats in parallel
      const [accountResult, statsResult] = await Promise.all([
        getConnectAccountStatus(leagueId),
        getPaymentStatistics(leagueId),
      ]);

      if (accountResult.success) {
        setAccountInfo(accountResult.data);
      }
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Find active season
      const supabase = createClient();
      const { data: seasonsData } = await (supabase as any)
        .from('seasons')
        .select('id, name, status, start_date, end_date, created_at, fee_collection_model')
        .eq('league_id', leagueId)
        .order('start_date', { ascending: false })
        .limit(10);

      const seasons = (seasonsData ?? []) as SeasonRow[];

      const preferredBillingSeason =
        (seasons ?? []).find(
          (season) =>
            (season.fee_collection_model === 'team' ||
              season.fee_collection_model === 'hybrid') &&
            season.status !== 'completed'
        ) ?? pickOperationalSeason(seasons ?? []) ?? seasons?.[0] ?? null;

      let feeBasis: 'player' | 'team' = 'player';
      if (preferredBillingSeason) {
        const feeBasisResult = await supabase
          .from('season_fees')
          .select('fee_basis')
          .eq('league_id', leagueId)
          .eq('season_id', preferredBillingSeason.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!feeBasisResult.error && feeBasisResult.data?.fee_basis === 'team') {
          feeBasis = 'team';
        }
      }

      setActiveSeason(
        preferredBillingSeason
          ? {
              id: preferredBillingSeason.id,
              name: preferredBillingSeason.name,
              feeCollectionModel:
                preferredBillingSeason.fee_collection_model === 'team' ||
                preferredBillingSeason.fee_collection_model === 'hybrid'
                  ? preferredBillingSeason.fee_collection_model
                  : 'individual',
              feeBasis,
            }
          : null
      );

    } catch (error) {
      console.error('[Billing] Failed to load dashboard data:', error);
    } finally {
      setInitialLoading(false);
      loadingRef.current = false;
    }
  }, [leagueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Stripe action handlers ──

  async function handleStripeAction() {
    setStripeActionLoading(true);
    try {
      const accountNotCreated = !accountInfo || accountInfo.status === 'not_created';
      const needsOnboarding =
        !accountNotCreated &&
        (accountInfo.status === 'pending' ||
          (accountInfo.status === 'restricted' && !accountInfo.chargesEnabled));

      if (accountNotCreated) {
        // Create account then start onboarding
        const createResult = await initializeConnectAccount(leagueId);
        if (!createResult.success) {
          toast.error(t('accountCreateFailed'), { description: createResult.error });
          return;
        }
        const returnUrl = `${window.location.origin}/${locale}/dashboard/leagues/${leagueId}/billing?onboarding=complete`;
        const refreshUrl = `${window.location.origin}/${locale}/dashboard/leagues/${leagueId}/billing?onboarding=refresh`;
        const onboardResult = await startConnectOnboarding(leagueId, returnUrl, refreshUrl);
        if (onboardResult.success) {
          window.open(onboardResult.data.url, '_blank');
          toast.success(t('accountCreated'));
          await loadData();
        } else {
          toast.error(t('accountCreateFailed'), { description: onboardResult.error });
        }
      } else if (needsOnboarding) {
        // Resume onboarding
        const returnUrl = `${window.location.origin}/${locale}/dashboard/leagues/${leagueId}/billing?onboarding=complete`;
        const refreshUrl = `${window.location.origin}/${locale}/dashboard/leagues/${leagueId}/billing?onboarding=refresh`;
        const result = await startConnectOnboarding(leagueId, returnUrl, refreshUrl);
        if (result.success) {
          window.open(result.data.url, '_blank');
        } else {
          toast.error(result.error);
        }
      } else {
        // Connected — open Stripe dashboard
        const result = await getStripeDashboardLink(leagueId);
        if (result.success) {
          window.open(result.data.url, '_blank');
        } else {
          toast.error(result.error);
        }
      }
    } catch {
      toast.error(t('accountCreateFailed'));
    } finally {
      setStripeActionLoading(false);
    }
  }

  // ── Loading skeleton ──
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/[0.06] rounded animate-pulse" />
        <div className="h-4 w-64 bg-white/[0.06] rounded animate-pulse" />
        <div className="h-24 bg-white/[0.04] border border-white/10 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/[0.04] border border-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white/[0.04] border border-white/10 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const accountNotCreated = !accountInfo || accountInfo.status === 'not_created';
  const canAcceptPayments = Boolean(accountInfo?.chargesEnabled);
  const needsOnboarding =
    !accountNotCreated &&
    !canAcceptPayments &&
    (accountInfo.status === 'pending' || accountInfo.status === 'restricted');
  const isConnected = !accountNotCreated && canAcceptPayments;
  const isDisabled = accountInfo?.status === 'disabled';

  // Determine stripe card styling
  let stripeCardClass = '';
  let stripeIconClass = '';
  let stripeLabelClass = '';
  let stripeStatusIcon = AlertCircle;
  let stripeLabel = '';
  let stripeDescription = '';
  let stripeBtnLabel = '';

  if (isConnected) {
    stripeCardClass = 'border-emerald-500/30 bg-emerald-500/5';
    stripeIconClass = 'bg-emerald-500/10 text-emerald-500';
    stripeLabelClass = 'text-emerald-400';
    stripeStatusIcon = CheckCircle2;
    stripeLabel = t('stripeConnected');
    stripeDescription = t('connectedDescription');
    stripeBtnLabel = t('openDashboard');
  } else if (isDisabled) {
    stripeCardClass = 'border-red-500/30 bg-red-500/5';
    stripeIconClass = 'bg-red-500/10 text-red-500';
    stripeLabelClass = 'text-red-400';
    stripeStatusIcon = AlertCircle;
    stripeLabel = t('statusLabels.disabled');
    stripeDescription = t('disabledDescription');
    stripeBtnLabel = t('openDashboard');
  } else if (needsOnboarding) {
    stripeCardClass = 'border-amber-500/30 bg-amber-500/5';
    stripeIconClass = 'bg-amber-500/10 text-amber-500';
    stripeLabelClass = 'text-amber-400';
    stripeStatusIcon = Clock;
    stripeLabel = t('setupIncomplete');
    stripeDescription = t('setupIncompleteDescription');
    stripeBtnLabel = t('completeSetup');
  } else if (accountInfo?.status === 'restricted') {
    stripeCardClass = 'border-amber-500/30 bg-amber-500/5';
    stripeIconClass = 'bg-amber-500/10 text-amber-500';
    stripeLabelClass = 'text-amber-400';
    stripeStatusIcon = AlertCircle;
    stripeLabel = t('actionRequired');
    stripeDescription = t('actionRequiredDesc');
    stripeBtnLabel = t('openDashboard');
  } else {
    stripeCardClass = 'border-red-500/30 bg-red-500/5';
    stripeIconClass = 'bg-red-500/10 text-red-500';
    stripeLabelClass = 'text-red-400';
    stripeStatusIcon = AlertCircle;
    stripeLabel = t('statusLabels.notSetUp');
    stripeDescription = t('setupDescription');
    stripeBtnLabel = t('setupButton');
  }

  const StripeIcon = stripeStatusIcon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        <p className="text-neutral-400">
          {t('managePayments', { leagueName })}
        </p>
      </div>

      {/* ── Stripe Status Card + Large CTA ── */}
      <div className={`rounded-2xl border p-6 sm:p-8 ${stripeCardClass}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-4 rounded-xl ${stripeIconClass}`}>
            <StripeIcon className="h-8 w-8" />
          </div>
          <div>
            <p className={`text-xl font-bold ${stripeLabelClass}`}>{stripeLabel}</p>
            <p className="text-sm text-neutral-400 mt-0.5">{stripeDescription}</p>
          </div>
        </div>
        {(!isDisabled || accountInfo?.accountId) && (
          <button
            className={`w-full py-4 px-6 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-3 ${
              isConnected
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
                : needsOnboarding
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={handleStripeAction}
            disabled={stripeActionLoading}
          >
            {stripeActionLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            {stripeBtnLabel}
            <ExternalLink className="h-5 w-5" />
          </button>
        )}
      </div>

      {activeSeason && activeSeason.feeCollectionModel !== 'individual' && (
        <TeamFeesDashboard leagueId={leagueId} seasonId={activeSeason.id} />
      )}

      {/* ── Quick Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-400 truncate">{t('totalRevenue')}</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-400 truncate">{t('netEarnings')}</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {formatCurrency(stats.netRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-400 truncate">{t('transactions')}</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.paymentCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                <Percent className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-400 truncate">{t('platformFees')}</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {formatCurrency(stats.totalFeesPaid)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Season Fee Setup Link ── */}
      {activeSeason && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rink-500/10">
                <DollarSign className="h-5 w-5 text-rink-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Season Fees</h3>
                <p className="text-xs text-neutral-500">
                  {activeSeason.name} — {activeSeason.feeCollectionModel === 'individual' ? 'Individual player fees' : activeSeason.feeCollectionModel === 'team' ? 'Team-based fees' : 'Hybrid fees'}
                </p>
              </div>
            </div>
            <a
              href={`/${locale}/dashboard/leagues/${leagueId}/seasons`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-rink-400 border border-rink-500/30 rounded-xl hover:bg-rink-500/10 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Manage Fees
            </a>
          </div>
        </div>
      )}

      {/* ── Platform Fee Notice ── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl py-3 px-4">
        <div className="flex items-start gap-3">
          <Percent className="h-4 w-4 text-neutral-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-neutral-500">
            {t('platformFeeNotice', { percent: platformFeePercent })}
          </p>
        </div>
      </div>
    </div>
  );
}
