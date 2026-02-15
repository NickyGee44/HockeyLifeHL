/**
 * Embedded Billing Dashboard Component
 *
 * Uses Stripe Connect embedded components for a fully integrated
 * payment management experience without leaving the app.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, CreditCard, Wallet, Percent, AlertCircle, CheckCircle2, Clock, Loader2, ShieldCheck, Banknote } from 'lucide-react';
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

/** 3-step visual process indicator */
function SetupSteps({ activeStep }: { activeStep: 0 | 1 | 2 }) {
  const tSteps = useTranslations('billing.embedded.steps');

  const steps = [
    { icon: CreditCard, name: tSteps('createAccount'), desc: tSteps('createAccountDesc') },
    { icon: ShieldCheck, name: tSteps('verifyIdentity'), desc: tSteps('verifyIdentityDesc') },
    { icon: Banknote, name: tSteps('startAccepting'), desc: tSteps('startAcceptingDesc') },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
      {steps.map((step, i) => {
        const StepIcon = step.icon;
        const isActive = i === activeStep;
        const isComplete = i < activeStep;

        return (
          <div
            key={i}
            className={`relative flex flex-col items-center text-center gap-2 p-4 rounded-xl border transition-all ${
              isComplete
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : isActive
                  ? 'border-rink-500/30 bg-rink-500/5'
                  : 'border-white/5 bg-white/[0.02]'
            }`}
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                isComplete
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isActive
                    ? 'bg-rink-500/20 text-rink-400'
                    : 'bg-white/[0.06] text-neutral-500'
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <StepIcon className="h-5 w-5" />
              )}
            </div>
            <p className={`text-sm font-medium ${isComplete ? 'text-emerald-400' : isActive ? 'text-white' : 'text-neutral-500'}`}>
              {step.name}
            </p>
            <p className="text-xs text-neutral-500">{step.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Platform fee info row */
function PlatformFeeNotice({ platformFeePercent }: { platformFeePercent: number }) {
  const t = useTranslations('billing.embedded');
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl py-3 px-4">
      <div className="flex items-start gap-3">
        <Percent className="h-4 w-4 text-neutral-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-neutral-500">
          {t('platformFeeNotice', { percent: platformFeePercent })}
        </p>
      </div>
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    }

    const accountResult = await getConnectAccountStatus(leagueId);
    if (accountResult.success) {
      setAccountInfo(accountResult.data);
    } else {
      toast.error(t('failedLoadStatus'), {
        description: accountResult.error,
      });
    }

    const statsResult = await getPaymentStatistics(leagueId);
    if (statsResult.success) {
      setStats(statsResult.data);
    }

    if (isInitial) {
      setInitialLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is excluded to prevent infinite re-render loop
  }, [leagueId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const handleOnboardingComplete = useCallback(() => {
    loadData();
    setActiveTab("overview");
  }, [loadData]);

  const [creatingAccount, setCreatingAccount] = useState(false);

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

  // Loading skeleton
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/[0.06] rounded animate-pulse" />
        <div className="h-4 w-64 bg-white/[0.06] rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/[0.04] border border-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-white/[0.04] border border-white/10 rounded-xl animate-pulse" />
      </div>
    );
  }

  // ── State A: No Stripe account — hero with 3-step process ──
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

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-rink-500/10 via-arena-500/5 to-transparent p-8 sm:p-10">
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-rink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

          <div className="relative flex flex-col items-center text-center gap-6">
            <div className="p-4 rounded-full bg-emerald-500/10">
              <CreditCard className="h-10 w-10 text-emerald-500" />
            </div>

            <div className="max-w-lg space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">{t('heroTitle')}</h2>
              <p className="text-neutral-400">{t('heroDescription')}</p>
            </div>

            {/* 3-step indicator */}
            <SetupSteps activeStep={0} />

            <Button
              size="lg"
              className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold hover:shadow-lg hover:shadow-rink-500/20 hover:scale-[1.02] transition-all"
              onClick={handleSetupPayments}
              disabled={creatingAccount}
            >
              {creatingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('setupButton')}
            </Button>
          </div>
        </div>

        <PlatformFeeNotice platformFeePercent={platformFeePercent} />
      </div>
    );
  }

  // ── State B: Needs onboarding — progress + embedded Stripe ──
  if (needsOnboarding) {
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
            <StatusBadge status={accountInfo.status} />
          </div>

          {/* Progress indicator */}
          <SetupSteps activeStep={1} />

          {/* Amber onboarding alert */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent p-4">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-400">{t('finishOnboardingTitle')}</p>
              <p className="text-sm text-amber-400/70 mt-1">{t('finishOnboardingDesc')}</p>
            </div>
          </div>

          {/* Embedded onboarding in glassmorphism card */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <h3 className="text-lg font-semibold text-white">{t('connectStripe')}</h3>
              <p className="text-sm text-neutral-400 mt-1">{t('connectStripeDesc')}</p>
            </div>
            <div className="p-6 pt-4">
              <StripeErrorBoundary fallbackHeight={500}>
                <EmbeddedOnboarding onComplete={handleOnboardingComplete} />
              </StripeErrorBoundary>
            </div>
          </div>

          <PlatformFeeNotice platformFeePercent={platformFeePercent} />
        </div>
      </ConnectProvider>
    );
  }

  // ── State C: Fully connected dashboard ──
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

        {/* Quick Stats */}
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/[0.04] border border-white/10">
            <TabsTrigger value="overview">{t('balance')}</TabsTrigger>
            <TabsTrigger value="payments">{t('payments')}</TabsTrigger>
            <TabsTrigger value="payouts">{t('payouts')}</TabsTrigger>
            <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-lg font-semibold text-white">{t('accountBalance')}</h3>
                <p className="text-sm text-neutral-400 mt-1">{t('accountBalanceDesc')}</p>
              </div>
              <div className="p-6 pt-4">
                <StripeErrorBoundary fallbackHeight={200}>
                  <EmbeddedBalances />
                </StripeErrorBoundary>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-lg font-semibold text-white">{t('paymentsReceived')}</h3>
                <p className="text-sm text-neutral-400 mt-1">{t('paymentsReceivedDesc')}</p>
              </div>
              <div>
                <StripeErrorBoundary fallbackHeight={500}>
                  <EmbeddedPayments />
                </StripeErrorBoundary>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payouts">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-lg font-semibold text-white">{t('payoutsTitle')}</h3>
                <p className="text-sm text-neutral-400 mt-1">{t('payoutsDesc')}</p>
              </div>
              <div>
                <StripeErrorBoundary fallbackHeight={400}>
                  <EmbeddedPayouts />
                </StripeErrorBoundary>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-lg font-semibold text-white">{t('accountSettings')}</h3>
                <p className="text-sm text-neutral-400 mt-1">{t('accountSettingsDesc')}</p>
              </div>
              <div className="p-6 pt-4">
                <StripeErrorBoundary fallbackHeight={400}>
                  <EmbeddedAccountManagement />
                </StripeErrorBoundary>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <PlatformFeeNotice platformFeePercent={platformFeePercent} />
      </div>
    </ConnectProvider>
  );
}
