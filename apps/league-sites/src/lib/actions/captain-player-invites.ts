'use server';

import { getPublicCaptainInvitePreview, type CaptainInvitePreview } from '@/lib/captain/invite-preview';
export type { CaptainInvitePreview } from '@/lib/captain/invite-preview';
import { createAuthClient as createClient, createServiceRoleClient } from '@/lib/supabase/server';

const LEGACY_EMAIL_DOMAIN = 'captaininvite.hockeylifehl.com';

export interface ExistingInviteCandidate {
  rosterId: string;
  playerId: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  playerType: 'regular' | 'sub' | 'part_time';
}

async function verifyCaptain(teamId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: 'Not authenticated' };
  }

  const { data: membership } = await supabase
    .from('team_rosters')
    .select('leadership_role')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .eq('status', 'active')
    .is('end_date', null)
    .maybeSingle();

  if (!membership || !['captain', 'alternate_captain'].includes(membership.leadership_role || '')) {
    return { ok: false as const, error: 'Not authorized' };
  }

  return { ok: true as const, userId: user.id };
}

function normalizePhone(phone: string | null | undefined) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (phone?.startsWith('+')) return phone;
  return `+${digits}`;
}

function legacyInviteEmail(id: string) {
  return `captaininvite_${id}@${LEGACY_EMAIL_DOMAIN}`;
}

export async function getCaptainInviteWizardData(teamId: string, seasonId: string) {
  const auth = await verifyCaptain(teamId);
  if (!auth.ok) return { success: false as const, error: auth.error };

  const serviceSupabase = createServiceRoleClient();
  const { data: rows, error } = await (serviceSupabase as any)
    .from('team_rosters')
    .select(`
      id,
      player_id,
      position,
      player_type,
      player:player_id(id, full_name, phone, email, is_legacy_import)
    `)
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .eq('status', 'active')
    .is('end_date', null)
    .order('position')
    .order('joined_at');

  if (error) {
    return { success: false as const, error: 'Failed to load invite data' };
  }

  const existingPlayers = ((rows || []) as any[])
    .map((row) => {
      const player = Array.isArray(row.player) ? row.player[0] : row.player;
      return {
        rosterId: row.id,
        playerId: row.player_id,
        fullName: player?.full_name || null,
        phone: player?.phone || null,
        email: player?.email || null,
        position: row.position || null,
        playerType: row.player_type || 'regular',
        isLegacyImport: player?.is_legacy_import === true || String(player?.email || '').includes(LEGACY_EMAIL_DOMAIN) || String(player?.email || '').startsWith('legacy_'),
      };
    })
    .filter((row) => row.isLegacyImport)
    .map(({ isLegacyImport: _ignored, ...row }) => row);

  return { success: true as const, data: { existingPlayers } };
}

export async function createCaptainPlayerInvite(input: {
  teamId: string;
  seasonId: string;
  existingPlayerId?: string;
  existingRosterId?: string;
  fullName?: string;
  phone?: string;
  position?: string | null;
  isSpare: boolean;
  shareWithLeague?: boolean;
}) {
  const auth = await verifyCaptain(input.teamId);
  if (!auth.ok) return { success: false as const, error: auth.error };

  const serviceSupabase = createServiceRoleClient();
  const { data: team, error: teamError } = await (serviceSupabase as any)
    .from('teams')
    .select('id, name, logo_url, league_id, leagues (id, name, slug, subdomain, custom_domain, custom_domain_verified, logo_url)')
    .eq('id', input.teamId)
    .single();

  if (teamError || !team) {
    return { success: false as const, error: 'Team not found' };
  }

  const league = Array.isArray(team.leagues) ? team.leagues[0] : team.leagues;
  const brandScope = input.isSpare && input.shareWithLeague ? 'league' : 'team';
  const playerType = input.isSpare ? (input.shareWithLeague ? 'sub' : 'part_time') : 'regular';
  const normalizedPhone = normalizePhone(input.phone);

  let playerId = input.existingPlayerId || null;
  let rosterId = input.existingRosterId || null;
  let inviteeName = input.fullName?.trim() || null;
  let inviteePhone = normalizedPhone;
  let invitePosition = input.position || null;

  if (playerId) {
    const { data: existing } = await (serviceSupabase as any)
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', playerId)
      .single();

    if (!existing) {
      return { success: false as const, error: 'Existing player not found' };
    }

    inviteeName = inviteeName || existing.full_name || 'Player';
    inviteePhone = inviteePhone || normalizePhone(existing.phone);

    if (inviteePhone && inviteePhone !== existing.phone) {
      await (serviceSupabase as any)
        .from('profiles')
        .update({ phone: inviteePhone, updated_at: new Date().toISOString() })
        .eq('id', playerId);
    }

    if (invitePosition && rosterId) {
      await (serviceSupabase as any)
        .from('team_rosters')
        .update({ position: invitePosition, player_type: playerType })
        .eq('id', rosterId)
        .eq('team_id', input.teamId);
    }
  } else {
    if (!inviteeName) {
      return { success: false as const, error: 'Full name is required' };
    }

    const newPlayerId = crypto.randomUUID();
    const { error: profileError } = await (serviceSupabase as any)
      .from('profiles')
      .insert({
        id: newPlayerId,
        full_name: inviteeName,
        phone: inviteePhone,
        email: legacyInviteEmail(newPlayerId),
        is_legacy_import: true,
      });

    if (profileError) {
      return { success: false as const, error: profileError.message || 'Failed to create player profile' };
    }

    const { data: newRoster, error: rosterError } = await (serviceSupabase as any)
      .from('team_rosters')
      .insert({
        team_id: input.teamId,
        player_id: newPlayerId,
        league_id: team.league_id,
        season_id: input.seasonId,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        position: invitePosition,
        player_type: playerType,
      })
      .select('id')
      .single();

    if (rosterError || !newRoster) {
      return { success: false as const, error: rosterError?.message || 'Failed to create roster entry' };
    }

    playerId = newPlayerId;
    rosterId = newRoster.id;
  }

  const { data: invite, error: inviteError } = await (serviceSupabase as any)
    .from('captain_player_invites')
    .insert({
      team_id: input.teamId,
      league_id: team.league_id,
      season_id: input.seasonId,
      roster_id: rosterId,
      target_player_id: playerId,
      invitee_name: inviteeName,
      share_phone: inviteePhone,
      position: invitePosition,
      player_type: playerType,
      share_with_league: input.isSpare && input.shareWithLeague === true,
      brand_scope: brandScope,
      invited_by: auth.userId,
      registration_path: `/${league.slug}/register?captainInvite=`,
    })
    .select('id')
    .single();

  if (inviteError || !invite) {
    return { success: false as const, error: inviteError?.message || 'Failed to create invite' };
  }

  await (serviceSupabase as any)
    .from('captain_player_invites')
    .update({ registration_path: `/${league.slug}/register?captainInvite=${invite.id}` })
    .eq('id', invite.id);

  const preview = await getPublicCaptainInvitePreview(invite.id);
  if (!preview) {
    return { success: false as const, error: 'Failed to build invite preview' };
  }

  return { success: true as const, data: preview };
}

export async function getCaptainInvitePrefill(inviteId: string) {
  const serviceSupabase = createServiceRoleClient();
  const { data: invite } = await (serviceSupabase as any)
    .from('captain_player_invites')
    .select('id, league_id, season_id, team_id, invitee_name, share_phone, position')
    .eq('id', inviteId)
    .maybeSingle();

  if (!invite) {
    return { success: false as const, error: 'Invite not found' };
  }

  return {
    success: true as const,
    data: {
      current_step: 1,
      season_id: invite.season_id,
      full_name: invite.invitee_name || '',
      phone: invite.share_phone || '',
      primary_position: invite.position || '',
      registration_type: 'individual' as const,
      registration_intent: 'join_team' as const,
      requested_team_id: invite.team_id,
      team_id: invite.team_id,
    },
  };
}

export async function consumeCaptainInvite(inviteId: string, authUserId: string) {
  const serviceSupabase = createServiceRoleClient();
  const { data: invite } = await (serviceSupabase as any)
    .from('captain_player_invites')
    .select('id, target_player_id, roster_id, consumed_at')
    .eq('id', inviteId)
    .maybeSingle();

  if (!invite || invite.consumed_at) return;

  try {
    await serviceSupabase.rpc('merge_legacy_profile', {
      p_new_profile_id: authUserId,
      p_legacy_profile_id: invite.target_player_id,
    });
  } catch (error) {
    console.error('[captain-player-invites] merge failed', error);
  }

  await (serviceSupabase as any)
    .from('captain_player_invites')
    .update({ consumed_at: new Date().toISOString(), consumed_by: authUserId })
    .eq('id', inviteId);
}
