// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function getAllSuspensions() {
  const supabase = await createClient();
  
  const { data: suspensions, error } = await supabase
    .from("suspensions")
    .select(`
      *,
      player:profiles!suspensions_player_id_fkey(id, full_name, email, jersey_number),
      issued_by_profile:profiles!suspensions_issued_by_fkey(id, full_name)
    `)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching suspensions:", error);
    return { error: error.message, suspensions: [] };
  }

  return { suspensions: suspensions || [] };
}

export async function createSuspension(formData: FormData) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const playerId = formData.get("playerId") as string;
  const reason = formData.get("reason") as string;
  const gamesRemaining = parseInt(formData.get("gamesRemaining") as string) || 0;
  const startDate = formData.get("startDate") as string;

  if (!playerId || !reason || gamesRemaining <= 0 || !startDate) {
    return { error: "All fields are required" };
  }

  const { data: suspension, error } = await supabase
    .from("suspensions")
    .insert({
      player_id: playerId,
      reason: reason,
      games_remaining: gamesRemaining,
      start_date: startDate,
      issued_by: auth.userId!,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating suspension:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/suspensions");
  return { success: true, suspension };
}

export async function updateSuspension(suspensionId: string, gamesRemaining: number) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("suspensions")
    .update({
      games_remaining: gamesRemaining,
      end_date: gamesRemaining === 0 ? new Date().toISOString() : null,
    })
    .eq("id", suspensionId);

  if (error) {
    console.error("Error updating suspension:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/suspensions");
  return { success: true };
}

export async function deleteSuspension(suspensionId: string) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("suspensions")
    .delete()
    .eq("id", suspensionId);

  if (error) {
    console.error("Error deleting suspension:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/suspensions");
  return { success: true };
}
