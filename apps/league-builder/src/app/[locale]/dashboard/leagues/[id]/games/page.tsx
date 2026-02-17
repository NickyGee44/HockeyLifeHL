/**
 * Completed Games Page
 *
 * Hub for managing completed games, penalties, suspensions, and referee notes.
 * Replaces the old "Standings" nav item with a more comprehensive view.
 * Requires owner or admin role on the league.
 */

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getGames, getTeamsForLeague, getSeasonsForLeague } from '@/lib/actions/games';
import { CompletedGamesTabs } from '@/components/games';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'completedGames' });
  return {
    title: `${t('pageTitle')} | Beer League Hockey`,
    description: t('pageDescription'),
  };
}

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ [key: string]: string }>;
};

export default async function CompletedGamesPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'completedGames' });

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    nextRedirect(`/${locale}/login?redirect=/${locale}/dashboard/leagues/${leagueId}/games`);
  }

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Verify user is owner or admin of this league
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  // Check if they're the creator
  const { data: leagueCreator } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('id', leagueId)
    .single();

  const isCreator = leagueCreator?.created_by === user.id;
  const isAuthorized =
    isCreator || (membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active');

  if (!isAuthorized) {
    nextRedirect(`/${locale}/dashboard?error=unauthorized`);
  }

  // Fetch all data in parallel
  const [gamesResult, teamsResult, seasonsResult, suspensionsResult, penaltiesResult, refereeNotesResult] =
    await Promise.all([
      getGames(leagueId),
      getTeamsForLeague(leagueId),
      getSeasonsForLeague(leagueId),
      // Suspensions for this league
      supabase
        .from('suspensions')
        .select(`
          id,
          reason,
          games_remaining,
          start_date,
          end_date,
          status,
          player:profiles!suspensions_player_id_fkey(full_name),
          team:teams!suspensions_team_id_fkey(name)
        `)
        .eq('league_id', leagueId)
        .order('start_date', { ascending: false })
        .limit(100),
      // Penalties from game_events where event_type = 'penalty'
      supabase
        .from('game_events')
        .select(`
          id,
          penalty_type,
          penalty_severity,
          penalty_minutes,
          period,
          player:profiles!game_events_player_id_fkey(full_name),
          team:teams!game_events_team_id_fkey(name),
          game:games!game_events_game_id_fkey(
            scheduled_at,
            home_team:teams!games_home_team_id_fkey(short_name),
            away_team:teams!games_away_team_id_fkey(short_name)
          )
        `)
        .eq('league_id', leagueId)
        .eq('event_type', 'penalty')
        .is('deleted_at', null)
        .order('entered_at', { ascending: false })
        .limit(100),
      // Referee/scorekeeper notes from completed games
      supabase
        .from('games')
        .select(`
          id,
          scheduled_at,
          scorekeeper_notes,
          home_team:teams!games_home_team_id_fkey(short_name),
          away_team:teams!games_away_team_id_fkey(short_name)
        `)
        .eq('league_id', leagueId)
        .eq('status', 'completed')
        .not('scorekeeper_notes', 'is', null)
        .neq('scorekeeper_notes', '')
        .order('scheduled_at', { ascending: false })
        .limit(50),
    ]);

  const games = gamesResult.success ? gamesResult.data.games : [];
  const teams = teamsResult.success ? teamsResult.data : [];
  const seasons = seasonsResult.success ? seasonsResult.data : [];

  // Transform suspensions
  const suspensions = (suspensionsResult.data || []).map((s) => ({
    id: s.id,
    player_name: (s.player as { full_name: string } | null)?.full_name || 'Unknown Player',
    team_name: (s.team as { name: string } | null)?.name || 'Unknown Team',
    reason: s.reason,
    games_remaining: s.games_remaining,
    start_date: s.start_date,
    end_date: s.end_date,
    status: s.status,
  }));

  // Transform penalties
  const penalties = (penaltiesResult.data || []).map((p) => {
    const game = p.game as { scheduled_at: string; home_team: { short_name: string | null } | null; away_team: { short_name: string | null } | null } | null;
    return {
      id: p.id,
      player_name: (p.player as { full_name: string } | null)?.full_name || 'Unknown Player',
      team_name: (p.team as { name: string } | null)?.name || 'Unknown Team',
      penalty_type: p.penalty_type || 'Unknown',
      penalty_severity: p.penalty_severity,
      penalty_minutes: p.penalty_minutes || 0,
      period: p.period,
      game_date: game?.scheduled_at
        ? new Date(game.scheduled_at).toLocaleDateString()
        : '',
      game_label: game
        ? `${game.home_team?.short_name || '?'} vs ${game.away_team?.short_name || '?'}`
        : 'Unknown Game',
    };
  });

  // Transform referee notes
  const refereeNotes = (refereeNotesResult.data || []).map((g) => ({
    game_id: g.id,
    game_label: `${(g.home_team as { short_name: string | null } | null)?.short_name || '?'} vs ${(g.away_team as { short_name: string | null } | null)?.short_name || '?'}`,
    game_date: new Date(g.scheduled_at).toLocaleDateString(),
    scorekeeper_notes: g.scorekeeper_notes!,
  }));

  const completedCount = games.filter((g) => g.status === 'completed').length;
  const scheduledCount = games.filter((g) => g.status === 'scheduled').length;
  const cancelledCount = games.filter((g) => g.status === 'cancelled' || g.status === 'postponed').length;

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
            {t('backToLeague', { leagueName: league.name })}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                <p className="text-neutral-400">{league.name}</p>
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/schedule`}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-4 h-4" />
              {t('scheduleGames')}
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <StatCard label={t('stats.totalGames')} value={games.length} color="gold" />
          <StatCard label={t('stats.scheduled')} value={scheduledCount} color="blue" />
          <StatCard label={t('stats.completed')} value={completedCount} color="green" />
          <StatCard label={t('stats.cancelledPostponed')} value={cancelledCount} color="red" />
        </div>

        {/* Tabbed Content */}
        <CompletedGamesTabs
          leagueId={leagueId}
          initialGames={games}
          initialTeams={teams}
          initialSeasons={seasons}
          suspensions={suspensions}
          penalties={penalties}
          refereeNotes={refereeNotes}
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
  color: 'gold' | 'blue' | 'green' | 'red';
}) {
  const colorClasses = {
    gold: 'text-rink-500 bg-rink-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    red: 'text-red-500 bg-red-500/10',
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-4">
      <p className="text-sm text-neutral-400 mb-1">{label}</p>
      <p className={cn('text-3xl font-bold', colorClasses[color].split(' ')[0])}>{value}</p>
    </div>
  );
}
