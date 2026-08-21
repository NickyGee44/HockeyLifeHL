import { getLeagueWeekDateRange } from '../league-timezone';
import {
  calculateWeeklyMilestones,
  type WeeklyMilestoneInput,
} from '../weekly-milestones';

const WEEK = {
  weekStartKey: '2026-08-17',
  weekEndKey: '2026-08-23',
  timeZone: 'America/Toronto',
};

function input(overrides: Partial<WeeklyMilestoneInput> = {}): WeeklyMilestoneInput {
  return {
    ...WEEK,
    players: [
      {
        playerId: 'player-1',
        playerName: 'Alex Tremblay',
        avatarUrl: null,
        careerGamesPlayed: 24,
        careerGoals: 49,
        careerPoints: 99,
      },
    ],
    games: [],
    rosterPeriods: [],
    acceptedSubAssignments: [],
    completedAppearances: [],
    completedStatLines: [],
    ...overrides,
  };
}

describe('calculateWeeklyMilestones', () => {
  it('includes goals and points only when the player was exactly one away before the week', () => {
    const milestones = calculateWeeklyMilestones(input({
      players: [
        {
          playerId: 'player-1',
          playerName: 'Alex Tremblay',
          avatarUrl: null,
          careerGamesPlayed: 24,
          careerGoals: 49,
          careerPoints: 99,
        },
        {
          playerId: 'player-2',
          playerName: 'Morgan Lee',
          avatarUrl: null,
          careerGamesPlayed: 24,
          careerGoals: 48,
          careerPoints: 98,
        },
      ],
    }));

    expect(milestones.map(({ playerId, category, milestone, status }) => ({
      playerId,
      category,
      milestone,
      status,
    }))).toEqual([
      { playerId: 'player-1', category: 'goals', milestone: 50, status: 'upcoming' },
      { playerId: 'player-1', category: 'points', milestone: 100, status: 'upcoming' },
    ]);
  });

  it('places an exact milestone reached in a completed game this week under achieved', () => {
    const milestones = calculateWeeklyMilestones(input({
      players: [{
        playerId: 'player-1',
        playerName: 'Alex Tremblay',
        avatarUrl: '/alex.jpg',
        careerGamesPlayed: 25,
        careerGoals: 50,
        careerPoints: 100,
      }],
      games: [{
        gameId: 'game-tue',
        scheduledAt: '2026-08-19T01:00:00.000Z',
        status: 'completed',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      }],
      completedAppearances: [{ playerId: 'player-1', gameId: 'game-tue' }],
      completedStatLines: [{ playerId: 'player-1', gameId: 'game-tue', goals: 1, assists: 0 }],
    }));

    expect(milestones).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'goals', milestone: 50, status: 'achieved', gameId: 'game-tue' }),
      expect.objectContaining({ category: 'points', milestone: 100, status: 'achieved', gameId: 'game-tue' }),
    ]));
  });

  it('identifies the scheduled game that crosses a games-played milestone', () => {
    const milestones = calculateWeeklyMilestones(input({
      players: [{
        playerId: 'player-1',
        playerName: 'Alex Tremblay',
        avatarUrl: null,
        careerGamesPlayed: 48,
        careerGoals: 10,
        careerPoints: 20,
      }],
      games: [
        { gameId: 'game-one', scheduledAt: '2026-08-18T01:00:00.000Z', status: 'scheduled', homeTeamId: 'team-1', awayTeamId: 'team-2' },
        { gameId: 'game-two', scheduledAt: '2026-08-20T01:00:00.000Z', status: 'scheduled', homeTeamId: 'team-3', awayTeamId: 'team-1' },
        { gameId: 'game-three', scheduledAt: '2026-08-22T01:00:00.000Z', status: 'scheduled', homeTeamId: 'team-1', awayTeamId: 'team-4' },
      ],
      rosterPeriods: [{
        playerId: 'player-1',
        teamId: 'team-1',
        startDate: '2026-01-01',
        endDate: null,
        status: 'active',
        playerType: 'regular',
      }],
    }));

    expect(milestones).toContainEqual(expect.objectContaining({
      category: 'games_played',
      milestone: 50,
      status: 'upcoming',
      gameId: 'game-two',
      scheduledAt: '2026-08-20T01:00:00.000Z',
    }));
  });

  it('returns no milestones when no exact eligibility or scheduled crossing exists', () => {
    expect(calculateWeeklyMilestones(input({
      players: [{
        playerId: 'player-1',
        playerName: 'Alex Tremblay',
        avatarUrl: null,
        careerGamesPlayed: 21,
        careerGoals: 47,
        careerPoints: 96,
      }],
    }))).toEqual([]);
  });
});

describe('weekly milestone league-timezone boundaries', () => {
  it('keeps late Sunday in Toronto in the ending week and Monday in the next week', () => {
    expect(getLeagueWeekDateRange('2026-08-24T03:59:59.999Z', 'America/Toronto')).toMatchObject({
      weekStartKey: '2026-08-17',
      weekEndKey: '2026-08-23',
    });
    expect(getLeagueWeekDateRange('2026-08-24T04:00:00.000Z', 'America/Toronto')).toMatchObject({
      weekStartKey: '2026-08-24',
      weekEndKey: '2026-08-30',
    });
  });
});
