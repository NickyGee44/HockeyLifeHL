// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Game, GameStatus } from "@/types/database";

export type GameActionResult = {
  error?: string;
  success?: boolean;
  game?: Game;
};

// Check if current user is an owner
async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", isOwner: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Not authorized - owner access required", isOwner: false };
  }

  return { isOwner: true, userId: user.id };
}

export async function getAllGames(seasonId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from("games")
    .select(`
      *,
      season:seasons!games_season_id_fkey(id, name, status),
      home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, secondary_color),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, secondary_color)
    `)
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
}

export async function getGameById(gameId: string) {
  const supabase = await createClient();
  
  const { data: game, error } = await supabase
    .from("games")
    .select(`
      *,
      season:seasons!games_season_id_fkey(id, name, status),
      home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, secondary_color, captain_id),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, secondary_color, captain_id)
    `)
    .eq("id", gameId)
    .single();

  if (error) {
    console.error("Error fetching game:", error);
    return { error: error.message, game: null };
  }

  return { game };
}

export async function createGame(formData: FormData): Promise<GameActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

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
}

export async function updateGame(gameId: string, formData: FormData): Promise<GameActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const seasonId = formData.get("seasonId") as string;
  const homeTeamId = formData.get("homeTeamId") as string;
  const awayTeamId = formData.get("awayTeamId") as string;
  const scheduledAt = formData.get("scheduledAt") as string;
  const location = formData.get("location") as string || null;
  const homeScore = parseInt(formData.get("homeScore") as string) || 0;
  const awayScore = parseInt(formData.get("awayScore") as string) || 0;
  const status = formData.get("status") as GameStatus || "scheduled";

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
}

export async function deleteGame(gameId: string): Promise<GameActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

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
    .eq("id", gameId);

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
}

// Get upcoming games (for schedule page)
export async function getUpcomingGames(limit: number = 10) {
  const supabase = await createClient();
  
  const { data: games, error } = await supabase
    .from("games")
    .select(`
      *,
      season:seasons!games_season_id_fkey(id, name),
      home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color)
    `)
    .in("status", ["scheduled", "in_progress"])
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching upcoming games:", error);
    return { error: error.message, games: [] };
  }

  return { games: games || [] };
}

// Get recent games (for schedule page)
export async function getRecentGames(limit: number = 10) {
  const supabase = await createClient();
  
  const { data: games, error } = await supabase
    .from("games")
    .select(`
      *,
      season:seasons!games_season_id_fkey(id, name),
      home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color)
    `)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent games:", error);
    return { error: error.message, games: [] };
  }

  return { games: games || [] };
}

// Cancel a game
export async function cancelGame(
  gameId: string,
  reason: string
): Promise<GameActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Get current game data
  const { data: game } = await supabase
    .from("games")
    .select("scheduled_at")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
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
}

// Reschedule a game
export async function rescheduleGame(
  gameId: string,
  newScheduledAt: string,
  reason?: string
): Promise<GameActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Get current game data
  const { data: game } = await supabase
    .from("games")
    .select("scheduled_at, original_scheduled_at")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  // Use original_scheduled_at if it exists, otherwise use current scheduled_at
  const originalScheduledAt = game.original_scheduled_at || game.scheduled_at;

  const { data: updatedGame, error } = await supabase
    .from("games")
    .update({
      scheduled_at: newScheduledAt,
      rescheduled_at: newScheduledAt,
      original_scheduled_at: originalScheduledAt,
      is_rescheduled: true,
      status: game.status === "cancelled" ? "scheduled" as GameStatus : undefined,
      cancellation_reason: game.status === "cancelled" ? null : undefined,
      cancelled_at: game.status === "cancelled" ? null : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
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
}
