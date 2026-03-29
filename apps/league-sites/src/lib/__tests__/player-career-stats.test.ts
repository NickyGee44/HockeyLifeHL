import { summarizePlayerCareerTotals } from '../data';
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
