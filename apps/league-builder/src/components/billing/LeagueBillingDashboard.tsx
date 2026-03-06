/**
 * League Billing Dashboard Component
 *
 * Main dashboard for league billing management.
 * Shows Connect onboarding, balance, payments, and statistics.
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, TrendingUp, Receipt, Percent, Loader2, Layers, CalendarCheck, GitBranch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ConnectOnboardingCard } from './ConnectOnboardingCard';
import { PayoutInfoCard } from './PayoutInfoCard';
import { PaymentHistoryTable } from './PaymentHistoryTable';
import {
  getConnectAccountStatus,
  getPaymentStatistics,
} from '@/lib/actions/stripe-connect-payments';
import { getLeagueBilling } from '@/lib/actions/fees';
import type { ConnectAccountInfo } from '@/lib/leagues/stripe-connect';
import type { LeagueBillingConfig } from '@/lib/fees/platform-fees';

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
            {isPlatformAdmin && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t('adminNote')}
              </p>
            )}
          </CardContent>
        </Card>
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
