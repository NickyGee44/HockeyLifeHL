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
  Users,
  UserX,
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
import {
  getPerTeamPaymentBreakdown,
  getUnpaidPlayers,
  type TeamPaymentBreakdown,
  type UnpaidPlayer,
} from '@/lib/actions/team-billing';
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
  const [teamBreakdown, setTeamBreakdown] = useState<TeamPaymentBreakdown[]>([]);
  const [unpaidPlayers, setUnpaidPlayers] = useState<UnpaidPlayer[]>([]);
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

      // Load team/player data if we have a season
      if (preferredBillingSeason) {
        const [teamResult, playerResult] = await Promise.all([
          getPerTeamPaymentBreakdown(leagueId, preferredBillingSeason.id),
          getUnpaidPlayers(leagueId, preferredBillingSeason.id),
        ]);

        if (teamResult.success) {
          setTeamBreakdown(teamResult.data);
        }
        if (playerResult.success) {
          setUnpaidPlayers(playerResult.data);
        }
      }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">{t('totalRevenue')}</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">{t('netEarnings')}</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.netRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">{t('transactions')}</p>
                <p className="text-2xl font-bold text-white">{stats.paymentCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Percent className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">{t('platformFees')}</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalFeesPaid)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Collection by Team ── */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-neutral-400" />
            <h3 className="text-lg font-semibold text-white">{t('collectionByTeam')}</h3>
          </div>
          {activeSeason && (
            <span className="text-sm text-neutral-500">{activeSeason.name}</span>
          )}
        </div>

        {teamBreakdown.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-500">{t('noTeamData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('teamName')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('players')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('totalOwed')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('collected')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('outstanding')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider w-32">{t('progress')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teamBreakdown.map((team) => {
                  const percent = team.total_fee_cents > 0
                    ? Math.round((team.total_collected_cents / team.total_fee_cents) * 100)
                    : 0;
                  return (
                    <tr key={team.team_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white">{team.team_name}</td>
                      <td className="px-6 py-4 text-sm text-neutral-400 text-right">{team.total_players}</td>
                      <td className="px-6 py-4 text-sm text-neutral-400 text-right">
                        {formatCurrency(team.total_fee_cents)}
                        {activeSeason?.feeBasis === 'team' && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Targets {formatCurrency(team.player_target_total_cents || 0)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-400 text-right">
                        {formatCurrency(team.total_collected_cents)}
                        {activeSeason?.feeBasis === 'team' && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Players {formatCurrency(team.player_paid_cents || 0)} • Team{' '}
                            {formatCurrency(team.team_payment_total_cents || 0)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={team.total_outstanding_cents > 0 ? 'text-amber-400' : 'text-neutral-500'}>
                          {formatCurrency(team.total_outstanding_cents)}
                        </span>
                        {activeSeason?.feeBasis === 'team' && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Unallocated {formatCurrency(team.unallocated_target_cents || 0)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                percent >= 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-500 w-8 text-right">{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Unpaid Players ── */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
          <UserX className="h-5 w-5 text-neutral-400" />
          <h3 className="text-lg font-semibold text-white">{t('unpaidPlayersTitle')}</h3>
          {unpaidPlayers.length > 0 && (
            <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {t('unpaidCount', { count: unpaidPlayers.length })}
            </span>
          )}
        </div>

        {activeSeason?.feeBasis === 'team' ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mx-auto mb-3" />
            <p className="text-emerald-400 font-medium">Flat team fee season</p>
            <p className="text-sm text-neutral-500 mt-1">
              Player contributions still count here. The team invoice above combines player-level
              contributions and team chunk payments into one running balance.
            </p>
          </div>
        ) : unpaidPlayers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mx-auto mb-3" />
            <p className="text-emerald-400 font-medium">{t('allPaid')}</p>
            <p className="text-sm text-neutral-500 mt-1">{t('allPaidDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('playerName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('team')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('amountOwed')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('amountPaid')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('outstanding')}</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {unpaidPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white">{player.player_name}</p>
                      <p className="text-xs text-neutral-500">{player.player_email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-400">{player.team_name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-400 text-right">{formatCurrency(player.fee_amount_cents)}</td>
                    <td className="px-6 py-4 text-sm text-neutral-400 text-right">{formatCurrency(player.amount_paid_cents)}</td>
                    <td className="px-6 py-4 text-sm text-amber-400 text-right">{formatCurrency(player.outstanding_cents)}</td>
                    <td className="px-6 py-4 text-center">
                      {player.payment_status === 'partial' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {t('partial')}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {t('pending')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
