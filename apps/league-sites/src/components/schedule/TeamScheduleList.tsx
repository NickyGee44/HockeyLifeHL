'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { ScheduleGame } from '@/lib/types';

interface TeamScheduleListProps {
  games: ScheduleGame[];
  leagueSlug: string;
  timezone: string;
  teamId: string;
  collapsible?: boolean;
}

function formatDateTime(dateStr: string, timeZone: string) {
  const date = new Date(dateStr);
  return {
    weekday: new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    }).format(date),
    date: new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date),
  };
}

export function TeamScheduleList({
  games,
  leagueSlug,
  timezone,
  teamId,
  collapsible = false,
}: TeamScheduleListProps) {
  const [expanded, setExpanded] = useState(false);

  const allGames = useMemo(() => {
    return games.filter(
      (g) => g.home_team?.id === teamId || g.away_team?.id === teamId,
    );
  }, [games, teamId]);

  const visibleGames = useMemo(() => {
    if (!collapsible || expanded) return allGames;
    const completed: ScheduleGame[] = [];
    const upcoming: ScheduleGame[] = [];
    for (const g of allGames) {
      if (g.status === 'completed' || g.status === 'pending_verification') completed.push(g);
      else if (g.status === 'scheduled' || g.status === 'in_progress') upcoming.push(g);
    }
    completed.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    upcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const recentCompleted = completed.slice(0, 2).reverse();
    const nextUpcoming = upcoming.slice(0, 2);
    return [...recentCompleted, ...nextUpcoming];
  }, [allGames, collapsible, expanded]);

  const hasMore = collapsible && allGames.length > visibleGames.length;

  if (allGames.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleGames.map((game) => {
        const isCompleted = game.status === 'completed' || game.status === 'pending_verification';
        const isLive = game.status === 'in_progress';
        const { weekday, date, time } = formatDateTime(game.scheduled_at, timezone);
        const isHome = game.home_team?.id === teamId;
        const opponent = isHome ? game.away_team : game.home_team;
        const teamSide = isHome ? game.home_team : game.away_team;

        return (
          <Link
            key={game.id}
            href={`/${leagueSlug}/games/${game.id}`}
            className="group block rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 px-4 py-3 transition-colors hover:border-[var(--league-primary)]/40 hover:bg-[var(--color-surface-hover)]/50"
          >
            {/* Row 1: Team vs Opponent + score */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <TeamLogo
                  logoUrl={teamSide?.logo || null}
                  teamName={teamSide?.name || 'TBD'}
                  teamColor={teamSide?.colors}
                  size="xs"
                  className="shrink-0"
                />
                <span className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                  {teamSide?.name || 'TBD'}
                </span>
                <span className="text-xs font-bold text-[var(--color-text-muted)]">vs</span>
                <TeamLogo
                  logoUrl={opponent?.logo || null}
                  teamName={opponent?.name || 'TBD'}
                  teamColor={opponent?.colors}
                  size="xs"
                  className="shrink-0"
                />
                <span className="truncate text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)]">
                  {opponent?.name || 'TBD'}
                </span>
              </div>

              {(isCompleted || isLive) && (
                <span className={`shrink-0 text-sm font-bold tabular-nums ${isLive ? 'text-red-400' : 'text-[var(--color-text-primary)]'}`}>
                  {isHome
                    ? `${game.home_score ?? 0} - ${game.away_score ?? 0}`
                    : `${game.away_score ?? 0} - ${game.home_score ?? 0}`}
                </span>
              )}
            </div>

            {/* Row 2: Date, time, arena */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-text-secondary)]">
              <span>{weekday} {date}</span>
              {!isCompleted && <span>{time}</span>}
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400 animate-pulse">
                  LIVE
                </span>
              )}
              {isCompleted && (
                <span className="text-[11px] font-semibold uppercase text-[var(--color-text-muted)]">Final</span>
              )}
              {game.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[var(--color-text-muted)]" />
                  <span className="truncate max-w-[160px]">{game.venue}</span>
                </span>
              )}
            </div>
          </Link>
        );
      })}

      {(hasMore || (collapsible && expanded && allGames.length > 4)) && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] transition-colors hover:border-[var(--league-primary)]/40 hover:text-[var(--league-primary)]"
          >
            {expanded ? (
              <>
                Show Less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show Full Schedule <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
