// @ts-nocheck
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

// Submit complete game stats (score + player/goalie stats)
// First captain to submit locks in the game score
export async function submitCompleteGameStats(
  gameId: string,
  teamId: string,
  data: {
    homeScore: number;
    awayScore: number;
    playerStats: Array<{ playerId: string; goals: number; assists: number }>;
    goalieStats?: { goalieId: string; saves: number; goalsAgainst: number };
  }
): Promise<StatActionResult & { isFirstSubmission?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is captain of this team or owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner = profile?.role === "owner";
  
  if (!isOwner) {
    const { data: team } = await supabase
      .from("teams")
      .select("captain_id")
      .eq("id", teamId)
      .single();

    if (team?.captain_id !== user.id) {
      return { error: "Not authorized - must be team captain" };
    }
  }

  // Get full game details
  const { data: game } = await supabase
    .from("games")
    .select("*, home_team:teams!games_home_team_id_fkey(id, captain_id), away_team:teams!games_away_team_id_fkey(id, captain_id)")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  if (game.home_team_id !== teamId && game.away_team_id !== teamId) {
    return { error: "Team is not part of this game" };
  }

  const isHomeTeam = game.home_team_id === teamId;
  const isFirstSubmission = !game.stats_submitted_by;

  // If this is the first submission, captain sets the game score
  if (isFirstSubmission) {
    const { error: scoreError } = await supabase
      .from("games")
      .update({
        home_score: data.homeScore,
        away_score: data.awayScore,
        status: "completed",
        stats_submitted_by: user.id,
        stats_submitted_at: new Date().toISOString(),
        [isHomeTeam ? "home_captain_verified" : "away_captain_verified"]: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (scoreError) {
      console.error("Error setting game score:", scoreError);
      return { error: scoreError.message };
    }
  } else {
    // Second captain can only mark their verification, not change the score
    const { error: verifyError } = await supabase
      .from("games")
      .update({
        [isHomeTeam ? "home_captain_verified" : "away_captain_verified"]: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (verifyError) {
      console.error("Error verifying game:", verifyError);
      return { error: verifyError.message };
    }
  }

  // Delete existing player stats for this team
  await supabase
    .from("player_stats")
    .delete()
    .eq("game_id", gameId)
    .eq("team_id", teamId);

  // Insert player stats (only those with goals or assists)
  const statsToInsert = data.playerStats
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
    const { error: playerError } = await supabase
      .from("player_stats")
      .insert(statsToInsert);

    if (playerError) {
      console.error("Error inserting player stats:", playerError);
      return { error: playerError.message };
    }
  }

  // Insert goalie stats if provided
  if (data.goalieStats && data.goalieStats.goalieId) {
    // Delete existing goalie stats for this team
    await supabase
      .from("goalie_stats")
      .delete()
      .eq("game_id", gameId)
      .eq("team_id", teamId);

    const { error: goalieError } = await supabase
      .from("goalie_stats")
      .insert({
        game_id: gameId,
        player_id: data.goalieStats.goalieId,
        team_id: teamId,
        season_id: game.season_id,
        goals_against: data.goalieStats.goalsAgainst,
        saves: data.goalieStats.saves,
        shutout: data.goalieStats.goalsAgainst === 0,
      });

    if (goalieError) {
      console.error("Error inserting goalie stats:", goalieError);
      // Don't fail the whole submission for goalie stats
    }
  }

  // Check if both captains have verified
  const { data: updatedGame } = await supabase
    .from("games")
    .select("home_captain_verified, away_captain_verified, season_id")
    .eq("id", gameId)
    .single();

  if (updatedGame?.home_captain_verified && updatedGame?.away_captain_verified) {
    // Both verified - increment season game count
    const { incrementGameCount } = await import("../seasons/actions");
    await incrementGameCount(updatedGame.season_id);
  }

  revalidatePath("/captain/stats");
  revalidatePath("/captain");
  revalidatePath("/dashboard");
  revalidatePath("/standings");
  revalidatePath("/stats");
  revalidatePath(`/games/${gameId}`);

  return { success: true, isFirstSubmission };
}

// Get game details with both team rosters for stat entry
export async function getGameForStatEntry(gameId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get game with teams
  const { data: game, error } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color, captain_id),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color, captain_id)
    `)
    .eq("id", gameId)
    .single();

  if (error || !game) {
    return { error: "Game not found" };
  }

  // Get which team the user is captain of (or owner)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner = profile?.role === "owner";
  const isHomeCaptain = game.home_team?.captain_id === user.id;
  const isAwayCaptain = game.away_team?.captain_id === user.id;

  if (!isOwner && !isHomeCaptain && !isAwayCaptain) {
    return { error: "Not authorized - must be team captain or owner" };
  }

  const userTeamId = isHomeCaptain ? game.home_team_id : isAwayCaptain ? game.away_team_id : game.home_team_id;

  // Get rosters for both teams
  const { data: homeRoster } = await supabase
    .from("team_rosters")
    .select(`
      id,
      is_goalie,
      player:profiles!team_rosters_player_id_fkey(id, full_name, jersey_number, position, avatar_url)
    `)
    .eq("team_id", game.home_team_id)
    .eq("season_id", game.season_id);

  const { data: awayRoster } = await supabase
    .from("team_rosters")
    .select(`
      id,
      is_goalie,
      player:profiles!team_rosters_player_id_fkey(id, full_name, jersey_number, position, avatar_url)
    `)
    .eq("team_id", game.away_team_id)
    .eq("season_id", game.season_id);

  // Get existing stats if any
  const { data: existingPlayerStats } = await supabase
    .from("player_stats")
    .select("*")
    .eq("game_id", gameId);

  const { data: existingGoalieStats } = await supabase
    .from("goalie_stats")
    .select("*")
    .eq("game_id", gameId);

  return {
    game,
    homeRoster: homeRoster || [],
    awayRoster: awayRoster || [],
    existingPlayerStats: existingPlayerStats || [],
    existingGoalieStats: existingGoalieStats || [],
    userTeamId,
    isHomeCaptain,
    isAwayCaptain,
    isOwner,
    isFirstSubmission: !game.stats_submitted_by,
    canEditScore: !game.stats_submitted_by || game.stats_submitted_by === user.id || isOwner,
  };
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

  // First, get active/playoffs seasons only (not completed or archived)
  const { data: activeSeasons } = await supabase
    .from("seasons")
    .select("id")
    .in("status", ["active", "playoffs"]);

  const activeSeasonIds = (activeSeasons || []).map(s => s.id);

  if (activeSeasonIds.length === 0) {
    return { games: [] }; // No active seasons, no games to show
  }

  // Get today's date range for finding today's games
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // Get completed games OR today's games (scheduled/in_progress) for this team
  // Only from active/playoffs seasons
  const { data: games, error } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, short_name),
      away_team:teams!games_away_team_id_fkey(id, name, short_name),
      season:seasons!games_season_id_fkey(id, name, status)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .in("season_id", activeSeasonIds)
    .order("scheduled_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error fetching games needing stats:", error);
    return { error: error.message, games: [] };
  }

  // Filter to show:
  // 1. Completed games (for stat entry/verification)
  // 2. Today's games (scheduled or in_progress - so captain can see upcoming games)
  const relevantGames = (games || []).filter(game => {
    const gameDate = new Date(game.scheduled_at);
    const isToday = gameDate >= startOfDay && gameDate < endOfDay;
    const isCompleted = game.status === "completed";
    const isInProgress = game.status === "in_progress";
    
    return isCompleted || isToday || isInProgress;
  });

  // Check which games have stats entered
  const gamesWithStats = await Promise.all(
    relevantGames.map(async (game) => {
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

// Get Player of the Week based on recent game performance
export async function getPlayerOfTheWeek() {
  const supabase = await createClient();

  // Get games from the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Get recent completed games
  const { data: recentGames } = await supabase
    .from("games")
    .select("id")
    .eq("status", "completed")
    .gte("scheduled_at", oneWeekAgo.toISOString())
    .order("scheduled_at", { ascending: false });

  if (!recentGames || recentGames.length === 0) {
    // No games in the last week, try last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: olderGames } = await supabase
      .from("games")
      .select("id")
      .eq("status", "completed")
      .gte("scheduled_at", thirtyDaysAgo.toISOString())
      .order("scheduled_at", { ascending: false });

    if (!olderGames || olderGames.length === 0) {
      return { player: null };
    }
  }

  const gameIds = (recentGames || []).map(g => g.id);

  // Get player stats from these games, aggregated
  const { data: playerStats } = await supabase
    .from("player_stats")
    .select(`
      player_id,
      goals,
      assists,
      game_id,
      team_id
    `)
    .in("game_id", gameIds);

  if (!playerStats || playerStats.length === 0) {
    return { player: null };
  }

  // Aggregate stats by player
  const playerAggregates: Record<string, { 
    playerId: string; 
    goals: number; 
    assists: number; 
    points: number; 
    gamesPlayed: number;
    teamId: string;
    gameIds: string[];
  }> = {};

  for (const stat of playerStats) {
    if (!playerAggregates[stat.player_id]) {
      playerAggregates[stat.player_id] = {
        playerId: stat.player_id,
        goals: 0,
        assists: 0,
        points: 0,
        gamesPlayed: 0,
        teamId: stat.team_id,
        gameIds: [],
      };
    }
    playerAggregates[stat.player_id].goals += stat.goals || 0;
    playerAggregates[stat.player_id].assists += stat.assists || 0;
    playerAggregates[stat.player_id].points += (stat.goals || 0) + (stat.assists || 0);
    if (!playerAggregates[stat.player_id].gameIds.includes(stat.game_id)) {
      playerAggregates[stat.player_id].gamesPlayed += 1;
      playerAggregates[stat.player_id].gameIds.push(stat.game_id);
    }
  }

  // Find the player with the most points
  const sortedPlayers = Object.values(playerAggregates).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goals !== a.goals) return b.goals - a.goals;
    return b.gamesPlayed - a.gamesPlayed;
  });

  if (sortedPlayers.length === 0) {
    return { player: null };
  }

  const topPlayer = sortedPlayers[0];

  // Get player details
  const { data: playerProfile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, jersey_number, position, shot_hand")
    .eq("id", topPlayer.playerId)
    .single();

  if (!playerProfile) {
    return { player: null };
  }

  // Get team details
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, short_name, logo_url, primary_color, secondary_color")
    .eq("id", topPlayer.teamId)
    .single();

  return {
    player: {
      id: playerProfile.id,
      fullName: playerProfile.full_name,
      avatarUrl: playerProfile.avatar_url,
      jerseyNumber: playerProfile.jersey_number,
      position: playerProfile.position,
      shotHand: playerProfile.shot_hand,
      weeklyStats: {
        goals: topPlayer.goals,
        assists: topPlayer.assists,
        points: topPlayer.points,
        gamesPlayed: topPlayer.gamesPlayed,
      },
      team: team ? {
        id: team.id,
        name: team.name,
        shortName: team.short_name,
        logoUrl: team.logo_url,
        primaryColor: team.primary_color,
        secondaryColor: team.secondary_color,
      } : null,
    },
  };
}
