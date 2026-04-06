import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SubscriptionWall } from '@/components/shared';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { getLeagueBySlug, getWeekGames, getWeekGameCounts, getCurrentSeason, getVenues, getTeams, getSeasonGames } from '@/lib/data';
import { WeekPicker } from '@/components/schedule/WeekPicker';
import { ScheduleFilters } from '@/components/schedule/ScheduleFilters';
import { SeasonGamesTable } from '@/components/schedule/SeasonGamesTable';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { WeekPickerDay, ScheduleGame } from '@/lib/types';
import { buildScheduleJsonLd } from '@/lib/jsonld';

interface SchedulePageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    week?: string;
    day?: string;
    season?: string;
    division?: string;
    team?: string;
    type?: string;
    venue?: string;
    status?: string;
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  return {
    title: 'Schedule',
    description: league
      ? `View the complete game schedule for ${league.name}`
      : 'View the complete game schedule',
  };
}

/**
 * Group games by their scheduled date (YYYY-MM-DD key).
 * Returns a Map with date keys in chronological order.
 * Converts UTC times to the league's timezone to avoid day-shift issues
 * (e.g. a 9 PM EST Thursday game stored as Friday 1am UTC should show as Thursday).
 */
function groupGamesByDate(games: ScheduleGame[], timeZone: string): Map<string, ScheduleGame[]> {
  const grouped = new Map<string, ScheduleGame[]>();

  for (const game of games) {
    // Convert UTC time to Toronto timezone
    const date = new Date(game.scheduled_at);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const dateKey = `${year}-${month}-${day}`;

    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(game);
  }
  return grouped;
}

/**
 * Format a date key (YYYY-MM-DD) into a human-readable date divider string.
 * Example: "Monday, January 26th, 2026"
 */
function formatDateDivider(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00'); // noon to avoid timezone issues
  return format(date, "EEEE, MMMM do, yyyy");
}

export default async function SchedulePage({ params, searchParams }: SchedulePageProps) {
  const { leagueSlug } = await params;
  const { week, day, season: seasonFilter, division: divisionFilter, team: teamFilter, type: typeFilter, venue: venueFilter, status: statusFilter } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  // Parse week or default to current week
  // Use parseDateString to avoid UTC midnight → local time day shift
  const weekStart = week ? parseDateString(week) : getStartOfWeek(new Date());
  const normalizedTypeFilter = normalizeScheduleGameType(typeFilter);

  // Fetch current season first to resolve the default schedule scope.
  const [defaultSeason, venues] = await Promise.all([
    getCurrentSeason(league.id),
    getVenues(league.id),
  ]);

  // Default to current season when no season filter is specified
  const selectedSeasonId = seasonFilter || defaultSeason?.id || null;

  // Fetch teams scoped to the active season so pickers only show participating teams
  const teams = await getTeams(league.id, selectedSeasonId || undefined);
  const leagueTimezone = league.timezone || 'America/Toronto';

  // Fetch games with resolved season filter
  const [games, gameCounts, seasonGames] = await Promise.all([
    getWeekGames(league.id, weekStart, {
      day,
      seasonId: selectedSeasonId || undefined,
      divisionId: divisionFilter,
      teamId: teamFilter,
      type: normalizedTypeFilter,
      venue: venueFilter,
      status: statusFilter,
      timezone: leagueTimezone,
    }),
    getWeekGameCounts(league.id, weekStart, {
      seasonId: selectedSeasonId || undefined,
      divisionId: divisionFilter,
      teamId: teamFilter,
      type: normalizedTypeFilter,
      venue: venueFilter,
      status: statusFilter,
      timezone: leagueTimezone,
    }),
    selectedSeasonId ? getSeasonGames(league.id, selectedSeasonId) : Promise.resolve([]),
  ]);

  // Build days array for WeekPicker
  const days = buildWeekDays(weekStart, gameCounts);

  // Group games by date for date-grouped rendering
  const gamesByDate = groupGamesByDate(games as ScheduleGame[], leagueTimezone);

  const scheduleJsonLd = buildScheduleJsonLd(games as ScheduleGame[], league, leagueSlug);

  return (
    <SubscriptionWall>
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--color-background)' }}>
      {/* JSON-LD Structured Data for SEO */}
      {scheduleJsonLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(scheduleJsonLd) }}
        />
      )}

      {/* Schedule Header + Filter — outside card */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 shrink-0 text-[var(--league-primary)] md:h-9 md:w-9" />
            <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] md:text-5xl">
              Schedule
            </h1>
          </div>
          <ScheduleFilters
            venues={venues}
            teams={teams}
            currentFilters={{ division: divisionFilter, team: teamFilter, type: normalizedTypeFilter, venue: venueFilter }}
            leagueSlug={leagueSlug}
          />
        </div>
      </div>

      <div className="league-reading-panel max-w-[1200px] mx-auto overflow-hidden rounded-[32px]">

        {/* Weekday Summary Strip */}
        <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4">
          <WeekPicker
            weekStart={weekStart}
            days={days}
            selectedDay={day || null}
            leagueSlug={leagueSlug}
          />
        </div>

        {/* Date-Grouped Game List — no container */}
        <div className="px-6 md:px-8 pb-6 md:pb-8">
          {games.length > 0 ? (
            <div className="space-y-4">
              {(games as ScheduleGame[]).map((game) => {
                const gameDate = new Date(game.scheduled_at);
                const dateStr = new Intl.DateTimeFormat('en-US', { timeZone: leagueTimezone, weekday: 'short', month: 'short', day: 'numeric' }).format(gameDate);
                const timeStr = new Intl.DateTimeFormat('en-US', { timeZone: leagueTimezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(gameDate);
                const isCompleted = game.status === 'completed' || game.status === 'pending_verification';
                const isLive = game.status === 'in_progress';
                return (
                  <Link key={game.id} href={`/${leagueSlug}/games/${game.id}`} className="block group">
                    {/* Date / Time / Location header */}
                    <div className="flex items-center gap-2 mb-1 text-xs text-[var(--color-text-muted)]">
                      <span className="font-semibold">{dateStr}</span>
                      <span>·</span>
                      {isLive ? (
                        <span className="font-bold text-red-400 uppercase animate-pulse">LIVE</span>
                      ) : isCompleted ? (
                        <span className="font-semibold uppercase">Final</span>
                      ) : (
                        <span>{timeStr}</span>
                      )}
                      {game.venue && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[200px]">{game.venue}</span>
                        </>
                      )}
                    </div>
                    {/* Teams */}
                    <div className="flex items-center gap-3">
                      <TeamLogo logoUrl={game.away_team?.logo || null} teamName={game.away_team?.name || 'TBD'} teamColor={game.away_team?.colors} size="md" className="shrink-0" />
                      <span className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)] transition-colors">{game.away_team?.name || 'TBD'}</span>
                      {(isCompleted || isLive) && (
                        <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{game.away_score ?? 0}</span>
                      )}
                      <span className="text-xs text-[var(--color-text-muted)] font-bold">vs</span>
                      {(isCompleted || isLive) && (
                        <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{game.home_score ?? 0}</span>
                      )}
                      <span className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)] transition-colors">{game.home_team?.name || 'TBD'}</span>
                      <TeamLogo logoUrl={game.home_team?.logo || null} teamName={game.home_team?.name || 'TBD'} teamColor={game.home_team?.colors} size="md" className="shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Calendar className="w-14 h-14 text-[var(--color-text-muted)] mx-auto mb-4 opacity-40" />
              <h3 className="text-xl font-bold mb-2 text-[var(--color-text-primary)]">No Games Scheduled</h3>
              <p className="text-[var(--color-text-secondary)]">
                {day ? 'No games on this day.' : 'No games this week. Try selecting a different week.'}
              </p>
            </div>
          )}
        </div>

      </div>

        {/* Season Games — own card */}
        {seasonGames.length > 0 && (
          <div className="league-reading-panel max-w-[1200px] mx-auto overflow-hidden rounded-[32px] mt-6">
            <div className="px-6 md:px-8 py-6 md:py-8">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Season Games</h2>
              <SeasonGamesTable
                games={seasonGames as ScheduleGame[]}
                teams={teams}
                leagueSlug={leagueSlug}
                timezone={leagueTimezone}
              />
            </div>
          </div>
        )}
    </div>
    </SubscriptionWall>
  );
}

// Helper functions

/**
 * Parse a YYYY-MM-DD string into a Date at local noon to avoid timezone
 * boundary issues (midnight UTC can shift to the previous day in local time).
 */
function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

function buildWeekDays(weekStart: Date, counts: Record<string, number>): WeekPickerDay[] {
  const days: WeekPickerDay[] = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = format(date, 'yyyy-MM-dd');

    days.push({
      date: dateStr,
      dayName: dayNames[i],
      dayNumber: date.getDate(),
      gameCount: counts[dateStr] || 0,
    });
  }

  return days;
}

function normalizeScheduleGameType(type?: string) {
  return type === 'playoffs' ? 'playoff' : type;
}
