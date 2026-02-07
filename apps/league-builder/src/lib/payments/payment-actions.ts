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
} from './types';
import type { Json } from '@hockey-life/database';

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
    const { data: existingPayment } = await supabase
      .from('player_payments')
      .select('id, status')
      .eq('player_id', params.playerId)
      .eq('season_fee_id', params.seasonFeeId)
      .single();

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
    const { data: payment, error: paymentError } = await supabase
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
      .single();

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

    const { data: payments, error } = await supabase
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Payments] Get my payments error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to fetch payments.' };
    }

    return { success: true, data: (payments || []) as PlayerPaymentWithDetails[] };
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
  options?: { seasonId?: string; status?: string; limit?: number; offset?: number }
): Promise<ActionResult<{ payments: PlayerPaymentWithDetails[]; total: number }>> {
  try {
    const access = await verifyLeagueAdminAccess(leagueId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    const { limit = 50, offset = 0 } = options || {};
    const supabase = await createClient();

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

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('[Payments] Get league payments error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to fetch payments.' };
    }

    return {
      success: true,
      data: {
        payments: (payments || []) as PlayerPaymentWithDetails[],
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

    revalidatePath(`/dashboard/leagues/${payment.league_id}/payments`);

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

    const { data, error } = await supabase.rpc('get_payment_summary', {
      p_league_id: leagueId,
      p_season_id: seasonId,
    });

    if (error) {
      console.error('[Payments] Get payment summary error:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to get payment summary.' };
    }

    const row = data?.[0] || {
      total_expected_cents: 0,
      total_collected_cents: 0,
      total_outstanding_cents: 0,
      players_paid_full: 0,
      players_partial: 0,
      players_pending: 0,
      players_overdue: 0,
    };

    return {
      success: true,
      data: {
        totalExpectedCents: row.total_expected_cents,
        totalCollectedCents: row.total_collected_cents,
        totalOutstandingCents: row.total_outstanding_cents,
        playersPaidFull: row.players_paid_full,
        playersPartial: row.players_partial,
        playersPending: row.players_pending,
        playersOverdue: row.players_overdue,
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

    const { data: payments, error } = await supabase
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
      .order('created_at', { ascending: true });

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

    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const paymentUrl = `${SITE_URL}/dashboard/payments?payment=${paymentId}`;

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

    revalidatePath(`/dashboard/leagues/${payment.league_id}/payments`);
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

    revalidatePath(`/dashboard/leagues/${payment.league_id}/payments`);
    return { success: true, data: updated as PlayerPayment };
  } catch (error) {
    console.error('[Payments] Unexpected error in updatePaymentStatus:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
