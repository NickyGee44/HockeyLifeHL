// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PlayoffFormat = "none" | "single_elimination" | "double_elimination" | "round_robin";

export type PlayoffGenerationResult = {
  error?: string;
  success?: boolean;
  gamesCreated?: number;
  bracket?: PlayoffBracket;
};

export type PlayoffBracket = {
  format: PlayoffFormat;
  rounds: PlayoffRound[];
  teams: PlayoffTeam[];
};

export type PlayoffRound = {
  name: string;
  games: PlayoffGame[];
};

export type PlayoffGame = {
  id: string;
  homeTeam: PlayoffTeam | null;
  awayTeam: PlayoffTeam | null;
  homeSeed: number;
  awaySeed: number;
  scheduledAt: string | null;
  status: string;
  homeScore: number;
  awayScore: number;
  winner: PlayoffTeam | null;
};

export type PlayoffTeam = {
  id: string;
  name: string;
  shortName: string;
  seed: number;
  primaryColor: string | null;
  logoUrl: string | null;
};

// Check if current user is an owner
async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", isOwner: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Not authorized - owner access required", isOwner: false };
  }

  return { isOwner: true, userId: user.id };
}

/**
 * Get team standings for seeding
 */
async function getTeamStandings(seasonId: string) {
  const supabase = await createClient();
  
  // Get all teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_name, primary_color, logo_url");

  if (!teams || teams.length === 0) {
    return [];
  }

  // Get all verified completed games for this season
  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score")
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .eq("home_captain_verified", true)
    .eq("away_captain_verified", true);

  // Calculate standings
  const standings = teams.map(team => {
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    (games || []).forEach(game => {
      if (game.home_team_id === team.id) {
        goalsFor += game.home_score || 0;
        goalsAgainst += game.away_score || 0;
        if ((game.home_score || 0) > (game.away_score || 0)) wins++;
        else if ((game.home_score || 0) < (game.away_score || 0)) losses++;
        else ties++;
      } else if (game.away_team_id === team.id) {
        goalsFor += game.away_score || 0;
        goalsAgainst += game.home_score || 0;
        if ((game.away_score || 0) > (game.home_score || 0)) wins++;
        else if ((game.away_score || 0) < (game.home_score || 0)) losses++;
        else ties++;
      }
    });

    const points = wins * 2 + ties;
    const goalDiff = goalsFor - goalsAgainst;

    return {
      team,
      wins,
      losses,
      ties,
      points,
      goalsFor,
      goalsAgainst,
      goalDiff,
    };
  });

  // Sort by points (desc), then goal differential (desc), then goals for (desc)
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });

  return standings;
}

/**
 * Generate single elimination bracket
 * Standard bracket: 1v8, 4v5, 2v7, 3v6 (or adjusted for fewer teams)
 */
function generateSingleEliminationBracket(
  teams: Array<{ team: any; seed: number }>,
  startDate: Date
): { rounds: PlayoffRound[]; games: any[] } {
  const numTeams = teams.length;
  const rounds: PlayoffRound[] = [];
  const gamesToCreate: any[] = [];
  
  // Determine number of rounds needed
  const numRounds = Math.ceil(Math.log2(numTeams));
  const firstRoundSize = Math.pow(2, numRounds);
  
  // Standard bracket seeding for first round
  // 1v8, 4v5, 2v7, 3v6 pattern
  const getFirstRoundMatchups = (size: number): Array<[number, number]> => {
    if (size === 2) return [[1, 2]];
    if (size === 4) return [[1, 4], [2, 3]];
    if (size === 8) return [[1, 8], [4, 5], [2, 7], [3, 6]];
    // For other sizes, create standard bracket
    const matchups: Array<[number, number]> = [];
    for (let i = 0; i < size / 2; i++) {
      matchups.push([i + 1, size - i]);
    }
    return matchups;
  };

  const matchups = getFirstRoundMatchups(Math.min(numTeams, 8));
  
  // Round names
  const roundNames: Record<number, string> = {
    1: numRounds === 1 ? "Finals" : numRounds === 2 ? "Semifinals" : "First Round",
    2: numRounds === 2 ? "Finals" : numRounds === 3 ? "Semifinals" : "Second Round",
    3: numRounds === 3 ? "Finals" : "Conference Finals",
    4: "Finals",
  };

  // First round
  const firstRoundGames: PlayoffGame[] = [];
  let gameDate = new Date(startDate);

  matchups.forEach((matchup, index) => {
    const [homeSeed, awaySeed] = matchup;
    const homeTeam = teams.find(t => t.seed === homeSeed);
    const awayTeam = teams.find(t => t.seed === awaySeed);

    // If away team doesn't exist (bye), home team auto-advances
    if (!awayTeam && homeTeam) {
      // No game needed - home team has a bye
      return;
    }

    if (homeTeam && awayTeam) {
      const gameId = `playoff-r1-g${index + 1}`;
      
      // Stagger games (2 per day)
      if (index > 0 && index % 2 === 0) {
        gameDate.setDate(gameDate.getDate() + 1);
      }
      const scheduleTime = new Date(gameDate);
      scheduleTime.setHours(index % 2 === 0 ? 18 : 20, 0, 0, 0);

      gamesToCreate.push({
        home_team_id: homeTeam.team.id,
        away_team_id: awayTeam.team.id,
        scheduled_at: scheduleTime.toISOString(),
        status: "scheduled",
        home_score: 0,
        away_score: 0,
      });

      firstRoundGames.push({
        id: gameId,
        homeTeam: {
          id: homeTeam.team.id,
          name: homeTeam.team.name,
          shortName: homeTeam.team.short_name,
          seed: homeSeed,
          primaryColor: homeTeam.team.primary_color,
          logoUrl: homeTeam.team.logo_url,
        },
        awayTeam: {
          id: awayTeam.team.id,
          name: awayTeam.team.name,
          shortName: awayTeam.team.short_name,
          seed: awaySeed,
          primaryColor: awayTeam.team.primary_color,
          logoUrl: awayTeam.team.logo_url,
        },
        homeSeed,
        awaySeed,
        scheduledAt: scheduleTime.toISOString(),
        status: "scheduled",
        homeScore: 0,
        awayScore: 0,
        winner: null,
      });
    }
  });

  if (firstRoundGames.length > 0) {
    rounds.push({
      name: roundNames[1] || "Round 1",
      games: firstRoundGames,
    });
  }

  // Add placeholder rounds for subsequent rounds
  let remainingTeams = Math.ceil(numTeams / 2);
  let roundNum = 2;
  
  while (remainingTeams > 1) {
    const numGames = Math.floor(remainingTeams / 2);
    const roundGames: PlayoffGame[] = [];
    
    for (let i = 0; i < numGames; i++) {
      roundGames.push({
        id: `playoff-r${roundNum}-g${i + 1}`,
        homeTeam: null,
        awayTeam: null,
        homeSeed: 0,
        awaySeed: 0,
        scheduledAt: null,
        status: "pending",
        homeScore: 0,
        awayScore: 0,
        winner: null,
      });
    }
    
    rounds.push({
      name: roundNames[roundNum] || `Round ${roundNum}`,
      games: roundGames,
    });
    
    remainingTeams = Math.ceil(remainingTeams / 2);
    roundNum++;
  }

  return { rounds, games: gamesToCreate };
}

/**
 * Generate round robin playoff bracket
 * All teams play each other once
 */
function generateRoundRobinBracket(
  teams: Array<{ team: any; seed: number }>,
  startDate: Date
): { rounds: PlayoffRound[]; games: any[] } {
  const gamesToCreate: any[] = [];
  const rounds: PlayoffRound[] = [];
  const allGames: PlayoffGame[] = [];
  
  let gameDate = new Date(startDate);
  let gameIndex = 0;

  // Generate all matchups
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const homeTeam = teams[i];
      const awayTeam = teams[j];

      // Stagger games
      if (gameIndex > 0 && gameIndex % 3 === 0) {
        gameDate.setDate(gameDate.getDate() + 1);
      }
      const scheduleTime = new Date(gameDate);
      scheduleTime.setHours(18 + (gameIndex % 3) * 2, 0, 0, 0);

      gamesToCreate.push({
        home_team_id: homeTeam.team.id,
        away_team_id: awayTeam.team.id,
        scheduled_at: scheduleTime.toISOString(),
        status: "scheduled",
        home_score: 0,
        away_score: 0,
      });

      allGames.push({
        id: `playoff-rr-g${gameIndex + 1}`,
        homeTeam: {
          id: homeTeam.team.id,
          name: homeTeam.team.name,
          shortName: homeTeam.team.short_name,
          seed: homeTeam.seed,
          primaryColor: homeTeam.team.primary_color,
          logoUrl: homeTeam.team.logo_url,
        },
        awayTeam: {
          id: awayTeam.team.id,
          name: awayTeam.team.name,
          shortName: awayTeam.team.short_name,
          seed: awayTeam.seed,
          primaryColor: awayTeam.team.primary_color,
          logoUrl: awayTeam.team.logo_url,
        },
        homeSeed: homeTeam.seed,
        awaySeed: awayTeam.seed,
        scheduledAt: scheduleTime.toISOString(),
        status: "scheduled",
        homeScore: 0,
        awayScore: 0,
        winner: null,
      });

      gameIndex++;
    }
  }

  rounds.push({
    name: "Round Robin",
    games: allGames,
  });

  return { rounds, games: gamesToCreate };
}

/**
 * Start playoffs for a season
 */
export async function startPlayoffs(
  seasonId: string,
  teamsToInclude?: number // Number of teams to include (e.g., top 4, top 6)
): Promise<PlayoffGenerationResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Get season
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .single();

  if (seasonError || !season) {
    return { error: "Season not found" };
  }

  if (season.status === "completed") {
    return { error: "Season is already completed" };
  }
  
  // Allow starting playoffs from active or draft status
  // (endSeason will call this automatically)

  const playoffFormat = (season.playoff_format || "round_robin") as PlayoffFormat;
  
  if (playoffFormat === "none") {
    return { error: "This season has no playoffs configured" };
  }

  // Get standings
  const standings = await getTeamStandings(seasonId);
  
  if (standings.length < 2) {
    return { error: "Need at least 2 teams with games played to start playoffs" };
  }

  // Determine number of teams to include
  const numTeams = teamsToInclude || Math.min(standings.length, 8);
  const playoffTeams = standings.slice(0, numTeams).map((s, index) => ({
    team: s.team,
    seed: index + 1,
  }));

  // Generate bracket based on format
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 3); // Start playoffs in 3 days
  
  let result: { rounds: PlayoffRound[]; games: any[] };
  
  if (playoffFormat === "single_elimination") {
    result = generateSingleEliminationBracket(playoffTeams, startDate);
  } else if (playoffFormat === "double_elimination") {
    // For now, use single elimination (double elim is complex)
    result = generateSingleEliminationBracket(playoffTeams, startDate);
  } else {
    // Round robin
    result = generateRoundRobinBracket(playoffTeams, startDate);
  }

  // Insert playoff games
  const gamesToInsert = result.games.map(game => ({
    ...game,
    season_id: seasonId,
    location: null,
    home_captain_verified: false,
    away_captain_verified: false,
  }));

  if (gamesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("games")
      .insert(gamesToInsert);

    if (insertError) {
      console.error("Error inserting playoff games:", insertError);
      return { error: insertError.message };
    }
  }

  // Update season status to playoffs
  const { error: updateError } = await supabase
    .from("seasons")
    .update({ status: "playoffs" })
    .eq("id", seasonId);

  if (updateError) {
    console.error("Error updating season status:", updateError);
    return { error: updateError.message };
  }

  revalidatePath("/admin/seasons");
  revalidatePath("/standings");
  revalidatePath("/schedule");

  return {
    success: true,
    gamesCreated: gamesToInsert.length,
    bracket: {
      format: playoffFormat,
      rounds: result.rounds,
      teams: playoffTeams.map(t => ({
        id: t.team.id,
        name: t.team.name,
        shortName: t.team.short_name,
        seed: t.seed,
        primaryColor: t.team.primary_color,
        logoUrl: t.team.logo_url,
      })),
    },
  };
}

/**
 * Get playoff bracket for a season
 */
export async function getPlayoffBracket(seasonId: string): Promise<{
  error?: string;
  bracket?: PlayoffBracket;
}> {
  const supabase = await createClient();

  // Get season
  const { data: season } = await supabase
    .from("seasons")
    .select("playoff_format, status")
    .eq("id", seasonId)
    .single();

  if (!season || season.status !== "playoffs") {
    return { error: "Season is not in playoffs" };
  }

  // Get playoff games
  const { data: games } = await supabase
    .from("games")
    .select(`
      id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      status,
      scheduled_at,
      home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, logo_url)
    `)
    .eq("season_id", seasonId)
    .order("scheduled_at", { ascending: true });

  // Filter to only playoff games (scheduled after season went to playoffs)
  // For now, return all games as playoff games
  const playoffGames = (games || []).map(game => ({
    id: game.id,
    homeTeam: game.home_team ? {
      id: game.home_team.id,
      name: game.home_team.name,
      shortName: game.home_team.short_name,
      seed: 0,
      primaryColor: game.home_team.primary_color,
      logoUrl: game.home_team.logo_url,
    } : null,
    awayTeam: game.away_team ? {
      id: game.away_team.id,
      name: game.away_team.name,
      shortName: game.away_team.short_name,
      seed: 0,
      primaryColor: game.away_team.primary_color,
      logoUrl: game.away_team.logo_url,
    } : null,
    homeSeed: 0,
    awaySeed: 0,
    scheduledAt: game.scheduled_at,
    status: game.status,
    homeScore: game.home_score,
    awayScore: game.away_score,
    winner: null,
  }));

  return {
    bracket: {
      format: (season.playoff_format || "round_robin") as PlayoffFormat,
      rounds: [{ name: "Playoffs", games: playoffGames }],
      teams: [],
    },
  };
}
