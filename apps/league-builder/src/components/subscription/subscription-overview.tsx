/**
 * Subscription Overview Component
 *
 * Displays current subscription tier, status, billing cycle, and payment method.
 * Provides quick actions: Upgrade, Manage Billing, Cancel
 */

'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, Calendar, AlertCircle, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getCurrentSubscription } from '@/lib/actions/subscription';
import { createBillingPortalSession } from '@/lib/actions/subscription';
import type { OrganizationSubscription } from '@/lib/types/subscription';
import { SUBSCRIPTION_TIERS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/types/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SubscriptionOverviewProps {
  platformFeePercent?: number;
}

export function SubscriptionOverview({ platformFeePercent = 2.99 }: SubscriptionOverviewProps) {
  const t = useTranslations('subscription');
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [currentTime] = useState(() => Date.now());

  async function loadSubscription() {
    setLoading(true);
    const result = await getCurrentSubscription();

    if (result.success) {
      setSubscription(result.data);
    } else {
      toast.error(t('failedLoadSubscription'), {
        description: result.error });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: loadSubscription uses t() for error messages but t is a stable ref from next-intl
  }, []);

  async function handleManageBilling() {
    setRedirecting(true);

    const returnUrl = `${window.location.origin}/dashboard/settings/billing`;
    const result = await createBillingPortalSession(returnUrl);

    if (result.success) {
      window.location.href = result.data.url;
    } else {
      toast.error(t('failedOpenPortal'), {
        description: result.error });
      setRedirecting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('loadingDetails')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('noSubscription')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tierInfo = SUBSCRIPTION_TIERS[subscription.tier];
  const statusLabel = SUBSCRIPTION_STATUS_LABELS[subscription.status];

  // Calculate days remaining in trial
  const trialDaysRemaining = subscription.trialEndsAt
    ? Math.ceil((subscription.trialEndsAt.getTime() - currentTime) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Badge
            variant={
              subscription.status === 'active'
                ? 'default'
                : subscription.status === 'trialing'
                ? 'secondary'
                : subscription.status === 'past_due'
                ? 'destructive'
                : 'outline'
            }
          >
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('currentPlan')}</h3>
            <div className="text-right">
              <p className="text-2xl font-bold">{tierInfo.name}</p>
              {subscription.tier === 'free' && (
                <p className="text-sm text-muted-foreground">
                  {t('transactionFee', { percent: platformFeePercent })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Trial Info */}
        {subscription.status === 'trialing' && subscription.trialEndsAt && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {t('trialPeriod')}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {trialDaysRemaining > 0 ? (
                    t('trialDaysRemaining', { count: trialDaysRemaining })
                  ) : (
                    t('trialEndsToday')
                  )}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {t('trialEnds', { date: format(subscription.trialEndsAt, 'MMMM d, yyyy') })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {t('subscriptionEnding')}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {t('subscriptionEndDate', { date: format(subscription.currentPeriodEnd, 'MMMM d, yyyy') })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Past Due Warning */}
        {subscription.status === 'past_due' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  {t('paymentFailed')}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {t('updatePaymentDesc')}
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-2"
                  onClick={handleManageBilling}
                  disabled={redirecting}
                >
                  {t('updatePaymentMethod')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Cycle */}
        {subscription.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t('nextBillingDate')}</p>
              <p className="text-sm text-muted-foreground">
                {format(subscription.currentPeriodEnd, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        )}

        {/* Payment Method */}
        {subscription.paymentMethodLast4 && (
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t('paymentMethod')}</p>
              <p className="text-sm text-muted-foreground">
                {t('cardEndingIn', { brand: subscription.paymentMethodBrand?.toUpperCase() || '', last4: subscription.paymentMethodLast4 })}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleManageBilling}
            disabled={redirecting}
            className="flex-1"
          >
            {redirecting ? t('redirecting') : t('manageBilling')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
