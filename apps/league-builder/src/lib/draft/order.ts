export type DraftType = 'snake' | 'linear';

export function getDraftRoundOrder(
  teamIds: string[],
  round: number,
  draftType: DraftType
): string[] {
  if (draftType === 'linear') {
    return [...teamIds];
  }

  // Snake order reverses every even round (2, 4, 6...)
  return round % 2 === 0 ? [...teamIds].reverse() : [...teamIds];
}

export function getDraftOrderByRound(
  teamIds: string[],
  totalRounds: number,
  draftType: DraftType
): string[][] {
  return Array.from({ length: totalRounds }, (_, index) =>
    getDraftRoundOrder(teamIds, index + 1, draftType)
  );
}

