const LOCALE_PREFIX_PATTERN = /^\/(en|fr)(?=\/|$)/;
const DASHBOARD_LEAGUE_SEGMENT_PATTERN = /\/dashboard\/leagues\/([^/?#]+)/;

export function normalizePlatformOwnerViewTarget(
  target: string | null | undefined,
  fallback: string
): string {
  if (!target || typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) {
    return fallback;
  }

  const normalizedTarget = target.replace(LOCALE_PREFIX_PATTERN, '');
  return normalizedTarget || fallback;
}

export function buildPlatformOwnerViewHref({
  leagueId,
  redirectTo,
}: {
  leagueId: string;
  redirectTo?: string | null;
}): string {
  const params = new URLSearchParams({ leagueId });

  if (redirectTo) {
    params.set(
      'redirectTo',
      normalizePlatformOwnerViewTarget(redirectTo, `/dashboard/leagues/${leagueId}`)
    );
  }

  return `/dashboard/admin/owner-view?${params.toString()}`;
}

export function buildLeagueScopedDashboardTarget({
  pathname,
  search,
  leagueId,
}: {
  pathname: string | null | undefined;
  search?: string | null | undefined;
  leagueId: string;
}): string {
  const fallback = `/dashboard/leagues/${leagueId}`;
  const normalizedPath = normalizePlatformOwnerViewTarget(pathname, fallback);

  if (!DASHBOARD_LEAGUE_SEGMENT_PATTERN.test(normalizedPath)) {
    return fallback;
  }

  const nextPath = normalizedPath.replace(
    DASHBOARD_LEAGUE_SEGMENT_PATTERN,
    `/dashboard/leagues/${leagueId}`
  );

  return search ? `${nextPath}?${search}` : nextPath;
}
