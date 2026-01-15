// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StatDisputeResult = {
  error?: string;
  success?: boolean;
  disputeId?: string;
};

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

// Create a stat dispute
export async function createStatDispute(
  gameId: string,
  teamId: string,
  statType: "player_goal" | "player_assist" | "goalie_save" | "goalie_ga" | "score",
  statId: string | null,
  description: string
): Promise<StatDisputeResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify user is captain of the team
  const { data: team } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", teamId)
    .single();

  if (!team || team.captain_id !== user.id) {
    return { error: "Only team captain can create disputes" };
  }

  const { data: dispute, error } = await supabase
    .from("stat_disputes")
    .insert({
      game_id: gameId,
      disputed_by_team_id: teamId,
      disputed_stat_type: statType,
      disputed_stat_id: statId,
      description: description,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating stat dispute:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/stats");
  revalidatePath("/admin/stats");
  return { success: true, disputeId: dispute.id };
}

// Resolve a stat dispute (owner only)
export async function resolveStatDispute(
  disputeId: string,
  resolution: "resolved" | "rejected",
  notes: string
): Promise<StatDisputeResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("stat_disputes")
    .update({
      status: resolution,
      resolved_by: auth.userId,
      resolution_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (error) {
    console.error("Error resolving stat dispute:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/stats");
  return { success: true };
}

// Get all pending disputes
export async function getPendingDisputes() {
  const supabase = await createClient();

  const { data: disputes, error } = await supabase
    .from("stat_disputes")
    .select(`
      *,
      game:games!stat_disputes_game_id_fkey(
        id,
        scheduled_at,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name)
      ),
      disputed_by_team:teams!stat_disputes_disputed_by_team_id_fkey(id, name)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching disputes:", error);
    return { error: error.message, disputes: [] };
  }

  return { disputes: disputes || [] };
}
