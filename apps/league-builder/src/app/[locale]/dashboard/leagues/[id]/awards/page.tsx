import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { getLeagueAwards } from '@/lib/actions/awards';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AwardsClient } from './AwardsClient';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueAwardsPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Get awards
  const result = await getLeagueAwards(leagueId);
  const awards = result.success ? result.data : [];

  // Get seasons for the dropdown
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, status')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  // Get teams for the dropdown
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .order('name');

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Awards</h1>
            <p className="text-neutral-400 mt-1">
              Manage awards for {league.name}
            </p>
          </div>
        </div>

        {/* Awards Content */}
        <AwardsClient
          leagueId={leagueId}
          initialAwards={awards}
          seasons={seasons || []}
          teams={teams || []}
        />
      </div>
    </div>
  );
}
