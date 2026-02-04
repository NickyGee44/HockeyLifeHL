import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getRegistrationDetails } from '@/lib/actions/player-registration';
import { RegistrationDetailClient } from '@/components/dashboard/leagues/registration-detail-client';
import { ArrowLeft } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string; id: string; registrationId: string }>;
  searchParams?: Promise<{ [key: string]: string }>;
};

async function getLeagueTeams(leagueId: string) {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .order('name');

  return teams || [];
}

export default async function RegistrationDetailPage({
  params,
}: Props) {
  const awaited = await params;
  const { locale, id: leagueId, registrationId } = awaited;
  setRequestLocale(locale);

  const [registrationResult, teams] = await Promise.all([
    getRegistrationDetails(registrationId),
    getLeagueTeams(leagueId),
  ]);

  if (!registrationResult.success || !registrationResult.data) {
    notFound();
  }

  const registration = registrationResult.data;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/${locale}/dashboard/leagues/${leagueId}/registrations`}
        className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Registrations
      </Link>

      {/* Detail View */}
      <RegistrationDetailClient
        registration={registration}
        leagueId={leagueId}
        teams={teams}
      />
    </div>
  );
}

export function generateMetadata() {
  return {
    title: 'Registration Details',
    description: 'View player registration details',
  };
}
