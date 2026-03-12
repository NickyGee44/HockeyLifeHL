'use server';

/**
 * Suspension Actions
 *
 * Server actions for creating and managing player suspensions.
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  sendSuspensionNotification,
  sendSuspensionReviewSummaryNotification,
} from '@/lib/notifications/actions';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';

// =============================================================================
// Types
// =============================================================================

export type SuspensionStatus = 'pending_review' | 'active' | 'served' | 'appealed' | 'denied';
export type SuspensionType = 'games' | 'date_range' | 'indefinite';
export type SuspensionSeverity =
  | 'standard'
  | 'minor'
  | 'major'
  | 'gross_misconduct'
  | 'match'
  | 'behavioral';

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
  suspensionType: SuspensionType;
  severity: SuspensionSeverity;
  behaviorCategory?: string;
  internalNotes?: string;
  isIndefinite?: boolean;
  appealEligible?: boolean;
  appealDeadline?: string;
}

export interface CreateSuspensionResult {
  success: boolean;
  suspensionId?: string;
  error?: string;
}

export interface SuspensionReviewResult {
  success: boolean;
  error?: string;
}

export interface ReviewSuspensionParams {
  suspensionId: string;
  decision: 'approve' | 'deny' | 'serve';
  reviewNotes?: string;
}

export interface AppealSuspensionParams {
  suspensionId: string;
  reason: string;
}

interface SuspensionRecord {
  id: string;
  league_id: string;
  player_id: string;
  team_id: string | null;
  season_id: string | null;
  game_id: string | null;
  reason: string;
  start_date: string;
  end_date: string | null;
  games_remaining: number;
  status: string | null;
  appeal_eligible?: boolean | null;
  appeal_deadline?: string | null;
  player?: { full_name: string | null } | null;
  team?: { name: string | null } | null;
}

function revalidateSuspensionViews(leagueId: string) {
  revalidatePath(`/dashboard/leagues/${leagueId}/games`);
  revalidatePath(`/dashboard/leagues/${leagueId}`);
}

async function getSuspensionRecord(suspensionId: string): Promise<SuspensionRecord | null> {
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from('suspensions')
    .select(`
      id,
      league_id,
      player_id,
      team_id,
      season_id,
      game_id,
      reason,
      start_date,
      end_date,
      games_remaining,
      status,
      appeal_eligible,
      appeal_deadline,
      player:profiles!suspensions_player_id_fkey(full_name),
      team:teams!suspensions_team_id_fkey(name)
    `)
    .eq('id', suspensionId)
    .single();

  if (error || !data) {
    console.error('[Suspensions] Failed to load suspension record:', error);
    return null;
  }

  return data as SuspensionRecord;
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
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const serviceClient = createServiceRoleClient();
  const isIndefinite = params.isIndefinite || params.suspensionType === 'indefinite';
  const gamesRemaining = isIndefinite ? 0 : Math.max(1, params.gamesRemaining || 1);

  // Insert the suspension record
  const { data, error } = await serviceClient
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
      games_remaining: gamesRemaining,
      status: 'pending_review',
      suspension_type: params.suspensionType,
      severity: params.severity,
      behavior_category: params.behaviorCategory || null,
      internal_notes: params.internalNotes || null,
      is_indefinite: isIndefinite,
      appeal_eligible: params.appealEligible || false,
      appeal_deadline: params.appealDeadline || null,
    } as any)
    .select('id')
    .single();

  if (error) {
    console.error('[Suspensions] Create error:', error);
    return { success: false, error: error.message };
  }

  revalidateSuspensionViews(params.leagueId);

  return { success: true, suspensionId: data.id };
}

// =============================================================================
// Review Suspension
// =============================================================================

export async function reviewSuspension(
  params: ReviewSuspensionParams
): Promise<SuspensionReviewResult> {
  const suspension = await getSuspensionRecord(params.suspensionId);
  if (!suspension) {
    return { success: false, error: 'Suspension not found' };
  }

  const access = await verifyLeagueOwnerAccess(suspension.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const serviceClient = createServiceRoleClient();
  const nextStatus: SuspensionStatus =
    params.decision === 'approve'
      ? 'active'
      : params.decision === 'serve'
        ? 'served'
        : 'denied';

  if (params.decision === 'approve' && suspension.status !== 'pending_review') {
    return { success: false, error: 'Only pending reviews can be approved.' };
  }

  if (params.decision === 'deny' && !['pending_review', 'appealed'].includes(suspension.status || '')) {
    return { success: false, error: 'Only pending or appealed cases can be denied.' };
  }

  if (params.decision === 'serve' && !['active', 'appealed'].includes(suspension.status || '')) {
    return { success: false, error: 'Only active or appealed suspensions can be marked served.' };
  }

  const { error } = await serviceClient
    .from('suspensions')
    .update({
      status: nextStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: params.reviewNotes?.trim() || null,
    } as any)
    .eq('id', params.suspensionId);

  if (error) {
    console.error('[Suspensions] Review error:', error);
    return { success: false, error: error.message };
  }

  if (params.decision === 'approve') {
    sendSuspensionNotification({
      leagueId: suspension.league_id,
      playerId: suspension.player_id,
      teamId: suspension.team_id || '',
      reason: suspension.reason,
      startDate: suspension.start_date,
      endDate: suspension.end_date || undefined,
      gamesRemaining: suspension.games_remaining,
    }).catch((err: unknown) => {
      console.error('[Suspensions] Approval notification error (non-blocking):', err);
    });

    sendSuspensionReviewSummaryNotification({
      leagueId: suspension.league_id,
      suspensionId: suspension.id,
      status: 'approved',
      playerName: suspension.player?.full_name || 'Player',
      teamName: suspension.team?.name || 'Team',
      reason: suspension.reason,
      reviewNotes: params.reviewNotes,
    }).catch((err: unknown) => {
      console.error('[Suspensions] Review summary notification error (non-blocking):', err);
    });
  }

  if (params.decision === 'deny') {
    sendSuspensionReviewSummaryNotification({
      leagueId: suspension.league_id,
      suspensionId: suspension.id,
      status: 'denied',
      playerName: suspension.player?.full_name || 'Player',
      teamName: suspension.team?.name || 'Team',
      reason: suspension.reason,
      reviewNotes: params.reviewNotes,
    }).catch((err: unknown) => {
      console.error('[Suspensions] Denial summary notification error (non-blocking):', err);
    });
  }

  revalidateSuspensionViews(suspension.league_id);
  return { success: true };
}

// =============================================================================
// Appeal Suspension
// =============================================================================

export async function requestSuspensionAppeal(
  params: AppealSuspensionParams
): Promise<SuspensionReviewResult> {
  const suspension = await getSuspensionRecord(params.suspensionId);
  if (!suspension) {
    return { success: false, error: 'Suspension not found' };
  }

  if (!suspension.team_id) {
    return { success: false, error: 'Only team-based suspensions can be appealed.' };
  }

  if (!suspension.appeal_eligible) {
    return { success: false, error: 'This suspension is not eligible for appeal.' };
  }

  if (suspension.status !== 'active') {
    return { success: false, error: 'Only active suspensions can be appealed.' };
  }

  const appealDeadline = (suspension as { appeal_deadline?: string | null }).appeal_deadline;
  if (appealDeadline && new Date(appealDeadline).getTime() < Date.now()) {
    return { success: false, error: 'The appeal window has closed for this suspension.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const serviceClient = createServiceRoleClient();
  const { data: captainMembership } = await serviceClient
    .from('team_rosters')
    .select('id')
    .eq('team_id', suspension.team_id)
    .eq('player_id', user.id)
    .is('end_date', null)
    .in('leadership_role', ['captain', 'alternate_captain'])
    .maybeSingle();

  if (!captainMembership) {
    return { success: false, error: 'Only the team captain or alternate can request an appeal.' };
  }

  const { error } = await serviceClient
    .from('suspensions')
    .update({
      status: 'appealed',
      appeal_requested_at: new Date().toISOString(),
      appeal_requested_by: user.id,
      appeal_reason: params.reason.trim(),
    } as any)
    .eq('id', params.suspensionId);

  if (error) {
    console.error('[Suspensions] Appeal request error:', error);
    return { success: false, error: error.message };
  }

  revalidateSuspensionViews(suspension.league_id);
  return { success: true };
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
