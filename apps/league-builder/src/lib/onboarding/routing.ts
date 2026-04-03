import {
  type DashboardEntrySnapshot,
  type LeagueHubChecklistInput,
  type SeasonWorkspaceChecklistInput,
  type SetupChecklistItem,
  type SetupChecklistState,
} from './types';

function buildChecklistState(
  scope: SetupChecklistState['scope'],
  title: string,
  items: SetupChecklistItem[]
): SetupChecklistState {
  const ordered = [...items].sort((left, right) => left.priority - right.priority);
  const nextAction = ordered.find((item) => item.status !== 'complete') ?? null;

  return {
    scope,
    title,
    items: ordered,
    completedCount: ordered.filter((item) => item.status === 'complete').length,
    totalCount: ordered.length,
    nextActionHref: nextAction?.href ?? null,
    nextActionLabel: nextAction?.label ?? null,
  };
}

export function resolveDashboardEntryHref(
  locale: string,
  snapshot: DashboardEntrySnapshot
): string | null {
  if (!snapshot.hasOrganization) {
    return `/${locale}/setup-organization`;
  }

  if (snapshot.leagues.length === 0) {
    return `/${locale}/dashboard/leagues/new`;
  }

  if (snapshot.storedLeagueId && snapshot.storedSeasonId) {
    const storedLeague = snapshot.leagues.find((league) => league.leagueId === snapshot.storedLeagueId);
    if (storedLeague && storedLeague.preferredSeasonId === snapshot.storedSeasonId) {
      return `/${locale}/dashboard/leagues/${storedLeague.leagueId}/seasons/${snapshot.storedSeasonId}`;
    }
  }

  if (snapshot.leagues.length === 1) {
    const [league] = snapshot.leagues;

    if (league.preferredSeasonId) {
      return `/${locale}/dashboard/leagues/${league.leagueId}/seasons/${league.preferredSeasonId}`;
    }

    if (!league.hasAnySeason) {
      return `/${locale}/dashboard/leagues/${league.leagueId}/seasons/new`;
    }
  }

  return null;
}

export function buildLeagueHubChecklistState(
  input: LeagueHubChecklistInput
): SetupChecklistState {
  const items: SetupChecklistItem[] = [
    {
      id: 'season',
      label: input.hasSeason ? 'Season ready' : 'Create your first season',
      description: input.hasSeason
        ? 'The league already has an operating season workspace.'
        : 'Launch the first season so registrations, teams, and schedule work can start.',
      href: input.hasSeason
        ? `/dashboard/leagues/${input.leagueId}/seasons`
        : `/dashboard/leagues/${input.leagueId}/seasons/new`,
      status: input.hasSeason ? 'complete' : 'todo',
      priority: 1,
    },
    {
      id: 'payments',
      label: input.enableOnlinePayments ? 'Connect Stripe' : 'Payments optional',
      description: input.enableOnlinePayments
        ? input.stripeReady
          ? 'Stripe is connected and ready for player payments.'
          : 'Finish Stripe setup before collecting player fees online.'
        : 'This league is not using online payments right now.',
      href: `/dashboard/leagues/${input.leagueId}/billing`,
      status: input.enableOnlinePayments
        ? input.stripeReady
          ? 'complete'
          : 'todo'
        : 'complete',
      priority: 2,
    },
    {
      id: 'website',
      label: input.enablePublicWebsite ? 'Review website launch' : 'Website optional',
      description: input.enablePublicWebsite
        ? 'Confirm public-facing content, branding, and launch settings for this league.'
        : 'Public website publishing is disabled for now.',
      href: `/dashboard/leagues/${input.leagueId}/website`,
      status: input.enablePublicWebsite ? 'in_progress' : 'complete',
      priority: 3,
    },
    {
      id: 'domain',
      label: input.wantCustomDomain ? 'Review custom domain setup' : 'Domain later',
      description: input.wantCustomDomain
        ? 'Use the domain tools when you are ready to connect a branded domain.'
        : 'Stay on the default BLH subdomain until you need a custom domain.',
      href: `/dashboard/leagues/${input.leagueId}/settings/email-domain`,
      status: input.wantCustomDomain ? 'todo' : 'complete',
      priority: 4,
    },
    {
      id: 'migration',
      label: 'Open migration center',
      description: 'Import teams, players, schedules, and track historical migration readiness.',
      href: `/dashboard/leagues/${input.leagueId}/migration-center`,
      status: 'todo',
      priority: 5,
    },
  ];

  return buildChecklistState('league', 'League hub checklist', items);
}

export function buildSeasonWorkspaceChecklistState(
  input: SeasonWorkspaceChecklistInput
): SetupChecklistState {
  const items: SetupChecklistItem[] = [
    {
      id: 'teams',
      label: input.teamCount > 0 ? 'Teams ready' : 'Import or create teams',
      description: input.teamCount > 0
        ? `${input.teamCount} team${input.teamCount === 1 ? '' : 's'} are already attached to this season.`
        : 'Bring teams forward or create a fresh set of season participants.',
      href: `/dashboard/leagues/${input.leagueId}/seasons/${input.seasonId}/teams`,
      status: input.teamCount > 0 ? 'complete' : 'todo',
      priority: 1,
    },
    {
      id: 'registrations',
      label: input.registrationCount > 0 ? 'Registration flow is active' : 'Review registrations',
      description: input.registrationCount > 0
        ? `${input.registrationCount} registration submission${input.registrationCount === 1 ? '' : 's'} are already in motion.`
        : 'Open registrations, import players, or confirm your intake setup.',
      href: `/dashboard/leagues/${input.leagueId}/seasons/${input.seasonId}/registrations`,
      status: input.registrationCount > 0 ? 'in_progress' : 'todo',
      priority: 2,
    },
    {
      id: 'rosters',
      label: input.rosterCount > 0 ? 'Player rosters started' : 'Import players or rosters',
      description: input.rosterCount > 0
        ? `${input.rosterCount} roster spot${input.rosterCount === 1 ? '' : 's'} already exist for this season.`
        : 'Import players, carry forward rosters, or add them season by season.',
      href: `/dashboard/leagues/${input.leagueId}/seasons/${input.seasonId}/rosters`,
      status: input.rosterCount > 0 ? 'in_progress' : 'todo',
      priority: 3,
    },
    {
      id: 'waiver',
      label: input.waiverTemplateConfigured ? 'Waiver configured' : 'Set up waiver',
      description: input.waiverTemplateConfigured
        ? 'A waiver template is available for player registration.'
        : 'Publish a waiver before registrations ramp up.',
      href: `/dashboard/leagues/${input.leagueId}/settings/waiver`,
      status: input.waiverTemplateConfigured ? 'complete' : 'todo',
      priority: 4,
    },
    {
      id: 'staff',
      label: input.staffConfigured ? 'Officials and staffing started' : 'Add officials or scorekeepers',
      description: input.staffConfigured
        ? 'Referees or scorekeepers are already configured for league operations.'
        : 'Add staff when you are ready to cover games and assignments.',
      href: `/dashboard/leagues/${input.leagueId}/staff`,
      status: input.staffConfigured ? 'in_progress' : 'todo',
      priority: 5,
    },
    {
      id: 'schedule',
      label: input.scheduleGenerated ? 'Schedule generated' : 'Build or import schedule',
      description: input.scheduleGenerated
        ? 'Games are already on the calendar for this season.'
        : 'Use the schedule workspace to import CSV or build the schedule.',
      href: `/dashboard/leagues/${input.leagueId}/seasons/${input.seasonId}/schedule`,
      status: input.scheduleGenerated ? 'complete' : 'todo',
      priority: 6,
    },
    {
      id: 'playoffs',
      label: input.playoffConfigured ? 'Playoff setup started' : 'Review playoffs later',
      description: input.playoffConfigured
        ? 'Playoff structure is already taking shape.'
        : 'Leave playoffs for later unless you need bracket structure immediately.',
      href: `/dashboard/leagues/${input.leagueId}/seasons/${input.seasonId}/playoffs`,
      status: input.playoffConfigured ? 'in_progress' : 'todo',
      priority: 7,
    },
    {
      id: 'stats',
      label: input.advancedStatsEnabled ? 'Advanced stats enabled' : 'Advanced stats optional',
      description: input.advancedStatsEnabled
        ? 'Advanced stats are enabled for deeper reporting.'
        : 'Turn this on later if the league wants deeper stat tracking.',
      href: `/dashboard/leagues/${input.leagueId}/seasons/${input.seasonId}/ratings`,
      status: input.advancedStatsEnabled ? 'complete' : 'todo',
      priority: 8,
    },
    {
      id: 'migration',
      label: 'Open migration center',
      description: 'Use the guided migration tools for imported teams, players, schedules, and historical data.',
      href: `/dashboard/leagues/${input.leagueId}/migration-center`,
      status: 'todo',
      priority: 9,
    },
  ];

  return buildChecklistState('season', 'Season launch checklist', items);
}

export function isFocusedDashboardFlow(pathname: string): boolean {
  return (
    /\/dashboard\/leagues\/new(?:\/)?$/i.test(pathname) ||
    /\/dashboard\/leagues\/[0-9a-f-]{36}\/seasons\/new(?:\/)?$/i.test(pathname)
  );
}
