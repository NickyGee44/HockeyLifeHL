import type { SupabaseClientArg, CheckinStatus, GameCheckin, CheckinSummary } from '../types';

export async function updateGameCheckin(
  supabase: SupabaseClientArg,
  userId: string,
  gameId: string,
  teamId: string,
  status: CheckinStatus,
  note?: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('game_checkins')
    .upsert(
      {
        game_id: gameId,
        player_id: userId,
        team_id: teamId,
        status,
        note: note || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'game_id,player_id' },
    );

  if (error) {
    console.error('Failed to update check-in:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getMyCheckins(
  supabase: SupabaseClientArg,
  userId: string,
  teamId: string,
): Promise<Record<string, CheckinStatus>> {
  const { data, error } = await supabase
    .from('game_checkins')
    .select('game_id, status')
    .eq('player_id', userId)
    .eq('team_id', teamId);

  if (error || !data) return {};

  return data.reduce(
    (acc: Record<string, CheckinStatus>, row: any) => {
      acc[row.game_id] = row.status as CheckinStatus;
      return acc;
    },
    {} as Record<string, CheckinStatus>,
  );
}

export async function getGameCheckins(
  supabase: SupabaseClientArg,
  gameId: string,
  teamId: string,
): Promise<GameCheckin[]> {
  const { data, error } = await supabase
    .from('game_checkins')
    .select(`
      id,
      game_id,
      player_id,
      team_id,
      status,
      note,
      updated_at,
      profile:profiles(id, full_name, avatar_url)
    `)
    .eq('game_id', gameId)
    .eq('team_id', teamId);

  if (error || !data) return [];
  return data as unknown as GameCheckin[];
}

export async function getCheckinSummaries(
  supabase: SupabaseClientArg,
  teamId: string,
  gameIds: string[],
): Promise<CheckinSummary[]> {
  if (gameIds.length === 0) return [];

  const { data, error } = await supabase
    .from('game_checkins')
    .select('game_id, status')
    .eq('team_id', teamId)
    .in('game_id', gameIds);

  if (error) return [];

  const summaryMap = new Map<string, CheckinSummary>();
  for (const gameId of gameIds) {
    summaryMap.set(gameId, { gameId, confirmed: 0, tentative: 0, out: 0, total: 0 });
  }

  for (const row of data || []) {
    const summary = summaryMap.get(row.game_id);
    if (!summary) continue;
    summary.total++;
    if (row.status === 'confirmed') summary.confirmed++;
    else if (row.status === 'tentative') summary.tentative++;
    else if (row.status === 'out') summary.out++;
  }

  return Array.from(summaryMap.values());
}
