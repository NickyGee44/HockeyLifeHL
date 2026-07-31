export const SPARE_PLAYER_OPTION_ID = '__spare__';

export interface StatEntryRosterRow {
  player_id: string | null;
  team_id: string | null;
  jersey_number: number | null;
  position: string | null;
  player_type?: string | null;
  profiles?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
}

export interface StatEntryCheckinRow {
  player_id: string | null;
  team_id: string | null;
  status: string | null;
}

export interface StatEntrySubInvitationRow {
  invited_player_id: string | null;
  team_id: string | null;
  status: string | null;
  invited_player?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
}

export interface StatEntryPlayerOption {
  id: string;
  full_name: string;
  jersey_number: number;
  team_id: string;
  position: string;
}

export interface NormalizedGoalParticipantIds {
  playerId: string | null;
  assist1PlayerId?: string;
  assist2PlayerId?: string;
}

function readProfileName(row: StatEntryRosterRow): string {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return profile?.full_name || 'Unknown';
}

function readInvitedPlayerName(row: StatEntrySubInvitationRow): string {
  const profile = Array.isArray(row.invited_player) ? row.invited_player[0] : row.invited_player;
  return profile?.full_name || 'Unknown';
}

function isInStatus(status: string | null | undefined): boolean {
  return status === 'confirmed' || status === 'in';
}

function isOutStatus(status: string | null | undefined): boolean {
  return status === 'out';
}

function isAcceptedInvitation(status: string | null | undefined): boolean {
  return status === 'accepted';
}

function isSubRosterRow(row: StatEntryRosterRow): boolean {
  return row.player_type === 'sub';
}

function buildTeamPlayerKey(teamId: string | null, playerId: string | null): string | null {
  if (!teamId || !playerId) return null;
  return `${teamId}:${playerId}`;
}

export function buildStatEntryPlayerOptions({
  rosterRows,
  checkinRows,
  subInvitationRows,
}: {
  rosterRows: StatEntryRosterRow[];
  checkinRows: StatEntryCheckinRow[];
  subInvitationRows: StatEntrySubInvitationRow[];
}): StatEntryPlayerOption[] {
  const inCheckins = new Set(
    checkinRows
      .filter((row) => isInStatus(row.status))
      .map((row) => buildTeamPlayerKey(row.team_id, row.player_id))
      .filter((key): key is string => Boolean(key)),
  );

  const outCheckins = new Set(
    checkinRows
      .filter((row) => isOutStatus(row.status))
      .map((row) => buildTeamPlayerKey(row.team_id, row.player_id))
      .filter((key): key is string => Boolean(key)),
  );

  const acceptedInvitations = new Set(
    subInvitationRows
      .filter((row) => isAcceptedInvitation(row.status))
      .map((row) => buildTeamPlayerKey(row.team_id, row.invited_player_id))
      .filter((key): key is string => Boolean(key)),
  );

  const seen = new Set<string>();
  const options: StatEntryPlayerOption[] = [];

  for (const row of rosterRows) {
    const key = buildTeamPlayerKey(row.team_id, row.player_id);
    if (!key || seen.has(key) || outCheckins.has(key)) continue;

    const hasInCheckin = inCheckins.has(key);
    const hasAcceptedInvitation = acceptedInvitations.has(key);
    const eligible = isSubRosterRow(row) ? hasInCheckin && hasAcceptedInvitation : hasInCheckin;
    if (!eligible) continue;

    seen.add(key);
    options.push({
      id: row.player_id!,
      full_name: readProfileName(row),
      jersey_number: row.jersey_number ?? 0,
      team_id: row.team_id!,
      position: row.position || 'Forward',
    });
  }

  for (const row of subInvitationRows) {
    const key = buildTeamPlayerKey(row.team_id, row.invited_player_id);
    if (!key || seen.has(key) || outCheckins.has(key)) continue;
    if (!acceptedInvitations.has(key) || !inCheckins.has(key)) continue;

    seen.add(key);
    options.push({
      id: row.invited_player_id!,
      full_name: readInvitedPlayerName(row),
      jersey_number: 0,
      team_id: row.team_id!,
      position: 'Forward',
    });
  }

  return options;
}

function isRealPlayerSelection(value: string | null | undefined): value is string {
  return Boolean(value && value !== 'none' && value !== SPARE_PLAYER_OPTION_ID);
}

export function normalizeGoalParticipantIds({
  scorerId,
  assist1Id,
  assist2Id,
}: {
  scorerId: string;
  assist1Id?: string | null;
  assist2Id?: string | null;
}): NormalizedGoalParticipantIds {
  const playerId = scorerId === SPARE_PLAYER_OPTION_ID ? null : scorerId;
  const assists = [assist1Id, assist2Id]
    .filter(isRealPlayerSelection)
    .filter((assistId, index, values) => values.indexOf(assistId) === index)
    .filter((assistId) => assistId !== playerId);

  return {
    playerId,
    assist1PlayerId: assists[0],
    assist2PlayerId: assists[1],
  };
}
