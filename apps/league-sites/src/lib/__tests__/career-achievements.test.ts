import { countChampionshipBadges, summarizePlayerCareerAchievements } from '../career-achievements';

describe('career achievements helpers', () => {
  it('counts only championship badges', () => {
    expect(
      countChampionshipBadges([
        { badge_type: 'championship' },
        { badge_type: 'points_leader' },
        { badge_type: 'championship' },
      ]),
    ).toBe(2);
  });

  it('combines imported and native championship sources safely', () => {
    expect(
      summarizePlayerCareerAchievements({
        importedChampionships: 3,
        nativeChampionships: 2,
      }),
    ).toEqual({
      championships: 5,
      importedChampionships: 3,
      nativeChampionships: 2,
    });
  });

  it('sanitizes missing or invalid values to zero', () => {
    expect(
      summarizePlayerCareerAchievements({
        importedChampionships: null,
        nativeChampionships: Number.NaN,
      }),
    ).toEqual({
      championships: 0,
      importedChampionships: 0,
      nativeChampionships: 0,
    });
  });
});
