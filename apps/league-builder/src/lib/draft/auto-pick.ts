export interface DraftAutoPickPlayer {
  player_id: string;
  player_name: string;
  auto_pick_rank: number | null;
  skill_level: string | null;
}

const SKILL_RANK: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
};

export function compareAutoPickPlayers(
  a: DraftAutoPickPlayer,
  b: DraftAutoPickPlayer
): number {
  if (a.auto_pick_rank != null && b.auto_pick_rank != null) {
    return a.auto_pick_rank - b.auto_pick_rank;
  }
  if (a.auto_pick_rank != null) return -1;
  if (b.auto_pick_rank != null) return 1;

  const aSkill = SKILL_RANK[a.skill_level?.toUpperCase() ?? ''] ?? 99;
  const bSkill = SKILL_RANK[b.skill_level?.toUpperCase() ?? ''] ?? 99;
  if (aSkill !== bSkill) return aSkill - bSkill;

  return a.player_name.localeCompare(b.player_name);
}

export function getBestAutoPickPlayer<T extends DraftAutoPickPlayer>(
  players: T[]
): T | null {
  if (players.length === 0) return null;
  const sorted = [...players].sort(compareAutoPickPlayers);
  return sorted[0] ?? null;
}

