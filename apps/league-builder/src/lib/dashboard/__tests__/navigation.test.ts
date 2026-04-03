import {
  buildDashboardNavigation,
  getDashboardAutoExpandedGroups,
  getDashboardContextSwitchHref,
} from '@/lib/dashboard/navigation';

const t = (key: string) => key;

describe('dashboard navigation', () => {
  it('builds owner-first sections with season, league, and organization scopes', () => {
    const navigation = buildDashboardNavigation({
      locale: '',
      leagueId: 'league-1',
      seasonId: 'season-1',
      isSubscribed: true,
      captainTeams: [],
      isPlatformAdmin: false,
      t,
    });

    expect(navigation.map((section) => section.id)).toEqual([
      'season',
      'league',
      'support',
      'organization',
    ]);
  });

  it('auto-expands the proper season group for playoff routes', () => {
    const navigation = buildDashboardNavigation({
      locale: '',
      leagueId: 'league-1',
      seasonId: 'season-1',
      isSubscribed: true,
      captainTeams: [],
      isPlatformAdmin: false,
      t,
    });

    const expanded = getDashboardAutoExpandedGroups(
      '/en/dashboard/leagues/league-1/seasons/season-1/playoffs',
      'en',
      navigation
    );

    expect(expanded.has('season-more-tools')).toBe(true);
  });

  it('preserves league-scope destinations when switching leagues', () => {
    expect(
      getDashboardContextSwitchHref({
        locale: 'en',
        pathname: '/en/dashboard/leagues/league-a/finance',
        currentLeagueId: 'league-a',
        targetLeagueId: 'league-b',
        preferredSeasonId: null,
      })
    ).toBe('/en/dashboard/leagues/league-b/finance');
  });

  it('preserves the current season tool when switching leagues with a preferred season', () => {
    expect(
      getDashboardContextSwitchHref({
        locale: 'en',
        pathname: '/en/dashboard/leagues/league-a/seasons/season-a/teams',
        currentLeagueId: 'league-a',
        targetLeagueId: 'league-b',
        preferredSeasonId: 'season-b',
      })
    ).toBe('/en/dashboard/leagues/league-b/seasons/season-b/teams');
  });
});
