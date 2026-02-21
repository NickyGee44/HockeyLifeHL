import { describe, expect, it } from '@jest/globals';
import {
  generateDivisionAwareMatchups,
  generateRoundRobinMatchups,
  generateSchedule,
} from '@/lib/schedule/generator';
import type {
  ScheduleConfig,
  ScheduleGenerationOptions,
  Team,
  Venue,
} from '@/lib/schedule/types';

function makeTeams(count: number, withDivisions = false): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    shortName: `T${i + 1}`,
    divisionId: withDivisions ? (i % 2 === 0 ? 'div-a' : 'div-b') : null,
    homeVenueId: 'venue-1',
    seniorityLevel: 5,
  }));
}

function makeConfig(overrides: Partial<ScheduleConfig> = {}): ScheduleConfig {
  return {
    scheduleType: 'round_robin',
    gamesPerTeam: 0,
    allowBackToBack: false,
    homeAwayBalance: true,
    divisionGamesRatio: 0.5,
    divisionAware: false,
    crossDivisionGamesPerTeam: 0,
    gameDays: [1, 2, 3, 4, 5, 6],
    gameTimes: ['18:00', '19:30', '21:00'],
    gameDurationMinutes: 90,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-06-30T00:00:00.000Z'),
    allowByeWeeks: false,
    byeWeeksPerTeam: 0,
    defaultVenueId: 'venue-1',
    rotateHomeVenue: false,
    playoffFormat: 'none',
    playoffTeams: 0,
    playoffQualificationMode: 'count',
    playoffPercentage: 0,
    ...overrides,
  };
}

function makeOptions(teams: Team[], config: ScheduleConfig): ScheduleGenerationOptions {
  const venues: Venue[] = [
    {
      id: 'venue-1',
      name: 'Main Arena',
      address: '100 Hockey Way',
      numberOfRinks: 1,
    },
  ];

  return {
    seasonId: 'season-1',
    leagueId: 'league-1',
    teams,
    config,
    constraints: [],
    venues,
  };
}

describe('schedule generator', () => {
  it('builds correct round-robin matchup counts for team sizes 4/6/8/10/12', () => {
    for (const size of [4, 6, 8, 10, 12]) {
      const teams = makeTeams(size);
      const matchups = generateRoundRobinMatchups(teams, false);
      expect(matchups).toHaveLength((size * (size - 1)) / 2);
    }
  });

  it('enforces back-to-back prevention and home/away balance', async () => {
    const teams = makeTeams(6);
    const config = makeConfig({ allowBackToBack: false, homeAwayBalance: true });
    const result = await generateSchedule(makeOptions(teams, config));

    expect(result.success).toBe(true);

    for (const team of teams) {
      const times = result.games
        .filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id)
        .map((g) => g.scheduledAt.getTime())
        .sort((a, b) => a - b);

      for (let i = 1; i < times.length; i++) {
        const deltaMinutes = (times[i] - times[i - 1]) / 60000;
        expect(deltaMinutes).toBeGreaterThanOrEqual(config.gameDurationMinutes);
      }
    }

    for (const team of teams) {
      const home = result.homeGamesPerTeam[team.id] ?? 0;
      const away = result.awayGamesPerTeam[team.id] ?? 0;
      expect(Math.abs(home - away)).toBeLessThanOrEqual(1);
    }
  });

  it('supports round-robin and division-aware formats', () => {
    const teams = makeTeams(8, true);
    const divisional = generateDivisionAwareMatchups(
      teams,
      makeConfig({
        divisionAware: true,
        crossDivisionGamesPerTeam: 2,
      })
    );

    const hasCrossDivisionGame = divisional.some((matchup) => {
      const home = teams.find((t) => t.id === matchup.homeTeamId);
      const away = teams.find((t) => t.id === matchup.awayTeamId);
      return home?.divisionId !== away?.divisionId;
    });

    expect(hasCrossDivisionGame).toBe(true);

    const roundRobin = generateRoundRobinMatchups(teams, true);
    expect(roundRobin.length).toBeGreaterThan(divisional.length / 2);
  });
});

