import {
  buildLeagueHubChecklistState,
  buildSeasonWorkspaceChecklistState,
  resolveDashboardEntryHref,
} from '@/lib/onboarding/routing';

describe('resolveDashboardEntryHref', () => {
  it('routes users without an organization to setup', () => {
    expect(
      resolveDashboardEntryHref('en', {
        hasOrganization: false,
        leagues: [],
        storedLeagueId: null,
        storedSeasonId: null,
      })
    ).toBe('/en/setup-organization');
  });

  it('routes users with no leagues to league shell onboarding', () => {
    expect(
      resolveDashboardEntryHref('en', {
        hasOrganization: true,
        leagues: [],
        storedLeagueId: null,
        storedSeasonId: null,
      })
    ).toBe('/en/dashboard/leagues/new');
  });

  it('routes a single league without seasons into the first-season wizard', () => {
    expect(
      resolveDashboardEntryHref('en', {
        hasOrganization: true,
        leagues: [
          {
            leagueId: 'league-1',
            preferredSeasonId: null,
            hasAnySeason: false,
          },
        ],
        storedLeagueId: null,
        storedSeasonId: null,
      })
    ).toBe('/en/dashboard/leagues/league-1/seasons/new');
  });

  it('routes a single league with a preferred season into the season workspace', () => {
    expect(
      resolveDashboardEntryHref('en', {
        hasOrganization: true,
        leagues: [
          {
            leagueId: 'league-1',
            preferredSeasonId: 'season-1',
            hasAnySeason: true,
          },
        ],
        storedLeagueId: null,
        storedSeasonId: null,
      })
    ).toBe('/en/dashboard/leagues/league-1/seasons/season-1');
  });
});

describe('checklist builders', () => {
  it('marks Stripe and migration as the next league-hub action when payments are enabled but not connected', () => {
    const checklist = buildLeagueHubChecklistState({
      leagueId: 'league-1',
      hasSeason: true,
      enableOnlinePayments: true,
      stripeReady: false,
      enablePublicWebsite: true,
      wantCustomDomain: true,
    });

    expect(checklist.scope).toBe('league');
    expect(checklist.completedCount).toBe(1);
    expect(checklist.nextActionLabel).toBe('Connect Stripe');
  });

  it('orders season launch tasks from teams through migration', () => {
    const checklist = buildSeasonWorkspaceChecklistState({
      leagueId: 'league-1',
      seasonId: 'season-1',
      teamCount: 0,
      registrationCount: 0,
      rosterCount: 0,
      scheduleGenerated: false,
      waiverTemplateConfigured: false,
      staffConfigured: false,
      playoffConfigured: false,
      advancedStatsEnabled: false,
    });

    expect(checklist.scope).toBe('season');
    expect(checklist.items[0]?.id).toBe('teams');
    expect(checklist.items.find((item) => item.id === 'playoffs')?.href).toBe(
      '/dashboard/leagues/league-1/seasons/season-1/playoffs'
    );
    expect(checklist.items.at(-1)?.id).toBe('migration');
    expect(checklist.nextActionLabel).toBe('Import or create teams');
  });
});
