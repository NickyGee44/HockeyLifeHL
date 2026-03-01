'use server';

/**
 * Suspension Actions
 *
 * Server actions for creating and managing player suspensions.
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendSuspensionNotification } from '@/lib/notifications/actions';

// =============================================================================
// Types
// =============================================================================

export interface CreateSuspensionParams {
  leagueId: string;
  playerId: string;
  teamId: string;
  seasonId: string;
  gameId?: string;
  reason: string;
  startDate: string;
  endDate?: string;
  gamesRemaining: number;
}

export interface CreateSuspensionResult {
  success: boolean;
  suspensionId?: string;
  error?: string;
}

// =============================================================================
// Create Suspension
// =============================================================================

/**
 * Create a new suspension for a player.
 * Sends notification emails to the player and their team captain.
 */
export async function createSuspension(
  params: CreateSuspensionParams
): Promise<CreateSuspensionResult> {
  const supabase = await createClient();

  // Verify the current user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Insert the suspension record
  const { data, error } = await supabase
    .from('suspensions')
    .insert({
      league_id: params.leagueId,
      player_id: params.playerId,
      team_id: params.teamId,
      season_id: params.seasonId,
      game_id: params.gameId || null,
      issued_by: user.id,
      reason: params.reason,
      start_date: params.startDate,
      end_date: params.endDate || null,
      games_remaining: params.gamesRemaining,
      status: 'active',
    } as any)
    .select('id')
    .single();

  if (error) {
    console.error('[Suspensions] Create error:', error);
    return { success: false, error: error.message };
  }

  // Send notification emails (fire-and-forget - don't block on notification failure)
  sendSuspensionNotification({
    leagueId: params.leagueId,
    playerId: params.playerId,
    teamId: params.teamId,
    reason: params.reason,
    startDate: params.startDate,
    endDate: params.endDate,
    gamesRemaining: params.gamesRemaining,
  }).catch((err: unknown) => {
    console.error('[Suspensions] Notification send error (non-blocking):', err);
  });

  // Revalidate the games page to show updated suspensions
  revalidatePath(`/dashboard/leagues/${params.leagueId}/games`);

  return { success: true, suspensionId: data.id };
}

// =============================================================================
// getRosteredPlayersForSuspension
// =============================================================================

export interface RosteredPlayer {
  id: string;
  name: string;
}

/**
 * Returns active rostered players for a team.
 * Uses the service role client so the profiles join isn't blocked by RLS
 * (the browser client can only read auth.uid()'s own profile).
 */
export async function getRosteredPlayersForSuspension(
  teamId: string,
  leagueId: string
): Promise<RosteredPlayer[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('team_rosters')
    .select('player_id, profiles!team_rosters_player_id_fkey(id, first_name, last_name)')
    .eq('team_id', teamId)
    .eq('league_id', leagueId)
    .is('end_date', null);

  if (error || !data) {
    console.error('[Suspensions] getRosteredPlayersForSuspension error:', error?.message);
    return [];
  }

  return (data as any[])
    .map((r) => {
      const p = r.profiles;
      if (!p) return null;
      return {
        id: p.id as string,
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown',
      };
    })
    .filter(Boolean) as RosteredPlayer[];
}
