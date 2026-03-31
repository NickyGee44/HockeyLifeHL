import { describe, expect, it } from '@jest/globals';

import {
  buildTeamDetailBackHref,
  buildTeamDetailHref,
} from '../workspace-routes';

describe('workspace route helpers', () => {
  it('builds a season-aware team detail href', () => {
    const href = buildTeamDetailHref({
      locale: 'en',
      teamId: 'team-123',
      tab: 'roster',
      leagueId: 'league-456',
      seasonId: 'season-789',
      from: 'season-rosters',
    });

    expect(href).toBe(
      '/en/dashboard/teams/team-123?tab=roster&leagueId=league-456&seasonId=season-789&from=season-rosters'
    );
  });

  it('builds the season rosters back href for season roster entrypoints', () => {
    const href = buildTeamDetailBackHref({
      leagueId: 'league-456',
      seasonId: 'season-789',
      from: 'season-rosters',
    });

    expect(href).toBe('/dashboard/leagues/league-456/seasons/season-789/rosters');
  });

  it('falls back to teams and divisions when no season roster source is present', () => {
    const href = buildTeamDetailBackHref({
      leagueId: 'league-456',
      seasonId: null,
      from: null,
    });

    expect(href).toBe('/dashboard/leagues/league-456/teams-divisions');
  });
});
