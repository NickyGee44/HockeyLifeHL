export const LEGACY_DASHBOARD_ROUTE_PREFIXES = [
  '/dashboard/company',
  '/dashboard/staffing',
] as const;

export const LEGACY_SEASON_SELECTOR_ROUTE_PATTERNS = [
  /^\/dashboard\/leagues\/[^/]+\/schedule(?:[/?#]|$)/,
  /^\/dashboard\/leagues\/[^/]+\/registrations(?:[/?#]|$)/,
  /^\/dashboard\/leagues\/[^/]+\/teams(?:[/?#]|$)/,
  /^\/dashboard\/leagues\/[^/]+\/games(?:[/?#]|$)/,
  /^\/dashboard\/leagues\/[^/]+\/standings(?:[/?#]|$)/,
  /^\/dashboard\/leagues\/[^/]+\/playoffs(?:[/?#]|$)/,
  /^\/dashboard\/leagues\/[^/]+\/ratings(?:[/?#]|$)/,
  /^\/dashboard\/leagues\/[^/]+\/eligibility(?:[/?#]|$)/,
  /^\/dashboard\/leagues\/[^/]+\/draft(?:[/?#]|$)/,
  /^\/dashboard\/leagues\/[^/]+\/scorekeepers(?:[/?#]|$)/,
] as const;

export function isLegacyDashboardNavigationHref(href: string) {
  if (LEGACY_DASHBOARD_ROUTE_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}/`) || href.startsWith(`${prefix}?`))) {
    return true;
  }

  return LEGACY_SEASON_SELECTOR_ROUTE_PATTERNS.some((pattern) => pattern.test(href));
}
