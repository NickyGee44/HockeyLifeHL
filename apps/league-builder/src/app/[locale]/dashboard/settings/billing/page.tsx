/**
 * Billing Settings Page
 *
 * Simplified billing page showing the free platform model.
 * Links to per-league billing dashboards for Stripe Connect management.
 */

import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  CheckCircle2,
  CreditCard,
  Trophy,
  ArrowRight,
  Sparkles,
  Mail,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { LeagueLogo } from '@/components/ui/league-logo';
import { AddOnsSection } from '@/components/billing/AddOnsSection';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BillingSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();
  const userData = await getCurrentUser();

  if (!userData) {
    redirect({ href: '/login', locale });
    return null;
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect({ href: '/dashboard', locale });
    return null;
  }

  // Get leagues with their Stripe Connect status
  const supabase = await createClient();
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, logo_url, primary_color, stripe_account_id, stripe_account_status')
    .eq('organization_id', organization.id)
    .order('name');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 mb-2">{t('billing.title')}</h1>
        <p className="text-neutral-400">
          {t('billing.description')}
        </p>
      </div>

      {/* Platform is FREE Card */}
      <div className="bg-gradient-to-br from-green-500/10 via-rink-500/5 to-arena-500/10 border border-green-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-green-500/20">
            <Sparkles className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">{t('billing.platformFree')}</h2>
            <p className="text-neutral-300 mb-4">
              {t('billing.platformFreeDescription')}
            </p>

            {/* What's Included */}
            <div className="grid gap-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{t('billing.included.unlimitedTeams')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{t('billing.included.leagueWebsite')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{t('billing.included.unlimitedSeasons')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{t('billing.included.allAdminTools')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Processing Section */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-rink-500/10">
            <CreditCard className="w-6 h-6 text-rink-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">{t('billing.paymentProcessing')}</h2>
            <p className="text-neutral-400 text-sm">
              {t('billing.paymentProcessingDescription')}
            </p>
          </div>
        </div>

        {/* Fee Structure */}
        <div className="bg-neutral-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-rink-500">2.99%</span>
            <span className="text-neutral-400">{t('billing.perTransaction')}</span>
          </div>
          <p className="text-sm text-neutral-500">
            {t('billing.feeDescription')}
          </p>
        </div>

        {/* Per-League Billing */}
        {leagues && leagues.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
              {t('billing.leagueBilling')}
            </h3>
            <div className="space-y-3">
              {leagues.map((league) => {
                const isConnected = league.stripe_account_status === 'active';
                const needsSetup = !league.stripe_account_id;

                return (
                  <Link
                    key={league.id}
                    href={`/dashboard/leagues/${league.id}/billing`}
                    className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl hover:bg-neutral-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <LeagueLogo
                        logoUrl={league.logo_url}
                        leagueName={league.name}
                        primaryColor={league.primary_color || '#22D3EE'}
                        size="xs"
                        shape="square"
                      />
                      <div>
                        <h4 className="font-medium text-white group-hover:text-rink-500 transition-colors">
                          {league.name}
                        </h4>
                        <p className="text-xs text-neutral-500">
                          {isConnected ? (
                            <span className="text-green-500">{t('billing.stripeConnected')}</span>
                          ) : needsSetup ? (
                            <span className="text-yellow-500">{t('billing.setupRequired')}</span>
                          ) : (
                            <span className="text-yellow-500">{t('billing.pendingSetup')}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500 group-hover:text-rink-500 transition-colors">
                      <span className="text-sm">{t('billing.manageBilling')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {(!leagues || leagues.length === 0) && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-neutral-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('billing.noLeagues')}</h3>
            <p className="text-neutral-400 mb-4">
              {t('billing.noLeaguesDescription')}
            </p>
            <Link
              href="/dashboard/leagues/new"
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              {t('navigation.createLeague')}
            </Link>
          </div>
        )}
      </div>

      {/* Premium Add-Ons Section */}
      <AddOnsSection
        orgId={organization.id}
        hasStripeCustomer={!!organization.stripe_customer_id}
      />

      {/* Premium Services Section */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('billing.premiumServices')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-neutral-800/50 rounded-xl p-4">
            <h3 className="font-medium text-white mb-2">{t('billing.customDomain')}</h3>
            <p className="text-sm text-neutral-400 mb-3">
              {t('billing.customDomainDescription')}
            </p>
            <a
              href="mailto:support@beerleaguehockey.ca?subject=Custom Domain Inquiry"
              className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
            >
              <Mail className="w-4 h-4" />
              {t('billing.contactForQuote')}
            </a>
          </div>
          <div className="bg-neutral-800/50 rounded-xl p-4">
            <h3 className="font-medium text-white mb-2">{t('billing.dataImport')}</h3>
            <p className="text-sm text-neutral-400 mb-3">
              {t('billing.dataImportDescription')}
            </p>
            <a
              href="mailto:support@beerleaguehockey.ca?subject=Historic Data Import Inquiry"
              className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
            >
              <Mail className="w-4 h-4" />
              {t('billing.contactForQuote')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
