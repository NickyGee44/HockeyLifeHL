'use client';

import Link from 'next/link';
import { startTransition, useDeferredValue, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import { PlayerBadgeGroup } from '@/components/shared/PlayerBadgeGroup';
import { StatLeaders } from './StatLeaders';
import type {
  GoalieStatKey,
  PlayerBadge,
  Season,
  SkaterStatKey,
  StatsMode,
  StatsSortDirection,
  StatsTableColumn,
  Team,
  UnifiedGoalieStatsRow,
  UnifiedSkaterStatsRow,
} from '@/lib/types';

type SkaterPresetId = 'balanced' | 'scoring' | 'special_teams' | 'discipline';
type GoaliePresetId = 'balanced' | 'volume' | 'rate';
type StatsPresetId = SkaterPresetId | GoaliePresetId;

interface StatsWorkspaceProps {
  leagueSlug: string;
  seasons: Season[];
  teams: Team[];
  currentSeasonId?: string | null;
  mode: StatsMode;
  seasonLabel?: string | null;
  isAllTime: boolean;
  skaterRows: UnifiedSkaterStatsRow[];
  goalieRows: UnifiedGoalieStatsRow[];
  badges: Record<string, PlayerBadge[]>;
}

interface FilterDraft {
  divisionId: string;
  position: string;
  seasonId: string;
  statsType: StatsPresetId;
  teamId: string;
}

const SKATER_COLUMNS: StatsTableColumn<SkaterStatKey>[] = [
  { key: 'games_played', label: 'GP', align: 'center', defaultSortDirection: 'desc' },
  { key: 'goals', label: 'G', align: 'center', defaultSortDirection: 'desc' },
  { key: 'assists', label: 'A', align: 'center', defaultSortDirection: 'desc' },
  { key: 'points', label: 'PTS', align: 'center', defaultSortDirection: 'desc' },
  { key: 'championships', label: 'Championships', align: 'center', defaultSortDirection: 'desc' },
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
  { key: 'championships', label: 'Championships', align: 'center', defaultSortDirection: 'desc' },
  { key: 'save_percentage', label: 'SV%', align: 'center', defaultSortDirection: 'desc' },
  { key: 'goals_against_average', label: 'GAA', align: 'center', defaultSortDirection: 'asc' },
  { key: 'shutouts', label: 'SO', align: 'center', defaultSortDirection: 'desc' },
  { key: 'saves', label: 'SV', align: 'center', defaultSortDirection: 'desc' },
  { key: 'goals_against', label: 'GA', align: 'center', defaultSortDirection: 'asc' },
];

const SKATER_PRESETS: Record<SkaterPresetId, SkaterStatKey[]> = {
  balanced: ['games_played', 'goals', 'assists', 'points', 'championships', 'points_per_game', 'penalty_minutes', 'plus_minus'],
  scoring: ['games_played', 'goals', 'assists', 'points', 'points_per_game', 'goals_per_game', 'assists_per_game', 'shots'],
  special_teams: ['games_played', 'power_play_goals', 'power_play_assists', 'power_play_points', 'short_handed_goals', 'short_handed_assists', 'game_winning_goals', 'empty_net_goals'],
  discipline: ['games_played', 'penalty_minutes', 'plus_minus', 'shots', 'shots_per_game', 'goals', 'assists'],
};

const GOALIE_PRESETS: Record<GoaliePresetId, GoalieStatKey[]> = {
  balanced: ['games_played', 'wins', 'losses', 'championships', 'save_percentage', 'goals_against_average', 'shutouts'],
  volume: ['games_played', 'wins', 'losses', 'championships', 'saves', 'goals_against', 'shutouts'],
  rate: ['games_played', 'championships', 'save_percentage', 'goals_against_average', 'shutouts', 'saves'],
};

const SKATER_COLUMN_GROUPS: Array<{ label: string; keys: SkaterStatKey[] }> = [
  { label: 'Core', keys: ['games_played', 'goals', 'assists', 'points'] },
  { label: 'Achievements', keys: ['championships'] },
  { label: 'Rates', keys: ['points_per_game', 'goals_per_game', 'assists_per_game', 'shots_per_game'] },
  { label: 'Discipline', keys: ['penalty_minutes', 'plus_minus', 'shots'] },
  { label: 'Special Teams', keys: ['power_play_goals', 'power_play_assists', 'power_play_points', 'short_handed_goals', 'short_handed_assists', 'game_winning_goals', 'empty_net_goals'] },
];

const GOALIE_COLUMN_GROUPS: Array<{ label: string; keys: GoalieStatKey[] }> = [
  { label: 'Core', keys: ['games_played', 'wins', 'losses', 'shutouts'] },
  { label: 'Achievements', keys: ['championships'] },
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
  ['Championships', 'Recorded league championships won'],
] as const;

const GOALIE_LEGEND = [
  ['GP', 'Games played'],
  ['SV%', 'Save percentage'],
  ['GAA', 'Goals against average'],
  ['SO', 'Shutouts'],
  ['SV', 'Saves'],
  ['GA', 'Goals against'],
  ['Championships', 'Recorded league championships won'],
] as const;

const MODAL_SELECT_CLASS = 'w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--league-primary)]';

function isSkaterStatKey(value: string | null): value is SkaterStatKey {
  return SKATER_COLUMNS.some((column) => column.key === value);
}

function isGoalieStatKey(value: string | null): value is GoalieStatKey {
  return GOALIE_COLUMNS.some((column) => column.key === value);
}

function isSkaterPresetId(value: string | null): value is SkaterPresetId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SKATER_PRESETS, value);
}

function isGoaliePresetId(value: string | null): value is GoaliePresetId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GOALIE_PRESETS, value);
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

function formatJerseyDisplay(jerseyNumber?: string | null) {
  return jerseyNumber?.trim() ? jerseyNumber : '--';
}

function normalizePosition(position: string | null | undefined) {
  const value = position?.trim().toLowerCase();
  if (!value) {
    return null;
  }

  if (value === 'g' || value === 'goalie' || value === 'goaltender') return 'Goalie';
  if (value === 'defense' || value === 'defenceman' || value === 'defenseman' || value === 'd') return 'Defense';
  if (value === 'forward' || value === 'f') return 'Forward';
  if (value === 'center' || value === 'centre' || value === 'c') return 'C';
  if (value === 'left wing' || value === 'lw') return 'LW';
  if (value === 'right wing' || value === 'rw') return 'RW';
  return position?.trim() || null;
}

function getDefaultVisibleColumns(mode: StatsMode, preset: StatsPresetId) {
  return mode === 'skaters'
    ? [...SKATER_PRESETS[preset as SkaterPresetId]]
    : [...GOALIE_PRESETS[preset as GoaliePresetId]];
}

export function getMobileVisibleColumns<T extends SkaterStatKey | GoalieStatKey>(
  visibleColumns: T[],
  defaultColumns: T[],
): T[] {
  const prioritized = defaultColumns.filter((key) => visibleColumns.includes(key));
  const overflow = visibleColumns.filter((key) => !prioritized.includes(key));
  return [...prioritized, ...overflow].slice(0, 4);
}

function FilterTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
      {label}
    </span>
  );
}

function FilterField({
  children,
  helper,
  label,
}: {
  children: ReactNode;
  helper?: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
        {label}
      </label>
      {children}
      {helper ? <p className="text-xs text-[var(--color-text-muted)]">{helper}</p> : null}
    </div>
  );
}

export function StatsWorkspace({
  leagueSlug,
  seasons,
  teams,
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
  const [visibleColumns, setVisibleColumns] = useState<Array<SkaterStatKey | GoalieStatKey>>(
    mode === 'skaters' ? [...SKATER_PRESETS.balanced] : [...GOALIE_PRESETS.balanced],
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<FilterDraft>({
    divisionId: selectedDivisionId || '',
    position: '',
    seasonId: currentSeasonId || seasons[0]?.id || '',
    statsType: 'balanced',
    teamId: '',
  });

  const allRows = mode === 'skaters' ? skaterRows : goalieRows;
  const statsTypeParam = searchParams.get('statsType');
  const requestedPreset =
    mode === 'skaters'
      ? isSkaterPresetId(statsTypeParam)
        ? statsTypeParam
        : 'balanced'
      : isGoaliePresetId(statsTypeParam)
        ? statsTypeParam
        : 'balanced';

  // Reset search and columns when the mode or preset changes —
  // intentional prop-change reset, not a cascading render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSearchTerm('');
    setVisibleColumns(getDefaultVisibleColumns(mode, requestedPreset));
  }, [mode, requestedPreset]);

  // Sync the filter draft to current URL state whenever the modal opens.
  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const selectedSeasonFromUrl = searchParams.get('season') || currentSeasonId || seasons[0]?.id || '';
    setFilterDraft({
      divisionId: selectedDivisionId || '',
      position: searchParams.get('position') || '',
      seasonId: selectedSeasonFromUrl,
      statsType: requestedPreset,
      teamId: searchParams.get('team') || '',
    });
  }, [currentSeasonId, isFilterOpen, requestedPreset, searchParams, seasons, selectedDivisionId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFilterOpen]);

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
      params.delete('team');
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

  const currentTeamFilter = searchParams.get('team') || '';
  const currentPositionFilter = searchParams.get('position') || '';
  const selectedDivisionName = divisions.find((division) => division.id === selectedDivisionId)?.name || null;
  const selectedTeam = teams.find((team) => team.id === currentTeamFilter) || null;
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const sortedTeamOptions = [...teams].sort((left, right) => left.name.localeCompare(right.name));
  const divisionFilteredTeamOptions = (filterDraft.divisionId
    ? sortedTeamOptions.filter((team) => team.division_id === filterDraft.divisionId)
    : sortedTeamOptions);

  const positionOptions = [...new Set(
    allRows
      .map((row) => normalizePosition(row.position))
      .filter((position): position is string => Boolean(position)),
  )].sort((left, right) => left.localeCompare(right));

  const divisionByTeamId = new Map(teams.map((team) => [team.id, team.division_id || null]));

  const scopeRows = allRows.filter((row) => {
    if (selectedDivisionId) {
      const rowDivisionId = divisionByTeamId.get(row.team_id) || null;
      const matchesDivisionId = rowDivisionId ? rowDivisionId === selectedDivisionId : false;
      const matchesDivisionName = selectedDivisionName
        ? row.division_name?.toLowerCase() === selectedDivisionName.toLowerCase()
        : false;

      if (!matchesDivisionId && !matchesDivisionName) {
        return false;
      }
    }

    if (currentTeamFilter && row.team_id !== currentTeamFilter) {
      return false;
    }

    if (currentPositionFilter && normalizePosition(row.position) !== currentPositionFilter) {
      return false;
    }

    return true;
  });

  const sortedRows = [...scopeRows].sort((left, right) => {
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
  const selectedPresetLabel = presetOptions.find(([id]) => id === requestedPreset)?.[1] || 'Balanced';
  const searchPlaceholder = isAllTime
    ? `Search ${mode === 'skaters' ? 'players' : 'goalies'}...`
    : `Search ${mode === 'skaters' ? 'players or teams' : 'goalies or teams'}...`;

  const selectedSeasonId = searchParams.get('season') || currentSeasonId || seasons[0]?.id || '';
  const isCustomSeasonSelection = !isAllTime && Boolean(selectedSeasonId) && selectedSeasonId !== (currentSeasonId || '');

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
      params.delete('position');
      params.delete('statsType');
    });
  };

  const handleViewChange = (nextIsAllTime: boolean) => {
    if (nextIsAllTime === isAllTime) {
      return;
    }

    updateUrl((params) => {
      if (nextIsAllTime) {
        params.set('view', 'all-time');
        params.delete('season');
      } else {
        params.delete('view');
        params.set('season', searchParams.get('season') || currentSeasonId || seasons[0]?.id || '');
      }
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

  const handleColumnToggle = (key: SkaterStatKey | GoalieStatKey) => {
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

  const openFilterPanel = () => {
    setFilterDraft({
      divisionId: selectedDivisionId || '',
      position: currentPositionFilter,
      seasonId: selectedSeasonId,
      statsType: requestedPreset,
      teamId: currentTeamFilter,
    });
    setIsFilterOpen(true);
  };

  const applyFilterDraft = () => {
    const nextDivisionId = filterDraft.divisionId || null;
    prevDivisionRef.current = nextDivisionId;
    setDivision(nextDivisionId);

    updateUrl((params) => {
      if (nextDivisionId) {
        params.set('division', nextDivisionId);
      } else {
        params.delete('division');
      }

      if (filterDraft.teamId) {
        params.set('team', filterDraft.teamId);
      } else {
        params.delete('team');
      }

      if (filterDraft.position) {
        params.set('position', filterDraft.position);
      } else {
        params.delete('position');
      }

      if (filterDraft.statsType && filterDraft.statsType !== 'balanced') {
        params.set('statsType', filterDraft.statsType);
      } else {
        params.delete('statsType');
      }

      if (!isAllTime) {
        params.set('season', filterDraft.seasonId || currentSeasonId || seasons[0]?.id || '');
        params.delete('view');
      }
    });

    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    prevDivisionRef.current = null;
    setDivision(null);
    setFilterDraft((current) => ({
      ...current,
      divisionId: '',
      position: '',
      seasonId: currentSeasonId || seasons[0]?.id || '',
      statsType: 'balanced',
      teamId: '',
    }));

    updateUrl((params) => {
      params.delete('division');
      params.delete('position');
      params.delete('team');
      params.delete('statsType');
      if (!isAllTime) {
        params.set('season', currentSeasonId || seasons[0]?.id || '');
        params.delete('view');
      }
    });
  };

  const activeFilterCount =
    (selectedDivisionId ? 1 : 0) +
    (currentTeamFilter ? 1 : 0) +
    (currentPositionFilter ? 1 : 0) +
    (requestedPreset !== 'balanced' ? 1 : 0) +
    (isCustomSeasonSelection ? 1 : 0);

  const activeFilterTags = [
    !isAllTime && seasonLabel ? `Season: ${seasonLabel}` : null,
    isAllTime ? 'All Time' : null,
    selectedDivisionName ? `Division: ${selectedDivisionName}` : null,
    selectedTeam ? `Team: ${selectedTeam.name}` : null,
    currentPositionFilter ? `Position: ${currentPositionFilter}` : null,
    selectedPresetLabel !== 'Balanced' ? `Stats Type: ${selectedPresetLabel}` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3">
            <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] p-1">
              <button
                type="button"
                onClick={() => handleViewChange(false)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  !isAllTime
                    ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Current Season
              </button>
              <button
                type="button"
                onClick={() => handleViewChange(true)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isAllTime
                    ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                All Time
              </button>
            </div>

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
                Players
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

          <button
            type="button"
            onClick={openFilterPanel}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--league-primary)]/40 hover:text-[var(--league-primary)]"
          >
            <Filter className="h-4 w-4 text-[var(--league-primary)]" />
            Filter
            {activeFilterCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--league-primary)] px-1.5 text-[10px] font-black text-[var(--color-accent-text)]">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        {activeFilterTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeFilterTags.map((tag) => (
              <FilterTag key={tag} label={tag} />
            ))}
          </div>
        ) : null}

        <StatLeaders
          badges={badges}
          isAllTime={isAllTime}
          leagueSlug={leagueSlug}
          mode={mode}
          rows={scopeRows}
        />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-elevated)] py-3 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--league-primary)]"
                />
              </div>

          <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
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

                <details className="group relative">
                  <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)]">
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

        <div className="overflow-x-auto">
            {filteredRows.length > 0 ? (
              <>
                <div>
                  <table className={`w-full min-w-[980px] border-separate border-spacing-0 text-sm ${mode === 'skaters' ? 'xl:min-w-[1160px]' : 'xl:min-w-[980px]'}`}>
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-30 min-w-[260px] border-b border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                          {mode === 'skaters' ? 'Player' : 'Goalie'}
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
                        const { firstName, lastName } = splitPlayerName(row.player_name);

                        return (
                          <tr key={row.player_id} className="group">
                            <td className="sticky left-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-3 transition-colors group-hover:bg-[var(--color-surface-hover)]">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm font-black tabular-nums text-[var(--league-primary)]">
                                  {formatJerseyDisplay(row.jersey_number)}
                                </span>
                                <img
                                  src={row.avatar_url || '/blank_player.png'}
                                  alt={row.player_name}
                                  className="h-10 w-10 shrink-0 rounded-xl border border-[var(--color-border)] object-cover"
                                />
                                <div className="min-w-0">
                                  <Link
                                    href={`/${leagueSlug}/players/${row.player_id}`}
                                    className="block leading-tight text-[var(--color-text-primary)] transition-colors hover:text-[var(--league-primary)]"
                                  >
                                    <span className="block truncate text-sm font-semibold">{firstName}</span>
                                    {lastName ? (
                                      <span className="block truncate text-sm font-semibold">{lastName}</span>
                                    ) : null}
                                  </Link>
                                  {badges[row.player_id] && badges[row.player_id].length > 0 && (
                                    <div className="mt-1">
                                      <PlayerBadgeGroup badges={badges[row.player_id]} maxVisible={3} size="sm" />
                                    </div>
                                  )}
                                  <p className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                                    {row.division_name ? `${row.division_name} | ` : ''}
                                    {row.team_name}
                                  </p>
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
                  {normalizedSearch
                    ? `No matching ${mode === 'skaters' ? 'players' : 'goalies'} found`
                    : `No ${mode === 'skaters' ? 'player' : 'goalie'} stats available`}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {normalizedSearch
                    ? `Try a different player, team, or division search on ${leagueSlug.toUpperCase()}.`
                    : 'Stats will appear once completed, verified games are recorded.'}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/65">
            <button
              type="button"
              onClick={() => setIsLegendOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Legend</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Column shorthand and stat definitions
                </p>
              </div>
              {isLegendOpen ? (
                <ChevronUp className="h-4 w-4 text-[var(--league-primary)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--league-primary)]" />
              )}
            </button>

            {isLegendOpen ? (
              <div className="grid gap-3 border-t border-[var(--color-border)] px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
                {legendItems.map(([label, description]) => (
                  <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                      {label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
      </section>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-6">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0"
            onClick={() => setIsFilterOpen(false)}
          />

          <div className="relative z-[81] w-full max-w-3xl rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_40px_120px_-50px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 md:px-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                  Stats Filters
                </p>
                <h2 className="mt-1 text-xl font-black text-[var(--color-text-primary)]">
                  Fine-tune the workspace
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Choose a season, stats profile, and roster filters without losing the current sort or search state.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-5 px-5 py-5 md:grid-cols-2 md:px-6">
              <FilterField
                label="Season"
                helper={isAllTime ? 'Season selection is disabled while All Time is active.' : undefined}
              >
                <select
                  value={filterDraft.seasonId}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      seasonId: event.target.value,
                    }))
                  }
                  disabled={isAllTime}
                  className={`${MODAL_SELECT_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} {season.id === currentSeasonId ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Stats Type">
                <select
                  value={filterDraft.statsType}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      statsType: event.target.value as StatsPresetId,
                    }))
                  }
                  className={MODAL_SELECT_CLASS}
                >
                  {presetOptions.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Division">
                <select
                  value={filterDraft.divisionId}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      divisionId: event.target.value,
                      teamId: '',
                    }))
                  }
                  className={MODAL_SELECT_CLASS}
                >
                  <option value="">All divisions</option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Team">
                <select
                  value={filterDraft.teamId}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      teamId: event.target.value,
                    }))
                  }
                  className={MODAL_SELECT_CLASS}
                >
                  <option value="">All teams</option>
                  {divisionFilteredTeamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField
                label="Position"
                helper={mode === 'goalies' ? 'Goalie mode already limits results to goalies.' : undefined}
              >
                <select
                  value={filterDraft.position}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      position: event.target.value,
                    }))
                  }
                  disabled={mode === 'goalies'}
                  className={`${MODAL_SELECT_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <option value="">All positions</option>
                  {positionOptions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </FilterField>

              <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-background-elevated)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                  Active View
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
                  {mode === 'skaters' ? 'Players' : 'Goalies'}
                  <span className="mx-2 text-[var(--color-text-muted)]">|</span>
                  {isAllTime ? 'All Time' : seasonLabel || 'Current Season'}
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Use the toggle bar above the leader card to switch between career totals and the season view.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                Reset filters
              </button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyFilterDraft}
                  className="rounded-full bg-[var(--league-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-accent-text)]"
                >
                  Apply filters
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default StatsWorkspace;
