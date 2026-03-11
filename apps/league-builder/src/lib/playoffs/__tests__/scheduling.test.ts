import {
  assignPlayoffSeriesToSlots,
  buildPlayoffSchedulingSlots,
} from '../scheduling';

describe('playoff scheduling helpers', () => {
  it('builds available slots from weekly venue availability and respects blackout dates', () => {
    const slots = buildPlayoffSchedulingSlots({
      venues: [
        { id: 'venue-1', name: 'East Rink', numberOfRinks: 1 },
        { id: 'venue-2', name: 'West Rink', numberOfRinks: 1 },
      ],
      availability: [
        { venueId: 'venue-1', dayOfWeek: 1, startTime: '19:00', isAvailable: true, maxGames: 1 },
        { venueId: 'venue-2', dayOfWeek: 1, startTime: '20:30', isAvailable: true, maxGames: 1 },
      ],
      blackouts: [
        { venueId: 'venue-2', blackoutDate: '2026-03-16', startTime: null, endTime: null },
      ],
      existingGames: [],
      startDate: '2026-03-16',
      endDate: '2026-03-16',
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      venueId: 'venue-1',
      location: 'East Rink',
    });
  });

  it('reduces slot capacity by already scheduled games at the same venue/time', () => {
    const slots = buildPlayoffSchedulingSlots({
      venues: [{ id: 'venue-1', name: 'North Pad', numberOfRinks: 2 }],
      availability: [
        { venueId: 'venue-1', dayOfWeek: 2, startTime: '21:00', isAvailable: true, maxGames: 2 },
      ],
      blackouts: [],
      existingGames: [
        {
          scheduledAt: new Date('2026-03-17T21:00:00').toISOString(),
          location: 'North Pad',
          status: 'scheduled',
        },
      ],
      startDate: '2026-03-17',
      endDate: '2026-03-17',
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].location).toBe('North Pad');
  });

  it('assigns series in slot order and reports unscheduled series', () => {
    const result = assignPlayoffSeriesToSlots(
      [{ id: 'series-1' }, { id: 'series-2' }, { id: 'series-3' }],
      [
        { venueId: 'venue-1', location: 'Rink A', scheduledAt: '2026-03-20T23:00:00.000Z' },
        { venueId: 'venue-2', location: 'Rink B', scheduledAt: '2026-03-21T00:30:00.000Z' },
      ],
    );

    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0]).toMatchObject({ seriesId: 'series-1', location: 'Rink A' });
    expect(result.assignments[1]).toMatchObject({ seriesId: 'series-2', location: 'Rink B' });
    expect(result.unscheduledSeriesIds).toEqual(['series-3']);
  });
});
