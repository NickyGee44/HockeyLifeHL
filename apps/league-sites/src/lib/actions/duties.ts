'use server';

import { createAuthClient as createClient } from '@/lib/supabase/server';

export interface DutyType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface GameDuty {
  id: string;
  game_id: string;
  duty_type_id: string;
  duty_type: DutyType;
  assigned_player_id: string | null;
  assigned_player?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  status: 'pending' | 'completed' | 'missed';
  notes: string | null;
}

export interface RotationSettings {
  id: string;
  duty_type_id: string;
  rotation_enabled: boolean;
  current_player_index: number;
  player_order: string[];
  skip_goalies: boolean;
}

export async function getDutyTypes(teamId: string): Promise<DutyType[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('duty_types')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to get duty types:', error);
    return [];
  }

  return data || [];
}

export async function getGameDuties(gameId: string, teamId: string): Promise<GameDuty[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('game_duties')
    .select(`
      id,
      game_id,
      duty_type_id,
      assigned_player_id,
      status,
      notes,
      duty_type:duty_types(*),
      assigned_player:profiles(id, full_name, avatar_url)
    `)
    .eq('game_id', gameId)
    .eq('team_id', teamId);

  if (error) {
    console.error('Failed to get game duties:', error);
    return [];
  }

  return (data || []).map((d: any) => ({
    ...d,
    duty_type: Array.isArray(d.duty_type) ? d.duty_type[0] : d.duty_type,
    assigned_player: Array.isArray(d.assigned_player) ? d.assigned_player[0] : d.assigned_player,
  }));
}

export async function assignDuty(
  gameId: string,
  dutyTypeId: string,
  teamId: string,
  playerId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user is captain
  const { data: membership } = await supabase
    .from('team_rosters')
    .select('leadership_role')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .single();

  if (!membership || !['captain', 'alternate_captain'].includes(membership.leadership_role || '')) {
    return { success: false, error: 'Not authorized' };
  }

  // Upsert the duty assignment
  const { error } = await supabase
    .from('game_duties')
    .upsert(
      {
        game_id: gameId,
        duty_type_id: dutyTypeId,
        team_id: teamId,
        assigned_player_id: playerId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'game_id,duty_type_id,team_id',
      }
    );

  if (error) {
    console.error('Failed to assign duty:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getRotationSettings(teamId: string): Promise<RotationSettings[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('duty_rotation_settings')
    .select('*')
    .eq('team_id', teamId);

  if (error) {
    console.error('Failed to get rotation settings:', error);
    return [];
  }

  return data || [];
}

export async function updateRotationSettings(
  teamId: string,
  dutyTypeId: string,
  settings: {
    rotation_enabled: boolean;
    player_order: string[];
    skip_goalies: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('duty_rotation_settings')
    .upsert(
      {
        team_id: teamId,
        duty_type_id: dutyTypeId,
        rotation_enabled: settings.rotation_enabled,
        player_order: settings.player_order,
        skip_goalies: settings.skip_goalies,
        current_player_index: 0,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'team_id,duty_type_id',
      }
    );

  if (error) {
    console.error('Failed to update rotation settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function autoAssignNextDuty(
  gameId: string,
  dutyTypeId: string,
  teamId: string
): Promise<{ success: boolean; assignedPlayerId?: string; error?: string }> {
  const supabase = await createClient();

  // Get rotation settings
  const { data: settings } = await supabase
    .from('duty_rotation_settings')
    .select('*')
    .eq('team_id', teamId)
    .eq('duty_type_id', dutyTypeId)
    .single();

  if (!settings || !settings.rotation_enabled || !settings.player_order?.length) {
    return { success: false, error: 'Rotation not enabled for this duty' };
  }

  // Get roster to filter out goalies if needed
  let eligiblePlayers = settings.player_order;

  if (settings.skip_goalies) {
    const { data: roster } = await supabase
      .from('team_rosters')
      .select('player_id, position')
      .eq('team_id', teamId)
      .in('player_id', settings.player_order);

    if (roster) {
      const goalieIds = roster
        .filter((p: any) => p.position === 'Goalie' || p.position === 'G')
        .map((p: any) => p.player_id);

      eligiblePlayers = settings.player_order.filter((id: string) => !goalieIds.includes(id));
    }
  }

  if (!eligiblePlayers.length) {
    return { success: false, error: 'No eligible players for rotation' };
  }

  // Get the next player in rotation
  const currentIndex = settings.current_player_index % eligiblePlayers.length;
  const nextPlayerId = eligiblePlayers[currentIndex];

  // Assign the duty
  const { error: assignError } = await supabase
    .from('game_duties')
    .upsert(
      {
        game_id: gameId,
        duty_type_id: dutyTypeId,
        team_id: teamId,
        assigned_player_id: nextPlayerId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'game_id,duty_type_id,team_id',
      }
    );

  if (assignError) {
    return { success: false, error: assignError.message };
  }

  // Update the rotation index
  await supabase
    .from('duty_rotation_settings')
    .update({
      current_player_index: (currentIndex + 1) % eligiblePlayers.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settings.id);

  return { success: true, assignedPlayerId: nextPlayerId };
}

export async function createDutyType(
  teamId: string,
  name: string,
  description?: string,
  icon?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get max sort order
  const { data: existing } = await supabase
    .from('duty_types')
    .select('sort_order')
    .eq('team_id', teamId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing?.[0]?.sort_order ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase.from('duty_types').insert({
    team_id: teamId,
    name,
    description: description || null,
    icon: icon || null,
    sort_order: nextOrder,
  });

  if (error) {
    console.error('Failed to create duty type:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
