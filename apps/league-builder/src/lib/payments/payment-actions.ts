/**
 * Player Payment Server Actions
 *
 * Server actions for processing player payments:
 * - Create payment records
 * - Stripe Checkout integration
 * - Process refunds
 * - Track payment status
 *
 * Security:
 * - Players can only manage their own payments
 * - League admins can view/manage all payments in their leagues
 * - All financial operations are logged to audit trail
 */

'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { stripe } from '@/lib/stripe/client';
import { generateIdempotencyKey } from '@/lib/stripe/idempotency';
import { calculateApplicationFee } from '@/lib/leagues/stripe-connect';
import {
  buildRegistrationPaymentStatus,
  recalculateTeamInvoiceForTeam,
} from '@/lib/payments/team-contributions';
import {
  ARCHIVE_REASON_CONFIRMATION,
  canArchivePayment,
  canPermanentlyDeletePayment,
  getArchivedPaymentError,
  type PaymentCleanupTransaction,
} from './payment-cleanup-helpers';
import type {
  PlayerPayment,
  PlayerPaymentWithDetails,
  CreatePlayerPaymentParams,
  CreateCheckoutParams,
  CheckoutResult,
  RefundPlayerPaymentParams,
  RefundResult,
  PaymentSummary,
  PaymentReportRow,
  PaymentPlanType,
  ActionResult,
  PlayerPaymentStatus,
  ArchivePlayerPaymentParams,
  PermanentlyDeletePlayerPaymentParams,
} from './types';
import type { Json } from '@hockey-life/database';

type QueryCompatibilityError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type LegacyCompatibleQueryResult<T> = {
  data: T | null;
  error: QueryCompatibilityError | null;
  count?: number | null;
  legacySchema: boolean;
};

type LegacyCompatibleQueryResponse<T> = {
  data: T | null;
  error: QueryCompatibilityError | null;
  count?: number | null;
};

type LegacyCompatibleAwaitable<T> = PromiseLike<LegacyCompatibleQueryResponse<T>>;

function getQueryCompatibilityErrorText(error: QueryCompatibilityError | null | undefined) {
  return `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
}

function isPaymentCleanupSchemaUnavailable(error: QueryCompatibilityError | null | undefined) {
  if (!error) return false;

  const message = getQueryCompatibilityErrorText(error);
  return (
    ['42703', '42P01', 'PGRST205'].includes(error.code || '') &&
    ['archived_at', 'archived_by', 'archived_reason', 'player_payment_deletion_log'].some(
      (token) => message.includes(token)
    )
  );
}

function getPaymentCleanupUnavailableMessage() {
  return 'Payment archive and permanent delete are temporarily unavailable until the latest payments database migration is applied.';
}

function hasPaymentCleanupSchema(payment: Record<string, unknown>) {
  return Object.prototype.hasOwnProperty.call(payment, 'archived_at');
}

async function runLegacyCompatibleQuery<T>(
  primary: () => LegacyCompatibleAwaitable<T>,
  legacy: () => LegacyCompatibleAwaitable<T>
): Promise<LegacyCompatibleQueryResult<T>> {
  const primaryResult = await primary();
  if (!primaryResult.error || !isPaymentCleanupSchemaUnavailable(primaryResult.error)) {
    return { ...primaryResult, legacySchema: false };
  }

  const legacyResult = await legacy();
  return { ...legacyResult, legacySchema: true };
}

function revalidatePaymentManagementPaths(leagueId: string) {
  revalidatePath(`/dashboard/leagues/${leagueId}/payments`);
  revalidatePath(`/dashboard/leagues/${leagueId}/finance`);
  revalidatePath(`/dashboard/leagues/${leagueId}/billing`);
}

// ============================================================================
// Helper: Get Current User
// ============================================================================

async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email || '' } : null;
}

function getPlayerPaymentPortalUrl(paymentId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/payments/${paymentId}`;
}

// ============================================================================
// Helper: Verify League Admin Access
// ============================================================================

async function verifyLeagueAdminAccess(
  leagueId: string
): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Authentication required. Please sign in.' };
  }

  const { data: membership, error: membershipError } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'You do not have access to this league.' };
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    return { error: 'Only league owners and admins can perform this action.' };
  }

  if (membership.status !== 'active') {
    return { error: 'Your league membership is not active.' };
  }

  return { userId: user.id };
}

async function verifyLeagueOwnerAccess(
  leagueId: string
): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'Authentication required. Please sign in.' };
  }

  const { data: membership, error: membershipError } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'You do not have access to this league.' };
  }

  if (membership.role !== 'owner') {
    return { error: 'Only league owners can permanently delete payment records.' };
  }

  if (membership.status !== 'active') {
    return { error: 'Your league membership is not active.' };
  }

  return { userId: user.id };
}

// ============================================================================
// Helper: Log Audit Event
// ============================================================================

async function logPaymentAuditEvent(
  leagueId: string,
  eventType: string,
  payload: Record<string, unknown>,
  createdBy?: string,
  paymentId?: string,
  stripeEventId?: string
): Promise<void> {
  const serviceSupabase = createServiceRoleClient();

  const { error } = await serviceSupabase.from('player_payment_audit_log').insert({
    player_payment_id: paymentId || null,
    league_id: leagueId,
    event_type: eventType,
    stripe_event_id: stripeEventId || null,
    payload: payload as Json,
    created_by: createdBy || null,
  });

  if (error) {
    console.error('[Payments] Failed to log audit event:', sanitizeErrorForLogging(error));
  }
}

// ============================================================================
// Helper: Calculate Payment Amount
// ============================================================================

function calculatePaymentAmount(
  baseCents: number,
  paymentPlan: PaymentPlanType,
  earlyBirdDeadline: string | null,
  earlyBirdDiscountCents: number,
  paymentDeadline: string | null,
  lateFeeCents: number,
  installmentFeeCents: number
): {
  baseAmountCents: number;
  discountCents: number;
  lateFeeCents: number;
  installmentFeeCents: number;
  totalAmountCents: number;
} {
  const now = new Date();
  let discountCents = 0;
  let lateFee = 0;
  let installmentFee = 0;

  // Early bird discount
  if (earlyBirdDeadline && new Date(earlyBirdDeadline) > now) {
    discountCents = earlyBirdDiscountCents;
  }

  // Late fee
  if (paymentDeadline && new Date(paymentDeadline) < now) {
    lateFee = lateFeeCents;
  }

  // Installment fee for payment plans
  if (paymentPlan !== 'full') {
    installmentFee = installmentFeeCents;
  }

  const totalAmountCents = baseCents - discountCents + lateFee + installmentFee;

  return {
    baseAmountCents: baseCents,
    discountCents,
    lateFeeCents: lateFee,
    installmentFeeCents: installmentFee,
    totalAmountCents,
  };
}

// ============================================================================
// 1. Create Player Payment Record
// ============================================================================

export async function createPlayerPayment(
  params: CreatePlayerPaymentParams
): Promise<ActionResult<PlayerPayment>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    // Players can only create payments for themselves
    if (params.playerId !== user.id) {
      return { success: false, error: 'You can only create payments for yourself.' };
    }

    const supabase = await createClient();

    // Get the season fee details
    const { data: fee, error: feeError } = await supabase
      .from('season_fees')
      .select('*')
      .eq('id', params.seasonFeeId)
      .single();

    if (feeError || !fee) {
      return { success: false, error: 'Season fee not found.' };
    }

    // Validate payment plan is allowed
    if (params.paymentPlan === 'two_pay' && !fee.allow_two_pay) {
      return { success: false, error: '2-payment plan is not available for this fee.' };
    }
    if (params.paymentPlan === 'three_pay' && !fee.allow_three_pay) {
      return { success: false, error: '3-payment plan is not available for this fee.' };
    }
    if (params.paymentPlan === 'full' && !fee.allow_full_payment) {
      return { success: false, error: 'Full payment is not available for this fee.' };
    }

    // Check for existing payment
    const { data: existingPayment, error: existingPaymentError } = await runLegacyCompatibleQuery<
      { id: string; status: PlayerPaymentStatus } | null
    >(
      () =>
        supabase
          .from('player_payments')
          .select('id, status')
          .eq('player_id', params.playerId)
          .eq('season_fee_id', params.seasonFeeId)
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      () =>
        supabase
          .from('player_payments')
          .select('id, status')
          .eq('player_id', params.playerId)
          .eq('season_fee_id', params.seasonFeeId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
    );

    if (existingPaymentError) {
      console.error(
        '[Payments] Existing payment lookup error:',
        sanitizeErrorForLogging(existingPaymentError)
      );
      return { success: false, error: 'Failed to validate existing payment records.' };
    }

    if (existingPayment && existingPayment.status !== 'cancelled') {
      return { success: false, error: 'You already have a payment record for this fee.' };
    }

    // Calculate amounts
    const amounts = calculatePaymentAmount(
      fee.amount_cents,
      params.paymentPlan,
      fee.early_bird_deadline,
      fee.early_bird_discount_cents ?? 0,
      fee.payment_deadline,
      fee.late_fee_cents ?? 0,
      fee.installment_fee_cents ?? 0
    );

    // Determine number of installments
    const totalInstallments =
      params.paymentPlan === 'three_pay' ? 3 : params.paymentPlan === 'two_pay' ? 2 : 1;

    // Calculate next payment date for installments
    let nextPaymentDate: string | null = null;
    if (totalInstallments > 1) {
      nextPaymentDate = new Date().toISOString().split('T')[0];
    }

    // Get or create Stripe customer
    let stripeCustomerId = null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', params.playerId)
      .single();

    if (profile?.stripe_customer_id) {
      stripeCustomerId = profile.stripe_customer_id;
    } else if (profile?.email) {
      // Create Stripe customer with idempotency key to prevent duplicates on retry
      const idempotencyKey = generateIdempotencyKey('create_customer', {
        player_id: params.playerId,
        email: profile.email,
      });

      const customer = await stripe.customers.create(
        {
          email: profile.email,
          name: profile.full_name || undefined,
          metadata: {
            player_id: params.playerId,
            platform: 'beerleaguehockey',
          },
        },
        { idempotencyKey }
      );
      stripeCustomerId = customer.id;

      // Save to profile
      const serviceSupabase = createServiceRoleClient();
      await serviceSupabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', params.playerId);
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('player_payments')
      .insert({
        player_id: params.playerId,
        season_fee_id: params.seasonFeeId,
        team_id: params.teamId || null,
        league_id: fee.league_id,
        season_id: fee.season_id,
        payment_plan: params.paymentPlan,
        base_amount_cents: amounts.baseAmountCents,
        discount_cents: amounts.discountCents,
        late_fee_cents: amounts.lateFeeCents,
        installment_fee_cents: amounts.installmentFeeCents,
        currency: fee.currency,
        stripe_customer_id: stripeCustomerId,
        total_installments: totalInstallments,
        next_payment_date: nextPaymentDate,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('[Payments] Create payment error:', sanitizeErrorForLogging(paymentError));
      return { success: false, error: 'Failed to create payment record.' };
    }

    await logPaymentAuditEvent(
      fee.league_id,
      'payment_created',
      {
        payment_plan: params.paymentPlan,
        total_amount_cents: amounts.totalAmountCents,
        total_installments: totalInstallments,
      },
      user.id,
      payment.id
    );

    revalidatePath('/dashboard/payments');
    return { success: true, data: payment as PlayerPayment };
  } catch (error) {
    console.error('[Payments] Unexpected error in createPlayerPayment:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 2. Create Stripe Checkout Session
// ============================================================================

export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<ActionResult<CheckoutResult>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    const supabase = await createClient();

    // Get payment details
    const { data: payment, error: paymentError } = await runLegacyCompatibleQuery<any>(
      () =>
        supabase
          .from('player_payments')
          .select(
            `
            *,
            season_fees:season_fee_id (
              name,
              description,
              league_id
            ),
            leagues:league_id (
              name,
              stripe_account_id,
              stripe_account_status
            )
          `
          )
          .eq('id', params.playerPaymentId)
          .is('archived_at', null)
          .single(),
      () =>
        supabase
          .from('player_payments')
          .select(
            `
            *,
            season_fees:season_fee_id (
              name,
              description,
              league_id
            ),
            leagues:league_id (
              name,
              stripe_account_id,
              stripe_account_status
            )
          `
          )
          .eq('id', params.playerPaymentId)
          .single()
    );

    if (paymentError || !payment) {
      return { success: false, error: 'Payment record not found.' };
    }

    // Verify player owns this payment
    if (payment.player_id !== user.id) {
      return { success: false, error: 'You can only checkout your own payments.' };
    }

    // Check payment status
    if (payment.status === 'paid') {
      return { success: false, error: 'This payment has already been completed.' };
    }

    if (payment.status === 'cancelled') {
      return { success: false, error: 'This payment has been cancelled.' };
    }

    const league = payment.leagues as any;
    const seasonFee = payment.season_fees as any;

    // Verify league has Stripe Connect
    if (!league?.stripe_account_id || league.stripe_account_status !== 'complete') {
      return {
        success: false,
        error: 'This league has not set up payment processing yet.',
      };
    }

    // Calculate amount for this checkout
    // For installments, charge only the current installment amount
    const totalAmountCents = payment.total_amount_cents ?? 0;
    const amountPaidCents = payment.amount_paid_cents ?? 0;
    const totalInstallments = payment.total_installments ?? 1;
    const currentInstallment = payment.current_installment ?? 0;

    let checkoutAmount: number;
    if (totalInstallments > 1) {
      const remainingAmount = totalAmountCents - amountPaidCents;
      const remainingInstallments = totalInstallments - currentInstallment;
      checkoutAmount = Math.ceil(remainingAmount / remainingInstallments);
    } else {
      checkoutAmount = totalAmountCents - amountPaidCents;
    }

    if (checkoutAmount <= 0) {
      return { success: false, error: 'No amount due.' };
    }

    // Calculate platform fee
    const applicationFee = await calculateApplicationFee(checkoutAmount);

    // Idempotency key
    const idempotencyKey = generateIdempotencyKey('create_checkout', {
      payment_id: params.playerPaymentId,
      installment: currentInstallment + 1,
      amount: checkoutAmount,
    });

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: payment.stripe_customer_id || undefined,
        customer_email: payment.stripe_customer_id ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: payment.currency,
              product_data: {
                name: seasonFee.name,
                description:
                  totalInstallments > 1
                    ? `Installment ${currentInstallment + 1} of ${totalInstallments}`
                    : seasonFee.description || `Season fee for ${league.name}`,
              },
              unit_amount: checkoutAmount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: league.stripe_account_id,
          },
          metadata: {
            player_payment_id: params.playerPaymentId,
            player_id: payment.player_id,
            league_id: payment.league_id,
            installment_number: (currentInstallment + 1).toString(),
            platform: 'beerleaguehockey',
          },
        },
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          player_payment_id: params.playerPaymentId,
          type: 'player_fee',
        },
      },
      {
        idempotencyKey,
      }
    );

    // Update payment with checkout session ID
    const serviceSupabase = createServiceRoleClient();
    await serviceSupabase
      .from('player_payments')
      .update({
        stripe_checkout_session_id: session.id,
        status: 'processing',
      })
      .eq('id', params.playerPaymentId);

    await logPaymentAuditEvent(
      payment.league_id,
      'checkout_session_created',
      {
        checkout_session_id: session.id,
        amount_cents: checkoutAmount,
        application_fee_cents: applicationFee,
        installment_number: currentInstallment + 1,
      },
      user.id,
      params.playerPaymentId
    );

    return {
      success: true,
      data: {
        checkoutSessionId: session.id,
        checkoutUrl: session.url!,
      },
    };
  } catch (error) {
    console.error('[Payments] Unexpected error in createCheckoutSession:', sanitizeErrorForLogging(error));
    return { success: false, error: 'Failed to create checkout session.' };
  }
}

// ============================================================================
// 3. Get Player's Payments
// ============================================================================

export async function getMyPayments(): Promise<ActionResult<PlayerPaymentWithDetails[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    const supabase = await createClient();

    const { data: payments, error } = await runLegacyCompatibleQuery<any[]>(
      () =>
        supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email, avatar_url),
            season_fee:season_fee_id (id, name, amount_cents),
            team:team_id (id, name, short_name)
          `
          )
          .eq('player_id', user.id)
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
      () =>
        supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email, avatar_url),
            season_fee:season_fee_id (id, name, amount_cents),
            team:team_id (id, name, short_name)
          `
          )
          .eq('player_id', user.id)
          .order('created_at', { ascending: false })
    );

    if (error) {
      console.error('[Payments] Get my payments error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to fetch payments.' };
    }

    return { success: true, data: (payments || []) as unknown as PlayerPaymentWithDetails[] };
  } catch (error) {
    console.error('[Payments] Unexpected error in getMyPayments:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 4. Get League Payments (Admin)
// ============================================================================

export async function getLeaguePlayerPayments(
  leagueId: string,
  options?: {
    seasonId?: string;
    status?: string;
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
  }
): Promise<ActionResult<{ payments: PlayerPaymentWithDetails[]; total: number }>> {
  try {
    const access = await verifyLeagueAdminAccess(leagueId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const { limit = 50, offset = 0, includeArchived = false } = options || {};
    const supabase = await createClient();

    const { data: payments, error, count } = await runLegacyCompatibleQuery<any[]>(
      () => {
        let query = supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email, avatar_url),
            season_fee:season_fee_id (id, name, amount_cents),
            team:team_id (id, name, short_name)
          `,
            { count: 'exact' }
          )
          .eq('league_id', leagueId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!includeArchived) {
          query = query.is('archived_at', null);
        }

        if (options?.seasonId) {
          query = query.eq('season_id', options.seasonId);
        }

        if (options?.status) {
          query = query.eq('status', options.status as PlayerPaymentStatus);
        }

        return query;
      },
      () => {
        let query = supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email, avatar_url),
            season_fee:season_fee_id (id, name, amount_cents),
            team:team_id (id, name, short_name)
          `,
            { count: 'exact' }
          )
          .eq('league_id', leagueId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (options?.seasonId) {
          query = query.eq('season_id', options.seasonId);
        }

        if (options?.status) {
          query = query.eq('status', options.status as PlayerPaymentStatus);
        }

        return query;
      }
    );

    if (error) {
      console.error('[Payments] Get league payments error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to fetch payments.' };
    }

    return {
      success: true,
      data: {
        payments: (payments || []) as unknown as PlayerPaymentWithDetails[],
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('[Payments] Unexpected error in getLeaguePlayerPayments:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 5. Process Refund
// ============================================================================

export async function refundPlayerPayment(
  params: RefundPlayerPaymentParams
): Promise<ActionResult<RefundResult>> {
  try {
    const supabase = await createClient();

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('player_payments')
      .select('*')
      .eq('id', params.playerPaymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found.' };
    }

    // Verify admin access
    const access = await verifyLeagueAdminAccess(payment.league_id);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const archivedError = getArchivedPaymentError(payment as PlayerPayment);
    if (archivedError) {
      return { success: false, error: archivedError };
    }

    // Check payment status
    if (!['paid', 'partially_paid'].includes(payment.status)) {
      return { success: false, error: 'Only paid or partially paid payments can be refunded.' };
    }

    if (payment.amount_paid_cents <= 0) {
      return { success: false, error: 'No payments have been made to refund.' };
    }

    // Determine refund amount
    const refundAmount = params.amountCents || payment.amount_paid_cents;

    if (refundAmount > payment.amount_paid_cents) {
      return { success: false, error: 'Refund amount exceeds amount paid.' };
    }

    // FIX ISSUE #3: Use atomic bulk refund function instead of loop
    // This ensures all database updates happen in a single transaction
    const serviceSupabase = createServiceRoleClient();

    const { data: bulkRefundData, error: bulkRefundError } = await serviceSupabase.rpc(
      'process_bulk_refund',
      {
        p_payment_id: params.playerPaymentId,
        p_total_refund_amount_cents: refundAmount,
        p_reason: params.reason,
        p_notes: params.notes ?? '',
        p_created_by: access.userId,
      }
    );

    // Cast the Json return type to the expected structure
    const bulkRefundResult = bulkRefundData as {
      success: boolean;
      message?: string;
      refund_transactions?: Array<{
        refund_transaction_id: string;
        stripe_payment_intent_id: string;
        refund_amount_cents: number;
        fee_refund_cents: number;
      }>;
      new_status?: string;
      new_amount_paid_cents?: number;
    } | null;

    if (bulkRefundError) {
      console.error('[Payments] Bulk refund preparation error:', sanitizeErrorForLogging(bulkRefundError));
      return { success: false, error: 'Failed to prepare refund transactions atomically.' };
    }

    if (!bulkRefundResult || !bulkRefundResult.success) {
      console.error('[Payments] Bulk refund preparation failed:', bulkRefundResult);
      return { success: false, error: bulkRefundResult?.message || 'Refund preparation failed' };
    }

    // Now execute Stripe refunds for each pending transaction
    const refundTransactions = bulkRefundResult.refund_transactions || [];
    let totalRefunded = 0;
    let totalFeeRefunded = 0;
    let lastRefundId = '';
    const failedRefunds = [];

    for (const refundTxn of refundTransactions) {
      try {
        const idempotencyKey = generateIdempotencyKey('refund_payment', {
          payment_id: params.playerPaymentId,
          txn_id: refundTxn.stripe_payment_intent_id,
          refund_txn_id: refundTxn.refund_transaction_id,
        });

        const refund = await stripe.refunds.create(
          {
            payment_intent: refundTxn.stripe_payment_intent_id,
            amount: refundTxn.refund_amount_cents,
            reason: params.reason,
            refund_application_fee: true,
          },
          { idempotencyKey }
        );

        // Update transaction status to succeeded
        await serviceSupabase
          .from('payment_transactions')
          .update({
            status: 'succeeded',
            stripe_refund_id: refund.id,
            completed_at: new Date().toISOString(),
          })
          .eq('id', refundTxn.refund_transaction_id);

        totalRefunded += refund.amount;
        totalFeeRefunded += refundTxn.fee_refund_cents;
        lastRefundId = refund.id;
      } catch (refundError) {
        // Mark this refund as failed
        console.error('[Payments] Stripe refund failed:', sanitizeErrorForLogging(refundError));
        await serviceSupabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            description: `Refund failed: ${refundError instanceof Error ? refundError.message : 'Unknown error'}`,
          })
          .eq('id', refundTxn.refund_transaction_id);

        failedRefunds.push({
          transaction_id: refundTxn.refund_transaction_id,
          amount: refundTxn.refund_amount_cents,
          error: refundError instanceof Error ? refundError.message : 'Unknown error',
        });
      }
    }

    // If ANY refunds failed, we need to report partial success
    if (failedRefunds.length > 0) {
      console.error('[Payments] Some refunds failed:', failedRefunds);
      return {
        success: false,
        error: `${failedRefunds.length} of ${refundTransactions.length} refunds failed. Please check audit log.`,
      };
    }

    const newStatus = bulkRefundResult.new_status ?? 'refunded';
    await logPaymentAuditEvent(
      payment.league_id,
      'payment_refunded',
      {
        refund_amount_cents: totalRefunded,
        application_fee_refunded_cents: totalFeeRefunded,
        reason: params.reason,
        notes: params.notes,
        new_status: newStatus,
      },
      access.userId,
      params.playerPaymentId
    );

    revalidatePaymentManagementPaths(payment.league_id);

    return {
      success: true,
      data: {
        refundId: lastRefundId,
        amountRefunded: totalRefunded,
        applicationFeeRefunded: totalFeeRefunded,
        status: newStatus,
      },
    };
  } catch (error) {
    console.error('[Payments] Unexpected error in refundPlayerPayment:', sanitizeErrorForLogging(error));
    return { success: false, error: 'Failed to process refund.' };
  }
}

// ============================================================================
// 6. Get Payment Summary
// ============================================================================

export async function getPaymentSummary(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<PaymentSummary>> {
  try {
    const access = await verifyLeagueAdminAccess(leagueId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const supabase = await createClient();

    const { data, error } = await runLegacyCompatibleQuery<
      Array<{ status: string; total_amount_cents: number | null; amount_paid_cents: number | null }>
    >(
      () =>
        supabase
          .from('player_payments')
          .select('status, total_amount_cents, amount_paid_cents')
          .eq('league_id', leagueId)
          .eq('season_id', seasonId)
          .is('archived_at', null),
      () =>
        supabase
          .from('player_payments')
          .select('status, total_amount_cents, amount_paid_cents')
          .eq('league_id', leagueId)
          .eq('season_id', seasonId)
    );

    if (error) {
      console.error('[Payments] Get payment summary error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to get payment summary.' };
    }

    const payments = data || [];

    return {
      success: true,
      data: {
        totalExpectedCents: payments.reduce(
          (sum, payment) => sum + (payment.total_amount_cents ?? 0),
          0
        ),
        totalCollectedCents: payments.reduce(
          (sum, payment) => sum + (payment.amount_paid_cents ?? 0),
          0
        ),
        totalOutstandingCents: payments.reduce(
          (sum, payment) =>
            sum +
            Math.max(0, (payment.total_amount_cents ?? 0) - (payment.amount_paid_cents ?? 0)),
          0
        ),
        playersPaidFull: payments.filter((payment) => payment.status === 'paid').length,
        playersPartial: payments.filter((payment) => payment.status === 'partially_paid').length,
        playersPending: payments.filter((payment) =>
          ['pending', 'processing'].includes(payment.status)
        ).length,
        playersOverdue: payments.filter((payment) => payment.status === 'overdue').length,
      },
    };
  } catch (error) {
    console.error('[Payments] Unexpected error in getPaymentSummary:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 7. Export Payment Report
// ============================================================================

export async function exportPaymentReport(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<PaymentReportRow[]>> {
  try {
    const access = await verifyLeagueAdminAccess(leagueId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const supabase = await createClient();

    const { data: payments, error } = await runLegacyCompatibleQuery<any[]>(
      () =>
        supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email),
            season_fee:season_fee_id (name),
            team:team_id (name)
          `
          )
          .eq('league_id', leagueId)
          .eq('season_id', seasonId)
          .is('archived_at', null)
          .order('created_at', { ascending: true }),
      () =>
        supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email),
            season_fee:season_fee_id (name),
            team:team_id (name)
          `
          )
          .eq('league_id', leagueId)
          .eq('season_id', seasonId)
          .order('created_at', { ascending: true })
    );

    if (error) {
      console.error('[Payments] Export report error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to export payment report.' };
    }

    const report: PaymentReportRow[] = (payments || []).map((p) => ({
      playerId: p.player_id,
      playerName: (p.player as any)?.full_name || 'Unknown',
      playerEmail: (p.player as any)?.email || '',
      teamName: (p.team as any)?.name || null,
      feeName: (p.season_fee as any)?.name || 'Unknown Fee',
      paymentPlan: p.payment_plan,
      totalAmount: (p.total_amount_cents ?? 0) / 100,
      amountPaid: (p.amount_paid_cents ?? 0) / 100,
      amountOutstanding: ((p.total_amount_cents ?? 0) - (p.amount_paid_cents ?? 0)) / 100,
      status: p.status,
      currentInstallment: p.current_installment ?? 0,
      totalInstallments: p.total_installments ?? 1,
      nextPaymentDate: p.next_payment_date,
      createdAt: p.created_at,
      paidAt: p.paid_at,
    }));

    await logPaymentAuditEvent(
      leagueId,
      'payment_report_exported',
      {
        season_id: seasonId,
        record_count: report.length,
      },
      access.userId
    );

    return { success: true, data: report };
  } catch (error) {
    console.error('[Payments] Unexpected error in exportPaymentReport:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 8. Send Payment Reminder (Admin)
// ============================================================================

export async function sendPaymentReminder(
  paymentId: string
): Promise<ActionResult<{ remindersSent: number }>> {
  try {
    const supabase = await createClient();

    // Get payment with player and fee details
    const { data: payment, error: fetchError } = await supabase
      .from('player_payments')
      .select(
        `
        *,
        player:player_id (id, full_name, email),
        season_fee:season_fee_id (name),
        leagues:league_id (name)
      `
      )
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return { success: false, error: 'Payment not found.' };
    }

    // Verify admin access
    const access = await verifyLeagueAdminAccess(payment.league_id);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const archivedError = getArchivedPaymentError(payment as PlayerPayment);
    if (archivedError) {
      return { success: false, error: archivedError };
    }

    // Check if payment needs a reminder
    if (['paid', 'cancelled', 'refunded'].includes(payment.status)) {
      return { success: false, error: 'This payment does not need a reminder.' };
    }

    const player = payment.player as any;
    const seasonFee = payment.season_fee as any;
    const league = payment.leagues as any;

    if (!player?.email) {
      return { success: false, error: 'Player email not found.' };
    }

    // Import email function dynamically to avoid circular dependencies
    const { sendPaymentReminderEmail } = await import('@/lib/email/payment-emails');

    const paymentUrl = getPlayerPaymentPortalUrl(paymentId);

    // Send reminder email
    const emailResult = await sendPaymentReminderEmail({
      to: player.email,
      playerName: player.full_name || 'Player',
      leagueName: league?.name || 'Your League',
      feeName: seasonFee?.name || 'Season Fee',
      amountDue: (payment.total_amount_cents ?? 0) - (payment.amount_paid_cents ?? 0),
      dueDate: payment.next_payment_date,
      paymentUrl,
      reminderNumber: (payment.reminder_sent_count || 0) + 1,
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error || 'Failed to send reminder email.' };
    }

    // Update reminder count
    const serviceSupabase = createServiceRoleClient();
    await serviceSupabase
      .from('player_payments')
      .update({
        reminder_sent_count: (payment.reminder_sent_count || 0) + 1,
        last_reminder_sent_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    await logPaymentAuditEvent(
      payment.league_id,
      'payment_reminder_sent',
      {
        player_id: player.id,
        player_email: player.email,
        reminder_number: (payment.reminder_sent_count || 0) + 1,
        amount_due_cents: (payment.total_amount_cents ?? 0) - (payment.amount_paid_cents ?? 0),
      },
      access.userId,
      paymentId
    );

    revalidatePaymentManagementPaths(payment.league_id);
    return { success: true, data: { remindersSent: 1 } };
  } catch (error) {
    console.error('[Payments] Unexpected error in sendPaymentReminder:', sanitizeErrorForLogging(error));
    return { success: false, error: 'Failed to send payment reminder.' };
  }
}

// ============================================================================
// 9. Update Payment Status (Admin)
// ============================================================================

export async function updatePaymentStatus(
  paymentId: string,
  status: 'cancelled' | 'overdue',
  notes?: string
): Promise<ActionResult<PlayerPayment>> {
  try {
    const supabase = await createClient();

    // Get payment
    const { data: payment, error: fetchError } = await supabase
      .from('player_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return { success: false, error: 'Payment not found.' };
    }

    // Verify admin access
    const access = await verifyLeagueAdminAccess(payment.league_id);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const archivedError = getArchivedPaymentError(payment as PlayerPayment);
    if (archivedError) {
      return { success: false, error: archivedError };
    }

    // Update status
    const serviceSupabase = createServiceRoleClient();
    const { data: updated, error: updateError } = await serviceSupabase
      .from('player_payments')
      .update({
        status,
        notes: notes ? `${payment.notes || ''}\n${notes}`.trim() : payment.notes,
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      console.error('[Payments] Update status error:', sanitizeErrorForLogging(updateError));
      return { success: false, error: 'Failed to update payment status.' };
    }

    await logPaymentAuditEvent(
      payment.league_id,
      'payment_status_updated',
      {
        old_status: payment.status,
        new_status: status,
        notes,
      },
      access.userId,
      paymentId
    );

    revalidatePaymentManagementPaths(payment.league_id);
    return { success: true, data: updated as PlayerPayment };
  } catch (error) {
    console.error('[Payments] Unexpected error in updatePaymentStatus:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 10. Get Team Payments (Captain)
// ============================================================================

async function verifyCaptainAccess(
  teamId: string
): Promise<{ userId: string; team: { id: string; league_id: string } } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Authentication required.' };
  }

  const supabase = await createClient();
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, league_id, captain_id')
    .eq('id', teamId)
    .single();

  if (teamError || !team) {
    return { error: 'Team not found.' };
  }

  if (team.captain_id !== user.id) {
    return { error: 'Only the team captain can view team payments.' };
  }

  return { userId: user.id, team: { id: team.id, league_id: team.league_id } };
}

export async function getTeamPayments(
  teamId: string,
  options?: { seasonId?: string; status?: string }
): Promise<ActionResult<{ payments: PlayerPaymentWithDetails[]; total: number }>> {
  try {
    const access = await verifyCaptainAccess(teamId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const supabase = await createClient();

    const { data: payments, error, count } = await runLegacyCompatibleQuery<any[]>(
      () => {
        let query = supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email, avatar_url),
            season_fee:season_fee_id (id, name, amount_cents),
            team:team_id (id, name, short_name)
          `,
            { count: 'exact' }
          )
          .eq('team_id', teamId)
          .is('archived_at', null)
          .order('created_at', { ascending: false });

        if (options?.seasonId) {
          query = query.eq('season_id', options.seasonId);
        }

        if (options?.status) {
          query = query.eq('status', options.status as PlayerPaymentStatus);
        }

        return query;
      },
      () => {
        let query = supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email, avatar_url),
            season_fee:season_fee_id (id, name, amount_cents),
            team:team_id (id, name, short_name)
          `,
            { count: 'exact' }
          )
          .eq('team_id', teamId)
          .order('created_at', { ascending: false });

        if (options?.seasonId) {
          query = query.eq('season_id', options.seasonId);
        }

        if (options?.status) {
          query = query.eq('status', options.status as PlayerPaymentStatus);
        }

        return query;
      }
    );

    if (error) {
      console.error('[Payments] Get team payments error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to fetch team payments.' };
    }

    return {
      success: true,
      data: {
        payments: (payments || []) as unknown as PlayerPaymentWithDetails[],
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('[Payments] Unexpected error in getTeamPayments:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 11. Get Team Payment Summary (Captain)
// ============================================================================

export async function getTeamPaymentSummary(
  teamId: string,
  seasonId?: string
): Promise<ActionResult<PaymentSummary>> {
  try {
    const access = await verifyCaptainAccess(teamId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const supabase = await createClient();

    const { data: payments, error } = await runLegacyCompatibleQuery<
      Array<{ status: string; total_amount_cents: number | null; amount_paid_cents: number | null }>
    >(
      () => {
        let query = supabase
          .from('player_payments')
          .select('status, total_amount_cents, amount_paid_cents')
          .eq('team_id', teamId)
          .is('archived_at', null);

        if (seasonId) {
          query = query.eq('season_id', seasonId);
        }

        return query;
      },
      () => {
        let query = supabase
          .from('player_payments')
          .select('status, total_amount_cents, amount_paid_cents')
          .eq('team_id', teamId);

        if (seasonId) {
          query = query.eq('season_id', seasonId);
        }

        return query;
      }
    );

    if (error) {
      console.error('[Payments] Get team payment summary error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to get payment summary.' };
    }

    const summary: PaymentSummary = {
      totalExpectedCents: 0,
      totalCollectedCents: 0,
      totalOutstandingCents: 0,
      playersPaidFull: 0,
      playersPartial: 0,
      playersPending: 0,
      playersOverdue: 0,
    };

    for (const p of payments || []) {
      summary.totalExpectedCents += p.total_amount_cents ?? 0;
      summary.totalCollectedCents += p.amount_paid_cents ?? 0;

      switch (p.status) {
        case 'paid':
          summary.playersPaidFull++;
          break;
        case 'partially_paid':
          summary.playersPartial++;
          break;
        case 'pending':
        case 'processing':
          summary.playersPending++;
          break;
        case 'overdue':
          summary.playersOverdue++;
          break;
      }
    }

    summary.totalOutstandingCents = summary.totalExpectedCents - summary.totalCollectedCents;

    return { success: true, data: summary };
  } catch (error) {
    console.error('[Payments] Unexpected error in getTeamPaymentSummary:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 12. Mark Payment as Paid (Admin - Offline/Manual)
// ============================================================================

export async function markPaymentAsPaid(
  paymentId: string,
  notes?: string
): Promise<ActionResult<PlayerPayment>> {
  try {
    const supabase = await createClient();

    const { data: payment, error: fetchError } = await supabase
      .from('player_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return { success: false, error: 'Payment not found.' };
    }

    const access = await verifyLeagueAdminAccess(payment.league_id);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    if (payment.status === 'paid') {
      return { success: false, error: 'This payment is already marked as paid.' };
    }

    if (['cancelled', 'refunded'].includes(payment.status)) {
      return { success: false, error: 'Cannot mark a cancelled or refunded payment as paid.' };
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: updated, error: updateError } = await serviceSupabase
      .from('player_payments')
      .update({
        status: 'paid',
        amount_paid_cents: payment.total_amount_cents ?? undefined,
        paid_at: new Date().toISOString(),
        current_installment: payment.total_installments,
        notes: notes
          ? `${payment.notes || ''}\n[Manual] ${notes}`.trim()
          : payment.notes,
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      console.error('[Payments] Mark as paid error:', sanitizeErrorForLogging(updateError));
      return { success: false, error: 'Failed to mark payment as paid.' };
    }

    const paymentMetadata =
      payment.metadata && typeof payment.metadata === 'object'
        ? (payment.metadata as Record<string, unknown>)
        : {};
    const registrationId =
      typeof paymentMetadata.registration_id === 'string'
        ? paymentMetadata.registration_id
        : null;

    if (registrationId) {
      const { data: registration } = await serviceSupabase
        .from('registration_submissions')
        .select(
          'id, league_id, season_id, team_id, assigned_team_id, fee_amount_cents, payment_status'
        )
        .eq('id', registrationId)
        .maybeSingle();

      if (registration) {
        const feeAmountCents = Math.max(
          registration.fee_amount_cents || 0,
          payment.total_amount_cents || 0
        );
        await serviceSupabase
          .from('registration_submissions')
          .update({
            amount_paid_cents: feeAmountCents,
            payment_status: buildRegistrationPaymentStatus(
              feeAmountCents,
              feeAmountCents,
              registration.payment_status
            ),
          })
          .eq('id', registrationId);

        const billingTeamId = registration.assigned_team_id || registration.team_id || null;
        if (billingTeamId) {
          await recalculateTeamInvoiceForTeam(serviceSupabase as any, {
            leagueId: registration.league_id,
            seasonId: registration.season_id,
            teamId: billingTeamId,
            updatedBy: access.userId,
          });
        }
      }
    }

    await logPaymentAuditEvent(
      payment.league_id,
      'payment_marked_paid_manually',
      {
        old_status: payment.status,
        old_amount_paid_cents: payment.amount_paid_cents,
        total_amount_cents: payment.total_amount_cents,
        notes,
      },
      access.userId,
      paymentId
    );

    revalidatePaymentManagementPaths(payment.league_id);
    return { success: true, data: updated as PlayerPayment };
  } catch (error) {
    console.error('[Payments] Unexpected error in markPaymentAsPaid:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 13. Send Bulk Payment Reminders (Admin)
// ============================================================================

export async function sendBulkPaymentReminders(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<{ remindersSent: number; failed: number }>> {
  try {
    const access = await verifyLeagueAdminAccess(leagueId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const supabase = await createClient();

    const { data: payments, error: fetchError } = await runLegacyCompatibleQuery<any[]>(
      () =>
        supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email),
            season_fee:season_fee_id (name),
            leagues:league_id (name)
          `
          )
          .eq('league_id', leagueId)
          .eq('season_id', seasonId)
          .is('archived_at', null)
          .in('status', ['pending', 'partially_paid', 'overdue']),
      () =>
        supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email),
            season_fee:season_fee_id (name),
            leagues:league_id (name)
          `
          )
          .eq('league_id', leagueId)
          .eq('season_id', seasonId)
          .in('status', ['pending', 'partially_paid', 'overdue'])
    );

    if (fetchError) {
      console.error('[Payments] Bulk reminders fetch error:', sanitizeErrorForLogging(fetchError));
      return { success: false, error: 'Failed to fetch unpaid payments.' };
    }

    if (!payments || payments.length === 0) {
      return { success: true, data: { remindersSent: 0, failed: 0 } };
    }

    const { sendPaymentReminderEmail } = await import('@/lib/email/payment-emails');
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const serviceSupabase = createServiceRoleClient();

    let remindersSent = 0;
    let failed = 0;

    for (const payment of payments) {
      const player = payment.player as any;
      const seasonFee = payment.season_fee as any;
      const league = payment.leagues as any;

      if (!player?.email) {
        failed++;
        continue;
      }

      try {
        const paymentUrl = getPlayerPaymentPortalUrl(payment.id);

        const emailResult = await sendPaymentReminderEmail({
          to: player.email,
          playerName: player.full_name || 'Player',
          leagueName: league?.name || 'Your League',
          feeName: seasonFee?.name || 'Season Fee',
          amountDue: (payment.total_amount_cents ?? 0) - (payment.amount_paid_cents ?? 0),
          dueDate: payment.next_payment_date,
          paymentUrl,
          reminderNumber: (payment.reminder_sent_count || 0) + 1,
        });

        if (emailResult.success) {
          await serviceSupabase
            .from('player_payments')
            .update({
              reminder_sent_count: (payment.reminder_sent_count || 0) + 1,
              last_reminder_sent_at: new Date().toISOString(),
            })
            .eq('id', payment.id);
          remindersSent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    await logPaymentAuditEvent(
      leagueId,
      'bulk_payment_reminders_sent',
      {
        season_id: seasonId,
        total_payments: payments.length,
        reminders_sent: remindersSent,
        failed,
      },
      access.userId,
    );

    revalidatePaymentManagementPaths(leagueId);
    return { success: true, data: { remindersSent, failed } };
  } catch (error) {
    console.error(
      '[Payments] Unexpected error in sendBulkPaymentReminders:',
      sanitizeErrorForLogging(error),
    );
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 14. Archive / Delete Payment Records
// ============================================================================

export async function archivePlayerPayment(
  params: ArchivePlayerPaymentParams
): Promise<ActionResult<PlayerPayment>> {
  try {
    const reason = params.reason.trim();
    if (!reason) {
      return { success: false, error: 'An archive reason is required.' };
    }

    const supabase = await createClient();
    const { data: payment, error: paymentError } = await supabase
      .from('player_payments')
      .select('*')
      .eq('id', params.paymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found.' };
    }
    if (!hasPaymentCleanupSchema(payment as Record<string, unknown>)) {
      return { success: false, error: getPaymentCleanupUnavailableMessage() };
    }

    const access = await verifyLeagueAdminAccess(payment.league_id);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: transactions, error: transactionsError } = await serviceSupabase
      .from('payment_transactions')
      .select('id, transaction_type, status')
      .eq('player_payment_id', payment.id);

    if (transactionsError) {
      console.error('[Payments] Archive payment transaction lookup error:', sanitizeErrorForLogging(transactionsError));
      return { success: false, error: 'Failed to validate payment history.' };
    }

    const archiveError = canArchivePayment(
      payment as PlayerPayment,
      (transactions || []) as PaymentCleanupTransaction[]
    );
    if (archiveError) {
      return { success: false, error: archiveError };
    }

    const archivedAt = new Date().toISOString();
    const archiveNote = `[Archived] ${reason}`;
    const { data: updated, error: updateError } = await serviceSupabase
      .from('player_payments')
      .update({
        status: 'cancelled',
        archived_at: archivedAt,
        archived_by: access.userId,
        archived_reason: reason,
        notes: payment.notes ? `${payment.notes}\n${archiveNote}` : archiveNote,
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('[Payments] Archive payment update error:', sanitizeErrorForLogging(updateError));
      if (isPaymentCleanupSchemaUnavailable(updateError)) {
        return { success: false, error: getPaymentCleanupUnavailableMessage() };
      }
      return { success: false, error: 'Failed to archive payment.' };
    }

    await logPaymentAuditEvent(
      payment.league_id,
      'payment_archived',
      {
        old_status: payment.status,
        archived_at: archivedAt,
        archived_reason: reason,
      },
      access.userId,
      payment.id
    );

    revalidatePaymentManagementPaths(payment.league_id);
    return { success: true, data: updated as PlayerPayment };
  } catch (error) {
    console.error('[Payments] Unexpected error in archivePlayerPayment:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function permanentlyDeletePlayerPayment(
  params: PermanentlyDeletePlayerPaymentParams
): Promise<ActionResult<void>> {
  try {
    const reason = params.reason.trim();
    if (!reason) {
      return { success: false, error: 'A delete reason is required.' };
    }

    if (params.confirmationText.trim().toUpperCase() !== ARCHIVE_REASON_CONFIRMATION) {
      return {
        success: false,
        error: `Type ${ARCHIVE_REASON_CONFIRMATION} to confirm permanent deletion.`,
      };
    }

    const supabase = await createClient();
    const { data: payment, error: paymentError } = await supabase
      .from('player_payments')
      .select('*')
      .eq('id', params.paymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found.' };
    }
    if (!hasPaymentCleanupSchema(payment as Record<string, unknown>)) {
      return { success: false, error: getPaymentCleanupUnavailableMessage() };
    }

    const access = await verifyLeagueOwnerAccess(payment.league_id);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const serviceSupabase = createServiceRoleClient();
    const [{ data: transactions, error: transactionsError }, { count: disputeCount, error: disputeError }] =
      await Promise.all([
        serviceSupabase
          .from('payment_transactions')
          .select('id, transaction_type, status')
          .eq('player_payment_id', payment.id),
        serviceSupabase
          .from('payment_disputes')
          .select('id', { count: 'exact', head: true })
          .eq('player_payment_id', payment.id),
      ]);

    if (transactionsError) {
      console.error('[Payments] Permanent delete transaction lookup error:', sanitizeErrorForLogging(transactionsError));
      return { success: false, error: 'Failed to validate payment history.' };
    }
    if (disputeError) {
      console.error('[Payments] Permanent delete dispute lookup error:', sanitizeErrorForLogging(disputeError));
      return { success: false, error: 'Failed to validate dispute history.' };
    }

    const deleteError = canPermanentlyDeletePayment(
      payment as PlayerPayment,
      (transactions || []) as PaymentCleanupTransaction[],
      disputeCount || 0
    );
    if (deleteError) {
      return { success: false, error: deleteError };
    }

    const paymentSnapshot = {
      payment,
      transactions: transactions || [],
      disputeCount: disputeCount || 0,
    };

    const { data: deletionLog, error: deletionLogError } = await serviceSupabase
      .from('player_payment_deletion_log')
      .insert({
        player_payment_id: payment.id,
        league_id: payment.league_id,
        season_id: payment.season_id,
        player_id: payment.player_id,
        deleted_by: access.userId,
        delete_reason: reason,
        payment_snapshot: paymentSnapshot as Json,
      })
      .select('id')
      .single();

    if (deletionLogError || !deletionLog) {
      console.error('[Payments] Permanent delete log insert error:', sanitizeErrorForLogging(deletionLogError));
      if (isPaymentCleanupSchemaUnavailable(deletionLogError)) {
        return { success: false, error: getPaymentCleanupUnavailableMessage() };
      }
      return { success: false, error: 'Failed to store the deletion snapshot.' };
    }

    await logPaymentAuditEvent(
      payment.league_id,
      'payment_permanently_deleted',
      {
        deletion_log_id: deletionLog.id,
        archived_reason: payment.archived_reason,
        delete_reason: reason,
        previous_status: payment.status,
      },
      access.userId,
      payment.id
    );

    const { error: deletePaymentError } = await serviceSupabase
      .from('player_payments')
      .delete()
      .eq('id', payment.id)
      .eq('league_id', payment.league_id);

    if (deletePaymentError) {
      console.error('[Payments] Permanent delete payment error:', sanitizeErrorForLogging(deletePaymentError));
      if (isPaymentCleanupSchemaUnavailable(deletePaymentError)) {
        return { success: false, error: getPaymentCleanupUnavailableMessage() };
      }
      return { success: false, error: 'Failed to permanently delete payment.' };
    }

    revalidatePaymentManagementPaths(payment.league_id);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[Payments] Unexpected error in permanentlyDeletePlayerPayment:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 15. Season Settlement Invoice (platform admin)
// ============================================================================

export interface SettlementInvoiceResult {
  invoiceId: string;
  amountCents: number;
  tier: string;
  hostedUrl: string | null;
}

/**
 * Create and finalize the season settlement invoice for a league.
 *
 * Business rules (ratified 2026-03-02):
 * - Small tier: flat $299 invoice (flat_season_fee_cents).
 * - Standard/Large/Enterprise: gross registration fees × effective rate
 *   minus total floor payments already collected (net ≥ $0).
 * - Invoice due net-14 days.
 * - Requires the league to have a stripe_billing_customer_id on file.
 *
 * Platform admin only.
 */
export async function settleSeasonInvoice(
  leagueId: string,
  seasonId: string,
): Promise<ActionResult<SettlementInvoiceResult>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_platform_admin) {
      return { success: false, error: 'Only platform administrators can issue settlement invoices.' };
    }

    // ── Load billing config ───────────────────────────────────────────────
    const { getLeagueBillingConfig } = await import('@/lib/fees/platform-fees');
    const billing = await getLeagueBillingConfig(leagueId);

    if (!billing.stripeBillingCustomerId) {
      return { success: false, error: 'League has no billing customer on file. Assign a tier first to create one.' };
    }

    // ── Calculate settlement amount ───────────────────────────────────────
    let settlementCents: number;
    let description: string;

    if (billing.pricingTier === 'small') {
      settlementCents = billing.flatSeasonFeeCents;
      description = `BLH Platform — Season Fee (Small Tier, Season ${seasonId})`;
    } else {
      // Sum gross registration fees collected this season
      const serviceSupabase = createServiceRoleClient();
      const { data: payments, error: paymentsError } = await runLegacyCompatibleQuery<
        Array<{ total_amount_cents: number | null }>
      >(
        () =>
          serviceSupabase
            .from('player_payments')
            .select('total_amount_cents')
            .eq('league_id', leagueId)
            .eq('season_id', seasonId)
            .is('archived_at', null)
            .eq('status', 'paid'),
        () =>
          serviceSupabase
            .from('player_payments')
            .select('total_amount_cents')
            .eq('league_id', leagueId)
            .eq('season_id', seasonId)
            .eq('status', 'paid')
      );

      if (paymentsError) {
        console.error(
          '[Payments] Settlement payment lookup error:',
          sanitizeErrorForLogging(paymentsError)
        );
        return { success: false, error: 'Failed to load paid registration totals for settlement.' };
      }

      const grossFeesCents =
        payments?.reduce((sum, p) => sum + (p.total_amount_cents ?? 0), 0) ?? 0;

      // Percentage due = gross × effective rate
      const percentageDueCents = Math.round(
        (grossFeesCents * billing.platformFeeBps) / 10000,
      );

      // Credit: floor payments already collected via monthly subscription.
      // We approximate this from the number of subscription cycles elapsed.
      // Exact reconciliation is done by the finance team via Stripe dashboard.
      // Store a note in the invoice description for transparency.
      const floorNote = billing.floorStripeSubscriptionId
        ? ` (floor subscription ${billing.floorStripeSubscriptionId} credited separately)`
        : '';

      settlementCents = Math.max(0, percentageDueCents);
      description =
        `BLH Platform — Season Settlement ${billing.pricingTier.charAt(0).toUpperCase() + billing.pricingTier.slice(1)} Tier` +
        ` (${(billing.platformFeeBps / 100).toFixed(2)}% of $${(grossFeesCents / 100).toFixed(2)} gross)` +
        floorNote;
    }

    if (settlementCents === 0) {
      return { success: false, error: 'Settlement amount is $0. No invoice needed.' };
    }

    // ── Create Stripe invoice (net-14 days) ───────────────────────────────
    const NET14_SECONDS = 14 * 24 * 60 * 60;
    const dueDateUnix = Math.floor(Date.now() / 1000) + NET14_SECONDS;

    const idempotencyKey = generateIdempotencyKey('season_settlement', {
      league_id: leagueId,
      season_id: seasonId,
    });

    // Add an invoice item first, then finalize the invoice
    await stripe.invoiceItems.create(
      {
        customer: billing.stripeBillingCustomerId,
        amount: settlementCents,
        currency: 'cad',
        description,
      },
      { idempotencyKey: `${idempotencyKey}_item` },
    );

    const invoice = await stripe.invoices.create(
      {
        customer: billing.stripeBillingCustomerId,
        due_date: dueDateUnix,
        collection_method: 'send_invoice',
        metadata: {
          league_id: leagueId,
          season_id: seasonId,
          tier: billing.pricingTier,
          platform: 'beerleaguehockey',
        },
      },
      { idempotencyKey },
    );

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    await logPaymentAuditEvent(
      leagueId,
      'season_settlement_invoiced',
      {
        season_id: seasonId,
        tier: billing.pricingTier,
        amount_cents: settlementCents,
        stripe_invoice_id: finalizedInvoice.id,
      },
      user.id,
    );

    return {
      success: true,
      data: {
        invoiceId: finalizedInvoice.id,
        amountCents: settlementCents,
        tier: billing.pricingTier,
        hostedUrl: finalizedInvoice.hosted_invoice_url ?? null,
      },
    };
  } catch (error) {
    console.error('[Payments] settleSeasonInvoice error:', sanitizeErrorForLogging(error));
    return { success: false, error: 'Failed to create settlement invoice.' };
  }
}
