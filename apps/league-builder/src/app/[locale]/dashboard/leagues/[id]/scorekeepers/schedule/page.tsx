/**
 * Admin Scorekeeper Schedule Page
 *
 * Shows all upcoming games with scorekeeper assignments,
 * highlights unassigned games, and displays pending swap requests.
 * Provides quick-assign dropdown per game.
 */

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getLeagueScorekepers } from '@/lib/actions/scorekeeper-management';
import { AdminScorekeeperScheduleClient } from '@/components/scorekeepers/admin-scorekeeper-schedule-client';
import { ArrowLeft, Calendar } from 'lucide-react';

export const metadata = {
  title: 'Scorekeeper Schedule | League Admin',
  description: 'View and manage scorekeeper assignments for upcoming games',
};

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminScorekeeperSchedulePage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const t = await getTranslations('scorekeepers.schedule');

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    nextRedirect(`/${locale}/login?redirect=/${locale}/dashboard/leagues/${leagueId}/scorekeepers/schedule`);
  }

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color, created_by')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Verify user is owner or admin
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  const isCreator = league.created_by === user.id;
  const isAuthorized =
    isCreator || (membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active');

  if (!isAuthorized) {
    nextRedirect(`/${locale}/dashboard?error=unauthorized`);
  }

  // Fetch data in parallel
  const serviceClient = createServiceRoleClient();

  const [scorekeepersResult, gamesResult] = await Promise.all([
    getLeagueScorekepers(leagueId),
    // Get upcoming games with scorekeeper assignments — already filtered by league_id
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
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(100),
  ]);

  // Get pending swap requests filtered to this league's games.
  // scorekeeper_swap_requests has no league_id column, so we scope by
  // the game IDs already fetched above (which are already league-scoped).
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
    assignment: g.game_scorekeeper_assignments?.[0] ? {
      id: g.game_scorekeeper_assignments[0].id,
      scorekeeperId: g.game_scorekeeper_assignments[0].scorekeeper_id,
      scorekeeperName: g.game_scorekeeper_assignments[0].scorekeeper?.full_name || 'Unknown',
      assignedAt: g.game_scorekeeper_assignments[0].assigned_at,
    } : null,
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

  const unassignedCount = games.filter((g: any) => !g.assignment).length;

  // Build translations object for client component
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
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/settings/scorekeepers`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {translations.backToScorekeepers}
          </Link>

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: league.primary_color || '#22D3EE' }}
            >
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {translations.title}
              </h1>
              <p className="text-neutral-400">{league.name}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">{translations.upcomingGames}</p>
            <p className="text-3xl font-bold text-white">{games.length}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">{translations.assigned}</p>
            <p className="text-3xl font-bold text-green-500">{games.length - unassignedCount}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">{translations.unassigned}</p>
            <p className="text-3xl font-bold text-amber-500">{unassignedCount}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">{translations.pendingSwaps}</p>
            <p className="text-3xl font-bold text-blue-500">{swapRequests.length}</p>
          </div>
        </div>

        {/* Client component for interactive features */}
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
