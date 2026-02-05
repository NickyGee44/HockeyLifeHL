import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import {
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { LeagueTeamsClient } from '@/components/teams/LeagueTeamsClient';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function LeagueTeamsPage({ params, searchParams }: Props) {
  const awaited = await params;
  const awaitedSearch = await searchParams;
  const { locale, id: leagueId } = awaited;
  const { tab } = awaitedSearch;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[Teams Page] Error fetching league:', leagueError?.message);
    notFound();
  }

  // Get teams with division info
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      abbreviation,
      primary_color,
      secondary_color,
      logo_url,
      status,
      division_id,
      divisions (
        id,
        name
      )
    `)
    .eq('league_id', leagueId)
    .neq('status', 'inactive')
    .order('name');

  if (teamsError) {
    console.error('[Teams Page] Error fetching teams:', teamsError.message);
  }

  // Get divisions for this league
  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('league_id', leagueId)
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Teams</h1>
              <p className="text-neutral-400 mt-1">
                Manage teams in {league.name}
              </p>
            </div>

            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/teams/new`}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-4 h-4" />
              Add Team
            </Link>
          </div>
        </div>

        {/* Teams Content with Tabs */}
        <LeagueTeamsClient
          leagueId={leagueId}
          leagueName={league.name}
          locale={locale}
          teams={teams || []}
          divisions={divisions || []}
          initialTab={tab || 'teams'}
        />
      </div>
    </div>
  );
}
