'use client';

import Link from 'next/link';
import { useState } from 'react';
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
export type LeaderMetric = SkaterLeaderMetric | GoalieLeaderMetric;
type StatsLeaderRow = UnifiedSkaterStatsRow | UnifiedGoalieStatsRow;

interface StatLeadersProps {
  badges?: Record<string, PlayerBadge[]>;
  hideTitle?: boolean;
  isAllTime: boolean;
  leagueSlug: string;
  mode: StatsMode;
  onMetricChange?: (metric: LeaderMetric) => void;
  rows: StatsLeaderRow[];
  selectedMetric?: LeaderMetric;
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

const PODIUM_CARD_STYLES: Record<
  number,
  { heightClass: string; cardClass: string; avatarHalo: string; teamLogoClass: string }
> = {
  1: {
    heightClass: 'min-h-[20rem] md:min-h-[22rem]',
    cardClass:
      'border-[rgba(245,204,96,0.5)] bg-[linear-gradient(180deg,rgba(255,248,227,0.18),rgba(36,30,12,0.94))] shadow-[0_28px_60px_-30px_rgba(245,204,96,0.5)]',
    avatarHalo: 'shadow-[0_0_0_1px_rgba(255,248,227,0.35),0_18px_32px_-18px_rgba(245,204,96,0.65)]',
    teamLogoClass: 'h-[2.875rem] w-[2.875rem] object-contain md:h-12 md:w-12',
  },
  2: {
    heightClass: 'min-h-[18rem] md:min-h-[19.5rem]',
    cardClass:
      'border-[rgba(203,213,225,0.45)] bg-[linear-gradient(180deg,rgba(241,245,249,0.16),rgba(24,29,41,0.94))] shadow-[0_24px_54px_-30px_rgba(148,163,184,0.45)]',
    avatarHalo: 'shadow-[0_0_0_1px_rgba(248,250,252,0.3),0_16px_28px_-18px_rgba(148,163,184,0.55)]',
    teamLogoClass: 'h-[2.875rem] w-[2.875rem] object-contain md:h-12 md:w-12',
  },
  3: {
    heightClass: 'min-h-[15.5rem] md:min-h-[17rem]',
    cardClass:
      'border-[rgba(205,127,50,0.45)] bg-[linear-gradient(180deg,rgba(251,191,153,0.14),rgba(43,24,14,0.94))] shadow-[0_22px_48px_-30px_rgba(180,83,9,0.45)]',
    avatarHalo: 'shadow-[0_0_0_1px_rgba(254,215,170,0.24),0_16px_28px_-18px_rgba(180,83,9,0.55)]',
    teamLogoClass: 'h-10 w-10 object-contain md:h-11 md:w-11',
  },
};

const PODIUM_AVATAR_SIZE_CLASS = 'h-24 w-24';

const PODIUM_AVATAR_STYLES: Record<number, string> = {
  1: 'conic-gradient(from 180deg, rgba(255,250,214,1) 0deg, rgba(245,204,96,1) 70deg, rgba(255,239,138,1) 150deg, rgba(189,147,45,1) 220deg, rgba(255,250,214,1) 360deg)',
  2: 'conic-gradient(from 180deg, rgba(255,255,255,0.98) 0deg, rgba(203,213,225,1) 72deg, rgba(241,245,249,1) 150deg, rgba(148,163,184,1) 220deg, rgba(255,255,255,0.98) 360deg)',
  3: 'conic-gradient(from 180deg, rgba(255,237,213,0.98) 0deg, rgba(205,127,50,1) 75deg, rgba(251,146,60,0.98) 150deg, rgba(154,52,18,1) 225deg, rgba(255,237,213,0.98) 360deg)',
};

export function StatLeaders({
  badges,
  hideTitle = false,
  isAllTime,
  leagueSlug,
  mode,
  onMetricChange,
  rows,
  selectedMetric,
}: StatLeadersProps) {
  const metrics = getActiveMetrics(mode, isAllTime);
  const [internalSelectedMetric, setInternalSelectedMetric] = useState<LeaderMetric>(() => getDefaultMetric(mode));

  const activeMetric = metrics.find((metric) => metric.id === (selectedMetric ?? internalSelectedMetric)) ?? metrics[0];
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

  const podiumLeaders =
    leaders.length <= 1 ? leaders : leaders.length === 2 ? [leaders[1], leaders[0]] : [leaders[1], leaders[0], leaders[2]];

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
                onClick={() => {
                  setInternalSelectedMetric(metric.id);
                  onMetricChange?.(metric.id);
                }}
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
          <div className="mt-5 px-1 md:px-2">
            <div className="grid grid-cols-3 items-end gap-3 md:gap-4">
              {podiumLeaders.map((leader) => {
                const rank = leaders.findIndex((entry) => entry.player_id === leader.player_id) + 1;
                const { firstName, lastName } = splitPlayerName(leader.player_name);
                const playerBadges = badges?.[leader.player_id] || [];
                const teamTooltipOpen = openTeamTooltipFor === leader.player_id;
                const teamLogo = leader.display_team_logo_url || '/blank_team.png';
                const teamName = leader.display_team_name || leader.team_name || 'Team';
                const podiumStyle = PODIUM_CARD_STYLES[rank] ?? PODIUM_CARD_STYLES[3];

                return (
                  <div
                    key={`${activeMetric.id}-${leader.player_id}`}
                    className={`relative flex min-w-0 flex-col items-center rounded-[24px] border px-3 pb-4 pt-[6.5rem] text-center md:pb-5 md:pt-[7rem] ${podiumStyle.heightClass} ${podiumStyle.cardClass}`}
                  >
                    <Link
                      href={`/${leagueSlug}/players/${leader.player_id}`}
                      className={`absolute left-1/2 top-4 block -translate-x-1/2 rounded-full p-[3px] transition-transform hover:scale-[1.03] ${podiumStyle.avatarHalo}`}
                      style={{ backgroundImage: PODIUM_AVATAR_STYLES[rank] ?? PODIUM_AVATAR_STYLES[3] }}
                    >
                      <span className="block rounded-full bg-[rgba(7,10,22,0.9)] p-[3px]">
                        <span className={`block overflow-hidden rounded-full border border-white/10 bg-black/30 ${PODIUM_AVATAR_SIZE_CLASS}`}>
                          <img
                            src={leader.avatar_url || '/blank_player.png'}
                            alt={leader.player_name}
                            className="h-full w-full object-cover"
                          />
                        </span>
                      </span>
                    </Link>

                    <div className="mt-auto flex w-full min-w-0 flex-1 flex-col justify-end">
                      <div className="min-h-[2.9rem]">
                        <Link
                          href={`/${leagueSlug}/players/${leader.player_id}`}
                          className="block leading-tight text-[var(--color-text-primary)] transition-colors hover:text-[var(--league-primary)]"
                        >
                          <span className="block truncate text-sm font-black md:text-[15px]">{firstName}</span>
                          {lastName ? (
                            <span className="block truncate text-sm font-black md:text-[15px]">{lastName}</span>
                          ) : null}
                        </Link>
                      </div>

                      <div className="mt-2 flex min-h-[2.4rem] items-center justify-center text-xl font-black tracking-tight text-[var(--league-primary)] md:text-[1.65rem]">
                        {formatMetricValue(activeMetric.id, leader.value)}
                      </div>

                      <div className="relative mt-2 flex min-h-[3rem] items-end justify-center">
                        <button
                          type="button"
                          onClick={() => setOpenTeamTooltipFor((current) => (current === leader.player_id ? null : leader.player_id))}
                          className="rounded-full p-1 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/45"
                          aria-label={`Show team for ${leader.player_name}`}
                        >
                          <img
                            src={teamLogo}
                            alt={teamName}
                            className={podiumStyle.teamLogoClass}
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

                      <div className="mt-3 flex min-h-[1.75rem] items-center justify-center">
                        {playerBadges.length > 0 ? (
                          <PlayerBadgeGroup badges={playerBadges} maxVisible={2} size="sm" />
                        ) : null}
                      </div>
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
