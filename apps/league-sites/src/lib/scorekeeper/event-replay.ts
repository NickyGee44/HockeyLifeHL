import { PenaltyTracker } from './penalty-tracker';

export interface ReplayableGameEvent {
  id: string;
  eventType: string;
  teamType: 'home' | 'away';
  playerId?: string | null;
  period: number;
  gameTimeSeconds: number | null;
  penaltyMinutes?: number | null;
  penaltyType?: string | null;
  deletedAt?: string | null;
  createdAt?: string | null;
}

function normalizedClockValue(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizedCreatedAt(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compareEventsChronologically(
  a: ReplayableGameEvent,
  b: ReplayableGameEvent
): number {
  if (a.period !== b.period) return a.period - b.period;

  const aClock = normalizedClockValue(a.gameTimeSeconds);
  const bClock = normalizedClockValue(b.gameTimeSeconds);
  if (aClock !== bClock) {
    // Game clock counts down, so the larger value happened earlier.
    return bClock - aClock;
  }

  return normalizedCreatedAt(a.createdAt) - normalizedCreatedAt(b.createdAt);
}

export function compareEventsReverseChronological(
  a: ReplayableGameEvent,
  b: ReplayableGameEvent
): number {
  return compareEventsChronologically(b, a);
}

export function buildPenaltyTrackerFromEvents(
  events: ReplayableGameEvent[],
  periodLengthMinutes: number
): PenaltyTracker {
  const tracker = new PenaltyTracker(periodLengthMinutes);
  const orderedEvents = [...events]
    .filter((event) => !event.deletedAt)
    .sort(compareEventsChronologically);

  for (const event of orderedEvents) {
    const eventClock = normalizedClockValue(event.gameTimeSeconds);

    if (event.eventType === 'penalty') {
      tracker.addPenalty({
        eventId: event.id,
        teamType: event.teamType,
        playerId: event.playerId ?? 'unknown',
        penaltyMinutes: event.penaltyMinutes ?? 2,
        gameTimeSeconds: eventClock,
        period: event.period,
        penaltyType: event.penaltyType ?? undefined,
      });
      continue;
    }

    if (event.eventType !== 'goal') {
      continue;
    }

    if (!tracker.isPowerPlay(event.teamType, eventClock, event.period)) {
      continue;
    }

    const penalizedTeam = event.teamType === 'home' ? 'away' : 'home';
    tracker.expireEarliestMinor(penalizedTeam, eventClock, event.period);
  }

  return tracker;
}

export function getShotsForTeam(
  events: ReplayableGameEvent[],
  teamType: 'home' | 'away'
): number {
  let total = 0;

  for (const event of events) {
    if (event.deletedAt) continue;

    if (event.eventType === 'goal' && event.teamType === teamType) {
      total += 1;
      continue;
    }

    if (event.eventType !== 'save') continue;

    const shootingTeam = event.teamType === 'home' ? 'away' : 'home';
    if (shootingTeam === teamType) {
      total += 1;
    }
  }

  return total;
}
