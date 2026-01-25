"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface TradeResult {
  success?: boolean;
  error?: string;
  tradeId?: string;
}

interface TradeValidation {
  valid: boolean;
  error?: string;
}

/**
 * Move a single player to a different team
 */
export async function movePlayerToTeam(
  playerId: string,
  fromTeamId: string,
  toTeamId: string,
  seasonId: string,
  notes?: string
): Promise<TradeResult> {
  const supabase = await createClient();

  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Only league owners can execute trades" };
  }

  // Validate the trade
  const validation = await validatePlayerMove(
    playerId,
    fromTeamId,
    toTeamId,
    seasonId
  );

  if (!validation.valid) {
    return { error: validation.error };
  }

  try {
    // Create trade record
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert({
        season_id: seasonId,
        executed_by: user.id,
        trade_type: "manual",
        notes: notes || null,
      })
      .select()
      .single();

    if (tradeError || !trade) {
      return { error: tradeError?.message || "Failed to create trade record" };
    }

    // Create trade_players record
    const { error: tradePlayersError } = await supabase
      .from("trade_players")
      .insert({
        trade_id: trade.id,
        player_id: playerId,
        from_team_id: fromTeamId,
        to_team_id: toTeamId,
      });

    if (tradePlayersError) {
      // Rollback trade
      await supabase.from("trades").delete().eq("id", trade.id);
      return { error: tradePlayersError.message };
    }

    // Update team_rosters
    const { error: rosterError } = await supabase
      .from("team_rosters")
      .update({ team_id: toTeamId })
      .eq("player_id", playerId)
      .eq("team_id", fromTeamId)
      .eq("season_id", seasonId);

    if (rosterError) {
      // Rollback everything
      await supabase.from("trades").delete().eq("id", trade.id);
      return { error: rosterError.message };
    }

    // Revalidate relevant paths
    revalidatePath("/admin/trades");
    revalidatePath("/admin/teams");
    revalidatePath(`/teams/${fromTeamId}`);
    revalidatePath(`/teams/${toTeamId}`);

    return { success: true, tradeId: trade.id };
  } catch (error: any) {
    console.error("Error executing trade:", error);
    return { error: error.message };
  }
}

/**
 * Execute a player swap trade between two teams
 */
export async function executeTrade(
  teamAPlayerId: string,
  teamAId: string,
  teamBPlayerId: string,
  teamBId: string,
  seasonId: string,
  notes?: string
): Promise<TradeResult> {
  const supabase = await createClient();

  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Only league owners can execute trades" };
  }

  // Validate both moves
  const validationA = await validatePlayerMove(
    teamAPlayerId,
    teamAId,
    teamBId,
    seasonId
  );
  const validationB = await validatePlayerMove(
    teamBPlayerId,
    teamBId,
    teamAId,
    seasonId
  );

  if (!validationA.valid) {
    return { error: `Player A: ${validationA.error}` };
  }
  if (!validationB.valid) {
    return { error: `Player B: ${validationB.error}` };
  }

  try {
    // Create trade record
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert({
        season_id: seasonId,
        executed_by: user.id,
        trade_type: "player_swap",
        notes: notes || null,
      })
      .select()
      .single();

    if (tradeError || !trade) {
      return { error: tradeError?.message || "Failed to create trade record" };
    }

    // Create trade_players records
    const { error: tradePlayersError } = await supabase
      .from("trade_players")
      .insert([
        {
          trade_id: trade.id,
          player_id: teamAPlayerId,
          from_team_id: teamAId,
          to_team_id: teamBId,
        },
        {
          trade_id: trade.id,
          player_id: teamBPlayerId,
          from_team_id: teamBId,
          to_team_id: teamAId,
        },
      ]);

    if (tradePlayersError) {
      await supabase.from("trades").delete().eq("id", trade.id);
      return { error: tradePlayersError.message };
    }

    // Update team_rosters for both players
    const { error: rosterErrorA } = await supabase
      .from("team_rosters")
      .update({ team_id: teamBId })
      .eq("player_id", teamAPlayerId)
      .eq("team_id", teamAId)
      .eq("season_id", seasonId);

    if (rosterErrorA) {
      await supabase.from("trades").delete().eq("id", trade.id);
      return { error: `Failed to move Player A: ${rosterErrorA.message}` };
    }

    const { error: rosterErrorB } = await supabase
      .from("team_rosters")
      .update({ team_id: teamAId })
      .eq("player_id", teamBPlayerId)
      .eq("team_id", teamBId)
      .eq("season_id", seasonId);

    if (rosterErrorB) {
      // Rollback Player A's move
      await supabase
        .from("team_rosters")
        .update({ team_id: teamAId })
        .eq("player_id", teamAPlayerId)
        .eq("season_id", seasonId);
      await supabase.from("trades").delete().eq("id", trade.id);
      return { error: `Failed to move Player B: ${rosterErrorB.message}` };
    }

    // Revalidate paths
    revalidatePath("/admin/trades");
    revalidatePath("/admin/teams");
    revalidatePath(`/teams/${teamAId}`);
    revalidatePath(`/teams/${teamBId}`);

    return { success: true, tradeId: trade.id };
  } catch (error: any) {
    console.error("Error executing player swap:", error);
    return { error: error.message };
  }
}

/**
 * Revert a trade (within 24 hours)
 */
export async function revertTrade(tradeId: string): Promise<TradeResult> {
  const supabase = await createClient();

  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Only league owners can revert trades" };
  }

  try {
    // Get trade details
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .select("*, trade_players(*)")
      .eq("id", tradeId)
      .single();

    if (tradeError || !trade) {
      return { error: "Trade not found" };
    }

    // Check if already reverted
    if (trade.reverted_at) {
      return { error: "Trade has already been reverted" };
    }

    // Check if within 24 hours
    const executedAt = new Date(trade.executed_at);
    const now = new Date();
    const hoursSinceExecution = (now.getTime() - executedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceExecution > 24) {
      return { error: "Trade can only be reverted within 24 hours of execution" };
    }

    // Revert each player movement
    for (const tradePlayer of trade.trade_players) {
      const { error: rosterError } = await supabase
        .from("team_rosters")
        .update({ team_id: tradePlayer.from_team_id })
        .eq("player_id", tradePlayer.player_id)
        .eq("team_id", tradePlayer.to_team_id);

      if (rosterError) {
        return { error: `Failed to revert player ${tradePlayer.player_id}: ${rosterError.message}` };
      }
    }

    // Mark trade as reverted
    const { error: updateError } = await supabase
      .from("trades")
      .update({
        reverted_at: new Date().toISOString(),
        reverted_by: user.id,
      })
      .eq("id", tradeId);

    if (updateError) {
      return { error: updateError.message };
    }

    // Revalidate paths
    revalidatePath("/admin/trades");
    revalidatePath("/admin/teams");

    return { success: true };
  } catch (error: any) {
    console.error("Error reverting trade:", error);
    return { error: error.message };
  }
}

/**
 * Get trade history
 */
export async function getTradeHistory(seasonId?: string) {
  const supabase = await createClient();

  const query = supabase
    .from("trades")
    .select(`
      *,
      executed_by_profile:profiles!executed_by(id, full_name, avatar_url),
      reverted_by_profile:profiles!reverted_by(id, full_name, avatar_url),
      season:seasons(id, name),
      trade_players(
        *,
        player:profiles!player_id(id, full_name, avatar_url),
        from_team:teams!from_team_id(id, name, logo_url),
        to_team:teams!to_team_id(id, name, logo_url)
      )
    `)
    .order("executed_at", { ascending: false });

  if (seasonId) {
    query.eq("season_id", seasonId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching trade history:", error);
    return { trades: [], error: error.message };
  }

  return { trades: data || [] };
}

/**
 * Validate a player move
 */
async function validatePlayerMove(
  playerId: string,
  fromTeamId: string,
  toTeamId: string,
  seasonId: string
): Promise<TradeValidation> {
  const supabase = await createClient();

  // Check if player exists on from_team
  const { data: rosterEntry } = await supabase
    .from("team_rosters")
    .select("*")
    .eq("player_id", playerId)
    .eq("team_id", fromTeamId)
    .eq("season_id", seasonId)
    .single();

  if (!rosterEntry) {
    return { valid: false, error: "Player not found on source team" };
  }

  // Check if player is suspended
  const { data: suspensions } = await supabase
    .from("suspensions")
    .select("*")
    .eq("player_id", playerId)
    .eq("status", "active");

  if (suspensions && suspensions.length > 0) {
    return { valid: false, error: "Cannot trade suspended players" };
  }

  // Check season status
  const { data: season } = await supabase
    .from("seasons")
    .select("status")
    .eq("id", seasonId)
    .single();

  if (season?.status === "playoffs") {
    return { valid: false, error: "Cannot trade during playoffs" };
  }

  // Check target team roster size (max 15 players)
  const { data: targetRoster } = await supabase
    .from("team_rosters")
    .select("id")
    .eq("team_id", toTeamId)
    .eq("season_id", seasonId);

  if (targetRoster && targetRoster.length >= 15) {
    return { valid: false, error: "Target team roster is full (max 15 players)" };
  }

  return { valid: true };
}
