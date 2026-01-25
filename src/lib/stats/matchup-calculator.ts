"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Update or create matchup stats after a game is completed
 * This should be called after game stats are verified by both captains
 */
export async function updateMatchupStatsForGame(gameId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Get game details
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select(`
        id,
        season_id,
        home_team_id,
        away_team_id,
        scheduled_at
      `)
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      return { success: false, error: "Game not found" };
    }

    // Get all player stats for this game
    const { data: playerStats, error: statsError } = await supabase
      .from("player_stats")
      .select(`
        player_id,
        team_id,
        goals,
        assists,
        shots
      `)
      .eq("game_id", gameId);

    if (statsError) {
      return { success: false, error: statsError.message };
    }

    if (!playerStats || playerStats.length === 0) {
      return { success: true }; // No stats to process
    }

    // Get goalies for both teams from team_rosters
    const { data: homeGoalies } = await supabase
      .from("team_rosters")
      .select("player_id")
      .eq("team_id", game.home_team_id)
      .eq("season_id", game.season_id)
      .eq("is_goalie", true);

    const { data: awayGoalies } = await supabase
      .from("team_rosters")
      .select("player_id")
      .eq("team_id", game.away_team_id)
      .eq("season_id", game.season_id)
      .eq("is_goalie", true);

    const homeGoalieIds = homeGoalies?.map((g) => g.player_id) || [];
    const awayGoalieIds = awayGoalies?.map((g) => g.player_id) || [];

    // Process each player's stats against opposing goalies
    for (const stat of playerStats) {
      // Skip if player is a goalie
      if (
        homeGoalieIds.includes(stat.player_id) ||
        awayGoalieIds.includes(stat.player_id)
      ) {
        continue;
      }

      // Determine which goalies this player faced
      const isHomePlayer = stat.team_id === game.home_team_id;
      const opposingGoalieIds = isHomePlayer ? awayGoalieIds : homeGoalieIds;

      // Update matchup stats for each opposing goalie
      for (const goalieId of opposingGoalieIds) {
        await updateOrCreateMatchup(
          stat.player_id,
          goalieId,
          game.season_id,
          stat.goals,
          stat.assists,
          stat.shots || 0,
          game.scheduled_at
        );
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating matchup stats:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update or create a single matchup record
 */
async function updateOrCreateMatchup(
  playerId: string,
  goalieId: string,
  seasonId: string,
  goals: number,
  assists: number,
  shots: number,
  gameDate: string
): Promise<void> {
  const supabase = await createClient();

  // Check if matchup exists
  const { data: existingMatchup } = await supabase
    .from("player_goalie_matchups")
    .select("*")
    .eq("player_id", playerId)
    .eq("goalie_id", goalieId)
    .eq("season_id", seasonId)
    .single();

  if (existingMatchup) {
    // Update existing matchup
    await supabase
      .from("player_goalie_matchups")
      .update({
        games_played: existingMatchup.games_played + 1,
        goals: existingMatchup.goals + goals,
        assists: existingMatchup.assists + assists,
        shots: existingMatchup.shots + shots,
        last_game_at: gameDate,
      })
      .eq("id", existingMatchup.id);
  } else {
    // Create new matchup
    await supabase.from("player_goalie_matchups").insert({
      player_id: playerId,
      goalie_id: goalieId,
      season_id: seasonId,
      games_played: 1,
      goals,
      assists,
      shots,
      last_game_at: gameDate,
    });
  }
}

/**
 * Backfill all matchup stats for historical games
 * This should be run once as a migration script
 */
export async function backfillMatchupStats(): Promise<{
  success: boolean;
  gamesProcessed: number;
  error?: string;
}> {
  const supabase = await createClient();
  let gamesProcessed = 0;

  try {
    // Get all completed games that have been verified
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, season_id")
      .eq("status", "completed")
      .eq("home_captain_verified", true)
      .eq("away_captain_verified", true)
      .order("scheduled_at", { ascending: true });

    if (gamesError) {
      return { success: false, gamesProcessed: 0, error: gamesError.message };
    }

    if (!games || games.length === 0) {
      return { success: true, gamesProcessed: 0 };
    }

    // Process each game
    for (const game of games) {
      const result = await updateMatchupStatsForGame(game.id);
      if (result.success) {
        gamesProcessed++;
      } else {
        console.error(`Failed to process game ${game.id}:`, result.error);
      }
    }

    return { success: true, gamesProcessed };
  } catch (error: any) {
    console.error("Error backfilling matchup stats:", error);
    return { success: false, gamesProcessed, error: error.message };
  }
}

/**
 * Recalculate matchup stats for a specific season
 */
export async function recalculateSeasonMatchups(seasonId: string): Promise<{
  success: boolean;
  gamesProcessed: number;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Delete existing matchups for this season
    await supabase
      .from("player_goalie_matchups")
      .delete()
      .eq("season_id", seasonId);

    // Get all completed games for this season
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id")
      .eq("season_id", seasonId)
      .eq("status", "completed")
      .eq("home_captain_verified", true)
      .eq("away_captain_verified", true);

    if (gamesError) {
      return { success: false, gamesProcessed: 0, error: gamesError.message };
    }

    if (!games || games.length === 0) {
      return { success: true, gamesProcessed: 0 };
    }

    // Reprocess each game
    let gamesProcessed = 0;
    for (const game of games) {
      const result = await updateMatchupStatsForGame(game.id);
      if (result.success) {
        gamesProcessed++;
      }
    }

    return { success: true, gamesProcessed };
  } catch (error: any) {
    console.error("Error recalculating season matchups:", error);
    return { success: false, gamesProcessed: 0, error: error.message };
  }
}
