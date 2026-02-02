/**
 * Season Standings Page
 *
 * Dashboard page for viewing and configuring season standings.
 */

import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Trophy, Settings, Download, RefreshCw } from 'lucide-react';
import { StandingsPageClient } from './StandingsPageClient';
import type { TiebreakerType } from '@/lib/standings/types';

// ============================================================================
// TYPES
// ============================================================================

interface PageProps {
  params: Promise<{ seasonId: string }>;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function getSeasonData(seasonId: string) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get season with league info
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select(`
      *,
      league:leagues(
        id,
        name,
        slug
      )
    `)
    .eq('id', seasonId)
    .single();

  if (seasonError || !season) {
    notFound();
  }

  // Get standings config
  const { data: config } = await supabase
    .from('standings_config')
    .select('*')
    .eq('season_id', seasonId)
    .single();

  // Get divisions for this league
  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('league_id', season.league_id)
    .order('name');

  // Get completed games count
  const { count: gamesCompleted } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .eq('status', 'completed');

  // Get teams count
  const { count: teamsCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', season.league_id)
    .eq('status', 'active');

  return {
    season,
    league: season.league,
    config: config ? {
      id: config.id,
      leagueId: config.league_id,
      seasonId: config.season_id,
      pointsWin: config.points_win,
      pointsLoss: config.points_loss,
      pointsTie: config.points_tie,
      tiebreakers: (config.tiebreakers as TiebreakerType[] | null) ?? ['goal_diff', 'goals_for', 'wins'],
      playoffTeamsPerDivision: config.playoff_teams_per_division ?? 4,
      playoffTeamsTotal: config.playoff_teams_total ?? 8,
      useDivisionPlayoffs: config.use_division_playoffs ?? true,
      showGoalDiff: config.show_goal_diff ?? true,
      showStreak: config.show_streak ?? true,
      showLast10: config.show_last_10 ?? true,
      showHomeAwaySplit: config.show_home_away_split ?? false,
      createdAt: new Date(config.created_at ?? Date.now()),
      updatedAt: new Date(config.updated_at ?? Date.now()),
    } : null,
    divisions: divisions ?? [],
    gamesCompleted: gamesCompleted ?? 0,
    teamsCount: teamsCount ?? 0,
  };
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function SeasonStandingsPage({ params }: PageProps) {
  const { seasonId } = await params;
  const data = await getSeasonData(seasonId);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
              <span>{data.league?.name}</span>
              <span>/</span>
              <span>{data.season.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-7 h-7 text-gold-500" />
              Standings
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">Teams</div>
            <div className="text-2xl font-bold text-white">{data.teamsCount}</div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">Games Completed</div>
            <div className="text-2xl font-bold text-white">{data.gamesCompleted}</div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">Points System</div>
            <div className="text-lg font-bold text-white">
              {data.config?.pointsWin ?? 2}-{data.config?.pointsTie ?? 1}-{data.config?.pointsLoss ?? 0}
            </div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">Playoff Spots</div>
            <div className="text-2xl font-bold text-gold-500">
              {data.config?.playoffTeamsTotal ?? 8}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Suspense fallback={<div className="animate-pulse bg-neutral-800 h-96 rounded-xl" />}>
          <StandingsPageClient
            seasonId={seasonId}
            leagueId={data.season.league_id}
            config={data.config}
            divisions={data.divisions}
            hasDivisions={data.divisions.length > 0}
          />
        </Suspense>
      </div>
    </div>
  );
}
