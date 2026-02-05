'use client';

import { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TickerGame } from '@/lib/types';

interface ScoreTickerProps {
  games: TickerGame[];
  leagueSlug: string;
}

/**
 * ScoreTicker - BMHL-style compact score ticker
 *
 * Design specs:
 * - ~100px total height (utility strip, not hero)
 * - ~280px card width, dense scoreboard-like tiles
 * - Left/right arrow scroll (NO auto-scroll)
 * - Shows: date, venue, teams (logo + name), scores, division, status
 * - Non-sticky (scrolls away with page)
 * - Minimal animations - only hover states
 */
export function ScoreTicker({ games, leagueSlug }: ScoreTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Don't render if no games
  if (!games || games.length === 0) {
    return null;
  }

  // Order: Live first, then upcoming, then completed
  const liveGames = games.filter((g) => g.status === 'in_progress');
  const upcomingGames = games.filter((g) => g.status === 'scheduled');
  const completedGames = games.filter((g) => g.status === 'final' || g.status === 'completed');
  const orderedGames = [...liveGames, ...upcomingGames, ...completedGames];

  const updateScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(updateScrollButtons, 350);
  };

  return (
    <div
      className="w-full border-b"
      style={{
        background: '#0d0d0d',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
      role="region"
      aria-label="Game scores"
    >
      <div className="relative max-w-[1400px] mx-auto">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={`absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center w-10 transition-opacity duration-150 ${
            canScrollLeft
              ? 'opacity-100 hover:bg-white/5'
              : 'opacity-20 cursor-not-allowed'
          }`}
          style={{
            background: canScrollLeft
              ? 'linear-gradient(to right, #0d0d0d 50%, transparent)'
              : 'transparent',
          }}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-white/60" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-2 py-2.5 px-12 overflow-x-auto"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {orderedGames.map((game) => (
            <GameTile key={game.id} game={game} leagueSlug={leagueSlug} />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center w-10 transition-opacity duration-150 ${
            canScrollRight
              ? 'opacity-100 hover:bg-white/5'
              : 'opacity-20 cursor-not-allowed'
          }`}
          style={{
            background: canScrollRight
              ? 'linear-gradient(to left, #0d0d0d 50%, transparent)'
              : 'transparent',
          }}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Hide scrollbar */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// Game Tile Component
// =============================================================================

interface GameTileProps {
  game: TickerGame;
  leagueSlug: string;
}

function GameTile({ game, leagueSlug }: GameTileProps) {
  const isCompleted = game.status === 'final' || game.status === 'completed';
  const isLive = game.status === 'in_progress';
  const gameDate = new Date(game.scheduled_at);

  // Parse team color
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

  const awayColor = getTeamColor(game.away_team?.colors || null);
  const homeColor = getTeamColor(game.home_team?.colors || null);

  // Score comparison
  const awayScore = game.away_score ?? 0;
  const homeScore = game.home_score ?? 0;
  const awayWinning = awayScore > homeScore;
  const homeWinning = homeScore > awayScore;

  // Smart date formatting
  const formatGameDate = () => {
    if (isToday(gameDate)) return 'Today';
    if (isTomorrow(gameDate)) return 'Tomorrow';
    if (isYesterday(gameDate)) return 'Yesterday';
    return format(gameDate, 'EEE, MMM d');
  };

  const divisionName =
    game.home_team?.divisions?.name || game.away_team?.divisions?.name;

  return (
    <Link
      href={`/${leagueSlug}/games/${game.id}`}
      className="flex-shrink-0 block rounded-md transition-colors duration-100 hover:bg-white/[0.04]"
      style={{
        width: '280px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Header: Date + Status */}
      <div
        className="flex items-center justify-between px-2.5 py-1 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <span className="text-[10px] font-medium text-white/40 uppercase tracking-wide">
          {formatGameDate()}
        </span>
        <StatusBadge status={game.status} gameDate={gameDate} />
      </div>

      {/* Teams and Scores - compact layout */}
      <div className="px-2.5 py-1.5 space-y-0.5">
        {/* Away Team */}
        <TeamRow
          team={game.away_team}
          score={game.away_score}
          isWinning={awayWinning && (isCompleted || isLive)}
          showScore={isCompleted || isLive}
          teamColor={awayColor}
        />

        {/* Home Team */}
        <TeamRow
          team={game.home_team}
          score={game.home_score}
          isWinning={homeWinning && (isCompleted || isLive)}
          showScore={isCompleted || isLive}
          teamColor={homeColor}
          isHome
        />
      </div>

      {/* Footer: Venue + Division */}
      <div
        className="flex items-center justify-between px-2.5 py-1 border-t"
        style={{
          borderColor: 'rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        {game.venue ? (
          <div className="flex items-center gap-1 text-white/30 min-w-0 flex-1">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="text-[9px] truncate">{game.venue}</span>
          </div>
        ) : (
          <div />
        )}
        {divisionName && (
          <span
            className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--league-primary)',
              color: 'white',
            }}
          >
            {divisionName}
          </span>
        )}
      </div>
    </Link>
  );
}

// =============================================================================
// Team Row Component
// =============================================================================

interface TeamRowProps {
  team: TickerGame['home_team'];
  score: number | null;
  isWinning: boolean;
  showScore: boolean;
  teamColor: string | null;
  isHome?: boolean;
}

function TeamRow({
  team,
  score,
  isWinning,
  showScore,
  teamColor,
  isHome = false,
}: TeamRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <TeamLogo
          logoUrl={team?.logo || null}
          teamName={team?.name || 'TBD'}
          teamColor={teamColor}
          size="xs"
        />
        <span
          className={`text-xs font-medium truncate ${
            isWinning ? 'text-white' : 'text-white/50'
          }`}
        >
          {team?.name || 'TBD'}
        </span>
        {isHome && (
          <span className="text-[7px] text-white/25 font-medium">(H)</span>
        )}
      </div>

      {showScore && (
        <div className="flex items-center gap-1">
          {isWinning && (
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: 'var(--league-primary)' }}
            />
          )}
          <span
            className={`text-sm font-bold tabular-nums ${
              isWinning ? 'text-white' : 'text-white/35'
            }`}
          >
            {score ?? '-'}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Status Badge Component
// =============================================================================

interface StatusBadgeProps {
  status: TickerGame['status'];
  gameDate: Date;
}

function StatusBadge({ status, gameDate }: StatusBadgeProps) {
  if (status === 'in_progress') {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[9px] font-bold uppercase text-red-400">Live</span>
      </div>
    );
  }

  if (status === 'final' || status === 'completed') {
    return (
      <span className="text-[9px] font-medium uppercase text-white/35 px-1.5 py-0.5 rounded bg-white/5">
        Final
      </span>
    );
  }

  if (status === 'postponed') {
    return (
      <span className="text-[9px] font-medium uppercase text-amber-400/70 px-1.5 py-0.5 rounded bg-amber-500/10">
        PPD
      </span>
    );
  }

  if (status === 'cancelled') {
    return (
      <span className="text-[9px] font-medium uppercase text-white/35 px-1.5 py-0.5 rounded bg-white/5 line-through">
        Cancelled
      </span>
    );
  }

  // Scheduled - show time
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{
        color: 'var(--league-primary)',
        background: 'rgba(255,255,255,0.05)',
      }}
    >
      {format(gameDate, 'h:mm a')}
    </span>
  );
}

export default ScoreTicker;
