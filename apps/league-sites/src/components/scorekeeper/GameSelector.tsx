'use client';

import Link from 'next/link';
import type { SessionGameInfo } from '@/lib/actions/scorekeeper';

interface GameSelectorProps {
  games: SessionGameInfo[];
  leagueSlug: string;
}

export function GameSelector({ games, leagueSlug }: GameSelectorProps) {
  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Your Games
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Select a game to score
          </p>
        </div>

        {/* Game List */}
        <div className="space-y-3">
          {games.map((game) => {
            const isCompleted = !!game.completedAt;
            const isInProgress = game.status === 'in_progress';

            return (
              <Link
                key={game.gameId}
                href={`/${leagueSlug}/scorekeeper/game/${game.gameId}`}
                className={`
                  block p-4 rounded-xl border transition-all duration-200
                  ${isCompleted
                    ? 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-60'
                    : isInProgress
                      ? 'bg-[var(--color-surface)] border-[var(--league-primary,#d4af37)] shadow-sm'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-emphasis)] hover:-translate-y-0.5'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Teams */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--color-text-primary)] truncate">
                        {game.homeTeamName}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">vs</span>
                      <span className="font-semibold text-[var(--color-text-primary)] truncate">
                        {game.awayTeamName}
                      </span>
                    </div>

                    {/* Score (if in progress or completed) */}
                    {(isInProgress || isCompleted) && (
                      <div className="mt-1 text-lg font-bold tabular-nums text-[var(--color-text-primary)]">
                        {game.homeScore} - {game.awayScore}
                      </div>
                    )}

                    {/* Time */}
                    <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {new Date(game.scheduledAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0 ml-3">
                    {isCompleted ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                        Done
                      </span>
                    ) : isInProgress ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--league-primary,#d4af37)]/10 text-[var(--league-primary,#d4af37)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
