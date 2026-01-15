// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";

export async function getLeagueStats() {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name, status, current_game_count, games_per_cycle")
    .in("status", ["active", "playoffs"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  // Get total players
  const { count: totalPlayers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Get total teams
  const { count: totalTeams } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true });

  // Get games played (completed and verified)
  let gamesPlayed = 0;
  let totalGoals = 0;
  if (activeSeason) {
    const { data: games } = await supabase
      .from("games")
      .select("home_score, away_score")
      .eq("season_id", activeSeason.id)
      .eq("status", "completed")
      .eq("home_captain_verified", true)
      .eq("away_captain_verified", true);

    gamesPlayed = games?.length || 0;
    totalGoals = games?.reduce((sum, g) => sum + (g.home_score || 0) + (g.away_score || 0), 0) || 0;
  }

  // Get active suspensions
  const { count: activeSuspensions } = await supabase
    .from("suspensions")
    .select("*", { count: "exact", head: true })
    .gt("games_remaining", 0);

  // Get pending verifications
  let pendingVerifications: any[] = [];
  if (activeSeason) {
    const { data: games } = await supabase
      .from("games")
      .select(`
        id,
        scheduled_at,
        home_score,
        away_score,
        home_captain_verified,
        away_captain_verified,
        home_team:teams!games_home_team_id_fkey(name, short_name),
        away_team:teams!games_away_team_id_fkey(name, short_name)
      `)
      .eq("season_id", activeSeason.id)
      .eq("status", "completed")
      .or("home_captain_verified.eq.false,away_captain_verified.eq.false")
      .order("scheduled_at", { ascending: false })
      .limit(10);

    pendingVerifications = games || [];
  }

  return {
    totalPlayers: totalPlayers || 0,
    totalTeams: totalTeams || 0,
    gamesPlayed,
    totalGoals,
    activeSuspensions: activeSuspensions || 0,
    activeSeason,
    pendingVerifications,
  };
}
