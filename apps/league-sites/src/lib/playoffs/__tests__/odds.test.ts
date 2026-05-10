import { calculatePlayoffOdds } from '../odds';
import type { ScheduleGame, TeamStanding } from '@/lib/types';

describe('calculatePlayoffOdds', () => {
  it('does not give first-place odds to a team that cannot catch the leader on points', () => {
    const standings = [
      buildStanding({ team_id: 'first-general', team_name: 'First General London', wins: 6, losses: 0, ties: 0, points: 12, goal_differential: 18 }),
      buildStanding({ team_id: 'fitzrays-premier', team_name: 'FitzRays Premier', wins: 2, losses: 2, ties: 2, points: 6, goal_differential: 2 }),
      buildStanding({ team_id: 'london-eco-metal', team_name: 'London Eco Metal', wins: 2, losses: 4, ties: 0, points: 4, goal_differential: -8 }),
      buildStanding({ team_id: 'fitzrays-flyers', team_name: 'FitzRays Flyers', wins: 0, losses: 4, ties: 2, points: 2, goal_differential: -12 }),
    ];

    const remainingGames = [
      buildGame('game-1', 'fitzrays-flyers', 'first-general'),
      buildGame('game-2', 'fitzrays-flyers', 'fitzrays-premier'),
      buildGame('game-3', 'london-eco-metal', 'fitzrays-flyers'),
      buildGame('game-4', 'first-general', 'fitzrays-flyers'),
    ];

    const odds = calculatePlayoffOdds(standings, remainingGames, { playoffTeamsTotal: 4 });
    const flyersOdds = odds.find((team) => team.teamId === 'fitzrays-flyers');

    // 2 current points + 4 wins * 2 points = 10 max, below the leader's current 12.
    expect(flyersOdds?.oddsOfFinishingFirst).toBe(0);
    expect(flyersOdds?.oddsOfMakingPlayoffs).toBe(1);
  });

  it('does not give first-place odds when a team can tie the leader on points but cannot pass the wins tiebreaker', () => {
    const standings = [
      buildStanding({ team_id: 'first-general', team_name: 'First General London', wins: 6, losses: 0, ties: 0, points: 12, goal_differential: 18 }),
      buildStanding({ team_id: 'fitzrays-premier', team_name: 'FitzRays Premier', wins: 2, losses: 2, ties: 2, points: 6, goal_differential: 2 }),
      buildStanding({ team_id: 'london-eco-metal', team_name: 'London Eco Metal', wins: 2, losses: 4, ties: 0, points: 4, goal_differential: -8 }),
      buildStanding({ team_id: 'fitzrays-flyers', team_name: 'FitzRays Flyers', wins: 0, losses: 4, ties: 2, points: 2, goal_differential: -12 }),
    ];

    const remainingGames = [
      buildGame('game-1', 'fitzrays-flyers', 'first-general'),
      buildGame('game-2', 'fitzrays-flyers', 'fitzrays-premier'),
      buildGame('game-3', 'london-eco-metal', 'fitzrays-flyers'),
      buildGame('game-4', 'first-general', 'fitzrays-flyers'),
      buildGame('game-5', 'fitzrays-flyers', 'london-eco-metal'),
    ];

    const odds = calculatePlayoffOdds(standings, remainingGames, { playoffTeamsTotal: 4 });
    const flyersOdds = odds.find((team) => team.teamId === 'fitzrays-flyers');

    // 2 current points + 5 wins * 2 points = 12, but only 5 wins vs leader's current 6.
    expect(flyersOdds?.oddsOfFinishingFirst).toBe(0);
    expect(flyersOdds?.oddsOfMakingPlayoffs).toBe(1);
  });

  it('does not give playoff odds to a team already locked below the playoff cut line', () => {
    const standings = [
      buildStanding({ team_id: 'leader', team_name: 'Leader', wins: 5, losses: 0, ties: 0, points: 10, goal_differential: 12 }),
      buildStanding({ team_id: 'second', team_name: 'Second', wins: 4, losses: 1, ties: 0, points: 8, goal_differential: 6 }),
      buildStanding({ team_id: 'third', team_name: 'Third', wins: 1, losses: 4, ties: 0, points: 2, goal_differential: -4 }),
      buildStanding({ team_id: 'last', team_name: 'Last', wins: 0, losses: 5, ties: 0, points: 0, goal_differential: -14 }),
    ];

    const remainingGames = [buildGame('game-1', 'third', 'last')];
    const odds = calculatePlayoffOdds(standings, remainingGames, { playoffTeamsTotal: 2 });
    const lastOdds = odds.find((team) => team.teamId === 'last');

    expect(lastOdds?.oddsOfMakingPlayoffs).toBe(0);
  });
});

function buildStanding(overrides: Partial<TeamStanding> & Pick<TeamStanding, 'team_id' | 'team_name'>): TeamStanding {
  return {
    team_id: overrides.team_id,
    team_name: overrides.team_name,
    team_logo: null,
    division_id: null,
    division_name: null,
    games_played: 6,
    wins: 0,
    losses: 0,
    ties: 0,
    overtime_losses: 0,
    points: 0,
    goals_for: 0,
    goals_against: 0,
    goal_differential: 0,
    streak: null,
    last_10: null,
    ...overrides,
  };
}

function buildGame(id: string, homeTeamId: string, awayTeamId: string): ScheduleGame {
  return {
    id,
    league_id: 'league',
    season_id: 'season',
    scheduled_at: '2026-05-14T23:00:00.000Z',
    venue: null,
    home_score: null,
    away_score: null,
    status: 'scheduled',
    game_type: 'regular',
    home_team: {
      id: homeTeamId,
      name: homeTeamId,
      slug: homeTeamId,
      logo: null,
      colors: null,
    },
    away_team: {
      id: awayTeamId,
      name: awayTeamId,
      slug: awayTeamId,
      logo: null,
      colors: null,
    },
  };
}
