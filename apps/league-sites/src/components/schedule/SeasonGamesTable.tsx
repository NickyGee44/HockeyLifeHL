'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { ScheduleGame, Team } from '@/lib/types';

interface SeasonGamesTableProps {
  games: ScheduleGame[];
  teams: Team[];
  leagueSlug: string;
  timezone: string;
  initialTeamId?: string;
  hideFilter?: boolean;
  collapsible?: boolean;
}

function formatDateTime(dateStr: string, timeZone: string) {
  const date = new Date(dateStr);
  return {
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

export function SeasonGamesTable({
  games,
  teams,
  leagueSlug,
  timezone,
  initialTeamId = '',
  hideFilter = false,
  collapsible = false,
}: SeasonGamesTableProps) {
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [expanded, setExpanded] = useState(false);

  const allFilteredGames = useMemo(() => {
    if (!selectedTeamId) return games;
    return games.filter(
      (g) => g.home_team?.id === selectedTeamId || g.away_team?.id === selectedTeamId,
    );
  }, [games, selectedTeamId]);

  const filteredGames = useMemo(() => {
    if (!collapsible || expanded) return allFilteredGames;
    const completed: ScheduleGame[] = [];
    const upcoming: ScheduleGame[] = [];
    for (const g of allFilteredGames) {
      if (g.status === 'completed' || g.status === 'pending_verification') completed.push(g);
      else if (g.status === 'scheduled' || g.status === 'in_progress') upcoming.push(g);
    }
    // Sort completed desc (most recent first), upcoming asc (soonest first)
    completed.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    upcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    // Take last 2 completed (reversed back to chronological) + next 2 upcoming
    const recentCompleted = completed.slice(0, 2).reverse();
    const nextUpcoming = upcoming.slice(0, 2);
    return [...recentCompleted, ...nextUpcoming];
  }, [allFilteredGames, collapsible, expanded]);

  const hasMore = collapsible && allFilteredGames.length > filteredGames.length;

  if (games.length === 0) return null;

  return (
    <div>
      {/* Team filter */}
      {!hideFilter && (
        <div className="mb-4">
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
          >
            <option value="">All Teams</option>
            {teams
              .filter((t) => t.team_type !== 'free_agents' && t.team_type !== 'placeholder')
              .map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Game rows */}
      <div className="divide-y divide-[var(--color-border-muted)]">
        {filteredGames.map((game) => {
          const isCompleted = game.status === 'completed' || game.status === 'pending_verification';
          const isLive = game.status === 'in_progress';
          const { date, time } = formatDateTime(game.scheduled_at, timezone);

          const subtitleParts: string[] = [];
          subtitleParts.push(date);
          if (isLive) {
            // handled inline
          } else if (isCompleted) {
            subtitleParts.push('Final');
          } else {
            subtitleParts.push(time);
          }
          if (game.venue) subtitleParts.push(game.venue);

          return (
            <Link
              key={game.id}
              href={`/${leagueSlug}/games/${game.id}`}
              className="block px-2 py-3 transition-colors hover:bg-[var(--color-surface-hover)] md:px-4"
            >
              {/* Matchup row */}
              <div className="flex items-center gap-2 md:gap-3">
                {/* Away */}
                <div className="flex min-w-0 flex-1 items-center gap-2 justify-end">
                  <span className="text-xs font-medium leading-tight text-[var(--color-text-primary)] md:text-sm">
                    {game.away_team?.name || 'TBD'}
                  </span>
                  <TeamLogo
                    logoUrl={game.away_team?.logo || null}
                    teamName={game.away_team?.name || 'TBD'}
                    teamColor={game.away_team?.colors}
                    size="sm"
                    className="shrink-0"
                  />
                </div>

                {/* Score / vs */}
                <div className="w-16 shrink-0 text-center md:w-20">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-bold uppercase text-red-400 animate-pulse">
                      {game.away_score ?? 0}-{game.home_score ?? 0}
                    </span>
                  ) : isCompleted ? (
                    <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)] md:text-base">
                      {game.away_score ?? 0} - {game.home_score ?? 0}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[var(--color-text-muted)]">vs</span>
                  )}
                </div>

                {/* Home */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <TeamLogo
                    logoUrl={game.home_team?.logo || null}
                    teamName={game.home_team?.name || 'TBD'}
                    teamColor={game.home_team?.colors}
                    size="sm"
                    className="shrink-0"
                  />
                  <span className="text-xs font-medium leading-tight text-[var(--color-text-primary)] md:text-sm">
                    {game.home_team?.name || 'TBD'}
                  </span>
                </div>
              </div>

              {/* Subtitle: date, time, rink */}
              <div className="mt-1 text-center text-xs text-[var(--color-text-muted)]">
                {isLive ? (
                  <span>
                    <span className="font-semibold uppercase text-red-400">LIVE</span>
                    {game.venue ? <span> &middot; {game.venue}</span> : null}
                  </span>
                ) : isCompleted ? (
                  <span>
                    {date} &middot; <span className="font-semibold uppercase">Final</span>
                    {game.venue ? <span> &middot; {game.venue}</span> : null}
                  </span>
                ) : (
                  <span>
                    {date} &middot; {time}
                    {game.venue ? <span> &middot; {game.venue}</span> : null}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
          No games found for this team.
        </div>
      )}

      {(hasMore || (collapsible && expanded && allFilteredGames.length > 4)) && (
        <div className="mt-4 flex justify-center">
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
                Show All Season Games <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default SeasonGamesTable;
