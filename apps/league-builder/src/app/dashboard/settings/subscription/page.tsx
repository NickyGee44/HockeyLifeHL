/**
 * Subscription Management Page
 *
 * Main page for managing organization subscription: view current plan, upgrade/downgrade,
 * view billing history, and cancel subscription.
 */

'use client';

import { useEffect, useState } from 'react';
import { getCurrentSubscription } from '@/lib/actions/subscription';
import type { OrganizationSubscription } from '@/lib/types/subscription';
import { SubscriptionOverview } from '@/components/subscription/subscription-overview';
import { SubscriptionPlans } from '@/components/subscription/subscription-plans';
import { BillingHistory } from '@/components/subscription/billing-history';
import {
  CancelSubscriptionDialog,
  ReactivateSubscription,
} from '@/components/subscription/cancel-subscription-dialog';
import { Button } from '@hockey-life/ui';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="container max-w-6xl py-8">
        <h1 className="text-3xl font-bold mb-6">Subscription</h1>
        <div className="space-y-6">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="container max-w-6xl py-8">
        <h1 className="text-3xl font-bold mb-6">Subscription</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
                No Subscription Found
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You don't have an active subscription. Please contact support to set up your
                organization's subscription.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription, billing, and payment methods
        </p>
      </div>

      <div className="space-y-8">
        {/* Subscription Overview */}
        <SubscriptionOverview />

        {/* Reactivation Banner (if subscription is cancelled) */}
        {subscription.cancelAtPeriodEnd && (
          <ReactivateSubscription onReactivated={loadSubscription} />
        )}

        {/* Subscription Plans */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Choose the plan that best fits your organization's needs. You can upgrade or
            downgrade at any time.
          </p>
          <SubscriptionPlans
            currentTier={subscription.tier}
            onPlanChanged={loadSubscription}
          />
        </section>

        {/* Billing History */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Billing History</h2>
          <BillingHistory />
        </section>

        {/* Danger Zone */}
        {!subscription.cancelAtPeriodEnd &&
          subscription.status !== 'canceled' && (
            <section className="border-t pt-8">
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  Danger Zone
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  Once you cancel your subscription, you will lose access to premium features.
                  This action can be undone before the end of your billing period.
                </p>
                <CancelSubscriptionDialog
                  onCancelled={loadSubscription}
                  trigger={
                    <Button variant="destructive">Cancel Subscription</Button>
                  }
                />
              </div>
            </section>
          )}
      </div>
    </div>
  );
}
