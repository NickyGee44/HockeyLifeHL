/**
 * Subscription & Pricing Page
 *
 * Shows the free platform model with transaction-based pricing.
 */

import { SubscriptionPlans } from '@/components/subscription/subscription-plans';
import { CheckCircle, Percent } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SubscriptionPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Pricing</h1>
        <p className="text-muted-foreground">
          HockeyLifeHL is free to use. We only charge a small fee when you process payments.
        </p>
      </div>

      {/* Current Status */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-1">
              Free Forever Plan
            </h3>
            <p className="text-green-700 dark:text-green-300">
              You have full access to all features. No subscription required.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Fee Info */}
      <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0">
            <Percent className="w-6 h-6 text-gold-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">
              2.99% Payment Processing Fee
            </h3>
            <p className="text-muted-foreground">
              When players register and pay through your league, we charge a 2.99% fee on each transaction.
              This covers Stripe payment processing, fraud protection, and platform operating costs.
            </p>
          </div>
        </div>
      </div>

      {/* Plans */}
      <section>
        <SubscriptionPlans />
      </section>
    </div>
  );
}
