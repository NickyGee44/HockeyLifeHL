export interface OperationalSeasonLike {
  id?: string;
  status: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
}

const OPERATIONAL_SEASON_PRIORITY: Record<string, number> = {
  active: 0,
  playoffs: 1,
  registration: 2,
  draft: 3,
  completed: 4,
  archived: 5,
};

function getSeasonTimestamp(season: OperationalSeasonLike): number {
  const timestamp =
    season.start_date ??
    season.end_date ??
    season.created_at ??
    null;

  if (!timestamp) return 0;

  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isOperationalSeasonStatus(status: string | null | undefined): boolean {
  return ['active', 'playoffs', 'registration', 'draft'].includes(status ?? '');
}

export function pickOperationalSeason<T extends OperationalSeasonLike>(
  seasons: T[] | null | undefined
): T | null {
  if (!seasons || seasons.length === 0) return null;

  return [...seasons].sort((a, b) => {
    const priorityDelta =
      (OPERATIONAL_SEASON_PRIORITY[a.status ?? ''] ?? 99) -
      (OPERATIONAL_SEASON_PRIORITY[b.status ?? ''] ?? 99);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return getSeasonTimestamp(b) - getSeasonTimestamp(a);
  })[0] ?? null;
}

export function hasDraftSeason<T extends OperationalSeasonLike>(
  seasons: T[] | null | undefined,
  options?: { excludeSeasonId?: string }
): boolean {
  if (!seasons || seasons.length === 0) return false;

  return seasons.some((season) => {
    if (season.status !== 'draft') return false;
    if (!options?.excludeSeasonId) return true;
    return season.id !== options.excludeSeasonId;
  });
}
