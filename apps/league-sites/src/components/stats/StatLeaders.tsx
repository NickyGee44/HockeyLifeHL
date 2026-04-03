'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Award, Shield, Sparkles, Target, Trophy } from 'lucide-react';
import { PlayerBadgeGroup } from '@/components/shared/PlayerBadgeGroup';
import type {
  PlayerBadge,
  StatsMode,
  UnifiedGoalieStatsRow,
  UnifiedSkaterStatsRow,
} from '@/lib/types';

type SkaterLeaderMetric = 'goals' | 'assists' | 'points' | 'championships';
type GoalieLeaderMetric = 'wins' | 'save_percentage' | 'shutouts' | 'championships';
type LeaderMetric = SkaterLeaderMetric | GoalieLeaderMetric;
type StatsLeaderRow = UnifiedSkaterStatsRow | UnifiedGoalieStatsRow;

interface StatLeadersProps {
  badges?: Record<string, PlayerBadge[]>;
  isAllTime: boolean;
  leagueSlug: string;
  mode: StatsMode;
  rows: StatsLeaderRow[];
}

const SKATER_METRICS: Array<{ id: SkaterLeaderMetric; icon: typeof Trophy; label: string; emptyLabel: string }> = [
  { id: 'goals', icon: Target, label: 'Goals', emptyLabel: 'No goals recorded for this view yet.' },
  { id: 'assists', icon: Sparkles, label: 'Assists', emptyLabel: 'No assists recorded for this view yet.' },
  { id: 'points', icon: Trophy, label: 'Points', emptyLabel: 'No points recorded for this view yet.' },
  { id: 'championships', icon: Award, label: 'Championships', emptyLabel: 'No championships recorded for this view yet.' },
];

const GOALIE_METRICS: Array<{ id: GoalieLeaderMetric; icon: typeof Trophy; label: string; emptyLabel: string }> = [
  { id: 'wins', icon: Trophy, label: 'Wins', emptyLabel: 'No wins recorded for this view yet.' },
  { id: 'save_percentage', icon: Shield, label: 'Save %', emptyLabel: 'No save percentage data recorded for this view yet.' },
  { id: 'shutouts', icon: Sparkles, label: 'Shutouts', emptyLabel: 'No shutouts recorded for this view yet.' },
  { id: 'championships', icon: Award, label: 'Championships', emptyLabel: 'No championships recorded for this view yet.' },
];

function getActiveMetrics(mode: StatsMode) {
  return mode === 'skaters' ? SKATER_METRICS : GOALIE_METRICS;
}

function getDefaultMetric(mode: StatsMode): LeaderMetric {
  return mode === 'skaters' ? 'goals' : 'wins';
}

function getMetricValue(row: StatsLeaderRow, metric: LeaderMetric) {
  switch (metric) {
    case 'goals':
      return (row as UnifiedSkaterStatsRow).goals ?? 0;
    case 'assists':
      return (row as UnifiedSkaterStatsRow).assists ?? 0;
    case 'points':
      return (row as UnifiedSkaterStatsRow).points ?? 0;
    case 'wins':
      return (row as UnifiedGoalieStatsRow).wins ?? 0;
    case 'save_percentage':
      return (row as UnifiedGoalieStatsRow).save_percentage ?? 0;
    case 'shutouts':
      return (row as UnifiedGoalieStatsRow).shutouts ?? 0;
    case 'championships':
      return row.championships ?? 0;
    default:
      return 0;
  }
}

function formatMetricValue(metric: LeaderMetric, value: number) {
  if (metric === 'save_percentage') {
    return `${value.toFixed(1)}%`;
  }

  return String(value);
}

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

export function StatLeaders({ badges, isAllTime, leagueSlug, mode, rows }: StatLeadersProps) {
  const metrics = getActiveMetrics(mode);
  const [selectedMetric, setSelectedMetric] = useState<LeaderMetric>(() => getDefaultMetric(mode));

  useEffect(() => {
    setSelectedMetric(getDefaultMetric(mode));
  }, [mode]);

  const activeMetric = metrics.find((metric) => metric.id === selectedMetric) ?? metrics[0];
  const ActiveIcon = activeMetric.icon;
  const leaders = [...rows]
    .map((row) => ({
      player_id: row.player_id,
      player_name: row.player_name,
      avatar_url: row.avatar_url,
      team_name: row.team_name,
      value: getMetricValue(row, activeMetric.id),
    }))
    .filter((row) => row.value > 0)
    .sort((left, right) => {
      const primary = right.value - left.value;
      if (primary !== 0) {
        return primary;
      }

      return left.player_name.localeCompare(right.player_name);
    })
    .slice(0, 5);

  return (
    <div className="rounded-[30px] border border-[var(--color-border)] bg-[var(--color-background-elevated)] p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            Top 5 Leaders
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {mode === 'skaters' ? 'Players' : 'Goalies'}
            <span className="mx-2 text-[var(--color-text-muted)]">•</span>
            {isAllTime ? 'All Time' : 'Current View'}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Toggle metrics
        </span>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--league-primary)]/12 text-[var(--league-primary)]">
              <ActiveIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-bold text-[var(--color-text-primary)]">{activeMetric.label}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Top 5
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const isActive = metric.id === activeMetric.id;

              return (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => setSelectedMetric(metric.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-[var(--league-primary)] bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {metric.label}
                </button>
              );
            })}
          </div>
        </div>

        {leaders.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            {leaders.map((leader, index) => {
              const { firstName, lastName } = splitPlayerName(leader.player_name);
              const playerBadges = badges?.[leader.player_id] || [];

              return (
                <div
                  key={`${activeMetric.id}-${leader.player_id}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-3 py-2.5"
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                    index === 0
                      ? 'bg-amber-300 text-black'
                      : index === 1
                        ? 'bg-slate-200 text-black'
                        : index === 2
                          ? 'bg-orange-300 text-black'
                          : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                  }`}>
                    {index + 1}
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={leader.avatar_url || '/blank_player.png'}
                      alt={leader.player_name}
                      className="h-10 w-10 shrink-0 rounded-xl border border-[var(--color-border)] object-cover"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/${leagueSlug}/players/${leader.player_id}`}
                        className="block leading-tight text-[var(--color-text-primary)] transition-colors hover:text-[var(--league-primary)]"
                      >
                        <span className="block truncate text-sm font-semibold">{firstName}</span>
                        {lastName ? (
                          <span className="block truncate text-sm font-semibold">{lastName}</span>
                        ) : null}
                      </Link>
                      <p className="truncate text-[11px] text-[var(--color-text-muted)]">{leader.team_name}</p>
                      {playerBadges.length > 0 ? (
                        <div className="mt-1 hidden min-[1400px]:block">
                          <PlayerBadgeGroup badges={playerBadges} maxVisible={2} size="sm" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <span className="text-right text-lg font-black text-[var(--color-text-primary)]">
                    {formatMetricValue(activeMetric.id, leader.value)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-[18px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">No leaders yet</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{activeMetric.emptyLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatLeaders;
