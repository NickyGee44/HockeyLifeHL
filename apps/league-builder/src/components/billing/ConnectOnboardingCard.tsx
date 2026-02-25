/**
 * Connect Onboarding Card Component
 *
 * Displays Stripe Connect onboarding status and progress.
 * Allows league admins to start/continue onboarding process.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
    labelKey: 'notStarted',
    variant: 'outline' as const,
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900',
    borderColor: 'border-gray-200 dark:border-gray-800',
  },
  pending: {
    labelKey: 'pending',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  restricted: {
    labelKey: 'actionRequired',
    variant: 'destructive' as const,
    icon: AlertCircle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  complete: {
    labelKey: 'complete',
    variant: 'default' as const,
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  disabled: {
    labelKey: 'disabled',
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
}: ConnectOnboardingCardProps) {
  const t = useTranslations('billing.connect');
  const tStatus = useTranslations('billing.connect.status');
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const statusConfig = STATUS_CONFIG[accountInfo.status];
  const StatusIcon = statusConfig.icon;

  async function handleStartOnboarding() {
    setLoading(true);

    // Use current pathname to preserve locale prefix
    const basePath = window.location.pathname.replace(/\?.*$/, '');
    const returnUrl = `${window.location.origin}${basePath}?onboarding=complete`;
    const refreshUrl = `${window.location.origin}${basePath}?onboarding=refresh`;

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
            <CardTitle>{t('paymentSetup')}</CardTitle>
            <CardDescription>
              {t('connectStripeDesc')}
            </CardDescription>
          </div>
          <Badge variant={statusConfig.variant}>{tStatus(statusConfig.labelKey)}</Badge>
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
                    {t('setupPayments')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('setupPaymentsDesc')}
                  </p>
                </>
              )}

              {accountInfo.status === 'pending' && (
                <>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    {t('completeSetup')}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {t('completeSetupDesc')}
                  </p>
                </>
              )}

              {accountInfo.status === 'restricted' && (
                <>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    {t('actionRequired')}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    {t('actionRequiredDesc')}
                  </p>
                  {accountInfo.requirements?.currentlyDue &&
                    accountInfo.requirements.currentlyDue.length > 0 && (
                      <ul className="mt-2 text-xs text-orange-600 dark:text-orange-400 list-disc list-inside">
                        {accountInfo.requirements.currentlyDue.slice(0, 3).map((req) => (
                          <li key={req}>{req.replace(/_/g, ' ')}</li>
                        ))}
                        {accountInfo.requirements.currentlyDue.length > 3 && (
                          <li>
                            {t('moreItems', { count: accountInfo.requirements.currentlyDue.length - 3 })}
                          </li>
                        )}
                      </ul>
                    )}
                </>
              )}

              {accountInfo.status === 'complete' && (
                <>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    {t('readyToAccept')}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {t('readyToAcceptDesc')}
                  </p>
                </>
              )}

              {accountInfo.status === 'disabled' && (
                <>
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    {t('accountDisabled')}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {t('accountDisabledDesc')}
                  </p>
                  <a
                    href="https://support.stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-red-700 dark:text-red-300 underline hover:no-underline"
                  >
                    Contact Stripe Support
                    <ExternalLink className="h-3 w-3" />
                  </a>
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
                {t('acceptPayments')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {accountInfo.payoutsEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('receivePayouts')}
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
                ? t('startSetup')
                : t('continueSetup')}
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
              {t('stripeDashboard')}
            </Button>
          )}
        </div>

        {/* Platform Fee Notice */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          {t('platformFeeNotice')}
        </p>
      </CardContent>
    </Card>
  );
}
