/**
 * Season Schedule Page
 *
 * Dashboard page for generating and managing a season's schedule.
 */

import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { SchedulePageClient } from './SchedulePageClient';

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

  // Get teams for this league
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, division_id, home_venue_id')
    .eq('league_id', season.league_id)
    .eq('status', 'active')
    .order('name');

  // Get venues for this league
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, address, number_of_rinks')
    .eq('league_id', season.league_id)
    .order('name');

  // Get existing games for this season
  const { data: games } = await supabase
    .from('games')
    .select(`
      id,
      home_team_id,
      away_team_id,
      scheduled_at,
      location,
      status,
      round_number,
      game_number,
      home_score,
      away_score
    `)
    .eq('season_id', seasonId)
    .order('scheduled_at');

  // Get schedule templates
  const { data: templates } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('league_id', season.league_id)
    .order('is_default', { ascending: false });

  return {
    season,
    league: season.league,
    teams: teams ?? [],
    venues: venues ?? [],
    games: games ?? [],
    templates: templates ?? [],
  };
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function SeasonSchedulePage({ params }: PageProps) {
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
              <Calendar className="w-7 h-7 text-gold-500" />
              Schedule Management
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {data.season.schedule_generated && (
              <span className="px-3 py-1 bg-green-500/10 text-green-400 text-sm rounded-full">
                Schedule Generated
              </span>
            )}
          </div>
        </div>

        {/* Schedule Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">Teams</div>
            <div className="text-2xl font-bold text-white">{data.teams.length}</div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">Games Scheduled</div>
            <div className="text-2xl font-bold text-white">{data.games.length}</div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">Start Date</div>
            <div className="text-lg font-bold text-white">
              {data.season.start_date
                ? new Date(data.season.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Not Set'}
            </div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">End Date</div>
            <div className="text-lg font-bold text-white">
              {data.season.end_date
                ? new Date(data.season.end_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Not Set'}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Suspense fallback={<div className="animate-pulse bg-neutral-800 h-96 rounded-xl" />}>
          <SchedulePageClient
            seasonId={seasonId}
            leagueId={data.season.league_id}
            teams={data.teams.map((t) => ({
              id: t.id,
              name: t.name,
              shortName: t.short_name,
              divisionId: t.division_id,
              homeVenueId: t.home_venue_id,
            }))}
            venues={data.venues.map((v) => ({
              id: v.id,
              name: v.name,
              address: v.address ?? '',
              numberOfRinks: v.number_of_rinks ?? 1,
            }))}
            existingGames={data.games.map((g) => ({
              id: g.id,
              homeTeamId: g.home_team_id,
              awayTeamId: g.away_team_id,
              scheduledAt: new Date(g.scheduled_at),
              location: g.location ?? 'TBD',
              venueId: null,
              roundNumber: g.round_number ?? 1,
              gameNumber: g.game_number ?? 1,
            }))}
            templates={data.templates.map((t) => ({
              id: t.id,
              leagueId: t.league_id,
              name: t.name,
              description: t.description,
              scheduleType: t.schedule_type as 'round_robin' | 'double_round_robin' | 'custom',
              gamesPerTeam: t.games_per_team,
              allowBackToBack: t.allow_back_to_back,
              homeAwayBalance: t.home_away_balance,
              divisionGamesRatio: t.division_games_ratio ?? 0.6,
              gameDays: (t.default_game_days as number[]) ?? [1, 3],
              gameTimes: (t.default_game_times as string[]) ?? ['19:00', '20:30'],
              gameDurationMinutes: t.default_game_duration_minutes ?? 60,
              startDate: new Date(data.season.start_date ?? Date.now()),
              endDate: new Date(data.season.end_date ?? Date.now()),
              defaultVenueId: t.default_venue_id,
              rotateHomeVenue: t.rotate_home_venue ?? true,
              isDefault: t.is_default ?? false,
              createdAt: new Date(t.created_at ?? Date.now()),
              updatedAt: new Date(t.updated_at ?? Date.now()),
            }))}
            startDate={new Date(data.season.start_date ?? Date.now())}
            endDate={new Date(data.season.end_date ?? Date.now())}
            hasExistingSchedule={data.season.schedule_generated ?? false}
          />
        </Suspense>
      </div>
    </div>
  );
}
