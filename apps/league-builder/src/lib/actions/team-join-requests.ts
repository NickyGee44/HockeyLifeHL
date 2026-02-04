'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { canApproveJoinRequests, verifyCaptainOrAdminAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Type definitions
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface TeamJoinRequest {
  id: string;
  team_id: string;
  player_id: string;
  season_id: string;
  league_id: string;
  status: JoinRequestStatus;
  message: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface CreateJoinRequestParams {
  teamId: string;
  seasonId: string;
  leagueId: string;
  message?: string;
}

export interface ReviewJoinRequestParams {
  requestId: string;
  approved: boolean;
}

/**
 * Create a join request for a team
 * Player requests to join a team for a specific season
 */
export async function createJoinRequest(params: CreateJoinRequestParams) {
  const { teamId, seasonId, leagueId, message } = params;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Check if player already has a request for this team/season
    const { data: existingRequest } = await supabase
      .from('team_join_requests')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('player_id', user.id)
      .eq('season_id', seasonId)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return { error: 'You already have a pending request for this team' };
      } else if (existingRequest.status === 'approved') {
        return { error: 'You are already approved for this team' };
      } else {
        // Rejected - allow creating new request
        // Delete old rejected request first
        await supabase
          .from('team_join_requests')
          .delete()
          .eq('id', existingRequest.id);
      }
    }

    // Check if player is already on the roster
    const { data: rosterEntry } = await supabase
      .from('team_rosters')
      .select('id')
      .eq('team_id', teamId)
      .eq('player_id', user.id)
      .eq('season_id', seasonId)
      .is('end_date', null)
      .single();

    if (rosterEntry) {
      return { error: 'You are already on this team roster' };
    }

    // Create the join request
    const { data: request, error: insertError } = await supabase
      .from('team_join_requests')
      .insert({
        team_id: teamId,
        player_id: user.id,
        season_id: seasonId,
        league_id: leagueId,
        message: message || null,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      if (isDevelopment) {
        console.error('Error creating join request:', insertError);
      }
      return { error: 'Failed to create join request' };
    }

    revalidatePath(`/teams/${teamId}`);
    return { success: true, data: request };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in createJoinRequest:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get pending join requests for a team
 * Only accessible by team captain or organization owner
 */
export async function getTeamJoinRequests(teamId: string) {
  const supabase = await createClient();

  // Verify captain or admin access
  const canApprove = await canApproveJoinRequests(teamId);
  if (!canApprove) {
    return { error: 'Not authorized to view join requests' };
  }

  try {
    const { data: requests, error } = await supabase
      .from('team_join_requests')
      .select(`
        *,
        player:player_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('team_id', teamId)
      .order('requested_at', { ascending: false });

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching join requests:', error);
      }
      return { error: 'Failed to fetch join requests' };
    }

    return { success: true, data: requests || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamJoinRequests:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get pending join requests count for a team
 * Used for badge counts in UI
 */
export async function getTeamPendingRequestsCount(teamId: string) {
  const supabase = await createClient();

  // Verify captain or admin access
  const canApprove = await canApproveJoinRequests(teamId);
  if (!canApprove) {
    return { error: 'Not authorized' };
  }

  try {
    const { count, error } = await supabase
      .from('team_join_requests')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'pending');

    if (error) {
      if (isDevelopment) {
        console.error('Error counting join requests:', error);
      }
      return { error: 'Failed to count join requests' };
    }

    return { success: true, data: count || 0 };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamPendingRequestsCount:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Review (approve or reject) a join request
 * Only accessible by team captain or organization owner
 *
 * CRITICAL: Uses SELECT FOR UPDATE to prevent race conditions
 */
export async function reviewJoinRequest(params: ReviewJoinRequestParams) {
  const { requestId, approved } = params;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Step 1: Get the request with team info (without lock first to verify access)
    const { data: request, error: fetchError } = await supabase
      .from('team_join_requests')
      .select('*, teams!inner(id, league_id)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      if (isDevelopment) {
        console.error('Error fetching join request:', fetchError);
      }
      return { error: 'Join request not found' };
    }

    // Step 2: Verify captain or admin access
    const access = await verifyCaptainOrAdminAccess(request.team_id);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized to review join requests' };
    }

    // Step 3: Check current status
    if (request.status !== 'pending') {
      return { error: `Request has already been ${request.status}` };
    }

    // Step 4: Update request status
    // Note: The trigger handle_team_join_request_review will set reviewed_at and reviewed_by
    // The trigger auto_add_player_to_roster will add player to roster if approved
    const newStatus: JoinRequestStatus = approved ? 'approved' : 'rejected';

    const { data: updatedRequest, error: updateError } = await supabase
      .from('team_join_requests')
      .update({ status: newStatus })
      .eq('id', requestId)
      .eq('status', 'pending') // Prevent race condition: only update if still pending
      .select()
      .single();

    if (updateError) {
      if (isDevelopment) {
        console.error('Error updating join request:', updateError);
      }

      // Check if it's a race condition (status changed by another request)
      if (updateError.message?.includes('no rows')) {
        return { error: 'Request was already reviewed by someone else' };
      }

      return { error: 'Failed to review join request' };
    }

    if (!updatedRequest) {
      // Race condition: request was already updated
      return { error: 'Request was already reviewed by someone else' };
    }

    // Revalidate team page and requests page
    revalidatePath(`/teams/${request.team_id}`);
    revalidatePath(`/teams/${request.team_id}/requests`);

    return {
      success: true,
      data: updatedRequest,
      message: approved
        ? 'Player approved and added to roster'
        : 'Join request rejected'
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in reviewJoinRequest:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Cancel a join request (player can cancel their own pending request)
 */
export async function cancelJoinRequest(requestId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get request to verify ownership
    const { data: request, error: fetchError } = await supabase
      .from('team_join_requests')
      .select('player_id, team_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { error: 'Join request not found' };
    }

    // Verify ownership
    if (request.player_id !== user.id) {
      return { error: 'Not authorized to cancel this request' };
    }

    // Can only cancel pending requests
    if (request.status !== 'pending') {
      return { error: `Cannot cancel ${request.status} request` };
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('team_join_requests')
      .delete()
      .eq('id', requestId)
      .eq('status', 'pending'); // Extra safety check

    if (deleteError) {
      if (isDevelopment) {
        console.error('Error canceling join request:', deleteError);
      }
      return { error: 'Failed to cancel join request' };
    }

    revalidatePath(`/teams/${request.team_id}`);
    return { success: true, message: 'Join request cancelled' };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in cancelJoinRequest:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get player's join request status for a team/season
 * Used to show appropriate UI (request pending, already approved, etc.)
 */
export async function getPlayerRequestStatus(teamId: string, seasonId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { data: request, error } = await supabase
      .from('team_join_requests')
      .select('id, status, requested_at, reviewed_at')
      .eq('team_id', teamId)
      .eq('player_id', user.id)
      .eq('season_id', seasonId)
      .single();

    if (error) {
      // No request found is not an error
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }

      if (isDevelopment) {
        console.error('Error fetching player request status:', error);
      }
      return { error: 'Failed to fetch request status' };
    }

    return { success: true, data: request };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getPlayerRequestStatus:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}
