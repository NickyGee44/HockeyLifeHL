"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PlayerStats, GoalieStats } from "@/types/database";

export type StatActionResult = {
  error?: string;
  success?: boolean;
};

// Check if user is captain of the team
async function requireTeamCaptain(teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", isCaptain: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Owners can enter stats for any team
  if (profile?.role === "owner") {
    return { isCaptain: true, userId: user.id };
  }

  // Check if user is captain of this team
  if (profile?.role === "captain") {
    const { data: team } = await supabase
      .from("teams")
      .select("captain_id")
      .eq("id", teamId)
      .single();

    if (team?.captain_id === user.id) {
      return { isCaptain: true, userId: user.id };
    }
  }

  return { error: "Not authorized - must be team captain", isCaptain: false };
}

// Enter player stats for a game
export async function enterPlayerStats(
  gameId: string,
  teamId: string,
  stats: Array<{
    playerId: string;
    goals: number;
    assists: number;
  }>
): Promise<StatActionResult> {
  const auth = await requireTeamCaptain(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Verify game exists and team is part of it
  const { data: game } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, status, season_id")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  if (game.home_team_id !== teamId && game.away_team_id !== teamId) {
    return { error: "Team is not part of this game" };
  }

  // Delete existing stats for this game/team
  await supabase
    .from("player_stats")
    .delete()
    .eq("game_id", gameId)
    .eq("team_id", teamId);

  // Insert new stats with season_id (NHL-style structure)
  const statsToInsert = stats
    .filter(s => s.goals > 0 || s.assists > 0)
    .map(s => ({
      game_id: gameId,
      player_id: s.playerId,
      team_id: teamId,
      season_id: game.season_id,
      goals: s.goals || 0,
      assists: s.assists || 0,
    }));

  if (statsToInsert.length > 0) {
    const { error } = await supabase
      .from("player_stats")
      .insert(statsToInsert);

    if (error) {
      console.error("Error entering player stats:", error);
      return { error: error.message };
    }
  }

  // Update verification status
  const isHomeTeam = game.home_team_id === teamId;
  await supabase
    .from("games")
    .update({
      [isHomeTeam ? "home_captain_verified" : "away_captain_verified"]: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  revalidatePath("/captain/stats");
  revalidatePath("/captain");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stats");
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/stats");
  revalidatePath("/standings");
  return { success: true };
}

// Enter goalie stats for a game
export async function enterGoalieStats(
  gameId: string,
  teamId: string,
  goalieId: string,
  stats: {
    goalsAgainst: number;
    saves: number;
    shutout: boolean;
  }
): Promise<StatActionResult> {
  const auth = await requireTeamCaptain(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Verify game exists and team is part of it
  const { data: game } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, season_id")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  if (game.home_team_id !== teamId && game.away_team_id !== teamId) {
    return { error: "Team is not part of this game" };
  }

  // Delete existing goalie stats for this game/team
  await supabase
    .from("goalie_stats")
    .delete()
    .eq("game_id", gameId)
    .eq("team_id", teamId);

  // Insert new goalie stats with season_id (NHL-style structure)
  const { error } = await supabase
    .from("goalie_stats")
    .insert({
      game_id: gameId,
      player_id: goalieId,
      team_id: teamId,
      season_id: game.season_id,
      goals_against: stats.goalsAgainst,
      saves: stats.saves,
      shutout: stats.shutout,
    });

  if (error) {
    console.error("Error entering goalie stats:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/stats");
  revalidatePath("/captain");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stats");
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/stats");
  revalidatePath("/standings");
  return { success: true };
}

// Verify game stats (captain confirms opponent's stats)
export async function verifyGameStats(
  gameId: string,
  teamId: string
): Promise<StatActionResult> {
  const auth = await requireTeamCaptain(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Verify game exists and team is part of it
  const { data: game } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, status")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  if (game.home_team_id !== teamId && game.away_team_id !== teamId) {
    return { error: "Team is not part of this game" };
  }

  // Update verification status
  const isHomeTeam = game.home_team_id === teamId;
  const updateField = isHomeTeam ? "home_captain_verified" : "away_captain_verified";

  const { error } = await supabase
    .from("games")
    .update({
      [updateField]: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  if (error) {
    console.error("Error verifying game stats:", error);
    return { error: error.message };
  }

  // If both captains verified and game is completed, increment season game count
  if (game.status === "completed") {
    const { data: updatedGame } = await supabase
      .from("games")
      .select("home_captain_verified, away_captain_verified, season_id")
      .eq("id", gameId)
      .single();

    if (updatedGame?.home_captain_verified && updatedGame?.away_captain_verified) {
      // Import increment function
      const { incrementGameCount } = await import("../seasons/actions");
      await incrementGameCount(updatedGame.season_id);

      // Auto-generate game recap article (optional - can be disabled if too many articles)
      try {
        const { generateAIArticle } = await import("../admin/article-actions");
        const result = await generateAIArticle("game_recap", gameId);
        if (result.success && result.content) {
          // Auto-create the article (but don't auto-publish - let owner review)
          await supabase
            .from("articles")
            .insert({
              title: result.title || "Game Recap",
              content: result.content,
              type: "game_recap",
              game_id: gameId,
              published: false, // Owner can review and publish
            });
        }
      } catch (error) {
        console.error("Error auto-generating game recap:", error);
        // Don't fail verification if article generation fails
      }
    }
  }

  revalidatePath("/captain/stats");
  revalidatePath("/captain");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stats");
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/stats");
  revalidatePath("/standings");
  revalidatePath("/admin");
  return { success: true };
}

// Owner override: Force verify stats if captain is unresponsive
export async function ownerOverrideVerification(
  gameId: string,
  teamId: string
): Promise<StatActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Only owner can override verification" };
  }

  // Verify game exists and team is part of it
  const { data: game } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, status")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  if (game.home_team_id !== teamId && game.away_team_id !== teamId) {
    return { error: "Team is not part of this game" };
  }

  // Update verification status with owner override flag
  const isHomeTeam = game.home_team_id === teamId;
  const updateData: Record<string, unknown> = {
    [isHomeTeam ? "home_captain_verified" : "away_captain_verified"]: true,
    [isHomeTeam ? "home_verified_by_owner" : "away_verified_by_owner"]: true,
    [isHomeTeam ? "home_verified_at" : "away_verified_at"]: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("games")
    .update(updateData)
    .eq("id", gameId);

  if (error) {
    console.error("Error overriding verification:", error);
    return { error: error.message };
  }

  // If both captains verified and game is completed, increment season game count
  if (game.status === "completed") {
    const { data: updatedGame } = await supabase
      .from("games")
      .select("home_captain_verified, away_captain_verified, season_id")
      .eq("id", gameId)
      .single();

    if (updatedGame?.home_captain_verified && updatedGame?.away_captain_verified) {
      const { incrementGameCount } = await import("../seasons/actions");
      await incrementGameCount(updatedGame.season_id);

      // Auto-generate game recap article
      try {
        const { generateAIArticle } = await import("../admin/article-actions");
        const result = await generateAIArticle("game_recap", gameId);
        if (result.success && result.content) {
          await supabase
            .from("articles")
            .insert({
              title: result.title || "Game Recap",
              content: result.content,
              type: "game_recap",
              game_id: gameId,
              published: false,
            });
        }
      } catch (error) {
        console.error("Error auto-generating game recap:", error);
      }
    }
  }

  revalidatePath("/admin/stats");
  revalidatePath("/captain/stats");
  revalidatePath("/captain");
  revalidatePath("/dashboard");
  revalidatePath("/stats");
  revalidatePath("/standings");
  return { success: true };
}

// Get game stats for a specific game
export async function getGameStats(gameId: string) {
  const supabase = await createClient();

  const { data: playerStats } = await supabase
    .from("player_stats")
    .select(`
      *,
      player:profiles!player_stats_player_id_fkey(id, full_name, jersey_number, position)
    `)
    .eq("game_id", gameId)
    .order("goals", { ascending: false });

  const { data: goalieStats } = await supabase
    .from("goalie_stats")
    .select(`
      *,
      player:profiles!goalie_stats_player_id_fkey(id, full_name, jersey_number)
    `)
    .eq("game_id", gameId);

  return {
    playerStats: playerStats || [],
    goalieStats: goalieStats || [],
  };
}

// Get games needing stat entry for a captain's team
export async function getGamesNeedingStats(teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", games: [] };
  }

  // Get games where this team played and stats haven't been entered
  const { data: games, error } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, short_name),
      away_team:teams!games_away_team_id_fkey(id, name, short_name),
      season:seasons!games_season_id_fkey(id, name)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching games needing stats:", error);
    return { error: error.message, games: [] };
  }

  // Check which games have stats entered
  const gamesWithStats = await Promise.all(
    (games || []).map(async (game) => {
      const { data: stats } = await supabase
        .from("player_stats")
        .select("id")
        .eq("game_id", game.id)
        .eq("team_id", teamId)
        .limit(1);

      return {
        ...game,
        hasStats: (stats?.length || 0) > 0,
        isHomeTeam: game.home_team_id === teamId,
      };
    })
  );

  return { games: gamesWithStats };
}
