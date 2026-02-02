/**
 * Schedule Generation Types
 *
 * Types for the schedule generation algorithm, constraints, and configuration.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface Team {
  id: string;
  name: string;
  shortName: string;
  divisionId: string | null;
  homeVenueId: string | null;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  numberOfRinks: number;
}

export interface TimeSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
  venueId: string;
}

export interface GameMatchup {
  roundNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam?: Team;
  awayTeam?: Team;
}

export interface ScheduledGame extends GameMatchup {
  id?: string;
  scheduledAt: Date;
  location: string;
  venueId: string | null;
  gameNumber: number;
}

// ============================================================================
// SCHEDULE CONFIGURATION
// ============================================================================

export type ScheduleType = 'round_robin' | 'double_round_robin' | 'custom';

export interface ScheduleConfig {
  scheduleType: ScheduleType;
  gamesPerTeam: number;
  allowBackToBack: boolean;
  homeAwayBalance: boolean;
  divisionGamesRatio: number; // 0-1, ratio of intra-division games

  // Time slots
  gameDays: number[]; // 0-6 (Sunday-Saturday)
  gameTimes: string[]; // HH:mm format
  gameDurationMinutes: number;

  // Date range
  startDate: Date;
  endDate: Date;

  // Venue settings
  defaultVenueId: string | null;
  rotateHomeVenue: boolean;
}

export interface ScheduleTemplate extends ScheduleConfig {
  id: string;
  leagueId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CONSTRAINTS
// ============================================================================

export type ConstraintType =
  | 'venue_blackout'
  | 'team_blackout'
  | 'venue_preference'
  | 'time_preference'
  | 'matchup_constraint'
  | 'division_constraint';

export interface ScheduleConstraint {
  id: string;
  seasonId: string;
  leagueId: string;
  constraintType: ConstraintType;

  // References
  teamId: string | null;
  venueId: string | null;
  opponentTeamId: string | null;

  // Date/Time
  startDate: Date | null;
  endDate: Date | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;

  // Priority
  priority: number; // 1-10, 10 = must enforce
  isHardConstraint: boolean;
  notes: string | null;
}

export interface BlackoutPeriod {
  startDate: Date;
  endDate: Date;
  teamId?: string;
  venueId?: string;
  reason?: string;
}

// ============================================================================
// GENERATION RESULTS
// ============================================================================

export interface ConstraintViolation {
  constraintId: string;
  constraintType: ConstraintType;
  gameIndex: number;
  message: string;
  severity: 'warning' | 'error';
}

export interface ScheduleGenerationResult {
  success: boolean;
  games: ScheduledGame[];

  // Log reference (set by action, not generator)
  logId?: string;

  // Statistics
  totalGames: number;
  gamesPerTeam: Record<string, number>;
  homeGamesPerTeam: Record<string, number>;
  awayGamesPerTeam: Record<string, number>;

  // Constraint handling
  constraintViolations: ConstraintViolation[];
  hardConstraintFailures: ConstraintViolation[];

  // Timing
  durationMs: number;

  // Error info
  error?: string;
  errorDetails?: Record<string, unknown>;
}

export interface GenerationLog {
  id: string;
  seasonId: string;
  leagueId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  templateId: string | null;
  algorithmType: string;
  teamCount: number;
  gamesGenerated: number;
  constraintViolations: ConstraintViolation[];
  hardConstraintFailures: ConstraintViolation[];
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
  generatedBy: string;
  createdAt: Date;
}

// ============================================================================
// ALGORITHM OPTIONS
// ============================================================================

export interface ScheduleGenerationOptions {
  seasonId: string;
  leagueId: string;
  teams: Team[];
  config: ScheduleConfig;
  constraints: ScheduleConstraint[];
  venues: Venue[];

  // Generation options
  maxIterations?: number;
  relaxConstraintsOnFailure?: boolean;
  preferredStartDate?: Date;
}

// ============================================================================
// RESCHEDULE
// ============================================================================

export interface RescheduleRequest {
  gameId: string;
  newScheduledAt: Date;
  newVenueId?: string;
  reason: string;
}

export interface RescheduleResult {
  success: boolean;
  game: ScheduledGame | null;
  conflictingGames: ScheduledGame[];
  constraintViolations: ConstraintViolation[];
  error?: string;
}
