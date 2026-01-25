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

// Get roster with player stats for captain team management
export async function getRosterWithPlayerStats(teamId: string, seasonId: string) {
  const supabase = await createClient();

  // Get roster with player details
  const { data: roster, error: rosterError } = await supabase
    .from("team_rosters")
    .select(`
      id,
      is_goalie,
      player:profiles!team_rosters_player_id_fkey(
        id, 
        full_name, 
        avatar_url, 
        jersey_number, 
        position,
        shot_hand,
        email
      )
    `)
    .eq("team_id", teamId)
    .eq("season_id", seasonId);

  if (rosterError || !roster) {
    console.error("Error fetching roster:", rosterError);
    return { roster: [] };
  }

  // Get verified completed games for this team
  const { data: teamGames } = await supabase
    .from("games")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .eq("home_captain_verified", true)
    .eq("away_captain_verified", true)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

  const totalTeamGames = teamGames?.length || 0;
  const gameIds = teamGames?.map(g => g.id) || [];

  // Get player stats
  const playerIds = roster.map(r => r.player?.id).filter(Boolean);
  let playerStatsMap: Record<string, { goals: number; assists: number; gamesPlayed: number }> = {};

  if (playerIds.length > 0 && gameIds.length > 0) {
    const { data: playerStats } = await supabase
      .from("player_stats")
      .select("player_id, goals, assists, game_id")
      .eq("team_id", teamId)
      .eq("season_id", seasonId)
      .in("game_id", gameIds);

    // Aggregate by player
    const gamesPerPlayer: Record<string, Set<string>> = {};
    (playerStats || []).forEach(stat => {
      if (!playerStatsMap[stat.player_id]) {
        playerStatsMap[stat.player_id] = { goals: 0, assists: 0, gamesPlayed: 0 };
        gamesPerPlayer[stat.player_id] = new Set();
      }
      playerStatsMap[stat.player_id].goals += stat.goals || 0;
      playerStatsMap[stat.player_id].assists += stat.assists || 0;
      gamesPerPlayer[stat.player_id].add(stat.game_id);
    });

    Object.keys(gamesPerPlayer).forEach(playerId => {
      if (playerStatsMap[playerId]) {
        playerStatsMap[playerId].gamesPlayed = gamesPerPlayer[playerId].size;
      }
    });
  }

  // Get goalie stats
  let goalieStatsMap: Record<string, { saves: number; goalsAgainst: number; gamesPlayed: number }> = {};
  const goalieIds = roster.filter(r => r.is_goalie).map(r => r.player?.id).filter(Boolean);

  if (goalieIds.length > 0 && gameIds.length > 0) {
    const { data: goalieStats } = await supabase
      .from("goalie_stats")
      .select("player_id, saves, goals_against, game_id")
      .eq("team_id", teamId)
      .eq("season_id", seasonId)
      .in("game_id", gameIds);

    const gamesPerGoalie: Record<string, Set<string>> = {};
    (goalieStats || []).forEach(stat => {
      if (!goalieStatsMap[stat.player_id]) {
        goalieStatsMap[stat.player_id] = { saves: 0, goalsAgainst: 0, gamesPlayed: 0 };
        gamesPerGoalie[stat.player_id] = new Set();
      }
      goalieStatsMap[stat.player_id].saves += stat.saves || 0;
      goalieStatsMap[stat.player_id].goalsAgainst += stat.goals_against || 0;
      gamesPerGoalie[stat.player_id].add(stat.game_id);
    });

    Object.keys(gamesPerGoalie).forEach(goalieId => {
      if (goalieStatsMap[goalieId]) {
        goalieStatsMap[goalieId].gamesPlayed = gamesPerGoalie[goalieId].size;
      }
    });
  }

  // Get active suspensions
  const { data: suspensions } = await supabase
    .from("suspensions")
    .select("player_id, reason, games_remaining, start_date, end_date")
    .in("player_id", playerIds)
    .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`);

  const suspensionMap: Record<string, { reason: string; gamesRemaining: number }> = {};
  (suspensions || []).forEach(s => {
    if (s.games_remaining > 0 || !s.end_date) {
      suspensionMap[s.player_id] = {
        reason: s.reason,
        gamesRemaining: s.games_remaining,
      };
    }
  });

  // Combine all data
  const rosterWithStats = roster.map(entry => {
    const playerId = entry.player?.id;
    const stats = playerStatsMap[playerId] || { goals: 0, assists: 0, gamesPlayed: 0 };
    const goalieStats = goalieStatsMap[playerId] || null;
    const suspension = suspensionMap[playerId] || null;

    const attendanceRate = totalTeamGames > 0
      ? Math.round((stats.gamesPlayed / totalTeamGames) * 100)
      : 0;

    return {
      ...entry,
      stats: {
        goals: stats.goals,
        assists: stats.assists,
        points: stats.goals + stats.assists,
        gamesPlayed: stats.gamesPlayed,
        attendanceRate,
      },
      goalieStats: entry.is_goalie ? goalieStats : null,
      suspension,
    };
  });

  return { roster: rosterWithStats, totalTeamGames };
}

// Create and send a team invite
export async function sendTeamInvite(
  teamId: string,
  seasonId: string,
  email: string,
  inviteType: "full_time" | "sub",
  message?: string
): Promise<RosterActionResult & { inviteToken?: string }> {
  const auth = await requireTeamAccess(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Check if there's already a pending invite for this email
  const { data: existingInvite } = await supabase
    .from("team_invites")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("season_id", seasonId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    return { error: "An invite has already been sent to this email" };
  }

  // Check if player with this email is already on the team
  const { data: existingPlayer } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (existingPlayer) {
    const { data: onRoster } = await supabase
      .from("team_rosters")
      .select("id")
      .eq("team_id", teamId)
      .eq("player_id", existingPlayer.id)
      .eq("season_id", seasonId)
      .single();

    if (onRoster) {
      return { error: "This player is already on your team" };
    }
  }

  // Create invite
  const { data: invite, error } = await supabase
    .from("team_invites")
    .insert({
      team_id: teamId,
      season_id: seasonId,
      email: normalizedEmail,
      invite_type: inviteType,
      invited_by: auth.userId,
      message: message || null,
    })
    .select("invite_token")
    .single();

  if (error) {
    console.error("Error creating invite:", error);
    return { error: error.message };
  }

  // Future Enhancement: Automated email invitation to players
  // Currently, team owners/captains manually notify players to register
  // When implemented, this will send an email with the invite link:
  // `${SITE_URL}/invite/${invite.invite_token}`
  console.log(`[Team Invite] Email would be sent to: ${normalizedEmail}`);
  console.log(`[Team Invite] Token: ${invite.invite_token}`);
  console.log(`[Team Invite] Type: ${inviteType}`);
  console.log(`[Team Invite] Message: ${message || "(none)"}`);

  revalidatePath("/captain/team");
  return { success: true, inviteToken: invite.invite_token };
}

// Get pending invites for a team
export async function getTeamInvites(teamId: string, seasonId: string) {
  const auth = await requireTeamAccess(teamId);
  if (auth.error) return { error: auth.error, invites: [] };

  const supabase = await createClient();

  const { data: invites, error } = await supabase
    .from("team_invites")
    .select(`
      id,
      email,
      invite_type,
      status,
      message,
      expires_at,
      created_at,
      inviter:profiles!team_invites_invited_by_fkey(full_name)
    `)
    .eq("team_id", teamId)
    .eq("season_id", seasonId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invites:", error);
    return { error: error.message, invites: [] };
  }

  return { invites: invites || [] };
}

// Cancel a team invite
export async function cancelTeamInvite(inviteId: string): Promise<RosterActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify user can cancel this invite
  const { data: invite } = await supabase
    .from("team_invites")
    .select("team_id, status")
    .eq("id", inviteId)
    .single();

  if (!invite) {
    return { error: "Invite not found" };
  }

  if (invite.status !== "pending") {
    return { error: "Can only cancel pending invites" };
  }

  const auth = await requireTeamAccess(invite.team_id);
  if (auth.error) return { error: auth.error };

  const { error } = await supabase
    .from("team_invites")
    .update({ status: "expired" })
    .eq("id", inviteId);

  if (error) {
    console.error("Error cancelling invite:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/team");
  return { success: true };
}

// Suspend a player (captain can suspend players on their team)
export async function suspendPlayer(
  teamId: string,
  playerId: string,
  reason: string,
  gamesRemaining: number
): Promise<RosterActionResult> {
  const auth = await requireTeamAccess(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Verify player is on this team
  const { data: rosterEntry } = await supabase
    .from("team_rosters")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_id", playerId)
    .single();

  if (!rosterEntry) {
    return { error: "Player is not on your team" };
  }

  // Create suspension
  const { error } = await supabase
    .from("suspensions")
    .insert({
      player_id: playerId,
      reason: reason,
      games_remaining: gamesRemaining,
      start_date: new Date().toISOString().split('T')[0],
      issued_by: auth.userId,
    });

  if (error) {
    console.error("Error suspending player:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/team");
  revalidatePath("/admin/suspensions");
  return { success: true };
}

// Remove/end a suspension
export async function endSuspension(suspensionId: string): Promise<RosterActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the suspension to verify permissions
  const { data: suspension } = await supabase
    .from("suspensions")
    .select("player_id, issued_by")
    .eq("id", suspensionId)
    .single();

  if (!suspension) {
    return { error: "Suspension not found" };
  }

  // Check if user is owner or the one who issued the suspension
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner = profile?.role === "owner";
  const isIssuer = suspension.issued_by === user.id;

  if (!isOwner && !isIssuer) {
    return { error: "Only the issuer or league owner can end this suspension" };
  }

  // End the suspension
  const { error } = await supabase
    .from("suspensions")
    .update({
      end_date: new Date().toISOString().split('T')[0],
      games_remaining: 0,
    })
    .eq("id", suspensionId);

  if (error) {
    console.error("Error ending suspension:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/team");
  revalidatePath("/admin/suspensions");
  return { success: true };
}
