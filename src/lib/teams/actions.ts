"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { escape } from "html-escaper";
import type { Team } from "@/types/database";
import { requireLeagueRole, getActiveLeagueId } from "@/lib/auth/league-context";

export type TeamActionResult = {
  error?: string;
  success?: boolean;
  team?: Team;
};

export async function getAllTeams() {
  try {
    // Require league membership (any role can view teams)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    const { data: teams, error } = await supabase
      .from("teams")
      .select(`
        *,
        captain:profiles!teams_captain_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching teams:", error);
      return { error: error.message, teams: [] };
    }

    return { teams: teams || [] };
  } catch (error: any) {
    console.error("Error in getAllTeams:", error);
    return { error: error.message || 'Unauthorized', teams: [] };
  }
}

export async function getTeamById(teamId: string) {
  try {
    // Require league membership (any role can view teams)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    const { data: team, error } = await supabase
      .from("teams")
      .select(`
        *,
        captain:profiles!teams_captain_id_fkey(id, full_name, email, avatar_url, jersey_number, position)
      `)
      .eq("id", teamId)
      .eq('league_id', leagueId) // CRITICAL: Verify team belongs to user's league
      .single();

    if (error) {
      console.error("Error fetching team:", error);
      return { error: error.message, team: null };
    }

    return { team };
  } catch (error: any) {
    console.error("Error in getTeamById:", error);
    return { error: error.message || 'Unauthorized', team: null };
  }
}

export async function createTeam(formData: FormData): Promise<TeamActionResult> {
  try {
    // Require owner or admin role to create teams
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

  const name = formData.get("name") as string;
  const shortName = formData.get("shortName") as string;
  const primaryColor = formData.get("primaryColor") as string || "#E31837";
  const secondaryColor = formData.get("secondaryColor") as string || "#FFFFFF";
  const captainId = formData.get("captainId") as string || null;

  // SECURITY: Validation with length limits
  if (!name || name.trim().length < 2) {
    return { error: "Team name must be at least 2 characters" };
  }
  if (name.trim().length > 50) {
    return { error: "Team name cannot exceed 50 characters" };
  }
  if (!shortName || shortName.trim().length < 2 || shortName.trim().length > 5) {
    return { error: "Short name must be 2-5 characters" };
  }

  // SECURITY: Validate hex color format
  const hexColorRegex = /^#[0-9A-F]{6}$/i;
  if (!hexColorRegex.test(primaryColor)) {
    return { error: "Invalid primary color format. Must be hex color (e.g., #E31837)" };
  }
  if (!hexColorRegex.test(secondaryColor)) {
    return { error: "Invalid secondary color format. Must be hex color (e.g., #FFFFFF)" };
  }

  // SECURITY: HTML-escape user inputs to prevent XSS
  const safeName = escape(name.trim());
  const safeShortName = escape(shortName.trim());

  // Check for duplicate name within the league
  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .eq('league_id', leagueId) // Check within league
    .ilike("name", name.trim())
    .single();

  if (existing) {
    return { error: "A team with this name already exists in this league" };
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      league_id: leagueId, // CRITICAL: Associate team with league
      name: safeName,
      short_name: safeShortName.toUpperCase(),
      primary_color: primaryColor.toUpperCase(),  // Normalize to uppercase
      secondary_color: secondaryColor.toUpperCase(),
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
  } catch (error: any) {
    console.error("Error in createTeam:", error);
    return { error: error.message || 'Unauthorized or failed to create team' };
  }
}

export async function updateTeam(teamId: string, formData: FormData): Promise<TeamActionResult> {
  try {
    // Require owner or admin role to update teams
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

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
    .eq('league_id', leagueId) // Verify team belongs to league
    .single();

  if (!currentTeam) {
    return { error: "Team not found or does not belong to your league" };
  }

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
    .eq('league_id', leagueId) // CRITICAL: Only update teams in this league
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
  } catch (error: any) {
    console.error("Error in updateTeam:", error);
    return { error: error.message || 'Unauthorized or failed to update team' };
  }
}

export async function deleteTeam(teamId: string): Promise<TeamActionResult> {
  try {
    // Require owner or admin role to delete teams
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

  // Get team captain before deletion
  const { data: team } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", teamId)
    .eq('league_id', leagueId) // Verify team belongs to league
    .single();

  if (!team) {
    return { error: "Team not found or does not belong to your league" };
  }

  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq('league_id', leagueId); // CRITICAL: Only delete teams in this league

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
  } catch (error: any) {
    console.error("Error in deleteTeam:", error);
    return { error: error.message || 'Unauthorized or failed to delete team' };
  }
}

// Get available players who can be captains (filtered by league membership)
export async function getAvailableCaptains() {
  try {
    // Require owner or admin role to view available captains
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Get all users who are members of this league
    const { data: players, error } = await supabase
      .from('league_memberships')
      .select(`
        user_id,
        user:profiles (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .order('user(full_name)', { ascending: true });

  if (error) {
    console.error("Error fetching players:", error);
    return { error: error.message, players: [] };
  }

  // Extract user profiles from the join
  const profiles = players?.map(m => (m as any).user).filter(Boolean) || [];

  return { players: profiles };
  } catch (error: any) {
    console.error("Error in getAvailableCaptains:", error);
    return { error: error.message || 'Unauthorized', players: [] };
  }
}

// Check if current user is the captain of a team (league-aware)
async function requireCaptainOfTeam(teamId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", isCaptain: false };
    }

    // Get team with league information
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("captain_id, league_id")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      console.error("Error fetching team:", teamError);
      return { error: "Team not found", isCaptain: false };
    }

    // Check if user is a member of this league
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', team.league_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return { error: "Not authorized - you are not a member of this league", isCaptain: false };
    }

    // League owners and admins can edit any team
    if (membership.role === 'owner' || membership.role === 'admin') {
      return { isCaptain: true, userId: user.id, isOwner: true, leagueId: team.league_id };
    }

    // Check if user is captain of this specific team
    if (team.captain_id !== user.id) {
      return { error: "Not authorized - you are not the captain of this team", isCaptain: false };
    }

    return { isCaptain: true, userId: user.id, leagueId: team.league_id };
  } catch (error: any) {
    console.error("Error in requireCaptainOfTeam:", error);
    return { error: error.message || 'Authorization failed', isCaptain: false };
  }
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
    .eq('league_id', (auth as any).leagueId) // Verify team belongs to league
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
    .eq('league_id', (auth as any).leagueId) // Verify team belongs to league
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
    .eq('league_id', (auth as any).leagueId) // Verify team belongs to league
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
