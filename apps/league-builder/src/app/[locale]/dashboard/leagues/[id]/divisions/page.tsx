import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { getDivisions } from '@/lib/actions/divisions';
import Link from 'next/link';
import { ArrowLeft, Trophy, Users, LayoutGrid, Activity } from 'lucide-react';
import { DivisionList, DivisionBalancePanel } from '@/components/divisions';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueDivisionsPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[Divisions Page] Error fetching league:', leagueError?.message);
    notFound();
  }

  // Get divisions
  const divisionsResult = await getDivisions(leagueId);
  const divisions = divisionsResult.success ? divisionsResult.data : [];

  // Get most recent season for this league (for division health stats)
  const { data: latestSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get team counts
  const { count: totalTeams } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .eq('status', 'active');

  const { count: unassignedTeams } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .is('division_id', null);

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

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: league.primary_color || '#22D3EE' }}
              >
                <LayoutGrid className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Divisions</h1>
                <p className="text-neutral-400 mt-1">{league.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Total Divisions</span>
            </div>
            <p className="text-2xl font-bold text-white">{divisions.length}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Total Teams</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalTeams || 0}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-neutral-400">Unassigned Teams</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {unassignedTeams || 0}
              {(unassignedTeams || 0) > 0 && (
                <span className="text-sm font-normal text-yellow-500 ml-2">
                  needs attention
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Division Balance Tool */}
        {latestSeason && divisions.length >= 2 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-rink-500" />
              Division Balance
            </h2>
            <DivisionBalancePanel
              leagueId={leagueId}
              seasonId={latestSeason.id}
            />
          </div>
        )}

        {/* Divisions List */}
        <DivisionList
          leagueId={leagueId}
          locale={locale}
          initialDivisions={divisions}
        />
      </div>
    </div>
  );
}
