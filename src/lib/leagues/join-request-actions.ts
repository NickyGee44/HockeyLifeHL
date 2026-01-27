"use server";

import { createClient } from "@/lib/supabase/server";
import { stripHtml } from "@/lib/input-sanitization";
import { RateLimiters } from "@/lib/rate-limit";

export type JoinRequestResult = {
  error?: string;
  success?: boolean;
  requestId?: string;
  status?: 'pending' | 'approved' | 'rejected';
};

export type JoinRequestStatusResult = {
  error?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'none';
  created_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
};

export type PendingJoinRequest = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  message: string | null;
  created_at: string;
};

export type PendingRequestsResult = {
  error?: string;
  requests?: PendingJoinRequest[];
};

/**
 * Request to join a public league
 *
 * Requirements:
 * - User must be authenticated
 * - League must be public and active
 * - User must not already be a member
 * - User must not have a pending request
 */
export async function requestJoinLeague(data: {
  leagueId: string;
  message?: string;
}): Promise<JoinRequestResult> {
  try {
    const supabase = await createClient();

    // ============================================================================
    // 1. CHECK AUTHENTICATION
    // ============================================================================

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'You must be logged in to join a league' };
    }

    // ============================================================================
    // 1.5 RATE LIMITING
    // ============================================================================
    // SECURITY: Prevent abuse by limiting join requests to 10 per minute per user
    const rateLimitKey = `join-request:${user.id}`;
    const rateLimit = await RateLimiters.standard.check(rateLimitKey);
    if (!rateLimit.success) {
      return {
        error: "Too many join requests. Please try again later."
      };
    }

    // ============================================================================
    // 2. VALIDATE LEAGUE
    // ============================================================================

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, is_public, status')
      .eq('id', data.leagueId)
      .single();

    if (leagueError || !league) {
      return { error: 'League not found' };
    }

    if (!league.is_public) {
      return { error: 'This league is not accepting public join requests. Please contact the league administrator.' };
    }

    if (league.status !== 'active') {
      return { error: 'This league is not currently active' };
    }

    // ============================================================================
    // 3. CHECK IF ALREADY A MEMBER
    // ============================================================================

    const { data: existingMembership, error: membershipError } = await supabase
      .from('league_memberships')
      .select('id, status, role')
      .eq('league_id', data.leagueId)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        return { error: 'You are already a member of this league' };
      }
      if (existingMembership.status === 'suspended') {
        return { error: 'Your membership in this league has been suspended. Please contact the league administrator.' };
      }
    }

    // ============================================================================
    // 4. CHECK FOR EXISTING REQUEST
    // ============================================================================

    const { data: existingRequest, error: requestCheckError } = await (supabase as any)
      .from('league_join_requests')
      .select('id, status, created_at, rejection_reason')
      .eq('league_id', data.leagueId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return {
          error: 'You already have a pending request to join this league',
          requestId: existingRequest.id,
          status: 'pending',
        };
      }

      if (existingRequest.status === 'rejected') {
        // Check if rejection was recent (within last 30 days)
        const rejectionDate = new Date(existingRequest.created_at);
        const daysSinceRejection = Math.floor(
          (Date.now() - rejectionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceRejection < 30) {
          const reason = existingRequest.rejection_reason
            ? `Reason: ${existingRequest.rejection_reason}`
            : '';
          return {
            error: `Your previous request was rejected ${daysSinceRejection} days ago. Please wait 30 days before requesting again. ${reason}`,
            status: 'rejected',
          };
        }

        // If rejection was more than 30 days ago, allow new request
        // Delete old rejected request
        await (supabase as any)
          .from('league_join_requests')
          .delete()
          .eq('id', existingRequest.id);
      }
    }

    // ============================================================================
    // 5. SANITIZE MESSAGE
    // ============================================================================

    const message = data.message ? stripHtml(data.message).trim() : null;

    // Limit message length
    const finalMessage = message && message.length > 500
      ? message.substring(0, 500)
      : message;

    // ============================================================================
    // 6. CREATE JOIN REQUEST
    // ============================================================================

    const { data: newRequest, error: createError } = await (supabase as any)
      .from('league_join_requests')
      .insert({
        league_id: data.leagueId,
        user_id: user.id,
        message: finalMessage,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating join request:', createError);

      // Handle unique constraint violation (shouldn't happen due to checks above)
      if (createError.message.includes('duplicate') || createError.code === '23505') {
        return { error: 'You already have a pending request for this league' };
      }

      return { error: 'Failed to submit join request. Please try again.' };
    }

    if (!newRequest) {
      return { error: 'Failed to create join request' };
    }

    // TODO: Send notification to league admins/owners
    // await notifyLeagueAdmins(data.leagueId, user.id);

    return {
      success: true,
      requestId: newRequest.id,
      status: 'pending',
    };
  } catch (error: any) {
    console.error('Unexpected error in requestJoinLeague:', error);
    return {
      error: error.message || 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Get the status of the current user's join request for a league
 */
export async function getMyJoinRequestStatus(
  leagueId: string
): Promise<JoinRequestStatusResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Use the helper function
    const { data, error } = await (supabase as any)
      .rpc('get_user_league_join_status', {
        p_user_id: user.id,
        p_league_id: leagueId,
      });

    if (error) {
      console.error('Error fetching join request status:', error);
      return { error: 'Failed to fetch request status' };
    }

    if (!data || data.length === 0) {
      return { status: 'none' };
    }

    const request = data[0];
    return {
      status: request.status,
      created_at: request.created_at,
      reviewed_at: request.reviewed_at,
      rejection_reason: request.rejection_reason,
    };
  } catch (error: any) {
    console.error('Unexpected error in getMyJoinRequestStatus:', error);
    return { error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Withdraw a pending join request
 * Users can only withdraw their own pending requests
 */
export async function withdrawJoinRequest(
  requestId: string
): Promise<JoinRequestResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Verify the request exists and belongs to the user
    const { data: request, error: fetchError } = await (supabase as any)
      .from('league_join_requests')
      .select('id, user_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { error: 'Join request not found' };
    }

    if (request.user_id !== user.id) {
      return { error: 'You can only withdraw your own requests' };
    }

    if (request.status !== 'pending') {
      return { error: 'You can only withdraw pending requests' };
    }

    // Delete the request
    const { error: deleteError } = await (supabase as any)
      .from('league_join_requests')
      .delete()
      .eq('id', requestId);

    if (deleteError) {
      console.error('Error withdrawing join request:', deleteError);
      return { error: 'Failed to withdraw request. Please try again.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error in withdrawJoinRequest:', error);
    return { error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Get pending join requests for a league (admin only)
 * Requires owner or admin role
 */
export async function getPendingJoinRequests(
  leagueId: string
): Promise<PendingRequestsResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Verify user is admin or owner of the league
    const { data: membership, error: membershipError } = await supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return { error: 'You are not a member of this league' };
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return { error: 'Only league owners and admins can view join requests' };
    }

    if (membership.status !== 'active') {
      return { error: 'Your membership is not active' };
    }

    // Get pending requests using helper function
    const { data: requests, error } = await (supabase as any)
      .rpc('get_league_pending_join_requests', {
        p_league_id: leagueId,
      });

    if (error) {
      console.error('Error fetching pending requests:', error);
      return { error: 'Failed to fetch pending requests' };
    }

    return { requests: requests || [] };
  } catch (error: any) {
    console.error('Unexpected error in getPendingJoinRequests:', error);
    return { error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Approve a join request (admin only)
 * Automatically adds user to league with 'member' role via database trigger
 */
export async function approveJoinRequest(
  requestId: string
): Promise<JoinRequestResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Get the request details
    const { data: request, error: fetchError } = await (supabase as any)
      .from('league_join_requests')
      .select('id, league_id, user_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { error: 'Join request not found' };
    }

    if (request.status !== 'pending') {
      return { error: 'This request has already been reviewed' };
    }

    // Verify user is admin or owner of the league
    const { data: membership, error: membershipError } = await supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', request.league_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return { error: 'You are not authorized to approve this request' };
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return { error: 'Only league owners and admins can approve join requests' };
    }

    // Approve the request
    // The database trigger will automatically add the user to the league
    const { error: updateError } = await (supabase as any)
      .from('league_join_requests')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error approving join request:', updateError);
      return { error: 'Failed to approve request. Please try again.' };
    }

    // TODO: Send notification to user
    // await notifyUserRequestApproved(request.user_id, request.league_id);

    return { success: true, status: 'approved' };
  } catch (error: any) {
    console.error('Unexpected error in approveJoinRequest:', error);
    return { error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Reject a join request (admin only)
 */
export async function rejectJoinRequest(
  requestId: string,
  reason?: string
): Promise<JoinRequestResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Get the request details
    const { data: request, error: fetchError } = await (supabase as any)
      .from('league_join_requests')
      .select('id, league_id, user_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { error: 'Join request not found' };
    }

    if (request.status !== 'pending') {
      return { error: 'This request has already been reviewed' };
    }

    // Verify user is admin or owner of the league
    const { data: membership, error: membershipError } = await supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', request.league_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return { error: 'You are not authorized to reject this request' };
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return { error: 'Only league owners and admins can reject join requests' };
    }

    // Sanitize rejection reason
    const rejectionReason = reason ? stripHtml(reason).trim() : null;
    const finalReason = rejectionReason && rejectionReason.length > 500
      ? rejectionReason.substring(0, 500)
      : rejectionReason;

    // Reject the request
    const { error: updateError } = await (supabase as any)
      .from('league_join_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: finalReason,
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error rejecting join request:', updateError);
      return { error: 'Failed to reject request. Please try again.' };
    }

    // TODO: Send notification to user
    // await notifyUserRequestRejected(request.user_id, request.league_id, finalReason);

    return { success: true, status: 'rejected' };
  } catch (error: any) {
    console.error('Unexpected error in rejectJoinRequest:', error);
    return { error: error.message || 'An unexpected error occurred' };
  }
}
