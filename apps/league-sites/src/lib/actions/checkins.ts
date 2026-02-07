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
