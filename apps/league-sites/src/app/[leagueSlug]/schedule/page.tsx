import { Metadata } from 'next';
import { getLeagueBySlug, getWeekGames, getWeekGameCounts, getSeasons, getDivisions, getCurrentSeason, getVenues } from '@/lib/data';
import { WeekPicker } from '@/components/schedule/WeekPicker';
import { ScheduleFilters } from '@/components/schedule/ScheduleFilters';
import { ScheduleTable } from '@/components/schedule/ScheduleTable';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { WeekPickerDay, ScheduleGame } from '@/lib/types';

interface SchedulePageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    week?: string;
    day?: string;
    season?: string;
    division?: string;
    type?: string;
    venue?: string;
    status?: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'View the complete game schedule',
};

/**
 * Group games by their scheduled date (YYYY-MM-DD key).
 * Returns a Map with date keys in chronological order.
 */
function groupGamesByDate(games: ScheduleGame[]): Map<string, ScheduleGame[]> {
  const grouped = new Map<string, ScheduleGame[]>();
  for (const game of games) {
    const dateKey = new Date(game.scheduled_at).toISOString().split('T')[0];
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
  const { week, day, season: seasonFilter, division: divisionFilter, type: typeFilter, venue: venueFilter, status: statusFilter } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return null;

  // Parse week or default to current week
  const weekStart = week ? new Date(week) : getStartOfWeek(new Date());

  // Fetch current season first to get divisions
  const currentSeason = await getCurrentSeason(league.id);

  // Fetch remaining data in parallel
  const [seasons, divisions, venues, games, gameCounts] = await Promise.all([
    getSeasons(league.id),
    getDivisions(league.id),
    getVenues(league.id),
    getWeekGames(league.id, weekStart, {
      day,
      seasonId: seasonFilter,
      divisionId: divisionFilter,
      type: typeFilter,
      venue: venueFilter,
      status: statusFilter,
    }),
    getWeekGameCounts(league.id, weekStart),
  ]);

  // Build days array for WeekPicker
  const days = buildWeekDays(weekStart, gameCounts);

  // Group games by date for date-grouped rendering
  const gamesByDate = groupGamesByDate(games as ScheduleGame[]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Centered BMHL-style card container */}
      <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-2xl shadow-lg max-w-5xl mx-auto p-6 md:p-8">

        {/* 1. Schedule Header Row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)]">
            Schedule
          </h1>
          <Calendar className="w-7 h-7 text-[var(--league-primary)]" />
        </div>

        {/* 2. Date Range Selector (week navigation) */}
        <DateRangeNav weekStart={weekStart} />

        {/* 3. Filter Row */}
        <ScheduleFilters
          seasons={seasons}
          divisions={divisions}
          venues={venues}
          currentFilters={{ season: seasonFilter, division: divisionFilter, type: typeFilter, venue: venueFilter, status: statusFilter }}
          leagueSlug={leagueSlug}
        />

        {/* 4. Weekday Summary Strip */}
        <WeekPicker
          weekStart={weekStart}
          days={days}
          selectedDay={day || null}
          leagueSlug={leagueSlug}
        />

        {/* 5. Date-Grouped Game List */}
        {games.length > 0 ? (
          <div className="mt-6 space-y-8">
            {Array.from(gamesByDate.entries()).map(([dateKey, dateGames]) => (
              <div key={dateKey}>
                {/* Date Divider */}
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--league-primary)] whitespace-nowrap">
                    {formatDateDivider(dateKey)}
                  </h2>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                  <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    {dateGames.length} {dateGames.length === 1 ? 'game' : 'games'}
                  </span>
                </div>

                {/* Games for this date */}
                <ScheduleTable games={dateGames} leagueSlug={leagueSlug} showDivision />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 p-12 text-center">
            <Calendar className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Games Scheduled</h3>
            <p className="text-[var(--color-text-secondary)]">
              {day ? 'No games on this day.' : 'No games this week.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * DateRangeNav - Displays the week date range with prev/next navigation arrows.
 * This is a server-rendered display; actual navigation is handled by WeekPicker.
 * Renders: "< Jan 25 - 31, 2026 >"
 */
function DateRangeNav({ weekStart }: { weekStart: Date }) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Format: "Jan 25 - 31" or "Jan 25 - Feb 1" if crossing months
  const startMonth = format(weekStart, 'MMM');
  const endMonth = format(weekEnd, 'MMM');
  const startDay = format(weekStart, 'd');
  const endDay = format(weekEnd, 'd');
  const year = format(weekEnd, 'yyyy');

  const rangeDisplay =
    startMonth === endMonth
      ? `${startMonth} ${startDay} - ${endDay}, ${year}`
      : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;

  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <span className="text-lg font-semibold text-[var(--color-text-primary)]">
        {rangeDisplay}
      </span>
    </div>
  );
}

// Helper functions
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeekDays(weekStart: Date, counts: Record<string, number>): WeekPickerDay[] {
  const days: WeekPickerDay[] = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    days.push({
      date: dateStr,
      dayName: dayNames[i],
      dayNumber: date.getDate(),
      gameCount: counts[dateStr] || 0,
    });
  }

  return days;
}
