"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Game, GameStatus } from "@/types/database";
import { requireLeagueRole, getActiveLeagueId } from "@/lib/auth/league-context";

export type GameActionResult = {
  error?: string;
  success?: boolean;
  game?: Game;
};

export async function getAllGames(seasonId?: string) {
  try {
    // Require league membership (any role can view games)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    let query = supabase
      .from("games")
      .select(`
        *,
        season:seasons!games_season_id_fkey(id, name, status),
        home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color)
      `)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .order("scheduled_at", { ascending: false });

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }

    const { data: games, error } = await query;

    if (error) {
      console.error("Error fetching games:", error);
      return { error: error.message, games: [] };
    }

    return { games: games || [] };
  } catch (error: any) {
    console.error("Error in getAllGames:", error);
    return { error: error.message || 'Unauthorized', games: [] };
  }
}

export async function getGameById(gameId: string) {
  try {
    // Require league membership (any role can view games)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    const { data: game, error } = await supabase
      .from("games")
      .select(`
        *,
        season:seasons!games_season_id_fkey(id, name, status),
        home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color, captain_id),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color, captain_id)
      `)
      .eq("id", gameId)
      .eq('league_id', leagueId) // CRITICAL: Verify game belongs to user's league
      .single();

    if (error) {
      console.error("Error fetching game:", error);
      return { error: error.message, game: null };
    }

    return { game };
  } catch (error: any) {
    console.error("Error in getGameById:", error);
    return { error: error.message || 'Unauthorized', game: null };
  }
}

export async function createGame(formData: FormData): Promise<GameActionResult> {
  try {
    // Require owner or admin role to create games
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    const seasonId = formData.get("seasonId") as string;
    const homeTeamId = formData.get("homeTeamId") as string;
    const awayTeamId = formData.get("awayTeamId") as string;
    const scheduledAt = formData.get("scheduledAt") as string;
    const location = formData.get("location") as string || null;

    // Validation
    if (!seasonId) {
      return { error: "Season is required" };
    }
    if (!homeTeamId || !awayTeamId) {
      return { error: "Both teams are required" };
    }
    if (homeTeamId === awayTeamId) {
      return { error: "Home and away teams must be different" };
    }
    if (!scheduledAt) {
      return { error: "Scheduled date/time is required" };
    }

    const { data: game, error } = await supabase
      .from("games")
      .insert({
        league_id: leagueId, // CRITICAL: Associate game with league
        season_id: seasonId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        scheduled_at: scheduledAt,
        location: location,
        home_score: 0,
        away_score: 0,
        status: "scheduled" as GameStatus,
        home_captain_verified: false,
        away_captain_verified: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating game:", error);
      return { error: error.message };
    }

    revalidatePath("/admin/games");
    revalidatePath("/schedule");
    return { success: true, game };
  } catch (error: any) {
    console.error("Error in createGame:", error);
    return { error: error.message || 'Unauthorized or failed to create game' };
  }
}

export async function updateGame(gameId: string, formData: FormData): Promise<GameActionResult> {
  try {
    // Require owner or admin role to update games
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

  const seasonId = formData.get("seasonId") as string;
  const homeTeamId = formData.get("homeTeamId") as string;
  const awayTeamId = formData.get("awayTeamId") as string;
  const scheduledAt = formData.get("scheduledAt") as string;
  const location = formData.get("location") as string || null;
  const status = formData.get("status") as GameStatus || "scheduled";

  // SECURITY: Validate scores with proper bounds checking
  const homeScoreStr = formData.get("homeScore") as string;
  const awayScoreStr = formData.get("awayScore") as string;

  let homeScore = 0;
  let awayScore = 0;

  if (homeScoreStr) {
    const parsed = parseInt(homeScoreStr);
    if (isNaN(parsed)) {
      return { error: "Invalid home score - must be a number" };
    }
    if (parsed < 0 || parsed > 99) {
      return { error: "Home score must be between 0 and 99" };
    }
    homeScore = parsed;
  }

  if (awayScoreStr) {
    const parsed = parseInt(awayScoreStr);
    if (isNaN(parsed)) {
      return { error: "Invalid away score - must be a number" };
    }
    if (parsed < 0 || parsed > 99) {
      return { error: "Away score must be between 0 and 99" };
    }
    awayScore = parsed;
  }

  // Validation
  if (!seasonId) {
    return { error: "Season is required" };
  }
  if (!homeTeamId || !awayTeamId) {
    return { error: "Both teams are required" };
  }
  if (homeTeamId === awayTeamId) {
    return { error: "Home and away teams must be different" };
  }
  if (!scheduledAt) {
    return { error: "Scheduled date/time is required" };
  }

  const { data: game, error } = await supabase
    .from("games")
    .update({
      season_id: seasonId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      scheduled_at: scheduledAt,
      location: location,
      home_score: homeScore,
      away_score: awayScore,
      status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .eq('league_id', leagueId) // CRITICAL: Only update games in this league
    .select()
    .single();

  if (error) {
    console.error("Error updating game:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/games");
  revalidatePath("/schedule");
  revalidatePath(`/games/${gameId}`);
  return { success: true, game };
  } catch (error: any) {
    console.error("Error in updateGame:", error);
    return { error: error.message || 'Unauthorized or failed to update game' };
  }
}

export async function deleteGame(gameId: string): Promise<GameActionResult> {
  try {
    // Require owner or admin role to delete games
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Check if game has stats entered
    const { data: playerStats } = await supabase
      .from("player_stats")
      .select("id")
      .eq("game_id", gameId)
      .limit(1);

    if (playerStats && playerStats.length > 0) {
      return { error: "Cannot delete a game that has stats entered. Archive it instead." };
    }

    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", gameId)
      .eq('league_id', leagueId); // CRITICAL: Only delete games in this league

    if (error) {
      console.error("Error deleting game:", error);
      return { error: error.message };
    }

    revalidatePath("/admin/games");
    revalidatePath("/schedule");
    revalidatePath("/dashboard/schedule");
    revalidatePath("/captain");
    revalidatePath("/standings");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteGame:", error);
    return { error: error.message || 'Unauthorized or failed to delete game' };
  }
}

// Get upcoming games (for schedule page)
export async function getUpcomingGames(limit: number = 10, seasonId?: string) {
  try {
    // Require league membership (any role can view games)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    let query = supabase
      .from("games")
      .select(`
        *,
        season:seasons!games_season_id_fkey(id, name),
        home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color)
      `)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }

    const { data: games, error } = await query;

    if (error) {
      console.error("Error fetching upcoming games:", error);
      return { error: error.message, games: [] };
    }

    return { games: games || [] };
  } catch (error: any) {
    console.error("Error in getUpcomingGames:", error);
    return { error: error.message || 'Unauthorized', games: [] };
  }
}

// Get recent games (for schedule page)
export async function getRecentGames(limit: number = 10, seasonId?: string) {
  try {
    // Require league membership (any role can view games)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    let query = supabase
      .from("games")
      .select(`
        *,
        season:seasons!games_season_id_fkey(id, name),
        home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color)
      `)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .eq("status", "completed")
      .order("scheduled_at", { ascending: false })
      .limit(limit);

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }

    const { data: games, error } = await query;

    if (error) {
      console.error("Error fetching recent games:", error);
      return { error: error.message, games: [] };
    }

    return { games: games || [] };
  } catch (error: any) {
    console.error("Error in getRecentGames:", error);
    return { error: error.message || 'Unauthorized', games: [] };
  }
}

// Cancel a game
export async function cancelGame(
  gameId: string,
  reason: string
): Promise<GameActionResult> {
  try {
    // Require owner or admin role to cancel games
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Get current game data
    const { data: game } = await supabase
      .from("games")
      .select("scheduled_at")
      .eq("id", gameId)
      .eq('league_id', leagueId) // Verify game belongs to league
      .single();

    if (!game) {
      return { error: "Game not found or does not belong to your league" };
    }

    const { data: updatedGame, error } = await supabase
      .from("games")
      .update({
        status: "cancelled" as GameStatus,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .eq('league_id', leagueId) // CRITICAL: Only cancel games in this league
      .select()
      .single();

    if (error) {
      console.error("Error cancelling game:", error);
      return { error: error.message };
    }

    revalidatePath("/admin/games");
    revalidatePath("/schedule");
    revalidatePath("/dashboard/schedule");
    revalidatePath("/captain");
    return { success: true, game: updatedGame };
  } catch (error: any) {
    console.error("Error in cancelGame:", error);
    return { error: error.message || 'Unauthorized or failed to cancel game' };
  }
}

// Reschedule a game
export async function rescheduleGame(
  gameId: string,
  newScheduledAt: string,
  reason?: string
): Promise<GameActionResult> {
  try {
    // Require owner or admin role to reschedule games
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Get current game data
    const { data: game } = await supabase
      .from("games")
      .select("scheduled_at, status")
      .eq("id", gameId)
      .eq('league_id', leagueId) // Verify game belongs to league
      .single();

    if (!game) {
      return { error: "Game not found or does not belong to your league" };
    }

    const { data: updatedGame, error } = await supabase
      .from("games")
      .update({
        scheduled_at: newScheduledAt,
        rescheduled_at: newScheduledAt,
        is_rescheduled: true,
        status: game.status === "cancelled" ? "scheduled" as GameStatus : undefined,
        cancellation_reason: game.status === "cancelled" ? null : undefined,
        cancelled_at: game.status === "cancelled" ? null : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .eq('league_id', leagueId) // CRITICAL: Only reschedule games in this league
      .select()
      .single();

    if (error) {
      console.error("Error rescheduling game:", error);
      return { error: error.message };
    }

    revalidatePath("/admin/games");
    revalidatePath("/schedule");
    revalidatePath("/dashboard/schedule");
    revalidatePath("/captain");
    return { success: true, game: updatedGame };
  } catch (error: any) {
    console.error("Error in rescheduleGame:", error);
    return { error: error.message || 'Unauthorized or failed to reschedule game' };
  }
}
