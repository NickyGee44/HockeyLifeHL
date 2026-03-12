export type RegistrationIntent =
  | 'return_to_previous_team'
  | 'join_team'
  | 'free_agent'
  | 'captain_application';

export type TeamReturnStatus =
  | 'confirmed'
  | 'pending_team_return'
  | 'team_not_returning'
  | 'new_team_request'
  | 'not_applicable';

export interface PreviousTeamOption {
  teamId: string;
  teamName: string;
  seasonId: string;
  seasonName: string;
  wasCaptain: boolean;
  isConfirmedForSeason: boolean;
  returnStatus?: TeamReturnStatus;
}

export interface RegistrationJourneyData {
  previousTeams: PreviousTeamOption[];
  confirmedTeamIds: string[];
  teamReturnStatuses: Record<string, TeamReturnStatus>;
}

export interface RegistrationIntentMeta {
  registration_intent?: RegistrationIntent;
  requested_team_id?: string | null;
  requested_team_name?: string | null;
  previous_team_id?: string | null;
  previous_team_name?: string | null;
  previous_season_id?: string | null;
  previous_season_name?: string | null;
  team_return_status?: TeamReturnStatus;
}

export function getDefaultRegistrationIntent(
  previousTeams: PreviousTeamOption[]
): RegistrationIntent {
  return previousTeams.length > 0 ? 'return_to_previous_team' : 'free_agent';
}

export function getRegistrationTypeForIntent(
  intent: RegistrationIntent
): 'team_registration' | 'free_agent' {
  return intent === 'free_agent' ? 'free_agent' : 'team_registration';
}

export function formatRegistrationIntent(intent?: string | null): string {
  switch (intent) {
    case 'return_to_previous_team':
      return 'Returning to previous team';
    case 'join_team':
      return 'Joining a different team';
    case 'captain_application':
      return 'Captain / team application';
    case 'free_agent':
      return 'Needs a team / free agent';
    default:
      return 'Registration';
  }
}

export function getRequestedTeamId(meta: RegistrationIntentMeta): string | null {
  if (meta.registration_intent === 'return_to_previous_team') {
    return meta.previous_team_id || null;
  }

  if (meta.registration_intent === 'join_team') {
    return meta.requested_team_id || null;
  }

  return null;
}

export function getResolvedTeamReturnStatus(params: {
  intent: RegistrationIntent;
  requestedTeamId?: string | null;
  teamReturnStatuses?: Record<string, TeamReturnStatus>;
}): TeamReturnStatus {
  const { intent, requestedTeamId, teamReturnStatuses = {} } = params;

  if (intent === 'free_agent') {
    return 'not_applicable';
  }

  if (intent === 'captain_application') {
    return 'new_team_request';
  }

  if (!requestedTeamId) {
    return 'pending_team_return';
  }

  return teamReturnStatuses[requestedTeamId] || 'pending_team_return';
}

export function formatTeamReturnStatus(status?: string | null): string {
  switch (status) {
    case 'confirmed':
      return 'Team is already confirmed for this season';
    case 'pending_team_return':
      return 'Waiting on that team to confirm for the season';
    case 'team_not_returning':
      return 'That team is currently marked as not returning for this season';
    case 'new_team_request':
      return 'Waiting on league approval for a new team';
    case 'not_applicable':
      return 'No team selected yet';
    default:
      return 'Pending review';
  }
}
