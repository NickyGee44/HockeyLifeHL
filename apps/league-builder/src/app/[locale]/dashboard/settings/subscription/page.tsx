/**
 * Subscription & Billing Page
 *
 * Premium subscription management UI with real-time status, upgrade CTAs,
 * and billing portal integration. Displays FREE forever model with optional
 * premium add-ons (Platform Monthly, Advanced Stats, AI News Writer).
 *
 * Features:
 * - Live subscription status from organization_addons table
 * - Split hero layout (Current Plan vs. Premium Upgrade)
 * - All subscription states (active, trialing, past_due, canceled, incomplete)
 * - Stripe Checkout integration for upgrades
 * - Stripe Billing Portal for payment management
 * - Query param handling (checkout=success, checkout=cancelled)
 * - Mobile-responsive design
 * - Accessible (WCAG 2.2 AA)
 */

import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { SubscriptionContent } from '@/components/subscription/subscription-content';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SubscriptionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;

  setRequestLocale(locale);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 mb-2">Billing & Subscriptions</h1>
        <p className="text-neutral-400">
          HockeyLife is free forever. Upgrade with premium add-ons to unlock advanced features.
        </p>
      </div>

      {/* Subscription Content (Client Component) */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-rink-500" />
          </div>
        }
      >
        <SubscriptionContent
          checkoutStatus={search.checkout as string | undefined}
          addonActivated={search.addon_activated as string | undefined}
        />
      </Suspense>
    </div>
  );
}
