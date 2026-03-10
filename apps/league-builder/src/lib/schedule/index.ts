/**
 * Schedule Generation Module
 *
 * Exports all schedule generation functionality.
 */

import {
  applyByeWeeks,
  generateDivisionAwareMatchups,
  generateRoundRobinMatchups,
  generateSchedule,
  generateScheduleEnhanced,
  rescheduleGame,
} from './generator';

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
  generateDivisionAwareMatchups,
  applyByeWeeks,
  rescheduleGame,
} from './generator';

// Straightforward facade for callers that just need the core generator surface.
export const scheduleGenerator = {
  preview: generateSchedule,
  generate: generateScheduleEnhanced,
  buildRoundRobin: generateRoundRobinMatchups,
  buildDivisionMatchups: generateDivisionAwareMatchups,
  addByeWeeks: applyByeWeeks,
  reschedule: rescheduleGame,
} as const;

// Server actions
export {
  getStandardHolidayDatesInRange,
  getStandardHolidayGroupsInRange,
  STANDARD_HOLIDAYS,
  toLocalDateString,
} from './holidays';

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
  addStandardHolidayBlackouts,
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
