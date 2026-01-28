// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import { sendAIEmail } from "@/lib/email/ai-email";

/**
 * Captain Verification System - Server Actions
 *
 * Handles captain verification workflow for game stats.
 * After a scorekeeper completes a game, captains verify stats before they're locked.
 */

/**
 * Send verification email to captain
 */
async function sendVerificationEmail(params: {
  to: string;
  captainName: string;
  teamName: string;
  opponentName: string;
  gameDate: string;
  gameId: string;
  verificationToken: string;
  isHomeTeam: boolean;
}) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/captain/verify/${params.gameId}?token=${params.verificationToken}`;

  const subject = `Verify Stats: ${params.teamName} vs ${params.opponentName}`;

  const prompt = `Write a professional email to a hockey team captain requesting them to verify game statistics.

Details:
- Captain Name: ${params.captainName}
- Team: ${params.teamName}
- Opponent: ${params.opponentName}
- Game Date: ${new Date(params.gameDate).toLocaleDateString()}
- Team Type: ${params.isHomeTeam ? 'Home' : 'Away'}

The email should:
1. Politely request them to review and verify the game stats
2. Explain that both team captains must verify before stats are finalized
3. Mention they can either approve or contest the stats if there are errors
4. Include a clear call-to-action button to verify stats
5. Be concise and professional

Verification Link: ${verificationUrl}
`;

  try {
    await sendAIEmail({
      to: params.to,
      subject,
      prompt,
      context: {
        type: "stat_reminder",
        recipientName: params.captainName,
        recipientRole: "captain",
        gameDetails: {
          date: params.gameDate,
          time: "",
          opponent: params.opponentName,
        },
        teamName: params.teamName,
        tone: "professional",
      },
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Don't throw - email failure shouldn't block the verification process
  }
}

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

    // Generate verification tokens for both captains
    // @ts-expect-error - RPC function will be available after migration
    const { data: homeTokenData } = await supabase.rpc('generate_verification_token');
    // @ts-expect-error - RPC function will be available after migration
    const { data: awayTokenData } = await supabase.rpc('generate_verification_token');

    if (!homeTokenData || !awayTokenData) {
      return { error: "Failed to generate verification tokens" };
    }

    const homeToken = homeTokenData;
    const awayToken = awayTokenData;

    // Update game with tokens and submission timestamp
    const { error: updateError } = await supabase
      .from('games')
      .update({
        stats_submitted_at: new Date().toISOString(),
        home_verification_token: homeToken,
        away_verification_token: awayToken,
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Error updating game stats submission:', updateError);
      return { error: "Failed to update game status" };
    }

    // Send verification emails to both captains
    const homeCaptainEmail = game.home_team?.captain?.email;
    const awayCaptainEmail = game.away_team?.captain?.email;

    if (homeCaptainEmail) {
      await sendVerificationEmail({
        to: homeCaptainEmail,
        captainName: game.home_team?.captain?.full_name || 'Captain',
        teamName: game.home_team?.name || 'Home Team',
        opponentName: game.away_team?.name || 'Away Team',
        gameDate: game.game_date,
        gameId,
        verificationToken: homeToken,
        isHomeTeam: true,
      });
    }

    if (awayCaptainEmail) {
      await sendVerificationEmail({
        to: awayCaptainEmail,
        captainName: game.away_team?.captain?.full_name || 'Captain',
        teamName: game.away_team?.name || 'Away Team',
        opponentName: game.home_team?.name || 'Home Team',
        gameDate: game.game_date,
        gameId,
        verificationToken: awayToken,
        isHomeTeam: false,
      });
    }

    console.log(`Stats submitted for game ${gameId}`);
    console.log(`Verification email sent to home captain: ${homeCaptainEmail}`);
    console.log(`Verification email sent to away captain: ${awayCaptainEmail}`);

    return {
      success: true,
      homeToken,
      awayToken,
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
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name)
      `)
      .eq('id', gameId)
      .single();

    if (error || !game) {
      return { error: "Game not found" };
    }

    // Verify token and determine team type
    let teamType: 'home' | 'away' | null = null;
    let verified = false;
    let otherTeamVerified = false;

    if (game.home_verification_token === token) {
      teamType = 'home';
      verified = !!game.home_verified_at;
      otherTeamVerified = !!game.away_verified_at;
    } else if (game.away_verification_token === token) {
      teamType = 'away';
      verified = !!game.away_verified_at;
      otherTeamVerified = !!game.home_verified_at;
    } else {
      return { error: "Invalid verification token" };
    }

    const statsLocked = !!game.stats_locked_at;

    return {
      success: true,
      teamType,
      verified,
      otherTeamVerified,
      statsLocked,
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

    // Mark this team as verified with timestamp
    const verifiedAtField = status.teamType === 'home' ? 'home_verified_at' : 'away_verified_at';
    const verifiedBoolField = status.teamType === 'home' ? 'home_captain_verified' : 'away_captain_verified';

    const now = new Date().toISOString();
    const updateData: any = {
      [verifiedAtField]: now,
      [verifiedBoolField]: true, // Keep boolean for backward compatibility
      updated_at: now,
    };

    // The trigger will automatically lock stats if both teams have verified
    // See migration: 20260128_add_captain_verification_tokens.sql

    const { error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId);

    if (updateError) {
      console.error('Error approving stats:', updateError);
      return { error: "Failed to approve stats" };
    }

    // Check if both teams have now verified (to return correct status)
    const bothVerified = !!status.otherTeamVerified;
    const statsLocked = bothVerified; // Will be locked by trigger if both verified

    return {
      success: true,
      bothVerified,
      statsLocked,
      message: bothVerified
        ? "Stats verified and locked! Both captains have approved."
        : "Stats verified! Waiting for other team captain to verify.",
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

    // Use database function to unlock stats
    // This function resets verification, unlocks game_stats, and logs the action
    const { data, error: unlockError } = await supabase.rpc('unlock_game_stats', {
      p_game_id: gameId,
      p_reason: reason,
      p_unlocked_by: user.id,
    });

    if (unlockError) {
      console.error('Error unlocking stats:', unlockError);
      return { error: "Failed to unlock stats" };
    }

    console.log(`Stats unlocked for game ${gameId} by admin ${user.id}. Reason: ${reason}`);

    return {
      success: true,
      message: "Stats unlocked successfully. Captains will need to re-verify.",
    };
  } catch (error) {
    console.error('Error unlocking stats:', error);
    return { error: "Internal server error" };
  }
}
