"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type AdminActionResult = {
  error?: string;
  success?: boolean;
};

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

export async function getAllPlayers() {
  const supabase = await createClient();
  
  const { data: players, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching players:", error);
    return { error: error.message, players: [] };
  }

  return { players: players || [] };
}

export async function updatePlayerRole(
  playerId: string, 
  newRole: UserRole
): Promise<AdminActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Prevent owner from demoting themselves
  if (playerId === auth.userId && newRole !== "owner") {
    return { error: "You cannot change your own role" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ 
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerId);

  if (error) {
    console.error("Error updating player role:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/players");
  return { success: true };
}

export async function updatePlayerProfile(
  playerId: string,
  data: {
    full_name?: string;
    jersey_number?: number | null;
    position?: string | null;
  }
): Promise<AdminActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerId);

  if (error) {
    console.error("Error updating player profile:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/players");
  return { success: true };
}

export async function deletePlayer(playerId: string): Promise<AdminActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  // Prevent owner from deleting themselves
  if (playerId === auth.userId) {
    return { error: "You cannot delete your own account" };
  }

  const supabase = await createClient();

  // Note: This only deletes the profile. The auth user remains.
  // For full deletion, you'd need to use Supabase Admin API
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", playerId);

  if (error) {
    console.error("Error deleting player:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/players");
  return { success: true };
}
