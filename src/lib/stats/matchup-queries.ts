"use server";

import { createClient } from "@/lib/supabase/server";

export interface PlayerGoalieMatchup {
  id: string;
  player_id: string;
  goalie_id: string;
  season_id: string | null;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  shooting_percentage: number | null;
  last_game_at: string | null;
  player?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  goalie?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  season?: {
    id: string;
    name: string;
  };
}

/**
 * Get matchup stats between a specific player and goalie
 */
export async function getPlayerVsGoalieStats(
  playerId: string,
  goalieId: string,
  seasonId?: string
): Promise<{ matchup: PlayerGoalieMatchup | null; error?: string }> {
  const supabase = await createClient();

  const query = supabase
    .from("player_goalie_matchups")
    .select(`
      *,
      player:profiles!player_id(id, full_name, avatar_url),
      goalie:profiles!goalie_id(id, full_name, avatar_url),
      season:seasons(id, name)
    `)
    .eq("player_id", playerId)
    .eq("goalie_id", goalieId);

  if (seasonId) {
    query.eq("season_id", seasonId);
  } else {
    query.is("season_id", null);
  }

  const { data, error } = await query.single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "not found" which is okay
    console.error("Error fetching matchup stats:", error);
    return { matchup: null, error: error.message };
  }

  return { matchup: data as PlayerGoalieMatchup | null };
}

/**
 * Get player's upcoming goalie matchups (for next game)
 */
export async function getPlayerUpcomingGoalieMatchups(playerId: string): Promise<{
  matchups: PlayerGoalieMatchup[];
  upcomingGame: any;
  error?: string;
}> {
  const supabase = await createClient();

  // Get player's next game
  const { data: teamRoster } = await supabase
    .from("team_rosters")
    .select("team_id, season_id")
    .eq("player_id", playerId)
    .single();

  if (!teamRoster) {
    return { matchups: [], upcomingGame: null };
  }

  // Get next game
  const { data: upcomingGame } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!home_team_id(id, name, logo_url),
      away_team:teams!away_team_id(id, name, logo_url)
    `)
    .or(`home_team_id.eq.${teamRoster.team_id},away_team_id.eq.${teamRoster.team_id}`)
    .eq("season_id", teamRoster.season_id)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();

  if (!upcomingGame) {
    return { matchups: [], upcomingGame: null };
  }

  // Determine opponent team
  const isHomeTeam = upcomingGame.home_team_id === teamRoster.team_id;
  const opponentTeamId = isHomeTeam ? upcomingGame.away_team_id : upcomingGame.home_team_id;

  // Get opponent's goalie(s)
  const { data: opponentGoalies } = await supabase
    .from("team_rosters")
    .select("player_id, player:profiles(id, full_name, avatar_url)")
    .eq("team_id", opponentTeamId)
    .eq("season_id", teamRoster.season_id)
    .eq("is_goalie", true);

  if (!opponentGoalies || opponentGoalies.length === 0) {
    return { matchups: [], upcomingGame };
  }

  // Get matchup stats for each opponent goalie
  const matchupPromises = opponentGoalies.map((goalie) =>
    getPlayerVsGoalieStats(playerId, goalie.player_id, teamRoster.season_id)
  );

  const matchupResults = await Promise.all(matchupPromises);
  const matchups = matchupResults
    .filter((result) => result.matchup !== null)
    .map((result) => result.matchup as PlayerGoalieMatchup);

  return { matchups, upcomingGame };
}

/**
 * Get top 5 goalies a player scores most against
 */
export async function getTopVictimGoalies(
  playerId: string,
  seasonId?: string
): Promise<{ goalies: PlayerGoalieMatchup[]; error?: string }> {
  const supabase = await createClient();

  const query = supabase
    .from("player_goalie_matchups")
    .select(`
      *,
      goalie:profiles!goalie_id(id, full_name, avatar_url)
    `)
    .eq("player_id", playerId)
    .order("goals", { ascending: false })
    .limit(5);

  if (seasonId) {
    query.eq("season_id", seasonId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching top victim goalies:", error);
    return { goalies: [], error: error.message };
  }

  return { goalies: data as PlayerGoalieMatchup[] };
}

/**
 * Get goalies a player struggles against most (highest save % against)
 */
export async function getToughestGoalies(
  playerId: string,
  seasonId?: string
): Promise<{ goalies: PlayerGoalieMatchup[]; error?: string }> {
  const supabase = await createClient();

  const query = supabase
    .from("player_goalie_matchups")
    .select(`
      *,
      goalie:profiles!goalie_id(id, full_name, avatar_url)
    `)
    .eq("player_id", playerId)
    .gte("shots", 5) // Minimum 5 shots for statistical significance
    .order("shooting_percentage", { ascending: true })
    .limit(5);

  if (seasonId) {
    query.eq("season_id", seasonId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching toughest goalies:", error);
    return { goalies: [], error: error.message };
  }

  return { goalies: data as PlayerGoalieMatchup[] };
}

/**
 * Get all matchups for a player in a season
 */
export async function getAllPlayerMatchups(
  playerId: string,
  seasonId: string
): Promise<{ matchups: PlayerGoalieMatchup[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("player_goalie_matchups")
    .select(`
      *,
      goalie:profiles!goalie_id(id, full_name, avatar_url),
      season:seasons(id, name)
    `)
    .eq("player_id", playerId)
    .eq("season_id", seasonId)
    .order("points", { ascending: false });

  if (error) {
    console.error("Error fetching all matchups:", error);
    return { matchups: [], error: error.message };
  }

  return { matchups: data as PlayerGoalieMatchup[] };
}
