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

/**
 * WeekPicker - Week navigation with day tabs for schedule
 *
 * BMHL-style week picker with prev/next arrows and day tabs showing game counts.
 * Uses URL-driven state via searchParams for shareable URLs.
 */
export function WeekPicker({
  weekStart,
  days,
  selectedDay,
  leagueSlug,
}: WeekPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Format week start for the URL (YYYY-MM-DD)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  // Navigate to previous week
  const handlePrevWeek = () => {
    const prevWeek = subDays(weekStart, 7);
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', format(prevWeek, 'yyyy-MM-dd'));
    params.delete('day'); // Clear day selection when changing weeks
    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  };

  // Navigate to next week
  const handleNextWeek = () => {
    const nextWeek = addDays(weekStart, 7);
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', format(nextWeek, 'yyyy-MM-dd'));
    params.delete('day'); // Clear day selection when changing weeks
    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  };

  // Select a day
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

  // Format the week range for display
  const weekEnd = addDays(weekStart, 6);
  const weekRangeDisplay = format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d, yyyy');

  return (
    <div className="card p-4 mb-6">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevWeek}
          className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-medium">Prev</span>
        </button>

        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {weekRangeDisplay}
        </h2>

        <button
          onClick={handleNextWeek}
          className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]"
          aria-label="Next week"
        >
          <span className="hidden sm:inline text-sm font-medium">Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => {
          const isSelected = selectedDay === day.date;
          const hasGames = day.gameCount > 0;

          return (
            <button
              key={day.date}
              onClick={() => handleDayClick(day.date)}
              className={`
                flex-1 min-w-[60px] flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all
                ${isSelected
                  ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                  : hasGames
                    ? 'bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-active)] text-[var(--color-text-primary)]'
                    : 'bg-transparent hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`${day.dayName} ${day.dayNumber}, ${day.gameCount} games`}
            >
              {/* Day Name */}
              <span className="text-xs font-medium uppercase tracking-wide">
                {day.dayName}
              </span>

              {/* Day Number */}
              <span className="text-lg font-bold">
                {day.dayNumber}
              </span>

              {/* Game Count Badge */}
              {day.gameCount > 0 && (
                <span
                  className={`
                    text-xs font-semibold px-2 py-0.5 rounded-full
                    ${isSelected
                      ? 'bg-[var(--color-accent-text)] text-[var(--league-primary)]'
                      : 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                    }
                  `}
                >
                  {day.gameCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default WeekPicker;
