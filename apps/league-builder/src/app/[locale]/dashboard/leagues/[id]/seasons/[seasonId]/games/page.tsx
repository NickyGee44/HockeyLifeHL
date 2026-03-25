/**
 * Season-scoped Games page
 *
 * Renders the games/completed games view scoped to this season.
 * Re-uses the league-level games page logic.
 */
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getGames, getTeamsForLeague, getSeasonsForLeague } from '@/lib/actions/games';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { isAggregateStatsGameLocation } from '@/lib/seasons/game-visibility';
import { CompletedGamesTabs } from '@/components/games';
import { cn } from '@hockey-life/ui';
import { CheckCircle2 } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonGamesPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'completedGames' });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (!league) notFound();

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) notFound();

  const { data: season } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('id', seasonId)
    .single();

  if (!season) notFound();

  const [gamesResult, teamsResult, seasonsResult] = await Promise.all([
    getGames(leagueId),
    getTeamsForLeague(leagueId),
    getSeasonsForLeague(leagueId),
  ]);

  const allGames = gamesResult.success ? gamesResult.data.games : [];
  // Filter to this season's visible schedule games (exclude aggregate stat carrier games)
  const games = allGames.filter((g: any) => g.season_id === seasonId && !isAggregateStatsGameLocation((g as any).location));
  const teams = teamsResult.success ? teamsResult.data : [];
  const seasons = seasonsResult.success ? seasonsResult.data : [];

  const completedCount = games.filter((g: any) => g.status === 'completed').length;
  const scheduledCount = games.filter((g: any) => g.status === 'scheduled').length;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
            <span>{league.name}</span>
            <span>/</span>
            <span>{season.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: league.primary_color || '#22D3EE' }}
            >
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t('pageTitle')}
              </h1>
              <p className="text-neutral-400">{season.name}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">Total Games</p>
            <p className="text-3xl font-bold text-rink-500">{games.length}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-500">{completedCount}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">Scheduled</p>
            <p className="text-3xl font-bold text-blue-500">{scheduledCount}</p>
          </div>
        </div>

        <CompletedGamesTabs
          leagueId={leagueId}
          initialGames={games}
          initialTeams={teams}
          initialSeasons={seasons}
          suspensions={[]}
          penalties={[]}
          refereeNotes={[]}
        />
      </div>
    </div>
  );
}
