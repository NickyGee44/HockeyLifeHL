"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type OptInResult = {
  error?: string;
  success?: boolean;
};

// Opt in to a season
export async function optInToSeason(
  seasonId: string,
  optInType: "full_time" | "call_up"
): Promise<OptInResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify season exists
  const { data: season } = await supabase
    .from("seasons")
    .select("id, status")
    .eq("id", seasonId)
    .single();

  if (!season) {
    return { error: "Season not found" };
  }

  // Only allow opt-in if season is in draft or active status
  if (season.status !== "draft" && season.status !== "active") {
    return { error: "Cannot opt in to a season that is not in draft or active status" };
  }

  // Upsert opt-in
  const { error } = await supabase
    .from("season_opt_ins")
    .upsert({
      player_id: user.id,
      season_id: seasonId,
      opt_in_type: optInType,
      opted_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "player_id,season_id",
    });

  if (error) {
    console.error("Error opting in to season:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  return { success: true };
}

// Opt out of a season
export async function optOutOfSeason(seasonId: string): Promise<OptInResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("season_opt_ins")
    .delete()
    .eq("player_id", user.id)
    .eq("season_id", seasonId);

  if (error) {
    console.error("Error opting out of season:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  return { success: true };
}

// Get player's opt-in status for a season
export async function getPlayerOptInStatus(seasonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", optIn: null };
  }

  const { data: optIn, error } = await supabase
    .from("season_opt_ins")
    .select("*")
    .eq("player_id", user.id)
    .eq("season_id", seasonId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error("Error fetching opt-in status:", error);
    return { error: error.message, optIn: null };
  }

  return { optIn: optIn || null };
}

// Get all opt-ins for a season (owner/captain view)
export async function getSeasonOptIns(seasonId: string, optInType?: "full_time" | "call_up") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", optIns: [] };
  }

  // Check if user is owner or captain
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner" && profile?.role !== "captain") {
    return { error: "Not authorized", optIns: [] };
  }

  let query = supabase
    .from("season_opt_ins")
    .select(`
      *,
      player:profiles!season_opt_ins_player_id_fkey(id, full_name, email, jersey_number, position)
    `)
    .eq("season_id", seasonId);

  if (optInType) {
    query = query.eq("opt_in_type", optInType);
  }

  const { data: optIns, error } = await query.order("opted_in_at", { ascending: false });

  if (error) {
    console.error("Error fetching season opt-ins:", error);
    return { error: error.message, optIns: [] };
  }

  return { optIns: optIns || [] };
}

// Get players available for draft (full-time opt-ins only)
export async function getDraftablePlayers(seasonId: string) {
  const supabase = await createClient();

  // Get all players who opted in as full-time for this season
  const { data: optIns, error } = await supabase
    .from("season_opt_ins")
    .select(`
      *,
      player:profiles!season_opt_ins_player_id_fkey(
        id,
        full_name,
        email,
        jersey_number,
        position,
        avatar_url
      )
    `)
    .eq("season_id", seasonId)
    .eq("opt_in_type", "full_time");

  if (error) {
    console.error("Error fetching draftable players:", error);
    return { error: error.message, players: [] };
  }

  // Also check that players are approved
  const playerIds = (optIns || []).map(oi => oi.player_id);
  
  if (playerIds.length > 0) {
    const { data: approvals } = await supabase
      .from("player_approvals")
      .select("player_id")
      .in("player_id", playerIds);

    const approvedIds = new Set((approvals || []).map(a => a.player_id));
    
    // Filter to only approved players
    const draftablePlayers = (optIns || []).filter(oi => approvedIds.has(oi.player_id));
    
    return { players: draftablePlayers.map(oi => oi.player) };
  }

  return { players: [] };
}
