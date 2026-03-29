'use client';

import Link from 'next/link';
import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Shield,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import { PlayerBadgeGroup } from '@/components/shared/PlayerBadgeGroup';
import { SeasonSelector } from './SeasonSelector';
import type {
  GoalieStatKey,
  PlayerBadge,
  Season,
  SkaterStatKey,
  StatsMode,
  StatsSortDirection,
  StatsTableColumn,
  UnifiedGoalieStatsRow,
  UnifiedSkaterStatsRow,
} from '@/lib/types';

type SkaterPresetId = 'balanced' | 'scoring' | 'special_teams' | 'discipline';
type GoaliePresetId = 'balanced' | 'volume' | 'rate';

interface StatsWorkspaceProps {
  leagueSlug: string;
  seasons: Season[];
  currentSeasonId?: string | null;
  mode: StatsMode;
  seasonLabel?: string | null;
  isAllTime: boolean;
  skaterRows: UnifiedSkaterStatsRow[];
  goalieRows: UnifiedGoalieStatsRow[];
  badges: Record<string, PlayerBadge[]>;
}

const SKATER_COLUMNS: StatsTableColumn<SkaterStatKey>[] = [
  { key: 'games_played', label: 'GP', align: 'center', defaultSortDirection: 'desc' },
  { key: 'goals', label: 'G', align: 'center', defaultSortDirection: 'desc' },
  { key: 'assists', label: 'A', align: 'center', defaultSortDirection: 'desc' },
  { key: 'points', label: 'PTS', align: 'center', defaultSortDirection: 'desc' },
  { key: 'points_per_game', label: 'PTS/G', align: 'center', defaultSortDirection: 'desc' },
  { key: 'goals_per_game', label: 'G/G', align: 'center', defaultSortDirection: 'desc' },
  { key: 'assists_per_game', label: 'A/G', align: 'center', defaultSortDirection: 'desc' },
  { key: 'penalty_minutes', label: 'PIM', align: 'center', defaultSortDirection: 'desc' },
  { key: 'plus_minus', label: '+/-', align: 'center', defaultSortDirection: 'desc' },
  { key: 'power_play_goals', label: 'PPG', align: 'center', defaultSortDirection: 'desc' },
  { key: 'power_play_assists', label: 'PPA', align: 'center', defaultSortDirection: 'desc' },
  { key: 'power_play_points', label: 'PPP', align: 'center', defaultSortDirection: 'desc' },
  { key: 'short_handed_goals', label: 'SHG', align: 'center', defaultSortDirection: 'desc' },
  { key: 'short_handed_assists', label: 'SHA', align: 'center', defaultSortDirection: 'desc' },
  { key: 'game_winning_goals', label: 'GWG', align: 'center', defaultSortDirection: 'desc' },
  { key: 'empty_net_goals', label: 'ENG', align: 'center', defaultSortDirection: 'desc' },
  { key: 'shots', label: 'S', align: 'center', defaultSortDirection: 'desc' },
  { key: 'shots_per_game', label: 'S/G', align: 'center', defaultSortDirection: 'desc' },
];

const GOALIE_COLUMNS: StatsTableColumn<GoalieStatKey>[] = [
  { key: 'games_played', label: 'GP', align: 'center', defaultSortDirection: 'desc' },
  { key: 'wins', label: 'W', align: 'center', defaultSortDirection: 'desc' },
  { key: 'losses', label: 'L', align: 'center', defaultSortDirection: 'desc' },
  { key: 'save_percentage', label: 'SV%', align: 'center', defaultSortDirection: 'desc' },
  { key: 'goals_against_average', label: 'GAA', align: 'center', defaultSortDirection: 'asc' },
  { key: 'shutouts', label: 'SO', align: 'center', defaultSortDirection: 'desc' },
  { key: 'saves', label: 'SV', align: 'center', defaultSortDirection: 'desc' },
  { key: 'goals_against', label: 'GA', align: 'center', defaultSortDirection: 'asc' },
];

const SKATER_PRESETS: Record<SkaterPresetId, SkaterStatKey[]> = {
  balanced: ['games_played', 'goals', 'assists', 'points', 'points_per_game', 'penalty_minutes', 'plus_minus'],
  scoring: ['games_played', 'goals', 'assists', 'points', 'points_per_game', 'goals_per_game', 'assists_per_game', 'shots'],
  special_teams: ['games_played', 'power_play_goals', 'power_play_assists', 'power_play_points', 'short_handed_goals', 'short_handed_assists', 'game_winning_goals', 'empty_net_goals'],
  discipline: ['games_played', 'penalty_minutes', 'plus_minus', 'shots', 'shots_per_game', 'goals', 'assists'],
};

const GOALIE_PRESETS: Record<GoaliePresetId, GoalieStatKey[]> = {
  balanced: ['games_played', 'wins', 'losses', 'save_percentage', 'goals_against_average', 'shutouts'],
  volume: ['games_played', 'wins', 'losses', 'saves', 'goals_against', 'shutouts'],
  rate: ['games_played', 'save_percentage', 'goals_against_average', 'shutouts', 'saves'],
};

const SKATER_COLUMN_GROUPS: Array<{ label: string; keys: SkaterStatKey[] }> = [
  { label: 'Core', keys: ['games_played', 'goals', 'assists', 'points'] },
  { label: 'Rates', keys: ['points_per_game', 'goals_per_game', 'assists_per_game', 'shots_per_game'] },
  { label: 'Discipline', keys: ['penalty_minutes', 'plus_minus', 'shots'] },
  { label: 'Special Teams', keys: ['power_play_goals', 'power_play_assists', 'power_play_points', 'short_handed_goals', 'short_handed_assists', 'game_winning_goals', 'empty_net_goals'] },
];

const GOALIE_COLUMN_GROUPS: Array<{ label: string; keys: GoalieStatKey[] }> = [
  { label: 'Core', keys: ['games_played', 'wins', 'losses', 'shutouts'] },
  { label: 'Rates', keys: ['save_percentage', 'goals_against_average'] },
  { label: 'Volume', keys: ['saves', 'goals_against'] },
];

const SKATER_LEGEND = [
  ['GP', 'Games played'],
  ['PTS', 'Points'],
  ['PTS/G', 'Points per game'],
  ['PIM', 'Penalty minutes'],
  ['PPG', 'Power play goals'],
  ['PPP', 'Power play points'],
  ['SHG', 'Short-handed goals'],
  ['GWG', 'Game-winning goals'],
] as const;

const GOALIE_LEGEND = [
  ['GP', 'Games played'],
  ['SV%', 'Save percentage'],
  ['GAA', 'Goals against average'],
  ['SO', 'Shutouts'],
  ['SV', 'Saves'],
  ['GA', 'Goals against'],
] as const;

function isSkaterStatKey(value: string | null): value is SkaterStatKey {
  return SKATER_COLUMNS.some((column) => column.key === value);
}

function isGoalieStatKey(value: string | null): value is GoalieStatKey {
  return GOALIE_COLUMNS.some((column) => column.key === value);
}

function getDefaultSortKey(mode: StatsMode): SkaterStatKey | GoalieStatKey {
  return mode === 'skaters' ? 'points' : 'wins';
}

function getDefaultSortDirection(mode: StatsMode, key: SkaterStatKey | GoalieStatKey): StatsSortDirection {
  const columns = mode === 'skaters' ? SKATER_COLUMNS : GOALIE_COLUMNS;
  return columns.find((column) => column.key === key)?.defaultSortDirection || 'desc';
}

function compareStatValues(a: number | null | undefined, b: number | null | undefined, direction: StatsSortDirection) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function buildStatsHref(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function formatSkaterValue(row: UnifiedSkaterStatsRow, key: SkaterStatKey) {
  switch (key) {
    case 'points_per_game':
    case 'goals_per_game':
    case 'assists_per_game':
    case 'shots_per_game':
      return row[key].toFixed(2);
    case 'plus_minus':
      return `${row.plus_minus > 0 ? '+' : ''}${row.plus_minus}`;
    default:
      return String(row[key]);
  }
}

function formatGoalieValue(row: UnifiedGoalieStatsRow, key: GoalieStatKey) {
  switch (key) {
    case 'save_percentage':
      return row.save_percentage == null ? '-' : `${row.save_percentage.toFixed(1)}%`;
    case 'goals_against_average':
      return row.goals_against_average == null ? '-' : row.goals_against_average.toFixed(2);
    default:
      return String(row[key] ?? '-');
  }
}

export function getMobileVisibleColumns<T extends SkaterStatKey | GoalieStatKey>(
  visibleColumns: T[],
  defaultColumns: T[],
): T[] {
  const prioritized = defaultColumns.filter((key) => visibleColumns.includes(key));
  const overflow = visibleColumns.filter((key) => !prioritized.includes(key));
  return [...prioritized, ...overflow].slice(0, 4);
}

function RankBadge({ rank }: { rank: number }) {
  const shared = 'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black';
  if (rank === 1) return <span className={`${shared} bg-amber-400/20 text-amber-300`}>1</span>;
  if (rank === 2) return <span className={`${shared} bg-slate-300/15 text-slate-200`}>2</span>;
  if (rank === 3) return <span className={`${shared} bg-orange-500/20 text-orange-300`}>3</span>;
  return <span className={`${shared} bg-[var(--color-surface)] text-[var(--color-text-secondary)]`}>{rank}</span>;
}

export function StatsWorkspace({
  leagueSlug,
  seasons,
  currentSeasonId,
  mode,
  seasonLabel,
  isAllTime,
  skaterRows,
  goalieRows,
  badges,
}: StatsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { divisions, selectedDivisionId, setDivision } = useDivisionFilter();
  const prevDivisionRef = useRef<string | null | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [activePreset, setActivePreset] = useState<SkaterPresetId | GoaliePresetId | null>('balanced');
  const [visibleColumns, setVisibleColumns] = useState<Array<SkaterStatKey | GoalieStatKey>>(
    mode === 'skaters' ? [...SKATER_PRESETS.balanced] : [...GOALIE_PRESETS.balanced],
  );

  // TODO(Pixel): use key={mode} at call site to reset component state on mode change instead
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchTerm('');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivePreset('balanced');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleColumns(mode === 'skaters' ? [...SKATER_PRESETS.balanced] : [...GOALIE_PRESETS.balanced]);
  }, [mode]);

  useEffect(() => {
    if (prevDivisionRef.current === undefined) {
      prevDivisionRef.current = searchParams.get('division') || null;
      return;
    }

    if (prevDivisionRef.current === selectedDivisionId) {
      return;
    }

    prevDivisionRef.current = selectedDivisionId;
    const params = new URLSearchParams(searchParams.toString());
    if (selectedDivisionId) {
      params.set('division', selectedDivisionId);
    } else {
      params.delete('division');
    }

    startTransition(() => {
      router.replace(buildStatsHref(pathname, params));
    });
  }, [pathname, router, searchParams, selectedDivisionId]);

  const currentSort =
    mode === 'skaters'
      ? isSkaterStatKey(searchParams.get('sort'))
        ? (searchParams.get('sort') as SkaterStatKey)
        : 'points'
      : isGoalieStatKey(searchParams.get('sort'))
        ? (searchParams.get('sort') as GoalieStatKey)
        : 'wins';

  const requestedDirection = searchParams.get('dir');
  const currentDirection: StatsSortDirection =
    requestedDirection === 'asc' || requestedDirection === 'desc'
      ? requestedDirection
      : getDefaultSortDirection(mode, currentSort);

  const allRows = mode === 'skaters' ? skaterRows : goalieRows;
  const sortedRows = [...allRows].sort((left, right) => {
    const primary =
      mode === 'skaters'
        ? compareStatValues(
            (left as UnifiedSkaterStatsRow)[currentSort as SkaterStatKey],
            (right as UnifiedSkaterStatsRow)[currentSort as SkaterStatKey],
            currentDirection,
          )
        : compareStatValues(
            (left as UnifiedGoalieStatsRow)[currentSort as GoalieStatKey],
            (right as UnifiedGoalieStatsRow)[currentSort as GoalieStatKey],
            currentDirection,
          );

    if (primary !== 0) {
      return primary;
    }

    if (mode === 'skaters') {
      const pointTieBreak = (right as UnifiedSkaterStatsRow).points - (left as UnifiedSkaterStatsRow).points;
      if (pointTieBreak !== 0) {
        return pointTieBreak;
      }
    } else {
      const winTieBreak = (right as UnifiedGoalieStatsRow).wins - (left as UnifiedGoalieStatsRow).wins;
      if (winTieBreak !== 0) {
        return winTieBreak;
      }
    }

    return left.player_name.localeCompare(right.player_name);
  });

  const rankMap = new Map(sortedRows.map((row, index) => [row.player_id, index + 1]));
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredRows = normalizedSearch
    ? sortedRows.filter((row) => {
        const divisionText = row.division_name ? row.division_name.toLowerCase() : '';
        return (
          row.player_name.toLowerCase().includes(normalizedSearch) ||
          row.team_name.toLowerCase().includes(normalizedSearch) ||
          divisionText.includes(normalizedSearch)
        );
      })
    : sortedRows;

  const columns = mode === 'skaters' ? SKATER_COLUMNS : GOALIE_COLUMNS;
  const visibleColumnSet = new Set(visibleColumns);
  const visibleColumnDefs = columns.filter((column) => visibleColumnSet.has(column.key));
  const mobileVisibleColumnKeys = getMobileVisibleColumns(
    visibleColumns,
    (mode === 'skaters' ? SKATER_PRESETS.balanced : GOALIE_PRESETS.balanced) as Array<SkaterStatKey | GoalieStatKey>,
  );
  const mobileVisibleColumnDefs = columns.filter((column) => mobileVisibleColumnKeys.includes(column.key));
  const presetOptions =
    mode === 'skaters'
      ? [
          ['balanced', 'Balanced'],
          ['scoring', 'Scoring'],
          ['special_teams', 'Special Teams'],
          ['discipline', 'Discipline'],
        ]
      : [
          ['balanced', 'Balanced'],
          ['volume', 'Volume'],
          ['rate', 'Rate'],
        ];
  const columnGroups = mode === 'skaters' ? SKATER_COLUMN_GROUPS : GOALIE_COLUMN_GROUPS;
  const legendItems = mode === 'skaters' ? SKATER_LEGEND : GOALIE_LEGEND;

  const updateUrl = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    startTransition(() => {
      router.replace(buildStatsHref(pathname, params));
    });
  };

  const handleModeChange = (nextMode: StatsMode) => {
    if (nextMode === mode) {
      return;
    }

    updateUrl((params) => {
      const defaultSort = getDefaultSortKey(nextMode);
      params.set('mode', nextMode);
      params.set('sort', defaultSort);
      params.set('dir', getDefaultSortDirection(nextMode, defaultSort));
    });
  };

  const handleSortChange = (key: SkaterStatKey | GoalieStatKey) => {
    updateUrl((params) => {
      if (currentSort === key) {
        params.set('dir', currentDirection === 'desc' ? 'asc' : 'desc');
      } else {
        params.set('sort', key);
        params.set('dir', getDefaultSortDirection(mode, key));
      }
    });
  };

  const handlePresetChange = (preset: SkaterPresetId | GoaliePresetId) => {
    setActivePreset(preset);
    setVisibleColumns(
      mode === 'skaters' ? [...SKATER_PRESETS[preset as SkaterPresetId]] : [...GOALIE_PRESETS[preset as GoaliePresetId]],
    );
  };

  const handleColumnToggle = (key: SkaterStatKey | GoalieStatKey) => {
    setActivePreset(null);
    setVisibleColumns((current) => {
      if (current.includes(key)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((value) => value !== key);
      }

      const next = [...current, key];
      const order = columns.map((column) => column.key);
      next.sort((left, right) => order.indexOf(left as never) - order.indexOf(right as never));
      return next;
    });
  };

  const title = mode === 'skaters' ? 'Skater stats' : 'Goalie stats';
  const subtitle = isAllTime
    ? 'Career totals across every completed, verified season.'
    : `${seasonLabel || 'Current season'} officially recorded stats.`;
  const searchPlaceholder = isAllTime
    ? `Search ${mode === 'skaters' ? 'players' : 'goalies'}...`
    : `Search ${mode === 'skaters' ? 'players or teams' : 'goalies or teams'}...`;

  return (
    <section className="league-shell-panel overflow-hidden rounded-[32px] border border-[var(--color-border)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] md:text-3xl">
              Stats
            </h1>
          </div>
          <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/75 px-4 py-2 text-sm text-[var(--color-text-secondary)]">
            {filteredRows.length} showing
            <span className="mx-2 text-[var(--color-text-muted)]">/</span>
            {sortedRows.length} total
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)]/72 p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <SeasonSelector seasons={seasons} currentSeasonId={currentSeasonId || undefined} />
              <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange('skaters')}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    mode === 'skaters'
                      ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Skaters
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('goalies')}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    mode === 'goalies'
                      ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Goalies
                </button>
              </div>
            </div>

            <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">{title}</span>
              <span className="mx-2 text-[var(--color-text-muted)]">|</span>
              {subtitle}
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-elevated)] py-3 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--league-primary)]"
              />
            </div>

            {divisions.length > 1 && (
              <select
                value={selectedDivisionId || ''}
                onChange={(event) => setDivision(event.target.value || null)}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--league-primary)]"
              >
                <option value="">All divisions</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            )}

            <div className="md:hidden">
              <select
                value={currentSort}
                onChange={(event) => handleSortChange(event.target.value as SkaterStatKey | GoalieStatKey)}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--league-primary)]"
              >
                {columns.map((column) => (
                  <option key={column.key} value={column.key}>
                    Sort: {column.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {presetOptions.map(([id, label]) => {
                const presetId = id as SkaterPresetId | GoaliePresetId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handlePresetChange(presetId)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                      activePreset === presetId
                        ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                        : 'bg-[var(--color-background-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)]">
                <SlidersHorizontal className="h-4 w-4 text-[var(--league-primary)]" />
                Columns ({visibleColumnDefs.length})
              </summary>
              <div className="absolute right-0 z-40 mt-3 w-[320px] rounded-[24px] border border-[var(--color-border)] bg-[var(--color-background-elevated)] p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)]">
                <div className="space-y-4">
                  {columnGroups.map((group) => (
                    <div key={group.label}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                        {group.label}
                      </p>
                      <div className="mt-2 grid gap-2">
                        {group.keys.map((key) => {
                          const column = columns.find((item) => item.key === key);
                          if (!column) {
                            return null;
                          }

                          const checked = visibleColumnSet.has(key);
                          return (
                            <label
                              key={key}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/65 px-3 py-2 text-sm text-[var(--color-text-primary)]"
                            >
                              <span>{column.label}</span>
                              <button
                                type="button"
                                onClick={() => handleColumnToggle(key)}
                                className={`inline-flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                  checked
                                    ? 'border-[var(--league-primary)] bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                                    : 'border-[var(--color-border)] text-transparent'
                                }`}
                                aria-pressed={checked}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-background-elevated)]">
          {filteredRows.length > 0 ? (
            <>
              <div className="grid gap-3 p-3 md:hidden">
                {filteredRows.map((row) => {
                  const rank = rankMap.get(row.player_id) || 0;

                  return (
                    <article
                      key={row.player_id}
                      className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <RankBadge rank={rank} />
                        <img
                          src={row.avatar_url || '/blank_player.png'}
                          alt={row.player_name}
                          className="h-12 w-12 shrink-0 rounded-xl border border-[var(--color-border)] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/${leagueSlug}/players/${row.player_id}`}
                              className="truncate font-semibold text-[var(--color-text-primary)] transition-colors hover:text-[var(--league-primary)]"
                            >
                              {row.player_name}
                            </Link>
                            {badges[row.player_id] && badges[row.player_id].length > 0 && (
                              <PlayerBadgeGroup badges={badges[row.player_id]} maxVisible={2} size="sm" />
                            )}
                          </div>
                          {!isAllTime && (
                            <p className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                              {row.division_name ? `${row.division_name} | ` : ''}
                              {row.team_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {mobileVisibleColumnDefs.map((column) => {
                          const value =
                            mode === 'skaters'
                              ? formatSkaterValue(row as UnifiedSkaterStatsRow, column.key as SkaterStatKey)
                              : formatGoalieValue(row as UnifiedGoalieStatsRow, column.key as GoalieStatKey);
                          const valueClass =
                            mode === 'skaters' && column.key === 'plus_minus'
                              ? (row as UnifiedSkaterStatsRow).plus_minus > 0
                                ? 'text-emerald-400'
                                : (row as UnifiedSkaterStatsRow).plus_minus < 0
                                  ? 'text-rose-400'
                                  : 'text-[var(--color-text-primary)]'
                              : currentSort === column.key
                                ? 'text-[var(--league-primary)]'
                                : 'text-[var(--color-text-primary)]';

                          return (
                            <div
                              key={column.key}
                              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-3 py-2"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                                {column.label}
                              </p>
                              <p className={`mt-1 text-lg font-black ${valueClass}`}>{value}</p>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className={`w-full min-w-[960px] border-separate border-spacing-0 text-sm ${mode === 'skaters' ? 'xl:min-w-[1120px]' : 'xl:min-w-[960px]'}`}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-30 w-14 border-b border-[var(--color-border)] bg-[var(--color-background-elevated)] px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        #
                      </th>
                      <th className="sticky left-14 z-30 min-w-[280px] border-b border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        Player
                      </th>
                      {visibleColumnDefs.map((column) => {
                        const active = currentSort === column.key;
                        const alignClass =
                          column.align === 'right'
                            ? 'text-right'
                            : column.align === 'center'
                              ? 'text-center'
                              : 'text-left';

                        return (
                          <th
                            key={column.key}
                            className={`border-b border-[var(--color-border)] bg-[var(--color-background-elevated)] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)] ${alignClass}`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSortChange(column.key)}
                              className={`inline-flex w-full items-center gap-1 ${
                                column.align === 'right'
                                  ? 'justify-end'
                                  : column.align === 'center'
                                    ? 'justify-center'
                                    : 'justify-start'
                              } ${active ? 'text-[var(--color-text-primary)]' : ''}`}
                            >
                              <span>{column.label}</span>
                              {active ? (
                                currentDirection === 'desc' ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-[var(--league-primary)]" />
                                ) : (
                                  <ChevronUp className="h-3.5 w-3.5 text-[var(--league-primary)]" />
                                )
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 opacity-30" />
                              )}
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const rank = rankMap.get(row.player_id) || 0;

                      return (
                        <tr key={row.player_id} className="group">
                          <td className="sticky left-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background-elevated)] px-3 py-3 text-center transition-colors group-hover:bg-[var(--color-surface-hover)]">
                            <RankBadge rank={rank} />
                          </td>
                          <td className="sticky left-14 z-20 border-b border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-3 transition-colors group-hover:bg-[var(--color-surface-hover)]">
                            <div className="flex items-center gap-3">
                              <img
                                src={row.avatar_url || '/blank_player.png'}
                                alt={row.player_name}
                                className="h-10 w-10 shrink-0 rounded-xl border border-[var(--color-border)] object-cover"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/${leagueSlug}/players/${row.player_id}`}
                                    className="truncate font-semibold text-[var(--color-text-primary)] transition-colors hover:text-[var(--league-primary)]"
                                  >
                                    {row.player_name}
                                  </Link>
                                  {badges[row.player_id] && badges[row.player_id].length > 0 && (
                                    <PlayerBadgeGroup badges={badges[row.player_id]} maxVisible={3} size="sm" />
                                  )}
                                </div>
                                {!isAllTime && (
                                  <p className="truncate text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                                    {row.division_name ? `${row.division_name} | ` : ''}
                                    {row.team_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          {visibleColumnDefs.map((column) => {
                            const alignClass =
                              column.align === 'right'
                                ? 'text-right'
                                : column.align === 'center'
                                  ? 'text-center'
                                  : 'text-left';
                            const sortedClass = currentSort === column.key ? 'font-semibold text-[var(--league-primary)]' : 'text-[var(--color-text-primary)]';
                            const value =
                              mode === 'skaters'
                                ? formatSkaterValue(row as UnifiedSkaterStatsRow, column.key as SkaterStatKey)
                                : formatGoalieValue(row as UnifiedGoalieStatsRow, column.key as GoalieStatKey);

                            return (
                              <td
                                key={column.key}
                                className={`border-b border-[var(--color-border)] px-3 py-3 transition-colors group-hover:bg-[var(--color-surface-hover)] ${alignClass} ${sortedClass}`}
                              >
                                <span
                                  className={
                                    mode === 'skaters' && column.key === 'plus_minus'
                                      ? (row as UnifiedSkaterStatsRow).plus_minus > 0
                                        ? 'text-emerald-400'
                                        : (row as UnifiedSkaterStatsRow).plus_minus < 0
                                          ? 'text-rose-400'
                                          : ''
                                      : ''
                                  }
                                >
                                  {value}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-[var(--color-text-muted)]" />
              <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">
                {normalizedSearch ? 'No matching players found' : `No ${mode} stats available`}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {normalizedSearch
                  ? `Try a different player, team, or division search on ${leagueSlug.toUpperCase()}.`
                  : 'Stats will appear once completed, verified games are recorded.'}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {legendItems.map(([label, description]) => (
            <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/65 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                {label}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default StatsWorkspace;
