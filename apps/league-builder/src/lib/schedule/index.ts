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
} from './types';

// Generator functions
export {
  generateSchedule,
  generateRoundRobinMatchups,
  rescheduleGame,
} from './generator';

// Server actions
export {
  // Templates
  getScheduleTemplates,
  createScheduleTemplate,
  // Constraints
  getScheduleConstraints,
  addScheduleConstraint,
  deleteScheduleConstraint,
  // Generation
  generateSeasonSchedule,
  saveScheduleGames,
  // Reschedule
  rescheduleGameAction,
  cancelGame,
  // Data
  getGenerationLogs,
} from './actions';
