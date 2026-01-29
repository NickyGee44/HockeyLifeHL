/**
 * Conflict Detection Types
 *
 * Type definitions for the BMHL scheduling conflict detection service.
 * Supports detection of team, venue, scorekeeper, and rule-based conflicts.
 */

export type ConflictType =
  | "team_overlap" // Team has overlapping game
  | "venue_overlap" // Venue double-booked
  | "scorekeeper_overlap" // Scorekeeper double-booked
  | "back_to_back_violation" // Min hours between games violated
  | "max_games_per_week" // Team exceeds max games per week
  | "max_games_per_day" // Team exceeds max games per day
  | "blackout_date" // Game scheduled on blackout date
  | "invalid_time_window"; // Outside preferred scheduling windows

export type ConflictSeverity = "error" | "warning" | "info";

/**
 * Represents a detected scheduling conflict
 */
export interface SchedulingConflict {
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  affectedEntities: {
    teamIds?: string[];
    venueId?: string;
    scorekeeperId?: string;
    gameIds?: string[]; // Games involved in conflict
  };
  suggestion?: string; // How to resolve the conflict
}

/**
 * Schedule rules from database (schedule_rules table)
 */
export interface ScheduleRules {
  id: string;
  leagueId: string;
  seasonId?: string;

  // Game timing
  gameDurationMinutes: number;
  bufferMinutes: number;

  // Team scheduling rules
  minHoursBetweenGames: number;
  maxGamesPerWeek: number;
  maxGamesPerDay: number;

  // Venue rules
  allowedVenueIds?: string[];

  // Blackout dates
  blackoutDates: Array<{
    date: string; // ISO date string
    reason: string;
  }>;

  // Preferred scheduling windows
  preferredStartTimes: Array<{
    day: string; // "monday", "tuesday", etc.
    start: string; // "18:00"
    end: string; // "22:00"
  }>;
}

/**
 * Game data for conflict checking
 */
export interface GameForConflictCheck {
  id?: string; // undefined for new games
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scorekeeperId?: string;
  scheduledAt: Date;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  leagueId: string;
  seasonId?: string;
  divisionId?: string;
}

/**
 * Result of conflict detection check
 */
export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: SchedulingConflict[];

  // Metadata
  checkedAt: Date;
  gameId?: string;

  // Summary counts
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * Bulk conflict check for multiple games
 */
export interface BulkConflictCheckResult {
  results: Map<string, ConflictCheckResult>; // gameId -> result
  totalConflicts: number;
  gamesWithConflicts: string[];
}

/**
 * Team schedule summary (for back-to-back and max games checks)
 */
export interface TeamScheduleSummary {
  teamId: string;
  games: Array<{
    id: string;
    scheduledAt: Date;
    opponentId: string;
    isHome: boolean;
  }>;
}

/**
 * Venue availability window
 */
export interface VenueAvailability {
  venueId: string;
  bookedWindows: Array<{
    gameId: string;
    start: Date;
    end: Date;
  }>;
}

/**
 * Scorekeeper availability window
 */
export interface ScorekeeperAvailability {
  scorekeeperId: string;
  bookedWindows: Array<{
    gameId: string;
    start: Date;
    end: Date;
  }>;
}
