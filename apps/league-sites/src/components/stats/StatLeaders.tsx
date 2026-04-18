'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Award, Shield, Sparkles, Target, Trophy, X } from 'lucide-react';
import { PlayerBadgeGroup } from '@/components/shared/PlayerBadgeGroup';
import type {
  PlayerBadge,
  StatsMode,
  UnifiedGoalieStatsRow,
  UnifiedSkaterStatsRow,
} from '@/lib/types';

type SkaterLeaderMetric = 'goals' | 'assists' | 'points' | 'championships';
type GoalieLeaderMetric = 'wins' | 'goals_against_average' | 'shutouts' | 'championships';
type LeaderMetric = SkaterLeaderMetric | GoalieLeaderMetric;
type StatsLeaderRow = UnifiedSkaterStatsRow | UnifiedGoalieStatsRow;

interface StatLeadersProps {
  badges?: Record<string, PlayerBadge[]>;
  hideTitle?: boolean;
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
  { id: 'goals_against_average', icon: Shield, label: 'GAA', emptyLabel: 'No goals against average data recorded for this view yet.' },
  { id: 'shutouts', icon: Sparkles, label: 'Shutouts', emptyLabel: 'No shutouts recorded for this view yet.' },
  { id: 'championships', icon: Award, label: 'Championships', emptyLabel: 'No championships recorded for this view yet.' },
];

function getActiveMetrics(mode: StatsMode, isAllTime: boolean) {
  const metrics = mode === 'skaters' ? SKATER_METRICS : GOALIE_METRICS;
  return isAllTime
    ? metrics
    : metrics.filter((metric) => metric.id !== 'championships');
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
    case 'goals_against_average':
      return (row as UnifiedGoalieStatsRow).goals_against_average ?? 0;
    case 'shutouts':
      return (row as UnifiedGoalieStatsRow).shutouts ?? 0;
    case 'championships':
      return row.championships ?? 0;
    default:
      return 0;
  }
}

function formatMetricValue(metric: LeaderMetric, value: number) {
  if (metric === 'goals_against_average') {
    return value.toFixed(2);
  }

  return String(value);
}

function shouldIncludeMetricValue(metric: LeaderMetric, value: number) {
  return metric === 'goals_against_average' ? value >= 0 : value > 0;
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

export function StatLeaders({ badges, hideTitle = false, isAllTime, leagueSlug, mode, rows }: StatLeadersProps) {
  const metrics = getActiveMetrics(mode, isAllTime);
  const [selectedMetric, setSelectedMetric] = useState<LeaderMetric>(() => getDefaultMetric(mode));

  useEffect(() => {
    setSelectedMetric(getDefaultMetric(mode));
  }, [mode, isAllTime]);

  const activeMetric = metrics.find((metric) => metric.id === selectedMetric) ?? metrics[0];
  const [openTeamTooltipFor, setOpenTeamTooltipFor] = useState<string | null>(null);
  const leaders = [...rows]
    .map((row) => ({
      player_id: row.player_id,
      player_name: row.player_name,
      avatar_url: row.avatar_url,
      team_name: row.team_name,
      display_team_name: row.display_team_name || row.team_name,
      display_team_logo_url: row.display_team_logo_url || null,
      value: getMetricValue(row, activeMetric.id),
    }))
    .filter((row) => shouldIncludeMetricValue(activeMetric.id, row.value))
    .sort((left, right) => {
      const primary =
        activeMetric.id === 'goals_against_average'
          ? left.value - right.value
          : right.value - left.value;
      if (primary !== 0) {
        return primary;
      }

      return left.player_name.localeCompare(right.player_name);
    })
    .slice(0, 3);

  const podiumLeaders = useMemo(() => {
    if (leaders.length <= 1) return leaders;
    if (leaders.length === 2) return [leaders[1], leaders[0]];
    return [leaders[1], leaders[0], leaders[2]];
  }, [leaders]);

  return (
    <div className="league-shell-panel rounded-[30px] border border-[var(--color-border)] p-4 md:p-6">
      {!hideTitle && (
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            League Leaders
          </h2>
        </div>
      )}

      <div className={hideTitle ? '' : 'mt-5 border-t border-[var(--color-border)] pt-5'}>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isActive = metric.id === activeMetric.id;

            return (
              <button
                key={metric.id}
                type="button"
                onClick={() => setSelectedMetric(metric.id)}
                className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'border-[var(--league-primary)] bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                    : 'border-[var(--glass-card-border)] bg-[var(--color-surface)]/60 text-[var(--color-text-secondary)] hover:border-[var(--glass-card-border-hover)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon className="h-3 w-3" />
                {metric.label}
              </button>
            );
          })}
        </div>

        {leaders.length > 0 ? (
          <div className="mt-5 rounded-[28px] border border-[var(--glass-card-border)] bg-[linear-gradient(180deg,rgba(19,24,49,0.96),rgba(28,35,72,0.92))] p-4 shadow-[0_22px_60px_-28px_rgba(0,0,0,0.65)] md:p-5">
            <div className="grid grid-cols-3 items-end gap-3 md:gap-4">
              {podiumLeaders.map((leader) => {
                const rank = leaders.findIndex((entry) => entry.player_id === leader.player_id) + 1;
                const isCenter = rank === 1;
                const { firstName, lastName } = splitPlayerName(leader.player_name);
                const playerBadges = badges?.[leader.player_id] || [];
                const teamTooltipOpen = openTeamTooltipFor === leader.player_id;
                const teamLogo = leader.display_team_logo_url || '/blank_team.png';
                const teamName = leader.display_team_name || leader.team_name || 'Team';

                return (
                  <div
                    key={`${activeMetric.id}-${leader.player_id}`}
                    className={`relative flex min-w-0 flex-col items-center rounded-[24px] border px-3 pb-4 pt-3 text-center transition-transform ${
                      isCenter
                        ? 'z-10 translate-y-0 border-[var(--league-primary)]/35 bg-[linear-gradient(180deg,rgba(64,72,122,0.95),rgba(39,46,89,0.95))] shadow-[0_22px_50px_-24px_rgba(0,0,0,0.7)]'
                        : 'translate-y-4 border-white/8 bg-[linear-gradient(180deg,rgba(36,42,82,0.94),rgba(25,31,62,0.9))] shadow-[0_18px_40px_-26px_rgba(0,0,0,0.65)]'
                    }`}
                  >
                    {isCenter ? (
                      <div className="absolute -top-8 flex flex-col items-center">
                        <Trophy className="h-7 w-7 text-amber-300 drop-shadow-[0_6px_12px_rgba(245,158,11,0.35)]" />
                        <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 text-[10px] font-black text-black">
                          1
                        </span>
                      </div>
                    ) : (
                      <span className={`absolute -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                        rank === 2 ? 'bg-sky-400 text-slate-950' : 'bg-emerald-400 text-slate-950'
                      }`}>
                        {rank}
                      </span>
                    )}

                    <Link
                      href={`/${leagueSlug}/players/${leader.player_id}`}
                      className={`relative block overflow-hidden rounded-full border ${
                        isCenter ? 'mt-4 h-24 w-24 border-amber-300/70' : 'mt-5 h-16 w-16 border-white/15'
                      } bg-black/20 transition-transform hover:scale-[1.03]`}
                    >
                      <img
                        src={leader.avatar_url || '/blank_player.png'}
                        alt={leader.player_name}
                        className="h-full w-full object-cover"
                      />
                    </Link>

                    <div className="mt-3 min-w-0">
                      <Link
                        href={`/${leagueSlug}/players/${leader.player_id}`}
                        className="block leading-tight text-[var(--color-text-primary)] transition-colors hover:text-[var(--league-primary)]"
                      >
                        <span className={`block truncate ${isCenter ? 'text-[15px] font-black' : 'text-sm font-bold'}`}>{firstName}</span>
                        {lastName ? (
                          <span className={`block truncate ${isCenter ? 'text-[15px] font-black' : 'text-sm font-bold'}`}>{lastName}</span>
                        ) : null}
                      </Link>
                      <div className="mt-2 text-xl font-black tracking-tight text-[var(--league-primary)] md:text-2xl">
                        {formatMetricValue(activeMetric.id, leader.value)}
                      </div>

                      <div className="relative mt-2 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setOpenTeamTooltipFor((current) => (current === leader.player_id ? null : leader.player_id))}
                          className="rounded-full p-1.5 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/45"
                          aria-label={`Show team for ${leader.player_name}`}
                        >
                          <img
                            src={teamLogo}
                            alt={teamName}
                            className={`object-contain ${isCenter ? 'h-10 w-10' : 'h-8 w-8'}`}
                          />
                        </button>
                        {teamTooltipOpen ? (
                          <div className="absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(10,13,29,0.96)] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.8)]">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[150px]">{teamName}</span>
                              <button
                                type="button"
                                onClick={() => setOpenTeamTooltipFor(null)}
                                className="rounded-full text-white/60 transition-colors hover:text-white"
                                aria-label="Close team name"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {playerBadges.length > 0 ? (
                        <div className="mt-2 flex justify-center">
                          <PlayerBadgeGroup badges={playerBadges} maxVisible={2} size="sm" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[18px] border border-dashed border-[var(--glass-card-border)] bg-[var(--color-surface)]/40 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">No leaders yet</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{activeMetric.emptyLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatLeaders;
