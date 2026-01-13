"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InviteResult = {
  error?: string;
  success?: boolean;
  code?: string;
  inviteId?: string;
};

// Check if user is captain or owner
async function requireCaptainOrOwner(teamId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", isAuthorized: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "owner") {
    return { isAuthorized: true, userId: user.id };
  }

  if (profile?.role === "captain" && teamId) {
    const { data: team } = await supabase
      .from("teams")
      .select("captain_id")
      .eq("id", teamId)
      .single();

    if (team?.captain_id === user.id) {
      return { isAuthorized: true, userId: user.id };
    }
  }

  return { error: "Not authorized - must be team captain or owner", isAuthorized: false };
}

// Create an invite code
export async function createInviteCode(
  teamId: string | null,
  seasonId: string | null,
  expiresAt: string | null,
  maxUses: number = 1,
  autoApprove: boolean = true,
  notes?: string
): Promise<InviteResult> {
  const auth = await requireCaptainOrOwner(teamId || undefined);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Generate unique code using database function
  const { data: codeResult, error: codeError } = await supabase.rpc('generate_invite_code');

  if (codeError || !codeResult) {
    console.error("Error generating invite code:", codeError);
    return { error: "Failed to generate invite code" };
  }

  const code = codeResult as string;

  const { data: invite, error } = await supabase
    .from("invite_codes")
    .insert({
      code: code,
      created_by: auth.userId!,
      team_id: teamId,
      season_id: seasonId,
      expires_at: expiresAt,
      max_uses: maxUses,
      auto_approve: autoApprove,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating invite code:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/team");
  revalidatePath("/admin/invites");
  return { success: true, code: code, inviteId: invite.id };
}

// Use an invite code (during registration)
export async function useInviteCode(code: string): Promise<InviteResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: result, error } = await supabase.rpc('use_invite_code', {
    code_to_use: code,
    user_id: user.id,
  });

  if (error) {
    console.error("Error using invite code:", error);
    return { error: error.message };
  }

  if (!result || result.length === 0 || !result[0].success) {
    return { error: result?.[0]?.message || "Invalid invite code" };
  }

  revalidatePath("/dashboard");
  return { success: true, inviteId: result[0].invite_id };
}

// Get all invite codes (for captain/owner)
export async function getInviteCodes(teamId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", invites: [] };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("invite_codes")
    .select(`
      *,
      created_by_profile:profiles!invite_codes_created_by_fkey(id, full_name),
      team:teams!invite_codes_team_id_fkey(id, name),
      season:seasons!invite_codes_season_id_fkey(id, name),
      used_by_profile:profiles!invite_codes_used_by_fkey(id, full_name, email)
    `)
    .order("created_at", { ascending: false });

  // Filter by team if captain (not owner)
  if (profile?.role === "captain" && teamId) {
    query = query.eq("team_id", teamId);
  } else if (profile?.role === "captain" && !teamId) {
    // Captain can only see their own invites
    query = query.eq("created_by", user.id);
  }
  // Owners can see all

  const { data: invites, error } = await query;

  if (error) {
    console.error("Error fetching invite codes:", error);
    return { error: error.message, invites: [] };
  }

  return { invites: invites || [] };
}

// Validate an invite code (check if it's valid without using it)
export async function validateInviteCode(code: string) {
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc('is_invite_code_valid', {
    code_to_check: code,
  });

  if (error) {
    console.error("Error validating invite code:", error);
    return { error: error.message, isValid: false };
  }

  if (!result || result.length === 0) {
    return { isValid: false, message: "Invite code not found" };
  }

  return {
    isValid: result[0].is_valid,
    inviteId: result[0].invite_id,
    teamId: result[0].team_id,
    seasonId: result[0].season_id,
    autoApprove: result[0].auto_approve,
    message: result[0].is_valid ? "Valid invite code" : "Invalid or expired invite code",
  };
}

// Delete an invite code
export async function deleteInviteCode(inviteId: string): Promise<InviteResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get invite to check permissions
  const { data: invite } = await supabase
    .from("invite_codes")
    .select("created_by, team_id")
    .eq("id", inviteId)
    .single();

  if (!invite) {
    return { error: "Invite code not found" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Check if user can delete (creator or owner)
  if (profile?.role !== "owner" && invite.created_by !== user.id) {
    return { error: "Not authorized to delete this invite code" };
  }

  const { error } = await supabase
    .from("invite_codes")
    .delete()
    .eq("id", inviteId);

  if (error) {
    console.error("Error deleting invite code:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/team");
  revalidatePath("/admin/invites");
  return { success: true };
}
