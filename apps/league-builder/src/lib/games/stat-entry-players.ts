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

export type StatEntryAttendanceStatus =
  | 'checked_in'
  | 'tentative'
  | 'no_response'
  | 'spare'
  | 'out';

export interface StatEntryPlayerOption {
  id: string;
  full_name: string;
  jersey_number: number;
  team_id: string;
  position: string;
  attendance_status: StatEntryAttendanceStatus;
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

function isTentativeStatus(status: string | null | undefined): boolean {
  return status === 'tentative';
}

function isOutStatus(status: string | null | undefined): boolean {
  return status === 'out';
}

function isAcceptedInvitation(status: string | null | undefined): boolean {
  return status === 'accepted';
}

type StatEntryRosterCategory = 'regular' | 'spare';

function getRosterCategory(row: StatEntryRosterRow): StatEntryRosterCategory | null {
  if (row.player_type === 'regular') return 'regular';
  if (row.player_type === 'sub' || row.player_type === 'part_time') return 'spare';
  return null;
}

function buildTeamPlayerKey(teamId: string | null, playerId: string | null): string | null {
  if (!teamId || !playerId) return null;
  return `${teamId}:${playerId}`;
}

const ATTENDANCE_ORDER: Record<StatEntryAttendanceStatus, number> = {
  checked_in: 0,
  tentative: 1,
  no_response: 2,
  spare: 3,
  out: 4,
};

function comparePlayerOptions(
  left: StatEntryPlayerOption,
  right: StatEntryPlayerOption,
): number {
  const attendanceDifference = (
    ATTENDANCE_ORDER[left.attendance_status] - ATTENDANCE_ORDER[right.attendance_status]
  );
  if (attendanceDifference !== 0) return attendanceDifference;

  const leftHasNumber = left.jersey_number > 0;
  const rightHasNumber = right.jersey_number > 0;
  if (leftHasNumber !== rightHasNumber) return leftHasNumber ? -1 : 1;

  if (leftHasNumber && left.jersey_number !== right.jersey_number) {
    return left.jersey_number - right.jersey_number;
  }

  return left.full_name.localeCompare(right.full_name) || left.id.localeCompare(right.id);
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

  const tentativeCheckins = new Set(
    checkinRows
      .filter((row) => isTentativeStatus(row.status))
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
    if (!key || seen.has(key)) continue;

    const rosterCategory = getRosterCategory(row);
    if (!rosterCategory) continue;

    const hasInCheckin = inCheckins.has(key);
    const hasAcceptedInvitation = acceptedInvitations.has(key);
    if (rosterCategory === 'spare' && !hasAcceptedInvitation) continue;

    seen.add(key);
    options.push({
      id: row.player_id!,
      full_name: readProfileName(row),
      jersey_number: row.jersey_number ?? 0,
      team_id: row.team_id!,
      position: row.position || 'Forward',
      attendance_status: outCheckins.has(key)
        ? 'out'
        : rosterCategory === 'spare'
          ? 'spare'
          : hasInCheckin
            ? 'checked_in'
            : tentativeCheckins.has(key)
              ? 'tentative'
              : 'no_response',
    });
  }

  for (const row of subInvitationRows) {
    const key = buildTeamPlayerKey(row.team_id, row.invited_player_id);
    if (!key || seen.has(key)) continue;
    if (!acceptedInvitations.has(key)) continue;

    seen.add(key);
    options.push({
      id: row.invited_player_id!,
      full_name: readInvitedPlayerName(row),
      jersey_number: 0,
      team_id: row.team_id!,
      position: 'Forward',
      attendance_status: outCheckins.has(key) ? 'out' : 'spare',
    });
  }

  return options.sort(comparePlayerOptions);
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
