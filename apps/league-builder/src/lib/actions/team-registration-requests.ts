'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { verifyLeagueOwnerAccess } from './permissions';
import {
  sendTeamRequestSubmittedEmail,
  sendTeamRequestApprovedEmail,
  sendTeamRequestDeniedEmail,
  notifyLeagueAdminsOfNewTeamRequest,
} from '@/lib/email/team-request-emails';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Type definitions
export type TeamRegistrationRequestStatus = 'pending' | 'approved' | 'denied';

export interface TeamRegistrationRequest {
  id: string;
  league_id: string;
  requested_division_id: string | null;
  assigned_division_id: string | null;
  requester_id: string;
  team_name: string;
  team_short_name: string;
  team_primary_color: string | null;
  team_secondary_color: string | null;
  team_logo_url: string | null;
  team_contact_email: string | null;
  team_contact_phone: string | null;
  message: string | null;
  preferred_division_notes: string | null;
  status: TeamRegistrationRequestStatus;
  admin_notes: string | null;
  denial_reason: string | null;
  created_team_id: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface TeamRegistrationRequestWithDetails extends TeamRegistrationRequest {
  source_table?: 'team_registration_requests' | 'team_registrations';
  season_id?: string | null;
  requester?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  requested_division?: {
    id: string;
    name: string;
  } | null;
  assigned_division?: {
    id: string;
    name: string;
  } | null;
  reviewer?: {
    id: string;
    full_name: string;
  } | null;
}

function generateShortName(teamName: string): string {
  const words = teamName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'TEAM';

  const initials = words
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);

  if (initials.length >= 2) {
    return initials;
  }

  return teamName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'TEAM';
}

function buildLegacyPreferredDivisionNotes(row: any): string | null {
  const notes = [
    row.level ? `Requested level: ${row.level}` : null,
    typeof row.played_last_season === 'boolean'
      ? `Played last season: ${row.played_last_season ? 'Yes' : 'No'}`
      : null,
    row.team_last_season ? `Previous team: ${row.team_last_season}` : null,
    row.location_preference ? `Location preference: ${row.location_preference}` : null,
    row.preferred_day ? `Preferred day: ${row.preferred_day}` : null,
    row.alternate_day ? `Alternate day: ${row.alternate_day}` : null,
    row.backup_rep_name ? `Backup rep: ${row.backup_rep_name}` : null,
    row.backup_rep_email ? `Backup rep email: ${row.backup_rep_email}` : null,
    row.waiver_version ? `Waiver version accepted: ${row.waiver_version}` : null,
  ].filter(Boolean);

  return notes.length > 0 ? notes.join('\n') : null;
}

async function syncLegacyTeamRegistrationsIntoRequests(leagueId: string): Promise<void> {
  const serviceSupabase = createServiceRoleClient();

  const [{ data: legacyRows }, { data: pendingRequests }] =
    await Promise.all([
      serviceSupabase
        .from('team_registrations')
        .select(`
          id,
          league_id,
          season_id,
          submitted_by,
          team_name,
          level,
          played_last_season,
          team_last_season,
          backup_rep_name,
          backup_rep_email,
          location_preference,
          preferred_day,
          alternate_day,
          comments,
          waiver_version,
          status,
          created_at,
          submitter:profiles!team_registrations_submitted_by_fkey(email)
        `)
        .eq('league_id', leagueId)
        .eq('status', 'pending'),
      serviceSupabase
        .from('team_registration_requests')
        .select('requester_id, team_name, status')
        .eq('league_id', leagueId)
        .eq('status', 'pending'),
    ]);

  const existingKeys = new Set(
    (pendingRequests ?? []).map((row: any) => `${row.requester_id}:${row.team_name.toLowerCase()}`)
  );

  const rowsToInsert = (legacyRows ?? [])
    .filter((row: any) => row.submitted_by)
    .filter((row: any) => !existingKeys.has(`${row.submitted_by}:${String(row.team_name).toLowerCase()}`))
    .map((row: any) => ({
      league_id: row.league_id,
      requester_id: row.submitted_by,
      team_name: row.team_name,
      team_short_name: generateShortName(row.team_name),
      team_primary_color: '#22D3EE',
      team_secondary_color: '#070A0F',
      team_contact_email:
        row.backup_rep_email ||
        (Array.isArray(row.submitter) ? row.submitter[0]?.email : row.submitter?.email) ||
        null,
      message: row.comments || null,
      preferred_division_notes: buildLegacyPreferredDivisionNotes(row),
      status: 'pending',
      requested_at: row.created_at,
    }));

  if (rowsToInsert.length === 0) {
    return;
  }

  const { error } = await serviceSupabase
    .from('team_registration_requests')
    .insert(rowsToInsert);

  if (error) {
    console.error('Error syncing legacy team registrations:', sanitizeErrorForLogging(error));
  }
}

export interface SubmitTeamRequestParams {
  leagueId: string;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
  teamContactEmail?: string;
  teamContactPhone?: string;
  requestedDivisionId?: string;
  message?: string;
  preferredDivisionNotes?: string;
}

export interface ApproveTeamRequestParams {
  requestId: string;
  assignedDivisionId?: string;
  adminNotes?: string;
}

export interface DenyTeamRequestParams {
  requestId: string;
  denialReason: string;
  adminNotes?: string;
}

// ============================================================================
// SUBMIT TEAM REGISTRATION REQUEST
// ============================================================================

/**
 * Submit a team registration request to join a league
 */
export async function submitTeamRegistrationRequest(params: SubmitTeamRequestParams) {
  const {
    leagueId,
    teamName,
    teamShortName,
    teamPrimaryColor = '#22D3EE',
    teamSecondaryColor = '#070A0F',
    teamContactEmail,
    teamContactPhone,
    requestedDivisionId,
    message,
    preferredDivisionNotes,
  } = params;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Check if user already has a pending request for this league
    const { data: existingRequest } = await supabase
      .from('team_registration_requests')
      .select('id, status')
      .eq('league_id', leagueId)
      .eq('requester_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return { error: 'You already have a pending team registration request for this league' };
    }

    // Check if team name is already taken in the league
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .eq('name', teamName)
      .single();

    if (existingTeam) {
      return { error: 'A team with this name already exists in the league' };
    }

    // Check if there's already a request with this team name
    const { data: existingRequestWithName } = await supabase
      .from('team_registration_requests')
      .select('id')
      .eq('league_id', leagueId)
      .eq('team_name', teamName)
      .eq('status', 'pending')
      .single();

    if (existingRequestWithName) {
      return { error: 'A team registration request with this name is already pending' };
    }

    // Create the request
    const { data: request, error: insertError } = await supabase
      .from('team_registration_requests')
      .insert({
        league_id: leagueId,
        requester_id: user.id,
        team_name: teamName,
        team_short_name: teamShortName,
        team_primary_color: teamPrimaryColor,
        team_secondary_color: teamSecondaryColor,
        team_contact_email: teamContactEmail || null,
        team_contact_phone: teamContactPhone || null,
        requested_division_id: requestedDivisionId || null,
        message: message || null,
        preferred_division_notes: preferredDivisionNotes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      if (isDevelopment) {
        console.error('Error creating team registration request:', sanitizeErrorForLogging(insertError));
      }
      return { error: 'Failed to submit team registration request' };
    }

    // Fetch league name and requester profile for emails
    const [{ data: league }, { data: requesterProfile }, { data: adminMembers }] = await Promise.all([
      supabase.from('leagues').select('name').eq('id', leagueId).single(),
      supabase.from('profiles').select('email, full_name').eq('id', user.id).single(),
      supabase
        .from('league_memberships')
        .select('user_id, profiles!inner(email, full_name)')
        .eq('league_id', leagueId)
        .eq('status', 'active')
        .in('role', ['owner', 'admin']),
    ]);

    // Send confirmation email to requester (fire-and-forget)
    if (requesterProfile?.email && league) {
      sendTeamRequestSubmittedEmail({
        to: requesterProfile.email,
        requesterName: requesterProfile.full_name || 'Team Manager',
        leagueName: league.name,
        teamName,
        teamShortName,
        requestedDivision: undefined,
        submittedAt: new Date(),
        requestId: request.id,
      }).catch((err) => {
        console.error('[TeamRegistration] Failed to send submitted email:', err);
      });
    }

    // Notify league admins (fire-and-forget)
    if (adminMembers && adminMembers.length > 0 && league) {
      const { count: pendingCount } = await supabase
        .from('team_registration_requests')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('status', 'pending');

      const adminEmails = adminMembers
        .map((m: any) => ({
          email: m.profiles?.email as string,
          name: (m.profiles?.full_name as string) || 'Admin',
        }))
        .filter((a) => a.email);

      notifyLeagueAdminsOfNewTeamRequest({
        adminEmails,
        leagueName: league.name,
        requesterName: requesterProfile?.full_name || 'Unknown',
        requesterEmail: requesterProfile?.email || '',
        teamName,
        teamShortName,
        teamContactEmail,
        requestedDivision: undefined,
        message,
        submittedAt: new Date(),
        pendingCount: pendingCount || 1,
        requestId: request.id,
        leagueId,
      }).catch((err) => {
        console.error('[TeamRegistration] Failed to notify admins:', err);
      });
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/teams`);
    return { success: true, data: request };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in submitTeamRegistrationRequest:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// GET TEAM REGISTRATION REQUESTS
// ============================================================================

/**
 * Get all team registration requests for a league
 * Only accessible by league admins/owners
 */
export async function getTeamRegistrationRequests(leagueId: string, options?: { status?: TeamRegistrationRequestStatus }) {
  const supabase = await createClient();

  // Verify league owner/admin access
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    // Try checking league membership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .single();

    if (!membership) {
      return { error: 'Not authorized to view team registration requests' };
    }
  }

  try {
    await syncLegacyTeamRegistrationsIntoRequests(leagueId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('team_registration_requests')
      .select(`
        *,
        requester:requester_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        requested_division:requested_division_id (
          id,
          name
        ),
        assigned_division:assigned_division_id (
          id,
          name
        ),
        reviewer:reviewed_by (
          id,
          full_name
        )
      `)
      .eq('league_id', leagueId)
      .order('requested_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data: requests, error } = await query;

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching team registration requests:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch team registration requests' };
    }

    return { success: true, data: requests || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamRegistrationRequests:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get pending team registration requests count for a league
 */
export async function getPendingTeamRegistrationRequestsCount(leagueId: string) {
  const supabase = await createClient();

  try {
    await syncLegacyTeamRegistrationsIntoRequests(leagueId);

    const { count, error } = await supabase
      .from('team_registration_requests')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'pending');

    if (error) {
      if (isDevelopment) {
        console.error('Error counting team registration requests:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to count requests' };
    }

    return { success: true, data: count || 0 };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getPendingTeamRegistrationRequestsCount:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get a single team registration request by ID
 */
export async function getTeamRegistrationRequest(requestId: string) {
  const supabase = await createClient();

  try {
    const { data: request, error } = await supabase
      .from('team_registration_requests')
      .select(`
        *,
        requester:requester_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        requested_division:requested_division_id (
          id,
          name
        ),
        assigned_division:assigned_division_id (
          id,
          name
        ),
        reviewer:reviewed_by (
          id,
          full_name
        )
      `)
      .eq('id', requestId)
      .single();

    if (error || !request) {
      if (isDevelopment) {
        console.error('Error fetching team registration request:', sanitizeErrorForLogging(error));
      }
      return { error: 'Request not found' };
    }

    return { success: true, data: request };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamRegistrationRequest:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// APPROVE TEAM REGISTRATION REQUEST
// ============================================================================

/**
 * Approve a team registration request and create the team
 */
export async function approveTeamRegistrationRequest(params: ApproveTeamRequestParams) {
  const { requestId, assignedDivisionId, adminNotes } = params;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get the request with league info
    const { data: request, error: fetchError } = await supabase
      .from('team_registration_requests')
      .select('*, leagues!inner(id, organization_id)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      if (isDevelopment) {
        console.error('Error fetching request:', sanitizeErrorForLogging(fetchError));
      }
      return { error: 'Request not found' };
    }

    // Verify admin access
    const access = await verifyLeagueOwnerAccess(request.league_id);
    if (!access.authorized) {
      const { data: membership } = await supabase
        .from('league_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('league_id', request.league_id)
        .eq('status', 'active')
        .in('role', ['owner', 'admin'])
        .single();

      if (!membership) {
        return { error: 'Not authorized to approve team registration requests' };
      }
    }

    // Check current status
    if (request.status !== 'pending') {
      return { error: `Request has already been ${request.status}` };
    }

    // Check if team name still available
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', request.league_id)
      .eq('name', request.team_name)
      .single();

    if (existingTeam) {
      return { error: 'A team with this name was created while this request was pending. Please deny this request.' };
    }

    // Create the team
    const divisionId = assignedDivisionId || request.requested_division_id;

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        league_id: request.league_id,
        name: request.team_name,
        short_name: request.team_short_name,
        primary_color: request.team_primary_color,
        secondary_color: request.team_secondary_color,
        logo_url: request.team_logo_url,
        contact_email: request.team_contact_email,
        contact_phone: request.team_contact_phone,
        division_id: divisionId,
        captain_id: request.requester_id, // Make requester the captain
        status: 'active',
      })
      .select()
      .single();

    if (teamError || !team) {
      if (isDevelopment) {
        console.error('Error creating team:', sanitizeErrorForLogging(teamError));
      }
      return { error: 'Failed to create team' };
    }

    // Update the request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('team_registration_requests')
      .update({
        status: 'approved',
        assigned_division_id: divisionId,
        admin_notes: adminNotes || null,
        created_team_id: team.id,
      })
      .eq('id', requestId)
      .eq('status', 'pending') // Prevent race condition
      .select()
      .single();

    if (updateError || !updatedRequest) {
      // Rollback team creation if request update fails
      await supabase.from('teams').delete().eq('id', team.id);

      if (isDevelopment) {
        console.error('Error updating request:', sanitizeErrorForLogging(updateError));
      }
      return { error: 'Request was already reviewed by someone else' };
    }

    // Send approval email to requester (fire-and-forget)
    const { data: requester } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', request.requester_id)
      .single();

    const { data: leagueInfo } = await supabase
      .from('leagues')
      .select('name')
      .eq('id', request.league_id)
      .single();

    if (requester?.email && leagueInfo) {
      const division = divisionId
        ? await supabase
            .from('divisions')
            .select('name')
            .eq('id', divisionId)
            .single()
            .then((r) => r.data?.name)
        : undefined;

      sendTeamRequestApprovedEmail({
        to: requester.email,
        requesterName: requester.full_name || 'Team Manager',
        leagueName: leagueInfo.name,
        teamName: request.team_name,
        teamShortName: request.team_short_name,
        assignedDivision: division || undefined,
        approvedAt: new Date(),
        teamId: team.id,
      }).catch((err) => {
        console.error('[TeamRegistration] Failed to send approval email:', err);
      });
    }

    revalidatePath(`/dashboard/leagues/${request.league_id}/teams`);

    return {
      success: true,
      data: {
        request: updatedRequest,
        team,
      },
      message: 'Team registration approved and team created successfully',
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in approveTeamRegistrationRequest:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// DENY TEAM REGISTRATION REQUEST
// ============================================================================

/**
 * Deny a team registration request
 */
export async function denyTeamRegistrationRequest(params: DenyTeamRequestParams) {
  const { requestId, denialReason, adminNotes } = params;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('team_registration_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      if (isDevelopment) {
        console.error('Error fetching request:', sanitizeErrorForLogging(fetchError));
      }
      return { error: 'Request not found' };
    }

    // Verify admin access
    const access = await verifyLeagueOwnerAccess(request.league_id);
    if (!access.authorized) {
      const { data: membership } = await supabase
        .from('league_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('league_id', request.league_id)
        .eq('status', 'active')
        .in('role', ['owner', 'admin'])
        .single();

      if (!membership) {
        return { error: 'Not authorized to deny team registration requests' };
      }
    }

    // Check current status
    if (request.status !== 'pending') {
      return { error: `Request has already been ${request.status}` };
    }

    // Update the request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('team_registration_requests')
      .update({
        status: 'denied',
        denial_reason: denialReason,
        admin_notes: adminNotes || null,
      })
      .eq('id', requestId)
      .eq('status', 'pending') // Prevent race condition
      .select()
      .single();

    if (updateError || !updatedRequest) {
      if (isDevelopment) {
        console.error('Error updating request:', sanitizeErrorForLogging(updateError));
      }
      return { error: 'Request was already reviewed by someone else' };
    }

    // Send denial email to requester (fire-and-forget)
    const { data: requester } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', request.requester_id)
      .single();

    const { data: leagueInfo } = await supabase
      .from('leagues')
      .select('name, contact_email')
      .eq('id', request.league_id)
      .single();

    if (requester?.email && leagueInfo) {
      sendTeamRequestDeniedEmail({
        to: requester.email,
        requesterName: requester.full_name || 'Team Manager',
        leagueName: leagueInfo.name,
        teamName: request.team_name,
        denialReason: denialReason,
        deniedAt: new Date(),
        canReapply: true,
        contactEmail: (leagueInfo as any).contact_email || undefined,
        leagueId: request.league_id,
      }).catch((err) => {
        console.error('[TeamRegistration] Failed to send denial email:', err);
      });
    }

    revalidatePath(`/dashboard/leagues/${request.league_id}/teams`);

    return {
      success: true,
      data: updatedRequest,
      message: 'Team registration request denied',
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in denyTeamRegistrationRequest:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// GET USER'S OWN REQUESTS
// ============================================================================

/**
 * Get current user's team registration requests
 */
export async function getUserTeamRegistrationRequests() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { data: requests, error } = await supabase
      .from('team_registration_requests')
      .select(`
        *,
        leagues!inner (
          id,
          name
        ),
        requested_division:requested_division_id (
          id,
          name
        ),
        assigned_division:assigned_division_id (
          id,
          name
        )
      `)
      .eq('requester_id', user.id)
      .order('requested_at', { ascending: false });

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching user requests:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch your requests' };
    }

    return { success: true, data: requests || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getUserTeamRegistrationRequests:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Cancel a pending team registration request (user's own)
 */
export async function cancelTeamRegistrationRequest(requestId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get request to verify ownership
    const { data: request, error: fetchError } = await supabase
      .from('team_registration_requests')
      .select('requester_id, league_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { error: 'Request not found' };
    }

    // Verify ownership
    if (request.requester_id !== user.id) {
      return { error: 'Not authorized to cancel this request' };
    }

    // Can only cancel pending requests
    if (request.status !== 'pending') {
      return { error: `Cannot cancel ${request.status} request` };
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('team_registration_requests')
      .delete()
      .eq('id', requestId)
      .eq('status', 'pending');

    if (deleteError) {
      if (isDevelopment) {
        console.error('Error canceling request:', sanitizeErrorForLogging(deleteError));
      }
      return { error: 'Failed to cancel request' };
    }

    revalidatePath(`/dashboard/leagues/${request.league_id}/teams`);
    return { success: true, message: 'Request cancelled successfully' };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in cancelTeamRegistrationRequest:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}
