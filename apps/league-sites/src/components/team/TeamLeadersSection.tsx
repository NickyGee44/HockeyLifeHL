'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import type { TeamLeaderCard, TeamLeaderMetric } from '@/lib/team-page';

interface BarChartPlayer {
  playerId: string;
  name: string;
  avatarUrl: string;
  jerseyNumber: number | null | undefined;
  values: Record<TeamLeaderMetric, number>;
}

interface TeamLeadersSectionProps {
  hideTitle?: boolean;
  leadersByMetric: Record<TeamLeaderMetric, TeamLeaderCard[]>;
  barChartPlayers: BarChartPlayer[];
  leagueSlug: string;
  initialMetric?: TeamLeaderMetric;
}

const METRIC_LABELS: Record<TeamLeaderMetric, string> = {
  goals: 'Goals',
  assists: 'Assists',
  points: 'Points',
  penalty_minutes: 'PIM',
};

const TAB_OPTIONS: [TeamLeaderMetric, string][] = [
  ['points', 'P'],
  ['goals', 'G'],
  ['assists', 'A'],
  ['penalty_minutes', 'PM'],
];

const PODIUM_CARD_STYLES: Record<
  number,
  { heightClass: string; cardClass: string; avatarHalo: string }
> = {
  1: {
    heightClass: 'min-h-[14.5rem] md:min-h-[15.5rem]',
    cardClass:
      'border-[rgba(245,204,96,0.5)] bg-[linear-gradient(180deg,rgba(255,248,227,0.18),rgba(36,30,12,0.94))] shadow-[0_28px_60px_-30px_rgba(245,204,96,0.5)]',
    avatarHalo: 'shadow-[0_0_0_1px_rgba(255,248,227,0.35),0_18px_32px_-18px_rgba(245,204,96,0.65)]',
  },
  2: {
    heightClass: 'min-h-[13.4rem] md:min-h-[14.35rem]',
    cardClass:
      'border-[rgba(203,213,225,0.45)] bg-[linear-gradient(180deg,rgba(241,245,249,0.16),rgba(24,29,41,0.94))] shadow-[0_24px_54px_-30px_rgba(148,163,184,0.45)]',
    avatarHalo: 'shadow-[0_0_0_1px_rgba(248,250,252,0.3),0_16px_28px_-18px_rgba(148,163,184,0.55)]',
  },
  3: {
    heightClass: 'min-h-[12.25rem] md:min-h-[13.1rem]',
    cardClass:
      'border-[rgba(205,127,50,0.45)] bg-[linear-gradient(180deg,rgba(251,191,153,0.14),rgba(43,24,14,0.94))] shadow-[0_22px_48px_-30px_rgba(180,83,9,0.45)]',
    avatarHalo: 'shadow-[0_0_0_1px_rgba(254,215,170,0.24),0_16px_28px_-18px_rgba(180,83,9,0.55)]',
  },
};

const PODIUM_AVATAR_SIZE_CLASS = 'h-[4.15rem] w-[4.15rem] md:h-[4.35rem] md:w-[4.35rem]';

const PODIUM_AVATAR_STYLES: Record<number, string> = {
  1: 'conic-gradient(from 180deg, rgba(255,250,214,1) 0deg, rgba(245,204,96,1) 70deg, rgba(255,239,138,1) 150deg, rgba(189,147,45,1) 220deg, rgba(255,250,214,1) 360deg)',
  2: 'conic-gradient(from 180deg, rgba(255,255,255,0.98) 0deg, rgba(203,213,225,1) 72deg, rgba(241,245,249,1) 150deg, rgba(148,163,184,1) 220deg, rgba(255,255,255,0.98) 360deg)',
  3: 'conic-gradient(from 180deg, rgba(255,237,213,0.98) 0deg, rgba(205,127,50,1) 75deg, rgba(251,146,60,0.98) 150deg, rgba(154,52,18,1) 225deg, rgba(255,237,213,0.98) 360deg)',
};

function splitPlayerName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: name, lastName: '' };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

export function TeamLeadersSection({
  hideTitle = false,
  leadersByMetric,
  barChartPlayers,
  leagueSlug,
  initialMetric = 'points',
}: TeamLeadersSectionProps) {
  const [metric, setMetric] = useState<TeamLeaderMetric>(initialMetric);
  const [showChart, setShowChart] = useState(false);

  const leaders = useMemo(() => leadersByMetric[metric] ?? [], [leadersByMetric, metric]);
  const podiumLeaders = useMemo(() => {
    if (leaders.length <= 1) return leaders;
    if (leaders.length === 2) return [leaders[1], leaders[0]];
    return [leaders[1], leaders[0], leaders[2]];
  }, [leaders]);

  const sortedBarChartPlayers = useMemo(() => {
    return [...barChartPlayers].sort((a, b) => (b.values[metric] ?? 0) - (a.values[metric] ?? 0));
  }, [barChartPlayers, metric]);

  const maxValue = sortedBarChartPlayers.length > 0 ? sortedBarChartPlayers[0].values[metric] ?? 0 : 1;

  return (
    <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!hideTitle && (
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-[var(--league-primary)]" />
            <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Team Leaders</h2>
          </div>
        )}

        <div className={`flex items-center gap-3 ${hideTitle ? '' : 'sm:ml-auto'}`}>
          <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            {TAB_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMetric(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  metric === value
                    ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowChart((prev) => !prev)}
            className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full border transition-colors lg:hidden ${
              showChart
                ? 'border-[var(--league-primary)]/40 bg-[var(--league-primary)]/15 text-[var(--league-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]'
            }`}
            aria-label="Toggle bar chart view"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="lg:hidden">
        {!showChart ? (
          <TeamPodiumView
            leaders={leaders}
            podiumLeaders={podiumLeaders}
            leagueSlug={leagueSlug}
          />
        ) : (
          <TeamBarsView
            metric={metric}
            players={sortedBarChartPlayers}
            maxValue={maxValue}
            leagueSlug={leagueSlug}
          />
        )}
      </div>

      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)] lg:items-start">
        <TeamPodiumView
          leaders={leaders}
          podiumLeaders={podiumLeaders}
          leagueSlug={leagueSlug}
        />
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-background-elevated)]/54 p-4">
          <TeamBarsView
            metric={metric}
            players={sortedBarChartPlayers}
            maxValue={maxValue}
            leagueSlug={leagueSlug}
          />
        </div>
      </div>

      <div className="mt-6 hidden grid-cols-3 gap-4 lg:grid">
        {(['points', 'goals', 'assists'] as TeamLeaderMetric[]).map((metricId) => (
          <TeamMetricMiniBoard
            key={metricId}
            metric={metricId}
            leaders={leadersByMetric[metricId] ?? []}
            leagueSlug={leagueSlug}
          />
        ))}
      </div>
    </section>
  );
}

function TeamMetricMiniBoard({
  metric,
  leaders,
  leagueSlug,
}: {
  metric: TeamLeaderMetric;
  leaders: TeamLeaderCard[];
  leagueSlug: string;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-background-elevated)]/54 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {METRIC_LABELS[metric]}
      </p>
      <div className="mt-3 space-y-2">
        {leaders.slice(0, 5).map((leader, index) => (
          <Link
            key={`${metric}-${leader.playerId}`}
            href={`/${leagueSlug}/players/${leader.playerId}`}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-[var(--color-surface-hover)]/50"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--league-primary)]/12 text-xs font-black text-[var(--league-primary)]">
              {index + 1}
            </span>
            <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
              {leader.name}
            </span>
            <span className="text-base font-black text-[var(--league-primary)]">
              {leader.value}
            </span>
          </Link>
        ))}
        {leaders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--color-border)] px-3 py-5 text-center text-sm text-[var(--color-text-secondary)]">
            No leaders yet
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TeamPodiumView({
  leaders,
  podiumLeaders,
  leagueSlug,
}: {
  leaders: TeamLeaderCard[];
  podiumLeaders: TeamLeaderCard[];
  leagueSlug: string;
}) {
  if (leaders.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/55 px-6 py-10 text-center">
        <p className="text-lg font-semibold text-[var(--color-text-primary)]">No team leaders yet</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
          Leader cards will populate once current-season player stats are recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 px-1 md:px-2 lg:mt-0">
      <div className="grid grid-cols-3 items-stretch gap-3 md:gap-4">
        {podiumLeaders.map((leader) => {
          const place = leaders.findIndex((entry) => entry.playerId === leader.playerId) + 1;
          return (
            <TeamLeaderPodiumCard
              key={`${leader.playerId}-${leader.metric}`}
              leader={leader}
              place={place}
              leagueSlug={leagueSlug}
            />
          );
        })}
      </div>
    </div>
  );
}

function TeamBarsView({
  metric,
  players,
  maxValue,
  leagueSlug,
}: {
  metric: TeamLeaderMetric;
  players: BarChartPlayer[];
  maxValue: number;
  leagueSlug: string;
}) {
  return (
    <div className="space-y-2">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {METRIC_LABELS[metric]} - All Players
      </p>
      {players.length > 0 ? (
        players.map((player) => {
          const value = player.values[metric] ?? 0;
          const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const firstName = player.name.split(' ').slice(0, -1).join(' ') || player.name;
          const lastName = player.name.includes(' ') ? player.name.split(' ').slice(-1)[0] : '';

          return (
            <Link
              key={player.playerId}
              href={`/${leagueSlug}/players/${player.playerId}`}
              className="group flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-hover)]/50"
            >
              <div className="relative flex-shrink-0">
                <Image
                  src={player.avatarUrl || '/blank_player.png'}
                  alt={player.name}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover"
                />
                {player.jerseyNumber != null && (
                  <span className="absolute -bottom-1 -left-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-bold leading-none text-[var(--league-primary)] ring-1 ring-white/10">
                    {player.jerseyNumber}
                  </span>
                )}
              </div>
              <div className="w-[72px] flex-shrink-0 min-w-0">
                <span className="block truncate text-xs font-medium leading-tight text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)]">
                  {firstName}
                </span>
                {lastName && (
                  <span className="block truncate text-[10px] font-semibold uppercase tracking-wide leading-tight text-[var(--color-text-secondary)]">
                    {lastName}
                  </span>
                )}
              </div>
              <div className="flex flex-1 items-center gap-2">
                <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--league-primary)]/70 transition-all duration-500"
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-black text-[var(--color-text-primary)]">
                  {value}
                </span>
              </div>
            </Link>
          );
        })
      ) : (
        <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">No stats recorded yet.</p>
      )}
    </div>
  );
}

function TeamLeaderPodiumCard({
  leader,
  place,
  leagueSlug,
}: {
  leader: TeamLeaderCard;
  place: number;
  leagueSlug: string;
}) {
  const { firstName, lastName } = splitPlayerName(leader.name);
  const podiumStyle = PODIUM_CARD_STYLES[place] ?? PODIUM_CARD_STYLES[3];

  return (
    <div
      className="relative flex h-full min-w-0 items-end"
    >
      <Link
        href={`/${leagueSlug}/players/${leader.playerId}`}
        className={`absolute left-1/2 top-[2.55rem] z-10 block -translate-x-1/2 rounded-full p-[3px] transition-transform hover:scale-[1.03] md:top-[2.7rem] ${podiumStyle.avatarHalo}`}
        style={{ backgroundImage: PODIUM_AVATAR_STYLES[place] ?? PODIUM_AVATAR_STYLES[3] }}
      >
        <span className="block rounded-full bg-[rgba(7,10,22,0.9)] p-[3px]">
          <span className={`block overflow-hidden rounded-full border border-white/10 bg-black/30 ${PODIUM_AVATAR_SIZE_CLASS}`}>
            <Image
              src={leader.avatarUrl || '/blank_player.png'}
              alt={leader.name}
              width={72}
              height={72}
              className="h-full w-full object-cover"
            />
          </span>
        </span>
      </Link>

      <div className={`flex w-full min-w-0 flex-col items-center justify-end rounded-[22px] border px-3 pb-2.5 pt-[7rem] text-center md:pb-3 md:pt-[7.45rem] ${podiumStyle.heightClass} ${podiumStyle.cardClass}`}>
        <div className="w-full min-w-0">
          <div className="min-h-[2.9rem] md:min-h-[3.15rem]">
            <Link
              href={`/${leagueSlug}/players/${leader.playerId}`}
              className="block leading-tight text-[var(--color-text-primary)] transition-colors hover:text-[var(--league-primary)]"
            >
              <span className="block truncate text-[13px] font-black md:text-sm">{firstName}</span>
              {lastName ? (
                <span className="block truncate text-[13px] font-black md:text-sm">{lastName}</span>
              ) : null}
            </Link>
          </div>

          <div className="mt-1 flex min-h-[2rem] items-center justify-center text-[1.05rem] font-black tracking-tight text-[var(--league-primary)] md:text-[1.45rem]">
            {leader.value}
          </div>

          <div className="mt-0.5 text-[10px] font-medium text-[var(--color-text-secondary)] md:text-[11px]">
            {leader.jerseyNumber != null ? `#${leader.jerseyNumber} • ` : ''}
            {`${leader.gamesPlayed} GP`}
          </div>
        </div>
      </div>
    </div>
  );
}
