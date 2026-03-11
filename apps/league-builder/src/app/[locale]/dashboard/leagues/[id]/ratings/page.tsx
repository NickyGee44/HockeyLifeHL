import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { PLAYER_RATING_CATEGORY_CARDS } from '@/lib/ratings';
import {
  getDivisionBalance,
  getPlayerRatings,
  getTeamRatings,
} from '@/lib/actions/ratings';
import {
  DivisionBalanceDashboard,
  PlayerDirectory,
  RecalculateButton,
  TeamRatingsCard,
} from '@/components/ratings';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueRatingsPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  setRequestLocale(locale);

  const { supabase, access, userData } = await requireLeagueDashboardAccess({ leagueId, locale });

  const [{ data: league }, { data: season }, { data: membership }] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, name')
      .eq('id', leagueId)
      .maybeSingle(),
    supabase
      .from('seasons')
      .select('id, name, status')
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', leagueId)
      .eq('user_id', userData.user.id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  if (!league) {
    notFound();
  }

  if (!season?.id) {
    return (
      <div className="min-h-screen bg-neutral-950 p-8 text-neutral-300">
        No season found for this league.
      </div>
    );
  }

  const [playerRatings, teamRatings, balance, teamsRes, divisionsRes] = await Promise.all([
    getPlayerRatings(leagueId, season.id, { page: 1, pageSize: 500 }),
    getTeamRatings(leagueId, season.id),
    getDivisionBalance(leagueId, season.id),
    supabase.from('teams').select('id, name').eq('league_id', leagueId),
    supabase.from('divisions').select('id, name').eq('league_id', leagueId),
  ]);

  const teamNameById = new Map((teamsRes.data ?? []).map((row) => [row.id, row.name]));
  const divisionNameById = new Map((divisionsRes.data ?? []).map((row) => [row.id, row.name]));

  const teamCards = (teamRatings.success ? teamRatings.data ?? [] : []).map((row) => ({
    ...row,
    teamName: teamNameById.get(row.team_id) || 'Unknown Team',
    divisionName: row.division_id ? (divisionNameById.get(row.division_id) || 'Unassigned') : 'Unassigned',
  }));

  const isOwner = access.accessType === 'platform_admin' || membership?.role === 'owner';

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rink-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-rink-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Player Ratings</h1>
                <p className="text-neutral-400 text-sm">{season.name}</p>
              </div>
            </div>

            <RecalculateButton leagueId={leagueId} seasonId={season.id} disabled={!isOwner} />
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Player Directory</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            {PLAYER_RATING_CATEGORY_CARDS.map((card) => (
              <div key={card.key} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-400">{card.description}</p>
              </div>
            ))}
          </div>
          {playerRatings.success && playerRatings.data ? (
            <PlayerDirectory leagueId={leagueId} rows={playerRatings.data.rows} />
          ) : (
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 text-neutral-300">
              {playerRatings.error || 'Unable to load player ratings'}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Team Ratings</h2>
          <TeamRatingsCard teamRatings={teamCards} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Division Balance</h2>
          {balance.success && balance.data ? (
            <DivisionBalanceDashboard balance={balance.data} />
          ) : (
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 text-neutral-300">
              {balance.error || 'Unable to load division balance'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
