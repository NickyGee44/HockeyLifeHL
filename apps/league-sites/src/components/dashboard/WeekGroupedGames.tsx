'use client';

import { useMemo } from 'react';

export interface GameWithCheckin {
  id: string;
  scheduled_at: string;
  location: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  } | null;
  away_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  } | null;
}

export interface WeekGroup {
  label: string;
  weekStart: Date;
  games: GameWithCheckin[];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Start weeks on Monday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekLabel(weekStart: Date): string {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  if (weekStart.getTime() === currentWeekStart.getTime()) {
    return 'This Week';
  }
  if (weekStart.getTime() === nextWeekStart.getTime()) {
    return 'Next Week';
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const monthStart = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const monthEnd = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `Week of ${monthStart} - ${monthEnd}`;
}

export function groupGamesByWeek(games: GameWithCheckin[]): WeekGroup[] {
  const groups = new Map<number, WeekGroup>();

  for (const game of games) {
    const gameDate = new Date(game.scheduled_at);
    const weekStart = getWeekStart(gameDate);
    const key = weekStart.getTime();

    if (!groups.has(key)) {
      groups.set(key, {
        label: getWeekLabel(weekStart),
        weekStart,
        games: [],
      });
    }
    groups.get(key)!.games.push(game);
  }

  return Array.from(groups.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );
}

interface WeekHeaderProps {
  label: string;
  gameCount: number;
  confirmedCount?: number;
}

export function WeekHeader({ label, gameCount, confirmedCount }: WeekHeaderProps) {
  return (
    <div className="glass-control flex items-center justify-between px-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {confirmedCount !== undefined && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {confirmedCount}/{gameCount} confirmed
          </span>
        )}
        <span className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
          {gameCount} {gameCount === 1 ? 'game' : 'games'}
        </span>
      </div>
    </div>
  );
}

export function useWeekGroupedGames(games: GameWithCheckin[]) {
  return useMemo(() => groupGamesByWeek(games), [games]);
}
