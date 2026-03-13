'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/notifications/email-service';
import { getBaseEmailTemplate, createInfoBox, createDetailsList } from '@/lib/notifications/templates/base';

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

function buildTeamInviteEmail(params: {
  teamName: string;
  seasonName: string;
  leagueName: string;
  invitedByName: string;
  signupUrl: string;
  inviteStatus: 'pending' | 'auto_added';
  message?: string | null;
  expiresAt?: string;
  leagueLogo?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}) {
  const {
    teamName,
    seasonName,
    leagueName,
    invitedByName,
    signupUrl,
    inviteStatus,
    message,
    expiresAt,
    leagueLogo,
    primaryColor,
    secondaryColor,
    accentColor,
  } = params;

  const details = [
    { label: 'League', value: leagueName },
    { label: 'Team', value: teamName },
    { label: 'Season', value: seasonName },
    { label: 'Invited by', value: invitedByName },
  ];

  if (expiresAt) {
    details.push({
      label: 'Expires',
      value: new Date(expiresAt).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    });
  }

  const intro =
    inviteStatus === 'auto_added'
      ? `<p>You were added to the <strong>${teamName}</strong> roster for the <strong>${seasonName}</strong> season.</p>
         <p>Sign in to BeerLeagueHockey.ca with this email to review your team details, waivers, schedule, and payments.</p>`
      : `<p>You’ve been invited to join <strong>${teamName}</strong> for the <strong>${seasonName}</strong> season.</p>
         <p>Create your account or sign in with this email to get started with waivers, registration, and payments.</p>`;

  const content = `
    <p>Hi there,</p>
    ${intro}
    ${createDetailsList(details)}
    ${message ? createInfoBox(`<strong>Message from ${invitedByName}</strong><br>${message}`) : ''}
    ${inviteStatus === 'pending'
      ? createInfoBox('Use the same email address this invite was sent to when you create your account so league staff can match your invite quickly.')
      : ''}
  `;

  return getBaseEmailTemplate({
    title: inviteStatus === 'auto_added' ? `You were added to ${teamName}` : `Invitation to join ${teamName}`,
    preheader:
      inviteStatus === 'auto_added'
        ? `You were added to ${teamName} in ${leagueName}`
        : `Join ${teamName} for the ${seasonName} season`,
    content,
    buttonText: inviteStatus === 'auto_added' ? 'Open Dashboard' : 'Create Account or Sign In',
    buttonUrl: signupUrl,
    footerNote: 'If you were not expecting this invite, you can ignore this email.',
    leagueName,
    leagueLogo: leagueLogo || undefined,
    primaryColor: primaryColor || undefined,
    secondaryColor: secondaryColor || undefined,
    accentColor: accentColor || undefined,
  });
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
    .select(`
      id,
      name,
      captain_id,
      league_id,
      leagues (
        name,
        logo_url,
        primary_color,
        secondary_color,
        accent_color
      )
    `)
    .eq('id', teamId)
    .single();

  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  const [{ data: inviter }, { data: season }] = await Promise.all([
    serviceSupabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle(),
    serviceSupabase
      .from('seasons')
      .select('name')
      .eq('id', seasonId)
      .maybeSingle(),
  ]);

  if (team.captain_id !== user.id) {
    // Check if the current user is a league admin/owner via league_memberships
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', team.league_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
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

  if (existingProfile) {
    const { data: existingRoster } = await serviceSupabase
      .from('team_rosters')
      .select('id')
      .eq('team_id', teamId)
      .eq('player_id', existingProfile.id)
      .eq('season_id', seasonId)
      .is('end_date', null)
      .maybeSingle();

    if (existingRoster) {
      return { success: false, error: 'This player is already on the roster for this season' };
    }
  }

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
    .select('id, expires_at')
    .single();

  if (error || !invite) {
    if (isDevelopment) {
      console.error('[team-invites] Insert error:', error?.message);
    }
    return { success: false, error: 'Failed to send invite' };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca').replace(/\/$/, '');
  const signupUrl = `${siteUrl}/en/signup?teamInvite=${invite.id}`;
  const leagueBranding = Array.isArray(team.leagues) ? team.leagues[0] : team.leagues;
  const inviterName = inviter?.full_name || 'Your league administrator';
  const seasonName = season?.name || 'upcoming season';
  const leagueName = leagueBranding?.name || 'Beer League Hockey';

  // If the player already has an account, auto-accept the invite and add to roster
  if (existingProfile) {
    const { error: rosterInsertError } = await serviceSupabase
      .from('team_rosters')
      .insert({
        team_id: teamId,
        player_id: existingProfile.id,
        league_id: team!.league_id,
        season_id: seasonId,
        jersey_number: 99,
        position: 'Forward',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      } as any);

    if (rosterInsertError) {
      if (isDevelopment) {
        console.error('[team-invites] Failed to auto-add existing player to roster:', rosterInsertError.message);
      }
      return { success: false, error: `Failed to add player to roster: ${rosterInsertError.message}` };
    }

    const { error: acceptInviteError } = await serviceSupabase
      .from('team_invites')
      .update({ status: 'accepted', accepted_by: existingProfile.id } as any)
      .eq('id', invite.id);

    if (acceptInviteError && isDevelopment) {
      console.error('[team-invites] Failed to mark invite accepted:', acceptInviteError.message);
    }

    await sendEmail({
      to: email.toLowerCase().trim(),
      subject: `You were added to ${team.name} in ${leagueName}`,
      html: buildTeamInviteEmail({
        teamName: team.name,
        seasonName,
        leagueName,
        invitedByName: inviterName,
        signupUrl,
        inviteStatus: 'auto_added',
        message: message || null,
        expiresAt: undefined,
        leagueLogo: leagueBranding?.logo_url || null,
        primaryColor: leagueBranding?.primary_color || null,
        secondaryColor: leagueBranding?.secondary_color || null,
        accentColor: leagueBranding?.accent_color || null,
      }),
      tags: [
        { name: 'type', value: 'team_invite' },
        { name: 'team_id', value: teamId },
      ],
    });
  } else {
    await sendEmail({
      to: email.toLowerCase().trim(),
      subject: `You’ve been invited to join ${team.name}`,
      html: buildTeamInviteEmail({
        teamName: team.name,
        seasonName,
        leagueName,
        invitedByName: inviterName,
        signupUrl,
        inviteStatus: 'pending',
        message: message || null,
        expiresAt: invite.expires_at || undefined,
        leagueLogo: leagueBranding?.logo_url || null,
        primaryColor: leagueBranding?.primary_color || null,
        secondaryColor: leagueBranding?.secondary_color || null,
        accentColor: leagueBranding?.accent_color || null,
      }),
      tags: [
        { name: 'type', value: 'team_invite' },
        { name: 'team_id', value: teamId },
      ],
    });
  }

  revalidatePath(`/dashboard/leagues/${team!.league_id}`);
  revalidatePath(`/dashboard/teams/${teamId}`);

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
