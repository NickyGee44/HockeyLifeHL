import { supabase } from './client';

export type CheckinStatus = 'confirmed' | 'tentative' | 'out';
export type GameCheckinPlayer = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type GameCheckinEntry = {
  status: CheckinStatus;
  player: GameCheckinPlayer | null;
};

export async function updateCheckin(gameId: string, teamId: string, status: CheckinStatus, note?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };
  const { error } = await supabase.from('game_checkins').upsert(
    { game_id: gameId, player_id: user.id, team_id: teamId, status, note: note ?? null, updated_at: new Date().toISOString() },
    { onConflict: 'game_id,player_id' }
  );
  return { success: !error, error: error?.message };
}

export async function getMyCheckins(teamId: string): Promise<Record<string, CheckinStatus>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase.from('game_checkins').select('game_id, status').eq('player_id', user.id).eq('team_id', teamId);
  return (data ?? []).reduce((acc: Record<string, CheckinStatus>, r: any) => ({ ...acc, [r.game_id]: r.status as CheckinStatus }), {});
}

export async function getMyCheckinsForTeams(teamIds: string[]): Promise<Record<string, CheckinStatus>> {
  const normalizedTeamIds = [...new Set(teamIds.filter(Boolean))];
  if (normalizedTeamIds.length === 0) return {};

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from('game_checkins')
    .select('game_id, status')
    .eq('player_id', user.id)
    .in('team_id', normalizedTeamIds);

  return (data ?? []).reduce(
    (acc: Record<string, CheckinStatus>, row: any) => ({ ...acc, [row.game_id]: row.status as CheckinStatus }),
    {},
  );
}

export async function getGameCheckinSummary(gameId: string, teamId: string) {
  const { data } = await supabase.from('game_checkins')
    .select('status, player:profiles!player_id(id, full_name, avatar_url)')
    .eq('game_id', gameId).eq('team_id', teamId);
  const rows = ((data ?? []) as any[]).map((row) => ({
    status: row.status as CheckinStatus,
    player: Array.isArray(row.player) ? row.player[0] ?? null : row.player ?? null,
  })) as GameCheckinEntry[];
  const confirmed = rows.filter((row) => row.status === 'confirmed');
  const tentative = rows.filter((row) => row.status === 'tentative');
  const out = rows.filter((row) => row.status === 'out');
  return { confirmed, tentative, out, total: rows.length };
}
