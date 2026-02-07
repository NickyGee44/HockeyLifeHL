/**
 * Season Fee Configuration Server Actions
 *
 * Server actions for managing season fee configurations:
 * - Create/update/delete season fees
 * - Configure payment plans and deadlines
 * - Manage early bird discounts and late fees
 *
 * Security:
 * - All actions verify user is league owner/admin
 * - Uses RLS policies for additional protection
 */

'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import type {
  SeasonFee,
  SeasonFeeWithSeason,
  CreateSeasonFeeParams,
  UpdateSeasonFeeParams,
  ActionResult,
} from './types';
import type { Json } from '@hockey-life/database';

// ============================================================================
// Helper: Verify League Admin Access
// ============================================================================

async function verifyLeagueAdminAccess(
  leagueId: string
): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Authentication required. Please sign in.' };
  }

  // Verify membership with owner/admin role
  const { data: membership, error: membershipError } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  if (membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active') {
    return { userId: user.id };
  }

  // Fallback: platform admins get owner-level access to all leagues
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.is_platform_admin === true) {
    return { userId: user.id };
  }

  if (membershipError || !membership) {
    return { error: 'You do not have access to this league.' };
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    return { error: 'Only league owners and admins can manage fees.' };
  }

  return { error: 'Your league membership is not active.' };
}

// ============================================================================
// Helper: Log Audit Event
// ============================================================================

async function logPaymentAuditEvent(
  leagueId: string,
  eventType: string,
  payload: Record<string, unknown>,
  createdBy?: string
): Promise<void> {
  const serviceSupabase = createServiceRoleClient();

  const { error } = await serviceSupabase.from('player_payment_audit_log').insert({
    league_id: leagueId,
    event_type: eventType,
    payload: payload as Json,
    created_by: createdBy || null,
  });

  if (error) {
    console.error('[Payments] Failed to log audit event:', sanitizeErrorForLogging(error));
  }
}

// ============================================================================
// 1. Get Season Fees for League
// ============================================================================

export async function getSeasonFees(
  leagueId: string,
  options?: { seasonId?: string; activeOnly?: boolean }
): Promise<ActionResult<SeasonFeeWithSeason[]>> {
  try {
    const access = await verifyLeagueAdminAccess(leagueId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const supabase = await createClient();

    let query = supabase
      .from('season_fees')
      .select(
        `
        *,
        seasons:season_id (id, name, start_date, end_date)
      `
      )
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });

    if (options?.seasonId) {
      query = query.eq('season_id', options.seasonId);
    }

    if (options?.activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: fees, error } = await query;

    if (error) {
      console.error('[Payments] Get fees error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to fetch season fees.' };
    }

    return { success: true, data: (fees || []) as SeasonFeeWithSeason[] };
  } catch (error) {
    console.error('[Payments] Unexpected error in getSeasonFees:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 2. Get Single Season Fee
// ============================================================================

export async function getSeasonFee(
  feeId: string
): Promise<ActionResult<SeasonFeeWithSeason>> {
  try {
    const supabase = await createClient();

    const { data: fee, error } = await supabase
      .from('season_fees')
      .select(
        `
        *,
        seasons:season_id (id, name, start_date, end_date)
      `
      )
      .eq('id', feeId)
      .single();

    if (error || !fee) {
      return { success: false, error: 'Season fee not found.' };
    }

    // Verify access
    const access = await verifyLeagueAdminAccess(fee.league_id);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    return { success: true, data: fee as SeasonFeeWithSeason };
  } catch (error) {
    console.error('[Payments] Unexpected error in getSeasonFee:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 3. Create Season Fee
// ============================================================================

export async function createSeasonFee(
  params: CreateSeasonFeeParams
): Promise<ActionResult<SeasonFee>> {
  try {
    const access = await verifyLeagueAdminAccess(params.leagueId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    // Validate at least one payment plan is enabled
    const allowFull = params.allowFullPayment !== false;
    const allowTwo = params.allowTwoPay === true;
    const allowThree = params.allowThreePay === true;

    if (!allowFull && !allowTwo && !allowThree) {
      return { success: false, error: 'At least one payment plan must be enabled.' };
    }

    const supabase = await createClient();

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('season_fees')
      .select('id')
      .eq('league_id', params.leagueId)
      .eq('season_id', params.seasonId)
      .eq('name', params.name)
      .single();

    if (existing) {
      return { success: false, error: 'A fee with this name already exists for this season.' };
    }

    const { data: fee, error } = await supabase
      .from('season_fees')
      .insert({
        league_id: params.leagueId,
        season_id: params.seasonId,
        name: params.name,
        description: params.description || null,
        amount_cents: params.amountCents,
        currency: params.currency || 'usd',
        allow_full_payment: allowFull,
        allow_two_pay: allowTwo,
        allow_three_pay: allowThree,
        payment_deadline: params.paymentDeadline || null,
        early_bird_deadline: params.earlyBirdDeadline || null,
        early_bird_discount_cents: params.earlyBirdDiscountCents || 0,
        late_fee_cents: params.lateFeeCents || 0,
        installment_fee_cents: params.installmentFeeCents || 0,
        created_by: access.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[Payments] Create fee error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to create season fee.' };
    }

    await logPaymentAuditEvent(params.leagueId, 'season_fee_created', {
      fee_id: fee.id,
      name: params.name,
      amount_cents: params.amountCents,
    }, access.userId);

    revalidatePath(`/dashboard/leagues/${params.leagueId}/fees`);
    return { success: true, data: fee as SeasonFee };
  } catch (error) {
    console.error('[Payments] Unexpected error in createSeasonFee:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 4. Update Season Fee
// ============================================================================

export async function updateSeasonFee(
  params: UpdateSeasonFeeParams
): Promise<ActionResult<SeasonFee>> {
  try {
    const supabase = await createClient();

    // Get existing fee to verify access
    const { data: existingFee, error: fetchError } = await supabase
      .from('season_fees')
      .select('*')
      .eq('id', params.feeId)
      .single();

    if (fetchError || !existingFee) {
      return { success: false, error: 'Season fee not found.' };
    }

    const access = await verifyLeagueAdminAccess(existingFee.league_id);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (params.name !== undefined) updateData.name = params.name;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.amountCents !== undefined) updateData.amount_cents = params.amountCents;
    if (params.currency !== undefined) updateData.currency = params.currency;
    if (params.allowFullPayment !== undefined) updateData.allow_full_payment = params.allowFullPayment;
    if (params.allowTwoPay !== undefined) updateData.allow_two_pay = params.allowTwoPay;
    if (params.allowThreePay !== undefined) updateData.allow_three_pay = params.allowThreePay;
    if (params.paymentDeadline !== undefined) updateData.payment_deadline = params.paymentDeadline;
    if (params.earlyBirdDeadline !== undefined) updateData.early_bird_deadline = params.earlyBirdDeadline;
    if (params.earlyBirdDiscountCents !== undefined) updateData.early_bird_discount_cents = params.earlyBirdDiscountCents;
    if (params.lateFeeCents !== undefined) updateData.late_fee_cents = params.lateFeeCents;
    if (params.installmentFeeCents !== undefined) updateData.installment_fee_cents = params.installmentFeeCents;
    if (params.isActive !== undefined) updateData.is_active = params.isActive;

    const { data: fee, error } = await supabase
      .from('season_fees')
      .update(updateData)
      .eq('id', params.feeId)
      .select()
      .single();

    if (error) {
      console.error('[Payments] Update fee error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to update season fee.' };
    }

    await logPaymentAuditEvent(existingFee.league_id, 'season_fee_updated', {
      fee_id: params.feeId,
      changes: updateData,
    }, access.userId);

    revalidatePath(`/dashboard/leagues/${existingFee.league_id}/fees`);
    return { success: true, data: fee as SeasonFee };
  } catch (error) {
    console.error('[Payments] Unexpected error in updateSeasonFee:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 5. Delete Season Fee
// ============================================================================

export async function deleteSeasonFee(feeId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Get existing fee to verify access
    const { data: existingFee, error: fetchError } = await supabase
      .from('season_fees')
      .select('*')
      .eq('id', feeId)
      .single();

    if (fetchError || !existingFee) {
      return { success: false, error: 'Season fee not found.' };
    }

    const access = await verifyLeagueAdminAccess(existingFee.league_id);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    // Check for existing payments
    const { count: paymentCount } = await supabase
      .from('player_payments')
      .select('*', { count: 'exact', head: true })
      .eq('season_fee_id', feeId);

    if (paymentCount && paymentCount > 0) {
      // Soft delete instead - set to inactive
      const { error } = await supabase
        .from('season_fees')
        .update({ is_active: false })
        .eq('id', feeId);

      if (error) {
        console.error('[Payments] Soft delete fee error:', sanitizeErrorForLogging(error));
        return { success: false, error: 'Failed to deactivate season fee.' };
      }

      await logPaymentAuditEvent(existingFee.league_id, 'season_fee_deactivated', {
        fee_id: feeId,
        reason: 'has_existing_payments',
      }, access.userId);
    } else {
      // Hard delete if no payments
      const { error } = await supabase
        .from('season_fees')
        .delete()
        .eq('id', feeId);

      if (error) {
        console.error('[Payments] Delete fee error:', sanitizeErrorForLogging(error));
        return { success: false, error: 'Failed to delete season fee.' };
      }

      await logPaymentAuditEvent(existingFee.league_id, 'season_fee_deleted', {
        fee_id: feeId,
        name: existingFee.name,
      }, access.userId);
    }

    revalidatePath(`/dashboard/leagues/${existingFee.league_id}/fees`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[Payments] Unexpected error in deleteSeasonFee:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 6. Get Available Fees for Player
// ============================================================================

export async function getAvailableFeesForPlayer(
  leagueId: string,
  seasonId: string,
  playerId: string
): Promise<ActionResult<SeasonFee[]>> {
  try {
    const supabase = await createClient();

    // Get active fees for the season
    const { data: fees, error: feeError } = await supabase
      .from('season_fees')
      .select('*')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('is_active', true);

    if (feeError) {
      console.error('[Payments] Get available fees error:', sanitizeErrorForLogging(feeError));
      return { success: false, error: 'Failed to fetch available fees.' };
    }

    // Get player's existing payments to filter out already-paid fees
    const { data: existingPayments } = await supabase
      .from('player_payments')
      .select('season_fee_id')
      .eq('player_id', playerId)
      .eq('season_id', seasonId)
      .not('status', 'in', '(cancelled)');

    const paidFeeIds = new Set(existingPayments?.map((p) => p.season_fee_id) || []);

    // Filter out fees the player has already started paying
    const availableFees = (fees || []).filter((fee) => !paidFeeIds.has(fee.id));

    return { success: true, data: availableFees as SeasonFee[] };
  } catch (error) {
    console.error('[Payments] Unexpected error in getAvailableFeesForPlayer:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 7. Get League Seasons with Fees
// ============================================================================

export async function getLeagueSeasonsWithFees(
  leagueId: string
): Promise<ActionResult<Array<{ id: string; name: string; feeCount: number }>>> {
  try {
    const access = await verifyLeagueAdminAccess(leagueId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const supabase = await createClient();

    // Get seasons with fee counts
    const { data: seasons, error } = await supabase
      .from('seasons')
      .select(
        `
        id,
        name,
        season_fees:season_fees(count)
      `
      )
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('[Payments] Get seasons with fees error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to fetch seasons.' };
    }

    const result = (seasons || []).map((season) => ({
      id: season.id,
      name: season.name,
      feeCount: (season.season_fees as any)?.[0]?.count || 0,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('[Payments] Unexpected error in getLeagueSeasonsWithFees:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
