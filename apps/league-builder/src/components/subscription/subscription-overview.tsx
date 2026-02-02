/**
 * Subscription Overview Component
 *
 * Displays current subscription tier, status, billing cycle, and payment method.
 * Provides quick actions: Upgrade, Manage Billing, Cancel
 */

'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { getCurrentSubscription } from '@/lib/actions/subscription';
import { createBillingPortalSession } from '@/lib/actions/subscription';
import type { OrganizationSubscription } from '@/lib/types/subscription';
import { SUBSCRIPTION_TIERS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/types/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function SubscriptionOverview() {
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    setLoading(true);
    const result = await getCurrentSubscription();

    if (result.success) {
      setSubscription(result.data);
    } else {
      toast.error('Failed to load subscription', {
        description: result.error,
      });
    }

    setLoading(false);
  }

  async function handleManageBilling() {
    setRedirecting(true);

    const returnUrl = `${window.location.origin}/dashboard/settings/subscription`;
    const result = await createBillingPortalSession(returnUrl);

    if (result.success) {
      window.location.href = result.data.url;
    } else {
      toast.error('Failed to open billing portal', {
        description: result.error,
      });
      setRedirecting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Loading subscription details...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>No subscription found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tierInfo = SUBSCRIPTION_TIERS[subscription.tier];
  const statusLabel = SUBSCRIPTION_STATUS_LABELS[subscription.status];

  // Calculate days remaining in trial
  const trialDaysRemaining = subscription.trialEndsAt
    ? Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Manage your subscription and billing</CardDescription>
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
            <h3 className="text-sm font-medium text-muted-foreground">Current Plan</h3>
            <div className="text-right">
              <p className="text-2xl font-bold">{tierInfo.name}</p>
              {subscription.tier !== 'enterprise' && (
                <p className="text-sm text-muted-foreground">
                  ${tierInfo.price}/{tierInfo.interval}
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
                  Trial Period
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {trialDaysRemaining > 0 ? (
                    <>
                      {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
                      in your free trial
                    </>
                  ) : (
                    'Your trial ends today'
                  )}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Ends {format(subscription.trialEndsAt, 'MMMM d, yyyy')}
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
                  Subscription Ending
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Your subscription will end on{' '}
                  {format(subscription.currentPeriodEnd, 'MMMM d, yyyy')}
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
                  Payment Failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Please update your payment method to continue your subscription
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-2"
                  onClick={handleManageBilling}
                  disabled={redirecting}
                >
                  Update Payment Method
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
              <p className="text-sm font-medium">Next Billing Date</p>
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
              <p className="text-sm font-medium">Payment Method</p>
              <p className="text-sm text-muted-foreground">
                {subscription.paymentMethodBrand?.toUpperCase()} ending in{' '}
                {subscription.paymentMethodLast4}
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
            {redirecting ? 'Redirecting...' : 'Manage Billing'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
