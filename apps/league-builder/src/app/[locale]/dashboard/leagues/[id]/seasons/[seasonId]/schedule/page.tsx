import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SchedulePageClient } from '@/components/dashboard/seasons/SchedulePageClient';
import { getSeasonParticipationTeamIds } from '@/lib/seasons/team-participation';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Calendar } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
  searchParams: Promise<{ tool?: string }>;
};

export default async function SeasonSchedulePage({ params, searchParams }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  const { tool } = await searchParams;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });
  const serviceClient = createServiceRoleClient();

  // Get league info
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) notFound();

  // Get season data
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', seasonId)
    .single();

  if (seasonError || !season) notFound();

  const seasonTeamIds = await getSeasonParticipationTeamIds(
    serviceClient,
    leagueId,
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
        .eq('league_id', leagueId)
        .neq('status', 'inactive')
        .order('name');

  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, address, number_of_rinks')
    .eq('league_id', leagueId)
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
    .eq('league_id', leagueId)
    .order('is_default', { ascending: false });

  const FALLBACK_DATE = '1970-01-01T00:00:00.000Z';

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
              <span>{league.name}</span>
              <span>/</span>
              <span>{season.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Calendar className="w-7 h-7 text-rink-500" />
              Schedule Management
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {(season as any).schedule_generated && (
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
            <div className="text-2xl font-bold text-white">{(teams ?? []).length}</div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">Games Scheduled</div>
            <div className="text-2xl font-bold text-white">{(games ?? []).length}</div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">Start Date</div>
            <div className="text-lg font-bold text-white">
              {season.start_date
                ? new Date(season.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Not Set'}
            </div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
            <div className="text-sm text-neutral-400">End Date</div>
            <div className="text-lg font-bold text-white">
              {season.end_date
                ? new Date(season.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Not Set'}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Suspense fallback={<div className="animate-pulse bg-neutral-800 h-96 rounded-xl" />}>
          <SchedulePageClient
            seasonId={seasonId}
            leagueId={leagueId}
            teams={(teams ?? []).map((t: any) => ({
              id: t.id,
              name: t.name,
              shortName: t.short_name,
              divisionId: t.division_id,
              homeVenueId: t.home_venue_id,
            }))}
            venues={(venues ?? []).map((v: any) => ({
              id: v.id,
              name: v.name,
              address: v.address ?? '',
              numberOfRinks: v.number_of_rinks ?? 1,
            }))}
            existingGames={(games ?? []).map((g: any) => ({
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
            templates={(templates ?? []).map((t: any) => ({
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
              startDate: new Date(season.start_date ?? FALLBACK_DATE),
              endDate: new Date(season.end_date ?? FALLBACK_DATE),
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
            startDate={new Date(season.start_date ?? FALLBACK_DATE)}
            endDate={new Date(season.end_date ?? FALLBACK_DATE)}
            hasExistingSchedule={(season as any).schedule_generated ?? false}
            defaultImportOpen={tool === 'import-schedule'}
          />
        </Suspense>
      </div>
    </div>
  );
}
