'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import type { WeekPickerDay } from '@/lib/types';

interface WeekPickerProps {
  weekStart: Date;
  days: WeekPickerDay[];
  selectedDay: string | null;
  leagueSlug: string;
}

/**
 * WeekPicker - BMHL-style 7-day summary strip
 *
 * 7 equal-width bordered chips showing:
 * - Day abbreviation (Mon, Tue, ...)
 * - Date number
 * - Game count badge
 *
 * Selected day: league-primary background with inverse text
 * Days with 0 games: dimmed
 */
export function WeekPicker({
  weekStart,
  days,
  selectedDay,
  leagueSlug,
}: WeekPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const handleDayClick = (dayDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', weekStartStr);

    // Toggle day selection
    if (selectedDay === dayDate) {
      params.delete('day');
    } else {
      params.set('day', dayDate);
    }

    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const isSelected = selectedDay === day.date;
        const hasGames = day.gameCount > 0;

        return (
          <button
            key={day.date}
            onClick={() => handleDayClick(day.date)}
              className={`
              relative flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-lg transition-all text-center border
              ${isSelected
                ? 'bg-[var(--league-primary)] border-[var(--league-primary)] text-[var(--color-accent-text)] shadow-md'
                : hasGames
                  ? 'border-[var(--color-border)] hover:border-[var(--league-primary)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50 hover:opacity-75'
              }
            `}
            aria-pressed={isSelected}
            aria-label={`${day.dayName} ${day.dayNumber}, ${day.gameCount} games`}
          >
            {/* Day Name */}
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? 'opacity-80' : ''}`}>
              {day.dayName}
            </span>

            {/* Day Number */}
            <span className="text-lg font-bold leading-tight">
              {day.dayNumber}
            </span>

            {/* Game Count Badge */}
            {hasGames ? (
              <span
                className={`text-[10px] font-bold leading-tight px-1.5 rounded-full ${
                  isSelected
                    ? 'bg-[color-mix(in_srgb,var(--color-accent-text)_20%,transparent)] text-[var(--color-accent-text)]'
                    : 'bg-[var(--league-primary)]/10 text-[var(--league-primary)]'
                }`}
              >
                {day.gameCount}
              </span>
            ) : (
              <span className="text-[10px] font-medium leading-tight">-</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default WeekPicker;
