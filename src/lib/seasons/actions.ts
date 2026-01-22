// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Season, SeasonStatus } from "@/types/database";

export type SeasonActionResult = {
  error?: string;
  success?: boolean;
  season?: Season;
  message?: string;
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

export async function getAllSeasons() {
  const supabase = await createClient();
  
  const { data: seasons, error } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching seasons:", error);
    return { error: error.message, seasons: [] };
  }

  return { seasons: seasons || [] };
}

export async function getActiveSeason() {
  const supabase = await createClient();
  
  const { data: season, error } = await supabase
    .from("seasons")
    .select("*")
    .in("status", ["active", "playoffs"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
    console.error("Error fetching active season:", error);
    return { error: error.message, season: null };
  }

  return { season: season || null };
}

export async function getSeasonById(seasonId: string) {
  const supabase = await createClient();
  
  const { data: season, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .single();

  if (error) {
    console.error("Error fetching season:", error);
    return { error: error.message, season: null };
  }

  return { season };
}

export async function createSeason(formData: FormData): Promise<SeasonActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const name = formData.get("name") as string;
  const startDate = formData.get("startDate") as string;
  const gamesPerCycle = parseInt(formData.get("gamesPerCycle") as string) || 13;
  const totalGames = parseInt(formData.get("totalGames") as string) || null;
  const playoffFormat = formData.get("playoffFormat") as string || "none";
  const draftScheduledAt = formData.get("draftScheduledAt") as string || null;
  const setActive = formData.get("setActive") === "true";
  const newStatus = setActive ? "active" as SeasonStatus : "draft" as SeasonStatus;

  // Validation
  if (!name || name.trim().length < 2) {
    return { error: "Season name must be at least 2 characters" };
  }
  if (!startDate) {
    return { error: "Start date is required" };
  }

  // Check for existing active season
  if (setActive) {
    const { data: activeSeasons } = await supabase
      .from("seasons")
      .select("id, name")
      .in("status", ["active", "playoffs"]);
    
    if (activeSeasons && activeSeasons.length > 0) {
      return { error: `Cannot create active season. Season "${activeSeasons[0].name}" is already active. Please complete or deactivate it first.` };
    }
  }

  // Check for existing draft season
  if (newStatus === "draft") {
    const { data: draftSeasons } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("status", "draft");
    
    if (draftSeasons && draftSeasons.length > 0) {
      return { error: `Cannot create draft season. Season "${draftSeasons[0].name}" is already in draft. Please complete the draft or set it to another status first.` };
    }
  }

  const { data: season, error } = await supabase
    .from("seasons")
    .insert({
      name: name.trim(),
      start_date: startDate,
      games_per_cycle: gamesPerCycle,
      total_games: totalGames,
      playoff_format: playoffFormat,
      draft_scheduled_at: draftScheduledAt,
      status: newStatus,
      current_game_count: 0,
      schedule_generated: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating season:", error);
    return { error: error.message };
  }

  // Import all existing teams for this season (with empty rosters)
  const { data: allTeams } = await supabase
    .from("teams")
    .select("id");

  if (allTeams && allTeams.length > 0) {
    // Teams are already in the teams table, they just need to be available for this season
    // The team_rosters table will be populated during the draft
    // No action needed here - teams are global and available for all seasons
    console.log(`Season created with ${allTeams.length} teams available for drafting`);
  }

  revalidatePath("/admin/seasons");
  revalidatePath("/standings");
  revalidatePath("/schedule");
  return { success: true, season };
}

export async function updateSeason(seasonId: string, formData: FormData): Promise<SeasonActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const name = formData.get("name") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string || null;
  const gamesPerCycle = parseInt(formData.get("gamesPerCycle") as string) || 13;

  // Validation
  if (!name || name.trim().length < 2) {
    return { error: "Season name must be at least 2 characters" };
  }

  const { data: season, error } = await supabase
    .from("seasons")
    .update({
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
      games_per_cycle: gamesPerCycle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", seasonId)
    .select()
    .single();

  if (error) {
    console.error("Error updating season:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/seasons");
  revalidatePath("/standings");
  return { success: true, season };
}

// Fix multiple active seasons - keep only the most recent one
export async function fixMultipleActiveSeasons(): Promise<SeasonActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Get all active/playoff seasons, ordered by start_date (most recent first)
  const { data: activeSeasons, error: fetchError } = await supabase
    .from("seasons")
    .select("id, name, start_date")
    .in("status", ["active", "playoffs"])
    .order("start_date", { ascending: false });

  if (fetchError) {
    console.error("Error fetching active seasons:", fetchError);
    return { error: fetchError.message };
  }

  if (!activeSeasons || activeSeasons.length <= 1) {
    return { success: true, message: "No multiple active seasons found" };
  }

  // Keep the first (most recent) one, deactivate the rest
  const seasonToKeep = activeSeasons[0];
  const seasonsToDeactivate = activeSeasons.slice(1);

  const seasonIdsToDeactivate = seasonsToDeactivate.map(s => s.id);

  const { error: updateError } = await supabase
    .from("seasons")
    .update({ 
      status: "completed" as SeasonStatus,
      end_date: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .in("id", seasonIdsToDeactivate);

  if (updateError) {
    console.error("Error deactivating seasons:", updateError);
    return { error: updateError.message };
  }

  revalidatePath("/admin/seasons");
  revalidatePath("/standings");
  revalidatePath("/schedule");
  revalidatePath("/stats");

  return { 
    success: true, 
    message: `Deactivated ${seasonsToDeactivate.length} season(s). Kept "${seasonToKeep.name}" as active.` 
  };
}

export async function updateSeasonStatus(seasonId: string, status: SeasonStatus): Promise<SeasonActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // If activating a season, check for existing active seasons and deactivate them
  if (status === "active" || status === "playoffs") {
    // First, get all active seasons (including the one we're about to activate)
    const { data: allActiveSeasons } = await supabase
      .from("seasons")
      .select("id, name, start_date")
      .in("status", ["active", "playoffs"])
      .order("start_date", { ascending: false });
    
    if (allActiveSeasons && allActiveSeasons.length > 0) {
      // Get the season we're activating to see if it should be kept
      const { data: seasonToActivate } = await supabase
        .from("seasons")
        .select("id, name, start_date")
        .eq("id", seasonId)
        .single();

      // Determine which season to keep (the one being activated, or the most recent if it's already active)
      const shouldKeepCurrent = seasonToActivate && 
        allActiveSeasons.some(s => s.id === seasonId);
      
      // Deactivate all active seasons except the one we're keeping
      const seasonsToDeactivate = shouldKeepCurrent
        ? allActiveSeasons.filter(s => s.id !== seasonId)
        : allActiveSeasons;

      if (seasonsToDeactivate.length > 0) {
        const seasonIdsToDeactivate = seasonsToDeactivate.map(s => s.id);
        const { error: deactivateError } = await supabase
          .from("seasons")
          .update({ 
            status: "completed" as SeasonStatus,
            end_date: new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .in("id", seasonIdsToDeactivate);

        if (deactivateError) {
          console.error("Error deactivating other seasons:", deactivateError);
          return { error: `Failed to deactivate other active seasons: ${deactivateError.message}` };
        }
      }
    }
  }

  // If setting to draft, check for existing draft seasons and complete them
  if (status === "draft") {
    const { data: draftSeasons } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("status", "draft")
      .neq("id", seasonId);
    
    if (draftSeasons && draftSeasons.length > 0) {
      // Complete other draft seasons (they should have finished their draft)
      await supabase
        .from("seasons")
        .update({ status: "completed" as SeasonStatus })
        .eq("status", "draft")
        .neq("id", seasonId);
    }
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Set end date when completing a season
  if (status === "completed") {
    updateData.end_date = new Date().toISOString().split("T")[0];
  }

  const { data: season, error } = await supabase
    .from("seasons")
    .update(updateData)
    .eq("id", seasonId)
    .select()
    .single();

  if (error) {
    console.error("Error updating season status:", error);
    return { error: error.message };
  }

  // Sync captains to their team rosters when season becomes active
  if (status === "active" || status === "playoffs" || status === "draft") {
    await syncCaptainsToRosters(seasonId);
  }

  revalidatePath("/admin/seasons");
  revalidatePath("/standings");
  revalidatePath("/schedule");
  return { success: true, season };
}

export async function deleteSeason(seasonId: string): Promise<SeasonActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Check if season has games
  const { data: games } = await supabase
    .from("games")
    .select("id")
    .eq("season_id", seasonId)
    .limit(1);

  if (games && games.length > 0) {
    return { error: "Cannot delete a season that has games. Archive it instead." };
  }

  const { error } = await supabase
    .from("seasons")
    .delete()
    .eq("id", seasonId);

  if (error) {
    console.error("Error deleting season:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/seasons");
  return { success: true };
}

// Increment game count for a season (called after a game is completed)
export async function incrementGameCount(seasonId: string): Promise<SeasonActionResult> {
  const supabase = await createClient();

  const { data: season, error: fetchError } = await supabase
    .from("seasons")
    .select("current_game_count, games_per_cycle")
    .eq("id", seasonId)
    .single();

  if (fetchError || !season) {
    return { error: "Season not found" };
  }

  const newCount = season.current_game_count + 1;
  const shouldTriggerDraft = newCount >= season.games_per_cycle;

  // If triggering draft, check for existing draft seasons and complete them
  if (shouldTriggerDraft) {
    const { data: draftSeasons } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("status", "draft")
      .neq("id", seasonId);
    
    if (draftSeasons && draftSeasons.length > 0) {
      // Complete other draft seasons (they should have finished their draft)
      await supabase
        .from("seasons")
        .update({ status: "completed" as SeasonStatus })
        .eq("status", "draft")
        .neq("id", seasonId);
    }
  }

  const { error } = await supabase
    .from("seasons")
    .update({
      current_game_count: shouldTriggerDraft ? 0 : newCount,
      status: shouldTriggerDraft ? "draft" as SeasonStatus : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", seasonId);

  if (error) {
    console.error("Error incrementing game count:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/seasons");
  return { success: true };
}

// End a season with validation
export async function endSeason(seasonId: string, forceEnd: boolean = false): Promise<SeasonActionResult & { 
  warnings?: string[];
  incompleteGames?: number;
  unverifiedGames?: number;
}> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Get season
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .single();

  if (seasonError || !season) {
    return { error: "Season not found" };
  }

  if (season.status === "completed") {
    return { error: "Season is already completed" };
  }

  // Check for incomplete games
  const { data: scheduledGames, error: gamesError } = await supabase
    .from("games")
    .select("id, status, home_captain_verified, away_captain_verified")
    .eq("season_id", seasonId)
    .in("status", ["scheduled", "in_progress"]);

  if (gamesError) {
    return { error: `Failed to check games: ${gamesError.message}` };
  }

  // Check for unverified completed games
  const { data: unverifiedGames, error: unverifiedError } = await supabase
    .from("games")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .or("home_captain_verified.eq.false,away_captain_verified.eq.false");

  if (unverifiedError) {
    return { error: `Failed to check verifications: ${unverifiedError.message}` };
  }

  const incompleteCount = scheduledGames?.length || 0;
  const unverifiedCount = unverifiedGames?.length || 0;
  const warnings: string[] = [];

  if (incompleteCount > 0) {
    warnings.push(`${incompleteCount} game(s) are still scheduled or in progress`);
  }
  if (unverifiedCount > 0) {
    warnings.push(`${unverifiedCount} completed game(s) have unverified stats`);
  }

  // If there are issues and not forcing, return with warnings
  if (!forceEnd && (incompleteCount > 0 || unverifiedCount > 0)) {
    return {
      error: "Season has incomplete items. Use force end to override.",
      warnings,
      incompleteGames: incompleteCount,
      unverifiedGames: unverifiedCount,
    };
  }

  // End the season
  const { data: updatedSeason, error: updateError } = await supabase
    .from("seasons")
    .update({
      status: "completed" as SeasonStatus,
      end_date: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", seasonId)
    .select()
    .single();

  if (updateError) {
    console.error("Error ending season:", updateError);
    return { error: updateError.message };
  }

  revalidatePath("/admin/seasons");
  revalidatePath("/standings");
  revalidatePath("/schedule");
  revalidatePath("/stats");

  return { 
    success: true, 
    season: updatedSeason,
    message: `Season "${season.name}" has been completed.${warnings.length > 0 ? ` (${warnings.join(", ")})` : ""}`,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// Get season end status (for UI display)
export async function getSeasonEndStatus(seasonId: string) {
  const supabase = await createClient();

  // Get game counts
  const { data: games } = await supabase
    .from("games")
    .select("id, status, home_captain_verified, away_captain_verified")
    .eq("season_id", seasonId);

  if (!games) {
    return { totalGames: 0, completedGames: 0, verifiedGames: 0, incompleteGames: 0, unverifiedGames: 0, canEnd: true };
  }

  const totalGames = games.length;
  const completedGames = games.filter(g => g.status === "completed").length;
  const incompleteGames = games.filter(g => g.status === "scheduled" || g.status === "in_progress").length;
  const unverifiedGames = games.filter(g => 
    g.status === "completed" && (!g.home_captain_verified || !g.away_captain_verified)
  ).length;
  const verifiedGames = games.filter(g => 
    g.status === "completed" && g.home_captain_verified && g.away_captain_verified
  ).length;

  return {
    totalGames,
    completedGames,
    verifiedGames,
    incompleteGames,
    unverifiedGames,
    canEnd: incompleteGames === 0 && unverifiedGames === 0,
  };
}

// Sync all team captains to their team rosters for the active season
// This ensures captains are always on their teams
export async function syncCaptainsToRosters(seasonId?: string): Promise<{ success: boolean; added: number; error?: string }> {
  const supabase = await createClient();

  // Get the season to sync (use provided or get active)
  let targetSeasonId = seasonId;
  if (!targetSeasonId) {
    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id")
      .in("status", ["active", "playoffs", "draft"])
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (!activeSeason) {
      return { success: false, added: 0, error: "No active season found" };
    }
    targetSeasonId = activeSeason.id;
  }

  // Get all teams with their captains
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, captain_id, name")
    .not("captain_id", "is", null);

  if (teamsError) {
    console.error("Error fetching teams:", teamsError);
    return { success: false, added: 0, error: teamsError.message };
  }

  if (!teams || teams.length === 0) {
    return { success: true, added: 0 };
  }

  // Get existing roster entries for this season
  const { data: existingRoster } = await supabase
    .from("team_rosters")
    .select("player_id, team_id")
    .eq("season_id", targetSeasonId);

  const existingPlayerTeams = new Map(
    existingRoster?.map(r => [r.player_id, r.team_id]) || []
  );

  // Find captains not on their team's roster
  const captainsToAdd = [];
  for (const team of teams) {
    if (!team.captain_id) continue;

    const existingTeamId = existingPlayerTeams.get(team.captain_id);
    
    // If captain is not on any roster, or on wrong team's roster
    if (!existingTeamId) {
      // Check if captain is a goalie
      const { data: captainProfile } = await supabase
        .from("profiles")
        .select("position")
        .eq("id", team.captain_id)
        .single();

      captainsToAdd.push({
        team_id: team.id,
        player_id: team.captain_id,
        season_id: targetSeasonId,
        is_goalie: captainProfile?.position === "G",
      });
    }
  }

  if (captainsToAdd.length === 0) {
    return { success: true, added: 0 };
  }

  // Add missing captains to rosters
  const { error: insertError } = await supabase
    .from("team_rosters")
    .insert(captainsToAdd);

  if (insertError) {
    console.error("Error adding captains to rosters:", insertError);
    return { success: false, added: 0, error: insertError.message };
  }

  console.log(`Synced ${captainsToAdd.length} captains to their team rosters for season ${targetSeasonId}`);
  
  revalidatePath("/teams");
  revalidatePath("/admin/teams");
  revalidatePath("/captain/team");

  return { success: true, added: captainsToAdd.length };
}
