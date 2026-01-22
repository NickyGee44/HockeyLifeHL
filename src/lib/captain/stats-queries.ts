// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Get detailed roster with stats for captain dashboard
export async function getRosterWithStats(teamId: string, seasonId: string) {
  const supabase = await createClient();

  // Get roster with player details including shot_hand
  const { data: roster, error: rosterError } = await supabase
    .from("team_rosters")
    .select(`
      id,
      is_goalie,
      player:profiles!team_rosters_player_id_fkey(
        id, 
        full_name, 
        avatar_url, 
        jersey_number, 
        position,
        shot_hand
      )
    `)
    .eq("team_id", teamId)
    .eq("season_id", seasonId);

  if (rosterError) {
    console.error("Error fetching roster:", rosterError);
    return { roster: [] };
  }

  // Ensure captain is always included in roster
  const { data: team } = await supabase
    .from("teams")
    .select(`
      captain_id,
      captain:profiles!teams_captain_id_fkey(
        id, 
        full_name, 
        avatar_url, 
        jersey_number, 
        position,
        shot_hand
      )
    `)
    .eq("id", teamId)
    .single();

  let finalRoster = roster || [];
  
  // Check if captain is missing from roster and add them
  if (team?.captain_id && team?.captain) {
    const captainInRoster = finalRoster.some(r => r.player?.id === team.captain_id);
    if (!captainInRoster) {
      // Captain is missing - add them to the display roster
      // Also add them to the actual roster table for data consistency
      const { data: newRosterEntry } = await supabase
        .from("team_rosters")
        .upsert({
          team_id: teamId,
          player_id: team.captain_id,
          season_id: seasonId,
          is_goalie: team.captain.position === 'G',
        }, {
          onConflict: "player_id,season_id",
        })
        .select(`
          id,
          is_goalie,
          player:profiles!team_rosters_player_id_fkey(
            id, 
            full_name, 
            avatar_url, 
            jersey_number, 
            position,
            shot_hand
          )
        `)
        .single();

      if (newRosterEntry) {
        finalRoster = [...finalRoster, newRosterEntry];
      } else {
        // Fallback: add captain to display even if DB insert fails
        finalRoster = [...finalRoster, {
          id: `captain-${team.captain_id}`,
          is_goalie: team.captain.position === 'G',
          player: team.captain,
        }];
      }
    }
  }

  // Get total games played by team this season (verified games only)
  const { data: teamGames } = await supabase
    .from("games")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .eq("home_captain_verified", true)
    .eq("away_captain_verified", true)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

  const totalTeamGames = teamGames?.length || 0;
  const gameIds = teamGames?.map(g => g.id) || [];

  // Get player stats for all roster players this season
  const playerIds = finalRoster.map(r => r.player?.id).filter(Boolean);
  
  let playerStatsMap: Record<string, { goals: number; assists: number; gamesPlayed: number }> = {};
  
  if (playerIds.length > 0 && gameIds.length > 0) {
    const { data: playerStats } = await supabase
      .from("player_stats")
      .select("player_id, goals, assists, game_id")
      .eq("team_id", teamId)
      .eq("season_id", seasonId)
      .in("game_id", gameIds);

    // Aggregate stats by player
    (playerStats || []).forEach(stat => {
      if (!playerStatsMap[stat.player_id]) {
        playerStatsMap[stat.player_id] = { goals: 0, assists: 0, gamesPlayed: 0 };
      }
      playerStatsMap[stat.player_id].goals += stat.goals || 0;
      playerStatsMap[stat.player_id].assists += stat.assists || 0;
    });

    // Count games played per player (unique game appearances)
    const gamesPerPlayer: Record<string, Set<string>> = {};
    (playerStats || []).forEach(stat => {
      if (!gamesPerPlayer[stat.player_id]) {
        gamesPerPlayer[stat.player_id] = new Set();
      }
      gamesPerPlayer[stat.player_id].add(stat.game_id);
    });
    
    Object.keys(gamesPerPlayer).forEach(playerId => {
      if (playerStatsMap[playerId]) {
        playerStatsMap[playerId].gamesPlayed = gamesPerPlayer[playerId].size;
      }
    });
  }

  // Get goalie stats for goalies
  let goalieStatsMap: Record<string, { saves: number; goalsAgainst: number; gamesPlayed: number }> = {};
  
  const goalieIds = finalRoster.filter(r => r.is_goalie).map(r => r.player?.id).filter(Boolean);
  
  if (goalieIds.length > 0 && gameIds.length > 0) {
    const { data: goalieStats } = await supabase
      .from("goalie_stats")
      .select("player_id, saves, goals_against, game_id")
      .eq("team_id", teamId)
      .eq("season_id", seasonId)
      .in("game_id", gameIds);

    // Aggregate goalie stats
    (goalieStats || []).forEach(stat => {
      if (!goalieStatsMap[stat.player_id]) {
        goalieStatsMap[stat.player_id] = { saves: 0, goalsAgainst: 0, gamesPlayed: 0 };
      }
      goalieStatsMap[stat.player_id].saves += stat.saves || 0;
      goalieStatsMap[stat.player_id].goalsAgainst += stat.goals_against || 0;
    });

    // Count games played per goalie
    const gamesPerGoalie: Record<string, Set<string>> = {};
    (goalieStats || []).forEach(stat => {
      if (!gamesPerGoalie[stat.player_id]) {
        gamesPerGoalie[stat.player_id] = new Set();
      }
      gamesPerGoalie[stat.player_id].add(stat.game_id);
    });
    
    Object.keys(gamesPerGoalie).forEach(goalieId => {
      if (goalieStatsMap[goalieId]) {
        goalieStatsMap[goalieId].gamesPlayed = gamesPerGoalie[goalieId].size;
      }
    });
  }

  // Get upcoming game for attendance tracking
  const now = new Date().toISOString();
  const { data: upcomingGame } = await supabase
    .from("games")
    .select("id, scheduled_at, home_team_id, away_team_id")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .gte("scheduled_at", now)
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();

  // Get availability for upcoming game
  let availabilityMap: Record<string, { status: string; checkedInAt: string | null }> = {};
  
  if (upcomingGame) {
    const { data: availability } = await supabase
      .from("player_availability")
      .select("player_id, status, checked_in_at")
      .eq("game_id", upcomingGame.id)
      .eq("team_id", teamId);

    (availability || []).forEach(a => {
      availabilityMap[a.player_id] = {
        status: a.status,
        checkedInAt: a.checked_in_at,
      };
    });
  }

  // Combine all data
  const rosterWithStats = finalRoster.map(entry => {
    const playerId = entry.player?.id;
    const stats = playerStatsMap[playerId] || { goals: 0, assists: 0, gamesPlayed: 0 };
    const goalieStats = goalieStatsMap[playerId] || null;
    const availability = availabilityMap[playerId] || null;
    
    const attendanceRate = totalTeamGames > 0 
      ? Math.round((stats.gamesPlayed / totalTeamGames) * 100) 
      : 0;

    return {
      ...entry,
      stats: {
        goals: stats.goals,
        assists: stats.assists,
        points: stats.goals + stats.assists,
        gamesPlayed: stats.gamesPlayed,
        attendanceRate,
      },
      goalieStats: entry.is_goalie ? goalieStats : null,
      availability,
    };
  });

  return { 
    roster: rosterWithStats, 
    totalTeamGames,
    upcomingGame: upcomingGame ? {
      id: upcomingGame.id,
      scheduledAt: upcomingGame.scheduled_at,
    } : null,
  };
}

// Set player availability (captain can set for any player on their team)
export async function setPlayerAvailabilityAsCaptain(
  gameId: string,
  playerId: string,
  teamId: string,
  status: "available" | "unavailable" | "maybe"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify user is captain of this team or owner
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
      return { error: "Only the team captain can update player availability" };
    }
  }

  // Get game details
  const { data: game } = await supabase
    .from("games")
    .select("season_id")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  // Upsert availability
  const { error } = await supabase
    .from("player_availability")
    .upsert({
      player_id: playerId,
      team_id: teamId,
      season_id: game.season_id,
      game_id: gameId,
      status: status,
      checked_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "player_id,game_id",
    });

  if (error) {
    console.error("Error setting player availability:", error);
    return { error: error.message };
  }

  revalidatePath("/captain");
  return { success: true };
}

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
