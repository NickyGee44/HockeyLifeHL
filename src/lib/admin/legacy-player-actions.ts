// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Check if user is owner
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
) {
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
export async function getPlayerCareerStats(playerId: string) {
  const supabase = await createClient();

  const { data: stats, error } = await supabase
    .from("player_career_stats")
    .select("*")
    .eq("player_id", playerId)
    .single();

  if (error) {
    console.error("Error fetching career stats:", error);
    return { error: error.message, stats: null };
  }

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
