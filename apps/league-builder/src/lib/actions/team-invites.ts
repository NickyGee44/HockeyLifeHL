'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const isDevelopment = process.env.NODE_ENV !== 'production';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamInvite {
  id: string;
  email: string;
  teamId: string;
  teamName: string;
  seasonId: string;
  status: string;
  message: string | null;
  invitedBy: string;
  inviterName: string | null;
  expiresAt: string;
  createdAt: string;
}

// ============================================================================
// SEND TEAM INVITE
// ============================================================================

/**
 * Captain sends an invite to a player by email.
 * If the email already has an account, returns a hint to add them directly.
 */
export async function sendTeamInvite(
  teamId: string,
  seasonId: string,
  email: string,
  message?: string
): Promise<
  | { success: true; inviteId: string; alreadyHasAccount: boolean }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify captain access
  const { data: team } = await supabase
    .from('teams')
    .select('id, name, captain_id, league_id')
    .eq('id', teamId)
    .single();

  if (!team || team.captain_id !== user.id) {
    // Also check if user is a league admin
    const { data: staff } = await supabase
      .from('league_staff')
      .select('id')
      .eq('league_id', team?.league_id || '')
      .ilike('role_title', '%admin%')
      .limit(1);

    if (!staff || staff.length === 0) {
      return { success: false, error: 'Not authorized — must be captain or admin' };
    }
  }

  // Check if email already has an account
  const { data: existingProfile } = await serviceSupabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  const alreadyHasAccount = !!existingProfile;

  // Check for existing pending invite to same team/season
  const { data: existingInvite } = await serviceSupabase
    .from('team_invites')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvite) {
    return { success: false, error: 'An invite to this email is already pending' };
  }

  // Insert the invite
  const { data: invite, error } = await serviceSupabase
    .from('team_invites')
    .insert({
      email: email.toLowerCase().trim(),
      team_id: teamId,
      season_id: seasonId,
      invited_by: user.id,
      status: 'pending',
      message: message || null,
    } as any)
    .select('id')
    .single();

  if (error || !invite) {
    if (isDevelopment) {
      console.error('[team-invites] Insert error:', error?.message);
    }
    return { success: false, error: 'Failed to send invite' };
  }

  // If the player already has an account, auto-accept the invite and add to roster
  if (existingProfile) {
    await serviceSupabase
      .from('team_invites')
      .update({ status: 'accepted', accepted_by: existingProfile.id } as any)
      .eq('id', invite.id);

    await serviceSupabase
      .from('team_rosters')
      .insert({
        team_id: teamId,
        player_id: existingProfile.id,
        league_id: team!.league_id,
        season_id: seasonId,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      } as any);
  }

  revalidatePath(`/dashboard/leagues/${team!.league_id}`);

  return { success: true, inviteId: invite.id, alreadyHasAccount };
}

// ============================================================================
// GET TEAM INVITES
// ============================================================================

/**
 * List all invites for a team (optionally filtered by season).
 */
export async function getTeamInvites(
  teamId: string,
  seasonId?: string
): Promise<{ success: true; data: TeamInvite[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  let query = serviceSupabase
    .from('team_invites')
    .select('id, email, team_id, season_id, status, message, invited_by, expires_at, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data: invites, error } = await query;

  if (error) {
    return { success: false, error: 'Failed to fetch invites' };
  }

  // Enrich with team name and inviter name
  const { data: team } = await serviceSupabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single();

  const inviterIds = [...new Set((invites || []).map((i: any) => i.invited_by))];
  const { data: inviters } = await serviceSupabase
    .from('profiles')
    .select('id, full_name')
    .in('id', inviterIds);

  const inviterMap = new Map((inviters || []).map((p: any) => [p.id, p.full_name]));

  const enriched: TeamInvite[] = (invites || []).map((i: any) => ({
    id: i.id,
    email: i.email,
    teamId: i.team_id,
    teamName: team?.name || 'Unknown',
    seasonId: i.season_id,
    status: i.status,
    message: i.message,
    invitedBy: i.invited_by,
    inviterName: inviterMap.get(i.invited_by) || null,
    expiresAt: i.expires_at,
    createdAt: i.created_at,
  }));

  return { success: true, data: enriched };
}

// ============================================================================
// CANCEL TEAM INVITE
// ============================================================================

export async function cancelTeamInvite(
  inviteId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await serviceSupabase
    .from('team_invites')
    .update({ status: 'cancelled' } as any)
    .eq('id', inviteId)
    .eq('status', 'pending');

  if (error) {
    return { success: false, error: 'Failed to cancel invite' };
  }

  return { success: true };
}

// ============================================================================
// RESEND TEAM INVITE
// ============================================================================

export async function resendTeamInvite(
  inviteId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Reset expiry and keep status as pending
  const { error } = await serviceSupabase
    .from('team_invites')
    .update({
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', inviteId)
    .eq('status', 'pending');

  if (error) {
    return { success: false, error: 'Failed to resend invite' };
  }

  return { success: true };
}
