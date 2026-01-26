"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculatePlayerRatings } from "./rating";
import type { Draft, DraftPick, SeasonStatus } from "@/types/database";
import { requireLeagueRole, getActiveLeagueId } from "@/lib/auth/league-context";

export type DraftActionResult = {
  error?: string;
  success?: boolean;
  draft?: Draft;
};

// Start a new draft
export async function startDraft(seasonId: string, cycleNumber: number): Promise<DraftActionResult> {
  try {
    // Require owner or admin role to start draft
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Calculate player ratings first (don't fail if this errors)
    try {
      await calculatePlayerRatings(seasonId);
    } catch (error: any) {
      console.error("Error calculating player ratings (continuing anyway):", error);
      // Continue with draft even if ratings calculation fails
    }

    // Get all teams in this league
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id")
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .order("name", { ascending: true });

    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      return { error: `Failed to fetch teams: ${teamsError.message}` };
    }

    if (!teams || teams.length === 0) {
      return { error: "No teams found. Create teams before starting a draft." };
    }

    // Check if a draft already exists for this season (any cycle, pending or in_progress)
    const { data: activeDrafts } = await supabase
      .from("drafts")
      .select("*")
      .eq("season_id", seasonId)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1);

    let draft;

    // If there's an active draft, use it
    if (activeDrafts && activeDrafts.length > 0) {
      draft = activeDrafts[0];
      // Ensure draft has a draft_link if it doesn't have one
      if (!draft.draft_link) {
        const draftLink = `draft-${seasonId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const { data: updatedDraft } = await supabase
          .from("drafts")
          .update({ draft_link: draftLink })
          .eq("id", draft.id)
          .eq('league_id', leagueId) // CRITICAL: Only update drafts in this league
          .select()
          .single();
        if (updatedDraft) {
          draft = updatedDraft;
        }
      }
      console.log("Using existing active draft:", draft.id);
    } else {
      // Check if a draft exists for this specific cycle number
      const { data: existingDraft } = await supabase
        .from("drafts")
        .select("*")
        .eq("season_id", seasonId)
        .eq('league_id', leagueId) // CRITICAL: Filter by league
        .eq("cycle_number", cycleNumber)
        .single();
      // Check if we need to find the next available cycle number
      let actualCycleNumber = cycleNumber;
      if (existingDraft && existingDraft.status === "completed") {
        // Find the highest cycle number for this season and increment
        const { data: maxCycle } = await supabase
          .from("drafts")
          .select("cycle_number")
          .eq("season_id", seasonId)
          .eq('league_id', leagueId) // CRITICAL: Filter by league
          .order("cycle_number", { ascending: false })
          .limit(1)
          .single();

        if (maxCycle) {
          actualCycleNumber = maxCycle.cycle_number + 1;
        }
      }

      // Generate unique draft link
      const draftLink = `draft-${seasonId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Create draft in "pending" status - will be set to "in_progress" after order is assigned
      const { data: newDraft, error } = await supabase
        .from("drafts")
        .insert({
          league_id: leagueId, // CRITICAL: Associate draft with league
          season_id: seasonId,
          cycle_number: actualCycleNumber,
          status: "pending", // Start as pending until order is assigned
          current_pick: 1,
          draft_link: draftLink,
          draft_order_assigned: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating draft:", error);
        // If it's a duplicate key error, try to get the existing draft
        if (error.code === "23505" || error.message.includes("duplicate key")) {
          const { data: existing } = await supabase
            .from("drafts")
            .select("*")
            .eq("season_id", seasonId)
            .eq('league_id', leagueId) // CRITICAL: Filter by league
            .eq("cycle_number", actualCycleNumber)
            .single();

          if (existing) {
            draft = existing;
            console.log("Found existing draft after duplicate key error:", draft.id);
          } else {
            return { error: `A draft already exists for this season (cycle ${actualCycleNumber}). Please continue with the existing draft.` };
          }
        } else {
          return { error: error.message };
        }
      } else {
        draft = newDraft;
      }
    }

    // Check for existing draft seasons in this league and complete them (only one draft at a time)
    const { data: existingDraftSeasons } = await supabase
      .from("seasons")
      .select("id, name")
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .eq("status", "draft")
      .neq("id", seasonId);

    if (existingDraftSeasons && existingDraftSeasons.length > 0) {
      // Complete other draft seasons (they should have finished their draft)
      await supabase
        .from("seasons")
        .update({ status: "completed" as SeasonStatus })
        .eq('league_id', leagueId) // CRITICAL: Only update seasons in this league
        .eq("status", "draft")
        .neq("id", seasonId);
    }

    // Update season status to draft
    const { error: seasonUpdateError } = await supabase
      .from("seasons")
      .update({ status: "draft" })
      .eq("id", seasonId)
      .eq('league_id', leagueId); // CRITICAL: Only update seasons in this league

    if (seasonUpdateError) {
      console.error("Error updating season status:", seasonUpdateError);
      return { error: `Failed to update season status: ${seasonUpdateError.message}` };
    }

    // Send email notifications to all captains (non-blocking) - only for new drafts
    const wasNewDraft = !activeDrafts || activeDrafts.length === 0;
    if (wasNewDraft) {
      try {
        const { sendDraftNotificationEmail } = await import("./email");
        const { data: season } = await supabase
          .from("seasons")
          .select("name")
          .eq("id", seasonId)
          .eq('league_id', leagueId) // CRITICAL: Filter by league
          .single();

        if (season && draft) {
          // Don't await - let it run in background
          sendDraftNotificationEmail(draft.id, season.name, draft.draft_link || "").catch((emailError) => {
            console.error("Error sending draft notification emails (non-blocking):", emailError);
          });
        }
      } catch (error) {
        console.error("Error setting up draft notification emails:", error);
        // Don't fail the draft start if email setup fails
      }
    }

    revalidatePath("/admin/draft");
    revalidatePath("/captain/draft");
    return { success: true, draft };
  } catch (error: any) {
    console.error("Error in startDraft:", error);
    return { error: error.message || 'Unauthorized or failed to start draft' };
  }
}

// Activate draft after order is assigned
export async function activateDraft(draftId: string): Promise<DraftActionResult> {
  try {
    // Require owner or admin role to activate draft
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Check if draft order is assigned
    const { data: draft } = await supabase
      .from("drafts")
      .select("draft_order_assigned, status, season_id")
      .eq("id", draftId)
      .eq('league_id', leagueId) // CRITICAL: Verify draft belongs to league
      .single();

    if (!draft) {
      return { error: "Draft not found or does not belong to your league" };
    }

    if (!draft.draft_order_assigned) {
      return { error: "Draft order must be assigned before activating the draft" };
    }

    // Get all teams in this league with their captains
    const { data: teams } = await supabase
      .from("teams")
      .select("id, captain_id, name")
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .not("captain_id", "is", null);

    if (teams && teams.length > 0) {
      // Clear any existing rosters for this season (fresh start)
      await supabase
        .from("team_rosters")
        .delete()
        .eq("season_id", draft.season_id);

      // Add captains to their team rosters first (they're always first on roster)
      const captainRosterEntries = [];
      for (const team of teams) {
        if (team.captain_id) {
          // SECURITY: Check if captain is a goalie with proper null checking
          const { data: captainProfile, error: profileError } = await supabase
            .from("profiles")
            .select("position")
            .eq("id", team.captain_id)
            .single();

          if (profileError || !captainProfile) {
            console.warn(`Captain profile not found for team ${team.id}, captain ${team.captain_id}`);
            // Skip this captain if profile doesn't exist
            continue;
          }

          captainRosterEntries.push({
            team_id: team.id,
            player_id: team.captain_id,
            season_id: draft.season_id,
            is_goalie: captainProfile.position === "G",
          });
        }
      }

      if (captainRosterEntries.length > 0) {
        const { error: rosterError } = await supabase
          .from("team_rosters")
          .insert(captainRosterEntries);

        if (rosterError) {
          console.error("Error adding captains to rosters:", rosterError);
          // Don't fail the activation, just log the error
        } else {
          console.log(`Added ${captainRosterEntries.length} captains to their team rosters`);
        }
      }
    }

    // Update draft status to in_progress
    const { data: updatedDraft, error } = await supabase
      .from("drafts")
      .update({ status: "in_progress" })
      .eq("id", draftId)
      .eq('league_id', leagueId) // CRITICAL: Only update drafts in this league
      .select()
      .single();

    if (error) {
      console.error("Error activating draft:", error);
      return { error: error.message };
    }

    revalidatePath("/admin/draft");
    revalidatePath("/captain/draft");
    return { success: true, draft: updatedDraft };
  } catch (error: any) {
    console.error("Error in activateDraft:", error);
    return { error: error.message || 'Unauthorized or failed to activate draft' };
  }
}

// Get current draft
export async function getCurrentDraft(seasonId: string, draftLink?: string) {
  try {
    // Require league membership (any role can view drafts)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    let query = supabase
      .from("drafts")
      .select(`
        *,
        season:seasons!drafts_season_id_fkey(id, name)
      `)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .in("status", ["pending", "in_progress"]);

    // If draft link provided, use it to find the specific draft
    if (draftLink) {
      query = query.eq("draft_link", draftLink);
    } else {
      // Otherwise, get draft for this season
      query = query.eq("season_id", seasonId);
    }

    const { data: draft } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return { draft: draft || null };
  } catch (error: any) {
    console.error("Error in getCurrentDraft:", error);
    return { error: error.message || 'Unauthorized', draft: null };
  }
}

// Get draft picks
export async function getDraftPicks(draftId: string) {
  try {
    // Require league membership (any role can view draft picks)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    // First verify draft belongs to league
    const { data: draft } = await supabase
      .from("drafts")
      .select("id")
      .eq("id", draftId)
      .eq('league_id', leagueId) // CRITICAL: Verify draft belongs to league
      .single();

    if (!draft) {
      return { error: "Draft not found or does not belong to your league", picks: [] };
    }

    const { data: picks, error } = await supabase
      .from("draft_picks")
      .select(`
        *,
        team:teams!draft_picks_team_id_fkey(id, name, short_name, primary_color),
        player:profiles!draft_picks_player_id_fkey(id, full_name, jersey_number, position)
      `)
      .eq("draft_id", draftId)
      .order("pick_number", { ascending: true });

    if (error) {
      console.error("Error fetching draft picks:", error);
      return { error: error.message, picks: [] };
    }

    return { picks: picks || [] };
  } catch (error: any) {
    console.error("Error in getDraftPicks:", error);
    return { error: error.message || 'Unauthorized', picks: [] };
  }
}

// Make a draft pick
export async function makeDraftPick(
  draftId: string,
  teamId: string,
  playerId: string
): Promise<DraftActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get league context
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    // Get user's role in league
    const { data: membership } = await supabase
      .from("league_memberships")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return { error: "Not authorized - not a member of this league" };
    }

    // Verify user is captain of this team or owner/admin
    if (membership.role !== "owner" && membership.role !== "admin") {
      const { data: team } = await supabase
        .from("teams")
        .select("captain_id")
        .eq("id", teamId)
        .eq('league_id', leagueId) // CRITICAL: Verify team belongs to league
        .single();

      if (!team || team.captain_id !== user.id) {
        return { error: "Not authorized - must be team captain, admin, or owner" };
      }
    }

    // Get draft info and verify it belongs to league
    const { data: draft } = await supabase
      .from("drafts")
      .select("*")
      .eq("id", draftId)
      .eq('league_id', leagueId) // CRITICAL: Verify draft belongs to league
      .single();

    if (!draft) {
      return { error: "Draft not found or does not belong to your league" };
    }

    if (draft.status !== "in_progress") {
      return { error: "Draft is not in progress" };
    }

    // Get draft order
    const { data: draftOrder } = await supabase
      .from("draft_order")
      .select("team_id, pick_position")
      .eq("draft_id", draftId)
      .order("pick_position", { ascending: true });

    if (!draftOrder || draftOrder.length === 0) {
      return { error: "Draft order has not been assigned yet" };
    }

    const totalTeams = draftOrder.length;
    const round = Math.ceil(draft.current_pick / totalTeams);
    const isOddRound = round % 2 === 1;
    const positionInRound = ((draft.current_pick - 1) % totalTeams) + 1;

    // Calculate which team should pick based on draft order
    let expectedTeamPosition: number;
    if (isOddRound) {
      expectedTeamPosition = positionInRound;
    } else {
      expectedTeamPosition = totalTeams - positionInRound + 1;
    }

    const expectedTeam = draftOrder.find(
      (order) => order.pick_position === expectedTeamPosition
    );

    // Check if it's this team's turn (owners/admins can bypass this check for testing)
    const isOwnerOrAdmin = membership.role === "owner" || membership.role === "admin";

    if (!isOwnerOrAdmin) {
      if (!expectedTeam || expectedTeam.team_id !== teamId) {
        return { error: "It's not your team's turn to pick" };
      }
    }

    // Check if player is already drafted
    const { data: existingPick } = await supabase
      .from("draft_picks")
      .select("id")
      .eq("draft_id", draftId)
      .eq("player_id", playerId)
      .single();

    if (existingPick) {
      return { error: "Player has already been drafted" };
    }

    // Make the pick
    const { error: pickError } = await supabase
      .from("draft_picks")
      .insert({
        league_id: leagueId,
        draft_id: draftId,
        team_id: teamId,
        player_id: playerId,
        pick_number: draft.current_pick,
        round: round,
      });

    if (pickError) {
      console.error("Error making draft pick:", pickError);
      return { error: pickError.message };
    }

    // Update draft current pick
    const totalPicks = totalTeams * 10; // Assuming 10 rounds
    const nextPick = draft.current_pick + 1;
    const isComplete = nextPick > totalPicks;

    const { error: updateError } = await supabase
      .from("drafts")
      .update({
        current_pick: isComplete ? draft.current_pick : nextPick,
        status: isComplete ? "completed" : "in_progress",
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      .eq("id", draftId)
      .eq('league_id', leagueId); // CRITICAL: Only update drafts in this league

    if (updateError) {
      console.error("Error updating draft:", updateError);
      return { error: updateError.message };
    }

    // If draft is complete, automatically finalize it (assign players to rosters, change season to active)
    if (isComplete) {
      console.log("Draft complete - automatically finalizing...");
      // Call completeDraft to assign players to rosters and transition season to active
      // We need to do this here to avoid leaving the season in "draft" status
      await finalizeCompletedDraft(draftId, draft.season_id, leagueId);
    }

    revalidatePath("/admin/draft");
    revalidatePath("/captain/draft");
    return { success: true };
  } catch (error: any) {
    console.error("Error in makeDraftPick:", error);
    return { error: error.message || 'Unauthorized or failed to make draft pick' };
  }
}

// Get available players for draft (with ratings)
// Shows ALL players who opted in as full-time for this season
export async function getAvailableDraftPlayers(draftId: string) {
  try {
    // Require league membership (any role can view available players)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    // Get draft and verify it belongs to league
    const { data: draft } = await supabase
      .from("drafts")
      .select("season_id")
      .eq("id", draftId)
      .eq('league_id', leagueId) // CRITICAL: Verify draft belongs to league
      .single();

    if (!draft) {
      return { error: "Draft not found or does not belong to your league", players: [] };
    }

    // Get already drafted players
    const { data: draftedPlayers } = await supabase
      .from("draft_picks")
      .select("player_id")
      .eq("draft_id", draftId);

    const draftedPlayerIds = draftedPlayers?.map(p => p.player_id) || [];

    // Get players already on rosters (captains are added when draft activates)
    const { data: rosterPlayers } = await supabase
      .from("team_rosters")
      .select("player_id")
      .eq("season_id", draft.season_id);

    const rosterPlayerIds = rosterPlayers?.map(r => r.player_id) || [];

    // Get ALL players who opted in as full-time for this season
    const { data: optIns } = await supabase
      .from("season_opt_ins")
      .select("player_id")
      .eq("season_id", draft.season_id)
      .eq("opt_in_type", "full_time");

    const optedInPlayerIds = optIns?.map(oi => oi.player_id) || [];

    if (optedInPlayerIds.length === 0) {
      return { players: [] };
    }

    // Filter out already drafted players AND players already on rosters (captains)
    const unavailableIds = new Set([...draftedPlayerIds, ...rosterPlayerIds]);
    const availablePlayerIds = optedInPlayerIds.filter(id => !unavailableIds.has(id));

    if (availablePlayerIds.length === 0) {
      return { players: [] };
    }

    // Get player ratings for this season (for all available players)
    // If no rating exists, create a default one
    const { data: ratings } = await supabase
      .from("player_ratings")
      .select(`
        *,
        player:profiles!player_ratings_player_id_fkey(
          id,
          full_name,
          jersey_number,
          position,
          avatar_url
        )
      `)
      .eq("season_id", draft.season_id)
      .in("player_id", availablePlayerIds);

    // Get players without ratings and create default entries
    const ratedPlayerIds = new Set((ratings || []).map(r => r.player_id));
    const unratedPlayerIds = availablePlayerIds.filter(id => !ratedPlayerIds.has(id));

    if (unratedPlayerIds.length > 0) {
      // Get player profiles for unrated players
      const { data: unratedPlayers } = await supabase
        .from("profiles")
        .select("id, full_name, jersey_number, position, avatar_url")
        .in("id", unratedPlayerIds);

      // Create default ratings for unrated players
      const defaultRatings = (unratedPlayers || []).map(player => ({
        player_id: player.id,
        rating: "C" as const, // Default rating
        games_played: 0,
        attendance_rate: 0,
        points_per_game: 0,
        goals_per_game: 0,
        assists_per_game: 0,
        player: {
          id: player.id,
          full_name: player.full_name,
          jersey_number: player.jersey_number,
          position: player.position,
          avatar_url: player.avatar_url,
        },
      }));

      return {
        players: [
          ...(ratings || []),
          ...defaultRatings,
        ].sort((a, b) => {
          // Sort by rating first, then by name
          const ratingOrder: Record<string, number> = {
            "A+": 0, "A": 1, "A-": 2,
            "B+": 3, "B": 4, "B-": 5,
            "C+": 6, "C": 7, "C-": 8,
            "D+": 9, "D": 10, "D-": 11,
          };
          const aRating = a.rating || "C";
          const bRating = b.rating || "C";
          const ratingDiff = (ratingOrder[aRating] || 99) - (ratingOrder[bRating] || 99);
          if (ratingDiff !== 0) return ratingDiff;
          // Type-safe player name extraction using helpers
          const getPlayerName = (player: any): string => {
            if (!player || typeof player !== 'object') return "";
            if ('full_name' in player && player.full_name) {
              return String(player.full_name);
            }
            return "";
          };
          const aName = getPlayerName(a.player);
          const bName = getPlayerName(b.player);
          return aName.localeCompare(bName);
        })
      };
    }

    return {
      players: (ratings || []).sort((a, b) => {
        const ratingOrder: Record<string, number> = {
          "A+": 0, "A": 1, "A-": 2,
          "B+": 3, "B": 4, "B-": 5,
          "C+": 6, "C": 7, "C-": 8,
          "D+": 9, "D": 10, "D-": 11,
        };
        const aRating = a.rating || "C";
        const bRating = b.rating || "C";
        const ratingDiff = (ratingOrder[aRating] || 99) - (ratingOrder[bRating] || 99);
        if (ratingDiff !== 0) return ratingDiff;
        // Type-safe player name extraction using helpers
        const getPlayerName = (player: any): string => {
          if (!player || typeof player !== 'object') return "";
          if ('full_name' in player && player.full_name) {
            return String(player.full_name);
          }
          return "";
        };
        const aName = getPlayerName(a.player);
        const bName = getPlayerName(b.player);
        return aName.localeCompare(bName);
      })
    };
  } catch (error: any) {
    console.error("Error in getAvailableDraftPlayers:", error);
    return { error: error.message || 'Unauthorized', players: [] };
  }
}

// Internal function to finalize a completed draft (called automatically when last pick is made)
async function finalizeCompletedDraft(draftId: string, seasonId: string, leagueId: string): Promise<void> {
  const supabase = await createClient();

  // Get all draft picks
  const { data: picks } = await supabase
    .from("draft_picks")
    .select("team_id, player_id")
    .eq("draft_id", draftId);

  if (!picks || picks.length === 0) {
    console.error("No picks found in draft during finalization");
    return;
  }

  // Get existing roster entries (captains were added when draft was activated)
  const { data: existingRoster } = await supabase
    .from("team_rosters")
    .select("player_id")
    .eq("season_id", seasonId);

  const existingPlayerIds = new Set(existingRoster?.map(r => r.player_id) || []);

  // Create roster entries only for players not already on a roster (skip captains)
  const newRosterEntries = picks
    .filter(pick => !existingPlayerIds.has(pick.player_id))
    .map(pick => ({
      league_id: leagueId,
      team_id: pick.team_id,
      player_id: pick.player_id,
      season_id: seasonId,
      is_goalie: false,
    }));

  // Check which players are goalies
  for (let i = 0; i < newRosterEntries.length; i++) {
    const { data: player } = await supabase
      .from("profiles")
      .select("position")
      .eq("id", newRosterEntries[i].player_id)
      .single();

    newRosterEntries[i].is_goalie = player?.position === "G";
  }

  if (newRosterEntries.length > 0) {
    const { error: rosterError } = await supabase
      .from("team_rosters")
      .insert(newRosterEntries);

    if (rosterError) {
      console.error("Error creating rosters during finalization:", rosterError);
    }
  }

  // Check for existing active seasons in this league and deactivate them (only one active at a time)
  const { data: existingActiveSeasons } = await supabase
    .from("seasons")
    .select("id, name")
    .eq('league_id', leagueId) // CRITICAL: Filter by league
    .in("status", ["active", "playoffs"])
    .neq("id", seasonId);

  if (existingActiveSeasons && existingActiveSeasons.length > 0) {
    await supabase
      .from("seasons")
      .update({ status: "completed" as SeasonStatus })
      .eq('league_id', leagueId) // CRITICAL: Only update seasons in this league
      .in("status", ["active", "playoffs"])
      .neq("id", seasonId);
  }

  // Update season status to active (draft is done!)
  await supabase
    .from("seasons")
    .update({
      status: "active",
      current_game_count: 0,
    })
    .eq("id", seasonId)
    .eq('league_id', leagueId); // CRITICAL: Only update seasons in this league

  console.log(`Draft finalized: Season ${seasonId} is now active`);

  // Generate schedule if season has total_games set and schedule not already generated
  const { data: season } = await supabase
    .from("seasons")
    .select("total_games, schedule_generated")
    .eq("id", seasonId)
    .eq('league_id', leagueId) // CRITICAL: Filter by league
    .single();

  if (season && season.total_games && !season.schedule_generated) {
    const { generateSeasonSchedule } = await import("@/lib/seasons/schedule-generator");
    const scheduleResult = await generateSeasonSchedule(seasonId, "random");
    
    if (scheduleResult.error) {
      console.error("Error generating schedule:", scheduleResult.error);
    } else {
      console.log(`Schedule generated: ${scheduleResult.gamesCreated} games created`);
    }
  }

  // Auto-generate draft grades article (non-blocking)
  try {
    const { generateAIArticle } = await import("../admin/article-actions");
    const result = await generateAIArticle("draft_grades", draftId);
    if (result.success && result.content) {
      await supabase
        .from("articles")
        .insert({
          league_id: leagueId,
          title: result.title || "Draft Grades",
          content: result.content,
          type: "draft_grades",
          published: true,
          published_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error("Error auto-generating draft grades:", error);
  }

  // Revalidate paths
  revalidatePath("/admin/draft");
  revalidatePath("/captain/draft");
  revalidatePath("/teams");
  revalidatePath("/news");
  revalidatePath("/schedule");
  revalidatePath("/admin/seasons");
}

// Complete draft and assign players to teams (legacy - now called automatically)
export async function completeDraft(draftId: string): Promise<DraftActionResult> {
  try {
    // Require owner or admin role to complete draft
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Get draft and verify it belongs to league
    const { data: draft } = await supabase
      .from("drafts")
      .select("season_id, status")
      .eq("id", draftId)
      .eq('league_id', leagueId) // CRITICAL: Verify draft belongs to league
      .single();

    if (!draft) {
      return { error: "Draft not found or does not belong to your league" };
    }

    if (draft.status !== "completed") {
      return { error: "Draft is not completed yet" };
    }

    // Get all draft picks
    const { data: picks } = await supabase
      .from("draft_picks")
      .select("team_id, player_id")
      .eq("draft_id", draftId);

    if (!picks || picks.length === 0) {
      return { error: "No picks found in draft" };
    }

    // Get existing roster entries (captains were added when draft was activated)
    const { data: existingRoster } = await supabase
      .from("team_rosters")
      .select("player_id")
      .eq("season_id", draft.season_id);

    const existingPlayerIds = new Set(existingRoster?.map(r => r.player_id) || []);

    // Create roster entries only for players not already on a roster (skip captains)
    const newRosterEntries = picks
      .filter(pick => !existingPlayerIds.has(pick.player_id))
      .map(pick => ({
        league_id: leagueId,
        team_id: pick.team_id,
        player_id: pick.player_id,
        season_id: draft.season_id,
        is_goalie: false, // Will be set below
      }));

    // Check which players are goalies
    for (let i = 0; i < newRosterEntries.length; i++) {
      const { data: player } = await supabase
        .from("profiles")
        .select("position")
        .eq("id", newRosterEntries[i].player_id)
        .single();

      newRosterEntries[i].is_goalie = player?.position === "G";
    }

    if (newRosterEntries.length > 0) {
      const { error: rosterError } = await supabase
        .from("team_rosters")
        .insert(newRosterEntries);

      if (rosterError) {
        console.error("Error creating rosters:", rosterError);
        return { error: rosterError.message };
      }
    }

    // Check for existing active seasons in this league and deactivate them (only one active at a time)
    const { data: existingActiveSeasons } = await supabase
      .from("seasons")
      .select("id, name")
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .in("status", ["active", "playoffs"])
      .neq("id", draft.season_id);

    if (existingActiveSeasons && existingActiveSeasons.length > 0) {
      // Deactivate other active seasons
      await supabase
        .from("seasons")
        .update({ status: "completed" as SeasonStatus })
        .eq('league_id', leagueId) // CRITICAL: Only update seasons in this league
        .in("status", ["active", "playoffs"])
        .neq("id", draft.season_id);
    }

    // Update season status back to active
    await supabase
      .from("seasons")
      .update({
        status: "active",
        current_game_count: 0,
      })
      .eq("id", draft.season_id)
      .eq('league_id', leagueId); // CRITICAL: Only update seasons in this league

    // Auto-generate draft grades article
    try {
      const { generateAIArticle } = await import("../admin/article-actions");
      const result = await generateAIArticle("draft_grades", draftId);
      if (result.success && result.content) {
        // Auto-create and publish the article
        const { data: article } = await supabase
          .from("articles")
          .insert({
            league_id: leagueId,
            title: result.title || "Draft Grades",
            content: result.content,
            type: "draft_grades",
            published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();
      }
    } catch (error) {
      console.error("Error auto-generating draft grades:", error);
      // Don't fail the draft completion if article generation fails
    }

    // Generate schedule if season has total_games set and schedule not already generated
    const { data: season } = await supabase
      .from("seasons")
      .select("total_games, schedule_generated")
      .eq("id", draft.season_id)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .single();

    if (season && season.total_games && !season.schedule_generated) {
      // Import schedule generator
      const { generateSeasonSchedule } = await import("@/lib/seasons/schedule-generator");
      const scheduleResult = await generateSeasonSchedule(draft.season_id, "random");

      if (scheduleResult.error) {
        console.error("Error generating schedule:", scheduleResult.error);
        // Don't fail the draft completion, just log the error
      } else {
        console.log(`Schedule generated: ${scheduleResult.gamesCreated} games created`);
      }
    }

    revalidatePath("/admin/draft");
    revalidatePath("/captain/draft");
    revalidatePath("/teams");
    revalidatePath("/news");
    revalidatePath("/schedule");
    revalidatePath("/admin/seasons");
    return { success: true };
  } catch (error: any) {
    console.error("Error in completeDraft:", error);
    return { error: error.message || 'Unauthorized or failed to complete draft' };
  }
}

// Get last picked player with stats
export async function getLastPickedPlayer(draftId: string) {
  try {
    // Require league membership (any role can view last pick)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    // First verify draft belongs to league
    const { data: draft } = await supabase
      .from("drafts")
      .select("season_id")
      .eq("id", draftId)
      .eq('league_id', leagueId) // CRITICAL: Verify draft belongs to league
      .single();

    if (!draft) {
      return { error: "Draft not found or does not belong to your league", player: null };
    }

    const { data: lastPick } = await supabase
      .from("draft_picks")
      .select(`
        *,
        player:profiles!draft_picks_player_id_fkey(
          id,
          full_name,
          jersey_number,
          position,
          avatar_url
        ),
        team:teams!draft_picks_team_id_fkey(
          id,
          name,
          short_name,
          primary_color,
          secondary_color,
          logo_url
        )
      `)
      .eq("draft_id", draftId)
      .order("pick_number", { ascending: false })
      .limit(1)
      .single();

    if (!lastPick) {
      return { player: null };
    }

    // Get player stats from player_ratings (which has aggregated stats)
    const { data: playerRating } = await supabase
      .from("player_ratings")
      .select("games_played, points_per_game, attendance_rate")
      .eq("player_id", lastPick.player_id)
      .eq("season_id", draft.season_id)
      .single();

    if (playerRating) {
      // Calculate goals and assists from points_per_game (approximate)
      const estimatedPoints = playerRating.points_per_game * playerRating.games_played;
      const estimatedGoals = Math.round(estimatedPoints * 0.4); // Rough estimate
      const estimatedAssists = Math.round(estimatedPoints * 0.6);

      // Type guard for player object
      const playerData = lastPick.player && typeof lastPick.player === 'object' ? lastPick.player : null;

      return {
        player: {
          ...(playerData || {}),
          stats: {
            games_played: playerRating.games_played,
            goals: estimatedGoals,
            assists: estimatedAssists,
            points: Math.round(estimatedPoints),
            attendance_rate: playerRating.attendance_rate,
          },
          team: lastPick.team,
        },
      };
    }

    // Type guard for player object
    const playerData = lastPick.player && typeof lastPick.player === 'object' ? lastPick.player : null;

    return {
      player: {
        ...(playerData || {}),
        team: lastPick.team,
      },
    };
  } catch (error: any) {
    console.error("Error in getLastPickedPlayer:", error);
    return { error: error.message || 'Unauthorized', player: null };
  }
}
