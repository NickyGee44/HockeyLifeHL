import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLeagueBySlug, getWeekGames, getWeekGameCounts, getSeasons, getVenues, getTeams } from '@/lib/data';
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
    team?: string;
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
  const { week, day, season: seasonFilter, division: divisionFilter, team: teamFilter, type: typeFilter, venue: venueFilter, status: statusFilter } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  // Parse week or default to current week
  const weekStart = week ? new Date(week) : getStartOfWeek(new Date());

  // Fetch all data in parallel
  const [seasons, venues, teams, games, gameCounts] = await Promise.all([
    getSeasons(league.id),
    getVenues(league.id),
    getTeams(league.id),
    getWeekGames(league.id, weekStart, {
      day,
      seasonId: seasonFilter,
      divisionId: divisionFilter,
      teamId: teamFilter,
      type: typeFilter,
      venue: venueFilter,
      status: statusFilter,
    }),
    getWeekGameCounts(league.id, weekStart, {
      seasonId: seasonFilter,
      divisionId: divisionFilter,
      teamId: teamFilter,
      type: typeFilter,
      venue: venueFilter,
      status: statusFilter,
    }),
  ]);

  // Build days array for WeekPicker
  const days = buildWeekDays(weekStart, gameCounts);

  // Group games by date for date-grouped rendering
  const gamesByDate = groupGamesByDate(games as ScheduleGame[]);

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--color-background)' }}>
      {/* Centered BMHL-style white card */}
      <div
        className="max-w-[1200px] mx-auto rounded-2xl shadow-xl overflow-hidden"
        style={{
          background: 'var(--color-background-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Schedule Header */}
        <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-[var(--league-primary)]" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Schedule
            </h1>
          </div>
        </div>

        {/* Filter Row */}
        <div className="px-6 md:px-8 pb-4">
          <ScheduleFilters
            seasons={seasons}
            venues={venues}
            teams={teams}
            currentFilters={{ season: seasonFilter, division: divisionFilter, team: teamFilter, type: typeFilter, venue: venueFilter, status: statusFilter }}
            leagueSlug={leagueSlug}
            weekStart={weekStart}
          />
        </div>

        {/* Weekday Summary Strip */}
        <div className="px-6 md:px-8 pb-4">
          <WeekPicker
            weekStart={weekStart}
            days={days}
            selectedDay={day || null}
            leagueSlug={leagueSlug}
          />
        </div>

        {/* Date-Grouped Game List */}
        <div className="px-6 md:px-8 pb-6 md:pb-8">
          {games.length > 0 ? (
            <div className="space-y-6">
              {Array.from(gamesByDate.entries()).map(([dateKey, dateGames]) => (
                <div key={dateKey}>
                  {/* Date Divider Header - uses league secondary color */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5 rounded-t-lg"
                    style={{
                      background: 'var(--league-secondary)',
                      color: 'var(--league-secondary-contrast)',
                    }}
                  >
                    <h2 className="text-sm font-bold uppercase tracking-wider">
                      {formatDateDivider(dateKey)}
                    </h2>
                    <span className="text-xs font-medium opacity-80">
                      {dateGames.length} {dateGames.length === 1 ? 'game' : 'games'}
                    </span>
                  </div>

                  {/* Games for this date */}
                  <ScheduleTable games={dateGames} leagueSlug={leagueSlug} showDivision />
                </div>
              ))}
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
