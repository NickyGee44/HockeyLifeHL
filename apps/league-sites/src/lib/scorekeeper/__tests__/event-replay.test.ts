import {
  buildPenaltyTrackerFromEvents,
  compareEventsChronologically,
  getShotsForTeam,
  type ReplayableGameEvent,
} from '../event-replay';

function goal(
  id: string,
  teamType: 'home' | 'away',
  period: number,
  gameTimeSeconds: number,
  createdAt = '2026-03-12T00:00:00.000Z'
): ReplayableGameEvent {
  return {
    id,
    eventType: 'goal',
    teamType,
    period,
    gameTimeSeconds,
    createdAt,
  };
}

function penalty(
  id: string,
  teamType: 'home' | 'away',
  period: number,
  gameTimeSeconds: number,
  penaltyMinutes: number,
  penaltyType = 'Minor'
): ReplayableGameEvent {
  return {
    id,
    eventType: 'penalty',
    teamType,
    period,
    gameTimeSeconds,
    penaltyMinutes,
    penaltyType,
    createdAt: '2026-03-12T00:00:00.000Z',
  };
}

describe('event replay helpers', () => {
  it('sorts countdown-clock events chronologically', () => {
    const events = [
      goal('late', 'home', 1, 120),
      goal('early', 'home', 1, 1180),
    ];

    expect([...events].sort(compareEventsChronologically).map((event) => event.id)).toEqual([
      'early',
      'late',
    ]);
  });

  it('expires the earliest minor after a power-play goal', () => {
    const tracker = buildPenaltyTrackerFromEvents(
      [
        penalty('home-minor', 'home', 1, 1100, 2),
        goal('away-pp', 'away', 1, 1000),
      ],
      20
    );

    expect(tracker.getActivePenalties('home', 1000, 1)).toHaveLength(0);
  });

  it('does not expire a major penalty after a goal', () => {
    const tracker = buildPenaltyTrackerFromEvents(
      [
        penalty('home-major', 'home', 1, 1100, 5, 'Major'),
        goal('away-goal', 'away', 1, 1000),
      ],
      20
    );

    expect(tracker.getActivePenalties('home', 1000, 1)).toHaveLength(1);
  });

  it('only expires the first half of a double minor after one power-play goal', () => {
    const tracker = buildPenaltyTrackerFromEvents(
      [
        penalty('home-double', 'home', 1, 1100, 4, 'Double Minor'),
        goal('away-pp', 'away', 1, 1000),
      ],
      20
    );

    expect(tracker.getActivePenalties('home', 1000, 1)).toHaveLength(0);
    expect(tracker.getPenaltiesForDisplay('home', 950, 1)).toHaveLength(1);
  });

  it('counts shots from goals plus saved shots for the shooting team', () => {
    const events: ReplayableGameEvent[] = [
      goal('home-goal', 'home', 1, 1100),
      {
        id: 'away-save',
        eventType: 'save',
        teamType: 'away',
        period: 1,
        gameTimeSeconds: 1000,
        createdAt: '2026-03-12T00:00:00.000Z',
      },
      {
        id: 'home-save',
        eventType: 'save',
        teamType: 'home',
        period: 1,
        gameTimeSeconds: 900,
        createdAt: '2026-03-12T00:00:00.000Z',
      },
    ];

    expect(getShotsForTeam(events, 'home')).toBe(2);
    expect(getShotsForTeam(events, 'away')).toBe(1);
  });
});
