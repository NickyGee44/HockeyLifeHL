'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TickerGame } from '@/lib/types';

interface ScoreTickerProps {
  games: TickerGame[];
  leagueSlug: string;
  autoScroll?: boolean;
}

/**
 * ScoreTicker - Horizontal scrolling recent games ticker
 *
 * Displays a continuous scrolling ticker of recent and upcoming games.
 * Shows team logos, scores (for completed games), venue, and division.
 * Auto-scrolls by default with pause on hover.
 */
export function ScoreTicker({
  games,
  leagueSlug,
  autoScroll = true,
}: ScoreTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Don't render if no games
  if (!games || games.length === 0) {
    return null;
  }

  // Duplicate games array for seamless loop effect
  const duplicatedGames = [...games, ...games];

  return (
    <div
      className="relative w-full overflow-hidden bg-[var(--color-surface)] border-y border-[var(--color-border)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Recent games ticker"
    >
      <div
        ref={scrollRef}
        className="flex gap-4 py-3 px-4"
        style={{
          animation: autoScroll ? 'ticker-scroll 30s linear infinite' : 'none',
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {duplicatedGames.map((game, index) => (
          <TickerGameCard
            key={`${game.id}-${index}`}
            game={game}
            leagueSlug={leagueSlug}
          />
        ))}
      </div>

      {/* Gradient overlays for smooth fade effect */}
      <div
        className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, var(--color-surface), transparent)',
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
        style={{
          background:
            'linear-gradient(to left, var(--color-surface), transparent)',
        }}
      />

      {/* CSS animation keyframes - inline style for the ticker scroll */}
      <style jsx>{`
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

interface TickerGameCardProps {
  game: TickerGame;
  leagueSlug: string;
}

function TickerGameCard({ game, leagueSlug }: TickerGameCardProps) {
  const isCompleted = game.status === 'final';
  const isLive = game.status === 'in_progress';
  const gameDate = new Date(game.scheduled_at);

  // Get division name from either team (they should be in the same division)
  const divisionName =
    game.home_team?.divisions?.name || game.away_team?.divisions?.name;

  // Parse team color from colors field (assumed to be primary color or JSON)
  const getTeamColor = (colors: string | null): string | null => {
    if (!colors) return null;
    // If it's a hex color, return it
    if (colors.startsWith('#')) return colors;
    // Try parsing as JSON
    try {
      const parsed = JSON.parse(colors);
      return parsed.primary || parsed.color || null;
    } catch {
      return null;
    }
  };

  return (
    <Link
      href={`/${leagueSlug}/games/${game.id}`}
      className="flex-shrink-0 flex items-center gap-3 px-4 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-border-emphasis)] transition-all duration-200 hover:shadow-lg"
      style={{
        minWidth: '280px',
      }}
    >
      {/* Away Team */}
      <div className="flex items-center gap-2">
        <TeamLogo
          logoUrl={game.away_team?.logo || null}
          teamName={game.away_team?.name || 'TBD'}
          teamColor={getTeamColor(game.away_team?.colors || null)}
          size="sm"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[80px]">
            {game.away_team?.name || 'TBD'}
          </span>
          {(isCompleted || isLive) && (
            <span
              className={`text-lg font-bold ${
                (game.away_score || 0) > (game.home_score || 0)
                  ? 'text-[var(--league-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {game.away_score ?? '-'}
            </span>
          )}
        </div>
      </div>

      {/* Center - Status/Time */}
      <div className="flex flex-col items-center justify-center px-2">
        {isLive ? (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-medium animate-pulse">
            LIVE
          </span>
        ) : isCompleted ? (
          <span className="text-xs text-[var(--color-text-muted)] uppercase">
            Final
          </span>
        ) : (
          <>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {format(gameDate, 'MMM d')}
            </span>
            <span className="text-sm font-semibold text-[var(--league-primary)]">
              {format(gameDate, 'h:mm a')}
            </span>
          </>
        )}
      </div>

      {/* Home Team */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[80px]">
            {game.home_team?.name || 'TBD'}
          </span>
          {(isCompleted || isLive) && (
            <span
              className={`text-lg font-bold ${
                (game.home_score || 0) > (game.away_score || 0)
                  ? 'text-[var(--league-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {game.home_score ?? '-'}
            </span>
          )}
        </div>
        <TeamLogo
          logoUrl={game.home_team?.logo || null}
          teamName={game.home_team?.name || 'TBD'}
          teamColor={getTeamColor(game.home_team?.colors || null)}
          size="sm"
        />
      </div>

      {/* Venue/Division info (compact) */}
      {(game.venue || divisionName) && (
        <div className="flex flex-col items-start ml-2 pl-2 border-l border-[var(--color-border-muted)]">
          {divisionName && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {divisionName}
            </span>
          )}
          {game.venue && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[60px]">{game.venue}</span>
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export default ScoreTicker;
