'use client';

import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Clock } from 'lucide-react';
import type { RecentGame } from '@/lib/types';
import { LiveIndicator } from '../ui/animations';

interface ScoreCardProps {
  game: RecentGame;
  leagueSlug: string;
}

export function ScoreCard({ game, leagueSlug }: ScoreCardProps) {
  const gameDate = new Date(game.scheduled_at);
  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'in_progress';

  const homeWon = (game.home_score || 0) > (game.away_score || 0);
  const awayWon = (game.away_score || 0) > (game.home_score || 0);

  return (
    <Link
      href={`/${leagueSlug}/games/${game.id}`}
      className="block group"
    >
      <div
        className={`
          relative bg-[var(--color-background-elevated)] border border-[var(--color-border)]
          rounded-xl p-4 transition-all duration-300
          hover:border-[var(--league-primary)]/50 hover:shadow-lg hover:shadow-[var(--league-primary)]/10
          ${isLive ? 'border-red-500/50' : ''}
        `}
      >
        {/* Live indicator badge */}
        {isLive && (
          <div className="absolute -top-2 left-4">
            <LiveIndicator size="sm" />
          </div>
        )}

        {/* Main content */}
        <div className="flex items-center gap-4">
          {/* Away Team */}
          <div className="flex-1 flex items-center gap-3">
            <TeamLogo name={game.away_team?.name || 'TBD'} logo={game.away_team?.logo ?? undefined} />
            <div className="flex-1 min-w-0">
              <span
                className={`
                  font-semibold truncate block transition-colors duration-300
                  ${awayWon ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}
                  group-hover:text-[var(--league-primary)]
                `}
              >
                {game.away_team?.name || 'TBD'}
              </span>
              {!isCompleted && !isLive && (
                <span className="text-xs text-[var(--color-text-muted)]">Away</span>
              )}
            </div>
          </div>

          {/* Score Section */}
          <div className="flex items-center gap-3 px-4">
            {(isCompleted || isLive) ? (
              <>
                <span
                  className={`
                    text-2xl font-bold tabular-nums min-w-[2ch] text-center
                    ${awayWon ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}
                  `}
                >
                  {game.away_score ?? 0}
                </span>
                <span className="text-[var(--color-text-muted)] text-sm">-</span>
                <span
                  className={`
                    text-2xl font-bold tabular-nums min-w-[2ch] text-center
                    ${homeWon ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}
                  `}
                >
                  {game.home_score ?? 0}
                </span>
              </>
            ) : (
              <div className="text-center">
                <div className="text-sm font-medium text-[var(--league-primary)]">
                  {format(gameDate, 'h:mm a')}
                </div>
              </div>
            )}
          </div>

          {/* Home Team */}
          <div className="flex-1 flex items-center gap-3 justify-end">
            <div className="flex-1 min-w-0 text-right">
              <span
                className={`
                  font-semibold truncate block transition-colors duration-300
                  ${homeWon ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}
                  group-hover:text-[var(--league-primary)]
                `}
              >
                {game.home_team?.name || 'TBD'}
              </span>
              {!isCompleted && !isLive && (
                <span className="text-xs text-[var(--color-text-muted)]">Home</span>
              )}
            </div>
            <TeamLogo name={game.home_team?.name || 'TBD'} logo={game.home_team?.logo ?? undefined} />
          </div>
        </div>

        {/* Footer: Status, Venue, Time */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Clock className="w-3 h-3" />
            <span>{format(gameDate, 'h:mm a')}</span>
            {isCompleted && (
              <span className="ml-2 px-2 py-0.5 bg-[var(--color-surface-hover)] rounded text-xs uppercase tracking-wide">
                Final
              </span>
            )}
            {isLive && game.period && (
              <span className="ml-2 text-red-400">
                P{game.period} {game.period_time || ''}
              </span>
            )}
          </div>

          {game.venue && (
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{game.venue}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function TeamLogo({ name, logo }: { name: string; logo?: string }) {
  return (
    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
      <Image
        src={logo || '/blank_team.png'}
        alt={name}
        fill
        className="object-cover"
      />
    </div>
  );
}
