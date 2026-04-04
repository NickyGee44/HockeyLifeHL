'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react';
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
  const sizeClass = size === 'sm' ? 'h-9 w-9 text-sm' : 'h-14 w-14 text-xl md:h-16 md:w-16 md:text-2xl';

  return (
    <span
      className={`z-20 flex ${sizeClass} items-center justify-center rounded-full border font-black shadow-[0_18px_36px_-18px_rgba(0,0,0,0.9)] ${
        isWin
          ? 'border-emerald-300/45 bg-emerald-500 text-white'
          : 'border-red-300/45 bg-red-500 text-white'
      }`}
    >
      {result}
    </span>
  );
}

function CoolViewTeam({ team, leagueSlug, align, result }: TeamSideProps) {
  const sidePositionClass = align === 'left' ? 'items-start text-left' : 'items-end text-right';
  const badgePositionClass = align === 'left' ? '-right-3 md:-right-4' : '-left-3 md:-left-4';
  const logoGlow =
    align === 'left'
      ? 'from-white/16 via-white/8 to-transparent'
      : 'from-transparent via-white/8 to-white/16';

  return (
    <div className={`relative flex flex-col ${sidePositionClass} gap-4`}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--league-primary)]/28 via-transparent to-white/10 blur-2xl" />
        <div className={`relative overflow-visible rounded-full bg-gradient-to-br ${logoGlow} p-4`}>
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/16 bg-black/20 shadow-[0_28px_80px_-36px_rgba(0,0,0,0.95)] backdrop-blur-sm sm:h-36 sm:w-36 md:h-44 md:w-44">
            <Image
              src={team?.logo || '/blank_team.png'}
              alt={team?.name || 'TBD'}
              width={176}
              height={176}
              className="h-20 w-20 object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)] sm:h-28 sm:w-28 md:h-36 md:w-36"
            />
          </div>
          <span className={`absolute ${badgePositionClass}`}>
            <OutcomeBadge result={result} />
          </span>
        </div>
      </div>

      <div className="max-w-[220px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          {align === 'left' ? 'Away' : 'Home'}
        </p>
        <TeamLink
          team={team}
          leagueSlug={leagueSlug}
          className="mt-2 block text-balance text-xl font-black tracking-tight text-white transition-colors duration-200 hover:text-[var(--league-primary)] md:text-3xl"
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/52">
        {align === 'left' ? 'Away' : 'Home'}
      </p>
      <TeamLink
        team={team}
        leagueSlug={leagueSlug}
        className="mt-1 block text-lg font-black tracking-tight text-white transition-colors duration-200 hover:text-[var(--league-primary)] sm:text-xl"
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
  const badgePositionClass = align === 'left' ? '-right-2' : '-left-2';

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
        <span className={`absolute ${badgePositionClass} -top-2`}>
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
      <div className="relative isolate overflow-hidden rounded-[34px] border border-white/10 shadow-[0_34px_80px_-42px_rgba(0,0,0,0.92)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_56%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(5, 10, 18, 0.9), rgba(10, 16, 27, 0.62)), url('/homepage/weekly-games-bg.jpg')",
          }}
        />
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black/55 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black/55 to-transparent" />

        <div className="absolute left-4 top-4 z-20 rounded-full border border-white/12 bg-black/28 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72 backdrop-blur-md">
          {activeIndex + 1} / {games.length}
        </div>
        <div className="absolute right-4 top-4 z-20 rounded-full border border-white/12 bg-black/28 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72 backdrop-blur-md">
          {getStatusLabel(game.status)}
        </div>

        {hasControls && (
          <>
            <button
              type="button"
              aria-label="Previous game"
              onClick={() => onNavigate(-1)}
              className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-black/28 text-white/82 backdrop-blur-md transition-colors duration-200 hover:bg-black/44 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next game"
              onClick={() => onNavigate(1)}
              className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-black/28 text-white/82 backdrop-blur-md transition-colors duration-200 hover:bg-black/44 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div
          key={game.id}
          className="grid min-h-[390px] grid-cols-[1fr_1fr] items-start gap-6 px-5 pb-36 pt-20 sm:min-h-[430px] sm:px-8 sm:pb-32 md:px-10 lg:pb-36"
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

        <div className="absolute inset-x-4 bottom-4 sm:inset-x-6">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-white/12 bg-[color-mix(in_srgb,#081019_86%,transparent)] p-4 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58">
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

            <div className="mt-4 flex flex-col gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <CoolCardTeam team={game.away_team} leagueSlug={leagueSlug} align="left" />
              <div className="rounded-[22px] border border-white/10 bg-black/28 px-4 py-3 text-center shadow-inner shadow-black/35">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/54">
                  {centerDisplay.label}
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {centerDisplay.primary}
                </p>
              </div>
              <CoolCardTeam team={game.home_team} leagueSlug={leagueSlug} align="right" />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        : 'w-2.5 bg-white/24 hover:bg-white/42'
                    }`}
                  />
                ))}
              </div>
              <Link
                href={`/${leagueSlug}/games/${game.id}`}
                className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/6 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:border-[var(--league-primary)] hover:text-[var(--league-primary)]"
              >
                Matchup Details
              </Link>
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            Completed finals stay in view alongside the next puck drops, with a premium carousel by default and a full compact list when you want the whole week at once.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/82 p-1 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.7)]">
            {(['cool', 'compact'] as WeeklyGamesView[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition-all duration-200 ${
                  view === mode
                    ? 'bg-[var(--league-primary)] text-[var(--league-primary-contrast,#111)] shadow-[0_14px_28px_-16px_rgba(212,175,55,0.8)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {mode} view
              </button>
            ))}
          </div>

          <Link
            href={`/${leagueSlug}/schedule`}
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--league-primary)] transition-colors duration-200 hover:border-[var(--league-primary)] hover:text-[var(--color-text-primary)]"
          >
            View Full Schedule
          </Link>
        </div>
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
