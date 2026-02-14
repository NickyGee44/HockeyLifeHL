/**
 * Embedded Billing Dashboard Component
 *
 * Uses Stripe Connect embedded components for a fully integrated
 * payment management experience without leaving the app.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, CreditCard, Wallet, Percent, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ConnectProvider,
  StripeErrorBoundary,
  EmbeddedOnboarding,
  EmbeddedPayments,
  EmbeddedPayouts,
  EmbeddedBalances,
  EmbeddedAccountManagement,
  EmbeddedNotificationBanner,
} from '@/components/stripe';
import {
  getConnectAccountStatus,
  getPaymentStatistics,
  initializeConnectAccount,
} from '@/lib/actions/stripe-connect-payments';
import type { ConnectAccountInfo } from '@/lib/leagues/stripe-connect';

interface EmbeddedBillingDashboardProps {
  leagueId: string;
  leagueName: string;
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

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

const STATUS_BADGE_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; labelKey: string }> = {
  complete: { icon: CheckCircle2, color: 'text-green-500', labelKey: 'active' },
  pending: { icon: Clock, color: 'text-amber-500', labelKey: 'pending' },
  restricted: { icon: AlertCircle, color: 'text-amber-500', labelKey: 'actionRequired' },
  not_created: { icon: AlertCircle, color: 'text-neutral-500', labelKey: 'notSetUp' },
  disabled: { icon: AlertCircle, color: 'text-red-500', labelKey: 'disabled' },
};

function StatusBadge({ status }: { status: string }) {
  const tStatus = useTranslations('billing.embedded.statusLabels');
  const config = STATUS_BADGE_CONFIG[status] || STATUS_BADGE_CONFIG.not_created;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 ${config.color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{tStatus(config.labelKey)}</span>
    </div>
  );
}

export function EmbeddedBillingDashboard({
  leagueId,
  leagueName,
  platformFeePercent,
}: EmbeddedBillingDashboardProps) {
  const t = useTranslations('billing.embedded');
  const [accountInfo, setAccountInfo] = useState<ConnectAccountInfo | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    setLoading(true);

    const accountResult = await getConnectAccountStatus(leagueId);
    if (accountResult.success) {
      setAccountInfo(accountResult.data);

      // If not connected, default to onboarding tab
      if (accountResult.data.status !== 'complete') {
        setActiveTab('setup');
      }
    } else {
      toast.error(t('failedLoadStatus'), {
        description: accountResult.error,
      });
    }

    const statsResult = await getPaymentStatistics(leagueId);
    if (statsResult.success) {
      setStats(statsResult.data);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is excluded to prevent infinite re-render loop
  }, [leagueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOnboardingComplete = useCallback(() => {
    loadData();
    setActiveTab("overview");
  }, [loadData]);

  const [creatingAccount, setCreatingAccount] = useState(false);

  const isConnected = accountInfo?.status === 'complete';
  const accountNotCreated = !accountInfo || accountInfo.status === 'not_created';
  const needsOnboarding = !accountNotCreated && (accountInfo.status === 'pending' || accountInfo.status === 'restricted');

  async function handleSetupPayments() {
    setCreatingAccount(true);
    try {
      const result = await initializeConnectAccount(leagueId);
      if (result.success) {
        toast.success(t('accountCreated'));
        await loadData();
      } else {
        toast.error(t('accountCreateFailed'), { description: result.error });
      }
    } catch {
      toast.error(t('accountCreateFailed'));
    } finally {
      setCreatingAccount(false);
    }
  }

  // Show loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="h-4 w-64 bg-neutral-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-neutral-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-neutral-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  // No Stripe account yet — show setup CTA (don't mount ConnectProvider)
  if (accountNotCreated) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-neutral-400">
              {t('managePayments', { leagueName })}
            </p>
          </div>
          <StatusBadge status="not_created" />
        </div>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">{t('connectStripe')}</CardTitle>
            <CardDescription>
              {t('connectStripeDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center py-8 space-y-4">
              <div className="p-4 rounded-full bg-emerald-500/10">
                <CreditCard className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="max-w-md space-y-2">
                <p className="text-neutral-300">{t('setupDescription')}</p>
              </div>
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSetupPayments}
                disabled={creatingAccount}
              >
                {creatingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('setupButton')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Platform Fee Notice */}
        <Card className="bg-neutral-800/50 border-neutral-700">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Percent className="h-5 w-5 text-neutral-400 mt-0.5" />
              <div className="text-sm text-neutral-400">
                <p>
                  {t('platformFeeNotice', { percent: platformFeePercent })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ConnectProvider leagueId={leagueId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-neutral-400">
              {t('managePayments', { leagueName })}
            </p>
          </div>
          {accountInfo && <StatusBadge status={accountInfo.status} />}
        </div>

        {/* Notification Banner */}
        <EmbeddedNotificationBanner />

        {/* Quick Stats - Only show if connected */}
        {isConnected && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="pt-6">
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
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="pt-6">
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
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400">{t('transactions')}</p>
                    <p className="text-2xl font-bold text-white">{stats.paymentCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="pt-6">
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
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-neutral-900 border border-neutral-800">
            {needsOnboarding && (
              <TabsTrigger value="setup" className="data-[state=active]:bg-emerald-600">
                {t('setup')}
              </TabsTrigger>
            )}
            <TabsTrigger value="overview" disabled={!isConnected}>
              {t('balance')}
            </TabsTrigger>
            <TabsTrigger value="payments" disabled={!isConnected}>
              {t('payments')}
            </TabsTrigger>
            <TabsTrigger value="payouts" disabled={!isConnected}>
              {t('payouts')}
            </TabsTrigger>
            <TabsTrigger value="settings" disabled={!isConnected}>
              {t('settings')}
            </TabsTrigger>
          </TabsList>

          {/* Setup/Onboarding Tab */}
          {needsOnboarding && (
            <TabsContent value="setup">
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="text-white">{t('connectStripe')}</CardTitle>
                  <CardDescription>
                    {t('connectStripeDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StripeErrorBoundary fallbackHeight={500}>
                    <EmbeddedOnboarding
                      onComplete={handleOnboardingComplete}
                    />
                  </StripeErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Balance/Overview Tab */}
          <TabsContent value="overview">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">{t('accountBalance')}</CardTitle>
                <CardDescription>
                  {t('accountBalanceDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StripeErrorBoundary fallbackHeight={200}>
                  <EmbeddedBalances />
                </StripeErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">{t('paymentsReceived')}</CardTitle>
                <CardDescription>
                  {t('paymentsReceivedDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <StripeErrorBoundary fallbackHeight={500}>
                  <EmbeddedPayments />
                </StripeErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">{t('payoutsTitle')}</CardTitle>
                <CardDescription>
                  {t('payoutsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <StripeErrorBoundary fallbackHeight={400}>
                  <EmbeddedPayouts />
                </StripeErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">{t('accountSettings')}</CardTitle>
                <CardDescription>
                  {t('accountSettingsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StripeErrorBoundary fallbackHeight={400}>
                  <EmbeddedAccountManagement />
                </StripeErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Platform Fee Notice */}
        <Card className="bg-neutral-800/50 border-neutral-700">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Percent className="h-5 w-5 text-neutral-400 mt-0.5" />
              <div className="text-sm text-neutral-400">
                <p>
                  {t('platformFeeNotice', { percent: platformFeePercent })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ConnectProvider>
  );
}
