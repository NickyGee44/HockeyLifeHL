"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeagueRole } from "@/lib/auth/league-context";
import { stripHtml, sanitizeEmail, sanitizeText } from "@/lib/input-sanitization";

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
        game_id,
        checked_in_at,
        started_at,
        completed_at,
        duration_minutes,
        payment_amount,
        payment_status,
        created_at,
        game:games (
          id,
          scheduled_at,
          location,
          home_team:teams!games_home_team_id_fkey (id, name),
          away_team:teams!games_away_team_id_fkey (id, name)
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

    const normalizedAssignments = (assignments || []).map((assignment: any) => {
      const game = Array.isArray(assignment.game) ? assignment.game[0] : assignment.game;

      return {
        ...assignment,
        game: game
          ? {
              ...game,
              date_time: game.scheduled_at,
              venue: game.location ? { name: game.location } : null,
            }
          : null,
      };
    });

    console.log(`[Scorekeeper] Retrieved ${normalizedAssignments.length} assignments for league ${leagueId}`);
    return { assignments: normalizedAssignments };
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
      .select('scorekeeper_id, league_id, game_id')
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
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('game_scorekeeper_assignments')
      .update({
        checked_in_at: nowIso,
        started_at: nowIso,
      })
      .eq('id', assignmentId)
      .eq('league_id', leagueId); // Extra safety: ensure league context in update

    if (error) {
      console.error('[Scorekeeper] Error checking in:', error);
      return { error: 'Failed to check in' };
    }

    // Mark game in progress once scorekeeper checks in.
    await supabase
      .from('games')
      .update({ status: 'in_progress' })
      .eq('id', assignment.game_id)
      .eq('league_id', leagueId);

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
      .select('scorekeeper_id, league_id, game_id, checked_in_at, started_at')
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
    const completedAt = new Date();
    const startedAt = assignment.started_at ? new Date(assignment.started_at) : new Date(assignment.checked_in_at);
    const durationMinutes = Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / (1000 * 60)));

    const { error } = await supabase
      .from('game_scorekeeper_assignments')
      .update({
        completed_at: completedAt.toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', assignmentId)
      .eq('league_id', leagueId); // Extra safety: ensure league context in update

    if (error) {
      console.error('[Scorekeeper] Error completing game:', error);
      return { error: 'Failed to complete game' };
    }

    if (assignment.game_id) {
      await supabase
        .from('games')
        .update({
          status: 'completed',
          scorekeeper_verified: true,
          scorekeeper_verified_at: completedAt.toISOString(),
          scorekeeper_verified_by: user.id,
          stats_submitted_at: completedAt.toISOString(),
          stats_submitted_by: user.id,
        })
        .eq('id', assignment.game_id)
        .eq('league_id', leagueId);
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
 * Save scorekeeper notes for a game and notify league owners/admins.
 * Intended for commissioner follow-up after incidents or noteworthy events.
 */
export async function saveScorekeeperNotes(
  assignmentId: string,
  notes: string
): Promise<ScorekeeperActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { getActiveLeagueId } = await import('@/lib/auth/league-context');
    const leagueId = await getActiveLeagueId();

    if (!leagueId) {
      return { error: 'League context required' };
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('game_scorekeeper_assignments')
      .select('id, game_id, scorekeeper_id, league_id')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return { error: 'Assignment not found' };
    }

    if (assignment.scorekeeper_id !== user.id) {
      return { error: 'You are not assigned to this game' };
    }

    if (assignment.league_id !== leagueId) {
      return { error: 'This game is not in the current league' };
    }

    const cleanNotes = sanitizeText(stripHtml(notes || ''), 3000).trim();

    const { error: updateError } = await supabase
      .from('games')
      .update({
        scorekeeper_notes: cleanNotes || null,
      })
      .eq('id', assignment.game_id)
      .eq('league_id', leagueId);

    if (updateError) {
      console.error('[Scorekeeper] Error saving notes:', updateError);
      return { error: 'Failed to save notes' };
    }

    if (cleanNotes) {
      const { data: recipients } = await supabase
        .from('league_memberships')
        .select('user_id, role')
        .eq('league_id', leagueId)
        .eq('status', 'active')
        .in('role', ['owner', 'admin']);

      const notificationRows = (recipients || [])
        .filter((recipient) => recipient.user_id !== user.id)
        .map((recipient) => ({
          league_id: leagueId,
          user_id: recipient.user_id,
          type: 'scorekeeper_note',
          channel: 'in_app',
          subject: 'Scorekeeper note submitted',
          body: cleanNotes,
          related_entity_type: 'game',
          related_entity_id: assignment.game_id,
          created_by: user.id,
        }));

      if (notificationRows.length > 0) {
        await supabase
          .from('notifications')
          .insert(notificationRows);
      }
    }

    revalidatePath(`/scorekeeper/live-entry/${assignment.game_id}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Scorekeeper] Error in saveScorekeeperNotes:', error);
    return { error: error.message || 'Failed to save scorekeeper notes' };
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


/**
 * Add a scorekeeper - FormData wrapper
 * Wrapper around addScorekeeperToLeague for form submissions
 */
export async function addScorekeeper(formData: FormData): Promise<ScorekeeperActionResult> {
  const email = (formData.get("email") as string || '').trim();
  const hourlyRate = parseFloat(formData.get("hourlyRate") as string || '30');
  
  return addScorekeeperToLeague(email, hourlyRate);
}

/**
 * Get all scorekeepers for the active league with stats
 * Requires owner or admin role
 */
export async function getAllScorekeepers(): Promise<{
  error?: string;
  scorekeepers: Array<any>;
}> {
  try {
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);
    const supabase = await createClient();

    // Fetch scorekeepers with profile info
    const { data: scorekeepers, error } = await supabase
      .from("league_scorekeepers")
      .select(`
        *,
        profile:profiles!league_scorekeepers_scorekeeper_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('league_id', leagueId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching scorekeepers:", error);
      return { error: error.message, scorekeepers: [] };
    }

    // Fetch assignment stats for each scorekeeper
    const scorekeepersWithStats = await Promise.all(
      (scorekeepers || []).map(async (sk: any) => {
        const { data: assignments } = await supabase
          .from("game_scorekeeper_assignments")
          .select("payment_amount, payment_status")
          .eq('league_id', leagueId)
          .eq('scorekeeper_id', sk.scorekeeper_id);

        const assignment_count = assignments?.length || 0;
        const total_earned = assignments?.reduce((sum, a) => sum + (a.payment_amount || 0), 0) || 0;
        const total_unpaid = assignments?.filter(a => a.payment_status === 'pending')
          .reduce((sum, a) => sum + (a.payment_amount || 0), 0) || 0;

        return {
          ...sk,
          assignment_count,
          total_earned,
          total_unpaid,
        };
      })
    );

    return { scorekeepers: scorekeepersWithStats };
  } catch (error: any) {
    console.error("Error in getAllScorekeepers:", error);
    return { error: error.message || 'Unauthorized', scorekeepers: [] };
  }
}

/**
 * Update scorekeeper settings
 * Requires owner or admin role
 */
export async function updateScorekeeper(
  scorekeeperId: string,
  formData: FormData
): Promise<ScorekeeperActionResult> {
  try {
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);
    const supabase = await createClient();

    // Verify scorekeeper exists and belongs to this league
    const { data: existing } = await supabase
      .from("league_scorekeepers")
      .select("id")
      .eq("id", scorekeeperId)
      .eq('league_id', leagueId)
      .single();

    if (!existing) {
      return { error: "Scorekeeper not found or does not belong to your league" };
    }

    // Extract and validate fields
    const hourlyRate = formData.get("hourlyRate") as string;
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate < 0) {
      return { error: "Hourly rate must be a positive number" };
    }

    const canEditGames = formData.get("canEditGames") === "true";
    const canVerifyGames = formData.get("canVerifyGames") === "true";
    const notes = formData.get("notes") as string || null;
    const status = formData.get("status") as string || "active";

    const sanitizedNotes = notes ? sanitizeText(notes, 500) : null;

    // Update the scorekeeper
    const { data: scorekeeper, error } = await supabase
      .from("league_scorekeepers")
      .update({
        hourly_rate: rate,
        can_edit_games: canEditGames,
        can_verify_games: canVerifyGames,
        notes: sanitizedNotes,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scorekeeperId)
      .eq('league_id', leagueId)
      .select()
      .single();

    if (error) {
      console.error("Error updating scorekeeper:", error);
      return { error: error.message };
    }

    revalidatePath("/settings/scorekeepers");
    revalidatePath("/admin/scorekeepers");

    return { success: true, scorekeeper };
  } catch (error: any) {
    console.error("Error in updateScorekeeper:", error);
    return { error: error.message || 'Unauthorized or failed to update scorekeeper' };
  }
}

/**
 * Get unpaid scorekeeper assignments for payment tracking
 * Requires owner or admin role
 */
export async function getUnpaidAssignments(): Promise<{
  error?: string;
  assignments: Array<any>;
}> {
  try {
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);
    const supabase = await createClient();

    const { data: assignments, error } = await supabase
      .from("game_scorekeeper_assignments")
      .select(`
        *,
        game:games (
          id,
          game_date,
          game_time,
          home_team:teams!games_home_team_id_fkey (id, name),
          away_team:teams!games_away_team_id_fkey (id, name)
        ),
        scorekeeper_profile:profiles!game_scorekeeper_assignments_scorekeeper_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('league_id', leagueId)
      .eq('payment_status', 'pending')
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error("Error fetching unpaid assignments:", error);
      return { error: error.message, assignments: [] };
    }

    return { assignments: assignments || [] };
  } catch (error: any) {
    console.error("Error in getUnpaidAssignments:", error);
    return { error: error.message || 'Unauthorized', assignments: [] };
  }
}

/**
 * Mark a scorekeeper assignment as paid
 * Requires owner or admin role
 */
export async function markAssignmentPaid(assignmentId: string): Promise<ScorekeeperActionResult> {
  try {
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);
    const supabase = await createClient();

    // Verify assignment belongs to league
    const { data: assignment, error: fetchError } = await supabase
      .from("game_scorekeeper_assignments")
      .select("id, payment_status")
      .eq("id", assignmentId)
      .eq('league_id', leagueId)
      .single();

    if (fetchError || !assignment) {
      return { error: "Assignment not found or does not belong to your league" };
    }

    if (assignment.payment_status === 'paid') {
      return { error: "This assignment is already marked as paid" };
    }

    // Update to paid
    const { error } = await supabase
      .from("game_scorekeeper_assignments")
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq('league_id', leagueId);

    if (error) {
      console.error("Error marking assignment paid:", error);
      return { error: error.message };
    }

    revalidatePath("/settings/scorekeepers");
    revalidatePath("/admin/scorekeepers/payments");

    return { success: true };
  } catch (error: any) {
    console.error("Error in markAssignmentPaid:", error);
    return { error: error.message || 'Unauthorized or failed to mark payment' };
  }
}
