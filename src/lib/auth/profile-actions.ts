"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileUpdateResult = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(formData: FormData): Promise<ProfileUpdateResult> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const fullName = formData.get("fullName") as string;
  const jerseyNumber = formData.get("jerseyNumber") as string;
  const position = formData.get("position") as string;

  // Validation
  if (!fullName || fullName.trim().length < 2) {
    return { error: "Name must be at least 2 characters" };
  }

  const jerseyNum = jerseyNumber ? parseInt(jerseyNumber) : null;
  if (jerseyNum !== null && (jerseyNum < 0 || jerseyNum > 99)) {
    return { error: "Jersey number must be between 0 and 99" };
  }

  const validPositions = ["C", "LW", "RW", "D", "G", ""];
  if (position && !validPositions.includes(position)) {
    return { error: "Invalid position" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName.trim(),
      jersey_number: jerseyNum,
      position: position || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Profile update error:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAvatar(avatarUrl: string): Promise<ProfileUpdateResult> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Avatar update error:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/profile");
  return { success: true };
}
