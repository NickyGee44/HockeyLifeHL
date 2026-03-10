import {
  addDaysToDateKey,
  getDateKeyInTimeZone,
  getDayOfWeekInTimeZone,
  getTimeStringInTimeZone,
  resolveScheduleTimeZone,
} from '@/lib/schedule/timezone';

export type StaffingAvailabilityType = 'available' | 'preferred' | 'unavailable';

export type StaffingAvailabilityWindow = {
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  availabilityType: StaffingAvailabilityType;
  isRecurring?: boolean;
  specificDate?: string | null;
  notes?: string | null;
};

export type StaffingCandidate = {
  assignmentKey: string;
  displayName: string;
  totalAssignments: number;
  maxAssignmentsPerWeek?: number | null;
  preferredDays?: number[] | null;
  availabilityWindows: StaffingAvailabilityWindow[];
};

export type StaffingAssignment = {
  gameId: string;
  assignmentKey: string;
  scheduledAt: string;
};

export type StaffingStrategy = 'round_robin' | 'least_assigned' | 'availability_based';

export type CandidateSelectionResult =
  | { candidate: StaffingCandidate; availabilityScore: number; weeklyAssignments: number }
  | { candidate: null; reason: string };

const DEFAULT_ASSIGNMENT_BLOCK_MINUTES = 150;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function parseTimeValue(timeValue: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
  if (!match) {
    return 0;
  }

  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return hours * 60 + minutes;
}

function getWeekKey(dateIso: string, timeZone: string): string {
  const date = new Date(dateIso);
  const dateKey = getDateKeyInTimeZone(date, timeZone);
  const dayOfWeek = getDayOfWeekInTimeZone(date, timeZone);
  const daysFromMonday = (dayOfWeek + 6) % 7;
  return addDaysToDateKey(dateKey, -daysFromMonday);
}

function windowsCoverMinute(
  gameMinutes: number,
  startMinutes: number,
  endMinutes: number
): boolean {
  if (startMinutes === endMinutes) {
    return true;
  }

  if (endMinutes > startMinutes) {
    return gameMinutes >= startMinutes && gameMinutes < endMinutes;
  }

  return gameMinutes >= startMinutes || gameMinutes < endMinutes;
}

function getAvailabilityScore(
  candidate: StaffingCandidate,
  scheduledAt: string,
  timeZone: string
): number {
  const gameDate = new Date(scheduledAt);
  const gameDateKey = getDateKeyInTimeZone(gameDate, timeZone);
  const gameDayOfWeek = getDayOfWeekInTimeZone(gameDate, timeZone);
  const gameMinutes = parseTimeValue(getTimeStringInTimeZone(gameDate, timeZone));
  const windows = candidate.availabilityWindows || [];

  if (windows.length === 0) {
    if (candidate.preferredDays?.includes(gameDayOfWeek)) {
      return 1;
    }
    return 0;
  }

  const matchingWindows = windows.filter((window) => {
    if (window.specificDate && window.specificDate !== gameDateKey) {
      return false;
    }

    if (!window.specificDate && window.dayOfWeek !== null && window.dayOfWeek !== gameDayOfWeek) {
      return false;
    }

    return windowsCoverMinute(
      gameMinutes,
      parseTimeValue(window.startTime),
      parseTimeValue(window.endTime)
    );
  });

  if (matchingWindows.some((window) => window.availabilityType === 'unavailable')) {
    return -1;
  }

  if (matchingWindows.some((window) => window.availabilityType === 'preferred')) {
    return 2;
  }

  if (matchingWindows.some((window) => window.availabilityType === 'available')) {
    return 1;
  }

  return -1;
}

function countAssignmentsInWeek(
  assignments: StaffingAssignment[],
  assignmentKey: string,
  scheduledAt: string,
  timeZone: string
): number {
  const gameWeekKey = getWeekKey(scheduledAt, timeZone);

  return assignments.filter((assignment) => {
    return (
      assignment.assignmentKey === assignmentKey &&
      getWeekKey(assignment.scheduledAt, timeZone) === gameWeekKey
    );
  }).length;
}

function hasAssignmentConflict(
  assignments: StaffingAssignment[],
  assignmentKey: string,
  scheduledAt: string,
  assignmentBlockMinutes: number
): boolean {
  const gameTime = new Date(scheduledAt).getTime();
  const bufferMs = assignmentBlockMinutes * 60 * 1000;

  return assignments.some((assignment) => {
    if (assignment.assignmentKey !== assignmentKey) {
      return false;
    }

    const assignmentTime = new Date(assignment.scheduledAt).getTime();
    return Math.abs(assignmentTime - gameTime) < bufferMs;
  });
}

export function getEligibleCandidatesForGame(params: {
  candidates: StaffingCandidate[];
  scheduledAt: string;
  existingAssignments: StaffingAssignment[];
  timeZone?: string | null;
  assignmentBlockMinutes?: number;
}): Array<{
  candidate: StaffingCandidate;
  availabilityScore: number;
  weeklyAssignments: number;
}> {
  const timeZone = resolveScheduleTimeZone(params.timeZone);
  const assignmentBlockMinutes = params.assignmentBlockMinutes ?? DEFAULT_ASSIGNMENT_BLOCK_MINUTES;

  return params.candidates.flatMap((candidate) => {
    const availabilityScore = getAvailabilityScore(candidate, params.scheduledAt, timeZone);
    if (availabilityScore < 0) {
      return [];
    }

    if (
      hasAssignmentConflict(
        params.existingAssignments,
        candidate.assignmentKey,
        params.scheduledAt,
        assignmentBlockMinutes
      )
    ) {
      return [];
    }

    const weeklyAssignments = countAssignmentsInWeek(
      params.existingAssignments,
      candidate.assignmentKey,
      params.scheduledAt,
      timeZone
    );

    if (
      candidate.maxAssignmentsPerWeek &&
      candidate.maxAssignmentsPerWeek > 0 &&
      weeklyAssignments >= candidate.maxAssignmentsPerWeek
    ) {
      return [];
    }

    return [{ candidate, availabilityScore, weeklyAssignments }];
  });
}

export function selectBestCandidateForGame(params: {
  candidates: StaffingCandidate[];
  scheduledAt: string;
  existingAssignments: StaffingAssignment[];
  strategy: StaffingStrategy;
  timeZone?: string | null;
  assignmentBlockMinutes?: number;
}): CandidateSelectionResult {
  const eligibleCandidates = getEligibleCandidatesForGame(params);
  if (eligibleCandidates.length === 0) {
    return { candidate: null, reason: 'No available staff member matched this game slot.' };
  }

  const sorted = [...eligibleCandidates].sort((left, right) => {
    switch (params.strategy) {
      case 'availability_based':
        return (
          right.availabilityScore - left.availabilityScore ||
          left.weeklyAssignments - right.weeklyAssignments ||
          left.candidate.totalAssignments - right.candidate.totalAssignments ||
          left.candidate.displayName.localeCompare(right.candidate.displayName)
        );
      case 'least_assigned':
        return (
          left.candidate.totalAssignments - right.candidate.totalAssignments ||
          left.weeklyAssignments - right.weeklyAssignments ||
          right.availabilityScore - left.availabilityScore ||
          left.candidate.displayName.localeCompare(right.candidate.displayName)
        );
      case 'round_robin':
      default:
        return (
          left.weeklyAssignments - right.weeklyAssignments ||
          left.candidate.totalAssignments - right.candidate.totalAssignments ||
          right.availabilityScore - left.availabilityScore ||
          left.candidate.displayName.localeCompare(right.candidate.displayName)
        );
    }
  });

  return sorted[0];
}

export function normalizeTimeString(timeValue: string): string {
  const totalMinutes = parseTimeValue(timeValue);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

