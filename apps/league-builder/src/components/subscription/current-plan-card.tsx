/**
 * Current Plan Card Component
 *
 * Displays current subscription tier, status, billing cycle, and payment method.
 * Provides actions: Upgrade, Manage Billing, Cancel
 */

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  X,
} from 'lucide-react';
import type { OrganizationSubscription } from '@/lib/types/subscription';
import { SUBSCRIPTION_TIERS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/types/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  createBillingPortalSession,
  cancelSubscription,
  reactivateSubscription,
} from '@/lib/actions/subscription';

interface CurrentPlanCardProps {
  subscription: OrganizationSubscription;
  onUpgradeClick: () => void;
  onRefresh: () => void;
}

export function CurrentPlanCard({
  subscription,
  onUpgradeClick,
  onRefresh,
}: CurrentPlanCardProps) {
  const [redirecting, setRedirecting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [currentTime] = useState(() => Date.now());

  const tierInfo = SUBSCRIPTION_TIERS[subscription.tier];
  const statusLabel = SUBSCRIPTION_STATUS_LABELS[subscription.status];

  // Calculate days remaining in trial
  const trialDaysRemaining = subscription.trialEndsAt
    ? Math.ceil((subscription.trialEndsAt.getTime() - currentTime) / (1000 * 60 * 60 * 24))
    : 0;

  async function handleManageBilling() {
    setRedirecting(true);

    const returnUrl = `${window.location.origin}/dashboard/settings/billing`;
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

  async function handleCancelSubscription() {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? It will remain active until the end of your billing period.'
      )
    ) {
      return;
    }

    setCanceling(true);

    const result = await cancelSubscription(false);

    if (result.success) {
      toast.success('Subscription cancelled', {
        description: `Your subscription will end on ${format(result.data.effectiveDate, 'MMMM d, yyyy')}`,
      });
      onRefresh();
    } else {
      toast.error('Failed to cancel subscription', {
        description: result.error,
      });
    }

    setCanceling(false);
  }

  async function handleReactivateSubscription() {
    setReactivating(true);

    const result = await reactivateSubscription();

    if (result.success) {
      toast.success('Subscription reactivated', {
        description: 'Your subscription will continue as normal',
      });
      onRefresh();
    } else {
      toast.error('Failed to reactivate subscription', {
        description: result.error,
      });
    }

    setReactivating(false);
  }

  return (
    <Card className="bg-neutral-800/50 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-neutral-100">Current Subscription</CardTitle>
            <CardDescription className="text-neutral-400">
              Manage your subscription and billing
            </CardDescription>
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
            className={
              subscription.status === 'active'
                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                : subscription.status === 'trialing'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : subscription.status === 'past_due'
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : ''
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
            <h3 className="text-sm font-medium text-neutral-400">Current Plan</h3>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-100">{tierInfo.name}</p>
              {tierInfo.price > 0 && (
                <p className="text-sm text-neutral-400">
                  ${tierInfo.price.toFixed(2)}/{tierInfo.interval}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Trial Info */}
        {subscription.status === 'trialing' && subscription.trialEndsAt && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-300">Trial Period</p>
                <p className="text-sm text-blue-200 mt-1">
                  {trialDaysRemaining > 0 ? (
                    <>
                      {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining in
                      your free trial
                    </>
                  ) : (
                    'Your trial ends today'
                  )}
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  Ends {format(subscription.trialEndsAt, 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-300">Subscription Ending</p>
                <p className="text-sm text-amber-200 mt-1">
                  Your subscription will end on{' '}
                  {format(subscription.currentPeriodEnd, 'MMMM d, yyyy')}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  onClick={handleReactivateSubscription}
                  disabled={reactivating}
                >
                  {reactivating ? 'Reactivating...' : 'Reactivate Subscription'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Past Due Warning */}
        {subscription.status === 'past_due' && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">Payment Failed</p>
                <p className="text-sm text-red-200 mt-1">
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
            <Calendar className="h-5 w-5 text-neutral-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neutral-200">Next Billing Date</p>
              <p className="text-sm text-neutral-400">
                {format(subscription.currentPeriodEnd, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        )}

        {/* Payment Method */}
        {subscription.paymentMethodLast4 && (
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-neutral-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neutral-200">Payment Method</p>
              <p className="text-sm text-neutral-400">
                {subscription.paymentMethodBrand?.toUpperCase()} ending in{' '}
                {subscription.paymentMethodLast4}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
          <div className="flex gap-3">
            {subscription.tier === 'free' && (
              <Button
                onClick={onUpgradeClick}
                className="flex-1 bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={redirecting}
              className="flex-1 border-white/10 text-neutral-200 hover:bg-white/5"
            >
              {redirecting ? 'Redirecting...' : 'Manage Billing'}
            </Button>
          </div>

          {subscription.stripeSubscriptionId &&
            subscription.status === 'active' &&
            !subscription.cancelAtPeriodEnd && (
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <X className="h-4 w-4 mr-2" />
                {canceling ? 'Canceling...' : 'Cancel Subscription'}
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
