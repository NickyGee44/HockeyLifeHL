export type LineupAvailability = 'confirmed' | 'tentative' | 'out' | 'no_response';
export type GameTeamLineupStatus = 'draft' | 'published';

export interface LineupRosterPlayer {
  playerId: string;
  fullName: string | null;
  avatarUrl: string | null;
  jerseyNumber: number | null;
  position: string | null;
  availability: LineupAvailability;
  isSub?: boolean;
}

export interface LineupPlacedPlayer {
  playerId: string;
  x: number;
  y: number;
}

export interface GameTeamLineupLayout {
  version: 1;
  roster: LineupRosterPlayer[];
  placedPlayers: LineupPlacedPlayer[];
}

export interface TeamLineupIdentity {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface GameLineupEditorData {
  game: {
    id: string;
    leagueId: string;
    leagueSlug: string;
    scheduledAt: string;
    venue: string | null;
    status: string;
    team: TeamLineupIdentity;
    opponent: TeamLineupIdentity;
    isHome: boolean;
  };
  lineup: {
    id: string | null;
    status: GameTeamLineupStatus;
    formation: string | null;
    layout: GameTeamLineupLayout;
    publishedAt: string | null;
    updatedAt: string | null;
  };
}

export interface PublishedGameTeamLineup {
  id: string;
  gameId: string;
  teamId: string;
  status: GameTeamLineupStatus;
  formation: string | null;
  layout: GameTeamLineupLayout;
  publishedAt: string | null;
  updatedAt: string | null;
  team: TeamLineupIdentity;
}

export const DEFAULT_LINEUP_VERSION = 1 as const;

const DEFAULT_PLACEMENT_COORDS = {
  goalie: { x: 50, y: 86 },
  leftDefense: { x: 35, y: 70 },
  rightDefense: { x: 65, y: 70 },
  center: { x: 50, y: 56 },
  leftWing: { x: 26, y: 44 },
  rightWing: { x: 74, y: 44 },
  utilityOne: { x: 38, y: 28 },
  utilityTwo: { x: 62, y: 28 },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function isGoaliePosition(position: string | null | undefined) {
  if (!position) return false;
  const normalized = position.toLowerCase();
  return normalized === 'g' || normalized === 'goalie';
}

function normalizeAvailabilityOrder(value: LineupAvailability) {
  switch (value) {
    case 'confirmed':
      return 0;
    case 'tentative':
      return 1;
    case 'no_response':
      return 2;
    case 'out':
      return 3;
    default:
      return 4;
  }
}

function normalizePositionBucket(position: string | null | undefined) {
  if (!position) return 'utility';
  const normalized = position.toLowerCase();
  if (normalized === 'g' || normalized === 'goalie') return 'goalie';
  if (normalized === 'c' || normalized === 'center') return 'center';
  if (normalized === 'lw' || normalized === 'left wing') return 'leftWing';
  if (normalized === 'rw' || normalized === 'right wing') return 'rightWing';
  if (normalized === 'ld' || normalized === 'left defense') return 'leftDefense';
  if (normalized === 'rd' || normalized === 'right defense') return 'rightDefense';
  if (normalized === 'd' || normalized === 'defense' || normalized === 'defenceman') return 'defense';
  if (normalized === 'f' || normalized === 'forward') return 'forward';
  return 'utility';
}

export function sortLineupRoster(players: LineupRosterPlayer[]) {
  return [...players].sort((left, right) => {
    const availabilitySort =
      normalizeAvailabilityOrder(left.availability) - normalizeAvailabilityOrder(right.availability);
    if (availabilitySort !== 0) {
      return availabilitySort;
    }

    const goalieSort = Number(isGoaliePosition(right.position)) - Number(isGoaliePosition(left.position));
    if (goalieSort !== 0) {
      return goalieSort;
    }

    if (left.jerseyNumber !== null && right.jerseyNumber !== null && left.jerseyNumber !== right.jerseyNumber) {
      return left.jerseyNumber - right.jerseyNumber;
    }

    return (left.fullName || '').localeCompare(right.fullName || '');
  });
}

function isEligibleLineupPlayer(player: LineupRosterPlayer) {
  return player.availability === 'confirmed' || player.isSub === true;
}

export function buildDefaultLineupLayout(roster: LineupRosterPlayer[]): GameTeamLineupLayout {
  const sortedRoster = sortLineupRoster(roster);
  const eligiblePlayers = sortedRoster.filter(isEligibleLineupPlayer);
  const goalies = eligiblePlayers.filter((player) => isGoaliePosition(player.position));
  const skaters = eligiblePlayers.filter((player) => !isGoaliePosition(player.position));

  const placedPlayers: LineupPlacedPlayer[] = [];
  const placed = new Set<string>();

  const placePlayer = (player: LineupRosterPlayer | undefined, coords: { x: number; y: number }) => {
    if (!player || placed.has(player.playerId)) return;
    placed.add(player.playerId);
    placedPlayers.push({
      playerId: player.playerId,
      x: coords.x,
      y: coords.y,
    });
  };

  placePlayer(goalies[0], DEFAULT_PLACEMENT_COORDS.goalie);

  const bucketQueues = {
    center: skaters.filter((player) => normalizePositionBucket(player.position) === 'center'),
    leftWing: skaters.filter((player) => normalizePositionBucket(player.position) === 'leftWing'),
    rightWing: skaters.filter((player) => normalizePositionBucket(player.position) === 'rightWing'),
    leftDefense: skaters.filter((player) => normalizePositionBucket(player.position) === 'leftDefense'),
    rightDefense: skaters.filter((player) => normalizePositionBucket(player.position) === 'rightDefense'),
    defense: skaters.filter((player) => normalizePositionBucket(player.position) === 'defense'),
    forward: skaters.filter((player) => normalizePositionBucket(player.position) === 'forward'),
    utility: skaters.filter((player) => normalizePositionBucket(player.position) === 'utility'),
  };

  placePlayer(bucketQueues.center.shift(), DEFAULT_PLACEMENT_COORDS.center);
  placePlayer(bucketQueues.leftWing.shift() || bucketQueues.forward.shift(), DEFAULT_PLACEMENT_COORDS.leftWing);
  placePlayer(bucketQueues.rightWing.shift() || bucketQueues.forward.shift(), DEFAULT_PLACEMENT_COORDS.rightWing);
  placePlayer(bucketQueues.leftDefense.shift() || bucketQueues.defense.shift(), DEFAULT_PLACEMENT_COORDS.leftDefense);
  placePlayer(bucketQueues.rightDefense.shift() || bucketQueues.defense.shift(), DEFAULT_PLACEMENT_COORDS.rightDefense);

  const fallbackQueue = skaters.filter((player) => !placed.has(player.playerId));
  placePlayer(fallbackQueue.shift(), DEFAULT_PLACEMENT_COORDS.utilityOne);
  placePlayer(fallbackQueue.shift(), DEFAULT_PLACEMENT_COORDS.utilityTwo);

  return {
    version: DEFAULT_LINEUP_VERSION,
    roster: sortedRoster,
    placedPlayers,
  };
}

export function normalizeLineupLayout(
  input: unknown,
  roster: LineupRosterPlayer[]
): GameTeamLineupLayout {
  const fallback = buildDefaultLineupLayout(roster);

  if (!input || typeof input !== 'object') {
    return fallback;
  }

  const inputRecord = input as Record<string, unknown>;
  const eligibleRoster = sortLineupRoster(roster).filter(isEligibleLineupPlayer);
  const rosterIds = new Set(eligibleRoster.map((player) => player.playerId));
  const seen = new Set<string>();

  const placedPlayers = Array.isArray(inputRecord.placedPlayers)
    ? inputRecord.placedPlayers
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const record = entry as Record<string, unknown>;
          const playerId = typeof record.playerId === 'string' ? record.playerId : null;
          const rawX = typeof record.x === 'number' ? record.x : null;
          const rawY = typeof record.y === 'number' ? record.y : null;

          if (!playerId || rawX === null || rawY === null || !rosterIds.has(playerId) || seen.has(playerId)) {
            return null;
          }

          seen.add(playerId);
          return {
            playerId,
            x: clamp(rawX, 8, 92),
            y: clamp(rawY, 10, 92),
          } satisfies LineupPlacedPlayer;
        })
        .filter((entry): entry is LineupPlacedPlayer => entry !== null)
    : [];

  return {
    version: DEFAULT_LINEUP_VERSION,
    roster: eligibleRoster,
    placedPlayers: placedPlayers.length > 0 ? placedPlayers : fallback.placedPlayers,
  };
}

export function getBenchPlayers(layout: GameTeamLineupLayout) {
  const placedIds = new Set(layout.placedPlayers.map((player) => player.playerId));
  return layout.roster.filter((player) => isEligibleLineupPlayer(player) && !placedIds.has(player.playerId));
}
