/**
 * League Billing Dashboard Component
 *
 * Main dashboard for league billing management.
 * Shows Connect onboarding, balance, payments, and statistics.
 */

'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Receipt, Percent, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ConnectOnboardingCard } from './ConnectOnboardingCard';
import { PayoutInfoCard } from './PayoutInfoCard';
import { PaymentHistoryTable } from './PaymentHistoryTable';
import {
  getConnectAccountStatus,
  getPaymentStatistics,
} from '@/lib/actions/stripe-connect-payments';
import type { ConnectAccountInfo } from '@/lib/leagues/stripe-connect';

interface LeagueBillingDashboardProps {
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

export function LeagueBillingDashboard({
  leagueId,
  leagueName,
  platformFeePercent,
}: LeagueBillingDashboardProps) {
  const [accountInfo, setAccountInfo] = useState<ConnectAccountInfo | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);

    // Load account status
    const accountResult = await getConnectAccountStatus(leagueId);
    if (accountResult.success) {
      setAccountInfo(accountResult.data);
    } else {
      toast.error('Failed to load account status', {
        description: accountResult.error,
      });
    }

    // Load payment statistics
    const statsResult = await getPaymentStatistics(leagueId);
    if (statsResult.success) {
      setStats(statsResult.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
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
          <CardTitle>Billing</CardTitle>
          <CardDescription>Unable to load billing information</CardDescription>
        </CardHeader>
        <CardContent>
          <button onClick={loadData} className="text-primary hover:underline">
            Try again
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
          League Billing
        </h1>
        <p className="text-muted-foreground">
          Manage payments and payouts for {leagueName}
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
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
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
                  <p className="text-sm text-muted-foreground">Net Earnings</p>
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
                  <p className="text-sm text-muted-foreground">Transactions</p>
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
                  <p className="text-sm text-muted-foreground">Platform Fees</p>
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

      {/* Platform Fee Notice */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Percent className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              A {platformFeePercent}% platform fee is applied to all transactions.
              This fee is separate from Stripe&apos;s card processing fees.
              You can configure whether this fee is passed to players or absorbed by the league in your billing settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
