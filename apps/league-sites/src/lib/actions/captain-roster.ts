'use server';

import { getTeamRosterStats } from '@/lib/data';
import { resolvePlayerPhotoUrl } from '@/lib/player-photo';
import { createAuthClient as createClient } from '@/lib/supabase/server';

export interface RosterPlayer {
  id: string;
  player_id: string;
  jersey_number: number | null;
  position: string | null;
  leadership_role: 'captain' | 'alternate_captain' | null;
  player_type: 'regular' | 'sub' | 'part_time';
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    photo_url?: string | null;
  } | null;
}

export interface JoinRequest {
  id: string;
  team_id: string;
  player_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  requested_at: string;
  player: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface SubRosterPlayer extends RosterPlayer {
  games_played: number;
}

async function verifyCaptainRole(
  teamId: string
): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const { data: membership } = await supabase
    .from('team_rosters')
    .select('leadership_role')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .eq('status', 'active')
    .is('end_date', null)
    .limit(1)
    .maybeSingle();

  if (
    !membership ||
    !['captain', 'alternate_captain'].includes(membership.leadership_role || '')
  ) {
    return { authorized: false, error: 'Not authorized' };
  }

  return { authorized: true, userId: user.id };
}

export async function getTeamRoster(
  teamId: string,
  seasonId?: string | null,
): Promise<{ success: boolean; data?: RosterPlayer[]; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  let query = supabase
    .from('team_rosters')
    .select(
      `
      id,
      player_id,
      jersey_number,
      position,
      leadership_role,
      player_type,
      profile:profiles(id, full_name, email, phone, avatar_url, photo_url)
    `
    )
    .eq('team_id', teamId)
    .eq('status', 'active')
    .eq('player_type', 'regular')
    .is('end_date', null);

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query.order('jersey_number', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Failed to get team roster:', error);
    return { success: false, error: 'Failed to fetch roster' };
  }

  const roster: RosterPlayer[] = (data || []).map((p: any) => {
    const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile;
    return {
      ...p,
      profile: profile
        ? {
            ...profile,
            avatar_url: resolvePlayerPhotoUrl(profile),
          }
        : null,
    };
  });

  return { success: true, data: roster };
}

export async function getTeamSubsWhoPlayed(
  teamId: string,
  seasonId?: string | null,
): Promise<{ success: boolean; data?: SubRosterPlayer[]; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  let query = supabase
    .from('team_rosters')
    .select(
      `
      id,
      player_id,
      jersey_number,
      position,
      leadership_role,
      player_type,
      profile:profiles(id, full_name, email, phone, avatar_url, photo_url)
    `
    )
    .eq('team_id', teamId)
    .eq('status', 'active')
    .eq('player_type', 'sub')
    .is('end_date', null);

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query.order('jersey_number', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Failed to get team subs:', error);
    return { success: false, error: 'Failed to fetch subs' };
  }

  const statsByPlayer = await getTeamRosterStats(teamId, seasonId ?? undefined);

  const subs = (data || [])
    .map((player: any) => {
      const profile = Array.isArray(player.profile) ? player.profile[0] : player.profile;
      return {
        ...player,
        profile: profile
          ? {
              ...profile,
              avatar_url: resolvePlayerPhotoUrl(profile),
            }
          : null,
        games_played: statsByPlayer[player.player_id]?.games_played ?? 0,
      };
    })
    .filter((player) => player.games_played > 0)
    .sort((a, b) => b.games_played - a.games_played || (a.profile?.full_name || '').localeCompare(b.profile?.full_name || ''));

  return { success: true, data: subs };
}

export async function updatePlayerJerseyNumber(
  teamId: string,
  rosterId: string,
  jerseyNumber: number | null
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('team_rosters')
    .update({ jersey_number: jerseyNumber })
    .eq('id', rosterId)
    .eq('team_id', teamId);

  if (error) {
    console.error('Failed to update jersey number:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updatePlayerPosition(
  teamId: string,
  rosterId: string,
  position: string | null
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('team_rosters')
    .update({ position })
    .eq('id', rosterId)
    .eq('team_id', teamId);

  if (error) {
    console.error('Failed to update position:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateRosterPlayerDetails(
  teamId: string,
  rosterId: string,
  details: {
    full_name: string;
    email: string | null;
    phone: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { data: rosterEntry, error: rosterError } = await supabase
    .from('team_rosters')
    .select('player_id')
    .eq('id', rosterId)
    .eq('team_id', teamId)
    .single();

  if (rosterError || !rosterEntry?.player_id) {
    return { success: false, error: 'Player not found on roster' };
  }

  const payload = {
    full_name: details.full_name.trim() || null,
    email: details.email?.trim() || null,
    phone: details.phone?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', rosterEntry.player_id);

  if (error) {
    console.error('Failed to update player details:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removePlayerFromRoster(
  teamId: string,
  rosterId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  // Prevent removing captains/alternates
  const { data: rosterEntry } = await supabase
    .from('team_rosters')
    .select('leadership_role')
    .eq('id', rosterId)
    .eq('team_id', teamId)
    .single();

  if (rosterEntry?.leadership_role) {
    return {
      success: false,
      error: 'Cannot remove a captain or alternate captain from the roster',
    };
  }

  // Soft delete (end_date is a date column, not timestamp)
  const { error } = await supabase
    .from('team_rosters')
    .update({
      status: 'inactive',
      end_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', rosterId)
    .eq('team_id', teamId);

  if (error) {
    console.error('Failed to remove player:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getJoinRequests(
  teamId: string
): Promise<{ success: boolean; data?: JoinRequest[]; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('team_join_requests')
    .select(
      `
      id,
      team_id,
      player_id,
      status,
      message,
      requested_at,
      player:profiles!team_join_requests_player_id_fkey(id, full_name, email)
    `
    )
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) {
    console.error('Failed to get join requests:', error);
    return { success: false, error: 'Failed to fetch join requests' };
  }

  const requests: JoinRequest[] = (data || []).map((r: any) => ({
    ...r,
    player: Array.isArray(r.player) ? r.player[0] : r.player,
  }));

  return { success: true, data: requests };
}

export async function approveJoinRequest(
  teamId: string,
  requestId: string,
  jerseyNumber?: number
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  // Verify the request belongs to this team and is pending
  const { data: request, error: fetchError } = await supabase
    .from('team_join_requests')
    .select('id, team_id, player_id, season_id, status')
    .eq('id', requestId)
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Join request not found or already processed' };
  }

  const { error: updateError } = await supabase
    .from('team_join_requests')
    .update({
      status: 'accepted',
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.userId,
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Failed to approve join request:', updateError);
    return { success: false, error: 'Failed to approve request' };
  }

  // Set jersey number if provided (roster entry is auto-created by DB trigger)
  if (jerseyNumber && request.season_id) {
    await supabase
      .from('team_rosters')
      .update({ jersey_number: jerseyNumber })
      .eq('team_id', teamId)
      .eq('player_id', request.player_id)
      .eq('season_id', request.season_id);
  }

  return { success: true };
}

export async function rejectJoinRequest(
  teamId: string,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('team_join_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.userId,
    })
    .eq('id', requestId)
    .eq('team_id', teamId)
    .eq('status', 'pending');

  if (error) {
    console.error('Failed to reject join request:', error);
    return { success: false, error: 'Failed to reject request' };
  }

  return { success: true };
}
