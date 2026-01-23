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
 * Generate a round-robin schedule for all teams with customizable days and times
 * Each team plays the configured number of games (totalGamesPerTeam)
 */
function generateRoundRobinSchedule(
  teamIds: string[],
  totalGamesPerTeam: number,
  startDate: Date,
  gameDays: string[],
  gameTimes: string[],
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

  // Calculate total matchups needed (each game involves 2 teams)
  // If each team plays totalGamesPerTeam games, total matchups = (numTeams * totalGamesPerTeam) / 2
  const totalMatchups = Math.floor((numTeams * totalGamesPerTeam) / 2);

  // Generate matchups ensuring each team plays exactly totalGamesPerTeam games
  const matchups: Array<{ home: string; away: string }> = [];
  const teamGameCounts = new Map<string, number>();
  teamIds.forEach(id => teamGameCounts.set(id, 0));
  
  // Keep generating matchups until all teams have their required games
  let attempts = 0;
  const maxAttempts = 10000; // Safety limit
  
  while (matchups.length < totalMatchups && attempts < maxAttempts) {
    attempts++;
    
    // Find the team with the fewest games
    let minGames = totalGamesPerTeam;
    let teamWithFewest: string | null = null;
    
    for (const [teamId, count] of teamGameCounts.entries()) {
      if (count < minGames) {
        minGames = count;
        teamWithFewest = teamId;
      }
    }
    
    if (!teamWithFewest || minGames >= totalGamesPerTeam) {
      // All teams have reached their limit
      break;
    }
    
    // Find an opponent for this team (prefer team with fewer games)
    let bestOpponent: string | null = null;
    let bestOpponentGames = totalGamesPerTeam;
    
    for (const opponentId of teamIds) {
      if (opponentId === teamWithFewest) continue;
      
      const opponentGames = teamGameCounts.get(opponentId) || 0;
      if (opponentGames < totalGamesPerTeam && opponentGames < bestOpponentGames) {
        bestOpponent = opponentId;
        bestOpponentGames = opponentGames;
      }
    }
    
    if (!bestOpponent) {
      // Can't find a valid opponent, try next team
      teamGameCounts.set(teamWithFewest, totalGamesPerTeam); // Mark as done
      continue;
    }
    
    // Alternate home/away to balance
    const teamFewestGames = teamGameCounts.get(teamWithFewest) || 0;
    const isHomeGame = teamFewestGames % 2 === 0; // Alternate home/away
    
    matchups.push({
      home: isHomeGame ? teamWithFewest : bestOpponent,
      away: isHomeGame ? bestOpponent : teamWithFewest,
    });
    
    teamGameCounts.set(teamWithFewest, teamFewestGames + 1);
    teamGameCounts.set(bestOpponent, (teamGameCounts.get(bestOpponent) || 0) + 1);
  }
  
  // Log final game counts for debugging
  console.log("Schedule generation summary:");
  console.log(`  Total matchups created: ${matchups.length} (target: ${totalMatchups})`);
  teamIds.forEach(teamId => {
    console.log(`  Team ${teamId}: ${teamGameCounts.get(teamId)} games`);
  });

  // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
  const dayNameToNumber: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  const gameDayNumbers = gameDays.map(day => dayNameToNumber[day] || 1).sort();
  
  // Create a schedule slot iterator (week -> day -> time slot)
  let weekOffset = 0;
  let dayIndex = 0;
  let timeIndex = 0;
  
  // Track which teams are playing in each week/day/time slot to avoid conflicts
  const slotTeams = new Map<string, Set<string>>(); // key: "week-day-time" -> Set of team IDs
  
  for (const matchup of matchups) {
    let scheduled = false;
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loops
    
    while (!scheduled && attempts < maxAttempts) {
      attempts++;
      
      // Calculate the date for this slot
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + (weekOffset * 7));
      
      // Find the next occurrence of the target game day
      const targetDay = gameDayNumbers[dayIndex];
      const currentDay = currentDate.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      currentDate.setDate(currentDate.getDate() + daysUntilTarget);
      
      // Set the time
      const [hours, minutes] = gameTimes[timeIndex].split(':').map(Number);
      currentDate.setHours(hours, minutes, 0, 0);
      
      // Check if either team is already playing in this slot
      const slotKey = `${weekOffset}-${dayIndex}-${timeIndex}`;
      const teamsInSlot = slotTeams.get(slotKey) || new Set();
      
      if (!teamsInSlot.has(matchup.home) && !teamsInSlot.has(matchup.away)) {
        // Slot is available!
        games.push({
          homeTeamId: matchup.home,
          awayTeamId: matchup.away,
          scheduledAt: currentDate,
        });
        
        teamsInSlot.add(matchup.home);
        teamsInSlot.add(matchup.away);
        slotTeams.set(slotKey, teamsInSlot);
        scheduled = true;
      }
      
      // Move to next slot
      timeIndex++;
      if (timeIndex >= gameTimes.length) {
        timeIndex = 0;
        dayIndex++;
        if (dayIndex >= gameDayNumbers.length) {
          dayIndex = 0;
          weekOffset++;
        }
      }
    }
    
    if (!scheduled) {
      console.warn(`Could not schedule matchup ${matchup.home} vs ${matchup.away} after ${maxAttempts} attempts`);
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
  gameDays: string[],
  gameTimes: string[],
  location?: string
): Promise<Array<{
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
}>> {
  // TODO: Implement AI-based schedule generation using OpenAI
  // Could consider team strength, previous matchups, venue availability, etc.
  // For now, use random generation
  return generateRoundRobinSchedule(teamIds, totalGames, startDate, gameDays, gameTimes, location);
}

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
 * Generate and save schedule for a season
 */
export async function generateSeasonSchedule(
  seasonId: string,
  method: ScheduleGenerationMethod = "random",
  location?: string,
  forceRegenerate: boolean = false
): Promise<ScheduleGenerationResult> {
  // Verify admin/owner access
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };
  
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
  if (season.schedule_generated && !forceRegenerate) {
    return { error: "Schedule has already been generated for this season. Use 'Regenerate' to create a new schedule." };
  }

  // If regenerating, delete existing scheduled games (not completed/in_progress)
  if (forceRegenerate && season.schedule_generated) {
    // First, get the IDs of scheduled games that will be deleted
    const { data: scheduledGames } = await supabase
      .from("games")
      .select("id")
      .eq("season_id", seasonId)
      .eq("status", "scheduled");

    if (scheduledGames && scheduledGames.length > 0) {
      const gameIds = scheduledGames.map(g => g.id);
      
      // Delete related player_availability records first
      const { error: availabilityDeleteError } = await supabase
        .from("player_availability")
        .delete()
        .in("game_id", gameIds);

      if (availabilityDeleteError) {
        console.error("Error deleting player availability:", availabilityDeleteError);
        return { error: `Failed to clear player availability: ${availabilityDeleteError.message}` };
      }
    }

    // Now delete the scheduled games
    const { error: deleteError } = await supabase
      .from("games")
      .delete()
      .eq("season_id", seasonId)
      .eq("status", "scheduled");

    if (deleteError) {
      console.error("Error deleting existing games:", deleteError);
      return { error: `Failed to clear existing schedule: ${deleteError.message}` };
    }
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

  // Extract schedule configuration from season (with defaults)
  let gameDays = ["Monday"];
  let gameTimes = ["21:15"];
  
  try {
    if (season.game_days && Array.isArray(season.game_days)) {
      gameDays = season.game_days as string[];
    }
  } catch (e) {
    console.error("Error parsing game_days from season:", e);
  }
  
  try {
    if (season.game_times && Array.isArray(season.game_times)) {
      gameTimes = season.game_times as string[];
    }
  } catch (e) {
    console.error("Error parsing game_times from season:", e);
  }
  
  // Use season's default_location if no location parameter provided
  const finalLocation = location || season.default_location || null;

  // Generate schedule
  let games: Array<{
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: Date;
  }>;

  if (method === "ai") {
    games = await generateAISchedule(seasonId, teamIds, season.total_games, startDate, gameDays, gameTimes, finalLocation);
  } else {
    games = generateRoundRobinSchedule(teamIds, season.total_games, startDate, gameDays, gameTimes, finalLocation);
  }

  // Insert games into database
  const gamesToInsert = games.map((game) => ({
    season_id: seasonId,
    home_team_id: game.homeTeamId,
    away_team_id: game.awayTeamId,
    scheduled_at: game.scheduledAt.toISOString(),
    location: finalLocation,
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
