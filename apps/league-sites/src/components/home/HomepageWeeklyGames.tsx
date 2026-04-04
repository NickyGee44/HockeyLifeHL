'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  List,
  MapPin,
} from 'lucide-react';
import { Card } from '@/components/ui';
import {
  formatLeagueShortWeekdayDate,
  formatLeagueTime,
} from '@/lib/league-timezone';
import type { ScheduleGame } from '@/lib/types';

type WeeklyGamesView = 'cool' | 'compact';
type TeamResult = 'W' | 'L' | null;
type WeeklyGameTeam = ScheduleGame['home_team'] | undefined;
type CarouselDirection = -1 | 1;
type CarouselPhase = 'idle' | 'pre' | 'run';

const COOL_CAROUSEL_DURATION_MS = 720;
const COOL_CAROUSEL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const COOL_HERO_IMAGE_MASK =
  'radial-gradient(138% 122% at 50% 40%, rgba(0,0,0,1) 16%, rgba(0,0,0,0.98) 32%, rgba(0,0,0,0.86) 50%, rgba(0,0,0,0.58) 68%, rgba(0,0,0,0.24) 84%, transparent 100%)';

interface HomepageWeeklyGamesProps {
  games: ScheduleGame[];
  leagueSlug: string;
  timezone?: string | null;
}

interface TeamSideProps {
  team: WeeklyGameTeam;
  leagueSlug: string;
  align: 'left' | 'right';
  result: TeamResult;
}

function getGameWinner(game: ScheduleGame): 'home' | 'away' | 'tie' | null {
  if (game.status !== 'completed') {
    return null;
  }

  const homeScore = game.home_score ?? 0;
  const awayScore = game.away_score ?? 0;

  if (homeScore > awayScore) {
    return 'home';
  }

  if (awayScore > homeScore) {
    return 'away';
  }

  return 'tie';
}

function getStatusLabel(status: ScheduleGame['status']) {
  switch (status) {
    case 'completed':
      return 'Final';
    case 'in_progress':
      return 'Live';
    case 'pending_verification':
      return 'Awaiting Review';
    case 'postponed':
      return 'Postponed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Scheduled';
  }
}

function getTeamName(team: WeeklyGameTeam) {
  return team?.name || 'TBD';
}

function getTeamResult(
  game: ScheduleGame,
  side: 'home' | 'away',
): TeamResult {
  const winner = getGameWinner(game);

  if (!winner || winner === 'tie') {
    return null;
  }

  return winner === side ? 'W' : 'L';
}

function formatCenterDisplay(game: ScheduleGame, timezone?: string | null) {
  if (game.status === 'completed') {
    return {
      label: 'Final',
      primary: `${game.away_score ?? 0} - ${game.home_score ?? 0}`,
    };
  }

  if (game.status === 'in_progress') {
    return {
      label: 'Live',
      primary: `${game.away_score ?? 0} - ${game.home_score ?? 0}`,
    };
  }

  return {
    label: getStatusLabel(game.status),
    primary: formatLeagueTime(game.scheduled_at, timezone),
  };
}

function getGameHref(game: ScheduleGame, leagueSlug: string) {
  return `/${leagueSlug}/games/${game.id}`;
}

function getGameAriaLabel(game: ScheduleGame) {
  return `Open matchup details for ${getTeamName(game.away_team)} at ${getTeamName(game.home_team)}`;
}

function getCoolSlideStyle({
  phase,
  direction,
  role,
}: {
  phase: CarouselPhase;
  direction: CarouselDirection;
  role: 'current' | 'previous';
}): CSSProperties {
  const transition = [
    `transform ${COOL_CAROUSEL_DURATION_MS}ms ${COOL_CAROUSEL_EASING}`,
    `opacity ${COOL_CAROUSEL_DURATION_MS}ms ${COOL_CAROUSEL_EASING}`,
    `filter ${COOL_CAROUSEL_DURATION_MS}ms ${COOL_CAROUSEL_EASING}`,
  ].join(', ');
  const enterOffset = direction > 0 ? '108%' : '-108%';
  const exitOffset = direction > 0 ? '-108%' : '108%';

  if (phase === 'idle') {
    return {
      transform: 'translate3d(0, 0, 0) scale(1)',
      opacity: 1,
      filter: 'blur(0px)',
      transition,
      willChange: 'transform, opacity, filter',
    };
  }

  if (phase === 'pre') {
    return role === 'current'
      ? {
          transform: `translate3d(${enterOffset}, 0, 0) scale(0.98)`,
          opacity: 0.42,
          filter: 'blur(10px)',
          transition,
          willChange: 'transform, opacity, filter',
        }
      : {
          transform: 'translate3d(0, 0, 0) scale(1)',
          opacity: 1,
          filter: 'blur(0px)',
          transition,
          willChange: 'transform, opacity, filter',
        };
  }

  return role === 'current'
    ? {
        transform: 'translate3d(0, 0, 0) scale(1)',
        opacity: 1,
        filter: 'blur(0px)',
        transition,
        willChange: 'transform, opacity, filter',
      }
    : {
        transform: `translate3d(${exitOffset}, 0, 0) scale(0.98)`,
        opacity: 0.18,
        filter: 'blur(10px)',
        transition,
        willChange: 'transform, opacity, filter',
      };
}

function TeamLink({
  team,
  leagueSlug,
  className,
}: {
  team: WeeklyGameTeam;
  leagueSlug: string;
  className: string;
}) {
  const teamName = getTeamName(team);

  if (!team?.slug) {
    return <span className={className}>{teamName}</span>;
  }

  return (
    <Link href={`/${leagueSlug}/teams/${team.slug}`} className={className}>
      {teamName}
    </Link>
  );
}

function OutcomeBadge({
  result,
  size = 'lg',
}: {
  result: TeamResult;
  size?: 'sm' | 'lg';
}) {
  if (!result) {
    return null;
  }

  const isWin = result === 'W';
  const sizeClass =
    size === 'sm'
      ? 'text-[1.65rem] sm:text-[1.9rem]'
      : 'text-[2.6rem] sm:text-[3.5rem] md:text-[4.75rem]';

  return (
    <span
      className={`z-20 ${sizeClass} select-none font-black uppercase leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${
        isWin ? 'text-emerald-400' : 'text-red-500'
      }`}
      style={{
        WebkitTextStroke:
          size === 'sm'
            ? '1.5px rgba(255,255,255,0.95)'
            : '2.5px rgba(255,255,255,0.95)',
      }}
    >
      {result}
    </span>
  );
}

function CoolViewTeam({ team, leagueSlug, align, result }: TeamSideProps) {
  void leagueSlug;

  const sidePositionClass =
    align === 'left' ? 'items-start text-left' : 'items-end text-right';
  const badgePositionClass =
    align === 'left'
      ? 'right-[12%] top-[89%] -translate-y-1/2 sm:right-[11%] md:right-[10%]'
      : 'left-[12%] top-[89%] -translate-y-1/2 sm:left-[11%] md:left-[10%]';

  return (
    <div className={`relative flex flex-col ${sidePositionClass} gap-3`}>
      <div className="relative">
        <div className="relative flex h-[232px] w-[232px] items-center justify-center sm:h-[336px] sm:w-[336px] md:h-[432px] md:w-[432px]">
          <div className="relative h-[200px] w-[200px] sm:h-[280px] sm:w-[280px] md:h-[375px] md:w-[375px]">
            <Image
              src={team?.logo || '/blank_team.png'}
              alt={team?.name || 'TBD'}
              width={288}
              height={288}
              className="h-full w-full object-contain drop-shadow-[0_24px_36px_rgba(0,0,0,0.6)]"
            />
            <span className={`absolute ${badgePositionClass}`}>
              <OutcomeBadge result={result} />
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[280px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/74">
          {align === 'left' ? 'Away' : 'Home'}
        </p>
        <span className="mt-2 block text-balance text-2xl font-black tracking-tight text-white [text-shadow:0_10px_26px_rgba(0,0,0,0.92)] md:text-4xl">
          {getTeamName(team)}
        </span>
      </div>
    </div>
  );
}

function CoolCardTeam({
  team,
  leagueSlug,
  align,
}: {
  team: WeeklyGameTeam;
  leagueSlug: string;
  align: 'left' | 'right';
}) {
  return (
    <div className={align === 'left' ? 'text-left' : 'text-right'}>
      <TeamLink
        team={team}
        leagueSlug={leagueSlug}
        className="block text-balance text-base font-black tracking-tight text-[var(--color-text-primary)] transition-colors duration-200 hover:text-[var(--league-primary)] sm:text-lg"
      />
    </div>
  );
}

function CompactTeam({
  team,
  leagueSlug,
  align,
  result,
}: TeamSideProps) {
  const wrapperClass =
    align === 'left'
      ? 'items-start text-left'
      : 'flex-row-reverse items-end text-right';
  const badgePositionClass =
    align === 'left' ? 'bottom-0 right-0' : 'bottom-0 left-0';

  return (
    <div className={`relative flex ${wrapperClass} gap-3`}>
      <div className="relative shrink-0">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-elevated)]/72 shadow-[0_18px_32px_-24px_rgba(0,0,0,0.8)]">
          <Image
            src={team?.logo || '/blank_team.png'}
            alt={team?.name || 'TBD'}
            width={56}
            height={56}
            className="h-11 w-11 object-contain"
          />
        </div>
        <span className={`absolute ${badgePositionClass}`}>
          <OutcomeBadge result={result} size="sm" />
        </span>
      </div>
      <div className="min-w-0">
        <TeamLink
          team={team}
          leagueSlug={leagueSlug}
          className="block text-sm font-bold text-[var(--color-text-primary)] transition-colors duration-200 hover:text-[var(--league-primary)] sm:text-base"
        />
      </div>
    </div>
  );
}

function CoolView({
  games,
  activeIndex,
  previousIndex,
  transitionDirection,
  transitionPhase,
  isTransitioning,
  onNavigate,
  leagueSlug,
  timezone,
}: {
  games: ScheduleGame[];
  activeIndex: number;
  previousIndex: number | null;
  transitionDirection: CarouselDirection;
  transitionPhase: CarouselPhase;
  isTransitioning: boolean;
  onNavigate: (direction: number) => void;
  leagueSlug: string;
  timezone?: string | null;
}) {
  const game = games[activeIndex];
  const previousGame = previousIndex !== null ? games[previousIndex] : null;
  const hasControls = games.length > 1;
  const heroHref = getGameHref(game, leagueSlug);

  const renderHeroSlide = (
    slideGame: ScheduleGame,
    role: 'current' | 'previous',
  ) => (
    <div
      aria-hidden={role === 'previous'}
      className="pointer-events-none col-start-1 row-start-1"
      style={getCoolSlideStyle({
        phase: isTransitioning ? transitionPhase : 'idle',
        direction: transitionDirection,
        role,
      })}
    >
      <div className="grid min-h-[400px] grid-cols-[1fr_1fr] items-end gap-4 px-5 pb-32 pt-16 sm:min-h-[520px] sm:px-8 sm:pb-36 md:px-10 lg:min-h-[620px] lg:pb-44">
        <CoolViewTeam
          team={slideGame.away_team}
          leagueSlug={leagueSlug}
          align="left"
          result={getTeamResult(slideGame, 'away')}
        />
        <CoolViewTeam
          team={slideGame.home_team}
          leagueSlug={leagueSlug}
          align="right"
          result={getTeamResult(slideGame, 'home')}
        />
      </div>
    </div>
  );

  const renderDetailsSlide = (
    slideGame: ScheduleGame,
    role: 'current' | 'previous',
  ) => {
    const centerDisplay = formatCenterDisplay(slideGame, timezone);

    return (
      <div
        aria-hidden={role === 'previous'}
        className="col-start-1 row-start-1"
        style={getCoolSlideStyle({
          phase: isTransitioning ? transitionPhase : 'idle',
          direction: transitionDirection,
          role,
        })}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[var(--league-primary)]" />
            {formatLeagueShortWeekdayDate(slideGame.scheduled_at, timezone)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 text-[var(--league-primary)]" />
            {formatLeagueTime(slideGame.scheduled_at, timezone)}
          </span>
          {slideGame.venue && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--league-primary)]" />
              {slideGame.venue}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <CoolCardTeam
            team={slideGame.away_team}
            leagueSlug={leagueSlug}
            align="left"
          />
          <div
            className="rounded-[18px] border border-white/10 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-background-elevated) 76%, transparent)',
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              {centerDisplay.label}
            </p>
            <p className="mt-1 text-xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
              {centerDisplay.primary}
            </p>
          </div>
          <CoolCardTeam
            team={slideGame.home_team}
            leagueSlug={leagueSlug}
            align="right"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 animate-fade-in">
      <div className="relative">
        <div className="relative overflow-hidden rounded-[30px] bg-[var(--color-surface)] shadow-[0_34px_80px_-46px_rgba(0,0,0,0.88)]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at top left, color-mix(in srgb, var(--league-primary) 14%, transparent), transparent 46%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 44%, transparent) 0%, color-mix(in srgb, var(--color-surface) 12%, transparent) 34%, color-mix(in srgb, var(--color-surface) 70%, transparent) 74%, var(--color-surface) 100%)',
            }}
          />
          <div
            className="absolute inset-0 scale-[1.05] bg-cover bg-center opacity-95"
            style={{
              backgroundImage: "url('/homepage/weekly-games-bg.jpg')",
              WebkitMaskImage: COOL_HERO_IMAGE_MASK,
              maskImage: COOL_HERO_IMAGE_MASK,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 42%, transparent 0%, transparent 28%, color-mix(in srgb, var(--color-surface) 18%, transparent) 52%, color-mix(in srgb, var(--color-surface) 62%, transparent) 76%, var(--color-surface) 100%)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-56 sm:h-64"
            style={{
              backgroundImage:
                'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--color-surface) 34%, transparent) 24%, color-mix(in srgb, var(--color-surface) 72%, transparent) 54%, var(--color-surface) 100%)',
            }}
          />

          <Link
            href={heroHref}
            aria-label={getGameAriaLabel(game)}
            className="absolute inset-0 z-10 block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--league-primary)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-surface)]"
          >
            <span className="sr-only">{getGameAriaLabel(game)}</span>
          </Link>

          <div className="pointer-events-none absolute left-4 top-4 z-30 rounded-full border border-white/16 bg-black/38 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            {activeIndex + 1} / {games.length}
          </div>
          <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-full border border-white/16 bg-black/38 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            {getStatusLabel(game.status)}
          </div>

          {hasControls && (
            <>
              <button
                type="button"
                aria-label="Previous game"
                onClick={() => onNavigate(-1)}
                disabled={isTransitioning}
                className="absolute left-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-black/34 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/52 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next game"
                onClick={() => onNavigate(1)}
                disabled={isTransitioning}
                className="absolute right-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-black/34 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/52 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="relative z-20 grid">
            {previousGame ? renderHeroSlide(previousGame, 'previous') : null}
            {renderHeroSlide(game, 'current')}
          </div>
        </div>

        <div
          className="relative z-30 -mt-24 px-3 sm:-mt-28 sm:px-6 lg:-mt-32"
          style={{
            filter: 'drop-shadow(0 28px 56px rgba(0,0,0,0.38))',
          }}
        >
          <div
            className="mx-auto max-w-2xl overflow-hidden rounded-[26px] border p-3 sm:p-4"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--league-secondary) 18%, rgba(255,255,255,0.12))',
              backgroundImage:
                'linear-gradient(180deg, color-mix(in srgb, var(--league-secondary) 24%, rgba(255,255,255,0.26)) 0%, color-mix(in srgb, var(--color-background-elevated) 86%, transparent) 100%)',
              borderColor:
                'color-mix(in srgb, var(--league-primary) 12%, color-mix(in srgb, var(--league-secondary) 18%, rgba(255,255,255,0.18)))',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.16), 0 30px 70px -48px rgba(0,0,0,0.95)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div className="grid">
              {previousGame ? renderDetailsSlide(previousGame, 'previous') : null}
              {renderDetailsSlide(game, 'current')}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              {games.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-label={`Show game ${index + 1}`}
                  aria-pressed={index === activeIndex}
                  disabled={isTransitioning}
                  onClick={() => onNavigate(index - activeIndex)}
                  className={`h-2.5 rounded-full transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                    index === activeIndex
                      ? 'w-7 bg-[var(--league-primary)]'
                      : 'w-2.5 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactView({
  games,
  leagueSlug,
  timezone,
}: {
  games: ScheduleGame[];
  leagueSlug: string;
  timezone?: string | null;
}) {
  return (
    <div className="mt-6 grid gap-3">
      {games.map((game) => {
        const centerDisplay = formatCenterDisplay(game, timezone);

        return (
          <article
            key={game.id}
            className="relative overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-background-elevated)_94%,transparent),color-mix(in_srgb,var(--color-surface)_92%,transparent))] p-4 shadow-[0_26px_60px_-42px_rgba(0,0,0,0.82)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.15),transparent_58%)]" />
            <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <CompactTeam
                team={game.away_team}
                leagueSlug={leagueSlug}
                align="left"
                result={getTeamResult(game, 'away')}
              />

              <div className="min-w-[96px] text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  {centerDisplay.label}
                </p>
                <p className="mt-1 text-lg font-black tracking-tight text-[var(--color-text-primary)] sm:text-xl">
                  {centerDisplay.primary}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                  {formatLeagueShortWeekdayDate(game.scheduled_at, timezone)}
                </p>
              </div>

              <CompactTeam
                team={game.home_team}
                leagueSlug={leagueSlug}
                align="right"
                result={getTeamResult(game, 'home')}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
              <span>{formatLeagueTime(game.scheduled_at, timezone)}</span>
              {game.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[var(--league-primary)]" />
                  {game.venue}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function HomepageWeeklyGames({
  games,
  leagueSlug,
  timezone,
}: HomepageWeeklyGamesProps) {
  const [view, setView] = useState<WeeklyGamesView>('cool');
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [transitionDirection, setTransitionDirection] =
    useState<CarouselDirection>(1);
  const [transitionPhase, setTransitionPhase] =
    useState<CarouselPhase>('idle');
  const isCompactView = view === 'compact';
  const isTransitioning = previousIndex !== null;
  const activeIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    setActiveIndex(0);
    activeIndexRef.current = 0;
    setPreviousIndex(null);
    setTransitionPhase('idle');
  }, [games.length]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  useEffect(() => {
    if (transitionPhase !== 'pre') {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      setTransitionPhase('run');
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [transitionPhase]);

  useEffect(() => {
    if (!isTransitioning || transitionPhase !== 'run') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPreviousIndex(null);
      setTransitionPhase('idle');
    }, COOL_CAROUSEL_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isTransitioning, transitionPhase]);

  useEffect(() => {
    if (view !== 'cool' || games.length < 2) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      if (isTransitioningRef.current) {
        return;
      }

      const currentIndex = activeIndexRef.current;

      setPreviousIndex(currentIndex);
      setTransitionDirection(1);
      setTransitionPhase('pre');
      setActiveIndex((currentIndex + 1) % games.length);
    }, 6500);

    return () => window.clearInterval(timerId);
  }, [view, games.length]);

  const handleNavigate = (direction: number) => {
    if (games.length === 0 || direction === 0 || isTransitioningRef.current) {
      return;
    }

    const currentIndex = activeIndexRef.current;
    const nextIndex = (currentIndex + direction) % games.length;

    setPreviousIndex(currentIndex);
    setTransitionDirection(direction < 0 ? -1 : 1);
    setTransitionPhase('pre');
    setActiveIndex(nextIndex >= 0 ? nextIndex : games.length + nextIndex);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
            <Calendar className="h-3.5 w-3.5" />
            This Week
            <span className="text-[var(--color-text-muted)]">•</span>
            {games.length} {games.length === 1 ? 'game' : 'games'}
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            This Week’s Games
          </h2>
        </div>

        <button
          type="button"
          aria-label={isCompactView ? 'Switch to cool view' : 'Switch to compact view'}
          aria-pressed={isCompactView}
          onClick={() => setView((current) => (current === 'cool' ? 'compact' : 'cool'))}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/82 text-[var(--league-primary)] shadow-[0_16px_40px_-28px_rgba(0,0,0,0.7)] transition-colors duration-200 hover:border-[var(--league-primary)] hover:text-[var(--color-text-primary)]"
          title={isCompactView ? 'Switch to cool view' : 'Switch to compact view'}
        >
          {isCompactView ? <ImageIcon className="h-5 w-5" /> : <List className="h-5 w-5" />}
        </button>
      </div>

      {games.length > 0 ? (
        view === 'cool' ? (
          <CoolView
            games={games}
            activeIndex={activeIndex}
            previousIndex={previousIndex}
            transitionDirection={transitionDirection}
            transitionPhase={transitionPhase}
            isTransitioning={isTransitioning}
            onNavigate={handleNavigate}
            leagueSlug={leagueSlug}
            timezone={timezone}
          />
        ) : (
          <CompactView games={games} leagueSlug={leagueSlug} timezone={timezone} />
        )
      ) : (
        <Card variant="glass" padding="lg" hover={false} className="mt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--league-primary)]/12 text-[var(--league-primary)]">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">
                No games scheduled this week
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Check the full schedule for the next slate and recent scores.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
