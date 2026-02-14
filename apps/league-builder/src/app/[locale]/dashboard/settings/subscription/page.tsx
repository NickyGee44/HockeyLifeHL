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

import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrgAddons } from '@/lib/actions/addons';
import { getPlatformFeeConfig } from '@/lib/fees/platform-fees';
import { SubscriptionContent } from '@/components/subscription/subscription-content';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SubscriptionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;

  setRequestLocale(locale);

  // Get authenticated user
  const userData = await getCurrentUser();
  if (!userData) {
    redirect({ href: '/login', locale });
    return null;
  }

  // Get organization
  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect({ href: '/dashboard', locale });
    return null;
  }

  // Get platform fee config
  const feeConfig = await getPlatformFeeConfig();

  // Get organization add-ons
  const addonsResult = await getOrgAddons(organization.id);
  const addons = addonsResult.success ? addonsResult.data : [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 mb-2">Billing & Subscriptions</h1>
        <p className="text-neutral-400">
          HockeyLife is free forever. Upgrade with premium add-ons to unlock advanced features.
        </p>
      </div>

      {/* Subscription Content */}
      <SubscriptionContent
        orgId={organization.id}
        stripeCustomerId={organization.stripe_customer_id || null}
        platformFeePercent={feeConfig.processingFeePercent}
        initialAddons={addons}
        checkoutStatus={search.checkout as string | undefined}
        addonActivated={search.addon_activated as string | undefined}
      />
    </div>
  );
}
