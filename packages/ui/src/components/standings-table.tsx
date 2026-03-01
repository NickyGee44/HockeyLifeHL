'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { cn } from '../utils';
import { ChevronUp, ChevronDown, Trophy } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface StandingsTeam {
  id: string;
  name: string;
  logoUrl?: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  overtimeLosses?: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
  homeRecord?: string;
  awayRecord?: string;
  rank: number;
  isPlayoffSpot?: boolean;
}

type SortColumn =
  | 'rank'
  | 'team'
  | 'gp'
  | 'w'
  | 'l'
  | 't'
  | 'pts'
  | 'gf'
  | 'ga'
  | 'diff';

type SortDirection = 'asc' | 'desc';

interface ColumnDef {
  key: SortColumn | 'otl' | 'home' | 'away';
  label: string;
  shortLabel: string;
  sortable: boolean;
  align: 'left' | 'center';
  width?: string;
  hiddenOnMobile?: boolean;
}

export interface StandingsTableProps {
  standings: StandingsTeam[];
  variant?: 'admin' | 'public';
  playoffSpots?: number;
  showHomeAway?: boolean;
  showOvertimeLosses?: boolean;
  searchTerm?: string;
  className?: string;
  /** Render a custom logo element (e.g. next/image). If not provided, uses <img>. */
  renderLogo?: (team: StandingsTeam) => React.ReactNode;
  /** Custom empty state message */
  emptyMessage?: string;
}

// ============================================================================
// COLUMN CONFIG
// ============================================================================

function buildColumns(opts: {
  showHomeAway: boolean;
  showOtl: boolean;
}): ColumnDef[] {
  const cols: ColumnDef[] = [
    { key: 'rank', label: 'Rank', shortLabel: '#', sortable: false, align: 'center', width: '40px' },
    { key: 'team', label: 'Team', shortLabel: 'Team', sortable: true, align: 'left' },
    { key: 'gp', label: 'Games Played', shortLabel: 'GP', sortable: true, align: 'center', width: '52px' },
    { key: 'w', label: 'Wins', shortLabel: 'W', sortable: true, align: 'center', width: '44px' },
    { key: 'l', label: 'Losses', shortLabel: 'L', sortable: true, align: 'center', width: '44px' },
    { key: 't', label: 'Ties', shortLabel: 'T', sortable: true, align: 'center', width: '44px', hiddenOnMobile: true },
  ];

  if (opts.showOtl) {
    cols.push({ key: 'otl', label: 'OT Losses', shortLabel: 'OTL', sortable: true, align: 'center', width: '48px', hiddenOnMobile: true });
  }

  cols.push(
    { key: 'pts', label: 'Points', shortLabel: 'PTS', sortable: true, align: 'center', width: '52px' },
    { key: 'gf', label: 'Goals For', shortLabel: 'GF', sortable: true, align: 'center', width: '64px', hiddenOnMobile: true },
    { key: 'ga', label: 'Goals Against', shortLabel: 'GA', sortable: true, align: 'center', width: '64px', hiddenOnMobile: true },
    { key: 'diff', label: 'Goal Diff', shortLabel: 'DIFF', sortable: true, align: 'center', width: '64px', hiddenOnMobile: true },
  );

  if (opts.showHomeAway) {
    cols.push(
      { key: 'home', label: 'Home Record', shortLabel: 'HOME', sortable: false, align: 'center', width: '80px' },
      { key: 'away', label: 'Away Record', shortLabel: 'AWAY', sortable: false, align: 'center', width: '80px' },
    );
  }

  return cols;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StandingsTable({
  standings,
  variant = 'admin',
  playoffSpots = 0,
  showHomeAway = false,
  showOvertimeLosses = false,
  searchTerm = '',
  className,
  renderLogo,
  emptyMessage,
}: StandingsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('pts');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const isAdmin = variant === 'admin';
  const isPublic = variant === 'public';

  const columns = useMemo(
    () => buildColumns({ showHomeAway, showOtl: showOvertimeLosses }),
    [showHomeAway, showOvertimeLosses],
  );

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return standings;
    const term = searchTerm.toLowerCase().trim();
    return standings.filter((t) => t.name.toLowerCase().includes(term));
  }, [standings, searchTerm]);

  // Sort (admin variant only)
  const sorted = useMemo(() => {
    if (!isAdmin) return filtered;

    const arr = [...filtered];
    arr.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortColumn) {
        case 'team': aVal = a.name; bVal = b.name; break;
        case 'gp': aVal = a.gamesPlayed; bVal = b.gamesPlayed; break;
        case 'w': aVal = a.wins; bVal = b.wins; break;
        case 'l': aVal = a.losses; bVal = b.losses; break;
        case 't': aVal = a.ties; bVal = b.ties; break;
        case 'pts': aVal = a.points; bVal = b.points; break;
        case 'gf': aVal = a.goalsFor; bVal = b.goalsFor; break;
        case 'ga': aVal = a.goalsAgainst; bVal = b.goalsAgainst; break;
        case 'diff': aVal = a.goalDifferential; bVal = b.goalDifferential; break;
        default: aVal = a.rank; bVal = b.rank;
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal as string);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return arr;
  }, [filtered, sortColumn, sortDirection, isAdmin]);

  const handleSort = (key: string) => {
    if (!isAdmin) return;
    const col = key as SortColumn;
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
  };

  const getCellValue = (team: StandingsTeam, key: string): React.ReactNode => {
    switch (key) {
      case 'rank': {
        if (isAdmin && team.isPlayoffSpot) {
          return (
            <span className="flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-rink-500" />
              {team.rank}
            </span>
          );
        }
        return team.rank;
      }
      case 'team': {
        const logo = renderLogo
          ? renderLogo(team)
          : team.logoUrl
            ? <img src={team.logoUrl} alt="" className="w-8 h-8 rounded" />
            : isPublic
              ? (
                <div
                  className="w-10 h-10 rounded flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--league-primary)',
                    color: 'var(--color-accent-text)',
                  }}
                >
                  {team.name.charAt(0)}
                </div>
              )
              : null;

        return (
          <div className="flex items-center gap-2 min-w-0">
            {logo}
            <span className="font-medium truncate">{team.name}</span>
          </div>
        );
      }
      case 'gp': return team.gamesPlayed;
      case 'w': return team.wins;
      case 'l': return team.losses;
      case 't': return team.ties;
      case 'otl': return team.overtimeLosses ?? 0;
      case 'pts':
        return isAdmin
          ? <span className="font-bold text-rink-500">{team.points}</span>
          : <span className="font-bold">{team.points}</span>;
      case 'gf': return team.goalsFor;
      case 'ga': return team.goalsAgainst;
      case 'diff': {
        const diff = team.goalDifferential;
        return (
          <span className={cn(diff > 0 && 'text-green-500', diff < 0 && 'text-red-500')}>
            {diff > 0 ? '+' : ''}{diff}
          </span>
        );
      }
      case 'home': return team.homeRecord ?? '-';
      case 'away': return team.awayRecord ?? '-';
      default: return null;
    }
  };

  if (standings.length === 0) {
    return (
      <div className={cn(
        'rounded-xl border p-8 text-center',
        isAdmin && 'bg-neutral-900 border-neutral-800',
        className,
      )}>
        <p className={isAdmin ? 'text-neutral-400' : 'text-[var(--color-text-muted)]'}>
          {emptyMessage ?? 'No standings data available yet.'}
        </p>
      </div>
    );
  }

  // Determine search highlight for public variant
  const normalizedSearch = isPublic ? searchTerm.toLowerCase().trim() : '';

  return (
    <div className={cn(
      isAdmin && 'bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden',
      className,
    )}>
      <div className="overflow-x-auto">
        <table className={cn('w-full', isPublic && 'standings-table')}>
          <thead>
            <tr className={isAdmin ? 'border-b border-neutral-800 bg-neutral-800/50' : ''}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-3 text-xs font-medium uppercase',
                    isAdmin && 'text-neutral-400',
                    col.align === 'left' ? 'text-left' : 'text-center',
                    col.sortable && isAdmin && 'cursor-pointer hover:text-white transition-colors',
                    col.hiddenOnMobile && isPublic && 'hidden md:table-cell',
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                  title={col.label}
                >
                  {isAdmin ? (
                    <div className="flex items-center justify-center gap-1">
                      {col.shortLabel}
                      {col.sortable && sortColumn === col.key && (
                        sortDirection === 'desc'
                          ? <ChevronDown className="w-3 h-3" />
                          : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  ) : (
                    col.shortLabel
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((team) => {
              const isHighlighted = isPublic && normalizedSearch && team.name.toLowerCase().includes(normalizedSearch);

              return (
                <tr
                  key={team.id}
                  className={cn(
                    isAdmin && 'border-b border-neutral-800 last:border-0 transition-colors',
                    isAdmin && team.isPlayoffSpot && 'bg-rink-500/5',
                    isAdmin && !team.isPlayoffSpot && 'hover:bg-neutral-800/50',
                    isPublic && isHighlighted && 'bg-[var(--league-primary)]/10 border-l-2 border-l-[var(--league-primary)]',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 py-3 text-sm',
                        col.align === 'left' ? 'text-left' : 'text-center',
                        isAdmin && (col.key === 'team' ? 'text-white' : 'text-neutral-300'),
                        isAdmin && col.key === 'rank' && 'text-center',
                        col.hiddenOnMobile && isPublic && 'hidden md:table-cell',
                        isPublic && col.key === 'rank' && 'font-medium text-[var(--color-text-muted)]',
                      )}
                    >
                      {getCellValue(team, col.key)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Playoff Line (admin variant) */}
      {isAdmin && playoffSpots > 0 && playoffSpots < standings.length && (
        <div className="px-4 py-2 bg-rink-500/10 border-t border-rink-500/30 text-xs text-rink-400 text-center">
          <Trophy className="w-3 h-3 inline mr-1" />
          Top {playoffSpots} teams qualify for playoffs
        </div>
      )}
    </div>
  );
}
