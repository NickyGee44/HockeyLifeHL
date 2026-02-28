'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, isYesterday, differenceInMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TickerGame } from '@/lib/types';

interface ScoreTickerProps {
  games: TickerGame[];
  leagueSlug: string;
}

/**
 * Check if a game should be considered "live" based on time
 * A game is considered live if:
 * - It has status 'in_progress', OR
 * - It's scheduled and the current time is within 1 hour of the start time
 */
function isGameLive(game: TickerGame): boolean {
  if (game.status === 'in_progress') return true;
  if (game.status !== 'scheduled') return false;

  const now = new Date();
  const gameTime = new Date(game.scheduled_at);
  const minutesDiff = differenceInMinutes(now, gameTime);

  // Game is "live" if we're within -60 to +120 minutes of start time
  // (60 min before to 120 min after, to cover typical game duration)
  return minutesDiff >= -60 && minutesDiff <= 120;
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const updateScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(updateScrollButtons, 350);
  }, [updateScrollButtons]);

  // Stable ordering: on server & first render use status-based sort (no time-dependent isGameLive).
  // After mount, apply live detection for proper ordering.
  const orderedGames = useMemo(() => {
    if (!games || games.length === 0) return [];
    if (!mounted) {
      // Server-safe: in_progress first, then scheduled, then completed — deterministic
      const inProgress = games.filter((g) => g.status === 'in_progress');
      const scheduled = games.filter((g) => g.status === 'scheduled');
      const completed = games.filter((g) => g.status === 'completed');
      return [...inProgress, ...scheduled, ...completed];
    }
    // Client: use smart live detection
    const liveGames = games.filter((g) => isGameLive(g));
    const upcomingGames = games.filter((g) => g.status === 'scheduled' && !isGameLive(g));
    const completedGames = games.filter((g) => g.status === 'completed');
    return [...liveGames, ...upcomingGames, ...completedGames];
  }, [games, mounted]);

  // Don't render if no games (check after all hooks to satisfy rules of hooks)
  if (orderedGames.length === 0) {
    return null;
  }

  return (
    <div
      className="score-ticker w-full border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background-elevated)_80%,transparent)] backdrop-blur-sm"
      role="region"
      aria-label="Game scores"
      data-testid="score-ticker"
    >
      <div className="relative mx-auto max-w-[1400px] flex items-stretch px-6">
        {/* Ticker area - full width */}
        <div className="relative flex-1 min-w-0">
          {/* Left Arrow */}
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center w-10 transition-opacity duration-150 ${
              canScrollLeft
                ? 'opacity-100 bg-gradient-to-r from-[var(--color-background-elevated)] via-[var(--color-background-elevated)]/55 to-transparent'
                : 'opacity-20 cursor-not-allowed'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
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
                ? 'opacity-100 bg-gradient-to-l from-[var(--color-background-elevated)] via-[var(--color-background-elevated)]/55 to-transparent'
                : 'opacity-20 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>
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
  const isCompleted = game.status === 'completed';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  // Hydration-safe: on server/first render use only explicit in_progress status
  // (no time-based check), switch to full live detection after mount.
  // This prevents ISR cache mismatches where the page was baked before a game
  // entered its live window but the client loads it mid-game.
  const isLive = mounted ? isGameLive(game) : game.status === 'in_progress';
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

  // Hydration-safe date formatting — timezone-dependent calls only after mount
  const formatGameDate = () => {
    if (!mounted) return '\u00A0'; // non-breaking space placeholder
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
      className="flex-shrink-0 block w-[300px] rounded-lg border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] backdrop-blur-sm transition-all duration-150 hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-emphasis)]"
    >
      {/* Header: Date + Status */}
      <div
        className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--color-border-muted)]"
      >
        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          {formatGameDate()}
        </span>
        <StatusBadge game={game} gameDate={gameDate} />
      </div>

      {/* Teams and Scores - improved spacing for logos */}
      <div className="px-2.5 py-2 space-y-1.5">
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
        className="flex items-center justify-between px-2.5 py-1.5 border-t border-[var(--color-border-muted)] bg-[color-mix(in_srgb,var(--color-surface-hover)_72%,transparent)]"
      >
        {game.venue ? (
          <div className="flex items-center gap-1 text-[var(--color-text-muted)] min-w-0 flex-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="text-[10px] truncate">{game.venue}</span>
          </div>
        ) : (
          <div />
        )}
        {divisionName && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded bg-[var(--league-primary)] text-[var(--color-text-inverse)]"
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
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Team Logo - slightly larger for visibility */}
        <div className="flex-shrink-0">
          <TeamLogo
            logoUrl={team?.logo || null}
            teamName={team?.name || 'TBD'}
            teamColor={teamColor}
            size="sm"
          />
        </div>
        {/* Team Name - improved contrast */}
        <span
          className={`text-xs font-semibold truncate ${
            isWinning ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {team?.name || 'TBD'}
        </span>
        {isHome && (
          <span className="text-[8px] text-[var(--color-text-muted)] font-medium">(H)</span>
        )}
      </div>

      {showScore && (
        <div className="flex items-center gap-1.5">
          {isWinning && (
            <div
              className="w-1.5 h-1.5 rounded-full bg-[var(--league-primary)]"
            />
          )}
          <span
            className={`text-base font-bold tabular-nums ${
              isWinning ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
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
  game: TickerGame;
  gameDate: Date;
}

function StatusBadge({ game, gameDate }: StatusBadgeProps) {
  const { status } = game;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  // Hydration-safe: same pattern as GameTile — only use time-based detection after mount
  const isLive = mounted ? isGameLive(game) : game.status === 'in_progress';

  // Show live badge if game is in progress OR within 1 hour of start time
  if (mounted && isLive && status !== 'completed') {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[9px] font-bold uppercase text-red-400">Live</span>
      </div>
    );
  }

    if (status === 'completed') {
      return (
        <span className="text-[9px] font-medium uppercase text-[var(--color-text-muted)] px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)]">
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
        <span className="text-[9px] font-medium uppercase text-[var(--color-text-muted)] px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)] line-through">
          Cancelled
        </span>
      );
    }

  // Scheduled - show time (hydration-safe: only format after mount)
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-[var(--league-primary)] bg-[color-mix(in_srgb,var(--league-primary)_12%,transparent)]"
    >
      {mounted ? format(gameDate, 'h:mm a') : '\u00A0'}
    </span>
  );
}

export default ScoreTicker;
