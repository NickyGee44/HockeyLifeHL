'use client';

/**
 * Standings Table Component
 *
 * Displays team standings with sortable columns and playoff highlighting.
 */

import { useState, useMemo } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { ChevronUp, ChevronDown, Trophy } from 'lucide-react';
import type { TeamStanding, StandingsColumn, ColumnConfig, DEFAULT_COLUMNS } from '@/lib/standings/types';

// ============================================================================
// TYPES
// ============================================================================

interface StandingsTableProps {
  standings: TeamStanding[];
  playoffSpots?: number;
  showHomeAway?: boolean;
  className?: string;
}

type SortDirection = 'asc' | 'desc';

// ============================================================================
// COLUMN CONFIG
// ============================================================================

const COLUMNS: ColumnConfig[] = [
  { key: 'rank', label: 'Rank', shortLabel: '#', sortable: false, align: 'center', width: '50px' },
  { key: 'team', label: 'Team', shortLabel: 'Team', sortable: true, align: 'left' },
  { key: 'gp', label: 'Games Played', shortLabel: 'GP', sortable: true, align: 'center', width: '60px' },
  { key: 'w', label: 'Wins', shortLabel: 'W', sortable: true, align: 'center', width: '50px' },
  { key: 'l', label: 'Losses', shortLabel: 'L', sortable: true, align: 'center', width: '50px' },
  { key: 't', label: 'Ties', shortLabel: 'T', sortable: true, align: 'center', width: '50px' },
  { key: 'pts', label: 'Points', shortLabel: 'PTS', sortable: true, align: 'center', width: '60px' },
  { key: 'gf', label: 'Goals For', shortLabel: 'GF', sortable: true, align: 'center', width: '60px' },
  { key: 'ga', label: 'Goals Against', shortLabel: 'GA', sortable: true, align: 'center', width: '60px' },
  { key: 'diff', label: 'Goal Diff', shortLabel: 'DIFF', sortable: true, align: 'center', width: '60px' },
  { key: 'home', label: 'Home Record', shortLabel: 'HOME', sortable: false, align: 'center', width: '80px' },
  { key: 'away', label: 'Away Record', shortLabel: 'AWAY', sortable: false, align: 'center', width: '80px' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function StandingsTable({
  standings,
  playoffSpots = 8,
  showHomeAway = false,
  className,
}: StandingsTableProps) {
  const [sortColumn, setSortColumn] = useState<StandingsColumn>('pts');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter columns
  const visibleColumns = useMemo(() => {
    return COLUMNS.filter((col) => {
      if (!showHomeAway && (col.key === 'home' || col.key === 'away')) {
        return false;
      }
      return true;
    });
  }, [showHomeAway]);

  // Sort standings
  const sortedStandings = useMemo(() => {
    const sorted = [...standings];

    sorted.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortColumn) {
        case 'team':
          aVal = a.teamName;
          bVal = b.teamName;
          break;
        case 'gp':
          aVal = a.gamesPlayed;
          bVal = b.gamesPlayed;
          break;
        case 'w':
          aVal = a.wins;
          bVal = b.wins;
          break;
        case 'l':
          aVal = a.losses;
          bVal = b.losses;
          break;
        case 't':
          aVal = a.ties;
          bVal = b.ties;
          break;
        case 'pts':
          aVal = a.points;
          bVal = b.points;
          break;
        case 'gf':
          aVal = a.goalsFor;
          bVal = b.goalsFor;
          break;
        case 'ga':
          aVal = a.goalsAgainst;
          bVal = b.goalsAgainst;
          break;
        case 'diff':
          aVal = a.goalDiff;
          bVal = b.goalDiff;
          break;
        default:
          aVal = a.rank;
          bVal = b.rank;
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal as string);
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [standings, sortColumn, sortDirection]);

  const handleSort = (column: StandingsColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getCellValue = (team: TeamStanding, column: StandingsColumn): React.ReactNode => {
    switch (column) {
      case 'rank':
        return (
          <span className="flex items-center justify-center gap-1">
            {team.isPlayoffSpot && <Trophy className="w-3 h-3 text-rink-500" />}
            {team.rank}
          </span>
        );
      case 'team':
        return (
          <div className="flex items-center gap-2">
            {team.logoUrl && (
              <img src={team.logoUrl} alt="" className="w-6 h-6 rounded" />
            )}
            <span className="font-medium">{team.teamName}</span>
          </div>
        );
      case 'gp':
        return team.gamesPlayed;
      case 'w':
        return team.wins;
      case 'l':
        return team.losses;
      case 't':
        return team.ties;
      case 'pts':
        return <span className="font-bold text-rink-500">{team.points}</span>;
      case 'gf':
        return team.goalsFor;
      case 'ga':
        return team.goalsAgainst;
      case 'diff':
        return (
          <span
            className={cn(
              team.goalDiff > 0 && 'text-green-400',
              team.goalDiff < 0 && 'text-red-400'
            )}
          >
            {team.goalDiff > 0 ? '+' : ''}
            {team.goalDiff}
          </span>
        );
      case 'home':
        return team.homeRecord;
      case 'away':
        return team.awayRecord;
      default:
        return null;
    }
  };

  if (standings.length === 0) {
    return (
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
        <p className="text-neutral-400">No standings data available yet.</p>
        <p className="text-sm text-neutral-500 mt-1">
          Standings will appear once games are completed.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-800/50">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-3 text-xs font-medium text-neutral-400 uppercase',
                    col.align === 'left' && 'text-left',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.sortable && 'cursor-pointer hover:text-white transition-colors'
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                  title={col.label}
                >
                  <div className="flex items-center justify-center gap-1">
                    {col.shortLabel}
                    {col.sortable && sortColumn === col.key && (
                      sortDirection === 'desc' ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((team, index) => (
              <tr
                key={team.teamId}
                className={cn(
                  'border-b border-neutral-800 last:border-0 transition-colors',
                  team.isPlayoffSpot && 'bg-rink-500/5',
                  !team.isPlayoffSpot && 'hover:bg-neutral-800/50'
                )}
              >
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 py-3 text-sm',
                      col.align === 'left' && 'text-left',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      col.key === 'team' ? 'text-white' : 'text-neutral-300'
                    )}
                  >
                    {getCellValue(team, col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Playoff Line */}
      {playoffSpots > 0 && playoffSpots < standings.length && (
        <div className="px-4 py-2 bg-rink-500/10 border-t border-rink-500/30 text-xs text-rink-400 text-center">
          <Trophy className="w-3 h-3 inline mr-1" />
          Top {playoffSpots} teams qualify for playoffs
        </div>
      )}
    </div>
  );
}
