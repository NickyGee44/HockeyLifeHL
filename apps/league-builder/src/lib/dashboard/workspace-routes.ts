export type DashboardWorkspaceScope = 'organization' | 'league' | 'season';

export type SeasonWorkspaceRouteKey =
  | 'home'
  | 'registrations'
  | 'teams'
  | 'rosters'
  | 'players'
  | 'schedule'
  | 'games'
  | 'standings'
  | 'playoffs'
  | 'ratings'
  | 'eligibility'
  | 'draft'
  | 'scorekeepers'
  | 'settings';

const SEASON_ROUTE_SUFFIX: Record<SeasonWorkspaceRouteKey, string> = {
  home: '',
  registrations: '/registrations',
  teams: '/teams',
  rosters: '/rosters',
  players: '/players',
  schedule: '/schedule',
  games: '/games',
  standings: '/standings',
  playoffs: '/playoffs',
  ratings: '/ratings',
  eligibility: '/eligibility',
  draft: '/draft',
  scorekeepers: '/scorekeeper-schedule',
  settings: '/edit',
};

function localePrefix(locale: string) {
  return locale ? `/${locale}` : '';
}

export function buildDashboardHomeHref(locale: string) {
  return `${localePrefix(locale)}/dashboard`;
}

export function buildLeagueHubHref(locale: string, leagueId: string) {
  return `${localePrefix(locale)}/dashboard/leagues/${leagueId}`;
}

export function buildLeagueSeasonsHref(locale: string, leagueId: string) {
  return `${buildLeagueHubHref(locale, leagueId)}/seasons`;
}

export function buildSeasonWorkspaceHref(
  locale: string,
  leagueId: string,
  seasonId: string,
  route: SeasonWorkspaceRouteKey = 'home'
) {
  return `${buildLeagueSeasonsHref(locale, leagueId)}/${seasonId}${SEASON_ROUTE_SUFFIX[route]}`;
}

function normalizePathname(pathname: string, locale: string) {
  if (pathname === `/${locale}`) {
    return '/';
  }

  return pathname.startsWith(`/${locale}`) ? pathname.slice(locale.length + 1) : pathname;
}

export function resolveSeasonRouteKeyFromPathname(
  pathname: string,
  locale: string,
  leagueId: string
): SeasonWorkspaceRouteKey {
  const path = normalizePathname(pathname, locale);

  const explicitMappings: Array<[string, SeasonWorkspaceRouteKey]> = [
    [`/dashboard/leagues/${leagueId}/scorekeepers/schedule`, 'scorekeepers'],
    [`/dashboard/leagues/${leagueId}/scorekeepers`, 'scorekeepers'],
    [`/dashboard/leagues/${leagueId}/schedule`, 'schedule'],
    [`/dashboard/leagues/${leagueId}/registrations`, 'registrations'],
    [`/dashboard/leagues/${leagueId}/teams`, 'teams'],
    [`/dashboard/leagues/${leagueId}/games`, 'games'],
    [`/dashboard/leagues/${leagueId}/standings`, 'standings'],
    [`/dashboard/leagues/${leagueId}/playoffs`, 'playoffs'],
    [`/dashboard/leagues/${leagueId}/ratings`, 'ratings'],
    [`/dashboard/leagues/${leagueId}/eligibility`, 'eligibility'],
    [`/dashboard/leagues/${leagueId}/draft`, 'draft'],
  ];

  for (const [prefix, key] of explicitMappings) {
    if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) {
      return key;
    }
  }

  const seasonMatch = path.match(
    new RegExp(`/dashboard/leagues/${leagueId}/seasons/[^/]+(?<suffix>/.*)?$`)
  );
  const suffix = seasonMatch?.groups?.suffix ?? '';

  if (!suffix || suffix === '/') {
    return 'home';
  }

  const suffixMappings: Array<[string, SeasonWorkspaceRouteKey]> = [
    ['/registrations', 'registrations'],
    ['/teams', 'teams'],
    ['/rosters', 'rosters'],
    ['/players', 'players'],
    ['/schedule', 'schedule'],
    ['/games', 'games'],
    ['/standings', 'standings'],
    ['/playoffs', 'playoffs'],
    ['/ratings', 'ratings'],
    ['/eligibility', 'eligibility'],
    ['/draft', 'draft'],
    ['/scorekeeper-schedule', 'scorekeepers'],
    ['/edit', 'settings'],
  ];

  for (const [prefix, key] of suffixMappings) {
    if (suffix === prefix || suffix.startsWith(`${prefix}/`)) {
      return key;
    }
  }

  return 'home';
}

export function buildEquivalentSeasonWorkspaceHref(params: {
  locale: string;
  leagueId: string;
  seasonId: string;
  pathname: string;
}): string {
  const route = resolveSeasonRouteKeyFromPathname(params.pathname, params.locale, params.leagueId);
  return buildSeasonWorkspaceHref(params.locale, params.leagueId, params.seasonId, route);
}
