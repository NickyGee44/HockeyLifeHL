// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/types/database";

export type ScheduleGenerationMethod = "random" | "ai";

export type ScheduleGenerationResult = {
  error?: string;
  success?: boolean;
  gamesCreated?: number;
};

/**
 * Generate a round-robin schedule for all teams with proper bye week handling
 * Each team plays every other team at least once, with bye weeks for odd number of teams
 */
function generateRoundRobinSchedule(
  teamIds: string[],
  totalGames: number,
  startDate: Date,
  location?: string
): Array<{
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
}> {
  const games: Array<{
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: Date;
  }> = [];

  const numTeams = teamIds.length;
  if (numTeams < 2) {
    return games;
  }

  // Calculate how many games can be played per week
  // With odd number of teams, we can play (numTeams - 1) / 2 games per week (one team on bye)
  // With even number of teams, we can play numTeams / 2 games per week
  const maxGamesPerWeek = numTeams % 2 === 0 ? numTeams / 2 : (numTeams - 1) / 2;
  
  // Calculate number of weeks needed
  const weeks = Math.ceil(totalGames / maxGamesPerWeek);
  const gamesPerWeek = Math.ceil(totalGames / weeks);

  // Generate round-robin matchups
  const matchups: Array<{ home: string; away: string }> = [];
  
  // Create all possible unique matchups (each pair only once)
  for (let i = 0; i < numTeams; i++) {
    for (let j = i + 1; j < numTeams; j++) {
      matchups.push({ home: teamIds[i], away: teamIds[j] });
    }
  }

  // If we need more games than unique matchups, add reverse matchups
  if (totalGames > matchups.length) {
    const reverseMatchups: Array<{ home: string; away: string }> = [];
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        reverseMatchups.push({ home: teamIds[j], away: teamIds[i] });
      }
    }
    matchups.push(...reverseMatchups);
  }

  // Shuffle matchups for randomness
  for (let i = matchups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [matchups[i], matchups[j]] = [matchups[j], matchups[i]];
  }

  // Take only the number of games needed
  const selectedMatchups = matchups.slice(0, totalGames);

  // Distribute games across weeks with proper bye week handling
  let currentDate = new Date(startDate);
  let gamesThisWeek = 0;
  let teamsUsedThisWeek = new Set<string>();

  for (const matchup of selectedMatchups) {
    // Check if either team already has a game this week (for bye week logic)
    // If odd number of teams, ensure we don't exceed max games per week
    if (gamesThisWeek >= maxGamesPerWeek || 
        teamsUsedThisWeek.has(matchup.home) || 
        teamsUsedThisWeek.has(matchup.away)) {
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
      gamesThisWeek = 0;
      teamsUsedThisWeek.clear();
    }

    // Schedule game on Saturday evening (7 PM) by default
    const gameDate = new Date(currentDate);
    // Make it Saturday (day 6 of week, where 0 = Sunday)
    const dayOfWeek = gameDate.getDay();
    const daysUntilSaturday = dayOfWeek === 0 ? 6 : (6 - dayOfWeek);
    gameDate.setDate(gameDate.getDate() + daysUntilSaturday);
    gameDate.setHours(19, 0, 0, 0); // 7 PM

    games.push({
      homeTeamId: matchup.home,
      awayTeamId: matchup.away,
      scheduledAt: gameDate,
    });

    gamesThisWeek++;
    teamsUsedThisWeek.add(matchup.home);
    teamsUsedThisWeek.add(matchup.away);
    
    // If we've filled the week, move to next week
    if (gamesThisWeek >= maxGamesPerWeek) {
      currentDate.setDate(currentDate.getDate() + 7);
      gamesThisWeek = 0;
      teamsUsedThisWeek.clear();
    }
  }

  return games;
}

/**
 * Generate schedule using AI (for future enhancement)
 * Currently falls back to random generation
 */
async function generateAISchedule(
  seasonId: string,
  teamIds: string[],
  totalGames: number,
  startDate: Date,
  location?: string
): Promise<Array<{
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
}>> {
  // TODO: Implement AI-based schedule generation using OpenAI
  // Could consider team strength, previous matchups, venue availability, etc.
  // For now, use random generation
  return generateRoundRobinSchedule(teamIds, totalGames, startDate, location);
}

/**
 * Generate and save schedule for a season
 */
export async function generateSeasonSchedule(
  seasonId: string,
  method: ScheduleGenerationMethod = "random",
  location?: string
): Promise<ScheduleGenerationResult> {
  const supabase = await createClient();

  // Get season details
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .single();

  if (seasonError || !season) {
    return { error: "Season not found" };
  }

  if (!season.total_games) {
    return { error: "Season must have total_games specified before generating schedule" };
  }

  // Check if schedule already generated
  if (season.schedule_generated) {
    return { error: "Schedule has already been generated for this season" };
  }

  // Get all teams
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id");

  if (teamsError || !teams || teams.length < 2) {
    return { error: "Need at least 2 teams to generate a schedule" };
  }

  const teamIds = teams.map((t) => t.id);
  const startDate = new Date(season.start_date);
  startDate.setDate(startDate.getDate() + 1); // Start day after season start

  // Generate schedule
  let games: Array<{
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: Date;
  }>;

  if (method === "ai") {
    games = await generateAISchedule(seasonId, teamIds, season.total_games, startDate, location);
  } else {
    games = generateRoundRobinSchedule(teamIds, season.total_games, startDate, location);
  }

  // Insert games into database
  const gamesToInsert = games.map((game) => ({
    season_id: seasonId,
    home_team_id: game.homeTeamId,
    away_team_id: game.awayTeamId,
    scheduled_at: game.scheduledAt.toISOString(),
    location: location || null,
    status: "scheduled" as const,
    home_score: 0,
    away_score: 0,
    home_captain_verified: false,
    away_captain_verified: false,
  }));

  const { error: insertError } = await supabase
    .from("games")
    .insert(gamesToInsert);

  if (insertError) {
    console.error("Error inserting games:", insertError);
    return { error: insertError.message };
  }

  // Mark schedule as generated
  const { error: updateError } = await supabase
    .from("seasons")
    .update({ schedule_generated: true })
    .eq("id", seasonId);

  if (updateError) {
    console.error("Error updating season:", updateError);
    return { error: updateError.message };
  }

  return {
    success: true,
    gamesCreated: games.length,
  };
}
