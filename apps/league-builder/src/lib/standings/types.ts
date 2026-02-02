/**
 * Standings Types
 *
 * Types for standings calculation, configuration, and display.
 */

// ============================================================================
// STANDINGS DATA
// ============================================================================

export interface TeamStanding {
  teamId: string;
  teamName: string;
  shortName: string;
  logoUrl: string | null;
  divisionId: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  homeRecord: string;
  awayRecord: string;
  rank: number;
  isPlayoffSpot: boolean;
}

export interface DivisionStandings {
  divisionId: string;
  divisionName: string;
  teams: TeamStanding[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface StandingsConfig {
  id: string;
  leagueId: string;
  seasonId: string;

  // Points System
  pointsWin: number;
  pointsLoss: number;
  pointsTie: number;

  // Tiebreakers
  tiebreakers: TiebreakerType[];

  // Playoff Configuration
  playoffTeamsPerDivision: number;
  playoffTeamsTotal: number;
  useDivisionPlayoffs: boolean;

  // Display Settings
  showGoalDiff: boolean;
  showStreak: boolean;
  showLast10: boolean;
  showHomeAwaySplit: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type TiebreakerType =
  | 'head_to_head'
  | 'goal_diff'
  | 'goals_for'
  | 'goals_against'
  | 'wins';

export const TIEBREAKER_LABELS: Record<TiebreakerType, string> = {
  head_to_head: 'Head-to-Head Record',
  goal_diff: 'Goal Differential',
  goals_for: 'Goals For',
  goals_against: 'Goals Against (fewer is better)',
  wins: 'Total Wins',
};

// ============================================================================
// TABLE COLUMN CONFIGURATION
// ============================================================================

export type StandingsColumn =
  | 'rank'
  | 'team'
  | 'gp'
  | 'w'
  | 'l'
  | 't'
  | 'pts'
  | 'gf'
  | 'ga'
  | 'diff'
  | 'home'
  | 'away';

export interface ColumnConfig {
  key: StandingsColumn;
  label: string;
  shortLabel: string;
  sortable: boolean;
  align: 'left' | 'center' | 'right';
  width?: string;
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
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
// EXPORT OPTIONS
// ============================================================================

export type ExportFormat = 'csv' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeConfig: boolean;
  columns: StandingsColumn[];
}
