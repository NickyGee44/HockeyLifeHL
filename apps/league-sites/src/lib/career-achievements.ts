import type { PlayerBadge } from './types';

export interface PlayerCareerAchievements {
  championships: number;
  importedChampionships: number;
  nativeChampionships: number;
}

function sanitizeCount(value?: number | null): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

export function countChampionshipBadges(
  badges: Array<Pick<PlayerBadge, 'badge_type'>>,
): number {
  return badges.reduce((total, badge) => {
    return total + (badge.badge_type === 'championship' ? 1 : 0);
  }, 0);
}

export function summarizePlayerCareerAchievements(input: {
  importedChampionships?: number | null;
  nativeChampionships?: number | null;
}): PlayerCareerAchievements {
  const importedChampionships = sanitizeCount(input.importedChampionships);
  const nativeChampionships = sanitizeCount(input.nativeChampionships);

  return {
    championships: importedChampionships + nativeChampionships,
    importedChampionships,
    nativeChampionships,
  };
}
