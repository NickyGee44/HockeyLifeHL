export const ACTIVE_SEASON_WORKSPACE_COOKIE = 'blh_active_season_workspace';

export interface ActiveSeasonWorkspaceEntry {
  seasonId: string;
  seasonName?: string | null;
  updatedAt?: string;
}

export type ActiveSeasonWorkspaceMap = Record<string, ActiveSeasonWorkspaceEntry>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseActiveSeasonWorkspaceCookie(
  rawValue: string | null | undefined
): ActiveSeasonWorkspaceMap {
  if (!rawValue) {
    return {};
  }

  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded);

    if (!isRecord(parsed)) {
      return {};
    }

    const result: ActiveSeasonWorkspaceMap = {};

    for (const [leagueId, value] of Object.entries(parsed)) {
      if (!isRecord(value) || typeof value.seasonId !== 'string') {
        continue;
      }

      result[leagueId] = {
        seasonId: value.seasonId,
        seasonName: typeof value.seasonName === 'string' ? value.seasonName : null,
        updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
      };
    }

    return result;
  } catch {
    return {};
  }
}

export function serializeActiveSeasonWorkspaceCookie(
  value: ActiveSeasonWorkspaceMap
): string {
  return encodeURIComponent(JSON.stringify(value));
}

export function setActiveSeasonWorkspaceEntry(
  currentValue: string | null | undefined,
  leagueId: string,
  entry: ActiveSeasonWorkspaceEntry
): string {
  const next = parseActiveSeasonWorkspaceCookie(currentValue);

  next[leagueId] = {
    seasonId: entry.seasonId,
    seasonName: entry.seasonName ?? null,
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };

  return serializeActiveSeasonWorkspaceCookie(next);
}

export function clearActiveSeasonWorkspaceEntry(
  currentValue: string | null | undefined,
  leagueId: string
): string {
  const next = parseActiveSeasonWorkspaceCookie(currentValue);
  delete next[leagueId];
  return serializeActiveSeasonWorkspaceCookie(next);
}
