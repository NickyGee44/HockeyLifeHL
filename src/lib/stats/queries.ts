"use server";

import { createClient } from "@/lib/supabase/server";

// Get all player stats for a season
export async function getSeasonPlayerStats(seasonId: string) {
  const supabase = await createClient();

  // Get all stats for this season, then filter by verified games
  const { data: stats, error } = await supabase
    .from("player_stats")
    .select(`
      *,
      player:profiles!player_stats_player_id_fkey(id, full_name, jersey_number, position),
      game:games!player_stats_game_id_fkey(
        id, 
        season_id, 
        status, 
        home_captain_verified, 
        away_captain_verified,
        home_verified_by_owner,
        away_verified_by_owner
      )
    `)
    .eq("season_id", seasonId)
    .eq("game.status", "completed");

  if (error) {
    console.error("Error fetching player stats:", error);
    return { error: error.message, stats: [] };
  }

  // Filter to only verified games (captain verified OR owner verified for each side)
  const verifiedStats = (stats || []).filter((stat: any) => {
    if (!stat.game) return false;
    const homeVerified = stat.game.home_captain_verified || stat.game.home_verified_by_owner;
    const awayVerified = stat.game.away_captain_verified || stat.game.away_verified_by_owner;
    return homeVerified && awayVerified;
  });

  // Aggregate stats by player
  const playerStatsMap: Record<string, {
    player: any;
    games: number;
    goals: number;
    assists: number;
    points: number;
  }> = {};

  // Process verified stats
  verifiedStats.forEach((stat: any) => {
    const playerId = stat.player_id;
    if (!playerStatsMap[playerId]) {
      playerStatsMap[playerId] = {
        player: stat.player,
        games: 0,
        goals: 0,
        assists: 0,
        points: 0,
      };
    }

    playerStatsMap[playerId].goals += stat.goals || 0;
    playerStatsMap[playerId].assists += stat.assists || 0;
    playerStatsMap[playerId].points += (stat.goals || 0) + (stat.assists || 0);
  });

  // Count unique games per player
  const gameCounts: Record<string, Set<string>> = {};
  verifiedStats.forEach((stat: any) => {
    if (!gameCounts[stat.player_id]) {
      gameCounts[stat.player_id] = new Set();
    }
    gameCounts[stat.player_id].add(stat.game_id);
  });

  Object.keys(gameCounts).forEach(playerId => {
    if (playerStatsMap[playerId]) {
      playerStatsMap[playerId].games = gameCounts[playerId].size;
    }
  });

  return {
    stats: Object.values(playerStatsMap).sort((a, b) => b.points - a.points),
  };
}

// Get all goalie stats for a season
export async function getSeasonGoalieStats(seasonId: string) {
  const supabase = await createClient();

  // Get all stats for this season, then filter by verified games
  const { data: stats, error } = await supabase
    .from("goalie_stats")
    .select(`
      *,
      player:profiles!goalie_stats_player_id_fkey(id, full_name, jersey_number),
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
    .eq("season_id", seasonId)
    .eq("game.status", "completed");

  if (error) {
    console.error("Error fetching goalie stats:", error);
    return { error: error.message, stats: [] };
  }

  // Filter to only verified games (captain verified OR owner verified for each side)
  const verifiedStats = (stats || []).filter((stat: any) => {
    if (!stat.game) return false;
    const homeVerified = stat.game.home_captain_verified || stat.game.home_verified_by_owner;
    const awayVerified = stat.game.away_captain_verified || stat.game.away_verified_by_owner;
    return homeVerified && awayVerified;
  });

  // Aggregate stats by goalie
  const goalieStatsMap: Record<string, {
    player: any;
    games: number;
    goalsAgainst: number;
    saves: number;
    shutouts: number;
    gaa: number;
    savePercentage: number;
  }> = {};

  const gameCounts: Record<string, Set<string>> = {};

  // Process verified stats
  verifiedStats.forEach((stat: any) => {
    const goalieId = stat.player_id;
    if (!goalieStatsMap[goalieId]) {
      goalieStatsMap[goalieId] = {
        player: stat.player,
        games: 0,
        goalsAgainst: 0,
        saves: 0,
        shutouts: 0,
        gaa: 0,
        savePercentage: 0,
      };
    }

    goalieStatsMap[goalieId].goalsAgainst += stat.goals_against || 0;
    goalieStatsMap[goalieId].saves += stat.saves || 0;
    if (stat.shutout) {
      goalieStatsMap[goalieId].shutouts += 1;
    }

    if (!gameCounts[goalieId]) {
      gameCounts[goalieId] = new Set();
    }
    gameCounts[goalieId].add(stat.game_id);
  });

  // Calculate averages
  Object.keys(goalieStatsMap).forEach(goalieId => {
    const games = gameCounts[goalieId]?.size || 0;
    goalieStatsMap[goalieId].games = games;
    if (games > 0) {
      goalieStatsMap[goalieId].gaa = goalieStatsMap[goalieId].goalsAgainst / games;
      const totalShots = goalieStatsMap[goalieId].goalsAgainst + goalieStatsMap[goalieId].saves;
      goalieStatsMap[goalieId].savePercentage = totalShots > 0
        ? (goalieStatsMap[goalieId].saves / totalShots) * 100
        : 0;
    }
  });

  return {
    stats: Object.values(goalieStatsMap).sort((a, b) => a.gaa - b.gaa),
  };
}

// Get individual player stats
export async function getPlayerStats(playerId: string, seasonId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("player_stats")
    .select(`
      *,
      game:games!player_stats_game_id_fkey(
        id,
        scheduled_at,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        home_captain_verified,
        away_captain_verified,
        home_verified_by_owner,
        away_verified_by_owner,
        home_team:teams!games_home_team_id_fkey(id, name, short_name),
        away_team:teams!games_away_team_id_fkey(id, name, short_name),
        season:seasons!games_season_id_fkey(id, name)
      )
    `)
    .eq("player_id", playerId)
    .eq("game.status", "completed");

  if (seasonId) {
    query = query.eq("game.season_id", seasonId);
  }

  const { data: stats, error } = await query.order("game.scheduled_at", { ascending: false });

  if (error) {
    console.error("Error fetching player stats:", error);
    return { error: error.message, stats: [] };
  }

  // Filter to only verified games (captain verified OR owner verified for each side)
  const verifiedStats = (stats || []).filter((s: any) => {
    const homeVerified = s.game.home_captain_verified || s.game.home_verified_by_owner;
    const awayVerified = s.game.away_captain_verified || s.game.away_verified_by_owner;
    return homeVerified && awayVerified;
  });

  // Calculate totals
  const totals = verifiedStats.reduce((acc, stat: any) => {
    acc.games += 1;
    acc.goals += stat.goals || 0;
    acc.assists += stat.assists || 0;
    acc.points += (stat.goals || 0) + (stat.assists || 0);
    return acc;
  }, { games: 0, goals: 0, assists: 0, points: 0 });

  return {
    stats: verifiedStats,
    totals,
  };
}

// Get all career player stats (legacy + current combined)
export async function getCareerPlayerStats() {
  const supabase = await createClient();

  // Query the player_career_stats view which combines legacy and current stats
  const { data: careerStats, error } = await supabase
    .from("player_career_stats")
    .select("*")
    .not("total_games_played", "eq", 0) // Only players with games played
    .order("total_points", { ascending: false });

  if (error) {
    console.error("Error fetching career player stats:", error);
    return { error: error.message, stats: [] };
  }

  // Get player profiles for matched players
  const playerIds = (careerStats || [])
    .map((stat: any) => stat.player_id)
    .filter((id: string | null) => id !== null);

  let profilesMap: Record<string, any> = {};
  if (playerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, jersey_number, position, avatar_url")
      .in("id", playerIds);

    if (profiles) {
      profilesMap = profiles.reduce((acc: Record<string, any>, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
    }
  }

  // Transform to match the format expected by the UI
  const stats = (careerStats || []).map((stat: any) => {
    const playerId = stat.player_id;
    const profile = playerId ? profilesMap[playerId] : null;

    return {
      player: {
        id: playerId,
        full_name: profile?.full_name || stat.full_name,
        jersey_number: profile?.jersey_number || null,
        position: profile?.position || null,
        avatar_url: profile?.avatar_url || null,
      },
      games: stat.total_games_played || 0,
      goals: stat.total_goals || 0,
      assists: stat.total_assists || 0,
      points: stat.total_points || 0,
      legacy_games: stat.legacy_games_played || 0,
      legacy_goals: stat.legacy_goals || 0,
      legacy_assists: stat.legacy_assists || 0,
      legacy_points: stat.legacy_points || 0,
      current_games: stat.current_games_played || 0,
      current_goals: stat.current_goals || 0,
      current_assists: stat.current_assists || 0,
      current_points: stat.current_points || 0,
    };
  });

  return { stats };
}

// Get all career goalie stats (legacy + current combined)
export async function getCareerGoalieStats() {
  const supabase = await createClient();

  // Get legacy goalie stats
  const { data: legacyGoalies, error: legacyError } = await supabase
    .from("legacy_players")
    .select("*")
    .eq("is_goalie", true)
    .gt("games_played", 0);

  if (legacyError) {
    console.error("Error fetching legacy goalie stats:", legacyError);
  }

  // Get current goalie stats (aggregated across all seasons)
  const { data: currentStats, error: currentError } = await supabase
    .from("goalie_stats")
    .select(`
      *,
      player:profiles!goalie_stats_player_id_fkey(id, full_name, jersey_number, avatar_url),
      game:games!goalie_stats_game_id_fkey(
        id,
        status,
        home_captain_verified,
        away_captain_verified,
        home_verified_by_owner,
        away_verified_by_owner
      )
    `)
    .eq("game.status", "completed");

  if (currentError) {
    console.error("Error fetching current goalie stats:", currentError);
  }

  // Filter verified games
  const verifiedStats = (currentStats || []).filter((stat: any) => {
    if (!stat.game) return false;
    const homeVerified = stat.game.home_captain_verified || stat.game.home_verified_by_owner;
    const awayVerified = stat.game.away_captain_verified || stat.game.away_verified_by_owner;
    return homeVerified && awayVerified;
  });

  // Aggregate current goalie stats by player
  const currentGoalieMap: Record<string, {
    player: any;
    games: number;
    goalsAgainst: number;
    saves: number;
    shutouts: number;
  }> = {};

  const gameCounts: Record<string, Set<string>> = {};

  verifiedStats.forEach((stat: any) => {
    const goalieId = stat.player_id;
    if (!currentGoalieMap[goalieId]) {
      currentGoalieMap[goalieId] = {
        player: stat.player,
        games: 0,
        goalsAgainst: 0,
        saves: 0,
        shutouts: 0,
      };
    }

    currentGoalieMap[goalieId].goalsAgainst += stat.goals_against || 0;
    currentGoalieMap[goalieId].saves += stat.saves || 0;
    if (stat.shutout) {
      currentGoalieMap[goalieId].shutouts += 1;
    }

    if (!gameCounts[goalieId]) {
      gameCounts[goalieId] = new Set();
    }
    gameCounts[goalieId].add(stat.game_id);
  });

  Object.keys(currentGoalieMap).forEach(goalieId => {
    currentGoalieMap[goalieId].games = gameCounts[goalieId]?.size || 0;
  });

  // Get profiles for matched goalies
  const matchedProfileIds = (legacyGoalies || [])
    .map((legacy: any) => legacy.matched_to_profile_id)
    .filter((id: string | null) => id !== null);

  let profilesMap: Record<string, any> = {};
  if (matchedProfileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, jersey_number, avatar_url")
      .in("id", matchedProfileIds);

    if (profiles) {
      profilesMap = profiles.reduce((acc: Record<string, any>, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
    }
  }

  // Combine legacy and current stats
  const combinedMap: Record<string, any> = {};

  // Add legacy goalies
  (legacyGoalies || []).forEach((legacy: any) => {
    const key = legacy.matched_to_profile_id || `legacy_${legacy.id}`;
    const profile = legacy.matched_to_profile_id ? profilesMap[legacy.matched_to_profile_id] : null;
    
    combinedMap[key] = {
      player: {
        id: legacy.matched_to_profile_id || null,
        full_name: profile?.full_name || legacy.full_name,
        jersey_number: profile?.jersey_number || null,
        avatar_url: profile?.avatar_url || null,
      },
      games: legacy.games_played || 0,
      goalsAgainst: legacy.goals_against || 0,
      saves: legacy.saves || 0,
      shutouts: legacy.shutouts || 0,
      gaa: legacy.goals_against_average || 0,
      savePercentage: legacy.save_percentage || 0,
      legacy_games: legacy.games_played || 0,
      legacy_goalsAgainst: legacy.goals_against || 0,
      legacy_saves: legacy.saves || 0,
      legacy_shutouts: legacy.shutouts || 0,
      current_games: 0,
      current_goalsAgainst: 0,
      current_saves: 0,
      current_shutouts: 0,
    };
  });

  // Merge current stats
  Object.entries(currentGoalieMap).forEach(([goalieId, current]) => {
    if (combinedMap[goalieId]) {
      // Merge with existing legacy stats
      combinedMap[goalieId].current_games = current.games;
      combinedMap[goalieId].current_goalsAgainst = current.goalsAgainst;
      combinedMap[goalieId].current_saves = current.saves;
      combinedMap[goalieId].current_shutouts = current.shutouts;
      combinedMap[goalieId].games = combinedMap[goalieId].legacy_games + current.games;
      combinedMap[goalieId].goalsAgainst = combinedMap[goalieId].legacy_goalsAgainst + current.goalsAgainst;
      combinedMap[goalieId].saves = combinedMap[goalieId].legacy_saves + current.saves;
      combinedMap[goalieId].shutouts = combinedMap[goalieId].legacy_shutouts + current.shutouts;
      
      // Recalculate GAA and save percentage
      if (combinedMap[goalieId].games > 0) {
        combinedMap[goalieId].gaa = combinedMap[goalieId].goalsAgainst / combinedMap[goalieId].games;
        const totalShots = combinedMap[goalieId].goalsAgainst + combinedMap[goalieId].saves;
        combinedMap[goalieId].savePercentage = totalShots > 0
          ? (combinedMap[goalieId].saves / totalShots) * 100
          : 0;
      }
    } else {
      // New goalie (no legacy stats)
      combinedMap[goalieId] = {
        player: current.player,
        games: current.games,
        goalsAgainst: current.goalsAgainst,
        saves: current.saves,
        shutouts: current.shutouts,
        gaa: current.games > 0 ? current.goalsAgainst / current.games : 0,
        savePercentage: (current.goalsAgainst + current.saves) > 0
          ? (current.saves / (current.goalsAgainst + current.saves)) * 100
          : 0,
        legacy_games: 0,
        legacy_goalsAgainst: 0,
        legacy_saves: 0,
        legacy_shutouts: 0,
        current_games: current.games,
        current_goalsAgainst: current.goalsAgainst,
        current_saves: current.saves,
        current_shutouts: current.shutouts,
      };
    }
  });

  return {
    stats: Object.values(combinedMap)
      .filter((stat: any) => stat.games > 0)
      .sort((a: any, b: any) => a.gaa - b.gaa),
  };
}

// Get individual goalie stats
export async function getGoalieStats(goalieId: string, seasonId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("goalie_stats")
    .select(`
      *,
      game:games!goalie_stats_game_id_fkey(
        id,
        scheduled_at,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        home_captain_verified,
        away_captain_verified,
        home_verified_by_owner,
        away_verified_by_owner,
        home_team:teams!games_home_team_id_fkey(id, name, short_name),
        away_team:teams!games_away_team_id_fkey(id, name, short_name),
        season:seasons!games_season_id_fkey(id, name)
      )
    `)
    .eq("player_id", goalieId)
    .eq("game.status", "completed");

  if (seasonId) {
    query = query.eq("game.season_id", seasonId);
  }

  const { data: stats, error } = await query.order("game.scheduled_at", { ascending: false });

  if (error) {
    console.error("Error fetching goalie stats:", error);
    return { error: error.message, stats: [] };
  }

  // Filter to only verified games (captain verified OR owner verified for each side)
  const verifiedStats = (stats || []).filter((s: any) => {
    const homeVerified = s.game.home_captain_verified || s.game.home_verified_by_owner;
    const awayVerified = s.game.away_captain_verified || s.game.away_verified_by_owner;
    return homeVerified && awayVerified;
  });

  // Calculate totals
  const totals = verifiedStats.reduce((acc, stat: any) => {
    acc.games += 1;
    acc.goalsAgainst += stat.goals_against || 0;
    acc.saves += stat.saves || 0;
    acc.shutouts += stat.shutout ? 1 : 0;
    return acc;
  }, { games: 0, goalsAgainst: 0, saves: 0, shutouts: 0 });

  const gaa = totals.games > 0 ? totals.goalsAgainst / totals.games : 0;
  const totalShots = totals.goalsAgainst + totals.saves;
  const savePercentage = totalShots > 0 ? (totals.saves / totalShots) * 100 : 0;

  return {
    stats: verifiedStats,
    totals: {
      ...totals,
      gaa,
      savePercentage,
    },
  };
}
