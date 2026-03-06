import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EmailSenderDomainSettings } from '@/components/notifications/EmailSenderDomainSettings';
import { getLeagueEmailDomain } from '@/lib/actions/email-sender-domain';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EmailDomainSettingsPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  const emailDomain = await getLeagueEmailDomain(leagueId);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/settings`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>

          <h1 className="text-3xl font-black text-white tracking-tight">
            Email Sending Domain
          </h1>
          <p className="text-neutral-400 mt-1">
            Send league emails from your own domain for {league.name}
          </p>
        </div>

        <EmailSenderDomainSettings
          leagueId={leagueId}
          leagueName={league.name}
          initialDomain={emailDomain.domain ?? null}
          initialVerified={emailDomain.verified ?? false}
          initialFromName={emailDomain.fromName ?? null}
          initialRecords={emailDomain.records ?? []}
          initialStatus={emailDomain.status ?? null}
        />
      </div>
    </div>
  );
}
