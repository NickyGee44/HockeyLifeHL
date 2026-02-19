'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Types for responses
interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

interface DraftSetupData {
  draftId: string;
  teamCount: number;
}

interface DraftPickData {
  pickId: string;
  pickNumber: number;
  round: number;
  teamId: string;
  playerId: string;
  playerName: string;
}

/**
 * Setup a new draft with configuration
 */
export async function setupDraft(
  leagueId: string,
  seasonId: string,
  config: {
    name: string;
    draftType: 'snake' | 'linear';
    pickTimeSeconds: number;
    totalRounds: number;
    autoPickEnabled: boolean;
    allowTrades: boolean;
    requireRosterConfirmation: boolean;
  }
): Promise<ActionResult<DraftSetupData>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Note: setup_draft RPC is defined in migrations but not in generated types yet
    const { data, error } = await (supabase.rpc as any)('setup_draft', {
      p_league_id: leagueId,
      p_season_id: seasonId,
      p_name: config.name,
      p_draft_type: config.draftType,
      p_pick_time_seconds: config.pickTimeSeconds,
      p_total_rounds: config.totalRounds,
      p_auto_pick_enabled: config.autoPickEnabled,
      p_allow_trades: config.allowTrades,
      p_require_roster_confirmation: config.requireRosterConfirmation,
    });

    if (error) throw error;

    const result = (data ?? {}) as { success?: boolean; error?: string; draft_id?: string; team_count?: number };
    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to create draft' };
    }

    revalidatePath('/dashboard/leagues');

    return {
      success: true,
      data: {
        draftId: result.draft_id!,
        teamCount: result.team_count || 0,
      },
    };
  } catch (err) {
    console.error('Error setting up draft:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to setup draft' };
  }
}

/**
 * Start a draft (transition from pending to active)
 */
export async function startDraft(draftId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase.rpc('start_draft', {
      p_draft_id: draftId,
    });

    if (error) throw error;

    const result = data as { success?: boolean; error?: string };
    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to start draft' };
    }

    revalidatePath(`/dashboard/draft/${draftId}`);
    return { success: true };
  } catch (err) {
    console.error('Error starting draft:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to start draft' };
  }
}

/**
 * Make a draft pick
 */
export async function makeDraftPick(
  draftId: string,
  playerId: string
): Promise<ActionResult<DraftPickData>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase.rpc('make_draft_pick', {
      p_draft_id: draftId,
      p_player_id: playerId,
    });

    if (error) throw error;

    const result = data as {
      success?: boolean;
      error?: string;
      pick?: {
        id: string;
        pick_number: number;
        round: number;
        team_id: string;
        player_id: string;
        player_name: string;
      };
    };

    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to make pick' };
    }

    return {
      success: true,
      data: {
        pickId: result.pick!.id,
        pickNumber: result.pick!.pick_number,
        round: result.pick!.round,
        teamId: result.pick!.team_id,
        playerId: result.pick!.player_id,
        playerName: result.pick!.player_name,
      },
    };
  } catch (err) {
    console.error('Error making draft pick:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to make pick' };
  }
}

/**
 * Pause an active draft
 */
export async function pauseDraft(draftId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase.rpc('pause_draft', {
      p_draft_id: draftId,
    });

    if (error) throw error;

    const result = data as { success?: boolean; error?: string };
    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to pause draft' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error pausing draft:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to pause draft' };
  }
}

/**
 * Resume a paused draft
 */
export async function resumeDraft(draftId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase.rpc('resume_draft', {
      p_draft_id: draftId,
    });

    if (error) throw error;

    const result = data as { success?: boolean; error?: string };
    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to resume draft' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error resuming draft:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to resume draft' };
  }
}

/**
 * Undo the last draft pick (commissioner only)
 */
export async function undoLastPick(draftId: string): Promise<ActionResult<{ restoredPlayerId: string }>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Note: undo_last_pick RPC is defined in migrations but not in generated types yet
    const { data, error } = await (supabase.rpc as any)('undo_last_pick', {
      p_draft_id: draftId,
    });

    if (error) throw error;

    const result = (data ?? {}) as { success?: boolean; error?: string; restored_player?: string };
    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to undo pick' };
    }

    return {
      success: true,
      data: { restoredPlayerId: result.restored_player! },
    };
  } catch (err) {
    console.error('Error undoing pick:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to undo pick' };
  }
}

/**
 * Trade a draft pick between teams
 */
export async function tradeDraftPick(
  draftId: string,
  fromTeamId: string,
  toTeamId: string,
  round: number,
  notes?: string
): Promise<ActionResult<{ tradeId: string }>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Note: trade_draft_pick RPC is defined in migrations but not in generated types yet
    const { data, error } = await (supabase.rpc as any)('trade_draft_pick', {
      p_draft_id: draftId,
      p_from_team_id: fromTeamId,
      p_to_team_id: toTeamId,
      p_round: round,
      p_notes: notes || null,
    });

    if (error) throw error;

    const result = (data ?? {}) as { success?: boolean; error?: string; trade_id?: string };
    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to trade pick' };
    }

    return {
      success: true,
      data: { tradeId: result.trade_id! },
    };
  } catch (err) {
    console.error('Error trading pick:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to trade pick' };
  }
}

/**
 * Confirm a team's roster after draft
 */
export async function confirmDraftRoster(
  draftId: string,
  teamId: string,
  notes?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Note: confirm_draft_roster RPC is defined in migrations but not in generated types yet
    const { data, error } = await (supabase.rpc as any)('confirm_draft_roster', {
      p_draft_id: draftId,
      p_team_id: teamId,
      p_notes: notes || null,
    });

    if (error) throw error;

    const result = (data ?? {}) as { success?: boolean; error?: string };
    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to confirm roster' };
    }

    revalidatePath(`/dashboard/draft/${draftId}`);
    return { success: true };
  } catch (err) {
    console.error('Error confirming roster:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to confirm roster' };
  }
}

/**
 * Get draft results for export
 */
export async function getDraftResults(draftId: string): Promise<ActionResult<{
  draft: {
    id: string;
    name: string;
    status: string;
    draftType: string;
    totalRounds: number;
    startedAt: string | null;
    completedAt: string | null;
  };
  picks: Array<{
    pickNumber: number;
    round: number;
    teamName: string;
    playerName: string;
    position: string | null;
    skillLevel: string | null;
    autoPicked: boolean;
    pickTimeMs: number | null;
  }>;
  teams: Array<{
    teamId: string;
    teamName: string;
    totalPicks: number;
    rosterConfirmed: boolean;
  }>;
  trades: Array<{
    round: number;
    fromTeam: string;
    toTeam: string;
    tradedAt: string;
  }> | null;
}>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Note: get_draft_results RPC is defined in migrations but not in generated types yet
    const { data, error } = await (supabase.rpc as any)('get_draft_results', {
      p_draft_id: draftId,
    });

    if (error) throw error;

    const result = data as any;
    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to get draft results' };
    }

    return {
      success: true,
      data: {
        draft: {
          id: result.draft.id,
          name: result.draft.name,
          status: result.draft.status,
          draftType: result.draft.draft_type,
          totalRounds: result.draft.total_rounds,
          startedAt: result.draft.started_at,
          completedAt: result.draft.completed_at,
        },
        picks: result.picks?.map((p: any) => ({
          pickNumber: p.pick_number,
          round: p.round,
          teamName: p.team_name,
          playerName: p.player_name,
          position: p.position,
          skillLevel: p.skill_level,
          autoPicked: p.auto_picked,
          pickTimeMs: p.pick_time_ms,
        })) || [],
        teams: result.teams?.map((t: any) => ({
          teamId: t.team_id,
          teamName: t.team_name,
          totalPicks: t.total_picks,
          rosterConfirmed: t.roster_confirmed,
        })) || [],
        trades: result.trades?.map((tr: any) => ({
          round: tr.round,
          fromTeam: tr.from_team,
          toTeam: tr.to_team,
          tradedAt: tr.traded_at,
        })) || null,
      },
    };
  } catch (err) {
    console.error('Error getting draft results:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to get results' };
  }
}

/**
 * Add players to draft pool
 */
export async function addPlayersToDraftPool(
  draftId: string,
  leagueId: string,
  players: Array<{
    playerId: string;
    playerName: string;
    position?: string;
    skillLevel?: string;
    autoPickRank?: number;
  }>
): Promise<ActionResult<{ addedCount: number }>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: inserted, error } = await supabase
      .from('draft_pool')
      .insert(
        players.map((p, index) => ({
          draft_id: draftId,
          player_id: p.playerId,
          player_name: p.playerName,
          position: p.position || null,
          skill_level: p.skillLevel || null,
          auto_pick_rank: p.autoPickRank ?? index + 1,
          league_id: leagueId,
        }))
      )
      .select();

    if (error) throw error;

    return {
      success: true,
      data: { addedCount: inserted?.length || 0 },
    };
  } catch (err) {
    console.error('Error adding players to pool:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add players' };
  }
}

/**
 * Set draft order for teams
 */
export async function setDraftOrder(
  draftId: string,
  leagueId: string,
  order: Array<{ teamId: string; pickPosition: number }>
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Delete existing order for round 1
    const { error: deleteError } = await supabase
      .from('draft_order')
      .delete()
      .eq('draft_id', draftId)
      .eq('round', 1);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // Insert new order
    const { error } = await supabase.from('draft_order').insert(
      order.map((o) => ({
        draft_id: draftId,
        team_id: o.teamId,
        pick_position: o.pickPosition,
        round: 1,
        league_id: leagueId,
      }))
    );

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Error setting draft order:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to set order' };
  }
}
