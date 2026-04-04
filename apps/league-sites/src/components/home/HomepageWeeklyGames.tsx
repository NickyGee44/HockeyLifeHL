'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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

function TeamLink({
  team,
  leagueSlug,
  className,
}: {
  team: WeeklyGameTeam;
  leagueSlug: string;
  className: string;
}) {
  const teamName = team?.name || 'TBD';

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
  const sidePositionClass =
    align === 'left' ? 'items-start text-left' : 'items-end text-right';
  const badgePositionClass =
    align === 'left'
      ? 'bottom-1 right-1 sm:bottom-2 sm:right-2 md:bottom-4 md:right-4'
      : 'bottom-1 left-1 sm:bottom-2 sm:left-2 md:bottom-4 md:left-4';

  return (
    <div className={`relative flex flex-col ${sidePositionClass} gap-4`}>
      <div className="relative">
        <div className="relative flex h-40 w-40 items-center justify-center sm:h-56 sm:w-56 md:h-72 md:w-72">
          <Image
            src={team?.logo || '/blank_team.png'}
            alt={team?.name || 'TBD'}
            width={288}
            height={288}
            className="h-32 w-32 object-contain drop-shadow-[0_24px_36px_rgba(0,0,0,0.6)] sm:h-44 sm:w-44 md:h-60 md:w-60"
          />
          <span className={`absolute ${badgePositionClass}`}>
            <OutcomeBadge result={result} />
          </span>
        </div>
      </div>

      <div className="max-w-[280px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/74">
          {align === 'left' ? 'Away' : 'Home'}
        </p>
        <TeamLink
          team={team}
          leagueSlug={leagueSlug}
          className="mt-2 block text-balance text-2xl font-black tracking-tight text-white [text-shadow:0_10px_26px_rgba(0,0,0,0.92)] transition-colors duration-200 hover:text-[var(--league-primary)] md:text-4xl"
        />
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {align === 'left' ? 'Away' : 'Home'}
      </p>
      <TeamLink
        team={team}
        leagueSlug={leagueSlug}
        className="mt-1 block text-base font-black tracking-tight text-[var(--color-text-primary)] transition-colors duration-200 hover:text-[var(--league-primary)] sm:text-lg"
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
  onNavigate,
  leagueSlug,
  timezone,
}: {
  games: ScheduleGame[];
  activeIndex: number;
  onNavigate: (direction: number) => void;
  leagueSlug: string;
  timezone?: string | null;
}) {
  const game = games[activeIndex];
  const centerDisplay = formatCenterDisplay(game, timezone);
  const hasControls = games.length > 1;

  return (
    <div className="mt-6 animate-fade-in">
      <div className="relative min-h-[360px] rounded-[30px] bg-[var(--color-surface)] sm:min-h-[440px] lg:min-h-[520px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/homepage/weekly-games-bg.jpg')",
            WebkitMaskImage:
              'radial-gradient(ellipse 96% 88% at 50% 50%, rgba(0,0,0,1) 58%, rgba(0,0,0,0.88) 72%, rgba(0,0,0,0.52) 84%, transparent 100%)',
            maskImage:
              'radial-gradient(ellipse 96% 88% at 50% 50%, rgba(0,0,0,1) 58%, rgba(0,0,0,0.88) 72%, rgba(0,0,0,0.52) 84%, transparent 100%)',
          }}
        />

        <div className="absolute left-4 top-4 z-20 rounded-full border border-white/16 bg-black/38 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
          {activeIndex + 1} / {games.length}
        </div>
        <div className="absolute right-4 top-4 z-20 rounded-full border border-white/16 bg-black/38 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
          {getStatusLabel(game.status)}
        </div>

        {hasControls && (
          <>
            <button
              type="button"
              aria-label="Previous game"
              onClick={() => onNavigate(-1)}
              className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-black/34 text-white transition-colors duration-200 hover:bg-black/52"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next game"
              onClick={() => onNavigate(1)}
              className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-black/34 text-white transition-colors duration-200 hover:bg-black/52"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div
          key={game.id}
          className="grid min-h-[360px] grid-cols-[1fr_1fr] items-center gap-4 px-5 py-16 sm:min-h-[440px] sm:px-8 md:px-10 lg:min-h-[520px]"
        >
          <CoolViewTeam
            team={game.away_team}
            leagueSlug={leagueSlug}
            align="left"
            result={getTeamResult(game, 'away')}
          />
          <CoolViewTeam
            team={game.home_team}
            leagueSlug={leagueSlug}
            align="right"
            result={getTeamResult(game, 'home')}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mx-auto max-w-xl rounded-[22px] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background-elevated)_94%,transparent)] p-3 shadow-[0_28px_60px_-42px_rgba(0,0,0,0.88)] sm:p-4">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatLeagueShortWeekdayDate(game.scheduled_at, timezone)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {formatLeagueTime(game.scheduled_at, timezone)}
            </span>
            {game.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {game.venue}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <CoolCardTeam
              team={game.away_team}
              leagueSlug={leagueSlug}
              align="left"
            />
            <div className="rounded-[18px] bg-[var(--color-surface)] px-3 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {centerDisplay.label}
              </p>
              <p className="mt-1 text-xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                {centerDisplay.primary}
              </p>
            </div>
            <CoolCardTeam
              team={game.home_team}
              leagueSlug={leagueSlug}
              align="right"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {games.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-label={`Show game ${index + 1}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => onNavigate(index - activeIndex)}
                  className={`h-2.5 rounded-full transition-all duration-200 ${
                    index === activeIndex
                      ? 'w-7 bg-[var(--league-primary)]'
                      : 'w-2.5 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
                  }`}
                />
              ))}
            </div>
            <Link
              href={`/${leagueSlug}/games/${game.id}`}
              className="inline-flex items-center justify-center text-sm font-semibold text-[var(--league-primary)] transition-colors duration-200 hover:text-[var(--color-text-primary)]"
            >
              Matchup Details
            </Link>
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
  const isCompactView = view === 'compact';

  useEffect(() => {
    setActiveIndex(0);
  }, [games.length]);

  useEffect(() => {
    if (view !== 'cool' || games.length < 2) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % games.length);
    }, 6500);

    return () => window.clearInterval(timerId);
  }, [view, games.length]);

  const handleNavigate = (direction: number) => {
    if (games.length === 0 || direction === 0) {
      return;
    }

    setActiveIndex((current) => {
      const nextIndex = (current + direction) % games.length;
      return nextIndex >= 0 ? nextIndex : games.length + nextIndex;
    });
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
