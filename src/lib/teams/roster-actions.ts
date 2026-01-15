// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TeamRoster } from "@/types/database";

export type RosterActionResult = {
  error?: string;
  success?: boolean;
};

// Check if current user is an owner or captain of the team
async function requireTeamAccess(teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", hasAccess: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Owners have access to all teams
  if (profile?.role === "owner") {
    return { hasAccess: true, userId: user.id, isOwner: true };
  }

  // Captains only have access to their own team
  if (profile?.role === "captain") {
    const { data: team } = await supabase
      .from("teams")
      .select("captain_id")
      .eq("id", teamId)
      .single();

    if (team?.captain_id === user.id) {
      return { hasAccess: true, userId: user.id, isCaptain: true };
    }
  }

  return { error: "Not authorized to manage this team's roster", hasAccess: false };
}

export async function getTeamRoster(teamId: string, seasonId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from("team_rosters")
    .select(`
      *,
      player:profiles!team_rosters_player_id_fkey(
        id, full_name, email, avatar_url, jersey_number, position, role
      ),
      team:teams!team_rosters_team_id_fkey(id, name, short_name),
      season:seasons!team_rosters_season_id_fkey(id, name, status)
    `)
    .eq("team_id", teamId);

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data: roster, error } = await query.order("joined_at", { ascending: true });

  if (error) {
    console.error("Error fetching roster:", error);
    return { error: error.message, roster: [] };
  }

  return { roster: roster || [] };
}

export async function getPlayersNotOnTeam(teamId: string, seasonId: string) {
  const supabase = await createClient();
  
  // Get players already on this team for this season
  const { data: currentRoster } = await supabase
    .from("team_rosters")
    .select("player_id")
    .eq("team_id", teamId)
    .eq("season_id", seasonId);

  const currentPlayerIds = currentRoster?.map(r => r.player_id) || [];

  // Get all players not on this team
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, jersey_number, position, role")
    .order("full_name", { ascending: true });

  if (currentPlayerIds.length > 0) {
    query = query.not("id", "in", `(${currentPlayerIds.join(",")})`);
  }

  const { data: players, error } = await query;

  if (error) {
    console.error("Error fetching available players:", error);
    return { error: error.message, players: [] };
  }

  return { players: players || [] };
}

export async function addPlayerToRoster(
  teamId: string, 
  playerId: string, 
  seasonId: string,
  isGoalie: boolean = false
): Promise<RosterActionResult> {
  const auth = await requireTeamAccess(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Check if player is already on a team for this season
  const { data: existingRoster } = await supabase
    .from("team_rosters")
    .select("id, team:teams!team_rosters_team_id_fkey(name)")
    .eq("player_id", playerId)
    .eq("season_id", seasonId)
    .single();

  if (existingRoster) {
    return { error: `Player is already on ${(existingRoster.team as { name: string })?.name || "another team"} for this season` };
  }

  const { error } = await supabase
    .from("team_rosters")
    .insert({
      team_id: teamId,
      player_id: playerId,
      season_id: seasonId,
      is_goalie: isGoalie,
    });

  if (error) {
    console.error("Error adding player to roster:", error);
    return { error: error.message };
  }

  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/captain/team");
  return { success: true };
}

export async function removePlayerFromRoster(
  teamId: string,
  playerId: string,
  seasonId: string
): Promise<RosterActionResult> {
  const auth = await requireTeamAccess(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("team_rosters")
    .delete()
    .eq("team_id", teamId)
    .eq("player_id", playerId)
    .eq("season_id", seasonId);

  if (error) {
    console.error("Error removing player from roster:", error);
    return { error: error.message };
  }

  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/captain/team");
  return { success: true };
}

export async function updatePlayerGoalieStatus(
  teamId: string,
  playerId: string,
  seasonId: string,
  isGoalie: boolean
): Promise<RosterActionResult> {
  const auth = await requireTeamAccess(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("team_rosters")
    .update({ is_goalie: isGoalie })
    .eq("team_id", teamId)
    .eq("player_id", playerId)
    .eq("season_id", seasonId);

  if (error) {
    console.error("Error updating goalie status:", error);
    return { error: error.message };
  }

  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

// Move a player from one team to another
export async function movePlayer(
  playerId: string,
  fromTeamId: string,
  toTeamId: string,
  seasonId: string
): Promise<RosterActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Only owners can move players between teams
  if (profile?.role !== "owner") {
    return { error: "Only league owners can move players between teams" };
  }

  // Get current roster entry
  const { data: currentRoster } = await supabase
    .from("team_rosters")
    .select("is_goalie")
    .eq("team_id", fromTeamId)
    .eq("player_id", playerId)
    .eq("season_id", seasonId)
    .single();

  if (!currentRoster) {
    return { error: "Player is not on the source team" };
  }

  // Check if player is already on the destination team
  const { data: existingOnNewTeam } = await supabase
    .from("team_rosters")
    .select("id")
    .eq("team_id", toTeamId)
    .eq("player_id", playerId)
    .eq("season_id", seasonId)
    .single();

  if (existingOnNewTeam) {
    return { error: "Player is already on the destination team" };
  }

  // Remove from old team
  const { error: removeError } = await supabase
    .from("team_rosters")
    .delete()
    .eq("team_id", fromTeamId)
    .eq("player_id", playerId)
    .eq("season_id", seasonId);

  if (removeError) {
    return { error: removeError.message };
  }

  // Add to new team
  const { error: addError } = await supabase
    .from("team_rosters")
    .insert({
      team_id: toTeamId,
      player_id: playerId,
      season_id: seasonId,
      is_goalie: currentRoster.is_goalie,
    });

  if (addError) {
    // Try to rollback
    await supabase
      .from("team_rosters")
      .insert({
        team_id: fromTeamId,
        player_id: playerId,
        season_id: seasonId,
        is_goalie: currentRoster.is_goalie,
      });
    return { error: addError.message };
  }

  revalidatePath(`/admin/teams/${fromTeamId}`);
  revalidatePath(`/admin/teams/${toTeamId}`);
  revalidatePath("/admin/teams");
  revalidatePath(`/teams/${fromTeamId}`);
  revalidatePath(`/teams/${toTeamId}`);
  revalidatePath("/teams");
  revalidatePath("/captain/team");
  revalidatePath("/captain");
  revalidatePath("/dashboard/team");
  revalidatePath("/standings");
  return { success: true };
}
