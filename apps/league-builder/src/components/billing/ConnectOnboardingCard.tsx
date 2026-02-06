/**
 * Connect Onboarding Card Component
 *
 * Displays Stripe Connect onboarding status and progress.
 * Allows league admins to start/continue onboarding process.
 */

'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  startConnectOnboarding,
  getStripeDashboardLink,
} from '@/lib/actions/stripe-connect-payments';
import type { ConnectAccountInfo } from '@/lib/leagues/stripe-connect';

interface ConnectOnboardingCardProps {
  leagueId: string;
  accountInfo: ConnectAccountInfo;
  onStatusChange?: () => void;
}

const STATUS_CONFIG = {
  not_created: {
    label: 'Not Started',
    variant: 'outline' as const,
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900',
    borderColor: 'border-gray-200 dark:border-gray-800',
  },
  pending: {
    label: 'Pending',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  restricted: {
    label: 'Action Required',
    variant: 'destructive' as const,
    icon: AlertCircle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  complete: {
    label: 'Complete',
    variant: 'default' as const,
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  disabled: {
    label: 'Disabled',
    variant: 'destructive' as const,
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
};

export function ConnectOnboardingCard({
  leagueId,
  accountInfo,
  onStatusChange,
}: ConnectOnboardingCardProps) {
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const statusConfig = STATUS_CONFIG[accountInfo.status];
  const StatusIcon = statusConfig.icon;

  async function handleStartOnboarding() {
    setLoading(true);

    const returnUrl = `${window.location.origin}/dashboard/leagues/${leagueId}/billing?onboarding=complete`;
    const refreshUrl = `${window.location.origin}/dashboard/leagues/${leagueId}/billing?onboarding=refresh`;

    const result = await startConnectOnboarding(leagueId, returnUrl, refreshUrl);

    if (result.success) {
      window.location.href = result.data.url;
    } else {
      toast.error('Failed to start onboarding', {
        description: result.error,
      });
      setLoading(false);
    }
  }

  async function handleOpenDashboard() {
    setDashboardLoading(true);

    const result = await getStripeDashboardLink(leagueId);

    if (result.success) {
      window.open(result.data.url, '_blank');
    } else {
      toast.error('Failed to open Stripe dashboard', {
        description: result.error,
      });
    }

    setDashboardLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Setup</CardTitle>
            <CardDescription>
              Connect your Stripe account to accept payments
            </CardDescription>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div
          className={`rounded-lg border p-4 ${statusConfig.bgColor} ${statusConfig.borderColor}`}
        >
          <div className="flex items-start gap-3">
            <StatusIcon className={`h-5 w-5 mt-0.5 ${statusConfig.color}`} />
            <div className="flex-1">
              {accountInfo.status === 'not_created' && (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Set up payments for your league
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Connect your Stripe account to accept registration fees, game payments,
                    and more directly through your league portal.
                  </p>
                </>
              )}

              {accountInfo.status === 'pending' && (
                <>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Complete your account setup
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Your Stripe account is being reviewed. Continue onboarding to provide
                    any remaining information.
                  </p>
                </>
              )}

              {accountInfo.status === 'restricted' && (
                <>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Action required
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Stripe needs additional information to enable your account.
                    Please complete the required steps.
                  </p>
                  {accountInfo.requirements?.currentlyDue &&
                    accountInfo.requirements.currentlyDue.length > 0 && (
                      <ul className="mt-2 text-xs text-orange-600 dark:text-orange-400 list-disc list-inside">
                        {accountInfo.requirements.currentlyDue.slice(0, 3).map((req) => (
                          <li key={req}>{req.replace(/_/g, ' ')}</li>
                        ))}
                        {accountInfo.requirements.currentlyDue.length > 3 && (
                          <li>
                            +{accountInfo.requirements.currentlyDue.length - 3} more items
                          </li>
                        )}
                      </ul>
                    )}
                </>
              )}

              {accountInfo.status === 'complete' && (
                <>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Ready to accept payments
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your Stripe account is fully configured. You can now accept payments
                    from players and teams.
                  </p>
                </>
              )}

              {accountInfo.status === 'disabled' && (
                <>
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Account disabled
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Your Stripe account has been disabled. Please contact support for
                    assistance.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Capabilities Status */}
        {accountInfo.accountId && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2">
              {accountInfo.chargesEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Accept Payments
              </span>
            </div>
            <div className="flex items-center gap-2">
              {accountInfo.payoutsEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Receive Payouts
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {accountInfo.status !== 'complete' && accountInfo.status !== 'disabled' && (
            <Button onClick={handleStartOnboarding} disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accountInfo.status === 'not_created'
                ? 'Start Setup'
                : 'Continue Setup'}
            </Button>
          )}

          {accountInfo.accountId && accountInfo.status !== 'disabled' && (
            <Button
              variant="outline"
              onClick={handleOpenDashboard}
              disabled={dashboardLoading}
            >
              {dashboardLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Stripe Dashboard
            </Button>
          )}
        </div>

        {/* Platform Fee Notice */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          A 2.99% platform fee applies to all transactions
        </p>
      </CardContent>
    </Card>
  );
}
