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
  seniorityLevel?: number;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  numberOfRinks: number;
}

// ============================================================================
// VENUE AVAILABILITY & BLACKOUTS
// ============================================================================

export interface VenueAvailability {
  id: string;
  leagueId: string;
  venueId: string;
  seasonId: string | null;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm
  endTime: string;
  isAvailable: boolean;
  maxGames: number | null;
  notes: string | null;
}

export interface VenueBlackoutDate {
  id: string;
  leagueId: string;
  venueId: string;
  blackoutDate: Date;
  startTime: string | null; // null = entire day
  endTime: string | null;
  reason: string | null;
}

// ============================================================================
// TEAM SCHEDULE PREFERENCES
// ============================================================================

export interface TeamSchedulePreference {
  id: string;
  leagueId: string;
  teamId: string;
  seasonId: string | null;
  homeVenueId: string | null;
  seniorityLevel: number; // 1-10, higher = more priority
  preferredGameTimes: string[]; // ["19:00", "20:30"]
  avoidedGameTimes: string[]; // ["22:00"]
  preferredDays: number[]; // [1, 3, 5]
  avoidedDays: number[]; // [0, 6]
  maxLateNightGames: number | null;
  maxEarlyMorningGames: number | null;
  weekendPreference: number; // 0-1, 0.5 = no preference
  minHoursBetweenGames: number;
  notes: string | null;
}

// ============================================================================
// CONSTRAINT CONFIGURATION
// ============================================================================

export type TimeSlotCategory = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_night';

export interface ScheduleConstraintConfig {
  id: string;
  leagueId: string;
  seasonId: string;

  // Venue constraints
  maxGamesPerVenuePerDay: number;
  enforceHomeVenueAssignments: boolean;

  // Time slot definitions
  earlyMorningEndTime: string; // HH:mm
  lateNightStartTime: string;

  // Global limits
  globalMaxLateNightGamesPerTeam: number | null;
  globalMaxEarlyMorningGamesPerTeam: number | null;

  // Seniority enforcement
  enforceSeniorityPreferences: boolean;
  seniorityWeight: number; // 0-1

  // Weekend distribution
  targetWeekendGamePercentage: number;
  weekendTolerancePercentage: number;

  // New team handling
  newTeamPenaltyWeeks: number;
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
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
}

// ============================================================================
// SCHEDULE CONFIGURATION
// ============================================================================

export type ScheduleType = 'round_robin' | 'double_round_robin' | 'custom';

export type PlayoffFormat = 'none' | 'single_elimination' | 'best_of_3' | 'best_of_5';

export interface ScheduleConfig {
  scheduleType: ScheduleType;
  gamesPerTeam: number;
  allowBackToBack: boolean;
  homeAwayBalance: boolean;
  divisionGamesRatio: number; // 0-1, ratio of intra-division games

  // Division-aware scheduling
  divisionAware: boolean; // Generate separate intra-division round-robins
  crossDivisionGamesPerTeam: number; // Number of cross-division games per team (0-10)

  // Time slots
  gameDays: number[]; // 0-6 (Sunday-Saturday)
  gameTimes: string[]; // HH:mm format
  gameDurationMinutes: number;

  // Date range
  startDate: Date;
  endDate: Date;

  // Bye week settings
  allowByeWeeks: boolean;
  byeWeeksPerTeam: number; // 1-4 rest weeks distributed evenly across the season

  // Venue settings
  defaultVenueId: string | null;
  rotateHomeVenue: boolean;

  // Playoff settings
  playoffFormat: PlayoffFormat;
  playoffTeams: number; // Number of teams that make playoffs (4, 6, 8, etc.)
  playoffQualificationMode: 'count' | 'percentage'; // How playoff spots are determined
  playoffPercentage: number; // Top X% of each division qualifies (10-100, step 5)
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
  | 'division_constraint'
  | 'late_night_limit'
  | 'early_morning_limit'
  | 'weekend_preference'
  | 'seniority_preference';

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

  // Enhanced constraint fields
  maxOccurrences: number | null;
  timeSlotCategory: TimeSlotCategory | null;
  appliesToWeekends: boolean | null;
  appliesToWeekdays: boolean | null;
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
// ADDITIONAL ICE TIME SLOTS
// ============================================================================

export interface AdditionalIceSlot {
  id: string;
  venueId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
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

  // Enhanced constraint options
  constraintConfig?: ScheduleConstraintConfig;
  teamPreferences?: TeamSchedulePreference[];
  venueAvailability?: VenueAvailability[];
  venueBlackouts?: VenueBlackoutDate[];
  additionalIceSlots?: AdditionalIceSlot[];

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
