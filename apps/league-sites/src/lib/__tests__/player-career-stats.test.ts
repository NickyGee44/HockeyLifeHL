import {
  filterVisiblePlayerCareerTimelineRows,
  generatePlayerCareerHotFacts,
  summarizePlayerCareerTotals,
  type PlayerCareerSeasonRow,
} from '../data';
import { getMobileVisibleColumns } from '../../components/stats/StatsWorkspace';

describe('player career totals summary', () => {
  it('prefers season summary games played when season rows are aggregate or synthetic', () => {
    const stats = summarizePlayerCareerTotals(
      'player-1',
      [{ goals: 9, assists: 5, penalty_minutes: 4 }],
      {
        games_played: 12,
        goals: 9,
        assists: 5,
        points: 14,
        team_name: 'Wolves',
        position: 'Forward',
      },
    );

    expect(stats).toMatchObject({
      player_id: 'player-1',
      games_played: 12,
      goals: 9,
      assists: 5,
      points: 14,
      penalty_minutes: 4,
      team_name: 'Wolves',
      position: 'Forward',
    });
  });

  it('falls back to row counts when no season summary is available', () => {
    const stats = summarizePlayerCareerTotals('player-2', [
      { goals: 1, assists: 2, penalty_minutes: 0 },
      { goals: 3, assists: 1, penalty_minutes: 2 },
    ]);

    expect(stats).toMatchObject({
      player_id: 'player-2',
      games_played: 2,
      goals: 4,
      assists: 3,
      points: 7,
      penalty_minutes: 2,
    });
  });

  it('returns null when there is no data at all', () => {
    expect(summarizePlayerCareerTotals('player-3', [], null)).toBeNull();
  });
});

describe('player career timeline visibility and hot facts', () => {
  const baselineRow: PlayerCareerSeasonRow = {
    season_id: 'baseline',
    season_name: 'Historical Career Baseline (Pre-BLH)',
    sort_date: '2025-01-01',
    team_id: null,
    team_name: null,
    position: 'Forward',
    games_played: 20,
    team_games: 20,
    attendance_pct: 100,
    goals: 15,
    assists: 35,
    points: 50,
    goals_per_game: 0.75,
    points_per_game: 2.5,
    wins: 0,
    losses: 0,
    ties: 0,
    saves: 0,
    goals_against: 0,
    save_percentage: null,
    goals_against_average: null,
    shutouts: 0,
  };

  const winterRow: PlayerCareerSeasonRow = {
    season_id: 'winter-2026',
    season_name: 'Winter 2026',
    sort_date: '2026-01-01',
    team_id: 'team-1',
    team_name: 'FitzRays Premier',
    position: 'Forward',
    games_played: 11,
    team_games: 11,
    attendance_pct: 100,
    goals: 14,
    assists: 5,
    points: 19,
    goals_per_game: 1.27,
    points_per_game: 1.73,
    wins: 0,
    losses: 0,
    ties: 0,
    saves: 0,
    goals_against: 0,
    save_percentage: null,
    goals_against_average: null,
    shutouts: 0,
  };

  const springRow: PlayerCareerSeasonRow = {
    season_id: 'spring-2026',
    season_name: 'Spring 2026',
    sort_date: '2026-04-01',
    team_id: 'team-1',
    team_name: 'FitzRays Premier',
    position: 'Forward',
    games_played: 3,
    team_games: 3,
    attendance_pct: 100,
    goals: 4,
    assists: 3,
    points: 7,
    goals_per_game: 1.33,
    points_per_game: 2.33,
    wins: 0,
    losses: 0,
    ties: 0,
    saves: 0,
    goals_against: 0,
    save_percentage: null,
    goals_against_average: null,
    shutouts: 0,
  };

  it('hides unknown and baseline seasons from the visible career chart by default', () => {
    expect(
      filterVisiblePlayerCareerTimelineRows([
        { ...baselineRow },
        { ...winterRow },
        { ...springRow },
        { ...winterRow, season_id: 'unknown', season_name: 'Unknown Season' },
      ]).map((row) => row.season_name),
    ).toEqual(['Winter 2026', 'Spring 2026']);
  });

  it('can still include the historical baseline when milestone insights need full-career totals', async () => {
    const facts = await generatePlayerCareerHotFacts({
      playerName: 'Tristan Hatfield',
      seasons: [winterRow, springRow],
      careerTotalsSeasons: [baselineRow, winterRow, springRow],
      isGoalie: false,
    });

    expect(facts[0]).toContain('76 career points');
  });
});

describe('mobile visible columns', () => {
  it('keeps balanced columns first and limits mobile cards to four stats', () => {
    expect(
      getMobileVisibleColumns(
        ['games_played', 'points', 'goals', 'assists', 'penalty_minutes'],
        ['games_played', 'goals', 'assists', 'points'],
      ),
    ).toEqual(['games_played', 'goals', 'assists', 'points']);
  });

  it('fills remaining slots with user-selected overflow columns', () => {
    expect(
      getMobileVisibleColumns(
        ['games_played', 'save_percentage', 'goals_against_average', 'shutouts', 'saves'],
        ['games_played', 'wins', 'losses', 'save_percentage'],
      ),
    ).toEqual(['games_played', 'save_percentage', 'goals_against_average', 'shutouts']);
  });
});
