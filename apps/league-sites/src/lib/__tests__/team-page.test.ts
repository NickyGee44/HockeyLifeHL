import type { Player, ScheduleGame } from '../types';
import {
  buildRivalCardInsights,
  normalizeTeamScheduleView,
  partitionTeamSchedule,
  summarizeTeamChampionships,
  splitRosterByRole,
} from '../team-page';

describe('team page helpers', () => {
  it('normalizes invalid schedule views back to upcoming', () => {
    expect(normalizeTeamScheduleView('past')).toBe('past');
    expect(normalizeTeamScheduleView('upcoming')).toBe('upcoming');
    expect(normalizeTeamScheduleView('anything-else')).toBe('upcoming');
    expect(normalizeTeamScheduleView(undefined)).toBe('upcoming');
  });

  it('partitions schedule into upcoming and past buckets', () => {
    const schedule = [
      buildGame({ id: 'future-scheduled', scheduled_at: '2026-04-05T01:00:00.000Z', status: 'scheduled' }),
      buildGame({ id: 'future-live', scheduled_at: '2026-04-02T01:00:00.000Z', status: 'in_progress' }),
      buildGame({ id: 'completed-recent', scheduled_at: '2026-03-28T01:00:00.000Z', status: 'completed' }),
      buildGame({ id: 'past-pending', scheduled_at: '2026-03-20T01:00:00.000Z', status: 'pending_verification' }),
      buildGame({ id: 'cancelled', scheduled_at: '2026-04-01T01:00:00.000Z', status: 'cancelled' }),
    ] satisfies ScheduleGame[];

    const { upcomingGames, pastGames } = partitionTeamSchedule(schedule, new Date('2026-03-30T12:00:00.000Z'));

    expect(upcomingGames.map((game) => game.id)).toEqual(['future-scheduled', 'future-live']);
    expect(pastGames.map((game) => game.id)).toEqual(['completed-recent', 'past-pending']);
  });

  it('summarizes championship counts using champion ids or standings fallback', () => {
    const summary = summarizeTeamChampionships('team-1', [
      {
        id: 'season-3',
        name: 'Winter 2025-26',
        start_date: '2025-09-01',
        end_date: '2026-03-01',
        champion_team_id: 'team-1',
      },
      {
        id: 'season-2',
        name: 'Winter 2024-25',
        start_date: '2024-09-01',
        end_date: '2025-03-01',
        champion_team_id: null,
        standingsLeaderTeamId: 'team-1',
      },
      {
        id: 'season-1',
        name: 'Winter 2023-24',
        start_date: '2023-09-01',
        end_date: '2024-03-01',
        champion_team_id: 'team-2',
      },
    ]);

    expect(summary).toEqual({
      count: 2,
      latestTitleSeasonName: 'Winter 2025-26',
      latestTitleLabel: '2025-26',
      titleSeasonIds: ['season-3', 'season-2'],
    });
  });

  it('builds rival insights from existing head-to-head results only', () => {
    const [topRival, trailingRival, levelRival] = buildRivalCardInsights([
      {
        team: { id: 'rival-1', name: 'Blades', slug: 'blades', logo: null },
        wins: 3,
        losses: 1,
        ties: 0,
        games_played: 4,
      },
      {
        team: { id: 'rival-2', name: 'Storm', slug: 'storm', logo: null },
        wins: 1,
        losses: 3,
        ties: 0,
        games_played: 4,
      },
      {
        team: { id: 'rival-3', name: 'Wolves', slug: 'wolves', logo: null },
        wins: 1,
        losses: 1,
        ties: 1,
        games_played: 3,
      },
    ]);

    expect(topRival.status).toBe('leading');
    expect(topRival.insight).toContain('Most-played matchup');
    expect(trailingRival.status).toBe('trailing');
    expect(trailingRival.insight).toContain('controlled more of the matchup');
    expect(levelRival.status).toBe('level');
    expect(levelRival.recordLabel).toBe('1-1-1');
  });

  it('splits roster by role and sorts each group by production', () => {
    const roster = [
      buildPlayer({ id: 'a', player_id: 'a', fullName: 'Skater Two', position: 'C' }),
      buildPlayer({ id: 'b', player_id: 'b', fullName: 'Goalie One', position: 'G', is_goalie: true }),
      buildPlayer({ id: 'c', player_id: 'c', fullName: 'Skater One', position: 'LW' }),
    ] satisfies Player[];

    const { skaters, goalies } = splitRosterByRole(roster, {
      a: {
        games_played: 8,
        goals: 2,
        assists: 4,
        points: 6,
        penalty_minutes: 0,
        wins: 0,
        losses: 0,
        save_percentage: null,
        goals_against_average: null,
        shutouts: 0,
        is_goalie: false,
      },
      b: {
        games_played: 5,
        goals: 0,
        assists: 0,
        points: 0,
        penalty_minutes: 0,
        wins: 4,
        losses: 1,
        save_percentage: 0.921,
        goals_against_average: 2.2,
        shutouts: 1,
        is_goalie: true,
      },
      c: {
        games_played: 8,
        goals: 5,
        assists: 5,
        points: 10,
        penalty_minutes: 2,
        wins: 0,
        losses: 0,
        save_percentage: null,
        goals_against_average: null,
        shutouts: 0,
        is_goalie: false,
      },
    });

    expect(skaters.map((player) => player.player_id)).toEqual(['c', 'a']);
    expect(goalies.map((player) => player.player_id)).toEqual(['b']);
  });
});

function buildGame(overrides: Partial<ScheduleGame>): ScheduleGame {
  return {
    id: 'game-1',
    league_id: 'league-1',
    season_id: 'season-1',
    scheduled_at: '2026-03-30T01:00:00.000Z',
    venue: 'Arena',
    home_score: null,
    away_score: null,
    status: 'scheduled',
    game_type: null,
    division_id: null,
    home_team: { id: 'home', name: 'Home', slug: 'home', logo: null, colors: null },
    away_team: { id: 'away', name: 'Away', slug: 'away', logo: null, colors: null },
    division: null,
    ...overrides,
  };
}

function buildPlayer({
  id,
  player_id,
  fullName,
  position,
  is_goalie,
}: {
  id: string;
  player_id: string;
  fullName: string;
  position: Player['position'];
  is_goalie?: boolean;
}): Player {
  return {
    id,
    player_id,
    team_id: 'team-1',
    jersey_number: null,
    position,
    leadership_role: null,
    is_goalie,
    profile: {
      full_name: fullName,
      avatar_url: null,
    },
  };
}
