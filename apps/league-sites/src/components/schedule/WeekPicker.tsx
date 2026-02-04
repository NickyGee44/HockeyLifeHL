'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import type { WeekPickerDay } from '@/lib/types';

interface WeekPickerProps {
  weekStart: Date;
  days: WeekPickerDay[];
  selectedDay: string | null;
  leagueSlug: string;
}

// Shared props for sub-components
interface WeekRangeNavProps {
  weekStart: Date;
  leagueSlug: string;
}

interface WeekDaySummaryProps {
  weekStart: Date;
  days: WeekPickerDay[];
  selectedDay: string | null;
  leagueSlug: string;
}

/**
 * WeekRangeNav - Date range header with prev/next arrows
 *
 * Displays:  < prev   Jan 25 - 31, 2026   next >
 *
 * Prominent, standalone navigation row for week selection.
 */
export function WeekRangeNav({ weekStart, leagueSlug }: WeekRangeNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const weekEnd = addDays(weekStart, 6);

  // Format week range display
  // If same month: "Jan 25 - 31, 2026"
  // If different months: "Jan 25 - Feb 1, 2026"
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekRangeDisplay = sameMonth
    ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`
    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  const handlePrevWeek = () => {
    const prevWeek = subDays(weekStart, 7);
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', format(prevWeek, 'yyyy-MM-dd'));
    params.delete('day');
    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  };

  const handleNextWeek = () => {
    const nextWeek = addDays(weekStart, 7);
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', format(nextWeek, 'yyyy-MM-dd'));
    params.delete('day');
    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between py-3 px-4">
      <button
        onClick={handlePrevWeek}
        className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]"
        aria-label="Previous week"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Prev</span>
      </button>

      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
        {weekRangeDisplay}
      </h2>

      <button
        onClick={handleNextWeek}
        className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]"
        aria-label="Next week"
      >
        <span className="text-sm font-medium">Next</span>
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

/**
 * WeekDaySummary - 7-day summary strip showing day, date, and game counts
 *
 * Each day shows:
 * - Day abbreviation (Mon, Tue, ...)
 * - Date number
 * - Game count ("6 gm")
 *
 * Selected day: bg-[var(--league-primary)] with inverse text
 * Days with 0 games: dimmed opacity
 */
export function WeekDaySummary({
  weekStart,
  days,
  selectedDay,
  leagueSlug,
}: WeekDaySummaryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const handleDayClick = (dayDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', weekStartStr);

    // Toggle day selection - if clicking the same day, deselect it
    if (selectedDay === dayDate) {
      params.delete('day');
    } else {
      params.set('day', dayDate);
    }

    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-7 gap-1 px-2 pb-3">
      {days.map((day) => {
        const isSelected = selectedDay === day.date;
        const hasGames = day.gameCount > 0;

        return (
          <button
            key={day.date}
            onClick={() => handleDayClick(day.date)}
            className={`
              flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all text-center
              ${isSelected
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : hasGames
                  ? 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] opacity-50 hover:opacity-75'
              }
            `}
            aria-pressed={isSelected}
            aria-label={`${day.dayName} ${day.dayNumber}, ${day.gameCount} games`}
          >
            {/* Day Name */}
            <span className="text-[11px] font-medium uppercase tracking-wide">
              {day.dayName}
            </span>

            {/* Day Number */}
            <span className="text-lg font-bold leading-tight">
              {day.dayNumber}
            </span>

            {/* Game Count */}
            <span
              className={`
                text-[10px] font-medium leading-tight
                ${isSelected
                  ? 'text-[var(--color-accent-text)] opacity-80'
                  : hasGames
                    ? 'text-[var(--color-text-secondary)]'
                    : 'text-[var(--color-text-muted)]'
                }
              `}
            >
              {day.gameCount > 0 ? `${day.gameCount} gm` : '0 gm'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * WeekPicker - Combined wrapper for backward compatibility
 *
 * Renders both WeekRangeNav (date range header with arrows) and
 * WeekDaySummary (7-day summary strip with game counts).
 */
export function WeekPicker({
  weekStart,
  days,
  selectedDay,
  leagueSlug,
}: WeekPickerProps) {
  return (
    <div className="card mb-6">
      <WeekRangeNav weekStart={weekStart} leagueSlug={leagueSlug} />
      <WeekDaySummary
        weekStart={weekStart}
        days={days}
        selectedDay={selectedDay}
        leagueSlug={leagueSlug}
      />
    </div>
  );
}

export default WeekPicker;
