/**
 * Subscription Manager Component
 *
 * Allows league owners to:
 * - Subscribe to platform plans
 * - Manage their subscription via billing portal
 * - View subscription status
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, ExternalLink, CheckCircle2 } from 'lucide-react';

interface SubscriptionManagerProps {
  leagueId: string;
  hasSubscription?: boolean;
  currentPlan?: string;
}

export function SubscriptionManager({
  leagueId,
  hasSubscription = false,
  currentPlan = 'Free',
}: SubscriptionManagerProps) {
  const [subscribing, setSubscribing] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start subscription checkout
   */
  async function handleSubscribe() {
    try {
      setSubscribing(true);
      setError(null);

      const response = await fetch('/api/stripe/connect/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription checkout');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }

    } catch (err) {
      console.error('Error creating subscription checkout:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setSubscribing(false);
    }
  }

  /**
   * Open billing portal
   */
  async function handleManageBilling() {
    try {
      setOpeningPortal(true);
      setError(null);

      const response = await fetch('/api/stripe/connect/create-billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      // Redirect to Stripe Billing Portal
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }

    } catch (err) {
      console.error('Error opening billing portal:', err);
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setOpeningPortal(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Subscription</CardTitle>
        <CardDescription>
          Manage your league's subscription to the HockeyLifeHL platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Plan</span>
            <span className="text-lg font-bold text-primary">{currentPlan}</span>
          </div>

          {hasSubscription && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Active subscription
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!hasSubscription ? (
            <>
              {/* Subscribe Button */}
              <Button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="w-full"
                size="lg"
              >
                {subscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CreditCard className="mr-2 h-4 w-4" />
                Subscribe to Pro Plan
              </Button>

              {/* Plan Details */}
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium mb-2">Pro Plan includes:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Unlimited players and teams</li>
                  <li>• Advanced statistics and analytics</li>
                  <li>• Custom branding</li>
                  <li>• Priority support</li>
                  <li>• Stripe Connect payments</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Manage Billing Button */}
              <Button
                onClick={handleManageBilling}
                disabled={openingPortal}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {openingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage Billing
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>

              {/* Billing Portal Info */}
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p>
                  Access the billing portal to update your payment method, view invoices,
                  or cancel your subscription.
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
