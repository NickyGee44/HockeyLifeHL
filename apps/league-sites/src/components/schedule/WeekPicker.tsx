'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addDays, format, startOfWeek, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WeekPickerDay } from '@/lib/types';

interface WeekPickerProps {
  weekStart: Date;
  days: WeekPickerDay[];
  selectedDay: string | null;
  leagueSlug: string;
}

function parseDateString(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function buildScheduleHref(leagueSlug: string, params: URLSearchParams) {
  const queryString = params.toString();
  return queryString ? `/${leagueSlug}/schedule?${queryString}` : `/${leagueSlug}/schedule`;
}

/**
 * WeekPicker - compact 7-day week strip for schedule navigation.
 */
export function WeekPicker({
  weekStart,
  days,
  selectedDay,
  leagueSlug,
}: WeekPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDayClick = (dayDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const targetWeekStart = startOfWeek(parseDateString(dayDate), { weekStartsOn: 1 });

    params.set('week', format(targetWeekStart, 'yyyy-MM-dd'));

    if (selectedDay === dayDate) {
      params.delete('day');
    } else {
      params.set('day', dayDate);
    }

    router.push(buildScheduleHref(leagueSlug, params));
  };

  const handlePrevWeek = () => {
    const params = new URLSearchParams(searchParams.toString());
    const prevWeek = subDays(weekStart, 7);
    params.set('week', format(prevWeek, 'yyyy-MM-dd'));
    params.delete('day');
    router.push(buildScheduleHref(leagueSlug, params));
  };

  const handleNextWeek = () => {
    const params = new URLSearchParams(searchParams.toString());
    const nextWeek = addDays(weekStart, 7);
    params.set('week', format(nextWeek, 'yyyy-MM-dd'));
    params.delete('day');
    router.push(buildScheduleHref(leagueSlug, params));
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handlePrevWeek}
        className="flex shrink-0 items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--league-primary)] hover:text-[var(--league-primary)] transition-all"
        aria-label="Previous week"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="grid flex-1 grid-cols-7 gap-1.5">
      {days.map((day) => {
        const isSelected = selectedDay === day.date;
        const hasGames = day.gameCount > 0;

        return (
          <button
            key={day.date}
            onClick={() => handleDayClick(day.date)}
            className={`relative flex flex-col items-center gap-0.5 rounded-[18px] border px-1 py-2.5 text-center transition-all ${
              isSelected
                ? 'border-[var(--league-primary)] bg-[var(--league-primary)] text-[var(--color-accent-text)] shadow-md'
                : hasGames
                  ? 'border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--league-primary)] hover:bg-[var(--color-surface-hover)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50 hover:opacity-80'
            }`}
            aria-pressed={isSelected}
            aria-label={`${day.dayName} ${day.dayNumber}, ${day.gameCount} games`}
          >
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? 'opacity-80' : ''}`}>
              {day.dayName}
            </span>

            <span className="text-lg font-bold leading-tight">
              {day.dayNumber}
            </span>

            {hasGames ? (
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold leading-tight ${
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
      <button
        onClick={handleNextWeek}
        className="flex shrink-0 items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--league-primary)] hover:text-[var(--league-primary)] transition-all"
        aria-label="Next week"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default WeekPicker;
