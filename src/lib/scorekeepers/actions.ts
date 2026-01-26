"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeagueRole } from "@/lib/auth/league-context";
import { stripHtml, sanitizeEmail } from "@/lib/input-sanitization";

export type ScorekeeperActionResult = {
  error?: string;
  success?: boolean;
  scorekeeper?: any;
  assignment?: any;
  payments?: any[];
};

/**
 * Scorekeeper Management Actions
 *
 * Handles hiring scorekeepers, assigning them to games, tracking payments,
 * and managing scorekeeper-related operations for leagues that use the
 * scorekeeper stat entry system.
 */

/**
 * Add a scorekeeper to a league
 * Requires owner or admin role
 */
export async function addScorekeeperToLeague(
  email: string,
  hourlyRate?: number
): Promise<ScorekeeperActionResult> {
  try {
    // Require owner or admin role
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Sanitize email
    const cleanEmail = sanitizeEmail(email);

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', cleanEmail)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      console.error('Error checking user:', userError);
      return { error: 'Failed to check user existence' };
    }

    let scorekeeperId: string;

    if (!existingUser) {
      // User doesn't exist, create invitation
      // They'll need to sign up and accept the scorekeeper role
      const { error: inviteError } = await supabase
        .from('league_invitations' as any)
        .insert({
          league_id: leagueId,
          email: cleanEmail,
          role: 'scorekeeper',
          invited_by: userId,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        return { error: 'Failed to send scorekeeper invitation' };
      }

      // TODO: Send invitation email
      // await sendScorekeeperInvitationEmail(cleanEmail, leagueId);

      revalidatePath('/');
      return { success: true };
    } else {
      scorekeeperId = existingUser.id;

      // Check if already a member of this league
      const { data: existingMembership } = await supabase
        .from('league_memberships')
        .select('id, role, status')
        .eq('league_id', leagueId)
        .eq('user_id', scorekeeperId)
        .single();

      if (existingMembership) {
        if (existingMembership.role === 'scorekeeper') {
          return { error: 'User is already a scorekeeper in this league' };
        } else {
          // Update their role to scorekeeper
          const { error: updateError } = await supabase
            .from('league_memberships')
            .update({ role: 'scorekeeper' })
            .eq('id', existingMembership.id);

          if (updateError) {
            return { error: 'Failed to update user role to scorekeeper' };
          }
        }
      } else {
        // Add as new member with scorekeeper role
        const { error: membershipError } = await supabase
          .from('league_memberships')
          .insert({
            league_id: leagueId,
            user_id: scorekeeperId,
            role: 'scorekeeper',
            status: 'active',
            invited_by: userId,
          });

        if (membershipError) {
          console.error('Error creating membership:', membershipError);
          return { error: 'Failed to add scorekeeper to league' };
        }
      }
    }

    // Add to league_scorekeepers table with pay rate
    const { data: scorekeeper, error: scorekeeperError } = await supabase
      .from('league_scorekeepers')
      .insert({
        league_id: leagueId,
        scorekeeper_id: scorekeeperId,
        hourly_rate: hourlyRate || 30.0, // Default $30/hour
        status: 'active',
      })
      .select()
      .single();

    if (scorekeeperError) {
      console.error('Error adding scorekeeper:', scorekeeperError);
      return { error: 'Failed to add scorekeeper' };
    }

    revalidatePath('/');
    return { success: true, scorekeeper };
  } catch (error: any) {
    console.error('Error in addScorekeeperToLeague:', error);
    return { error: error.message || 'Failed to add scorekeeper' };
  }
}

/**
 * Remove a scorekeeper from a league
 * Requires owner or admin role
 */
export async function removeScorekeeperFromLeague(
  scorekeeperId: string
): Promise<ScorekeeperActionResult> {
  try {
    // Require owner or admin role
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Set scorekeeper status to inactive
    const { error } = await supabase
      .from('league_scorekeepers')
      .update({ status: 'inactive' })
      .eq('id', scorekeeperId)
      .eq('league_id', leagueId);

    if (error) {
      console.error('Error removing scorekeeper:', error);
      return { error: 'Failed to remove scorekeeper' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error in removeScorekeeperFromLeague:', error);
    return { error: error.message || 'Failed to remove scorekeeper' };
  }
}

/**
 * Assign a scorekeeper to a game
 * Requires owner or admin role
 */
export async function assignScorekeeperToGame(
  gameId: string,
  scorekeeperId: string
): Promise<ScorekeeperActionResult> {
  try {
    // Require owner or admin role
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Verify scorekeeper belongs to this league
    const { data: scorekeeper, error: scorekeeperError } = await supabase
      .from('league_scorekeepers')
      .select('id, user_id, hourly_rate')
      .eq('id', scorekeeperId)
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .single();

    if (scorekeeperError || !scorekeeper) {
      return { error: 'Scorekeeper not found or not active in this league' };
    }

    // Verify game belongs to this league
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, scheduled_at')
      .eq('id', gameId)
      .eq('league_id', leagueId)
      .single();

    if (gameError || !game) {
      return { error: 'Game not found in this league' };
    }

    // Check if game already has a scorekeeper assigned
    const { data: existingAssignment } = await supabase
      .from('game_scorekeeper_assignments')
      .select('id, scorekeeper_id')
      .eq('game_id', gameId)
      .single();

    if (existingAssignment) {
      // Update existing assignment
      const { error: updateError } = await supabase
        .from('game_scorekeeper_assignments')
        .update({
          scorekeeper_id: scorekeeperId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAssignment.id);

      if (updateError) {
        return { error: 'Failed to update scorekeeper assignment' };
      }
    } else {
      // Create new assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('game_scorekeeper_assignments')
        .insert({
          game_id: gameId,
          league_id: leagueId,
          scorekeeper_id: scorekeeperId,
          assigned_by: userId,
        })
        .select()
        .single();

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        return { error: 'Failed to assign scorekeeper to game' };
      }

      // TODO: Send notification to scorekeeper
      // await sendGameAssignmentNotification(scorekeeper.user_id, gameId);

      revalidatePath('/');
      return { success: true, assignment };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error in assignScorekeeperToGame:', error);
    return { error: error.message || 'Failed to assign scorekeeper' };
  }
}

/**
 * Unassign a scorekeeper from a game
 * Requires owner or admin role
 */
export async function unassignScorekeeperFromGame(
  assignmentId: string
): Promise<ScorekeeperActionResult> {
  try {
    // Require owner or admin role
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Delete the assignment
    const { error } = await supabase
      .from('game_scorekeeper_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('league_id', leagueId);

    if (error) {
      console.error('Error unassigning scorekeeper:', error);
      return { error: 'Failed to unassign scorekeeper' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error in unassignScorekeeperFromGame:', error);
    return { error: error.message || 'Failed to unassign scorekeeper' };
  }
}

/**
 * Get scorekeeper assignments for a specific scorekeeper
 * Used by scorekeepers to see their assigned games
 * CRITICAL: Filters by league_id to support multi-instance architecture
 */
export async function getScorekeeperAssignments(dateRange?: { start: Date; end: Date }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated', assignments: [] };
    }

    // Get active league context - CRITICAL for multi-instance support
    const { getActiveLeagueId } = await import('@/lib/auth/league-context');
    const leagueId = await getActiveLeagueId();

    if (!leagueId) {
      console.error('[Scorekeeper] No active league context');
      return { error: 'League context required', assignments: [] };
    }

    let query = supabase
      .from('game_scorekeeper_assignments')
      .select(`
        id,
        status,
        checked_in_at,
        completed_at,
        created_at,
        game:games (
          id,
          scheduled_at,
          home_team:teams!games_home_team_id_fkey (id, name),
          away_team:teams!games_away_team_id_fkey (id, name),
          venue:venues (id, name, address)
        )
      `)
      .eq('scorekeeper_id', user.id)
      .eq('league_id', leagueId) // CRITICAL: Filter by league context
      .order('created_at', { ascending: false });

    // Apply date range filter if provided
    if (dateRange) {
      query = query
        .gte('game.scheduled_at', dateRange.start.toISOString())
        .lte('game.scheduled_at', dateRange.end.toISOString());
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('[Scorekeeper] Error fetching assignments:', error);
      return { error: 'Failed to fetch assignments', assignments: [] };
    }

    console.log(`[Scorekeeper] Retrieved ${assignments?.length || 0} assignments for league ${leagueId}`);
    return { assignments: assignments || [] };
  } catch (error: any) {
    console.error('[Scorekeeper] Error in getScorekeeperAssignments:', error);
    return { error: error.message, assignments: [] };
  }
}

/**
 * Scorekeeper checks in to a game (arrives at rink)
 * Can only be called by the assigned scorekeeper
 * CRITICAL: Validates league context to prevent cross-league access
 */
export async function checkInToGame(assignmentId: string): Promise<ScorekeeperActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Get active league context - CRITICAL for multi-instance support
    const { getActiveLeagueId } = await import('@/lib/auth/league-context');
    const leagueId = await getActiveLeagueId();

    if (!leagueId) {
      console.error('[Scorekeeper] No active league context for check-in');
      return { error: 'League context required' };
    }

    // Verify this is the assigned scorekeeper AND in the current league
    const { data: assignment, error: fetchError } = await supabase
      .from('game_scorekeeper_assignments')
      .select('scorekeeper_id, league_id')
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) {
      return { error: 'Assignment not found' };
    }

    if (assignment.scorekeeper_id !== user.id) {
      return { error: 'You are not assigned to this game' };
    }

    // CRITICAL: Verify assignment is in the current league context
    if (assignment.league_id !== leagueId) {
      console.error(`[Scorekeeper] Attempted cross-league check-in: assignment league ${assignment.league_id}, current league ${leagueId}`);
      return { error: 'This game is not in the current league' };
    }

    // Update check-in time
    const { error } = await supabase
      .from('game_scorekeeper_assignments')
      .update({
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .eq('league_id', leagueId); // Extra safety: ensure league context in update

    if (error) {
      console.error('[Scorekeeper] Error checking in:', error);
      return { error: 'Failed to check in' };
    }

    console.log(`[Scorekeeper] User ${user.id} checked in to assignment ${assignmentId} in league ${leagueId}`);
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[Scorekeeper] Error in checkInToGame:', error);
    return { error: error.message || 'Failed to check in' };
  }
}

/**
 * Complete game stat entry (scorekeeper finishes)
 * Can only be called by the assigned scorekeeper
 * CRITICAL: Validates league context to prevent cross-league access
 */
export async function completeGameStatEntry(assignmentId: string): Promise<ScorekeeperActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Get active league context - CRITICAL for multi-instance support
    const { getActiveLeagueId } = await import('@/lib/auth/league-context');
    const leagueId = await getActiveLeagueId();

    if (!leagueId) {
      console.error('[Scorekeeper] No active league context for completion');
      return { error: 'League context required' };
    }

    // Verify this is the assigned scorekeeper AND in the current league
    const { data: assignment, error: fetchError } = await supabase
      .from('game_scorekeeper_assignments')
      .select('scorekeeper_id, league_id, checked_in_at, started_at')
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) {
      return { error: 'Assignment not found' };
    }

    if (assignment.scorekeeper_id !== user.id) {
      return { error: 'You are not assigned to this game' };
    }

    // CRITICAL: Verify assignment is in the current league context
    if (assignment.league_id !== leagueId) {
      console.error(`[Scorekeeper] Attempted cross-league completion: assignment league ${assignment.league_id}, current league ${leagueId}`);
      return { error: 'This game is not in the current league' };
    }

    if (!assignment.checked_in_at) {
      return { error: 'You must check in before completing the game' };
    }

    // Update completion time
    const { error } = await supabase
      .from('game_scorekeeper_assignments')
      .update({
        completed_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .eq('league_id', leagueId); // Extra safety: ensure league context in update

    if (error) {
      console.error('[Scorekeeper] Error completing game:', error);
      return { error: 'Failed to complete game' };
    }

    console.log(`[Scorekeeper] User ${user.id} completed assignment ${assignmentId} in league ${leagueId}`);
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[Scorekeeper] Error in completeGameStatEntry:', error);
    return { error: error.message || 'Failed to complete game' };
  }
}

/**
 * Calculate payment for a scorekeeper assignment
 * Based on check-in and check-out times
 */
export async function calculateScorekeeperPayment(assignmentId: string) {
  try {
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    const { data: assignment, error } = await supabase
      .from('game_scorekeeper_assignments')
      .select(`
        id,
        checked_in_at,
        completed_at,
        scorekeeper:league_scorekeepers (hourly_rate)
      `)
      .eq('id', assignmentId)
      .eq('league_id', leagueId)
      .single();

    if (error || !assignment) {
      return { error: 'Assignment not found' };
    }

    if (!assignment.checked_in_at || !assignment.completed_at) {
      return { error: 'Cannot calculate payment: missing check-in or check-out time' };
    }

    const checkIn = new Date(assignment.checked_in_at);
    const checkOut = new Date(assignment.completed_at);
    const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    const amount = hours * (assignment.scorekeeper as any).hourly_rate;

    return {
      hours: parseFloat(hours.toFixed(2)),
      hourlyRate: (assignment.scorekeeper as any).hourly_rate,
      amount: parseFloat(amount.toFixed(2)),
    };
  } catch (error: any) {
    console.error('Error calculating payment:', error);
    return { error: error.message || 'Failed to calculate payment' };
  }
}

/**
 * Approve scorekeeper payment for a game
 * Requires owner or admin role
 */
export async function approveScorekeeperPayment(
  assignmentId: string
): Promise<ScorekeeperActionResult> {
  try {
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Calculate payment
    const payment = await calculateScorekeeperPayment(assignmentId);
    if ('error' in payment) {
      return { error: payment.error };
    }

    // Create payment record
    const { error } = await supabase
      .from('scorekeeper_payments' as any)
      .insert({
        league_id: leagueId,
        assignment_id: assignmentId,
        hours_worked: payment.hours,
        hourly_rate: payment.hourlyRate,
        amount: payment.amount,
        status: 'approved',
      });

    if (error) {
      console.error('Error creating payment record:', error);
      return { error: 'Failed to approve payment' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error in approveScorekeeperPayment:', error);
    return { error: error.message || 'Failed to approve payment' };
  }
}

/**
 * Export scorekeeper payments to CSV
 * Requires owner or admin role
 */
export async function exportScorekeeperPayments(
  leagueId: string,
  dateRange?: { start: Date; end: Date }
) {
  try {
    await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    let query = supabase
      .from('scorekeeper_payments' as any)
      .select(`
        created_at,
        hours_worked,
        hourly_rate,
        amount,
        status,
        assignment:game_scorekeeper_assignments (
          scorekeeper:league_scorekeepers (
            user:profiles (full_name, email)
          ),
          game:games (scheduled_at)
        )
      `)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      return { error: 'Failed to fetch payments', payments: [] };
    }

    return { payments: payments || [] };
  } catch (error: any) {
    console.error('Error in exportScorekeeperPayments:', error);
    return { error: error.message, payments: [] };
  }
}
