import type { LineupSlotType } from './types';

export const BASE_FORWARD_SLOTS = 6;
export const BASE_DEFENCE_SLOTS = 4;
export const EXTENDED_FORWARD_SLOTS = 9;
export const EXTENDED_DEFENCE_SLOTS = 6;
export const GOALIE_SLOTS = 1;
export const EXTENDED_LINEUP_THRESHOLD = 11;

export const FORWARD_COORDS_BASE = [
  { x: 28, y: 22 },
  { x: 50, y: 22 },
  { x: 72, y: 22 },
  { x: 28, y: 38 },
  { x: 50, y: 38 },
  { x: 72, y: 38 },
] as const;

export const FORWARD_COORDS_EXTENDED = [
  ...FORWARD_COORDS_BASE,
  { x: 28, y: 48 },
  { x: 50, y: 48 },
  { x: 72, y: 48 },
] as const;

export const DEFENCE_COORDS_BASE = [
  { x: 35, y: 58 },
  { x: 65, y: 58 },
  { x: 35, y: 72 },
  { x: 65, y: 72 },
] as const;

export const DEFENCE_COORDS_EXTENDED = [
  ...DEFENCE_COORDS_BASE,
  { x: 35, y: 82 },
  { x: 65, y: 82 },
] as const;

export const GOALIE_COORD = { x: 50, y: 90 } as const;

export function getLineupSlotCount(slotType: LineupSlotType, extendedGrid: boolean) {
  if (slotType === 'goalie') return GOALIE_SLOTS;
  if (slotType === 'defence') return extendedGrid ? EXTENDED_DEFENCE_SLOTS : BASE_DEFENCE_SLOTS;
  return extendedGrid ? EXTENDED_FORWARD_SLOTS : BASE_FORWARD_SLOTS;
}

function getCoordinates(slotType: LineupSlotType, extendedGrid: boolean) {
  if (slotType === 'goalie') return [GOALIE_COORD] as const;
  if (slotType === 'defence') return extendedGrid ? DEFENCE_COORDS_EXTENDED : DEFENCE_COORDS_BASE;
  return extendedGrid ? FORWARD_COORDS_EXTENDED : FORWARD_COORDS_BASE;
}

export function getLineupSlotCoordinate(
  slotType: LineupSlotType,
  slotIndex: number,
  extendedGrid: boolean,
): { x: number; y: number } {
  const coordinates = getCoordinates(slotType, extendedGrid);
  const normalizedIndex = Number.isFinite(slotIndex) ? Math.max(0, Math.floor(slotIndex)) : 0;
  return coordinates[Math.min(normalizedIndex, coordinates.length - 1)];
}

function coordinateDistanceSquared(
  left: { x: number; y: number },
  right: { x: number; y: number },
) {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2;
}

export function getLineupSlotIndexFromCoordinate(
  slotType: LineupSlotType,
  coord: { x: number; y: number },
): number | null {
  const coordinates = getCoordinates(slotType, true);
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  coordinates.forEach((candidate, index) => {
    const distance = coordinateDistanceSquared(coord, candidate);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });

  // Coordinates are persisted as whole percentages. Exact current editor slots
  // match with distance 0; the tolerance keeps older near-slot saves stable.
  return bestDistance <= 9 ? bestIndex : null;
}
