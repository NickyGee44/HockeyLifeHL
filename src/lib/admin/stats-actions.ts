"use server";

import { createClient } from "@/lib/supabase/server";

export async function getLeagueStats(): Promise<{
  totalPlayers: number;
  totalTeams: number;
  gamesPlayed: number;
  totalGoals: number;
  activeSuspensions: number;
  activeSeason: {
    id: string;
    name: string;
    status: string;
    current_game_count: number;
    games_per_cycle: number;
  } | null;
  pendingVerifications: Array<{
    id: string;
    scheduled_at: string;
    home_score: number | null;
    away_score: number | null;
    home_captain_verified: boolean | null;
    away_captain_verified: boolean | null;
    home_team: { name: string; short_name: string } | null;
    away_team: { name: string; short_name: string } | null;
  }>;
}> {
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
  let pendingVerifications: Array<{
    id: string;
    scheduled_at: string;
    home_score: number | null;
    away_score: number | null;
    home_captain_verified: boolean | null;
    away_captain_verified: boolean | null;
    home_team: { name: string; short_name: string } | null;
    away_team: { name: string; short_name: string } | null;
  }> = [];
  if (activeSeason) {
    const { data: games } = await supabase
      .from("games")
      .select("id, scheduled_at, home_score, away_score, home_captain_verified, away_captain_verified, home_team_id, away_team_id")
      .eq("season_id", activeSeason.id)
      .eq("status", "completed")
      .or("home_captain_verified.eq.false,away_captain_verified.eq.false")
      .order("scheduled_at", { ascending: false })
      .limit(10);

    // Fetch team names separately
    if (games) {
      const gamesWithTeams = await Promise.all(
        games.map(async (game) => {
          const { data: homeTeam } = await supabase
            .from("teams")
            .select("name, short_name")
            .eq("id", game.home_team_id)
            .single();

          const { data: awayTeam } = await supabase
            .from("teams")
            .select("name, short_name")
            .eq("id", game.away_team_id)
            .single();

          return {
            id: game.id,
            scheduled_at: game.scheduled_at,
            home_score: game.home_score,
            away_score: game.away_score,
            home_captain_verified: game.home_captain_verified,
            away_captain_verified: game.away_captain_verified,
            home_team: homeTeam,
            away_team: awayTeam,
          };
        })
      );
      pendingVerifications = gamesWithTeams;
    }
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
