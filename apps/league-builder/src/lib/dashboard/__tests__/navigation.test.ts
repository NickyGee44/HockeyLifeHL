import {
  buildDashboardNavigation,
  flattenDashboardNavigation,
  getDashboardAutoExpandedGroups,
  getDashboardContextSwitchHref,
  getDashboardMobileTabs,
  getDashboardPrimaryItems,
} from '@/lib/dashboard/navigation';
import { buildCommandPalettePages } from '@/lib/dashboard/command-palette';
import { isLegacyDashboardNavigationHref } from '@/lib/dashboard/route-policy';

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

    expect(expanded.has('season-core')).toBe(true);
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

  it('keeps teams as the single season people destination in navigation', () => {
    const navigation = buildDashboardNavigation({
      locale: '',
      leagueId: 'league-1',
      seasonId: 'season-1',
      isSubscribed: true,
      captainTeams: [],
      isPlatformAdmin: false,
      t,
    });

    const items = flattenDashboardNavigation(navigation);
    const itemIds = items.map((item) => item.id);

    expect(itemIds).toContain('season-teams-item');
    expect(itemIds).not.toContain('season-players');
    expect(itemIds).not.toContain('season-rosters');

    const teamsItem = items.find((item) => item.id === 'season-teams-item');
    expect(teamsItem?.matchPrefixes).toEqual(
      expect.arrayContaining([
        '/dashboard/leagues/league-1/seasons/season-1/teams',
        '/dashboard/leagues/league-1/seasons/season-1/players',
        '/dashboard/leagues/league-1/seasons/season-1/rosters',
      ])
    );
  });

  it('keeps navigation hrefs off known legacy redirect routes', () => {
    const navigation = buildDashboardNavigation({
      locale: '',
      leagueId: 'league-1',
      seasonId: 'season-1',
      isSubscribed: true,
      captainTeams: [],
      isPlatformAdmin: false,
      t,
    });

    const hrefs = flattenDashboardNavigation(navigation).map((item) => item.href);
    expect(hrefs.filter((href) => isLegacyDashboardNavigationHref(href))).toEqual([]);
  });

  it('keeps command palette hrefs off known legacy redirect routes', () => {
    const hrefs = buildCommandPalettePages({
      t,
      leagueId: 'league-1',
      seasonId: 'season-1',
    }).map((item) => item.href);

    expect(hrefs.filter((href) => isLegacyDashboardNavigationHref(href))).toEqual([]);
  });

  it('keeps platform admin entry inside the organization section instead of adding a standalone admin section', () => {
    const navigation = buildDashboardNavigation({
      locale: '',
      leagueId: 'league-1',
      seasonId: 'season-1',
      isSubscribed: true,
      captainTeams: [],
      isPlatformAdmin: true,
      t,
    });

    expect(navigation.map((section) => section.id)).toEqual([
      'season',
      'league',
      'organization',
    ]);

    const organizationSection = navigation.find((section) => section.id === 'organization');
    const itemIds = flattenDashboardNavigation([organizationSection!]).map((item) => item.id);

    expect(itemIds).toContain('admin-home');
  });

  it('keeps mobile tabs and command palette aligned to the shared season primary workflows', () => {
    const navigation = buildDashboardNavigation({
      locale: '',
      leagueId: 'league-1',
      seasonId: 'season-1',
      isSubscribed: true,
      captainTeams: [],
      isPlatformAdmin: false,
      t,
    });

    const primarySeasonHrefs = getDashboardPrimaryItems('season', navigation).map((item) => item.href);
    const mobileTabHrefs = getDashboardMobileTabs('season', navigation).map((item) => item.href);
    const commandPaletteHrefs = buildCommandPalettePages({
      t,
      leagueId: 'league-1',
      seasonId: 'season-1',
    })
      .slice(-primarySeasonHrefs.length)
      .map((item) => item.href);

    expect(mobileTabHrefs).toEqual(primarySeasonHrefs);
    expect(commandPaletteHrefs).toEqual(primarySeasonHrefs);
  });
});
