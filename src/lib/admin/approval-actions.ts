"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ApprovalResult = {
  error?: string;
  success?: boolean;
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

// Approve a player
export async function approvePlayer(
  playerId: string,
  notes?: string
): Promise<ApprovalResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Check if already approved
  const { data: existing } = await supabase
    .from("player_approvals")
    .select("id")
    .eq("player_id", playerId)
    .single();

  if (existing) {
    return { error: "Player is already approved" };
  }

  const { error } = await supabase
    .from("player_approvals")
    .insert({
      player_id: playerId,
      approved_by: auth.userId,
      approval_method: "owner",
      notes: notes || null,
    });

  if (error) {
    console.error("Error approving player:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/players");
  revalidatePath("/admin/approvals");
  return { success: true };
}

// Reject/Remove approval (owner only)
export async function removePlayerApproval(playerId: string): Promise<ApprovalResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("player_approvals")
    .delete()
    .eq("player_id", playerId);

  if (error) {
    console.error("Error removing approval:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/players");
  revalidatePath("/admin/approvals");
  return { success: true };
}

// Get all pending approvals (players without approval)
export async function getPendingApprovals() {
  const supabase = await createClient();

  // Get all profiles that don't have an approval
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at, role")
    .eq("role", "player")
    .order("created_at", { ascending: false });

  if (!allProfiles) {
    return { players: [] };
  }

  const { data: approvals } = await supabase
    .from("player_approvals")
    .select("player_id");

  const approvedIds = new Set((approvals || []).map(a => a.player_id));
  
  const pending = (allProfiles || []).filter(p => !approvedIds.has(p.id));

  return { players: pending };
}

// Get all approved players
export async function getApprovedPlayers() {
  const supabase = await createClient();

  const { data: approvals, error } = await supabase
    .from("player_approvals")
    .select(`
      *,
      player:profiles!player_approvals_player_id_fkey(id, full_name, email, jersey_number),
      approved_by_profile:profiles!player_approvals_approved_by_fkey(id, full_name)
    `)
    .order("approved_at", { ascending: false });

  if (error) {
    console.error("Error fetching approved players:", error);
    return { error: error.message, players: [] };
  }

  return { players: approvals || [] };
}
