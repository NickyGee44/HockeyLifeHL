/**
 * Subscription Success Page
 *
 * Displays success message after completing Stripe Checkout.
 * Automatically redirects back to billing page.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '@/lib/types/subscription';
import type { SubscriptionTier } from '@/lib/types/subscription';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  const tier = (searchParams.get('tier') as SubscriptionTier) || 'enterprise';
  const tierInfo = SUBSCRIPTION_TIERS[tier];

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard/settings/billing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  function handleGoToBilling() {
    router.push('/dashboard/settings/billing');
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-md bg-neutral-800/50 border-white/10">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <CardTitle className="text-2xl text-neutral-100">Subscription Successful!</CardTitle>
          <CardDescription className="text-neutral-400">
            Welcome to {tierInfo.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-neutral-300">
            Your subscription has been activated. You now have access to all {tierInfo.name}{' '}
            features.
          </p>

          <div className="bg-neutral-900/50 border border-white/10 rounded-lg p-4">
            <p className="text-sm text-neutral-400 mb-2">What happens next?</p>
            <ul className="text-sm text-neutral-300 space-y-1 text-left">
              <li>Your subscription is now active</li>
              <li>You will receive a confirmation email</li>
              <li>Your first invoice will be sent shortly</li>
              <li>All features are now unlocked</li>
            </ul>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleGoToBilling}
              className="w-full bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20"
            >
              Go to Billing
            </Button>

            <p className="text-xs text-neutral-500 mt-3 flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Redirecting in {countdown} seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
