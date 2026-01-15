// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/types/database";

export type TeamActionResult = {
  error?: string;
  success?: boolean;
  team?: Team;
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

export async function getAllTeams() {
  const supabase = await createClient();
  
  const { data: teams, error } = await supabase
    .from("teams")
    .select(`
      *,
      captain:profiles!teams_captain_id_fkey(id, full_name, email, avatar_url)
    `)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching teams:", error);
    return { error: error.message, teams: [] };
  }

  return { teams: teams || [] };
}

export async function getTeamById(teamId: string) {
  const supabase = await createClient();
  
  const { data: team, error } = await supabase
    .from("teams")
    .select(`
      *,
      captain:profiles!teams_captain_id_fkey(id, full_name, email, avatar_url, jersey_number, position)
    `)
    .eq("id", teamId)
    .single();

  if (error) {
    console.error("Error fetching team:", error);
    return { error: error.message, team: null };
  }

  return { team };
}

export async function createTeam(formData: FormData): Promise<TeamActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const name = formData.get("name") as string;
  const shortName = formData.get("shortName") as string;
  const primaryColor = formData.get("primaryColor") as string || "#E31837";
  const secondaryColor = formData.get("secondaryColor") as string || "#FFFFFF";
  const captainId = formData.get("captainId") as string || null;

  // Validation
  if (!name || name.trim().length < 2) {
    return { error: "Team name must be at least 2 characters" };
  }
  if (!shortName || shortName.trim().length < 2 || shortName.trim().length > 5) {
    return { error: "Short name must be 2-5 characters" };
  }

  // Check for duplicate name
  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .ilike("name", name.trim())
    .single();

  if (existing) {
    return { error: "A team with this name already exists" };
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      name: name.trim(),
      short_name: shortName.trim().toUpperCase(),
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      captain_id: captainId || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating team:", error);
    return { error: error.message };
  }

  // If captain was assigned, update their role to captain
  if (captainId) {
    await supabase
      .from("profiles")
      .update({ role: "captain" })
      .eq("id", captainId);
  }

  revalidatePath("/admin/teams");
  revalidatePath("/teams");
  return { success: true, team };
}

export async function updateTeam(teamId: string, formData: FormData): Promise<TeamActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const name = formData.get("name") as string;
  const shortName = formData.get("shortName") as string;
  const primaryColor = formData.get("primaryColor") as string;
  const secondaryColor = formData.get("secondaryColor") as string;
  const captainId = formData.get("captainId") as string || null;

  // Validation
  if (!name || name.trim().length < 2) {
    return { error: "Team name must be at least 2 characters" };
  }
  if (!shortName || shortName.trim().length < 2 || shortName.trim().length > 5) {
    return { error: "Short name must be 2-5 characters" };
  }

  // Get current team to check captain change
  const { data: currentTeam } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", teamId)
    .single();

  const { data: team, error } = await supabase
    .from("teams")
    .update({
      name: name.trim(),
      short_name: shortName.trim().toUpperCase(),
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      captain_id: captainId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teamId)
    .select()
    .single();

  if (error) {
    console.error("Error updating team:", error);
    return { error: error.message };
  }

  // Handle captain role changes
  if (currentTeam?.captain_id !== captainId) {
    // Remove captain role from old captain (if they're not captain of another team)
    if (currentTeam?.captain_id) {
      const { data: otherTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("captain_id", currentTeam.captain_id)
        .neq("id", teamId);

      if (!otherTeams || otherTeams.length === 0) {
        await supabase
          .from("profiles")
          .update({ role: "player" })
          .eq("id", currentTeam.captain_id);
      }
    }

    // Add captain role to new captain
    if (captainId) {
      await supabase
        .from("profiles")
        .update({ role: "captain" })
        .eq("id", captainId);
    }
  }

  revalidatePath("/admin/teams");
  revalidatePath("/teams");
  revalidatePath(`/teams/${teamId}`);
  return { success: true, team };
}

export async function deleteTeam(teamId: string): Promise<TeamActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Get team captain before deletion
  const { data: team } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", teamId)
    .single();

  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (error) {
    console.error("Error deleting team:", error);
    return { error: error.message };
  }

  // Remove captain role if they're not captain of another team
  if (team?.captain_id) {
    const { data: otherTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("captain_id", team.captain_id);

    if (!otherTeams || otherTeams.length === 0) {
      await supabase
        .from("profiles")
        .update({ role: "player" })
        .eq("id", team.captain_id);
    }
  }

  revalidatePath("/admin/teams");
  revalidatePath("/teams");
  return { success: true };
}

// Get available players who can be captains (not currently captains of other teams)
export async function getAvailableCaptains() {
  const supabase = await createClient();
  
  const { data: players, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching players:", error);
    return { error: error.message, players: [] };
  }

  return { players: players || [] };
}

// Check if current user is the captain of a team
async function requireCaptainOfTeam(teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", isCaptain: false };
  }

  // Check if user is owner (owners can do anything)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "owner") {
    return { isCaptain: true, userId: user.id, isOwner: true };
  }

  // Check if user is captain of this specific team
  const { data: team } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", teamId)
    .single();

  if (!team || team.captain_id !== user.id) {
    return { error: "Not authorized - you are not the captain of this team", isCaptain: false };
  }

  return { isCaptain: true, userId: user.id };
}

// Update team logo - accessible by team captain or owner
export async function updateTeamLogo(teamId: string, logoUrl: string): Promise<TeamActionResult> {
  const auth = await requireCaptainOfTeam(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { data: team, error } = await supabase
    .from("teams")
    .update({
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teamId)
    .select()
    .single();

  if (error) {
    console.error("Error updating team logo:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/team");
  revalidatePath("/teams");
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/standings");
  revalidatePath("/schedule");
  return { success: true, team };
}

// Delete team logo - accessible by team captain or owner
export async function deleteTeamLogo(teamId: string): Promise<TeamActionResult> {
  const auth = await requireCaptainOfTeam(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Get current logo URL to delete from storage
  const { data: currentTeam } = await supabase
    .from("teams")
    .select("logo_url")
    .eq("id", teamId)
    .single();

  // Delete from storage if it's a Supabase storage URL
  if (currentTeam?.logo_url && currentTeam.logo_url.includes("supabase")) {
    try {
      const url = new URL(currentTeam.logo_url);
      const pathParts = url.pathname.split("/storage/v1/object/public/");
      if (pathParts.length > 1) {
        const [bucket, ...filePath] = pathParts[1].split("/");
        await supabase.storage.from(bucket).remove([filePath.join("/")]);
      }
    } catch (e) {
      console.error("Error deleting logo from storage:", e);
    }
  }

  const { data: team, error } = await supabase
    .from("teams")
    .update({
      logo_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teamId)
    .select()
    .single();

  if (error) {
    console.error("Error deleting team logo:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/team");
  revalidatePath("/teams");
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/standings");
  revalidatePath("/schedule");
  return { success: true, team };
}
