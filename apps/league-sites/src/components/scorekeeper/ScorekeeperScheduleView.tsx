'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ScheduleGame } from '@/lib/actions/scorekeeper-dashboard';

interface ScorekeeperScheduleViewProps {
  games: ScheduleGame[];
  leagueSlug: string;
}

export function ScorekeeperScheduleView({ games, leagueSlug }: ScorekeeperScheduleViewProps) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  const filteredGames = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return games.filter(g => g.status === 'scheduled' || g.status === 'in_progress');
      case 'completed':
        return games.filter(g => g.status === 'completed' || g.status === 'final');
      default:
        return games;
    }
  }, [games, filter]);

  // Group by week
  const gamesByWeek = useMemo(() => {
    const groups = new Map<number, ScheduleGame[]>();
    for (const game of filteredGames) {
      const existing = groups.get(game.weekNumber) || [];
      existing.push(game);
      groups.set(game.weekNumber, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredGames]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/${leagueSlug}/scorekeeper/dashboard`}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            My Schedule
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1">
        {(['upcoming', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${filter === f
                ? 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
              }
            `}
          >
            {f === 'upcoming' ? 'Upcoming' : f === 'completed' ? 'Completed' : 'All'}
          </button>
        ))}
      </div>

      {/* Games by Week */}
      {gamesByWeek.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] opacity-50 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-[var(--color-text-secondary)]">
            No {filter === 'all' ? '' : filter} games found
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {gamesByWeek.map(([weekNum, weekGames]) => (
            <div key={weekNum}>
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                Week {weekNum}
              </h3>
              <div className="space-y-2">
                {weekGames.map((game) => (
                  <ScheduleGameCard key={game.id} game={game} leagueSlug={leagueSlug} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleGameCard({ game, leagueSlug }: { game: ScheduleGame; leagueSlug: string }) {
  const date = new Date(game.scheduledAt);
  const isLive = game.status === 'in_progress';
  const isCompleted = game.status === 'completed' || game.status === 'final';

  return (
    <div className={`
      bg-[var(--color-surface)] border rounded-xl p-4
      ${isLive ? 'border-red-500/30' : game.hasSwapRequest ? 'border-amber-400/30' : 'border-[var(--color-border)]'}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isLive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 text-red-400 text-xs font-semibold rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                LIVE
              </span>
            )}
            {game.hasSwapRequest && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-400/10 text-amber-400 text-xs font-semibold rounded">
                SWAP
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-green-500/10 text-green-400 text-xs font-semibold rounded">
                DONE
              </span>
            )}
            <span className="text-xs text-[var(--color-text-secondary)]">
              {game.dayOfWeek} {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' '}
              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>

          <p className="font-medium text-[var(--color-text-primary)] truncate">
            {game.homeTeamName} vs {game.awayTeamName}
          </p>

          {game.venueName && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{game.venueName}</p>
          )}
        </div>

        <div className="ml-3 flex items-center gap-2">
          {isCompleted && (
            <span className="text-sm font-bold text-[var(--color-text-primary)]">
              {game.homeScore}-{game.awayScore}
            </span>
          )}
          {!isCompleted && (
            <Link
              href={`/${leagueSlug}/scorekeeper/game/${game.id}`}
              className="px-3 py-1.5 text-xs font-medium text-[var(--color-accent-text,#000)] bg-[var(--league-primary,#d4af37)] rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {isLive ? 'Continue' : 'Score'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
