"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type OwnerAuthResult =
  | { error: string; isOwner: false; userId?: never }
  | { error?: never; isOwner: true; userId: string };

// Check if user is owner
async function requireOwner(): Promise<OwnerAuthResult> {
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

// Get all legacy players
export async function getAllLegacyPlayers() {
  const supabase = await createClient();

  const { data: legacyPlayers, error } = await supabase
    .from("legacy_players")
    .select(`
      *,
      matched_profile:profiles!legacy_players_matched_to_profile_id_fkey(id, full_name, email)
    `)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching legacy players:", error);
    return { error: error.message, players: [] };
  }

  return { players: legacyPlayers || [] };
}

// Manually match a legacy player to a profile
export async function matchLegacyPlayer(
  legacyPlayerId: string,
  profileId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase.rpc('match_legacy_player_to_profile', {
    legacy_player_id: legacyPlayerId,
    profile_id: profileId,
  });

  if (error) {
    console.error("Error matching legacy player:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/legacy-players");
  return { success: true };
}

// Get player career stats (legacy + current combined)
export async function getPlayerCareerStats(playerId: string): Promise<{
  error?: string;
  stats: Record<string, unknown> | null;
}> {
  const supabase = await createClient();

  // Aggregate stats manually since player_career_stats might be a view
  // Get current season stats
  const { data: playerStats } = await supabase
    .from("player_stats")
    .select("goals, assists")
    .eq("player_id", playerId);

  const { data: goalieStats } = await supabase
    .from("goalie_stats")
    .select("goals_against, saves, shutout")
    .eq("player_id", playerId);

  // Calculate totals
  const totalGoals = (playerStats || []).reduce((sum, s) => sum + (s.goals || 0), 0);
  const totalAssists = (playerStats || []).reduce((sum, s) => sum + (s.assists || 0), 0);
  const totalGames = playerStats?.length || 0;

  const stats = {
    player_id: playerId,
    total_goals: totalGoals,
    total_assists: totalAssists,
    total_points: totalGoals + totalAssists,
    games_played: totalGames,
    goalie_stats: goalieStats || [],
  };

  return { stats };
}

// Search for legacy players by name
export async function searchLegacyPlayers(searchTerm: string) {
  const supabase = await createClient();

  const { data: players, error } = await supabase
    .from("legacy_players")
    .select("*")
    .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
    .is("matched_to_profile_id", null)
    .limit(20);

  if (error) {
    console.error("Error searching legacy players:", error);
    return { error: error.message, players: [] };
  }

  return { players: players || [] };
}
