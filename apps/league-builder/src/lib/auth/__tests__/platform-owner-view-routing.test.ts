import { describe, expect, it } from '@jest/globals';
import {
  buildLeagueScopedDashboardTarget,
  buildPlatformOwnerViewHref,
  normalizePlatformOwnerViewTarget,
} from '../platform-owner-view-routing';

describe('platform owner view routing helpers', () => {
  it('strips locale prefixes from redirect targets', () => {
    expect(
      normalizePlatformOwnerViewTarget(
        '/en/dashboard/leagues/league-1/migration-center',
        '/dashboard/leagues/league-1'
      )
    ).toBe('/dashboard/leagues/league-1/migration-center');
  });

  it('falls back for invalid or external redirect targets', () => {
    expect(normalizePlatformOwnerViewTarget('https://evil.example', '/dashboard/leagues/league-1')).toBe(
      '/dashboard/leagues/league-1'
    );
    expect(normalizePlatformOwnerViewTarget('//evil.example', '/dashboard/leagues/league-1')).toBe(
      '/dashboard/leagues/league-1'
    );
  });

  it('builds an owner-view entry path for the requested redirect target', () => {
    expect(
      buildPlatformOwnerViewHref({
        leagueId: 'league-1',
        redirectTo: '/dashboard/leagues/league-1/migration-center',
      })
    ).toBe(
      '/dashboard/admin/owner-view?leagueId=league-1&redirectTo=%2Fdashboard%2Fleagues%2Fleague-1%2Fmigration-center'
    );
  });

  it('defaults to the league dashboard when no redirect target is supplied', () => {
    expect(buildPlatformOwnerViewHref({ leagueId: 'league-1' })).toBe(
      '/dashboard/admin/owner-view?leagueId=league-1'
    );
  });

  it('keeps the current league-scoped dashboard section when switching leagues', () => {
    expect(
      buildLeagueScopedDashboardTarget({
        pathname: '/en/dashboard/leagues/league-1/teams-divisions',
        search: 'tab=roster',
        leagueId: 'league-2',
      })
    ).toBe('/dashboard/leagues/league-2/teams-divisions?tab=roster');
  });

  it('falls back to the league overview from non-league routes', () => {
    expect(
      buildLeagueScopedDashboardTarget({
        pathname: '/en/dashboard/admin',
        leagueId: 'league-2',
      })
    ).toBe('/dashboard/leagues/league-2');
  });
});
