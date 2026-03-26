import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getLeagueScorekepers } from '@/lib/actions/scorekeeper-management';
import { AdminScorekeeperScheduleClient } from '@/components/scorekeepers/admin-scorekeeper-schedule-client';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonScorekeeperSchedulePage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('scorekeepers.schedule');
  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const [{ data: league }, { data: season }] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, name, primary_color')
      .eq('id', leagueId)
      .maybeSingle(),
    supabase
      .from('seasons')
      .select('id, name')
      .eq('id', seasonId)
      .eq('league_id', leagueId)
      .maybeSingle(),
  ]);

  if (!league || !season) {
    notFound();
  }

  const serviceClient = createServiceRoleClient();

  const [scorekeepersResult, gamesResult] = await Promise.all([
    getLeagueScorekepers(leagueId),
    serviceClient
      .from('games')
      .select(`
        id,
        scheduled_at,
        status,
        home_score,
        away_score,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name),
        venue:venues(id, name),
        game_scorekeeper_assignments(
          id,
          scorekeeper_id,
          assigned_at,
          scorekeeper:profiles!game_scorekeeper_assignments_scorekeeper_id_fkey(full_name)
        )
      `)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(100),
  ]);

  const leagueGameIds = (gamesResult.data || []).map((g: any) => g.id as string);
  const swapRequestsResult = leagueGameIds.length > 0
    ? await (serviceClient as any)
        .from('scorekeeper_swap_requests')
        .select(`
          id,
          game_id,
          reason,
          status,
          created_at,
          requesting_sk:league_scorekeepers!scorekeeper_swap_requests_requesting_scorekeeper_id_fkey(id, display_name),
          accepting_sk:league_scorekeepers!scorekeeper_swap_requests_accepting_scorekeeper_id_fkey(id, display_name)
        `)
        .in('game_id', leagueGameIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    : { data: [] };

  const scorekeepers = scorekeepersResult.success ? scorekeepersResult.data.scorekeepers : [];
  const games = (gamesResult.data || []).map((g: any) => ({
    id: g.id,
    scheduledAt: g.scheduled_at,
    status: g.status,
    homeScore: g.home_score || 0,
    awayScore: g.away_score || 0,
    homeTeamName: g.home_team?.name || 'Home',
    awayTeamName: g.away_team?.name || 'Away',
    venueName: g.venue?.name || null,
    assignment: g.game_scorekeeper_assignments?.[0]
      ? {
          id: g.game_scorekeeper_assignments[0].id,
          scorekeeperId: g.game_scorekeeper_assignments[0].scorekeeper_id,
          scorekeeperName: g.game_scorekeeper_assignments[0].scorekeeper?.full_name || 'Unknown',
          assignedAt: g.game_scorekeeper_assignments[0].assigned_at,
        }
      : null,
  }));

  const swapRequests = (swapRequestsResult.data || []).map((sr: any) => ({
    id: sr.id,
    gameId: sr.game_id,
    reason: sr.reason,
    status: sr.status,
    createdAt: sr.created_at,
    requestingName: sr.requesting_sk?.display_name || 'Unknown',
    acceptingName: sr.accepting_sk?.display_name || null,
  }));

  const unassignedCount = games.filter((game: any) => !game.assignment).length;

  const translations = {
    title: t('title'),
    backToScorekeepers: t('backToScorekeepers'),
    upcomingGames: t('upcomingGames'),
    assigned: t('assigned'),
    unassigned: t('unassigned'),
    pendingSwaps: t('pendingSwaps'),
    pendingSwapRequests: t('pendingSwapRequests'),
    wantsToSwap: t('wantsToSwap'),
    filterAll: t('filterAll'),
    filterUnassigned: t('filterUnassigned'),
    filterAssigned: t('filterAssigned'),
    noGamesMatch: t('noGamesMatch'),
    live: t('live'),
    needsSk: t('needsSk'),
    swap: t('swap'),
    quickAssign: t('quickAssign'),
    assigning: t('assigning'),
    assignedLabel: t('assignedLabel'),
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={buildSeasonWorkspaceHref(locale, leagueId, seasonId)}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {season.name}
          </Link>

          <div className="mt-4 flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: league.primary_color || '#22D3EE' }}
            >
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                {translations.title}
              </h1>
              <p className="text-neutral-400">
                {league.name} / {season.name}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label={translations.upcomingGames} value={games.length} color="text-white" />
          <StatCard label={translations.assigned} value={games.length - unassignedCount} color="text-green-500" />
          <StatCard label={translations.unassigned} value={unassignedCount} color="text-amber-500" />
          <StatCard label={translations.pendingSwaps} value={swapRequests.length} color="text-blue-500" />
        </div>

        <AdminScorekeeperScheduleClient
          leagueId={leagueId}
          games={games}
          scorekeepers={scorekeepers}
          swapRequests={swapRequests}
          locale={locale}
          translations={translations}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
      <p className="mb-1 text-sm text-neutral-400">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
