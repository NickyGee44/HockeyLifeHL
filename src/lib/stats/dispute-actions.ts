"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StatDisputeResult = {
  error?: string;
  success?: boolean;
  disputeId?: string;
};

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

  // Note: stat_disputes table may not be in current schema
  // This is a placeholder implementation
  const { data: dispute, error } = await (supabase as any)
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
  return { success: true, disputeId: dispute?.id };
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

  // Note: stat_disputes table may not be in current schema
  const { error } = await (supabase as any)
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

  // Note: stat_disputes table may not be in current schema
  const { data: disputes, error } = await (supabase as any)
    .from("stat_disputes")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching disputes:", error);
    return { error: error.message, disputes: [] };
  }

  // Fetch related data separately if needed
  const disputesWithRelations = disputes || [];

  return { disputes: disputesWithRelations };
}
