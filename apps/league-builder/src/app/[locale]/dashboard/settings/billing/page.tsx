/**
 * Billing & Subscriptions Page (Consolidated)
 *
 * Merged billing + subscription management into a single page.
 * Displays:
 * - Platform subscription summary
 * - Payment processing guidance
 * - Per-league Stripe Connect billing links
 * - Domain and migration guidance
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getPlatformFeeConfig } from '@/lib/fees/platform-fees';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionContent } from '@/components/subscription/subscription-content';
import { LeaguePaymentLinks } from '@/components/billing/league-payment-links';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BillingSettingsPage({ params }: Props) {
  const { locale } = await params;

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
          Manage your platform billing, payment processing, and rollout settings for your leagues.
        </p>
      </div>

      {/* Platform subscription + payment processing + domain / migration guidance */}
      <SubscriptionContent
        organizationName={organization.name}
        stripeCustomerId={organization.stripe_customer_id || null}
        platformFeePercent={feeConfig.processingFeePercent}
        subscriptionStatus={organization.subscription_status || null}
        subscriptionTier={organization.subscription_tier || null}
        domainsHref={`/${locale}/dashboard/settings/domains`}
      />

      {/* Per-League Billing Links */}
      <LeaguePaymentLinks leagues={leagues || []} />
    </div>
  );
}
