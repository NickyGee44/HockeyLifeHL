interface RegistrationSeasonLike {
  id: string;
  name: string;
  status?: string | null;
  start_date?: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
}

function toTimestamp(value?: string | null): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function isSeasonRegistrationOpen(
  season: RegistrationSeasonLike,
  now = new Date()
): boolean {
  const opensAt = season.registration_opens_at ? new Date(season.registration_opens_at) : null;
  const closesAt = season.registration_closes_at ? new Date(season.registration_closes_at) : null;

  if (opensAt || closesAt) {
    const isAfterOpen = !opensAt || now >= opensAt;
    const isBeforeClose = !closesAt || now <= closesAt;
    return isAfterOpen && isBeforeClose;
  }

  return season.status === 'upcoming' || season.status === 'active';
}

export function pickRegistrationSeason<T extends RegistrationSeasonLike>(
  seasons: T[],
  now = new Date()
): T | null {
  const openSeasons = seasons.filter((season) => isSeasonRegistrationOpen(season, now));

  if (openSeasons.length === 0) {
    return null;
  }

  return [...openSeasons].sort((a, b) => {
    const aStatusWeight = a.status === 'upcoming' ? 0 : a.status === 'active' ? 1 : a.status === 'playoffs' ? 2 : 3;
    const bStatusWeight = b.status === 'upcoming' ? 0 : b.status === 'active' ? 1 : b.status === 'playoffs' ? 2 : 3;

    if (aStatusWeight !== bStatusWeight) {
      return aStatusWeight - bStatusWeight;
    }

    return toTimestamp(b.start_date) - toTimestamp(a.start_date);
  })[0] ?? null;
}
