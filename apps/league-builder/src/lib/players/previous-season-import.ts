export interface PreviousSeasonImportProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface PreviousSeasonImportRegistrationRow {
  player_id: string;
  team_id: string | null;
  assigned_team_id: string | null;
  preferred_position: string | null;
  preferred_jersey_number: number | null;
  registration_type: string | null;
  submitted_at: string | null;
  created_at: string | null;
}

export interface PreviousSeasonImportRosterRow {
  player_id: string;
  team_id: string | null;
  position: string | null;
  jersey_number: number | null;
  status: string | null;
  joined_at: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ImportablePreviousSeasonPlayer {
  playerId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  teamId: string | null;
  teamName: string | null;
  position: string | null;
  jerseyNumber: number | null;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  alreadyInTargetSeason: boolean;
}

function toTimestamp(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue;
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return 0;
}

function normalizeRegistrationType(
  raw: string | null | undefined,
  hasTeam: boolean
): 'team_registration' | 'free_agent' | 'individual' {
  if (hasTeam) {
    return 'team_registration';
  }

  if (raw === 'team_registration') {
    return 'free_agent';
  }

  if (raw === 'free_agent' || raw === 'individual') {
    return raw;
  }

  return 'free_agent';
}

export function buildImportablePreviousSeasonPlayers(params: {
  profiles: PreviousSeasonImportProfile[];
  registrations: PreviousSeasonImportRegistrationRow[];
  rosters: PreviousSeasonImportRosterRow[];
  teamNameById: Map<string, string | null>;
  existingTargetPlayerIds: Set<string>;
  eligibleTargetTeamIds: Set<string>;
}): ImportablePreviousSeasonPlayer[] {
  const registrationByPlayer = new Map<string, PreviousSeasonImportRegistrationRow>();
  const rosterByPlayer = new Map<string, PreviousSeasonImportRosterRow>();

  for (const registration of params.registrations) {
    const current = registrationByPlayer.get(registration.player_id);

    if (
      !current ||
      toTimestamp(registration.submitted_at, registration.created_at) >
        toTimestamp(current.submitted_at, current.created_at)
    ) {
      registrationByPlayer.set(registration.player_id, registration);
    }
  }

  for (const roster of params.rosters) {
    const current = rosterByPlayer.get(roster.player_id);

    if (
      !current ||
      toTimestamp(roster.joined_at, roster.start_date) >
        toTimestamp(current.joined_at, current.start_date)
    ) {
      rosterByPlayer.set(roster.player_id, roster);
    }
  }

  return params.profiles
    .map((profile) => {
      const registration = registrationByPlayer.get(profile.id);
      const roster = rosterByPlayer.get(profile.id);

      if (!registration && !roster) {
        return null;
      }

      const sourceTeamId =
        roster?.team_id ?? registration?.assigned_team_id ?? registration?.team_id ?? null;
      const teamId =
        sourceTeamId && params.eligibleTargetTeamIds.has(sourceTeamId) ? sourceTeamId : null;
      const teamName = sourceTeamId ? params.teamNameById.get(sourceTeamId) ?? null : null;
      const fullName = profile.full_name?.trim() || profile.email?.trim() || 'Unknown player';

      return {
        playerId: profile.id,
        fullName,
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        avatarUrl: profile.avatar_url ?? null,
        teamId,
        teamName,
        position: roster?.position ?? registration?.preferred_position ?? null,
        jerseyNumber: roster?.jersey_number ?? registration?.preferred_jersey_number ?? null,
        registrationType: normalizeRegistrationType(registration?.registration_type, Boolean(teamId)),
        alreadyInTargetSeason: params.existingTargetPlayerIds.has(profile.id),
      } satisfies ImportablePreviousSeasonPlayer;
    })
    .filter((player): player is ImportablePreviousSeasonPlayer => Boolean(player))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
