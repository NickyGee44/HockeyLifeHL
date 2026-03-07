const LOCALE_PREFIX_PATTERN = /^\/(en|fr)(?=\/|$)/;

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
