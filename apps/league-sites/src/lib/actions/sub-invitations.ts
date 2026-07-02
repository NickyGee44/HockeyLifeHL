'use server';

import { createAuthClient as createClient, createServiceRoleClient } from '@/lib/supabase/server';

export interface SubInvitation {
  id: string;
  game_id: string;
  team_id: string;
  invited_by: string;
  invited_player_id: string;
  replaced_player_id: string | null;
  source_type: 'team' | 'league';
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

interface ManualSubResult extends ActionResult {
  playerId?: string;
  fullName?: string;
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

export async function inviteSub(
  gameId: string,
  teamId: string,
  playerId: string,
  message?: string,
  replacedPlayerId?: string | null,
  captainConfirmed = false
): Promise<ActionResult> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  const { data: teamRow } = await serviceSupabase
    .from('teams')
    .select('league_id')
    .eq('id', teamId)
    .maybeSingle();

  if (!teamRow?.league_id) {
    return { success: false, error: 'Team not found' };
  }

  const [{ data: teamRosterRow }, { data: activeLeagueSpare }] = await Promise.all([
    serviceSupabase
      .from('team_rosters')
      .select('id')
      .eq('team_id', teamId)
      .eq('player_id', playerId)
      .eq('status', 'active')
      .is('end_date', null)
      .in('player_type', ['sub', 'part_time'])
      .maybeSingle(),
    (serviceSupabase as any)
      .from('league_spare_pool')
      .select('id')
      .eq('league_id', teamRow.league_id)
      .eq('player_id', playerId)
      .eq('active', true)
      .maybeSingle(),
  ]);

  if (!teamRosterRow && !activeLeagueSpare) {
    return { success: false, error: 'That player is not an active team spare or league spare.' };
  }

  const confirmedByCaptain = Boolean(captainConfirmed);
  const now = new Date().toISOString();

  const { error } = await supabase.from('sub_invitations').insert({
    game_id: gameId,
    team_id: teamId,
    invited_by: auth.userId!,
    invited_player_id: playerId,
    replaced_player_id: replacedPlayerId || null,
    source_type: teamRosterRow ? 'team' : 'league',
    status: confirmedByCaptain ? 'accepted' : 'pending',
    message: message || null,
    responded_at: confirmedByCaptain ? now : null,
  });

  if (error) {
    if (error.code === '23505') {
      if (confirmedByCaptain) {
        const confirmed = await confirmExistingSubInvitation({
          gameId,
          teamId,
          playerId,
          replacedPlayerId,
          now,
          serviceSupabase,
        });

        if (confirmed.success) {
          return { success: true };
        }

        return confirmed;
      }

      return { success: false, error: 'This player has already been invited to this game' };
    }
    console.error('Failed to invite sub:', error);
    return { success: false, error: error.message };
  }

  if (confirmedByCaptain) {
    const confirmed = await upsertCaptainConfirmedCheckin({
      gameId,
      teamId,
      playerId,
      now,
      serviceSupabase,
    });

    if (!confirmed.success) {
      return confirmed;
    }
  }

  return { success: true };
}

export async function addManualSub({
  gameId,
  teamId,
  fullName,
  position,
  jerseyNumber,
  message,
  replacedPlayerId,
  saveToTeamSpares = false,
}: {
  gameId: string;
  teamId: string;
  fullName: string;
  position?: string | null;
  jerseyNumber?: number | null;
  message?: string;
  replacedPlayerId?: string | null;
  saveToTeamSpares?: boolean;
}): Promise<ManualSubResult> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const normalizedName = fullName.trim().replace(/\s+/g, ' ');
  if (normalizedName.length < 2) {
    return { success: false, error: 'Enter the spare player name.' };
  }

  const safeJerseyNumber =
    typeof jerseyNumber === 'number' && Number.isInteger(jerseyNumber) && jerseyNumber > 0 && jerseyNumber < 1000
      ? jerseyNumber
      : null;
  const safePosition = position?.trim() || null;
  const now = new Date().toISOString();
  const serviceSupabase = createServiceRoleClient();

  const { data: game, error: gameError } = await (serviceSupabase.from('games') as any)
    .select('id, league_id, season_id, home_team_id, away_team_id')
    .eq('id', gameId)
    .maybeSingle();

  if (gameError) {
    console.error('Failed to verify manual spare game:', gameError);
    return { success: false, error: gameError.message };
  }

  if (!game || (game.home_team_id !== teamId && game.away_team_id !== teamId)) {
    return { success: false, error: 'Game not found for this team.' };
  }

  let playerId: string | null = null;

  if (saveToTeamSpares) {
    const { data: existingTeamSpare, error: existingError } = await (serviceSupabase.from('team_rosters') as any)
      .select(`
        player_id,
        profile:profiles!team_rosters_player_id_fkey(full_name)
      `)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .is('end_date', null)
      .in('player_type', ['sub', 'part_time'])
      .limit(100);

    if (existingError) {
      console.error('Failed to search existing manual spare:', existingError);
      return { success: false, error: existingError.message };
    }

    const matchingSpare = (existingTeamSpare || []).find((row: any) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      return profile?.full_name?.trim().toLowerCase() === normalizedName.toLowerCase();
    });

    playerId = matchingSpare?.player_id ?? null;
  }

  if (!playerId) {
    playerId = crypto.randomUUID();
    const syntheticEmail = `manual-spare+${playerId}@beerleaguehockey.local`;

    const { error: profileError } = await serviceSupabase.from('profiles').insert({
      id: playerId,
      email: syntheticEmail,
      full_name: normalizedName,
      position: safePosition,
      jersey_number: safeJerseyNumber,
      role: 'player',
      is_legacy_import: true,
      created_at: now,
      updated_at: now,
    });

    if (profileError) {
      console.error('Failed to create manual spare profile:', profileError);
      return { success: false, error: profileError.message };
    }
  }

  if (saveToTeamSpares) {
    const { data: existingRoster } = await (serviceSupabase.from('team_rosters') as any)
      .select('id')
      .eq('team_id', teamId)
      .eq('player_id', playerId)
      .eq('status', 'active')
      .is('end_date', null)
      .maybeSingle();

    const rosterPayload = {
      league_id: game.league_id,
      season_id: game.season_id,
      team_id: teamId,
      player_id: playerId,
      position: safePosition,
      jersey_number: safeJerseyNumber,
      status: 'active',
      player_type: 'sub',
      leadership_role: null,
      notes: 'Captain-added manual spare',
    };

    const rosterResult = existingRoster
      ? await serviceSupabase.from('team_rosters').update(rosterPayload).eq('id', existingRoster.id)
      : await serviceSupabase.from('team_rosters').insert(rosterPayload);

    if (rosterResult.error) {
      console.error('Failed to save manual spare to team roster:', rosterResult.error);
      return { success: false, error: rosterResult.error.message };
    }
  }

  const invitationPayload = {
    game_id: gameId,
    team_id: teamId,
    invited_by: auth.userId!,
    invited_player_id: playerId,
    replaced_player_id: replacedPlayerId || null,
    source_type: 'team',
    status: 'accepted',
    message: message || 'Captain-added manual spare',
    responded_at: now,
    updated_at: now,
  };

  const { error: inviteError } = await serviceSupabase.from('sub_invitations').insert(invitationPayload);

  if (inviteError) {
    if (inviteError.code === '23505') {
      const confirmed = await confirmExistingSubInvitation({
        gameId,
        teamId,
        playerId,
        replacedPlayerId,
        now,
        serviceSupabase,
      });

      return confirmed.success
        ? { success: true, playerId, fullName: normalizedName }
        : confirmed;
    }

    console.error('Failed to add manual spare:', inviteError);
    return { success: false, error: inviteError.message };
  }

  const confirmed = await upsertCaptainConfirmedCheckin({
    gameId,
    teamId,
    playerId,
    now,
    serviceSupabase,
  });

  if (!confirmed.success) {
    return confirmed;
  }

  return { success: true, playerId, fullName: normalizedName };
}

async function confirmExistingSubInvitation({
  gameId,
  teamId,
  playerId,
  replacedPlayerId,
  now,
  serviceSupabase,
}: {
  gameId: string;
  teamId: string;
  playerId: string;
  replacedPlayerId?: string | null;
  now: string;
  serviceSupabase: ReturnType<typeof createServiceRoleClient>;
}): Promise<ActionResult> {
  const updatePayload: Record<string, string | null> = {
    status: 'accepted',
    responded_at: now,
    updated_at: now,
  };

  if (replacedPlayerId) {
    updatePayload.replaced_player_id = replacedPlayerId;
  }

  const { data, error } = await serviceSupabase
    .from('sub_invitations')
    .update(updatePayload)
    .eq('game_id', gameId)
    .eq('team_id', teamId)
    .eq('invited_player_id', playerId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Failed to confirm existing sub invitation:', error);
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: 'This player has already been invited to this game by another team.' };
  }

  return upsertCaptainConfirmedCheckin({
    gameId,
    teamId,
    playerId,
    now,
    serviceSupabase,
  });
}

async function upsertCaptainConfirmedCheckin({
  gameId,
  teamId,
  playerId,
  now,
  serviceSupabase,
}: {
  gameId: string;
  teamId: string;
  playerId: string;
  now: string;
  serviceSupabase: ReturnType<typeof createServiceRoleClient>;
}): Promise<ActionResult> {
  const { error: checkinError } = await serviceSupabase
    .from('game_checkins')
    .upsert(
      {
        game_id: gameId,
        team_id: teamId,
        player_id: playerId,
        status: 'confirmed',
        note: 'Captain confirmed replacement sub',
        updated_at: now,
      },
      { onConflict: 'game_id,player_id' }
    );

  if (checkinError) {
    console.error('Failed to confirm invited sub:', checkinError);
    return { success: false, error: checkinError.message };
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
      replaced_player_id,
      source_type,
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
      replaced_player_id,
      source_type,
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
  teamId?: string
): Promise<{
  success: boolean;
  data?: {
    id: string;
    full_name: string | null;
    email: string | null;
    source: 'team' | 'league';
    position: string | null;
  }[];
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const serviceSupabase = createServiceRoleClient();
  const [teamSparesResult, leagueSparesResult] = await Promise.all([
    teamId
      ? serviceSupabase
          .from('team_rosters')
          .select(`
            player_id,
            position,
            profile:profiles!team_rosters_player_id_fkey(id, full_name, email)
          `)
          .eq('league_id', leagueId)
          .eq('team_id', teamId)
          .eq('status', 'active')
          .is('end_date', null)
          .in('player_type', ['sub', 'part_time'])
      : Promise.resolve({ data: [], error: null }),
    (serviceSupabase as any)
      .from('league_spare_pool')
      .select(`
        player_id,
        position,
        profile:profiles!league_spare_pool_player_id_fkey(id, full_name, email)
      `)
      .eq('league_id', leagueId)
      .eq('active', true),
  ]);

  if (teamSparesResult.error) {
    console.error('Failed to get team spare players:', teamSparesResult.error);
    return { success: false, error: teamSparesResult.error.message };
  }

  if (leagueSparesResult.error) {
    console.error('Failed to get league spare players:', leagueSparesResult.error);
    return { success: false, error: leagueSparesResult.error.message };
  }

  const seen = new Set<string>();
  const players: {
    id: string;
    full_name: string | null;
    email: string | null;
    source: 'team' | 'league';
    position: string | null;
  }[] = [];

  for (const row of teamSparesResult.data || []) {
    const profile = Array.isArray((row as any).profile)
      ? (row as any).profile[0]
      : (row as any).profile;
    if (profile && !seen.has(profile.id)) {
      seen.add(profile.id);
      players.push({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        source: 'team',
        position: (row as any).position ?? null,
      });
    }
  }

  for (const row of leagueSparesResult.data || []) {
    const profile = Array.isArray((row as any).profile)
      ? (row as any).profile[0]
      : (row as any).profile;
    if (profile && !seen.has(profile.id)) {
      seen.add(profile.id);
      players.push({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        source: 'league',
        position: (row as any).position ?? null,
      });
    }
  }

  return {
    success: true,
    data: players.sort((left, right) => {
      if (left.source !== right.source) return left.source === 'team' ? -1 : 1;
      return (left.full_name || '').localeCompare(right.full_name || '');
    }),
  };
}
