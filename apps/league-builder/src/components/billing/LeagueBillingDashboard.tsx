/**
 * League Billing Dashboard Component
 *
 * Main dashboard for league billing management.
 * Shows Connect onboarding, balance, payments, and statistics.
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, TrendingUp, Receipt, Percent, Loader2, Layers, CalendarCheck, GitBranch, ShieldCheck, Wand2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ConnectOnboardingCard } from './ConnectOnboardingCard';
import { PayoutInfoCard } from './PayoutInfoCard';
import { PaymentHistoryTable } from './PaymentHistoryTable';
import { FeeSplitSlider } from './FeeSplitSlider';
import {
  getConnectAccountStatus,
  getPaymentStatistics,
} from '@/lib/actions/stripe-connect-payments';
import { getLeagueBilling, overrideLeagueTier, assignLeagueTier } from '@/lib/actions/fees';
import type { ConnectAccountInfo } from '@/lib/leagues/stripe-connect';
import type { LeagueBillingConfig, PricingTier } from '@/lib/fees/platform-fees';

interface LeagueBillingDashboardProps {
  leagueId: string;
  leagueName: string;
  platformFeePercent: number;
  isPlatformAdmin?: boolean;
}

interface PaymentStats {
  totalRevenue: number;
  totalFeesPaid: number;
  netRevenue: number;
  paymentCount: number;
  successRate: number;
  averagePayment: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

const TIER_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  small: 'outline',
  standard: 'secondary',
  large: 'default',
  enterprise: 'default',
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ============================================================================
// Admin Tier Controls (platform admin only)
// ============================================================================

const TIER_OPTIONS: { value: PricingTier; label: string }[] = [
  { value: 'small', label: 'Small — $299/season flat' },
  { value: 'standard', label: 'Standard — 3.5% ($250/mo floor)' },
  { value: 'large', label: 'Large — 3.25% ($500/mo floor)' },
  { value: 'enterprise', label: 'Enterprise — negotiated' },
];

function AdminTierControls({
  leagueId,
  currentTier,
  currentReferralDiscountBps,
  onSuccess,
}: {
  leagueId: string;
  currentTier: PricingTier;
  currentReferralDiscountBps: number;
  onSuccess: () => void;
}) {
  const [overrideTier, setOverrideTier] = useState<PricingTier>(currentTier);
  const [referralBps, setReferralBps] = useState(currentReferralDiscountBps);
  const [overriding, setOverriding] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  async function handleOverride() {
    setOverriding(true);
    const result = await overrideLeagueTier(leagueId, overrideTier, referralBps);
    setOverriding(false);
    if (result.success) {
      toast.success('Tier overridden', { description: `Set to ${overrideTier} with ${referralBps} bps referral discount.` });
      onSuccess();
    } else {
      toast.error('Override failed', { description: result.error });
    }
  }

  async function handleAutoAssign() {
    setAutoAssigning(true);
    const result = await assignLeagueTier(leagueId, { referralDiscountBps: referralBps });
    setAutoAssigning(false);
    if (result.success) {
      toast.success('Tier auto-assigned', { description: `Detected tier: ${result.tier}` });
      setOverrideTier(result.tier);
      onSuccess();
    } else {
      toast.error('Auto-assign failed', { description: result.error });
    }
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">Platform Admin — Tier Controls</CardTitle>
        </div>
        <CardDescription>Override pricing tier or auto-detect from current team count and paid fees.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="tier-select">Tier</label>
            <select
              id="tier-select"
              value={overrideTier}
              onChange={(e) => setOverrideTier(e.target.value as PricingTier)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="referral-bps">
              Referral Discount (bps, max 75)
            </label>
            <input
              id="referral-bps"
              type="number"
              min={0}
              max={75}
              step={25}
              value={referralBps}
              onChange={(e) => setReferralBps(Math.min(75, Math.max(0, Number(e.target.value))))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleOverride}
            disabled={overriding || autoAssigning}
          >
            {overriding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Override Tier
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAutoAssign}
            disabled={overriding || autoAssigning}
          >
            {autoAssigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
            Auto-Detect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeagueBillingDashboard({
  leagueId,
  leagueName,
  platformFeePercent,
  isPlatformAdmin = false,
}: LeagueBillingDashboardProps) {
  const t = useTranslations('billing.league');
  const [accountInfo, setAccountInfo] = useState<ConnectAccountInfo | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [billingConfig, setBillingConfig] = useState<LeagueBillingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [accountResult, statsResult, billingResult] = await Promise.all([
        getConnectAccountStatus(leagueId),
        getPaymentStatistics(leagueId),
        getLeagueBilling(leagueId),
      ]);

      if (accountResult.success) {
        setAccountInfo(accountResult.data);
      } else {
        toast.error('Failed to load account status', {
          description: accountResult.error,
        });
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      }

      if (billingResult.success) {
        setBillingConfig(billingResult.data);
      }
    } catch (error) {
      console.error('[Billing] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is a data-fetching function that depends on leagueId; also called from handleStatusChange
  }, [leagueId]);

  function handleStatusChange() {
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!accountInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('billingTitle')}</CardTitle>
          <CardDescription>{t('unableToLoad')}</CardDescription>
        </CardHeader>
        <CardContent>
          <button onClick={loadData} className="text-primary hover:underline">
            {t('tryAgain')}
          </button>
        </CardContent>
      </Card>
    );
  }

  const isConnected = accountInfo.status === 'complete';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">
          {t('managePayments', { leagueName })}
        </p>
      </div>

      {/* Quick Stats - Only show if connected */}
      {isConnected && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('netEarnings')}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.netRevenue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('transactions')}</p>
                  <p className="text-2xl font-bold">{stats.paymentCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Percent className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('platformFees')}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.totalFeesPaid)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Account Setup & Balance */}
        <div className="space-y-6">
          <ConnectOnboardingCard
            leagueId={leagueId}
            accountInfo={accountInfo}
            onStatusChange={handleStatusChange}
          />
          <PayoutInfoCard leagueId={leagueId} isConnected={isConnected} />
        </div>

        {/* Right Column - Payment History */}
        <div className="lg:col-span-2">
          <PaymentHistoryTable leagueId={leagueId} isConnected={isConnected} />
        </div>
      </div>

      {/* Tier Info Card */}
      {billingConfig && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('tierTitle')}</CardTitle>
            </div>
            <CardDescription>{t('tierDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('tier')}</p>
                <Badge variant={TIER_BADGE_VARIANT[billingConfig.pricingTier] ?? 'outline'} className="capitalize">
                  {billingConfig.pricingTier}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('effectiveRate')}</p>
                <p className="font-semibold">
                  {billingConfig.pricingTier === 'small'
                    ? t('flatSeasonFee', { amount: formatCents(billingConfig.flatSeasonFeeCents) })
                    : `${(billingConfig.platformFeeBps / 100).toFixed(2)}%`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('monthlyFloor')}</p>
                <p className="font-semibold">
                  {billingConfig.monthlyFloorCents === 0
                    ? t('none')
                    : formatCents(billingConfig.monthlyFloorCents) + '/mo'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('floorSubscription')}</p>
                <div className="flex items-center gap-1">
                  {billingConfig.floorStripeSubscriptionId ? (
                    <>
                      <CalendarCheck className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600 dark:text-green-400">{t('active')}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t('notApplicable')}</span>
                  )}
                </div>
              </div>
            </div>
            {billingConfig.referralDiscountBps > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <GitBranch className="h-4 w-4" />
                <span>
                  {t('referralDiscount', {
                    discount: (billingConfig.referralDiscountBps / 100).toFixed(2),
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fee Split Slider - only for percentage-based tiers */}
      {billingConfig && billingConfig.pricingTier !== 'small' && (
        <FeeSplitSlider
          leagueId={leagueId}
          platformFeeBps={billingConfig.platformFeeBps}
          initialSharePercent={billingConfig.playerFeeSharePercent}
          pricingTier={billingConfig.pricingTier}
        />
      )}

      {/* Platform Admin Controls */}
      {isPlatformAdmin && billingConfig && (
        <AdminTierControls
          leagueId={leagueId}
          currentTier={billingConfig.pricingTier}
          currentReferralDiscountBps={billingConfig.referralDiscountBps}
          onSuccess={() => loadData()}
        />
      )}

      {/* Platform Fee Notice */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Percent className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('platformFeeNotice', { percent: platformFeePercent })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
