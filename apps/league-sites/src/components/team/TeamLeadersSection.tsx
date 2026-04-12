'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BarChart3, Medal } from 'lucide-react';
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
  pointInsightsElement: React.ReactNode;
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

export function TeamLeadersSection({
  hideTitle = false,
  leadersByMetric,
  barChartPlayers,
  leagueSlug,
  pointInsightsElement,
  initialMetric = 'points',
}: TeamLeadersSectionProps) {
  const [metric, setMetric] = useState<TeamLeaderMetric>(initialMetric);
  const [showChart, setShowChart] = useState(false);

  const leaders = leadersByMetric[metric] ?? [];

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
            className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
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

      {!showChart ? (
        <>
          {leaders.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {leaders.map((leader, index) => (
                <TeamLeaderPodiumCard
                  key={`${leader.playerId}-${leader.metric}`}
                  leader={leader}
                  place={index + 1}
                  leagueSlug={leagueSlug}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/55 px-6 py-10 text-center">
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">No team leaders yet</p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Leader cards will populate once current-season player stats are recorded.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {METRIC_LABELS[metric]} — All Players
          </p>
          {sortedBarChartPlayers.length > 0 ? (
            sortedBarChartPlayers.map((player) => {
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
      )}

      {metric === 'points' ? pointInsightsElement : null}
    </section>
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
  const medalStyles = [
    'from-amber-400/30 via-amber-300/18 to-transparent border-amber-300/35 text-amber-200',
    'from-slate-200/25 via-slate-100/15 to-transparent border-slate-300/30 text-slate-100',
    'from-orange-500/22 via-orange-300/14 to-transparent border-orange-300/25 text-orange-200',
  ];
  const labels: Record<TeamLeaderMetric, string> = {
    goals: 'Goals',
    assists: 'Assists',
    points: 'Points',
    penalty_minutes: 'PIM',
  };

  return (
    <Link
      href={`/${leagueSlug}/players/${leader.playerId}`}
      className={`rounded-[24px] border bg-gradient-to-br p-5 transition-transform duration-200 hover:-translate-y-0.5 ${medalStyles[place - 1] || medalStyles[2]}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-current/20 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
          <Medal className="h-3.5 w-3.5" />
          {place === 1 ? 'Gold' : place === 2 ? 'Silver' : 'Bronze'}
        </div>
        <span className="text-3xl font-black leading-none">{leader.value}</span>
      </div>

      <div className="flex items-center gap-3">
        <Image
          src={leader.avatarUrl || '/blank_player.png'}
          alt={leader.name}
          width={60}
          height={60}
          className="h-14 w-14 rounded-full border border-white/10 object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold text-[var(--color-text-primary)]">{leader.name}</p>
            {leader.leadershipRole === 'captain' ? <CaptainBadge label="C" /> : null}
            {leader.leadershipRole === 'alternate_captain' ? <CaptainBadge label="A" muted /> : null}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {labels[leader.metric]} leader • {leader.positionLabel}
            {leader.jerseyNumber != null ? ` • #${leader.jerseyNumber}` : ''}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {leader.gamesPlayed} GP
          </p>
        </div>
      </div>
    </Link>
  );
}

function CaptainBadge({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
        muted
          ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
          : 'bg-amber-500/18 text-amber-500'
      }`}
    >
      {label}
    </span>
  );
}
