"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type StatEntryResult = {
  error?: string;
  success?: boolean;
  statId?: string;
};

interface StatEntryData {
  gameId: string;
  playerId: string;
  teamId: string;
  statType: string;
  period: number;
  timestamp: string;
  jerseyNumber?: number;
  playerName?: string;
}

/**
 * Submit a single stat entry
 */
export async function submitStatEntry(data: StatEntryData): Promise<StatEntryResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Verify user is assigned to this game
    const { data: assignment } = await supabase
      .from('game_scorekeeper_assignments')
      .select('id, league_id')
      .eq('game_id', data.gameId)
      .eq('scorekeeper_id', user.id)
      .single();

    if (!assignment) {
      return { error: "Not authorized to enter stats for this game" };
    }

    // Determine team type (home or away)
    const { data: game } = await supabase
      .from('games')
      .select('home_team_id, away_team_id')
      .eq('id', data.gameId)
      .single();

    if (!game) {
      return { error: "Game not found" };
    }

    const teamType = data.teamId === game.home_team_id ? 'home' : 'away';

    // Insert stat entry
    const { data: stat, error: insertError } = await supabase
      .from('game_stats')
      .insert({
        game_id: data.gameId,
        player_id: data.playerId,
        team_id: data.teamId,
        league_id: assignment.league_id,
        stat_type: data.statType as any,
        value: data.statType === 'PIM' ? 2 : 1, // Default 2 min penalty or 1 for other stats
        period: data.period as any,
        timestamp: data.timestamp,
        team_type: teamType as any,
        entered_by: user.id,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting stat:', insertError);
      return { error: "Failed to record stat" };
    }

    // Log the entry for audit trail
    await supabase
      .from('game_stat_entry_log')
      .insert({
        game_id: data.gameId,
        league_id: assignment.league_id,
        entered_by: user.id,
        entered_by_role: 'scorekeeper',
        action: 'add',
        stat_type: data.statType as any,
        player_id: data.playerId,
        new_value: { value: data.statType === 'PIM' ? 2 : 1, period: data.period } as any,
      });

    revalidatePath(`/scorekeeper/live-entry/${data.gameId}`);

    return { success: true, statId: stat.id };
  } catch (error) {
    console.error('Stat entry error:', error);
    return { error: "Failed to submit stat entry" };
  }
}

/**
 * Submit multiple stat entries (for offline sync)
 */
export async function submitBatchStatEntries(entries: StatEntryData[]): Promise<{
  success: boolean;
  results: { success: boolean; error?: string }[];
}> {
  const results = [];

  for (const entry of entries) {
    const result = await submitStatEntry(entry);
    results.push({
      success: !!result.success,
      error: result.error,
    });
  }

  const success = results.every(r => r.success);

  return { success, results };
}

/**
 * Delete a stat entry (undo)
 */
export async function deleteStatEntry(statId: string): Promise<StatEntryResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Get stat details
    const { data: stat } = await supabase
      .from('game_stats')
      .select('id, game_id, entered_by, league_id, stat_type, player_id, value, period')
      .eq('id', statId)
      .single();

    if (!stat) {
      return { error: "Stat not found" };
    }

    // Verify user entered this stat or is assigned to the game
    if (stat.entered_by !== user.id) {
      const { data: assignment } = await supabase
        .from('game_scorekeeper_assignments')
        .select('id')
        .eq('game_id', stat.game_id)
        .eq('scorekeeper_id', user.id)
        .single();

      if (!assignment) {
        return { error: "Not authorized to delete this stat" };
      }
    }

    // Delete the stat
    const { error: deleteError } = await supabase
      .from('game_stats')
      .delete()
      .eq('id', statId);

    if (deleteError) {
      console.error('Error deleting stat:', deleteError);
      return { error: "Failed to delete stat" };
    }

    // Log the deletion
    await supabase
      .from('game_stat_entry_log')
      .insert({
        game_id: stat.game_id,
        league_id: stat.league_id,
        entered_by: user.id,
        entered_by_role: 'scorekeeper',
        action: 'remove',
        stat_type: stat.stat_type as any,
        player_id: stat.player_id,
        previous_value: { value: stat.value, period: stat.period } as any,
      });

    revalidatePath(`/scorekeeper/live-entry/${stat.game_id}`);

    return { success: true };
  } catch (error) {
    console.error('Delete stat error:', error);
    return { error: "Failed to delete stat entry" };
  }
}
