"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AvailabilityResult = {
  error?: string;
  success?: boolean;
};

// Check in to a game (for upcoming games)
export async function checkInToGame(
  gameId: string,
  status: "available" | "unavailable" | "maybe"
): Promise<AvailabilityResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get game info
  const { data: game } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, season_id, scheduled_at, home_subs_requested, away_subs_requested")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  // Check if game is in the future
  if (new Date(game.scheduled_at) < new Date()) {
    return { error: "Cannot check in to past games" };
  }

  // Get player's team for this season
  const { data: roster } = await supabase
    .from("team_rosters")
    .select("team_id")
    .eq("player_id", user.id)
    .eq("season_id", game.season_id)
    .single();

  // Get player's opt-in type for this season
  const { data: optIn } = await supabase
    .from("season_opt_ins")
    .select("opt_in_type")
    .eq("player_id", user.id)
    .eq("season_id", game.season_id)
    .single();

  let teamId: string | null = null;
  const isCallUp = optIn?.opt_in_type === "call_up";

  if (roster) {
    // Player is on a team - verify their team is in this game
    if (roster.team_id !== game.home_team_id && roster.team_id !== game.away_team_id) {
      return { error: "Your team is not playing in this game" };
    }
    teamId = roster.team_id;
  } else if (isCallUp) {
    // Call-up player - can only check in if subs are requested
    const isHomeSubsRequested = game.home_subs_requested;
    const isAwaySubsRequested = game.away_subs_requested;
    
    if (!isHomeSubsRequested && !isAwaySubsRequested) {
      return { error: "Subs have not been requested for this game. Check back later." };
    }
    
    // For call-ups, they can check in to any team that requested subs
    // Set teamId to null - captain will assign them later
    teamId = isHomeSubsRequested ? game.home_team_id : game.away_team_id;
  } else {
    return { error: "You are not on a team for this season" };
  }

  // Upsert availability with check-in timestamp
  const { error } = await supabase
    .from("player_availability")
    .upsert({
      player_id: user.id,
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
    console.error("Error checking in to game:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/schedule");
  revalidatePath("/captain");
  revalidatePath("/captain/team");
  return { success: true };
}

// Set player availability for a game (legacy function for backwards compatibility)
export async function setPlayerAvailability(
  gameId: string,
  status: "available" | "unavailable" | "maybe" | "injured",
  reason?: string
): Promise<AvailabilityResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get game and team info
  const { data: game } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, season_id")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  // Get player's team for this season
  const { data: roster } = await supabase
    .from("team_rosters")
    .select("team_id")
    .eq("player_id", user.id)
    .eq("season_id", game.season_id)
    .single();

  if (!roster) {
    return { error: "You are not on a team for this season" };
  }

  // Verify player's team is in this game
  if (roster.team_id !== game.home_team_id && roster.team_id !== game.away_team_id) {
    return { error: "Your team is not playing in this game" };
  }

  // Upsert availability
  const { error } = await supabase
    .from("player_availability")
    .upsert({
      player_id: user.id,
      team_id: roster.team_id,
      season_id: game.season_id,
      game_id: gameId,
      status: status,
      reason: reason || null,
      checked_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "player_id,game_id",
    });

  if (error) {
    console.error("Error setting player availability:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/schedule");
  revalidatePath("/captain/team");
  return { success: true };
}

// Captain requests subs for a game
export async function requestSubsForGame(gameId: string): Promise<AvailabilityResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get game info
  const { data: game } = await supabase
    .from("games")
    .select("home_team_id, away_team_id")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { error: "Game not found" };
  }

  // Check if user is captain of home or away team
  const { data: homeTeam } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", game.home_team_id)
    .single();

  const { data: awayTeam } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", game.away_team_id)
    .single();

  // Check if user is owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner = profile?.role === "owner";
  const isHomeCaptain = homeTeam?.captain_id === user.id;
  const isAwayCaptain = awayTeam?.captain_id === user.id;

  if (!isOwner && !isHomeCaptain && !isAwayCaptain) {
    return { error: "Only team captains can request subs" };
  }

  // Update the appropriate subs_requested field
  const updateData: {
    updated_at: string;
    home_subs_requested?: boolean;
    home_subs_requested_at?: string;
    away_subs_requested?: boolean;
    away_subs_requested_at?: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (isHomeCaptain || (isOwner && !isAwayCaptain)) {
    updateData.home_subs_requested = true;
    updateData.home_subs_requested_at = new Date().toISOString();
  }
  if (isAwayCaptain) {
    updateData.away_subs_requested = true;
    updateData.away_subs_requested_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("games")
    .update(updateData)
    .eq("id", gameId);

  if (error) {
    console.error("Error requesting subs:", error);
    return { error: error.message };
  }

  revalidatePath("/captain");
  revalidatePath("/captain/team");
  revalidatePath("/dashboard");
  return { success: true };
}

// Get upcoming game for check-in (player's next game)
export async function getUpcomingGameForCheckIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { game: null, availability: null, canCheckIn: false };
  }

  // Get active season
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .in("status", ["active", "playoffs"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (!season) {
    return { game: null, availability: null, canCheckIn: false };
  }

  // Get player's team for this season
  const { data: roster } = await supabase
    .from("team_rosters")
    .select("team_id")
    .eq("player_id", user.id)
    .eq("season_id", season.id)
    .single();

  // Get player's opt-in type
  const { data: optIn } = await supabase
    .from("season_opt_ins")
    .select("opt_in_type")
    .eq("player_id", user.id)
    .eq("season_id", season.id)
    .single();

  const isCallUp = optIn?.opt_in_type === "call_up";
  const isFullTime = optIn?.opt_in_type === "full_time";

  // Find next game
  let nextGame;
  
  if (roster) {
    // Full-time player - find their team's next game
    const { data: games } = await supabase
      .from("games")
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color)
      `)
      .eq("season_id", season.id)
      .or(`home_team_id.eq.${roster.team_id},away_team_id.eq.${roster.team_id}`)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1);

    nextGame = games?.[0] || null;
  } else if (isCallUp) {
    // Call-up player - find any game with subs requested
    const { data: games } = await supabase
      .from("games")
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color)
      `)
      .eq("season_id", season.id)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_at", new Date().toISOString())
      .or("home_subs_requested.eq.true,away_subs_requested.eq.true")
      .order("scheduled_at", { ascending: true })
      .limit(1);

    nextGame = games?.[0] || null;
  }

  if (!nextGame) {
    return { game: null, availability: null, canCheckIn: false, isCallUp };
  }

  // Get player's current availability for this game
  const { data: availability } = await supabase
    .from("player_availability")
    .select("*")
    .eq("player_id", user.id)
    .eq("game_id", nextGame.id)
    .single();

  // Determine if player can check in
  let canCheckIn = false;
  if (isFullTime || roster) {
    // Full-time players can always check in
    canCheckIn = true;
  } else if (isCallUp) {
    // Call-up players can only check in if subs requested
    const isHomeSubsRequested = nextGame.home_subs_requested;
    const isAwaySubsRequested = nextGame.away_subs_requested;
    canCheckIn = isHomeSubsRequested || isAwaySubsRequested;
  }

  return { 
    game: nextGame, 
    availability: availability || null, 
    canCheckIn,
    isCallUp,
    teamId: roster?.team_id || null,
  };
}

// Get availability for a game (captain/owner view)
export async function getGameAvailability(gameId: string) {
  const supabase = await createClient();

  const { data: availability, error } = await supabase
    .from("player_availability")
    .select(`
      *,
      player:profiles!player_availability_player_id_fkey(id, full_name, jersey_number, avatar_url)
    `)
    .eq("game_id", gameId)
    .order("status", { ascending: true });

  if (error) {
    console.error("Error fetching game availability:", error);
    return { error: error.message, availability: [] };
  }

  return { availability: availability || [] };
}

// Get team availability for a season (captain view)
export async function getTeamAvailability(teamId: string, seasonId: string) {
  const supabase = await createClient();

  const { data: availability, error } = await supabase
    .from("player_availability")
    .select(`
      *,
      player:profiles!player_availability_player_id_fkey(id, full_name, jersey_number),
      game:games!player_availability_game_id_fkey(id, scheduled_at, home_team_id, away_team_id)
    `)
    .eq("team_id", teamId)
    .eq("season_id", seasonId)
    .order("game.scheduled_at", { ascending: true });

  if (error) {
    console.error("Error fetching team availability:", error);
    return { error: error.message, availability: [] };
  }

  return { availability: availability || [] };
}
