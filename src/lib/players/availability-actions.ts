// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AvailabilityResult = {
  error?: string;
  success?: boolean;
};

// Set player availability for a game
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
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "player_id,game_id",
    });

  if (error) {
    console.error("Error setting player availability:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/schedule");
  revalidatePath("/captain/team");
  return { success: true };
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
