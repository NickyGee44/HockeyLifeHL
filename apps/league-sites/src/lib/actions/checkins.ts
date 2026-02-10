'use server';

import { createAuthClient as createClient } from '@/lib/supabase/server';

export type CheckinStatus = 'confirmed' | 'tentative' | 'out';

export interface CheckinResult {
  success: boolean;
  error?: string;
}

export async function updateGameCheckin(
  gameId: string,
  teamId: string,
  status: CheckinStatus,
  note?: string
): Promise<CheckinResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Upsert the check-in
  const { error } = await supabase
    .from('game_checkins')
    .upsert(
      {
        game_id: gameId,
        player_id: user.id,
        team_id: teamId,
        status,
        note: note || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'game_id,player_id',
      }
    );

  if (error) {
    console.error('Failed to update check-in:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getMyCheckins(teamId: string): Promise<Record<string, CheckinStatus>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {};
  }

  const { data, error } = await supabase
    .from('game_checkins')
    .select('game_id, status')
    .eq('player_id', user.id)
    .eq('team_id', teamId);

  if (error || !data) {
    return {};
  }

  return data.reduce((acc, row) => {
    acc[row.game_id] = row.status as CheckinStatus;
    return acc;
  }, {} as Record<string, CheckinStatus>);
}

export async function getGameCheckins(gameId: string, teamId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('game_checkins')
    .select(`
      id,
      player_id,
      status,
      note,
      profile:profiles(id, full_name, avatar_url)
    `)
    .eq('game_id', gameId)
    .eq('team_id', teamId);

  if (error) {
    console.error('Failed to get game check-ins:', error);
    return [];
  }

  return data || [];
}

export interface TeamCheckinSummary {
  gameId: string;
  confirmed: number;
  tentative: number;
  out: number;
  total: number;
}

export async function getTeamCheckinSummary(
  teamId: string,
  gameIds: string[]
): Promise<TeamCheckinSummary[]> {
  const supabase = await createClient();

  if (gameIds.length === 0) return [];

  const { data, error } = await supabase
    .from('game_checkins')
    .select('game_id, status')
    .eq('team_id', teamId)
    .in('game_id', gameIds);

  if (error) {
    console.error('Failed to get team checkin summary:', error);
    return [];
  }

  const summaryMap = new Map<string, TeamCheckinSummary>();

  for (const gameId of gameIds) {
    summaryMap.set(gameId, {
      gameId,
      confirmed: 0,
      tentative: 0,
      out: 0,
      total: 0,
    });
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

export async function bulkUpdateCheckins(
  gameIds: string[],
  teamId: string,
  status: CheckinStatus
): Promise<CheckinResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (gameIds.length === 0) {
    return { success: false, error: 'No games specified' };
  }

  const rows = gameIds.map((gameId) => ({
    game_id: gameId,
    player_id: user.id,
    team_id: teamId,
    status,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('game_checkins')
    .upsert(rows, { onConflict: 'game_id,player_id' });

  if (error) {
    console.error('Failed to bulk update check-ins:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export interface TeamGameCheckins {
  gameId: string;
  checkins: {
    playerId: string;
    status: string;
  }[];
}

export async function getTeamCheckinsForGames(
  teamId: string,
  gameIds: string[]
): Promise<TeamGameCheckins[]> {
  const supabase = await createClient();

  if (gameIds.length === 0) return [];

  const { data, error } = await supabase
    .from('game_checkins')
    .select('game_id, player_id, status')
    .eq('team_id', teamId)
    .in('game_id', gameIds);

  if (error) {
    console.error('Failed to get team checkins for games:', error);
    return [];
  }

  const map = new Map<string, TeamGameCheckins>();
  for (const gameId of gameIds) {
    map.set(gameId, { gameId, checkins: [] });
  }

  for (const row of data || []) {
    const entry = map.get(row.game_id);
    if (entry) {
      entry.checkins.push({
        playerId: row.player_id,
        status: row.status,
      });
    }
  }

  return Array.from(map.values());
}
