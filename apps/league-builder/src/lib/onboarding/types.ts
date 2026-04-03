export type SetupItemStatus = 'todo' | 'in_progress' | 'complete';

export interface OrganizationOnboarding {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}

export interface LeagueShellSetup {
  leagueName: string;
  description?: string;
  city: string;
  stateProvince: string;
  country: string;
  timezone: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  enableOnlinePayments: boolean;
  enablePublicWebsite: boolean;
  wantCustomDomain: boolean;
  customDomainName?: string;
}

export type SeasonRegistrationModel =
  | 'open_registration'
  | 'draft'
  | 'captain_invite_only';

export type SeasonScheduleMode = 'build_later' | 'import_csv' | 'wizard';

export interface SeasonSetup {
  seasonName: string;
  startDate: string;
  endDate: string;
  registrationType: SeasonRegistrationModel;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  carryForwardTeams: boolean;
  selectedTeamIds: string[];
  importRosters: boolean;
  teamRosterImport: Record<string, boolean>;
  previousSeasonId?: string | null;
  gamesPerCycle: number;
  maxPlayersPerTeam: number;
  allowTeamSelection: boolean;
  scheduleSetupMode: SeasonScheduleMode;
}

export interface SetupChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  status: SetupItemStatus;
  priority: number;
}

export interface SetupChecklistState {
  scope: 'organization' | 'league' | 'season';
  title: string;
  items: SetupChecklistItem[];
  completedCount: number;
  totalCount: number;
  nextActionHref: string | null;
  nextActionLabel: string | null;
}

export interface LeagueHubChecklistInput {
  leagueId: string;
  hasSeason: boolean;
  enableOnlinePayments: boolean;
  stripeReady: boolean;
  enablePublicWebsite: boolean;
  wantCustomDomain: boolean;
}

export interface SeasonWorkspaceChecklistInput {
  leagueId: string;
  seasonId: string;
  teamCount: number;
  registrationCount: number;
  rosterCount: number;
  scheduleGenerated: boolean;
  waiverTemplateConfigured: boolean;
  staffConfigured: boolean;
  playoffConfigured: boolean;
  advancedStatsEnabled: boolean;
}

export interface DashboardEntryLeagueSnapshot {
  leagueId: string;
  preferredSeasonId: string | null;
  hasAnySeason: boolean;
}

export interface DashboardEntrySnapshot {
  hasOrganization: boolean;
  leagues: DashboardEntryLeagueSnapshot[];
  storedLeagueId: string | null;
  storedSeasonId: string | null;
}
