import { Metadata } from 'next';
import { getLeagueBySlug, getWeekGames, getWeekGameCounts, getSeasons, getDivisions, getCurrentSeason } from '@/lib/data';
import { WeekPicker } from '@/components/schedule/WeekPicker';
import { ScheduleFilters } from '@/components/schedule/ScheduleFilters';
import { ScheduleTable } from '@/components/schedule/ScheduleTable';
import { Calendar } from 'lucide-react';
import type { WeekPickerDay } from '@/lib/types';

interface SchedulePageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    week?: string;
    day?: string;
    season?: string;
    division?: string;
    type?: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'View the complete game schedule',
};

export default async function SchedulePage({ params, searchParams }: SchedulePageProps) {
  const { leagueSlug } = await params;
  const { week, day, season: seasonFilter, division: divisionFilter, type: typeFilter } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return null;

  // Parse week or default to current week
  const weekStart = week ? new Date(week) : getStartOfWeek(new Date());

  // Fetch current season first to get divisions
  const currentSeason = await getCurrentSeason(league.id);

  // Fetch remaining data in parallel
  const [seasons, divisions, games, gameCounts] = await Promise.all([
    getSeasons(league.id),
    currentSeason ? getDivisions(currentSeason.id) : Promise.resolve([]),
    getWeekGames(league.id, weekStart, {
      day,
      seasonId: seasonFilter,
      divisionId: divisionFilter,
      type: typeFilter,
    }),
    getWeekGameCounts(league.id, weekStart),
  ]);

  // Build days array for WeekPicker
  const days = buildWeekDays(weekStart, gameCounts);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-[var(--league-primary)]" />
          Schedule
        </h1>
        {currentSeason && (
          <p className="text-[var(--color-text-secondary)]">{currentSeason.name}</p>
        )}
      </div>

      {/* Week Picker */}
      <WeekPicker
        weekStart={weekStart}
        days={days}
        selectedDay={day || null}
        leagueSlug={leagueSlug}
      />

      {/* Filters */}
      <ScheduleFilters
        seasons={seasons}
        divisions={divisions}
        currentFilters={{ season: seasonFilter, division: divisionFilter, type: typeFilter }}
        leagueSlug={leagueSlug}
      />

      {/* Schedule Table */}
      {games.length > 0 ? (
        <ScheduleTable games={games} leagueSlug={leagueSlug} showDivision />
      ) : (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Games Scheduled</h3>
          <p className="text-[var(--color-text-secondary)]">
            {day ? 'No games on this day.' : 'No games this week.'}
          </p>
        </div>
      )}
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
