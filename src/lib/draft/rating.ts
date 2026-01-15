// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import type { PlayerRating } from "@/types/database";

export type PlayerRatingData = {
  playerId: string;
  rating: PlayerRating;
  gamesPlayed: number;
  attendanceRate: number;
  pointsPerGame: number;
  goalsPerGame: number;
  assistsPerGame: number;
  // For goalies
  gaa?: number;
  savePercentage?: number;
};

// Helper function to calculate rating with plus/minus
function calculateRating(
  attendanceRate: number,
  pointsPerGame: number,
  isGoalie: boolean = false,
  gaa?: number,
  savePercentage?: number
): PlayerRating {
  if (isGoalie) {
    // Goalie rating logic
    if (attendanceRate >= 0.9 && gaa !== undefined && gaa < 1.5) {
      return "A+";
    }
    if (attendanceRate >= 0.85 && gaa !== undefined && gaa < 2.0) {
      return "A";
    }
    if (attendanceRate >= 0.8 && (gaa !== undefined && gaa < 2.5 || savePercentage !== undefined && savePercentage > 92)) {
      return "A-";
    }
    if (attendanceRate >= 0.75 && (gaa !== undefined && gaa < 3.0 || savePercentage !== undefined && savePercentage > 88)) {
      return "B+";
    }
    if (attendanceRate >= 0.7 && (gaa !== undefined && gaa < 3.5 || savePercentage !== undefined && savePercentage > 85)) {
      return "B";
    }
    if (attendanceRate >= 0.6 && (gaa !== undefined && gaa < 4.0 || savePercentage !== undefined && savePercentage > 80)) {
      return "B-";
    }
    if (attendanceRate >= 0.5 && (gaa !== undefined && gaa < 4.5 || savePercentage !== undefined && savePercentage > 75)) {
      return "C+";
    }
    if (attendanceRate >= 0.4 && (gaa !== undefined && gaa < 5.0 || savePercentage !== undefined && savePercentage > 70)) {
      return "C";
    }
    if (attendanceRate >= 0.3 && gaa !== undefined && gaa < 5.5) {
      return "C-";
    }
    if (attendanceRate >= 0.2 && gaa !== undefined && gaa < 6.0) {
      return "D+";
    }
    if (attendanceRate >= 0.1 && gaa !== undefined && gaa < 7.0) {
      return "D";
    }
    return "D-";
  } else {
    // Player rating logic
    if (attendanceRate >= 0.9 && pointsPerGame >= 2.0) {
      return "A+";
    }
    if (attendanceRate >= 0.85 && pointsPerGame >= 1.75) {
      return "A";
    }
    if (attendanceRate >= 0.8 && pointsPerGame >= 1.5) {
      return "A-";
    }
    if (attendanceRate >= 0.75 && pointsPerGame >= 1.25) {
      return "B+";
    }
    if (attendanceRate >= 0.7 && pointsPerGame >= 1.0) {
      return "B";
    }
    if (attendanceRate >= 0.6 && pointsPerGame >= 0.8) {
      return "B-";
    }
    if (attendanceRate >= 0.5 && pointsPerGame >= 0.6) {
      return "C+";
    }
    if (attendanceRate >= 0.4 && pointsPerGame >= 0.4) {
      return "C";
    }
    if (attendanceRate >= 0.3 && pointsPerGame >= 0.2) {
      return "C-";
    }
    if (attendanceRate >= 0.2 && pointsPerGame >= 0.1) {
      return "D+";
    }
    if (attendanceRate >= 0.1 || pointsPerGame > 0) {
      return "D";
    }
    return "D-";
  }
}

// Calculate player ratings based on performance
export async function calculatePlayerRatings(seasonId: string): Promise<PlayerRatingData[]> {
  const supabase = await createClient();

  // First get all completed games for this season
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "completed");

  if (gamesError) {
    console.error("Error fetching games for ratings:", gamesError);
    return [];
  }

  if (!games || games.length === 0) {
    console.log("No completed games found for season, skipping ratings calculation");
    return [];
  }

  const gameIds = games.map(g => g.id);

  // Get all players who played in this season (using game IDs)
  const { data: playerStats, error: playerStatsError } = await supabase
    .from("player_stats")
    .select(`
      player_id,
      goals,
      assists,
      game_id,
      game:games!player_stats_game_id_fkey(
        id,
        season_id,
        status,
        home_captain_verified,
        away_captain_verified,
        home_verified_by_owner,
        away_verified_by_owner,
        scheduled_at
      )
    `)
    .in("game_id", gameIds);

  if (playerStatsError) {
    console.error("Error fetching player stats for ratings:", playerStatsError);
    return [];
  }

  // Get goalie stats
  const { data: goalieStats, error: goalieStatsError } = await supabase
    .from("goalie_stats")
    .select(`
      player_id,
      goals_against,
      saves,
      game_id,
      game:games!goalie_stats_game_id_fkey(
        id,
        season_id,
        status,
        home_captain_verified,
        away_captain_verified,
        home_verified_by_owner,
        away_verified_by_owner
      )
    `)
    .in("game_id", gameIds);

  if (goalieStatsError) {
    console.error("Error fetching goalie stats for ratings:", goalieStatsError);
    return [];
  }

  const totalGames = games.length;

  // Aggregate player stats
  const playerMap: Record<string, {
    games: Set<string>;
    goals: number;
    assists: number;
    points: number;
  }> = {};

  // Only count verified games (captain verified OR owner verified)
  (playerStats || []).forEach((stat: any) => {
    if (!stat.game) return;
    const homeVerified = stat.game.home_captain_verified || stat.game.home_verified_by_owner;
    const awayVerified = stat.game.away_captain_verified || stat.game.away_verified_by_owner;
    if (!homeVerified || !awayVerified) {
      return;
    }

    const playerId = stat.player_id;
    if (!playerMap[playerId]) {
      playerMap[playerId] = {
        games: new Set(),
        goals: 0,
        assists: 0,
        points: 0,
      };
    }

    playerMap[playerId].games.add(stat.game.id);
    playerMap[playerId].goals += stat.goals || 0;
    playerMap[playerId].assists += stat.assists || 0;
    playerMap[playerId].points += (stat.goals || 0) + (stat.assists || 0);
  });

  // Aggregate goalie stats
  const goalieMap: Record<string, {
    games: Set<string>;
    goalsAgainst: number;
    saves: number;
    totalShots: number;
  }> = {};

  (goalieStats || []).forEach((stat: any) => {
    if (!stat.game) return;
    const homeVerified = stat.game.home_captain_verified || stat.game.home_verified_by_owner;
    const awayVerified = stat.game.away_captain_verified || stat.game.away_verified_by_owner;
    if (!homeVerified || !awayVerified) {
      return;
    }

    const goalieId = stat.player_id;
    if (!goalieMap[goalieId]) {
      goalieMap[goalieId] = {
        games: new Set(),
        goalsAgainst: 0,
        saves: 0,
        totalShots: 0,
      };
    }

    goalieMap[goalieId].games.add(stat.game.id);
    goalieMap[goalieId].goalsAgainst += stat.goals_against || 0;
    goalieMap[goalieId].saves += stat.saves || 0;
    goalieMap[goalieId].totalShots += (stat.goals_against || 0) + (stat.saves || 0);
  });

  // Calculate ratings for players
  const ratings: PlayerRatingData[] = [];

  Object.entries(playerMap).forEach(([playerId, stats]) => {
    const gamesPlayed = stats.games.size;
    const attendanceRate = totalGames > 0 ? gamesPlayed / totalGames : 0;
    const pointsPerGame = gamesPlayed > 0 ? stats.points / gamesPlayed : 0;
    const goalsPerGame = gamesPlayed > 0 ? stats.goals / gamesPlayed : 0;
    const assistsPerGame = gamesPlayed > 0 ? stats.assists / gamesPlayed : 0;

    const rating = calculateRating(attendanceRate, pointsPerGame, false);

    ratings.push({
      playerId,
      rating,
      gamesPlayed,
      attendanceRate,
      pointsPerGame,
      goalsPerGame,
      assistsPerGame,
    });
  });

  // Calculate ratings for goalies
  Object.entries(goalieMap).forEach(([goalieId, stats]) => {
    const gamesPlayed = stats.games.size;
    const attendanceRate = totalGames > 0 ? gamesPlayed / totalGames : 0;
    const gaa = gamesPlayed > 0 ? stats.goalsAgainst / gamesPlayed : 999;
    const savePercentage = stats.totalShots > 0 
      ? (stats.saves / stats.totalShots) * 100 
      : 0;

    const rating = calculateRating(attendanceRate, 0, true, gaa, savePercentage);

    // Check if goalie is already in ratings (played both positions)
    const existingIndex = ratings.findIndex(r => r.playerId === goalieId);
    if (existingIndex >= 0) {
      // Use the better rating (compare by grade value)
      const ratingOrder: Record<PlayerRating, number> = {
        "A+": 12, "A": 11, "A-": 10,
        "B+": 9, "B": 8, "B-": 7,
        "C+": 6, "C": 5, "C-": 4,
        "D+": 3, "D": 2, "D-": 1,
      };
      if (ratingOrder[rating] > ratingOrder[ratings[existingIndex].rating]) {
        ratings[existingIndex].rating = rating;
      }
      ratings[existingIndex].gaa = gaa;
      ratings[existingIndex].savePercentage = savePercentage;
    } else {
      ratings.push({
        playerId: goalieId,
        rating,
        gamesPlayed,
        attendanceRate,
        pointsPerGame: 0,
        goalsPerGame: 0,
        assistsPerGame: 0,
        gaa,
        savePercentage,
      });
    }
  });

  // Save ratings to database
  for (const ratingData of ratings) {
    await supabase
      .from("player_ratings")
      .upsert({
        player_id: ratingData.playerId,
        season_id: seasonId,
        rating: ratingData.rating,
        games_played: ratingData.gamesPlayed,
        attendance_rate: ratingData.attendanceRate,
        points_per_game: ratingData.pointsPerGame,
        calculated_at: new Date().toISOString(),
      }, {
        onConflict: "player_id,season_id",
      });
  }

  // Sort by rating value
  const ratingOrder: Record<PlayerRating, number> = {
    "A+": 12, "A": 11, "A-": 10,
    "B+": 9, "B": 8, "B-": 7,
    "C+": 6, "C": 5, "C-": 4,
    "D+": 3, "D": 2, "D-": 1,
  };

  return ratings.sort((a, b) => {
    return ratingOrder[b.rating] - ratingOrder[a.rating];
  });
}
