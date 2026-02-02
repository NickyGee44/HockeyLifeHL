/**
 * Payout Info Card Component
 *
 * Displays balance and payout information for a league's Connect account.
 */

'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DollarSign, ArrowUpRight, Clock, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getLeaguePayoutInfo } from '@/lib/actions/stripe-connect-payments';
import type { PayoutInfo } from '@/lib/leagues/stripe-connect';

interface PayoutInfoCardProps {
  leagueId: string;
  isConnected: boolean;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

const PAYOUT_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_transit: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export function PayoutInfoCard({ leagueId, isConnected }: PayoutInfoCardProps) {
  const [payoutInfo, setPayoutInfo] = useState<PayoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadPayoutInfo();
    } else {
      setLoading(false);
    }
  }, [leagueId, isConnected]);

  async function loadPayoutInfo() {
    const result = await getLeaguePayoutInfo(leagueId);

    if (result.success) {
      setPayoutInfo(result.data);
    }

    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadPayoutInfo();
    setRefreshing(false);
    toast.success('Balance updated');
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance & Payouts</CardTitle>
          <CardDescription>
            Complete payment setup to view your balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Set up payments to start tracking your earnings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance & Payouts</CardTitle>
          <CardDescription>Loading balance information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payoutInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance & Payouts</CardTitle>
          <CardDescription>Unable to load balance information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Balance & Payouts</CardTitle>
            <CardDescription>Your earnings and payout schedule</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Available
              </span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(payoutInfo.availableBalance)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Ready for payout
            </p>
          </div>

          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Pending
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(payoutInfo.pendingBalance)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Processing
            </p>
          </div>
        </div>

        {/* Payout Schedule */}
        <div className="flex items-start gap-3 pt-2">
          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">Payout Schedule</p>
            <p className="text-sm text-muted-foreground">
              {payoutInfo.payoutSchedule.interval === 'daily'
                ? 'Daily'
                : payoutInfo.payoutSchedule.interval === 'weekly'
                ? 'Weekly'
                : 'Monthly'}{' '}
              payouts with {payoutInfo.payoutSchedule.delayDays}-day delay
            </p>
          </div>
        </div>

        {/* Recent Payouts */}
        {payoutInfo.recentPayouts.length > 0 && (
          <div className="pt-2">
            <h4 className="text-sm font-medium mb-3">Recent Payouts</h4>
            <div className="space-y-2">
              {payoutInfo.recentPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {formatCurrency(payout.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(payout.arrivalDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={PAYOUT_STATUS_COLORS[payout.status] || ''}
                  >
                    {payout.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {payoutInfo.recentPayouts.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No payouts yet. Start accepting payments to see your payouts here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
