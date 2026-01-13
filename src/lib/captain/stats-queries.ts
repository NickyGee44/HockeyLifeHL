"use server";

import { createClient } from "@/lib/supabase/server";

// Get pending stat verifications count for a captain's team
export async function getPendingVerificationsCount(teamId: string, seasonId: string) {
  const supabase = await createClient();

  // Get games where this team needs to verify stats
  const { data: games, error } = await supabase
    .from("games")
    .select("id, home_team_id, away_team_id, home_captain_verified, away_captain_verified, status")
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

  if (error) {
    console.error("Error fetching pending verifications:", error);
    return { count: 0 };
  }

  // Count games where this team hasn't verified yet
  const pendingCount = (games || []).filter((game) => {
    const isHomeTeam = game.home_team_id === teamId;
    if (isHomeTeam) {
      // Home team needs to verify if stats are entered but not verified
      return !game.home_captain_verified;
    } else {
      // Away team needs to verify if stats are entered but not verified
      return !game.away_captain_verified;
    }
  }).length;

  return { count: pendingCount };
}

// Get team stats summary for captain dashboard
export async function getTeamStatsSummary(teamId: string, seasonId: string) {
  const supabase = await createClient();

  // Get team's completed games
  const { data: games } = await supabase
    .from("games")
    .select("home_score, away_score, home_team_id, away_team_id")
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .eq("home_captain_verified", true)
    .eq("away_captain_verified", true)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  (games || []).forEach((game) => {
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
    wins,
    losses,
    ties,
    goalsFor,
    goalsAgainst,
    points: wins * 2 + ties,
  };
}
