const HIDDEN_DEFAULT_NAV_PAGE_KEYS = new Set(['venues', 'about', 'contact']);
const HIDDEN_PUBLIC_TEAM_NAMES = new Set([
  'free agent',
  'free agents',
  'unassigned free agent',
  'unassigned free agents',
]);

function normalizeLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
}

export function shouldShowDefaultPublicNavPage(
  pageKey: string,
  visiblePages?: Record<string, boolean>,
) {
  if (HIDDEN_DEFAULT_NAV_PAGE_KEYS.has(pageKey)) {
    return false;
  }

  return visiblePages ? visiblePages[pageKey] !== false : true;
}

export function isPublicFacingTeamName(teamName: string | null | undefined) {
  const normalized = normalizeLabel(teamName);
  if (!normalized) {
    return true;
  }

  return !HIDDEN_PUBLIC_TEAM_NAMES.has(normalized);
}

export function filterPublicTeams<T extends { name: string | null | undefined }>(teams: T[]) {
  return teams.filter((team) => isPublicFacingTeamName(team.name));
}

export function filterPublicStandings<T extends { team_name: string | null | undefined }>(standings: T[]) {
  return standings.filter((team) => isPublicFacingTeamName(team.team_name));
}
