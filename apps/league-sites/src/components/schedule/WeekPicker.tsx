'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronDown } from 'lucide-react';
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
 * WeekPicker - compact week strip with optional month calendar expansion.
 *
 * Keeps the 7-day picker visible while giving the page a true month grid when
 * the user expands the control.
 */
export function WeekPicker({
  weekStart,
  days,
  selectedDay,
  leagueSlug,
}: WeekPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  const weekStartKey = format(weekStart, 'yyyy-MM-dd');
  const weekEndKey = format(addDays(weekStart, 6), 'yyyy-MM-dd');
  const selectedDate = selectedDay ? parseDateString(selectedDay) : null;
  const focusDate = selectedDay ? parseDateString(selectedDay) : weekStart;
  const monthStart = startOfMonth(focusDate);
  const monthEnd = endOfMonth(focusDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const countByDate = useMemo(
    () =>
      Object.fromEntries(days.map((day) => [day.date, day.gameCount])),
    [days],
  );

  const calendarDays: Date[] = [];
  let cursor = new Date(calendarStart);

  while (cursor <= calendarEnd) {
    calendarDays.push(cursor);
    cursor = addDays(cursor, 1);
  }

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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="grid grid-cols-7 gap-1.5">
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
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className={`inline-flex min-h-full w-11 items-center justify-center rounded-[18px] border bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] ${
            isExpanded
              ? 'border-[var(--league-primary)] text-[var(--league-primary)]'
              : 'border-[var(--color-border)]'
          }`}
          aria-expanded={isExpanded}
          aria-controls="schedule-month-picker"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          <span className="sr-only">
            {isExpanded ? 'Collapse month calendar' : 'Expand month calendar'}
          </span>
        </button>
      </div>

      {isExpanded && (
        <div
          id="schedule-month-picker"
          className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                {format(focusDate, 'MMMM yyyy')}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Select a date to jump to that week.
              </p>
            </div>
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Month View
            </span>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
              <div
                key={dayName}
                className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
              >
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
              const isCurrentMonth = isSameMonth(date, monthStart);
              const isInActiveWeek = dateKey >= weekStartKey && dateKey <= weekEndKey;
              const gameCount = countByDate[dateKey] || 0;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleDayClick(dateKey)}
                  className={`min-h-[84px] rounded-[18px] border p-2 text-left transition-all ${
                    isSelected
                      ? 'border-[var(--league-primary)] bg-[var(--league-primary)] text-[var(--color-accent-text)] shadow-md'
                      : isInActiveWeek
                        ? 'border-[var(--league-primary)]/30 bg-[color-mix(in_srgb,var(--league-primary)_8%,var(--color-surface))] text-[var(--color-text-primary)]'
                        : isCurrentMonth
                          ? 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--league-primary)]/40 hover:bg-[var(--color-surface-hover)]'
                          : 'border-[var(--color-border-muted)] bg-[var(--color-background)]/55 text-[var(--color-text-muted)] hover:border-[var(--color-border)]'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${format(date, 'EEEE, MMMM d')}${gameCount > 0 ? `, ${gameCount} games` : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-semibold ${isSelected ? 'text-[var(--color-accent-text)]' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    {gameCount > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isSelected
                            ? 'bg-[color-mix(in_srgb,var(--color-accent-text)_18%,transparent)] text-[var(--color-accent-text)]'
                            : 'bg-[var(--league-primary)]/10 text-[var(--league-primary)]'
                        }`}
                      >
                        {gameCount}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <span
                      className={`text-[11px] font-medium ${
                        isSelected
                          ? 'text-[var(--color-accent-text)]/80'
                          : isCurrentMonth
                            ? 'text-[var(--color-text-secondary)]'
                            : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {format(date, 'EEE')}
                    </span>
                    {isInActiveWeek && !isSelected && (
                      <span className="rounded-full bg-[var(--league-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--league-primary)]">
                        Week
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default WeekPicker;
