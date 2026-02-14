'use server';

import { createAuthClient as createClient } from '@/lib/supabase/server';

export interface SubInvitation {
  id: string;
  game_id: string;
  team_id: string;
  invited_by: string;
  invited_player_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message: string | null;
  responded_at: string | null;
  created_at: string;
  game?: {
    id: string;
    scheduled_at: string;
    venue: string | null;
    home_team: { id: string; name: string } | null;
    away_team: { id: string; name: string } | null;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
  invited_by_profile?: {
    full_name: string | null;
  } | null;
  invited_player_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

interface ActionResult {
  success: boolean;
  error?: string;
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
    .single();

  if (
    !membership ||
    !['captain', 'alternate_captain'].includes(membership.leadership_role || '')
  ) {
    return { authorized: false, error: 'Not authorized' };
  }

  return { authorized: true, userId: user.id };
}

export async function inviteSub(
  gameId: string,
  teamId: string,
  playerId: string,
  message?: string
): Promise<ActionResult> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('sub_invitations').insert({
    game_id: gameId,
    team_id: teamId,
    invited_by: auth.userId!,
    invited_player_id: playerId,
    status: 'pending',
    message: message || null,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This player has already been invited to this game' };
    }
    console.error('Failed to invite sub:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function respondToSubInvite(
  invitationId: string,
  accept: boolean
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Fetch invitation to verify ownership
  const { data: invitation, error: fetchError } = await supabase
    .from('sub_invitations')
    .select('id, game_id, team_id, invited_player_id, status')
    .eq('id', invitationId)
    .single();

  if (fetchError || !invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  if (invitation.invited_player_id !== user.id) {
    return { success: false, error: 'Not authorized' };
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: 'Invitation is no longer pending' };
  }

  const newStatus = accept ? 'accepted' : 'declined';

  const { error: updateError } = await supabase
    .from('sub_invitations')
    .update({
      status: newStatus,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId);

  if (updateError) {
    console.error('Failed to respond to sub invite:', updateError);
    return { success: false, error: updateError.message };
  }

  // If accepted, auto-create a confirmed checkin for this game
  if (accept) {
    await supabase
      .from('game_checkins')
      .upsert(
        {
          game_id: invitation.game_id,
          player_id: user.id,
          team_id: invitation.team_id,
          status: 'confirmed',
          note: 'Accepted sub invitation',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'game_id,player_id' }
      );
  }

  return { success: true };
}

export async function getMySubInvitations(
  _leagueId: string
): Promise<{ success: boolean; data?: SubInvitation[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('sub_invitations')
    .select(`
      id,
      game_id,
      team_id,
      invited_by,
      invited_player_id,
      status,
      message,
      responded_at,
      created_at,
      team:teams!sub_invitations_team_id_fkey(id, name),
      invited_by_profile:profiles!sub_invitations_invited_by_fkey(full_name)
    `)
    .eq('invited_player_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get sub invitations:', error);
    return { success: false, error: error.message };
  }

  // Also fetch game details for each invitation
  const gameIds = (data || []).map((d: any) => d.game_id);
  const gamesMap: Record<string, any> = {};

  if (gameIds.length > 0) {
    const { data: gamesData } = await supabase
      .from('games')
      .select(`
        id,
        scheduled_at,
        venue,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name)
      `)
      .in('id', gameIds);

    if (gamesData) {
      for (const g of gamesData) {
        const raw = g as any;
        gamesMap[g.id] = {
          id: g.id,
          scheduled_at: g.scheduled_at,
          venue: g.venue,
          home_team: Array.isArray(raw.home_team) ? raw.home_team[0] : raw.home_team,
          away_team: Array.isArray(raw.away_team) ? raw.away_team[0] : raw.away_team,
        };
      }
    }
  }

  const invitations: SubInvitation[] = (data || []).map((row: any) => ({
    ...row,
    team: Array.isArray(row.team) ? row.team[0] : row.team,
    invited_by_profile: Array.isArray(row.invited_by_profile)
      ? row.invited_by_profile[0]
      : row.invited_by_profile,
    game: gamesMap[row.game_id] || null,
  }));

  return { success: true, data: invitations };
}

export async function getTeamSubInvitations(
  teamId: string,
  gameIds?: string[]
): Promise<{ success: boolean; data?: SubInvitation[]; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  let query = supabase
    .from('sub_invitations')
    .select(`
      id,
      game_id,
      team_id,
      invited_by,
      invited_player_id,
      status,
      message,
      responded_at,
      created_at,
      invited_player_profile:profiles!sub_invitations_invited_player_id_fkey(id, full_name, email)
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (gameIds && gameIds.length > 0) {
    query = query.in('game_id', gameIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get team sub invitations:', error);
    return { success: false, error: error.message };
  }

  const invitations: SubInvitation[] = (data || []).map((row: any) => ({
    ...row,
    invited_player_profile: Array.isArray(row.invited_player_profile)
      ? row.invited_player_profile[0]
      : row.invited_player_profile,
  }));

  return { success: true, data: invitations };
}

export async function updatePlayerType(
  teamId: string,
  rosterId: string,
  playerType: 'regular' | 'sub' | 'part_time'
): Promise<ActionResult> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('team_rosters')
    .update({ player_type: playerType })
    .eq('id', rosterId)
    .eq('team_id', teamId);

  if (error) {
    console.error('Failed to update player type:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getLeagueSubPlayers(
  leagueId: string,
  excludeTeamId?: string
): Promise<{ success: boolean; data?: { id: string; full_name: string | null; email: string | null }[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get all players registered as subs in this league
  let query = supabase
    .from('team_rosters')
    .select(`
      player_id,
      profile:profiles!team_rosters_player_id_fkey(id, full_name, email)
    `)
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .in('player_type', ['sub', 'part_time']);

  if (excludeTeamId) {
    query = query.neq('team_id', excludeTeamId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get league sub players:', error);
    return { success: false, error: error.message };
  }

  // Deduplicate by player_id
  const seen = new Set<string>();
  const players: { id: string; full_name: string | null; email: string | null }[] = [];

  for (const row of data || []) {
    const profile = Array.isArray((row as any).profile)
      ? (row as any).profile[0]
      : (row as any).profile;
    if (profile && !seen.has(profile.id)) {
      seen.add(profile.id);
      players.push({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
      });
    }
  }

  return { success: true, data: players };
}
