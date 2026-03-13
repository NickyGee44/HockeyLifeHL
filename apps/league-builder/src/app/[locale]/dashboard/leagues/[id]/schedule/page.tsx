import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { SchedulePageClient } from '@/components/dashboard/seasons/SchedulePageClient';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { pickOperationalSeason } from '@/lib/seasons/operational';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSeasonParticipationTeamIds } from '@/lib/seasons/team-participation';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ season?: string; tool?: string }>;
};

async function getSeasonScheduleData(supabase: any, serviceClient: any, seasonId: string) {
  const { data: season, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', seasonId)
    .single();

  if (error || !season) return null;

  const seasonTeamIds = await getSeasonParticipationTeamIds(
    serviceClient,
    season.league_id,
    seasonId
  );

  const { data: teams } = seasonTeamIds.length > 0
    ? await supabase
        .from('teams')
        .select('id, name, short_name, division_id, home_venue_id')
        .in('id', seasonTeamIds)
        .order('name')
    : await supabase
        .from('teams')
        .select('id, name, short_name, division_id, home_venue_id')
        .eq('league_id', season.league_id)
        .neq('status', 'inactive')
        .order('name');

  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, address, number_of_rinks')
    .eq('league_id', season.league_id)
    .order('name');

  const { data: games } = await supabase
    .from('games')
    .select(`
      id, home_team_id, away_team_id, scheduled_at, location,
      status, round_number, game_number, home_score, away_score
    `)
    .eq('season_id', seasonId)
    .order('scheduled_at');

  const { data: templates } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('league_id', season.league_id)
    .order('is_default', { ascending: false });

  return {
    season,
    teams: teams ?? [],
    venues: venues ?? [],
    games: games ?? [],
    templates: templates ?? [],
  };
}

export default async function LeagueSchedulePage({ params, searchParams }: Props) {
  const awaited = await params;
  const awaitedSearch = await searchParams;
  const { locale, id: leagueId } = awaited;
  const { season: seasonParam, tool } = awaitedSearch;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });
  const serviceClient = createServiceRoleClient();

  // Get league details with seasons
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      primary_color,
      seasons (
        id,
        name,
        status,
        start_date,
        end_date
      )
    `)
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[Schedule Page] Error fetching league:', leagueError?.message);
    notFound();
  }

  // Get upcoming games
  const { data: upcomingGames } = await supabase
    .from('games')
    .select(`
      id,
      scheduled_at,
      status,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey (id, name, short_name, primary_color),
      away_team:teams!games_away_team_id_fkey (id, name, short_name, primary_color),
      venue:venues (id, name)
    `)
    .eq('league_id', leagueId)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(10);

  const activeSeason = pickOperationalSeason((league.seasons as any[]) ?? []);

  // If a specific season is selected via ?season= param, show the season schedule management view
  if (seasonParam) {
    const seasonData = await getSeasonScheduleData(supabase, serviceClient, seasonParam);
    if (seasonData) {
      const FALLBACK_DATE = '1970-01-01T00:00:00.000Z';
      return (
        <div className="min-h-screen bg-neutral-950">
          <div className="container mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <Link
                  href={`/${locale}/dashboard/leagues/${leagueId}/schedule`}
                  className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All Seasons
                </Link>
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                  <span>{league.name}</span>
                  <span>/</span>
                  <span>{seasonData.season.name}</span>
                </div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Calendar className="w-7 h-7 text-rink-500" />
                  Schedule Management
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {seasonData.season.schedule_generated && (
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
                <div className="text-2xl font-bold text-white">{seasonData.teams.length}</div>
              </div>
              <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                <div className="text-sm text-neutral-400">Games Scheduled</div>
                <div className="text-2xl font-bold text-white">{seasonData.games.length}</div>
              </div>
              <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                <div className="text-sm text-neutral-400">Start Date</div>
                <div className="text-lg font-bold text-white">
                  {seasonData.season.start_date
                    ? new Date(seasonData.season.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Not Set'}
                </div>
              </div>
              <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                <div className="text-sm text-neutral-400">End Date</div>
                <div className="text-lg font-bold text-white">
                  {seasonData.season.end_date
                    ? new Date(seasonData.season.end_date).toLocaleDateString('en-US', {
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
                seasonId={seasonParam}
                leagueId={leagueId}
                teams={seasonData.teams.map((t: any) => ({
                  id: t.id,
                  name: t.name,
                  shortName: t.short_name,
                  divisionId: t.division_id,
                  homeVenueId: t.home_venue_id,
                }))}
                venues={seasonData.venues.map((v: any) => ({
                  id: v.id,
                  name: v.name,
                  address: v.address ?? '',
                  numberOfRinks: v.number_of_rinks ?? 1,
                }))}
                existingGames={seasonData.games.map((g: any) => ({
                  id: g.id,
                  homeTeamId: g.home_team_id,
                  awayTeamId: g.away_team_id,
                  scheduledAt: new Date(g.scheduled_at),
                  location: g.location ?? 'TBD',
                  venueId: null,
                  roundNumber: g.round_number ?? 1,
                  gameNumber: g.game_number ?? 1,
                  status: g.status ?? 'scheduled',
                  homeScore: g.home_score ?? null,
                  awayScore: g.away_score ?? null,
                }))}
                templates={seasonData.templates.map((t: any) => ({
                  id: t.id,
                  leagueId: t.league_id,
                  name: t.name,
                  description: t.description,
                  scheduleType: t.schedule_type as 'round_robin' | 'double_round_robin' | 'custom',
                  gamesPerTeam: t.games_per_team,
                  allowBackToBack: t.allow_back_to_back,
                  homeAwayBalance: t.home_away_balance,
                  divisionGamesRatio: t.division_games_ratio ?? 0.6,
                  divisionAware: true,
                  crossDivisionGamesPerTeam: 2,
                  gameDays: (t.default_game_days as number[]) ?? [1, 3],
                  gameTimes: (t.default_game_times as string[]) ?? ['19:00', '20:30'],
                  gameDurationMinutes: t.default_game_duration_minutes ?? 60,
                  startDate: new Date(seasonData.season.start_date ?? FALLBACK_DATE),
                  endDate: new Date(seasonData.season.end_date ?? FALLBACK_DATE),
                  allowByeWeeks: false,
                  byeWeeksPerTeam: 1,
                  defaultVenueId: t.default_venue_id,
                  rotateHomeVenue: t.rotate_home_venue ?? true,
                  playoffFormat: 'none' as const,
                  playoffTeams: 8,
                  isDefault: t.is_default ?? false,
                  createdAt: new Date(t.created_at ?? FALLBACK_DATE),
                  updatedAt: new Date(t.updated_at ?? FALLBACK_DATE),
                }))}
                startDate={new Date(seasonData.season.start_date ?? FALLBACK_DATE)}
                endDate={new Date(seasonData.season.end_date ?? FALLBACK_DATE)}
                hasExistingSchedule={seasonData.season.schedule_generated ?? false}
                defaultImportOpen={tool === 'import-schedule'}
              />
            </Suspense>
          </div>
        </div>
      );
    }
  }

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
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Schedule</h1>
              <p className="text-neutral-400 mt-1">
                View and manage game schedules for {league.name}
              </p>
            </div>

            {activeSeason && (
              <Link
                href={`/${locale}/dashboard/leagues/${leagueId}/schedule?season=${activeSeason.id}`}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
                )}
              >
                <Plus className="w-4 h-4" />
                Generate Schedule
              </Link>
            )}
          </div>
        </div>

        {/* Season Selection */}
        {league.seasons && league.seasons.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Seasons</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {league.seasons.map((season: any) => (
                <Link
                  key={season.id}
                  href={`/${locale}/dashboard/leagues/${leagueId}/schedule?season=${season.id}`}
                  className={cn(
                    'flex items-center justify-between p-5 rounded-xl transition-all',
                    'bg-white/[0.04] border border-white/10 hover:border-rink-500/50',
                    activeSeason?.id === season.id && 'border-rink-500/30 bg-rink-500/5'
                  )}
                >
                  <div>
                    <h3 className="font-semibold text-white">{season.name}</h3>
                    <p className="text-sm text-neutral-500">
                      {new Date(season.start_date).toLocaleDateString()} - {' '}
                      {season.end_date ? new Date(season.end_date).toLocaleDateString() : 'Ongoing'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2.5 py-1 text-xs font-semibold rounded-full border',
                        season.status === 'active'
                          ? 'bg-green-500/10 text-green-500 border-green-500/30'
                          : season.status === 'playoffs'
                            ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      )}
                    >
                      {season.status}
                    </span>
                    <ChevronRight className="w-5 h-5 text-neutral-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center mb-8">
            <Calendar className="w-16 h-16 text-rink-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Seasons Yet</h3>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              Create a season first to start generating schedules
            </p>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/seasons/new`}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-4 h-4" />
              Create Season
            </Link>
          </div>
        )}

        {/* Upcoming Games */}
        {upcomingGames && upcomingGames.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Upcoming Games</h2>
            <div className="space-y-3">
              {upcomingGames.map((game: any) => (
                <GameCard key={game.id} game={game} locale={locale} leagueId={leagueId} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GameCard({
  game,
  locale,
  leagueId,
}: {
  game: any;
  locale: string;
  leagueId: string;
}) {
  const gameDate = new Date(game.scheduled_at);

  return (
    <Link
      href={`/${locale}/dashboard/leagues/${leagueId}/games/${game.id}`}
      className="flex items-center gap-4 p-4 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 transition-colors"
    >
      {/* Date/Time */}
      <div className="text-center min-w-[80px]">
        <p className="text-2xl font-bold text-white">
          {gameDate.getDate()}
        </p>
        <p className="text-sm text-neutral-500">
          {gameDate.toLocaleDateString('en-US', { month: 'short' })}
        </p>
      </div>

      {/* Teams */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: game.home_team?.primary_color || '#22D3EE' }}
          >
            {game.home_team?.short_name || 'H'}
          </div>
          <span className="font-medium text-white">{game.home_team?.name || 'Home Team'}</span>
          <span className="text-neutral-500">vs</span>
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: game.away_team?.primary_color || '#3B82F6' }}
          >
            {game.away_team?.short_name || 'A'}
          </div>
          <span className="font-medium text-white">{game.away_team?.name || 'Away Team'}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
          {game.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {game.venue.name}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <span
        className={cn(
          'px-3 py-1.5 text-xs font-semibold rounded-full border',
          game.status === 'scheduled'
            ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
            : game.status === 'completed'
            ? 'bg-green-500/10 text-green-500 border-green-500/30'
            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
        )}
      >
        {game.status}
      </span>
    </Link>
  );
}
