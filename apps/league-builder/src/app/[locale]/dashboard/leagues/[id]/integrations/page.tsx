import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ArrowLeft, CreditCard, Globe, Landmark, Mail, PlugZap } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueIntegrationsPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, is_public, settings')
    .eq('id', leagueId)
    .single();

  if (!league) {
    notFound();
  }

  const settings = (league.settings as Record<string, unknown> | null) ?? {};
  const payment = (settings.payment as Record<string, unknown> | undefined) ?? {};
  const domain = (settings.domain as Record<string, unknown> | undefined) ?? {};

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}/dashboard/leagues/${leagueId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to league hub
        </Link>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
            League Integrations
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">{league.name}</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Manage the core connections tied to billing, branding, and your public league presence.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <IntegrationCard
            href={`/${locale}/dashboard/leagues/${leagueId}/billing`}
            icon={<CreditCard className="h-5 w-5" />}
            title="Stripe"
            description={
              payment.stripeAccountStatus === 'connected' || payment.stripeAccountStatus === 'active'
                ? 'Stripe is connected for online payments.'
                : 'Finish Stripe onboarding before collecting fees online.'
            }
          />
          <IntegrationCard
            href={`/${locale}/dashboard/leagues/${leagueId}/settings/email-domain`}
            icon={<Mail className="h-5 w-5" />}
            title="Email & Domain"
            description={
              domain.wantCustomDomain || domain.customDomainName
                ? `Custom domain requested: ${domain.customDomainName || 'pending setup'}.`
                : 'Use the default BLH domain until you are ready to connect a branded one.'
            }
          />
          <IntegrationCard
            href={`/${locale}/dashboard/leagues/${leagueId}/website`}
            icon={<Globe className="h-5 w-5" />}
            title="Public Website"
            description={
              league.is_public
                ? 'Public site is enabled. Review branding and published pages before launch.'
                : 'Public site is disabled right now.'
            }
          />
          <IntegrationCard
            href={`/${locale}/dashboard/leagues/${leagueId}/finance`}
            icon={<Landmark className="h-5 w-5" />}
            title="Finance Systems"
            description="Review billing status and finance configuration for this league."
            muted
          />
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  href,
  icon,
  title,
  description,
  muted = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'surface-premium card-hover flex items-start gap-4 p-5',
        muted ? 'border-white/[0.06] bg-white/[0.02]' : ''
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rink-500/10 text-rink-300">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white">{title}</p>
          {muted ? <PlugZap className="h-3.5 w-3.5 text-neutral-500" /> : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
      </div>
    </Link>
  );
}
