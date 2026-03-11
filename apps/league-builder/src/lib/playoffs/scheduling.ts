export interface PlayoffSchedulingVenue {
  id: string;
  name: string;
  numberOfRinks?: number | null;
}

export interface PlayoffSchedulingAvailability {
  venueId: string;
  dayOfWeek: number;
  startTime: string;
  isAvailable: boolean;
  maxGames?: number | null;
}

export interface PlayoffSchedulingBlackout {
  venueId: string;
  blackoutDate: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface ExistingScheduledPlayoffGame {
  scheduledAt: string;
  location: string | null;
  status?: string | null;
}

export interface PlayoffSchedulingSeries {
  id: string;
}

export interface PlayoffSchedulingSlot {
  venueId: string;
  location: string;
  scheduledAt: string;
}

export interface PlayoffSchedulingAssignment {
  seriesId: string;
  venueId: string;
  location: string;
  scheduledAt: string;
}

function toIsoSlot(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function getDateOnly(value: Date) {
  return value.toISOString().split('T')[0];
}

function isBlackoutMatch(
  blackout: PlayoffSchedulingBlackout,
  venueId: string,
  date: string,
  time: string,
) {
  if (blackout.venueId !== venueId) {
    return false;
  }

  if (blackout.blackoutDate !== date) {
    return false;
  }

  if (!blackout.startTime || !blackout.endTime) {
    return true;
  }

  return time >= blackout.startTime && time <= blackout.endTime;
}

export function buildPlayoffSchedulingSlots(input: {
  venues: PlayoffSchedulingVenue[];
  availability: PlayoffSchedulingAvailability[];
  blackouts: PlayoffSchedulingBlackout[];
  existingGames: ExistingScheduledPlayoffGame[];
  startDate: string;
  endDate: string;
}): PlayoffSchedulingSlot[] {
  const slots: PlayoffSchedulingSlot[] = [];
  const venueById = new Map(input.venues.map((venue) => [venue.id, venue]));
  const occupancyBySlotKey = new Map<string, number>();

  for (const game of input.existingGames) {
    if (!game.location || game.status === 'cancelled') {
      continue;
    }

    const key = `${game.location}|${game.scheduledAt}`;
    occupancyBySlotKey.set(key, (occupancyBySlotKey.get(key) ?? 0) + 1);
  }

  const cursor = new Date(`${input.startDate}T00:00:00`);
  const end = new Date(`${input.endDate}T00:00:00`);

  while (cursor <= end) {
    const date = getDateOnly(cursor);
    const dayOfWeek = cursor.getDay();

    for (const row of input.availability) {
      if (!row.isAvailable || row.dayOfWeek !== dayOfWeek) {
        continue;
      }

      const venue = venueById.get(row.venueId);
      if (!venue) {
        continue;
      }

      if (
        input.blackouts.some((blackout) =>
          isBlackoutMatch(blackout, row.venueId, date, row.startTime),
        )
      ) {
        continue;
      }

      const scheduledAt = toIsoSlot(date, row.startTime);
      const slotKey = `${venue.name}|${scheduledAt}`;
      const existingCount = occupancyBySlotKey.get(slotKey) ?? 0;
      const capacity = Math.max(1, row.maxGames ?? venue.numberOfRinks ?? 1);
      const remaining = capacity - existingCount;

      for (let idx = 0; idx < remaining; idx += 1) {
        slots.push({
          venueId: row.venueId,
          location: venue.name,
          scheduledAt,
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  slots.sort((left, right) => {
    const timeDelta = new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
    if (timeDelta !== 0) {
      return timeDelta;
    }

    return left.location.localeCompare(right.location);
  });

  return slots;
}

export function assignPlayoffSeriesToSlots(
  series: PlayoffSchedulingSeries[],
  slots: PlayoffSchedulingSlot[],
): {
  assignments: PlayoffSchedulingAssignment[];
  unscheduledSeriesIds: string[];
} {
  const assignments: PlayoffSchedulingAssignment[] = [];

  series.forEach((entry, index) => {
    const slot = slots[index];
    if (!slot) {
      return;
    }

    assignments.push({
      seriesId: entry.id,
      venueId: slot.venueId,
      location: slot.location,
      scheduledAt: slot.scheduledAt,
    });
  });

  const assignedIds = new Set(assignments.map((entry) => entry.seriesId));

  return {
    assignments,
    unscheduledSeriesIds: series
      .filter((entry) => !assignedIds.has(entry.id))
      .map((entry) => entry.id),
  };
}
