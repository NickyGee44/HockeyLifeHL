"use server";

import { createClient } from "@/lib/supabase/server";

// Get player season stats (NHL-style: stats for a player in a specific season)
export async function getPlayerSeasonStats(playerId: string, seasonId: string) {
  const supabase = await createClient();

  // Get stats from materialized view or calculate on the fly
  const { data: seasonStats, error } = await supabase
    .from("player_season_stats_mv")
    .select("*")
    .eq("player_id", playerId)
    .eq("season_id", seasonId)
    .single();

  if (error && error.code !== "PGRST116") {
    // If materialized view doesn't exist or error, calculate on the fly
    const { data: stats } = await supabase
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
          home_team:teams!games_home_team_id_fkey(id, name, short_name),
          away_team:teams!games_away_team_id_fkey(id, name, short_name)
        ),
        team:teams!player_stats_team_id_fkey(id, name, short_name)
      `)
      .eq("player_id", playerId)
      .eq("season_id", seasonId);

    if (!stats || stats.length === 0) {
      return {
        stats: [],
        totals: {
          games_played: 0,
          goals: 0,
          assists: 0,
          points: 0,
          points_per_game: 0,
          goals_per_game: 0,
          assists_per_game: 0,
        },
        team: null,
      };
    }

    // Get team from roster
    const { data: roster } = await supabase
      .from("team_rosters")
      .select("team_id, team:teams!team_rosters_team_id_fkey(id, name, short_name)")
      .eq("player_id", playerId)
      .eq("season_id", seasonId)
      .single();

    const totals = stats.reduce(
      (acc, stat) => {
        acc.games_played += 1;
        acc.goals += stat.goals || 0;
        acc.assists += stat.assists || 0;
        acc.points += (stat.goals || 0) + (stat.assists || 0);
        return acc;
      },
      { games_played: 0, goals: 0, assists: 0, points: 0 }
    );

    totals.points_per_game = totals.games_played > 0 ? totals.points / totals.games_played : 0;
    totals.goals_per_game = totals.games_played > 0 ? totals.goals / totals.games_played : 0;
    totals.assists_per_game = totals.games_played > 0 ? totals.assists / totals.games_played : 0;

    return {
      stats,
      totals,
      team: roster?.team || null,
    };
  }

  // Get team info
  const { data: roster } = await supabase
    .from("team_rosters")
    .select("team_id, team:teams!team_rosters_team_id_fkey(id, name, short_name)")
    .eq("player_id", playerId)
    .eq("season_id", seasonId)
    .single();

  return {
    stats: [], // Game-by-game stats would need separate query
    totals: seasonStats || {
      games_played: 0,
      goals: 0,
      assists: 0,
      points: 0,
      points_per_game: 0,
      goals_per_game: 0,
      assists_per_game: 0,
    },
    team: roster?.team || null,
  };
}

// Get player career stats (NHL-style: all seasons combined)
export async function getPlayerCareerStats(playerId: string) {
  const supabase = await createClient();

  // Aggregate across all seasons
  const { data: allStats, error } = await supabase
    .from("player_stats")
    .select(`
      *,
      game:games!player_stats_game_id_fkey(
        id,
        status,
        home_captain_verified,
        away_captain_verified,
        season:seasons!games_season_id_fkey(id, name)
      )
    `)
    .eq("player_id", playerId);

  if (error) {
    console.error("Error fetching career stats:", error);
    return { error: error.message, stats: null };
  }

  // Filter to only verified games
  const verifiedStats = (allStats || []).filter(
    (s: any) =>
      s.game.status === "completed" &&
      s.game.home_captain_verified &&
      s.game.away_captain_verified
  );

  // Group by season
  const seasonStats: Record<string, any> = {};
  const careerTotals = {
    games_played: 0,
    goals: 0,
    assists: 0,
    points: 0,
    seasons: 0,
  };

  verifiedStats.forEach((stat: any) => {
    const seasonId = stat.season_id || stat.game.season?.id;
    const seasonName = stat.game.season?.name || "Unknown Season";

    if (!seasonStats[seasonId]) {
      seasonStats[seasonId] = {
        season_id: seasonId,
        season_name: seasonName,
        games_played: 0,
        goals: 0,
        assists: 0,
        points: 0,
      };
      careerTotals.seasons += 1;
    }

    seasonStats[seasonId].games_played += 1;
    seasonStats[seasonId].goals += stat.goals || 0;
    seasonStats[seasonId].assists += stat.assists || 0;
    seasonStats[seasonId].points += (stat.goals || 0) + (stat.assists || 0);

    careerTotals.games_played += 1;
    careerTotals.goals += stat.goals || 0;
    careerTotals.assists += stat.assists || 0;
    careerTotals.points += (stat.goals || 0) + (stat.assists || 0);
  });

  // Calculate per-game averages
  Object.values(seasonStats).forEach((season: any) => {
    season.points_per_game =
      season.games_played > 0 ? season.points / season.games_played : 0;
    season.goals_per_game =
      season.games_played > 0 ? season.goals / season.games_played : 0;
    season.assists_per_game =
      season.games_played > 0 ? season.assists / season.games_played : 0;
  });

  return {
    career_totals: {
      ...careerTotals,
      points_per_game:
        careerTotals.games_played > 0
          ? careerTotals.points / careerTotals.games_played
          : 0,
      goals_per_game:
        careerTotals.games_played > 0
          ? careerTotals.goals / careerTotals.games_played
          : 0,
      assists_per_game:
        careerTotals.games_played > 0
          ? careerTotals.assists / careerTotals.games_played
          : 0,
    },
    season_breakdown: Object.values(seasonStats),
  };
}

// Get team season stats (NHL-style: team performance in a season)
export async function getTeamSeasonStats(teamId: string, seasonId: string) {
  const supabase = await createClient();

  // Get all games for this team in this season
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("season_id", seasonId)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq("status", "completed")
    .eq("home_captain_verified", true)
    .eq("away_captain_verified", true);

  if (!games || games.length === 0) {
    return {
      games_played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      points: 0,
      goals_for: 0,
      goals_against: 0,
    };
  }

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  games.forEach((game) => {
    const isHome = game.home_team_id === teamId;
    const teamScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;

    goalsFor += teamScore;
    goalsAgainst += oppScore;

    if (teamScore > oppScore) {
      wins++;
    } else if (oppScore > teamScore) {
      losses++;
    } else {
      ties++;
    }
  });

  return {
    games_played: games.length,
    wins,
    losses,
    ties,
    points: wins * 2 + ties, // 2 points for win, 1 for tie
    goals_for: goalsFor,
    goals_against: goalsAgainst,
    goal_differential: goalsFor - goalsAgainst,
  };
}

// Get all players for a season with their stats (NHL-style leaderboard)
export async function getSeasonPlayerLeaderboard(seasonId: string) {
  const supabase = await createClient();

  // Try materialized view first
  const { data: leaderboard, error } = await supabase
    .from("player_season_stats_mv")
    .select(`
      *,
      player:profiles!player_season_stats_mv_player_id_fkey(
        id,
        full_name,
        jersey_number,
        position,
        avatar_url
      ),
      team:teams!player_season_stats_mv_team_id_fkey(
        id,
        name,
        short_name,
        primary_color,
        secondary_color
      ),
      season:seasons!player_season_stats_mv_season_id_fkey(
        id,
        name
      )
    `)
    .eq("season_id", seasonId)
    .order("points", { ascending: false })
    .order("goals", { ascending: false });

  if (error || !leaderboard || leaderboard.length === 0) {
    // Fallback to calculating on the fly
    return getSeasonPlayerStats(seasonId);
  }

  return { stats: leaderboard };
}

// Keep existing function for backward compatibility
export async function getSeasonPlayerStats(seasonId: string) {
  const supabase = await createClient();

  // First, get all completed games for this season
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .eq("home_captain_verified", true)
    .eq("away_captain_verified", true);

  if (gamesError) {
    console.error("Error fetching games:", gamesError);
    return { error: gamesError.message, stats: [] };
  }

  if (!games || games.length === 0) {
    return { stats: [] };
  }

  const gameIds = games.map((g) => g.id);

  if (gameIds.length === 0) {
    return { stats: [] };
  }

  // Then get stats for those games (now with season_id)
  const { data: stats, error } = await supabase
    .from("player_stats")
    .select(`
      *,
      player:profiles!player_stats_player_id_fkey(id, full_name, jersey_number, position),
      team:teams!player_stats_team_id_fkey(id, name, short_name)
    `)
    .eq("season_id", seasonId)
    .in("game_id", gameIds);

  if (error) {
    console.error("Error fetching player stats:", error);
    return { error: error.message, stats: [] };
  }

  // Aggregate stats by player
  const playerStatsMap: Record<
    string,
    {
      player: any;
      team: any;
      games: number;
      goals: number;
      assists: number;
      points: number;
    }
  > = {};

  (stats || []).forEach((stat: any) => {
    const playerId = stat.player_id;
    if (!playerStatsMap[playerId]) {
      playerStatsMap[playerId] = {
        player: stat.player,
        team: stat.team,
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
  (stats || []).forEach((stat: any) => {
    if (!gameCounts[stat.player_id]) {
      gameCounts[stat.player_id] = new Set();
    }
    gameCounts[stat.player_id].add(stat.game_id);
  });

  Object.keys(gameCounts).forEach((playerId) => {
    if (playerStatsMap[playerId]) {
      playerStatsMap[playerId].games = gameCounts[playerId].size;
    }
  });

  return {
    stats: Object.values(playerStatsMap).sort((a, b) => b.points - a.points),
  };
}
