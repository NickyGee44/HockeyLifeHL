"use server";

import { createClient } from "@/lib/supabase/server";

export interface SeasonTimeline {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  season_summary: string | null;
  total_goals_scored: number;
  average_goals_per_game: number | null;
  photo_gallery_url: string[] | null;
  champion_team: {
    id: string;
    name: string;
    short_name: string;
    logo_url: string | null;
    primary_color?: string;
    secondary_color?: string;
  } | null;
  highlights: SeasonHighlight[];
}

export interface SeasonHighlight {
  id: string;
  highlight_type: "photo" | "stat" | "milestone";
  title: string;
  description: string | null;
  photo_url: string | null;
  display_order: number;
}

/**
 * Get all seasons for the league history timeline
 */
export async function getLeagueTimeline(): Promise<{
  seasons: SeasonTimeline[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("seasons")
    .select(`
      id,
      name,
      start_date,
      end_date,
      status,
      season_summary,
      total_goals_scored,
      average_goals_per_game,
      photo_gallery_url,
      champion_team:teams!champion_team_id(id, name, short_name, logo_url, primary_color, secondary_color)
    `)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching league timeline:", error);
    return { seasons: [], error: error.message };
  }

  // Get highlights for each season
  const seasonsWithHighlights = await Promise.all(
    (data || []).map(async (season) => {
      const { highlights } = await getSeasonHighlights(season.id);
      return {
        ...season,
        highlights: highlights || [],
      };
    })
  );

  return { seasons: seasonsWithHighlights as SeasonTimeline[] };
}

/**
 * Get highlights for a specific season
 */
export async function getSeasonHighlights(seasonId: string): Promise<{
  highlights: SeasonHighlight[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("season_highlights")
    .select("*")
    .eq("season_id", seasonId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching season highlights:", error);
    return { highlights: [], error: error.message };
  }

  return { highlights: data as SeasonHighlight[] };
}

/**
 * Get detailed season information including top stats
 */
export async function getSeasonDetails(seasonId: string): Promise<{
  season: any;
  topScorers: any[];
  topGoalies: any[];
  finalStandings: any[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get season basic info
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select(`
      *,
      champion_team:teams!champion_team_id(id, name, short_name, logo_url, primary_color, secondary_color)
    `)
    .eq("id", seasonId)
    .single();

  if (seasonError || !season) {
    return {
      season: null,
      topScorers: [],
      topGoalies: [],
      finalStandings: [],
      error: seasonError?.message || "Season not found",
    };
  }

  // Get top 10 scorers
  const { data: topScorers } = await supabase
    .from("player_stats")
    .select(`
      player:profiles!player_id(id, full_name, avatar_url),
      team:teams!team_id(id, name, short_name, logo_url, primary_color, secondary_color),
      goals,
      assists,
      points,
      games_played
    `)
    .eq("season_id", seasonId)
    .order("points", { ascending: false })
    .order("goals", { ascending: false })
    .limit(10);

  // Get top 5 goalies
  const { data: topGoalies } = await supabase
    .from("goalie_stats")
    .select(`
      player:profiles!player_id(id, full_name, avatar_url),
      team:teams!team_id(id, name, short_name, logo_url, primary_color, secondary_color),
      wins,
      shutouts,
      goals_against_average,
      save_percentage
    `)
    .eq("season_id", seasonId)
    .order("save_percentage", { ascending: false })
    .order("wins", { ascending: false })
    .limit(5);

  // Get final standings
  const { data: finalStandings } = await supabase
    .from("team_standings")
    .select(`
      team:teams(id, name, short_name, logo_url, primary_color, secondary_color),
      wins,
      losses,
      ties,
      points,
      goals_for,
      goals_against
    `)
    .eq("season_id", seasonId)
    .order("points", { ascending: false })
    .order("wins", { ascending: false });

  return {
    season,
    topScorers: topScorers || [],
    topGoalies: topGoalies || [],
    finalStandings: finalStandings || [],
  };
}

/**
 * Calculate and update season stats (admin function)
 */
export async function calculateSeasonStats(seasonId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { success: false, error: "Only league owners can calculate season stats" };
  }

  try {
    // Call the database function
    const { error } = await supabase.rpc("calculate_season_stats", {
      season_uuid: seasonId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error calculating season stats:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update season summary (admin function)
 */
export async function updateSeasonSummary(
  seasonId: string,
  summary: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { success: false, error: "Only league owners can update season summaries" };
  }

  const { error } = await supabase
    .from("seasons")
    .update({ season_summary: summary })
    .eq("id", seasonId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add season highlight (admin function)
 */
export async function addSeasonHighlight(
  seasonId: string,
  highlight: {
    highlight_type: "photo" | "stat" | "milestone";
    title: string;
    description?: string;
    photo_url?: string;
    display_order?: number;
  }
): Promise<{
  success: boolean;
  highlightId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { success: false, error: "Only league owners can add highlights" };
  }

  // Get league_id from season
  const { data: season } = await supabase
    .from("seasons")
    .select("league_id")
    .eq("id", seasonId)
    .single();

  if (!season) {
    return { success: false, error: "Season not found" };
  }

  const { data, error } = await supabase
    .from("season_highlights")
    .insert({
      league_id: season.league_id,
      season_id: seasonId,
      ...highlight,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, highlightId: data.id };
}

/**
 * Delete season highlight (admin function)
 */
export async function deleteSeasonHighlight(highlightId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { success: false, error: "Only league owners can delete highlights" };
  }

  const { error } = await supabase
    .from("season_highlights")
    .delete()
    .eq("id", highlightId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
