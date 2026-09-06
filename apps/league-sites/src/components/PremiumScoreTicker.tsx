'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { formatLeagueRelativeDateLabel, formatLeagueTime } from '@/lib/league-timezone';
import type { TickerGame } from '@/lib/types';

interface PremiumScoreTickerProps {
  games: TickerGame[];
  leagueSlug: string;
  autoScroll?: boolean;
  scrollSpeed?: number;
  timezone?: string | null;
}

function getTeamColor(colors: string | null): string | null {
  if (!colors) return null;
  if (colors.startsWith('#')) return colors;

  try {
    const parsed = JSON.parse(colors);
    return parsed.primary || parsed.color || null;
  } catch {
    return null;
  }
}

function formatGameDate(gameDate: Date, timezone?: string | null) {
  return formatLeagueRelativeDateLabel(gameDate, timezone);
}

export function PremiumScoreTicker({
  games,
  leagueSlug,
  autoScroll = true,
  scrollSpeed = 36,
  timezone,
}: PremiumScoreTickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  const liveGames = (games || []).filter((game) => game.status === 'in_progress');
  const upcomingGames = (games || []).filter((game) => game.status === 'scheduled');
  const completedGames = (games || []).filter((game) => game.status === 'completed');
  const orderedGames = [...liveGames, ...upcomingGames, ...completedGames];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncDesktopState = () => setIsDesktop(mediaQuery.matches);

    syncDesktopState();
    mediaQuery.addEventListener('change', syncDesktopState);

    return () => mediaQuery.removeEventListener('change', syncDesktopState);
  }, []);

  const shouldAutoScroll = autoScroll && isDesktop && orderedGames.length > 1;
  const displayGames = shouldAutoScroll ? [...orderedGames, ...orderedGames] : orderedGames;
  const showControls = isDesktop && orderedGames.length > 1;

  // TODO(Pixel): refactor to derived state — reset on layout change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrollPosition(0);
    lastTimeRef.current = 0;
  }, [shouldAutoScroll, orderedGames.length]);

  useEffect(() => {
    if (!shouldAutoScroll) {
      return undefined;
    }

    const animate = (currentTime: number) => {
      if (!trackRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (isPaused) {
        lastTimeRef.current = currentTime;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const scrollWidth = trackRef.current.scrollWidth / 2;
      setScrollPosition((previous) => {
        if (scrollWidth <= 0) {
          return 0;
        }
        return (previous + scrollSpeed * deltaTime) % scrollWidth;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, scrollSpeed, shouldAutoScroll]);

  if (!games || games.length === 0) {
    return null;
  }

  const nudgeTrack = (direction: -1 | 1) => {
    const amount = 212;

    if (shouldAutoScroll) {
      if (!trackRef.current) {
        return;
      }

      const maxScroll = trackRef.current.scrollWidth / 2;
      setScrollPosition((previous) => {
        if (direction < 0) {
          return previous <= 0 ? Math.max(0, maxScroll - amount) : Math.max(0, previous - amount);
        }
        return previous + amount >= maxScroll ? 0 : previous + amount;
      });
      return;
    }

    if (!trackRef.current) {
      return;
    }

    const maxNativeScroll = trackRef.current.scrollWidth - trackRef.current.clientWidth;
    const currentScroll = trackRef.current.scrollLeft;

    if (direction < 0) {
      trackRef.current.scrollTo({
        left: currentScroll <= 0 ? maxNativeScroll : Math.max(0, currentScroll - amount),
        behavior: 'smooth',
      });
      return;
    }

    trackRef.current.scrollTo({
      left: currentScroll + amount >= maxNativeScroll ? 0 : currentScroll + amount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="score-ticker glass-chrome relative w-full" data-testid="score-ticker">
      <div
        className="relative w-full overflow-hidden backdrop-blur-md"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-background) 96%, transparent) 0%, color-mix(in srgb, var(--color-background) 89%, transparent) 100%)',
          borderBottom: '1px solid var(--color-border-muted)',
        }}
        onMouseEnter={() => {
          if (showControls) {
            setIsPaused(true);
          }
        }}
        onMouseLeave={() => setIsPaused(false)}
        role="region"
        aria-label="Live scores and upcoming games ticker"
      >
        {liveGames.length > 0 && (
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
            }}
          />
        )}

        {showControls && (
          <button
            type="button"
            onClick={() => nudgeTrack(-1)}
            className="absolute bottom-0 left-0 top-0 z-30 hidden min-h-11 w-11 items-center justify-center transition-opacity duration-200 hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--league-primary)] lg:flex"
            style={{
              background:
                'linear-gradient(to right, color-mix(in srgb, var(--color-background) 96%, transparent) 34%, transparent)',
            }}
            aria-label="Scroll left"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border-muted)] bg-[var(--color-surface)]/88 text-[var(--color-text-secondary)] backdrop-blur-sm transition-colors duration-200 hover:text-[var(--color-text-primary)]">
              <ChevronLeft className="h-3 w-3" />
            </span>
          </button>
        )}

        <div
          ref={trackRef}
          className={`flex gap-1 px-1.5 py-1 sm:px-2 ${shouldAutoScroll ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide touch-pan-x snap-x snap-mandatory lg:snap-none'}`}
          style={
            shouldAutoScroll
              ? {
                  transform: `translateX(-${scrollPosition}px)`,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }
              : {
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }
          }
        >
          {displayGames.map((game, index) => (
            <TickerGameCard
              key={`${game.id}-${index}`}
              game={game}
              leagueSlug={leagueSlug}
              timezone={timezone}
            />
          ))}
        </div>

        {showControls && (
          <button
            type="button"
            onClick={() => nudgeTrack(1)}
            className="absolute bottom-0 right-0 top-0 z-30 hidden min-h-11 w-11 items-center justify-center transition-opacity duration-200 hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--league-primary)] lg:flex"
            style={{
              background:
                'linear-gradient(to left, color-mix(in srgb, var(--color-background) 96%, transparent) 34%, transparent)',
            }}
            aria-label="Scroll right"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border-muted)] bg-[var(--color-surface)]/88 text-[var(--color-text-secondary)] backdrop-blur-sm transition-colors duration-200 hover:text-[var(--color-text-primary)]">
              <ChevronRight className="h-3 w-3" />
            </span>
          </button>
        )}

        {showControls && (
          <>
            <div
              className="pointer-events-none absolute bottom-0 left-7 top-0 z-10 hidden w-3 lg:block"
              style={{
                background:
                  'linear-gradient(to right, color-mix(in srgb, var(--color-background) 90%, transparent), transparent)',
              }}
            />
            <div
              className="pointer-events-none absolute bottom-0 right-7 top-0 z-10 hidden w-3 lg:block"
              style={{
                background:
                  'linear-gradient(to left, color-mix(in srgb, var(--color-background) 90%, transparent), transparent)',
              }}
            />
          </>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

interface TickerGameCardProps {
  game: TickerGame;
  leagueSlug: string;
  timezone?: string | null;
}

function TickerGameCard({ game, leagueSlug, timezone }: TickerGameCardProps) {
  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'in_progress';
  const isScheduled = game.status === 'scheduled';
  const gameDate = new Date(game.scheduled_at);
  const awayColor = getTeamColor(game.away_team?.colors || null);
  const homeColor = getTeamColor(game.home_team?.colors || null);
  const awayScore = game.away_score ?? 0;
  const homeScore = game.home_score ?? 0;
  const awayWinning = awayScore > homeScore;
  const homeWinning = homeScore > awayScore;
  const divisionLabel = game.home_team?.divisions?.name || game.away_team?.divisions?.name || null;

  return (
    <Link
      href={`/${leagueSlug}/games/${game.id}`}
      className="group relative min-w-0 flex-shrink-0 snap-start"
      style={{ minWidth: '208px' }}
    >
      <article
        className="glass-card overflow-hidden rounded-[14px] px-2 py-1.5 transition-all duration-200 group-hover:border-[var(--league-primary-border)]"
        style={{
          background: isLive
            ? 'linear-gradient(135deg, rgba(239,68,68,0.11) 0%, color-mix(in srgb, var(--color-surface) 96%, transparent) 48%, color-mix(in srgb, var(--color-surface) 92%, transparent) 100%)'
            : 'linear-gradient(135deg, color-mix(in srgb, var(--color-surface-hover) 28%, transparent) 0%, color-mix(in srgb, var(--color-surface) 95%, transparent) 100%)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <div
            className="h-full"
            style={{
              background: `linear-gradient(90deg, ${awayColor || 'var(--league-secondary)'}, ${homeColor || 'var(--league-primary)'})`,
              opacity: isCompleted || isLive ? 1 : 0.8,
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-1 pt-0.5">
          <span className="truncate text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {formatGameDate(gameDate, timezone)}
          </span>
          <GameStatusBadge status={game.status} gameDate={gameDate} timezone={timezone} />
        </div>

        <div className="mt-1 space-y-0.5">
          <TeamRow
            team={game.away_team}
            score={game.away_score}
            isWinning={awayWinning && (isCompleted || isLive)}
            showScore={isCompleted || isLive}
            teamColor={awayColor}
            isLive={isLive}
          />
          <TeamRow
            team={game.home_team}
            score={game.home_score}
            isWinning={homeWinning && (isCompleted || isLive)}
            showScore={isCompleted || isLive}
            teamColor={homeColor}
            isLive={isLive}
          />
        </div>

        <div className="mt-1 flex items-center justify-between gap-1 border-t border-[var(--color-border-muted)] pt-1">
          <span className="flex min-w-0 flex-1 items-center gap-1 text-[8px] text-[var(--color-text-secondary)]">
            <MapPin className="h-2.5 w-2.5 shrink-0 text-[var(--color-text-muted)]" />
            <span className="truncate" title={game.venue || 'Venue TBA'}>{game.venue || 'Venue TBA'}</span>
          </span>
          {divisionLabel && (
            <span
              className="max-w-[72px] shrink rounded-full border border-[var(--league-primary-border)] bg-[var(--league-primary-soft)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--color-accent)] truncate"
              title={divisionLabel}
            >
              {divisionLabel}
            </span>
          )}
        </div>

        {isScheduled && (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="absolute inset-0 bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.08)_50%,transparent_70%)]" />
          </div>
        )}
      </article>
    </Link>
  );
}

interface TeamRowProps {
  team: TickerGame['home_team'];
  score: number | null;
  isWinning: boolean;
  showScore: boolean;
  teamColor: string | null;
  isLive: boolean;
}

function TeamRow({ team, score, isWinning, showScore, teamColor, isLive }: TeamRowProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <TeamLogo
          logoUrl={team?.logo || null}
          teamName={team?.name || 'TBD'}
          teamColor={teamColor}
          size="xs"
        />
        <span
          className={`block min-w-0 truncate text-[12px] font-semibold leading-tight ${
            isWinning ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
          }`}
          title={team?.name || 'TBD'}
        >
          {team?.name || 'TBD'}
        </span>
      </div>

      {showScore ? (
        <div className="flex shrink-0 items-center gap-1">
          {isWinning && (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: isLive ? '#ef4444' : 'var(--league-primary-strong)',
              }}
            />
          )}
          <span
            className={`text-xl font-black tabular-nums ${
              isWinning ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {score ?? '-'}
          </span>
        </div>
      ) : (
        <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          {isLive ? 'Live' : ''}
        </span>
      )}
    </div>
  );
}

interface GameStatusBadgeProps {
  status: TickerGame['status'];
  gameDate: Date;
  timezone?: string | null;
}

function GameStatusBadge({ status, gameDate, timezone }: GameStatusBadgeProps) {
  if (status === 'in_progress') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/12 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-red-400">
        <span className="h-1 w-1 rounded-full bg-red-400" />
        Live
      </span>
    );
  }

  if (status === 'completed' || status === 'pending_verification') {
    return (
      <span className="shrink-0 rounded-full bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
        Final
      </span>
    );
  }

  if (status === 'postponed') {
    return (
      <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-amber-400">
        PPD
      </span>
    );
  }

  if (status === 'cancelled') {
    return (
      <span className="shrink-0 rounded-full bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] line-through">
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--league-primary-border)] bg-[var(--league-primary-soft)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--color-accent)]">
      <Clock className="h-2 w-2 text-[var(--color-text-secondary)]" />
      {formatLeagueTime(gameDate, timezone)}
    </span>
  );
}

export default PremiumScoreTicker;
