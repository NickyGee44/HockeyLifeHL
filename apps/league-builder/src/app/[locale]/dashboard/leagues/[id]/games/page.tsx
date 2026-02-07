/**
 * League Games Page
 *
 * Displays all games for a league with filtering, bulk actions, and management.
 * Requires owner or admin role on the league.
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getGames, getTeamsForLeague, getSeasonsForLeague } from '@/lib/actions/games';
import { GamesListClient } from '@/components/games';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';

export const metadata = {
  title: 'Games | Beer League Hockey',
  description: 'Manage games for your league',
};

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ [key: string]: string }>;
};

export default async function LeagueGamesPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

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

  // Fetch initial data
  const [gamesResult, teamsResult, seasonsResult] = await Promise.all([
    getGames(leagueId),
    getTeamsForLeague(leagueId),
    getSeasonsForLeague(leagueId),
  ]);

  const games = gamesResult.success ? gamesResult.data.games : [];
  const teams = teamsResult.success ? teamsResult.data : [];
  const seasons = seasonsResult.success ? seasonsResult.data : [];

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
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: league.primary_color || '#22D3EE' }}
              >
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Games</h1>
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
              Schedule Games
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <StatCard
            label="Total Games"
            value={games.length}
            color="gold"
          />
          <StatCard
            label="Scheduled"
            value={games.filter((g) => g.status === 'scheduled').length}
            color="blue"
          />
          <StatCard
            label="Completed"
            value={games.filter((g) => g.status === 'completed').length}
            color="green"
          />
          <StatCard
            label="Cancelled/Postponed"
            value={games.filter((g) => g.status === 'cancelled' || g.status === 'postponed').length}
            color="red"
          />
        </div>

        {/* Games List */}
        <GamesListClient
          leagueId={leagueId}
          initialGames={games}
          initialTeams={teams}
          initialSeasons={seasons}
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
