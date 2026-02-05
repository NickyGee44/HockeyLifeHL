/**
 * Schedule Generation Module
 *
 * Exports all schedule generation functionality.
 */

// Types
export type {
  Team,
  Venue,
  TimeSlot,
  GameMatchup,
  ScheduledGame,
  ScheduleType,
  ScheduleConfig,
  ScheduleTemplate,
  ConstraintType,
  ScheduleConstraint,
  BlackoutPeriod,
  ConstraintViolation,
  ScheduleGenerationResult,
  GenerationLog,
  ScheduleGenerationOptions,
  RescheduleRequest,
  RescheduleResult,
  // Enhanced constraint types
  VenueAvailability,
  VenueBlackoutDate,
  TeamSchedulePreference,
  ScheduleConstraintConfig,
  TimeSlotCategory,
} from './types';

// Generator functions
export {
  generateSchedule,
  generateScheduleEnhanced,
  generateRoundRobinMatchups,
  rescheduleGame,
} from './generator';

// Server actions
export {
  // Templates
  getScheduleTemplates,
  createScheduleTemplate,
  // Basic Constraints
  getScheduleConstraints,
  addScheduleConstraint,
  deleteScheduleConstraint,
  // Venue Availability
  getVenueAvailability,
  saveVenueAvailability,
  deleteVenueAvailability,
  // Venue Blackouts
  getVenueBlackoutDates,
  addVenueBlackoutDate,
  deleteVenueBlackoutDate,
  // Team Preferences
  getTeamSchedulePreferences,
  saveTeamSchedulePreference,
  deleteTeamSchedulePreference,
  bulkSaveTeamSchedulePreferences,
  // Constraint Config
  getScheduleConstraintConfig,
  saveScheduleConstraintConfig,
  // Generation
  generateSeasonSchedule,
  saveScheduleGames,
  // Reschedule
  rescheduleGameAction,
  cancelGame,
  // Data
  getGenerationLogs,
} from './actions';
