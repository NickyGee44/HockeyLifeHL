/**
 * Season-scoped Rosters page
 *
 * Shows team rosters for this specific season.
 */
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { buildTeamDetailHref } from '@/lib/dashboard/workspace-routes';
import { Users } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

type SeasonRosterTeam = {
  id: string;
  name: string;
  short_name: string | null;
  primary_color: string | null;
};

export default async function SeasonRostersPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  // Get league and season info
  const [{ data: league }, { data: season }] = await Promise.all([
    supabase.from('leagues').select('id, name, primary_color').eq('id', leagueId).single(),
    supabase.from('seasons').select('id, name').eq('id', seasonId).single(),
  ]);

  if (!league || !season) notFound();

  // Get teams with roster counts for this season
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, primary_color')
    .eq('league_id', leagueId)
    .neq('status', 'inactive')
    .order('name');

  // Get roster counts per team
  const { data: rosterCounts } = await supabase
    .from('team_rosters')
    .select('team_id')
    .eq('season_id', seasonId)
    .eq('status', 'active');

  const countMap = new Map<string, number>();
  for (const r of rosterCounts ?? []) {
    countMap.set(r.team_id, (countMap.get(r.team_id) || 0) + 1);
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
            <span>{league.name}</span>
            <span>/</span>
            <span>{season.name}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-rink-500" />
            Rosters
          </h1>
          <p className="text-neutral-400 mt-1">
            Team rosters for {season.name}
          </p>
        </div>

        {(teams ?? []).length === 0 ? (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-12 text-center">
            <Users className="w-16 h-16 text-rink-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Teams Yet</h3>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              Add teams to your league to start managing rosters.
            </p>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/teams`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20 transition-all"
            >
              Manage Teams
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(teams ?? []).map((team: SeasonRosterTeam) => {
              const count = countMap.get(team.id) || 0;
              return (
                <Link
                  key={team.id}
                  href={buildTeamDetailHref({
                    locale,
                    teamId: team.id,
                    tab: 'roster',
                    leagueId,
                    seasonId,
                    from: 'season-rosters',
                  })}
                  className="flex items-center gap-4 p-5 bg-white/[0.04] border border-white/10 rounded-xl hover:border-rink-500/30 transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: team.primary_color || '#22D3EE' }}
                  >
                    {team.short_name?.slice(0, 3) || team.name.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{team.name}</p>
                    <p className="text-sm text-neutral-400">
                      {count} {count === 1 ? 'player' : 'players'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
