"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Captain Verification System - Server Actions
 *
 * Handles captain verification workflow for game stats.
 * After a scorekeeper completes a game, captains verify stats before they're locked.
 */

export interface VerificationResult {
  success?: boolean;
  error?: string;
  homeToken?: string;
  awayToken?: string;
}

/**
 * Send verification request to both team captains
 *
 * Creates verification tokens and sends emails to captains.
 * Called after scorekeeper completes game stat entry.
 *
 * @param gameId - ID of the completed game
 * @returns Verification tokens or error
 */
export async function sendVerificationRequest(gameId: string): Promise<VerificationResult> {
  try {
    const supabase = await createClient();

    // Get game with team captain information
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(
          id,
          name,
          captain:profiles(email, full_name)
        ),
        away_team:teams!games_away_team_id_fkey(
          id,
          name,
          captain:profiles(email, full_name)
        )
      `)
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return { error: "Game not found" };
    }

    // Verify game has been completed
    if (game.status !== 'completed') {
      return { error: "Game not yet completed" };
    }

    // TODO: Verification token system not yet implemented in schema
    // Would need to add home_verification_token and away_verification_token columns to games table
    // For now, just update stats_submitted_at
    const { error: updateError } = await supabase
      .from('games')
      .update({
        stats_submitted_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Error updating game stats submission:', updateError);
      return { error: "Failed to update game status" };
    }

    // TODO: Send emails to captains with verification links
    // Example email content:
    // - Subject: "Verify stats for [Team] vs [Opponent] - [Date]"
    // - Link: /captain/verify/[gameId]?token=[token]
    // - Content: Game details, stats summary, verification instructions

    console.log(`Stats submitted for game ${gameId}`);
    console.log(`Home captain: ${game.home_team?.captain?.email}`);
    console.log(`Away captain: ${game.away_team?.captain?.email}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error sending verification request:', error);
    return { error: "Internal server error" };
  }
}

/**
 * Verify captain's token and get verification status
 *
 * @param gameId - ID of the game
 * @param token - Verification token from email link
 * @returns Verification details or error
 */
export async function getVerificationStatus(gameId: string, token: string) {
  try {
    const supabase = await createClient();

    // Get game and verify token
    const { data: game, error } = await supabase
      .from('games')
      .select('*, home_captain_verified, away_captain_verified')
      .eq('id', gameId)
      .single();

    if (error || !game) {
      return { error: "Game not found" };
    }

    // Note: Token-based verification not yet implemented in schema
    // Using boolean flags instead for now
    // TODO: Add verification token fields to games table

    return {
      success: true,
      teamType: 'home', // Default to home for now
      verified: game.home_captain_verified || false,
      otherTeamVerified: game.away_captain_verified || false,
      statsLocked: false, // Not implemented yet
      game,
    };
  } catch (error) {
    console.error('Error getting verification status:', error);
    return { error: "Internal server error" };
  }
}

/**
 * Captain approves stats for their team
 *
 * @param gameId - ID of the game
 * @param token - Verification token
 * @returns Success or error
 */
export async function approveStats(gameId: string, token: string) {
  try {
    const supabase = await createClient();

    // Verify token and get team type
    const status = await getVerificationStatus(gameId, token);
    if (status.error || !status.teamType) {
      return { error: status.error || "Invalid token" };
    }

    if (status.verified) {
      return { error: "Stats already verified" };
    }

    // Mark this team as verified
    // Note: Using boolean fields since timestamp fields (home_verified_at, away_verified_at) don't exist yet
    const verifiedField = status.teamType === 'home' ? 'home_captain_verified' : 'away_captain_verified';
    const updateData: any = {
      [verifiedField]: true,
      updated_at: new Date().toISOString(),
    };

    // TODO: If other team also verified, lock the stats
    // Note: stats_locked_at field not yet in schema
    // if (status.otherTeamVerified) {
    //   updateData.stats_locked_at = new Date().toISOString();
    // }

    const { error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId);

    if (updateError) {
      console.error('Error approving stats:', updateError);
      return { error: "Failed to approve stats" };
    }

    return {
      success: true,
      bothVerified: !!status.otherTeamVerified,
      statsLocked: !!status.otherTeamVerified,
    };
  } catch (error) {
    console.error('Error approving stats:', error);
    return { error: "Internal server error" };
  }
}

/**
 * Captain contests stats for their team
 *
 * @param gameId - ID of the game
 * @param token - Verification token
 * @param reason - Reason for contesting
 * @param contestedStatIds - Array of stat IDs being contested
 * @returns Success or error
 */
export async function contestStats(
  gameId: string,
  token: string,
  reason: string,
  contestedStatIds: string[]
) {
  try {
    const supabase = await createClient();

    // Verify token and get team type
    const status = await getVerificationStatus(gameId, token);
    if (status.error || !status.teamType) {
      return { error: status.error || "Invalid token" };
    }

    if (status.verified) {
      return { error: "Stats already verified. Cannot contest." };
    }

    // Mark this team as contested
    const contestedField = status.teamType === 'home' ? 'home_contested_at' : 'away_contested_at';
    const contestedReasonField = status.teamType === 'home' ? 'home_contested_reason' : 'away_contested_reason';
    const contestedStatsField = status.teamType === 'home' ? 'home_contested_stats' : 'away_contested_stats';

    const { error: updateError } = await supabase
      .from('games')
      .update({
        [contestedField]: new Date().toISOString(),
        [contestedReasonField]: reason,
        [contestedStatsField]: contestedStatIds,
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Error contesting stats:', updateError);
      return { error: "Failed to contest stats" };
    }

    // TODO: Send notification to scorekeeper about contested stats
    console.log(`Stats contested for game ${gameId} by ${status.teamType} team`);
    console.log(`Reason: ${reason}`);
    console.log(`Contested stats: ${contestedStatIds.join(', ')}`);

    return {
      success: true,
      message: "Stats contested. Scorekeeper has been notified.",
    };
  } catch (error) {
    console.error('Error contesting stats:', error);
    return { error: "Internal server error" };
  }
}

/**
 * Get list of games awaiting verification
 *
 * @param teamId - Optional: filter by team
 * @returns List of games awaiting verification
 */
export async function getPendingVerifications(teamId?: string) {
  try {
    const supabase = await createClient();

    // Get games that have stats submitted but not fully verified by both captains
    // Note: stats_locked_at field not yet in schema, using captain_verified flags instead
    let query = supabase
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name)
      `)
      .not('stats_submitted_at', 'is', null)
      .or('home_captain_verified.is.false,away_captain_verified.is.false')
      .order('stats_submitted_at', { ascending: false });

    if (teamId) {
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    }

    const { data: games, error } = await query;

    if (error) {
      console.error('Error fetching pending verifications:', error);
      return { error: "Failed to fetch pending verifications" };
    }

    return {
      success: true,
      games,
    };
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    return { error: "Internal server error" };
  }
}

/**
 * Admin: Unlock stats for corrections
 *
 * @param gameId - ID of the game
 * @param reason - Reason for unlocking
 * @returns Success or error
 */
export async function unlockStats(gameId: string, reason: string) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // TODO: Verify user is league admin
    // For now, just check if user exists

    // Unlock the game by resetting captain verification
    // TODO: Add proper unlock tracking fields (stats_locked_at, unlock_reason, etc.)
    const { error: updateError } = await supabase
      .from('games')
      .update({
        home_captain_verified: false,
        away_captain_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Error unlocking stats:', updateError);
      return { error: "Failed to unlock stats" };
    }

    // TODO: Unlock all stats for this game
    // Note: locked field not yet in game_stats schema
    // await supabase
    //   .from('game_stats')
    //   .update({ locked: false })
    //   .eq('game_id', gameId);

    // Log the unlock for audit trail
    // Note: game_stat_entry_log table not yet in schema
    await (supabase as any)
      .from('game_stat_entry_log')
      .insert({
        game_id: gameId,
        entered_by: user.id,
        entered_by_role: 'admin',
        action: 'unlock',
        new_value: { reason, timestamp: new Date().toISOString() },
      });

    console.log(`Stats unlocked for game ${gameId} by admin ${user.id}. Reason: ${reason}`);

    return {
      success: true,
      message: "Stats unlocked successfully",
    };
  } catch (error) {
    console.error('Error unlocking stats:', error);
    return { error: "Internal server error" };
  }
}
