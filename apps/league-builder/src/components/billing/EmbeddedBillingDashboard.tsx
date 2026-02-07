/**
 * Embedded Billing Dashboard Component
 *
 * Uses Stripe Connect embedded components for a fully integrated
 * payment management experience without leaving the app.
 */

'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Wallet, Settings, Percent, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ConnectProvider,
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

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    complete: { icon: CheckCircle2, color: 'text-green-500', label: 'Active' },
    pending: { icon: Clock, color: 'text-amber-500', label: 'Pending' },
    restricted: { icon: AlertCircle, color: 'text-amber-500', label: 'Action Required' },
    not_created: { icon: AlertCircle, color: 'text-neutral-500', label: 'Not Set Up' },
    disabled: { icon: AlertCircle, color: 'text-red-500', label: 'Disabled' },
  };

  const config = statusConfig[status] || statusConfig.not_created;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 ${config.color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}

export function EmbeddedBillingDashboard({
  leagueId,
  leagueName,
  platformFeePercent,
}: EmbeddedBillingDashboardProps) {
  const [accountInfo, setAccountInfo] = useState<ConnectAccountInfo | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  async function loadData() {
    setLoading(true);

    const accountResult = await getConnectAccountStatus(leagueId);
    if (accountResult.success) {
      setAccountInfo(accountResult.data);

      // If not connected, default to onboarding tab
      if (accountResult.data.status !== 'complete') {
        setActiveTab('setup');
      }
    } else {
      toast.error('Failed to load account status', {
        description: accountResult.error,
      });
    }

    const statsResult = await getPaymentStatistics(leagueId);
    if (statsResult.success) {
      setStats(statsResult.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [leagueId]);

  const isConnected = accountInfo?.status === 'complete';
  const needsOnboarding = !accountInfo || accountInfo.status === 'not_created' || accountInfo.status === 'pending' || accountInfo.status === 'restricted';

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

  return (
    <ConnectProvider leagueId={leagueId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Payments & Billing</h1>
            <p className="text-neutral-400">
              Manage payments and payouts for {leagueName}
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
                    <p className="text-sm text-neutral-400">Total Revenue</p>
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
                    <p className="text-sm text-neutral-400">Net Earnings</p>
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
                    <p className="text-sm text-neutral-400">Transactions</p>
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
                    <p className="text-sm text-neutral-400">Platform Fees</p>
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
                Setup
              </TabsTrigger>
            )}
            <TabsTrigger value="overview" disabled={!isConnected}>
              Balance
            </TabsTrigger>
            <TabsTrigger value="payments" disabled={!isConnected}>
              Payments
            </TabsTrigger>
            <TabsTrigger value="payouts" disabled={!isConnected}>
              Payouts
            </TabsTrigger>
            <TabsTrigger value="settings" disabled={!isConnected}>
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Setup/Onboarding Tab */}
          {needsOnboarding && (
            <TabsContent value="setup">
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="text-white">Connect Your Stripe Account</CardTitle>
                  <CardDescription>
                    Complete your Stripe account setup to start accepting payments from players and teams.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmbeddedOnboarding
                    onComplete={() => {
                      loadData();
                      setActiveTab('overview');
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Balance/Overview Tab */}
          <TabsContent value="overview">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">Account Balance</CardTitle>
                <CardDescription>
                  Your current balance and available funds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmbeddedBalances />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">Payments Received</CardTitle>
                <CardDescription>
                  View and manage all payments from players and teams
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <EmbeddedPayments />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">Payouts</CardTitle>
                <CardDescription>
                  Track payouts to your bank account
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <EmbeddedPayouts />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">Account Settings</CardTitle>
                <CardDescription>
                  Manage your Stripe account settings, payout schedule, and more
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmbeddedAccountManagement />
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
                  A <span className="text-white font-medium">{platformFeePercent}%</span> platform fee
                  is applied to all transactions. This fee covers payment processing, platform hosting,
                  and support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ConnectProvider>
  );
}
