/**
 * Stripe Connect Dashboard Component
 *
 * Displays the current Stripe Connect status and provides actions for:
 * - Creating a connected account
 * - Onboarding the account
 * - Viewing account status
 * - Managing subscriptions
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface StripeConnectDashboardProps {
  leagueId: string;
  leagueName: string;
}

export function StripeConnectDashboard({ leagueId, leagueName }: StripeConnectDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch account status on mount
  useEffect(() => {
    fetchAccountStatus();
  }, [leagueId]);

  /**
   * Fetch current account status from Stripe API
   * Always get fresh data from API, not from database
   */
  async function fetchAccountStatus() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/stripe/connect/account-status?leagueId=${leagueId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch account status');
      }

      setAccountStatus(data);
    } catch (err) {
      console.error('Error fetching account status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Create a new Stripe Connect account for this league
   */
  async function handleCreateAccount() {
    try {
      setCreating(true);
      setError(null);

      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          displayName: leagueName,
          contactEmail: '', // TODO: Get from user profile
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Refresh status after account creation
      await fetchAccountStatus();

      // Automatically start onboarding
      await handleStartOnboarding();

    } catch (err) {
      console.error('Error creating account:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setCreating(false);
    }
  }

  /**
   * Start the Stripe Connect onboarding flow
   * This redirects the user to Stripe-hosted onboarding
   */
  async function handleStartOnboarding() {
    try {
      setOnboarding(true);
      setError(null);

      const response = await fetch('/api/stripe/connect/create-account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create onboarding link');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.url;

    } catch (err) {
      console.error('Error starting onboarding:', err);
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
      setOnboarding(false);
    }
  }

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render "Create Account" state
   */
  if (!accountStatus?.hasAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Stripe</CardTitle>
          <CardDescription>
            Connect your league to Stripe to accept payments from players and sell merchandise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <Button
            onClick={handleCreateAccount}
            disabled={creating}
            size="lg"
            className="w-full"
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Stripe Account
          </Button>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">What happens next?</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>1. We'll create a Stripe Connect account for your league</li>
              <li>2. You'll be redirected to Stripe to complete onboarding (5 minutes)</li>
              <li>3. Once approved, you can start accepting payments</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render "Onboarding Status" state
   */
  const { readyToProcessPayments, onboardingComplete, currentlyDue, capabilities } = accountStatus;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Connect Status</CardTitle>
        <CardDescription>
          Manage your league's Stripe Connect account and payment settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Account Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Onboarding Status</span>
            {onboardingComplete ? (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Incomplete
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Payment Processing</span>
            {readyToProcessPayments ? (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Pending
              </span>
            )}
          </div>

          {capabilities?.cardPayments && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Card Payments</span>
              <span className="text-sm text-muted-foreground capitalize">
                {capabilities.cardPayments}
              </span>
            </div>
          )}
        </div>

        {/* Requirements */}
        {currentlyDue && currentlyDue.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-900 mb-2">
              Action Required
            </p>
            <p className="text-sm text-amber-700 mb-3">
              Complete the following requirements to start accepting payments:
            </p>
            <ul className="space-y-1 text-sm text-amber-800">
              {currentlyDue.map((requirement: string) => (
                <li key={requirement} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                  {requirement.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!onboardingComplete && (
            <Button
              onClick={handleStartOnboarding}
              disabled={onboarding}
              className="w-full"
              size="lg"
            >
              {onboarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentlyDue && currentlyDue.length > 0
                ? 'Complete Onboarding'
                : 'Finish Setup'}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}

          <Button
            onClick={fetchAccountStatus}
            variant="outline"
            className="w-full"
          >
            Refresh Status
          </Button>
        </div>

        {/* Success Message */}
        {readyToProcessPayments && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-medium text-green-900 mb-1">
              Ready to Accept Payments!
            </p>
            <p className="text-sm text-green-700">
              Your Stripe account is fully set up. You can now create products and accept payments.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
