/**
 * Billing & Subscriptions Page (Consolidated)
 *
 * Merged billing + subscription management into a single page.
 * Displays:
 * - Plan management (free tier + premium upgrade CTA)
 * - Add-on cards (Advanced Stats, AI News Writer)
 * - Payment processing info (3.5% fee)
 * - Per-league Stripe Connect billing links
 * - Premium services (custom domain, data import)
 *
 * Handles checkout flows via query params (checkout=success/cancelled, addon_activated).
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrgAddons } from '@/lib/actions/addons';
import { getPlatformFeeConfig } from '@/lib/fees/platform-fees';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionContent } from '@/components/subscription/subscription-content';
import { LeaguePaymentLinks } from '@/components/billing/league-payment-links';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function BillingSettingsPage({ params, searchParams }: Props) {
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

  // Get leagues for per-league billing links
  const supabase = await createClient();
  let leagues: any[] | null = null;

  const { data } = await supabase
    .from('leagues')
    .select('id, name, logo_url, primary_color, stripe_account_id, stripe_account_status')
    .eq('organization_id', organization.id)
    .order('name');
  leagues = data;

  // Fallback: also get leagues where user is owner/admin (handles leagues without organizations)
  if (!leagues || leagues.length === 0) {
    const { data: memberLeagues } = await supabase
      .from('league_memberships')
      .select('league:leagues(id, name, logo_url, primary_color, stripe_account_id, stripe_account_status)')
      .eq('user_id', userData.user.id)
      .in('role', ['owner', 'admin']);

    if (memberLeagues && memberLeagues.length > 0) {
      leagues = memberLeagues
        .map((m: any) => m.league)
        .filter(Boolean);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 mb-2">Billing & Subscriptions</h1>
        <p className="text-neutral-400">
          Manage your plan, add-ons, and payment processing for your leagues.
        </p>
      </div>

      {/* Plan Management + Add-ons + Payment Processing + Premium Services */}
      <SubscriptionContent
        orgId={organization.id}
        stripeCustomerId={organization.stripe_customer_id || null}
        platformFeePercent={feeConfig.processingFeePercent}
        initialAddons={addons}
        checkoutStatus={search.checkout as string | undefined}
        addonActivated={search.addon_activated as string | undefined}
      />

      {/* Per-League Billing Links */}
      <LeaguePaymentLinks leagues={leagues || []} />
    </div>
  );
}
