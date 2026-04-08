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

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr
              className="text-[var(--color-text-muted)]"
              style={{
                background: 'color-mix(in srgb, var(--color-background-elevated) 92%, var(--color-surface) 8%)',
              }}
            >
              <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider">Away</th>
              <th className="text-center py-2 px-2 text-xs font-semibold uppercase tracking-wider w-[30px]" />
              <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider">Home</th>
              <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider w-[120px]">Date & Time</th>
              <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider w-[150px]">Location</th>
            </tr>
          </thead>
          <tbody>
            {filteredGames.map((game, i) => {
              const isCompleted = game.status === 'completed' || game.status === 'pending_verification';
              const isLive = game.status === 'in_progress';
              const { date, time } = formatDateTime(game.scheduled_at, timezone);

              return (
                <tr
                  key={game.id}
                  className={`hover:bg-[var(--color-surface-hover)] transition-colors ${
                    i < filteredGames.length - 1 ? 'border-b border-[var(--color-border-muted)]' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/${leagueSlug}/games/${game.id}`}
                      className="flex items-center gap-2 hover:text-[var(--league-primary)] transition-colors"
                    >
                      <TeamLogo
                        logoUrl={game.away_team?.logo || null}
                        teamName={game.away_team?.name || 'TBD'}
                        teamColor={game.away_team?.colors}
                        size="sm"
                        className="shrink-0"
                      />
                      <span className="text-sm font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                        {game.away_team?.name || 'TBD'}
                      </span>
                    </Link>
                  </td>

                  <td className="py-3 px-2 text-center">
                    {isCompleted || isLive ? (
                      <Link
                        href={`/${leagueSlug}/games/${game.id}`}
                        className="text-sm font-bold tabular-nums text-[var(--color-text-primary)] hover:text-[var(--league-primary)]"
                      >
                        {game.away_score ?? 0} - {game.home_score ?? 0}
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)] font-bold">vs</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <Link
                      href={`/${leagueSlug}/games/${game.id}`}
                      className="flex items-center gap-2 hover:text-[var(--league-primary)] transition-colors"
                    >
                      <TeamLogo
                        logoUrl={game.home_team?.logo || null}
                        teamName={game.home_team?.name || 'TBD'}
                        teamColor={game.home_team?.colors}
                        size="sm"
                        className="shrink-0"
                      />
                      <span className="text-sm font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                        {game.home_team?.name || 'TBD'}
                      </span>
                    </Link>
                  </td>

                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full text-xs font-bold uppercase animate-pulse">
                        LIVE
                      </span>
                    ) : isCompleted ? (
                      <div>
                        <span className="text-sm text-[var(--color-text-primary)]">{date}</span>
                        <span className="block text-[11px] text-[var(--color-text-muted)] font-semibold uppercase">Final</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm text-[var(--color-text-primary)]">{date}</span>
                        <span className="block text-xs text-[var(--color-text-secondary)]">{time}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <span className="text-sm text-[var(--color-text-secondary)] truncate block max-w-[150px]">
                      {game.venue || 'TBD'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile table - horizontally scrollable */}
      <div className="md:hidden overflow-x-auto -mx-2">
        <table className="w-full min-w-[500px] border-collapse">
          <thead>
            <tr
              className="text-[var(--color-text-muted)]"
              style={{
                background: 'color-mix(in srgb, var(--color-background-elevated) 92%, var(--color-surface) 8%)',
              }}
            >
              <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wider">Away</th>
              <th className="text-center py-2 px-1 text-[11px] font-semibold uppercase tracking-wider w-[24px]" />
              <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wider">Home</th>
              <th className="text-center py-2 px-2 text-[11px] font-semibold uppercase tracking-wider">Date</th>
              <th className="text-left py-2 px-2 text-[11px] font-semibold uppercase tracking-wider">Rink</th>
            </tr>
          </thead>
          <tbody>
            {filteredGames.map((game, i) => {
              const isCompleted = game.status === 'completed' || game.status === 'pending_verification';
              const isLive = game.status === 'in_progress';
              const { date, time } = formatDateTime(game.scheduled_at, timezone);

              return (
                <tr
                  key={game.id}
                  className={`${
                    i < filteredGames.length - 1 ? 'border-b border-[var(--color-border-muted)]' : ''
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <Link href={`/${leagueSlug}/games/${game.id}`} className="flex items-center gap-1.5">
                      <TeamLogo
                        logoUrl={game.away_team?.logo || null}
                        teamName={game.away_team?.name || 'TBD'}
                        teamColor={game.away_team?.colors}
                        size="xs"
                        className="shrink-0"
                      />
                      <span className="text-xs font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                        {game.away_team?.name || 'TBD'}
                      </span>
                    </Link>
                  </td>

                  <td className="py-2.5 px-1 text-center">
                    {isCompleted || isLive ? (
                      <span className="text-[11px] font-bold tabular-nums text-[var(--color-text-primary)]">
                        {game.away_score ?? 0}-{game.home_score ?? 0}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--color-text-muted)] font-bold">vs</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3">
                    <Link href={`/${leagueSlug}/games/${game.id}`} className="flex items-center gap-1.5">
                      <TeamLogo
                        logoUrl={game.home_team?.logo || null}
                        teamName={game.home_team?.name || 'TBD'}
                        teamColor={game.home_team?.colors}
                        size="xs"
                        className="shrink-0"
                      />
                      <span className="text-xs font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                        {game.home_team?.name || 'TBD'}
                      </span>
                    </Link>
                  </td>

                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    {isCompleted ? (
                      <span className="text-[11px] text-[var(--color-text-muted)]">{date}</span>
                    ) : isLive ? (
                      <span className="text-[10px] font-bold text-red-400 uppercase">LIVE</span>
                    ) : (
                      <div>
                        <span className="text-[11px] text-[var(--color-text-primary)]">{date}</span>
                        <span className="block text-[10px] text-[var(--color-text-secondary)]">{time}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-2">
                    <span className="text-[11px] text-[var(--color-text-secondary)] truncate block max-w-[100px]">
                      {game.venue || 'TBD'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
