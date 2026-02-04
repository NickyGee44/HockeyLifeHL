'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TickerGame } from '@/lib/types';

interface ScoreTickerProps {
  games: TickerGame[];
  leagueSlug: string;
  autoScroll?: boolean;
}

/**
 * ScoreTicker - BMHL-style horizontal scrolling game ticker
 *
 * Sits at the very top of the page above navigation. Displays a continuous
 * scrolling ticker of recent and upcoming games with date, venue, teams,
 * scores, division, and game status. Auto-scrolls with pause on hover.
 * Includes left/right arrow navigation buttons.
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

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: 'var(--color-background)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Recent games ticker"
    >
      {/* Left arrow navigation */}
      <button
        onClick={handleScrollLeft}
        className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center w-10 transition-opacity duration-200 opacity-0 hover:opacity-100 focus:opacity-100"
        style={{
          background:
            'linear-gradient(to right, var(--color-background) 60%, transparent)',
        }}
        aria-label="Scroll ticker left"
      >
        <ChevronLeft
          className="w-5 h-5"
          style={{ color: 'var(--color-text-secondary)' }}
        />
      </button>

      {/* Scrolling ticker track */}
      <div
        ref={scrollRef}
        className="flex gap-3 py-2 px-12 overflow-x-hidden"
        style={{
          animation: autoScroll
            ? `ticker-scroll ${Math.max(games.length * 6, 30)}s linear infinite`
            : 'none',
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

      {/* Right arrow navigation */}
      <button
        onClick={handleScrollRight}
        className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center w-10 transition-opacity duration-200 opacity-0 hover:opacity-100 focus:opacity-100"
        style={{
          background:
            'linear-gradient(to left, var(--color-background) 60%, transparent)',
        }}
        aria-label="Scroll ticker right"
      >
        <ChevronRight
          className="w-5 h-5"
          style={{ color: 'var(--color-text-secondary)' }}
        />
      </button>

      {/* Gradient fade overlays at edges */}
      <div
        className="absolute left-10 top-0 bottom-0 w-8 pointer-events-none z-10"
        style={{
          background:
            'linear-gradient(to right, var(--color-background), transparent)',
        }}
      />
      <div
        className="absolute right-10 top-0 bottom-0 w-8 pointer-events-none z-10"
        style={{
          background:
            'linear-gradient(to left, var(--color-background), transparent)',
        }}
      />

      {/* CSS animation keyframes for the ticker scroll */}
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
  const isScheduled = game.status === 'scheduled';
  const gameDate = new Date(game.scheduled_at);

  // Get division name from either team (they should be in the same division)
  const divisionName =
    game.home_team?.divisions?.name || game.away_team?.divisions?.name;

  // Parse team color from colors field (assumed to be primary color or JSON)
  const getTeamColor = (colors: string | null): string | null => {
    if (!colors) return null;
    if (colors.startsWith('#')) return colors;
    try {
      const parsed = JSON.parse(colors);
      return parsed.primary || parsed.color || null;
    } catch {
      return null;
    }
  };

  // Determine if a team is winning
  const awayScore = game.away_score ?? 0;
  const homeScore = game.home_score ?? 0;
  const awayWinning = awayScore > homeScore;
  const homeWinning = homeScore > awayScore;

  // Build the game status line
  const renderStatus = () => {
    if (isLive) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-red-400 font-semibold text-xs uppercase">
            Live
          </span>
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span
          className="text-xs uppercase"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Final
        </span>
      );
    }
    // Scheduled - show time in league primary
    return (
      <span
        className="text-xs font-semibold"
        style={{ color: 'var(--league-primary)' }}
      >
        {format(gameDate, 'h:mm a')}
      </span>
    );
  };

  return (
    <Link
      href={`/${leagueSlug}/games/${game.id}`}
      className="flex-shrink-0 flex flex-col rounded-lg border transition-all duration-200 hover:shadow-lg overflow-hidden"
      style={{
        minWidth: '300px',
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Row 1: Date + Venue */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {format(gameDate, 'MMM d')}
        </span>
        {game.venue && (
          <span
            className="flex items-center gap-1 text-xs truncate max-w-[160px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{game.venue}</span>
          </span>
        )}
      </div>

      {/* Row 2: Teams + Score */}
      <div className="flex items-center justify-center gap-3 px-3 py-2.5">
        {/* Away Team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span
            className="text-sm font-medium truncate max-w-[80px] text-right"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {game.away_team?.name || 'TBD'}
          </span>
          <TeamLogo
            logoUrl={game.away_team?.logo || null}
            teamName={game.away_team?.name || 'TBD'}
            teamColor={getTeamColor(game.away_team?.colors || null)}
            size="sm"
          />
        </div>

        {/* Score / VS */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isCompleted || isLive ? (
            <>
              <span
                className="text-lg font-bold tabular-nums min-w-[20px] text-center"
                style={{
                  color: awayWinning
                    ? 'var(--league-primary)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {game.away_score ?? '-'}
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-muted)' }}
              >
                -
              </span>
              <span
                className="text-lg font-bold tabular-nums min-w-[20px] text-center"
                style={{
                  color: homeWinning
                    ? 'var(--league-primary)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {game.home_score ?? '-'}
              </span>
            </>
          ) : (
            <span
              className="text-xs font-semibold uppercase"
              style={{ color: 'var(--color-text-muted)' }}
            >
              vs
            </span>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center gap-2 flex-1 justify-start">
          <TeamLogo
            logoUrl={game.home_team?.logo || null}
            teamName={game.home_team?.name || 'TBD'}
            teamColor={getTeamColor(game.home_team?.colors || null)}
            size="sm"
          />
          <span
            className="text-sm font-medium truncate max-w-[80px]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {game.home_team?.name || 'TBD'}
          </span>
        </div>
      </div>

      {/* Row 3: Division + Status */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {divisionName ? (
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {divisionName}
          </span>
        ) : (
          <span />
        )}
        {renderStatus()}
      </div>
    </Link>
  );
}

export default ScoreTicker;
