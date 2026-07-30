export interface RecentSubSeasonLike {
  id: string;
  name?: string | null;
  start_date?: string | null;
  created_at?: string | null;
}

export interface RecentSubStatProfile {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
}

export interface RecentSubStatGame {
  scheduled_at?: string | null;
}

export interface RecentSubStatRow {
  player_id: string;
  game?: RecentSubStatGame | RecentSubStatGame[] | null;
  player?: RecentSubStatProfile | RecentSubStatProfile[] | null;
}

export interface RecentSubCandidate {
  id: string;
  full_name: string | null;
  email: string | null;
  position: string | null;
  last_played_at: string | null;
}

function isHistoricalBaselineSeason(season: RecentSubSeasonLike) {
  return season.name?.trim().toLowerCase().startsWith('historical career baseline') ?? false;
}

function seasonSortTimestamp(season: RecentSubSeasonLike) {
  const timestamp = season.start_date ?? season.created_at ?? null;
  if (!timestamp) return 0;
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function unwrapJoinedRecord<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function selectRecentSubSeasonIds(
  seasons: RecentSubSeasonLike[],
  currentSeasonId: string,
): string[] {
  const visibleSeasons = seasons
    .filter((season) => !isHistoricalBaselineSeason(season))
    .sort((left, right) => seasonSortTimestamp(right) - seasonSortTimestamp(left));

  const currentIndex = visibleSeasons.findIndex((season) => season.id === currentSeasonId);
  if (currentIndex === -1) {
    return [];
  }

  return visibleSeasons
    .slice(currentIndex, currentIndex + 2)
    .map((season) => season.id);
}

export function selectRecentSubGoalieSeasonIds(
  seasons: RecentSubSeasonLike[],
  currentSeasonId: string,
): string[] {
  const recentSeasonIds = selectRecentSubSeasonIds(seasons, currentSeasonId);
  if (recentSeasonIds.length === 0) {
    return [];
  }

  const historicalGoalieSeasonIds = seasons
    .filter(isHistoricalBaselineSeason)
    .sort((left, right) => seasonSortTimestamp(right) - seasonSortTimestamp(left))
    .map((season) => season.id);

  return Array.from(new Set([...recentSeasonIds, ...historicalGoalieSeasonIds]));
}

export function buildRecentSubCandidates({
  currentSeasonRosterPlayerIds,
  skaterRows,
  goalieRows,
}: {
  currentSeasonRosterPlayerIds: string[];
  skaterRows: RecentSubStatRow[];
  goalieRows: RecentSubStatRow[];
}): RecentSubCandidate[] {
  const currentRosterIds = new Set(currentSeasonRosterPlayerIds);
  const candidates = new Map<string, RecentSubCandidate>();

  const ingestRow = (row: RecentSubStatRow, position: string | null) => {
    if (!row.player_id || currentRosterIds.has(row.player_id)) {
      return;
    }

    const profile = unwrapJoinedRecord(row.player);
    const game = unwrapJoinedRecord(row.game);
    const existing = candidates.get(row.player_id);
    const nextLastPlayed = game?.scheduled_at ?? null;

    if (!existing) {
      candidates.set(row.player_id, {
        id: profile?.id || row.player_id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        position,
        last_played_at: nextLastPlayed,
      });
      return;
    }

    if (
      nextLastPlayed &&
      (!existing.last_played_at || Date.parse(nextLastPlayed) > Date.parse(existing.last_played_at))
    ) {
      existing.last_played_at = nextLastPlayed;
    }

    if (!existing.full_name && profile?.full_name) {
      existing.full_name = profile.full_name;
    }
    if (!existing.email && profile?.email) {
      existing.email = profile.email;
    }
  };

  for (const row of skaterRows) {
    ingestRow(row, 'Skater');
  }
  for (const row of goalieRows) {
    ingestRow(row, 'Goalie');
  }

  return Array.from(candidates.values()).sort((left, right) =>
    (left.full_name || '').localeCompare(right.full_name || ''),
  );
}
