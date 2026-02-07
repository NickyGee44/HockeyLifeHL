'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin, X } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TickerGame } from '@/lib/types';

interface PremiumScoreTickerProps {
  games: TickerGame[];
  leagueSlug: string;
  autoScroll?: boolean;
  scrollSpeed?: number; // pixels per second
}

/**
 * PremiumScoreTicker - ESPN/NHL-style premium horizontal score ticker
 *
 * Features:
 * - Glass morphism design with smooth animations
 * - Live game pulsing indicators
 * - Auto-scroll with pause on hover
 * - Click to expand game details
 * - Team color accents
 * - Mobile-friendly touch scrolling
 * - Uses CSS variables for league theming
 */
export function PremiumScoreTicker({
  games,
  leagueSlug,
  autoScroll = true,
  scrollSpeed = 40,
}: PremiumScoreTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Separate games by status for smart ordering (compute even if empty to keep hooks order consistent)
  const liveGames = (games || []).filter((g) => g.status === 'in_progress');
  const upcomingGames = (games || []).filter((g) => g.status === 'scheduled');
  const completedGames = (games || []).filter((g) => g.status === 'completed');

  // Order: Live games first, then upcoming, then completed
  const orderedGames = [...liveGames, ...upcomingGames, ...completedGames];

  // Duplicate for seamless looping
  const duplicatedGames = [...orderedGames, ...orderedGames];

  // Smooth scroll animation using requestAnimationFrame
  useEffect(() => {
    if (!autoScroll) return;

    const animate = (currentTime: number) => {
      if (!scrollRef.current || isPaused) {
        lastTimeRef.current = currentTime;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const scrollWidth = scrollRef.current.scrollWidth / 2;
      setScrollPosition((prev) => {
        let newPosition = prev + scrollSpeed * deltaTime;
        // Reset to beginning when we've scrolled through half (the original set)
        if (newPosition >= scrollWidth) {
          newPosition = 0;
        }
        return newPosition;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoScroll, isPaused, scrollSpeed]);

  const handleScrollLeft = () => {
    setScrollPosition((prev) => Math.max(0, prev - 350));
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      const maxScroll = scrollRef.current.scrollWidth / 2;
      setScrollPosition((prev) => Math.min(maxScroll, prev + 350));
    }
  };

  const handleGameClick = (gameId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedGameId(expandedGameId === gameId ? null : gameId);
    setIsPaused(true);
  };

  const handleCloseExpanded = () => {
    setExpandedGameId(null);
  };

  // Find the expanded game
  const expandedGame = expandedGameId
    ? orderedGames.find((g) => g.id === expandedGameId)
    : null;

  // Don't render if no games (check after all hooks to satisfy rules of hooks)
  if (!games || games.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full">
      {/* Main Ticker Container */}
      <div
        className="relative w-full overflow-hidden backdrop-blur-md"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-background) 95%, transparent) 0%, color-mix(in srgb, var(--color-background) 85%, transparent) 100%)',
          borderBottom: '1px solid var(--color-border-muted)',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          if (!expandedGameId) setIsPaused(false);
        }}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => {
          if (!expandedGameId) {
            setTimeout(() => setIsPaused(false), 3000);
          }
        }}
        role="region"
        aria-label="Live scores and upcoming games ticker"
      >
        {/* Live indicator bar at top */}
        {liveGames.length > 0 && (
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{
              background: `linear-gradient(90deg, transparent, var(--league-primary), transparent)`,
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}
          />
        )}

        {/* Left Navigation Button */}
        <button
          onClick={handleScrollLeft}
          className="absolute left-0 top-0 bottom-0 z-30 flex items-center justify-center w-12 transition-all duration-300 opacity-0 hover:opacity-100 focus:opacity-100 group"
          style={{
            background:
              'linear-gradient(to right, color-mix(in srgb, var(--color-background) 95%, transparent) 40%, transparent)',
          }}
          aria-label="Scroll left"
        >
          <div
            className="p-2 rounded-full transition-all duration-200 group-hover:scale-110"
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </div>
        </button>

        {/* Scrolling Track */}
        <div
          ref={scrollRef}
          className="flex gap-3 py-3 px-14 overflow-x-auto scrollbar-hide touch-pan-x"
          style={{
            transform: `translateX(-${scrollPosition}px)`,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {duplicatedGames.map((game, index) => (
            <TickerGameCard
              key={`${game.id}-${index}`}
              game={game}
              leagueSlug={leagueSlug}
              isExpanded={expandedGameId === game.id}
              onExpand={handleGameClick}
            />
          ))}
        </div>

        {/* Right Navigation Button */}
        <button
          onClick={handleScrollRight}
          className="absolute right-0 top-0 bottom-0 z-30 flex items-center justify-center w-12 transition-all duration-300 opacity-0 hover:opacity-100 focus:opacity-100 group"
          style={{
            background:
              'linear-gradient(to left, color-mix(in srgb, var(--color-background) 95%, transparent) 40%, transparent)',
          }}
          aria-label="Scroll right"
        >
          <div
            className="p-2 rounded-full transition-all duration-200 group-hover:scale-110"
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </div>
        </button>

        {/* Edge Fade Gradients */}
        <div
          className="absolute left-12 top-0 bottom-0 w-6 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to right, color-mix(in srgb, var(--color-background) 90%, transparent), transparent)',
          }}
        />
        <div
          className="absolute right-12 top-0 bottom-0 w-6 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to left, color-mix(in srgb, var(--color-background) 90%, transparent), transparent)',
          }}
        />
      </div>

      {/* Expanded Game Details Overlay */}
      {expandedGame && (
        <ExpandedGameDetails
          game={expandedGame}
          leagueSlug={leagueSlug}
          onClose={handleCloseExpanded}
        />
      )}

      {/* Styles */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// Ticker Game Card Component
// =============================================================================

interface TickerGameCardProps {
  game: TickerGame;
  leagueSlug: string;
  isExpanded: boolean;
  onExpand: (gameId: string, e: React.MouseEvent) => void;
}

function TickerGameCard({
  game,
  isExpanded,
  onExpand,
}: TickerGameCardProps) {
  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'in_progress';
  const isScheduled = game.status === 'scheduled';
  const gameDate = new Date(game.scheduled_at);

  // Parse team colors
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
    return format(gameDate, 'MMM d');
  };

  return (
    <div
      onClick={(e) => onExpand(game.id, e)}
      className="flex-shrink-0 relative group cursor-pointer"
      style={{ minWidth: '280px' }}
    >
      {/* Card Container with Glass Effect */}
      <div
        className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
          isExpanded ? 'ring-2 ring-[var(--color-border-emphasis)]' : 'hover:ring-1 hover:ring-[var(--color-border)]'
        }`}
        style={{
          background: isLive
            ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, color-mix(in srgb, var(--color-surface) 95%, transparent) 50%)'
            : 'linear-gradient(135deg, color-mix(in srgb, var(--color-surface-hover) 40%, transparent) 0%, color-mix(in srgb, var(--color-surface) 95%, transparent) 100%)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-muted)',
        }}
      >
        {/* Team Color Accent Bars */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          <div
            className="w-1/2 transition-all duration-300"
            style={{
              backgroundColor: awayColor || 'var(--league-secondary)',
              opacity: awayWinning || isScheduled ? 1 : 0.4,
            }}
          />
          <div
            className="w-1/2 transition-all duration-300"
            style={{
              backgroundColor: homeColor || 'var(--league-primary)',
              opacity: homeWinning || isScheduled ? 1 : 0.4,
            }}
          />
        </div>

        {/* Content */}
        <div className="pt-3 pb-2.5 px-3">
          {/* Status Row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {formatGameDate()}
            </span>
            <GameStatusBadge status={game.status} gameDate={gameDate} />
          </div>

          {/* Teams and Scores */}
          <div className="space-y-1.5">
            {/* Away Team */}
            <TeamRow
              team={game.away_team}
              score={game.away_score}
              isWinning={awayWinning && (isCompleted || isLive)}
              isLive={isLive}
              showScore={isCompleted || isLive}
              teamColor={awayColor}
            />

            {/* Divider */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-px bg-[var(--color-border-muted)]" />
              {isScheduled && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                  vs
                </span>
              )}
              <div className="flex-1 h-px bg-[var(--color-border-muted)]" />
            </div>

            {/* Home Team */}
            <TeamRow
              team={game.home_team}
              score={game.home_score}
              isWinning={homeWinning && (isCompleted || isLive)}
              isLive={isLive}
              showScore={isCompleted || isLive}
              teamColor={homeColor}
              isHome
            />
          </div>

          {/* Venue (subtle) */}
          {game.venue && (
            <div className="mt-2 pt-2 border-t border-[var(--color-border-muted)] flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />
              <span className="text-[9px] text-[var(--color-text-secondary)] truncate">
                {game.venue}
              </span>
            </div>
          )}
        </div>

        {/* Hover Shimmer Effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, transparent 40%, color-mix(in srgb, var(--color-surface-hover) 20%, transparent) 50%, transparent 60%)',
          }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Team Row Component
// =============================================================================

interface TeamRowProps {
  team: TickerGame['home_team'];
  score: number | null;
  isWinning: boolean;
  isLive: boolean;
  showScore: boolean;
  teamColor: string | null;
  isHome?: boolean;
}

function TeamRow({
  team,
  score,
  isWinning,
  isLive,
  showScore,
  teamColor,
  isHome = false,
}: TeamRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {/* Team Logo */}
        <div className="relative flex-shrink-0">
          <TeamLogo
            logoUrl={team?.logo || null}
            teamName={team?.name || 'TBD'}
            teamColor={teamColor}
            size="sm"
          />
          {/* Home indicator */}
          {isHome && (
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[var(--color-border)] flex items-center justify-center"
              style={{ backgroundColor: 'var(--league-primary)' }}
            >
              <span className="text-[6px] font-bold text-[var(--color-text-inverse)]">H</span>
            </div>
          )}
        </div>

        {/* Team Name */}
        <span
          className={`text-sm font-semibold truncate transition-all duration-200 ${
            isWinning ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {team?.name || 'TBD'}
        </span>
      </div>

      {/* Score */}
      {showScore && (
        <div className="flex items-center gap-1.5">
          {/* Win indicator dot */}
          {isWinning && (
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isLive ? '#ef4444' : 'var(--league-primary)',
                boxShadow: isLive ? '0 0 6px #ef4444' : 'none',
              }}
            />
          )}
          <span
            className={`text-xl font-bold tabular-nums ${
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
// Game Status Badge Component
// =============================================================================

interface GameStatusBadgeProps {
  status: TickerGame['status'];
  gameDate: Date;
}

function GameStatusBadge({ status, gameDate }: GameStatusBadgeProps) {
  if (status === 'in_progress') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
          Live
        </span>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] px-2 py-0.5 rounded-full bg-[var(--color-surface-hover)]">
        Final
      </span>
    );
  }

  if (status === 'postponed') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 px-2 py-0.5 rounded-full bg-amber-500/10">
        PPD
      </span>
    );
  }

  if (status === 'cancelled') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] px-2 py-0.5 rounded-full bg-[var(--color-surface-hover)] line-through">
        Cancelled
      </span>
    );
  }

  // Scheduled - show time
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface-hover)]">
      <Clock className="w-2.5 h-2.5 text-[var(--color-text-secondary)]" />
      <span
        className="text-[10px] font-bold"
        style={{ color: 'var(--league-primary)' }}
      >
        {format(gameDate, 'h:mm a')}
      </span>
    </div>
  );
}

// =============================================================================
// Expanded Game Details Component
// =============================================================================

interface ExpandedGameDetailsProps {
  game: TickerGame;
  leagueSlug: string;
  onClose: () => void;
}

function ExpandedGameDetails({
  game,
  leagueSlug,
  onClose,
}: ExpandedGameDetailsProps) {
  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'in_progress';
  const gameDate = new Date(game.scheduled_at);

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

  const awayScore = game.away_score ?? 0;
  const homeScore = game.home_score ?? 0;
  const awayWinning = awayScore > homeScore;
  const homeWinning = homeScore > awayScore;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Details Panel */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg mt-4 mx-4 animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 98%, transparent) 0%, color-mix(in srgb, var(--color-background) 98%, transparent) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Team Color Header Bar */}
          <div className="h-1.5 flex">
            <div
              className="w-1/2"
              style={{
                backgroundColor: awayColor || 'var(--league-secondary)',
              }}
            />
            <div
              className="w-1/2"
              style={{
                backgroundColor: homeColor || 'var(--league-primary)',
              }}
            />
          </div>

          {/* Header */}
          <div className="relative px-6 pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GameStatusBadge status={game.status} gameDate={gameDate} />
              <span className="text-xs text-[var(--color-text-secondary)]">
                {format(gameDate, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--color-border-muted)] transition-colors"
            >
              <X className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
          </div>

          {/* Main Content */}
          <div className="px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              {/* Away Team */}
              <div className="flex-1 text-center">
                <div className="flex justify-center mb-3">
                  <div
                    className="p-1 rounded-xl"
                    style={{
                      background: awayWinning
                        ? `linear-gradient(135deg, ${awayColor || 'var(--league-primary)'}40, transparent)`
                        : 'transparent',
                    }}
                  >
                    <TeamLogo
                      logoUrl={game.away_team?.logo || null}
                      teamName={game.away_team?.name || 'TBD'}
                      teamColor={awayColor}
                      size="xl"
                    />
                  </div>
                </div>
                <h3
                  className={`text-lg font-bold ${awayWinning ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}
                >
                  {game.away_team?.name || 'TBD'}
                </h3>
                {game.away_team?.divisions?.name && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {game.away_team.divisions.name}
                  </p>
                )}
              </div>

              {/* Score / VS */}
              <div className="flex flex-col items-center">
                {isCompleted || isLive ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-5xl font-black tabular-nums ${
                          awayWinning ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {game.away_score ?? '-'}
                      </span>
                      <span className="text-2xl text-[var(--color-text-muted)] font-light">-</span>
                      <span
                        className={`text-5xl font-black tabular-nums ${
                          homeWinning ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {game.home_score ?? '-'}
                      </span>
                    </div>
                    {isLive && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                        <span className="text-xs font-bold text-red-400 uppercase">
                          In Progress
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div
                      className="text-3xl font-black"
                      style={{ color: 'var(--league-primary)' }}
                    >
                      VS
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xl font-bold text-[var(--color-text-primary)]">
                        {format(gameDate, 'h:mm a')}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Home Team */}
              <div className="flex-1 text-center">
                <div className="flex justify-center mb-3">
                  <div
                    className="p-1 rounded-xl"
                    style={{
                      background: homeWinning
                        ? `linear-gradient(135deg, ${homeColor || 'var(--league-primary)'}40, transparent)`
                        : 'transparent',
                    }}
                  >
                    <TeamLogo
                      logoUrl={game.home_team?.logo || null}
                      teamName={game.home_team?.name || 'TBD'}
                      teamColor={homeColor}
                      size="xl"
                    />
                  </div>
                </div>
                <h3
                  className={`text-lg font-bold ${homeWinning ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}
                >
                  {game.home_team?.name || 'TBD'}
                </h3>
                {game.home_team?.divisions?.name && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {game.home_team.divisions.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
            {game.venue && (
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{game.venue}</span>
              </div>
            )}
            <Link
              href={`/${leagueSlug}/games/${game.id}`}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: 'var(--league-primary)',
                color: 'var(--color-text-inverse)',
              }}
            >
              View Full Details
            </Link>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}

export default PremiumScoreTicker;
