/**
 * Subscription Cancel Page
 *
 * Displays when user cancels Stripe Checkout.
 * Provides option to retry or return to billing.
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function SubscriptionCancelPage() {
  const router = useRouter();

  function handleGoToBilling() {
    router.push('/dashboard/settings/billing');
  }

  function handleTryAgain() {
    router.push('/dashboard/settings/billing');
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-md bg-neutral-800/50 border-white/10">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-amber-400" />
          </div>
          <CardTitle className="text-2xl text-neutral-100">Checkout Cancelled</CardTitle>
          <CardDescription className="text-neutral-400">
            Your subscription was not completed
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-neutral-300">
            You cancelled the checkout process. No charges have been made to your payment method.
          </p>

          <div className="bg-neutral-900/50 border border-white/10 rounded-lg p-4">
            <p className="text-sm text-neutral-400 mb-2">Need help?</p>
            <p className="text-sm text-neutral-300">
              If you encountered any issues or have questions about our pricing, please{' '}
              <a
                href="mailto:support@beerleaguehockey.ca"
                className="text-rink-500 hover:underline"
              >
                contact support
              </a>
              .
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <Button
              onClick={handleTryAgain}
              className="w-full bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20"
            >
              Try Again
            </Button>

            <Button
              onClick={handleGoToBilling}
              variant="outline"
              className="w-full border-white/10 text-neutral-300 hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
