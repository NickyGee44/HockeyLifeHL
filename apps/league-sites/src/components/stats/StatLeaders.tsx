'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

const PODIUM_STYLES = {
  1: {
    accent: 'text-amber-100',
    badge: 'Gold',
    border: 'border-amber-300/45',
    fill: 'from-amber-400/30 via-amber-200/12 to-transparent',
    value: 'text-amber-100',
  },
  2: {
    accent: 'text-slate-100',
    badge: 'Silver',
    border: 'border-slate-200/35',
    fill: 'from-slate-300/20 via-slate-100/8 to-transparent',
    value: 'text-slate-100',
  },
  3: {
    accent: 'text-orange-100',
    badge: 'Bronze',
    border: 'border-orange-300/35',
    fill: 'from-orange-400/22 via-orange-200/8 to-transparent',
    value: 'text-orange-100',
  },
} as const;

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

export function StatLeaders({ badges, isAllTime, leagueSlug, mode, rows }: StatLeadersProps) {
  const metrics = getActiveMetrics(mode);
  const [activeMetric, setActiveMetric] = useState<LeaderMetric>(getDefaultMetric(mode));

  useEffect(() => {
    setActiveMetric(getDefaultMetric(mode));
  }, [mode]);

  const activeMetricConfig = metrics.find((metric) => metric.id === activeMetric) || metrics[0];
  const rankedRows = [...rows]
    .map((row) => ({
      player_id: row.player_id,
      player_name: row.player_name,
      avatar_url: row.avatar_url,
      team_name: row.team_name,
      value: getMetricValue(row, activeMetricConfig.id),
    }))
    .sort((left, right) => {
      const primary = right.value - left.value;
      if (primary !== 0) {
        return primary;
      }

      return left.player_name.localeCompare(right.player_name);
    })
    .slice(0, 5);

  const topValue = rankedRows[0]?.value || 0;
  const hasMetricData = rankedRows.some((row) => row.value > 0);
  const podiumRows = [rankedRows[1], rankedRows[0], rankedRows[2]].filter(Boolean);

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-5 md:px-6 md:py-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          aria-hidden="true"
          className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-[var(--league-primary)]/12 blur-3xl"
          animate={{ scale: [1, 1.08, 1], x: [0, 24, 0], y: [0, -16, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl"
          animate={{ scale: [1.05, 1, 1.08, 1.05], x: [0, -16, 8, 0], y: [0, 18, -8, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute bottom-0 right-12 h-32 w-32 rounded-full bg-amber-300/8 blur-3xl"
          animate={{ scale: [1, 1.12, 1], x: [0, -10, 0], y: [0, -18, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
              Leaders Graphic
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
                Top 5 {activeMetricConfig.label}
              </h2>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                {mode === 'skaters' ? 'Players' : 'Goalies'}
                <span className="mx-2 text-[var(--color-text-muted)]">|</span>
                {isAllTime ? 'All Time' : 'Current View'}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
              Animated snapshot of the current leaderboard scope. The podium highlights gold, silver, and bronze automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const isActive = metric.id === activeMetricConfig.id;

              return (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => setActiveMetric(metric.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                      : 'border border-[var(--color-border)] bg-[var(--color-surface)]/70 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {metric.label}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeMetricConfig.id}
            className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.85fr]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {hasMetricData ? (
              <>
                <div className="grid gap-3 md:grid-cols-3 md:items-end">
                  {podiumRows.map((leader) => {
                    if (!leader) {
                      return null;
                    }

                    const rank = rankedRows.findIndex((row) => row.player_id === leader.player_id) + 1;
                    const style = PODIUM_STYLES[rank as 1 | 2 | 3];
                    const playerBadges = badges?.[leader.player_id] || [];

                    return (
                      <motion.article
                        key={leader.player_id}
                        layout
                        className={`relative overflow-hidden rounded-[28px] border bg-gradient-to-b ${style.border} ${style.fill} ${rank === 1 ? 'md:pb-8 md:pt-8' : 'md:pb-5 md:pt-5'}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, delay: rank * 0.04 }}
                      >
                        <div className="p-4 md:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <span className={`text-[11px] font-black uppercase tracking-[0.18em] ${style.accent}`}>
                              {style.badge}
                            </span>
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-sm font-black text-white">
                              {rank}
                            </span>
                          </div>

                          <div className="mt-5 flex items-center gap-3">
                            <img
                              src={leader.avatar_url || '/blank_player.png'}
                              alt={leader.player_name}
                              className={`rounded-2xl border border-white/12 object-cover shadow-[0_16px_30px_-18px_rgba(0,0,0,0.5)] ${rank === 1 ? 'h-20 w-20' : 'h-16 w-16'}`}
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/${leagueSlug}/players/${leader.player_id}`}
                                className="block truncate text-lg font-black text-white transition-colors hover:text-[var(--league-primary)]"
                              >
                                {leader.player_name}
                              </Link>
                              <p className="truncate text-sm text-white/70">{leader.team_name}</p>
                              {playerBadges.length > 0 ? (
                                <div className="mt-2">
                                  <PlayerBadgeGroup badges={playerBadges} maxVisible={3} size="sm" />
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-6">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                              {activeMetricConfig.label}
                            </p>
                            <p className={`mt-1 text-4xl font-black tracking-tight ${style.value}`}>
                              {formatMetricValue(activeMetricConfig.id, leader.value)}
                            </p>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>

                <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                        Full Top Five
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Relative pace based on the current leader.
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                      Max {formatMetricValue(activeMetricConfig.id, topValue)}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {rankedRows.map((leader, index) => {
                      const rank = index + 1;
                      const medalStyle = rank <= 3 ? PODIUM_STYLES[rank as 1 | 2 | 3] : null;
                      const width = topValue > 0 ? Math.max((leader.value / topValue) * 100, 8) : 0;

                      return (
                        <motion.div
                          key={`${leader.player_id}-${activeMetricConfig.id}`}
                          layout
                          className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-background-elevated)] p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${
                                medalStyle
                                  ? `${medalStyle.border} border bg-white/6 ${medalStyle.accent}`
                                  : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                              }`}>
                                {rank}
                              </span>
                              <img
                                src={leader.avatar_url || '/blank_player.png'}
                                alt={leader.player_name}
                                className="h-10 w-10 rounded-xl border border-[var(--color-border)] object-cover"
                              />
                              <div className="min-w-0">
                                <Link
                                  href={`/${leagueSlug}/players/${leader.player_id}`}
                                  className="block truncate font-semibold text-[var(--color-text-primary)] transition-colors hover:text-[var(--league-primary)]"
                                >
                                  {leader.player_name}
                                </Link>
                                <p className="truncate text-xs text-[var(--color-text-muted)]">{leader.team_name}</p>
                              </div>
                            </div>

                            <p className="shrink-0 text-right text-lg font-black text-[var(--color-text-primary)]">
                              {formatMetricValue(activeMetricConfig.id, leader.value)}
                            </p>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                            <motion.div
                              className={`h-full rounded-full ${
                                medalStyle
                                  ? rank === 1
                                    ? 'bg-amber-300'
                                    : rank === 2
                                      ? 'bg-slate-200'
                                      : 'bg-orange-300'
                                  : 'bg-[var(--league-primary)]'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${width}%` }}
                              transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.04 }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="lg:col-span-2">
                <div className="rounded-[28px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/45 px-6 py-12 text-center">
                  <activeMetricConfig.icon className="mx-auto h-10 w-10 text-[var(--league-primary)]" />
                  <h3 className="mt-4 text-xl font-black text-[var(--color-text-primary)]">
                    {activeMetricConfig.label} leaders are still empty
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    {activeMetricConfig.emptyLabel}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default StatLeaders;
