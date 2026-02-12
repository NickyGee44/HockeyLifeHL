/**
 * Stripe Webhook Handler for Player Payments
 *
 * Handles Stripe webhook events for player fee collection:
 * - checkout.session.completed: Payment successful
 * - payment_intent.succeeded: Update payment record
 * - payment_intent.payment_failed: Mark payment as failed
 * - charge.refunded: Handle refund updates
 *
 * Security:
 * - Webhook signature verification
 * - Idempotent event processing
 * - Full audit logging
 */

import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { calculateApplicationFee } from '@/lib/leagues/stripe-connect';
import {
  sendChargebackAlertEmail,
  sendChargebackResolutionEmail,
  sendPaymentConfirmationEmail,
  sendRefundProcessedEmail,
} from '@/lib/email/payment-emails';
import type { Json } from '@hockey-life/database';

// ============================================================================
// Types
// ============================================================================

interface WebhookResult {
  success: boolean;
  message: string;
}

// ============================================================================
// Webhook Secret
// ============================================================================

export const STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET =
  process.env.STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET || '';

// ============================================================================
// Verify Webhook Signature
// ============================================================================

export function verifyPlayerPaymentsWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  if (!STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET) {
    console.error('[Payments Webhook] Missing webhook secret');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('[Payments Webhook] Signature verification failed:', sanitizeErrorForLogging(error));
    return null;
  }
}

// ============================================================================
// Helper: Log Audit Event
// ============================================================================

async function logAuditEvent(
  leagueId: string,
  eventType: string,
  payload: Record<string, unknown>,
  paymentId?: string,
  stripeEventId?: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from('player_payment_audit_log').insert({
    player_payment_id: paymentId || null,
    league_id: leagueId,
    event_type: eventType,
    stripe_event_id: stripeEventId || null,
    payload: payload as Json,
  });

  if (error) {
    console.error('[Payments Webhook] Failed to log audit:', sanitizeErrorForLogging(error));
  }
}

// ============================================================================
// Helper: Check if webhook event already processed
// ============================================================================

async function isEventProcessed(eventId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // Check and atomically mark as processed using database function
  const { data, error } = await supabase.rpc('is_webhook_event_processed', {
    p_event_id: eventId,
  });

  if (error) {
    // If function doesn't exist, fall back to checking audit log
    const { data: existing } = await supabase
      .from('player_payment_audit_log')
      .select('id')
      .eq('stripe_event_id', eventId)
      .single();

    return !!existing;
  }

  return data === true;
}

// ============================================================================
// Handle: checkout.session.completed (Registration Fees)
// ============================================================================

async function handleRegistrationCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<WebhookResult> {
  const registrationId = session.metadata?.registration_id;

  if (!registrationId) {
    console.error('[Payments Webhook] Missing registration_id in metadata');
    return { success: false, message: 'Missing registration_id' };
  }

  const supabase = createServiceRoleClient();

  // Get registration record
  const { data: registration, error: fetchError } = await supabase
    .from('registration_submissions')
    .select('*')
    .eq('id', registrationId)
    .single();

  if (fetchError || !registration) {
    console.error('[Payments Webhook] Registration not found:', registrationId);
    return { success: false, message: 'Registration not found' };
  }

  // Get payment intent for the actual amount
  const paymentIntent = session.payment_intent as string;
  const amountPaid = session.amount_total || 0;

  // Process payment atomically using database function
  const { data: resultData, error: processError } = await supabase.rpc(
    'process_registration_payment_webhook',
    {
      p_registration_id: registrationId,
      p_checkout_session_id: session.id,
      p_payment_intent_id: paymentIntent,
      p_amount_paid_cents: amountPaid,
      p_idempotency_key: `registration_checkout_${session.id}`,
    }
  );

  // Cast the Json return type to the expected structure
  const result = resultData as {
    success: boolean;
    message?: string;
    already_processed?: boolean;
    new_status?: string;
    new_amount_paid_cents?: number;
  } | null;

  if (processError) {
    console.error('[Payments Webhook] Registration payment processing error:', sanitizeErrorForLogging(processError));
    return { success: false, message: 'Failed to process registration payment atomically' };
  }

  if (!result || !result.success) {
    console.error('[Payments Webhook] Registration payment processing failed:', result);
    return { success: false, message: result?.message || 'Registration payment processing returned failure' };
  }

  // Check if already processed (idempotent)
  if (result.already_processed) {
    console.info('[webhook] Registration payment already processed:', result.message);
    return { success: true, message: result.message ?? 'Already processed' };
  }

  await logAuditEvent(
    registration.league_id,
    'webhook_registration_checkout_completed',
    {
      checkout_session_id: session.id,
      payment_intent_id: paymentIntent,
      amount_cents: amountPaid,
      registration_id: registrationId,
      new_status: result.new_status,
      new_amount_paid_cents: result.new_amount_paid_cents,
    },
    undefined, // No player_payment_id for registration payments
    eventId
  );

  return {
    success: true,
    message: `Registration payment processed: $${(amountPaid / 100).toFixed(2)}. Status: ${result.new_status ?? 'paid'}`
  };
}

// ============================================================================
// Handle: checkout.session.completed (Player Season Fees)
// ============================================================================

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<WebhookResult> {
  // Check for duplicate event processing
  if (await isEventProcessed(eventId)) {
    console.info(`[webhook] Event ${eventId} already processed, skipping`);
    return { success: true, message: 'Event already processed' };
  }

  // Route to appropriate handler based on payment type
  const paymentType = session.metadata?.type;

  if (paymentType === 'registration_fee') {
    return await handleRegistrationCheckoutCompleted(session, eventId);
  }

  const playerPaymentId = session.metadata?.player_payment_id;

  if (!playerPaymentId || paymentType !== 'player_fee') {
    // Not a player payment checkout
    return { success: true, message: 'Not a player fee checkout' };
  }

  const supabase = createServiceRoleClient();

  // Get payment record
  const { data: payment, error: fetchError } = await supabase
    .from('player_payments')
    .select('*')
    .eq('id', playerPaymentId)
    .single();

  if (fetchError || !payment) {
    console.error('[Payments Webhook] Payment not found:', playerPaymentId);
    return { success: false, message: 'Payment not found' };
  }

  // Get payment intent for the actual amount
  const paymentIntent = session.payment_intent as string;
  const amountPaid = session.amount_total || 0;
  const applicationFee = await calculateApplicationFee(amountPaid);

  // Process payment atomically using database function (FIX ISSUE #1)
  // This ensures transaction insert AND payment update happen in a single atomic operation
  const { data: checkoutResultData, error: processError } = await supabase.rpc(
    'process_checkout_completed',
    {
      p_payment_id: playerPaymentId,
      p_session_id: session.id,
      p_payment_intent_id: paymentIntent,
      p_amount_paid_cents: amountPaid,
      p_application_fee_cents: applicationFee,
      p_currency: session.currency || 'usd',
      p_idempotency_key: `checkout_${session.id}`,
    }
  );

  // Cast the Json return type to the expected structure
  const result = checkoutResultData as {
    success: boolean;
    message?: string;
    already_processed?: boolean;
    is_fully_paid?: boolean;
    payment?: typeof payment;
    transaction_id?: string;
  } | null;

  if (processError) {
    console.error('[Payments Webhook] Atomic processing error:', sanitizeErrorForLogging(processError));
    return { success: false, message: 'Failed to process payment atomically' };
  }

  if (!result || !result.success) {
    console.error('[Payments Webhook] Atomic processing failed:', result);
    return { success: false, message: 'Payment processing returned failure' };
  }

  // Check if already processed (idempotent)
  if (result.already_processed) {
    console.info('[webhook] Payment already processed:', result.message);
    return { success: true, message: result.message ?? 'Already processed' };
  }

  // Extract results from atomic function
  const isFullyPaid = result.is_fully_paid || false;
  const processedPayment = result.payment || payment;

  await logAuditEvent(
    payment.league_id,
    'webhook_checkout_completed',
    {
      checkout_session_id: session.id,
      payment_intent_id: paymentIntent,
      amount_cents: amountPaid,
      installment_number: processedPayment.current_installment || 0,
      is_fully_paid: isFullyPaid,
      transaction_id: result.transaction_id,
    },
    playerPaymentId,
    eventId
  );

  // Send payment confirmation email (fire-and-forget)
  try {
    const [{ data: playerProfile }, { data: leagueInfo }, { data: feeInfo }] = await Promise.all([
      supabase.from('profiles').select('email, full_name').eq('id', payment.player_id).single(),
      supabase.from('leagues').select('name').eq('id', payment.league_id).single(),
      supabase.from('season_fees').select('name').eq('id', payment.season_fee_id).single(),
    ]);

    if (playerProfile?.email && leagueInfo) {
      const totalInstallments = payment.total_installments || 1;
      const currentInstallment = processedPayment.current_installment || 1;
      const remainingBalance = Math.max(0, (payment.total_amount_cents || 0) - (processedPayment.amount_paid_cents || amountPaid));

      sendPaymentConfirmationEmail({
        to: playerProfile.email,
        playerName: playerProfile.full_name || 'Player',
        leagueName: leagueInfo.name,
        feeName: feeInfo?.name || 'Season Fee',
        amountPaid,
        remainingBalance,
        installmentNumber: currentInstallment,
        totalInstallments,
      }).catch((err) => {
        console.error('[Payments Webhook] Failed to send confirmation email:', err);
      });
    }
  } catch (emailErr) {
    console.error('[Payments Webhook] Error preparing confirmation email:', emailErr);
  }

  return { success: true, message: `Payment processed atomically: $${(amountPaid / 100).toFixed(2)}` };
}

// ============================================================================
// Handle: payment_intent.payment_failed
// ============================================================================

async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
): Promise<WebhookResult> {
  const playerPaymentId = paymentIntent.metadata?.player_payment_id;

  if (!playerPaymentId) {
    return { success: true, message: 'Not a player fee payment' };
  }

  const supabase = createServiceRoleClient();

  // Get payment record
  const { data: payment, error: fetchError } = await supabase
    .from('player_payments')
    .select('*')
    .eq('id', playerPaymentId)
    .single();

  if (fetchError || !payment) {
    return { success: false, message: 'Payment not found' };
  }

  // Record failed transaction
  await supabase.from('payment_transactions').insert({
    player_payment_id: playerPaymentId,
    transaction_type: 'payment',
    amount_cents: paymentIntent.amount,
    application_fee_cents: 0,
    currency: paymentIntent.currency,
    stripe_payment_intent_id: paymentIntent.id,
    status: 'failed',
    installment_number: (payment.current_installment ?? 0) + 1,
    description: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
    idempotency_key: `failed_${paymentIntent.id}`,
  });

  // Update payment status
  await supabase
    .from('player_payments')
    .update({ status: 'failed' })
    .eq('id', playerPaymentId);

  await logAuditEvent(
    payment.league_id,
    'webhook_payment_failed',
    {
      payment_intent_id: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
    },
    playerPaymentId,
    eventId
  );

  return { success: true, message: 'Payment failure recorded' };
}

// ============================================================================
// Handle: charge.refunded
// ============================================================================

async function handleChargeRefunded(
  charge: Stripe.Charge,
  eventId: string
): Promise<WebhookResult> {
  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) {
    return { success: true, message: 'No payment intent' };
  }

  const supabase = createServiceRoleClient();

  // Find transaction by payment intent
  const { data: transaction } = await supabase
    .from('payment_transactions')
    .select('player_payment_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (!transaction) {
    return { success: true, message: 'Not a player fee payment' };
  }

  // Get payment
  const { data: payment } = await supabase
    .from('player_payments')
    .select('*')
    .eq('id', transaction.player_payment_id)
    .single();

  if (!payment) {
    return { success: false, message: 'Payment not found' };
  }

  // FIX ISSUE #2: Apply refund atomically using database function
  // Get the most recent refund from the charge
  const latestRefund = charge.refunds?.data[0];
  if (!latestRefund) {
    console.warn('[Payments Webhook] No refund data in charge.refunded event');
    return { success: false, message: 'No refund data found' };
  }

  const { data: refundResultData, error: refundError } = await supabase.rpc(
    'process_refund',
    {
      p_payment_id: payment.id,
      p_charge_id: charge.id,
      p_payment_intent_id: paymentIntentId,
      p_refund_id: latestRefund.id,
      p_refund_amount_cents: latestRefund.amount,
      p_currency: latestRefund.currency,
      p_reason: latestRefund.reason || 'Refund issued',
      p_is_full_refund: charge.refunded, // True if fully refunded
    }
  );

  // Cast the Json return type to the expected structure
  const refundResult = refundResultData as {
    success: boolean;
    message?: string;
    already_processed?: boolean;
    new_status?: string;
    new_amount_paid_cents?: number;
    transaction_id?: string;
  } | null;

  if (refundError) {
    console.error('[Payments Webhook] Refund processing error:', sanitizeErrorForLogging(refundError));
    return { success: false, message: 'Failed to process refund atomically' };
  }

  if (!refundResult || !refundResult.success) {
    console.error('[Payments Webhook] Refund processing failed:', refundResult);
    return { success: false, message: 'Refund processing returned failure' };
  }

  // Check if already processed
  if (refundResult.already_processed) {
    console.info('[webhook] Refund already processed:', refundResult.message);
    return { success: true, message: refundResult.message ?? 'Already processed' };
  }

  await logAuditEvent(
    payment.league_id,
    'webhook_charge_refunded',
    {
      charge_id: charge.id,
      payment_intent_id: paymentIntentId,
      refund_id: latestRefund.id,
      amount_refunded: latestRefund.amount,
      new_status: refundResult.new_status,
      new_amount_paid_cents: refundResult.new_amount_paid_cents,
      transaction_id: refundResult.transaction_id,
    },
    payment.id,
    eventId
  );

  // Send refund confirmation email to player (fire-and-forget)
  try {
    const [{ data: playerProfile }, { data: leagueInfo }, { data: feeInfo }] = await Promise.all([
      supabase.from('profiles').select('email, full_name').eq('id', payment.player_id).single(),
      supabase.from('leagues').select('name').eq('id', payment.league_id).single(),
      supabase.from('season_fees').select('name').eq('id', payment.season_fee_id).single(),
    ]);

    if (playerProfile?.email && leagueInfo) {
      sendRefundProcessedEmail({
        to: playerProfile.email,
        playerName: playerProfile.full_name || 'Player',
        leagueName: leagueInfo.name,
        feeName: feeInfo?.name || 'Season Fee',
        refundAmount: latestRefund.amount,
        reason: latestRefund.reason || 'Refund issued by league administrator',
      }).catch((err) => {
        console.error('[Payments Webhook] Failed to send refund email:', err);
      });
    }
  } catch (emailErr) {
    console.error('[Payments Webhook] Error preparing refund email:', emailErr);
  }

  return {
    success: true,
    message: `Refund processed atomically: $${(latestRefund.amount / 100).toFixed(2)}. Status: ${refundResult.new_status}`
  };
}

// ============================================================================
// Handle: charge.dispute.created (FIX ISSUE #4: Chargeback Tracking)
// ============================================================================

async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  eventId: string
): Promise<WebhookResult> {
  const chargeId = dispute.charge as string;

  if (!chargeId) {
    return { success: true, message: 'No charge ID' };
  }

  const supabase = createServiceRoleClient();

  // Find payment by charge ID
  const { data: transaction } = await supabase
    .from('payment_transactions')
    .select('player_payment_id, stripe_payment_intent_id')
    .eq('stripe_charge_id', chargeId)
    .single();

  if (!transaction) {
    return { success: true, message: 'Not a player fee payment' };
  }

  // Get payment record
  const { data: payment } = await supabase
    .from('player_payments')
    .select('*')
    .eq('id', transaction.player_payment_id)
    .single();

  if (!payment) {
    return { success: false, message: 'Payment not found' };
  }

  // Record chargeback atomically using database function
  const evidenceDueBy = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
    : null;

  const { data: disputeResultData, error: disputeError } = await supabase.rpc(
    'record_chargeback',
    {
      p_payment_id: payment.id,
      p_dispute_id: dispute.id,
      p_charge_id: chargeId,
      p_payment_intent_id: transaction.stripe_payment_intent_id ?? '',
      p_amount_cents: dispute.amount,
      p_currency: dispute.currency,
      p_reason: dispute.reason,
      p_status: dispute.status,
      p_evidence_due_by: evidenceDueBy ?? '',
    }
  );

  // Cast the Json return type to the expected structure
  const disputeResult = disputeResultData as {
    success: boolean;
    message?: string;
    already_processed?: boolean;
    dispute_id?: string;
  } | null;

  if (disputeError) {
    console.error('[Payments Webhook] Dispute recording error:', sanitizeErrorForLogging(disputeError));
    return { success: false, message: 'Failed to record chargeback' };
  }

  if (!disputeResult || !disputeResult.success) {
    console.error('[Payments Webhook] Dispute recording failed:', disputeResult);
    return { success: false, message: 'Chargeback recording returned failure' };
  }

  // Check if already processed
  if (disputeResult.already_processed) {
    console.info('[webhook] Dispute already processed:', disputeResult.message);
    return { success: true, message: disputeResult.message ?? 'Already processed' };
  }

  await logAuditEvent(
    payment.league_id,
    'webhook_dispute_created',
    {
      dispute_id: dispute.id,
      charge_id: chargeId,
      amount_cents: dispute.amount,
      reason: dispute.reason,
      status: dispute.status,
      evidence_due_by: evidenceDueBy,
      dispute_db_id: disputeResult.dispute_id,
    },
    payment.id,
    eventId
  );

  // Send email alert to league admin about chargeback
  try {
    // Fetch league info
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('name, organization_id')
      .eq('id', payment.league_id)
      .single();

    // Get organization owner email separately to avoid complex join issues
    let adminEmail: string | undefined;
    let adminName = 'League Admin';
    if (leagueData?.organization_id) {
      // Note: owner_id exists in schema but may not be in generated types
      const { data: orgData } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', leagueData.organization_id)
        .single();

      const ownerId = (orgData as { owner_id?: string } | null)?.owner_id;
      if (ownerId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', ownerId)
          .single();

        adminEmail = profileData?.email ?? undefined;
        adminName = profileData?.full_name || 'League Admin';
      }
    }

    // Get player info directly from player_id
    let playerName = 'Unknown Player';
    let playerEmail = 'Unknown';
    if (payment.player_id) {
      const { data: playerProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', payment.player_id)
        .single();

      playerName = playerProfile?.full_name || 'Unknown Player';
      playerEmail = playerProfile?.email || 'Unknown';
    }

    const { data: feeData } = await supabase
      .from('season_fees')
      .select('name')
      .eq('id', payment.season_fee_id)
      .single();

    const feeName = feeData?.name || 'Season Fee';

    if (adminEmail) {
      const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

      await sendChargebackAlertEmail({
        to: adminEmail,
        adminName,
        leagueName: leagueData?.name ?? 'League',
        playerName,
        playerEmail,
        feeName,
        disputeAmount: dispute.amount,
        disputeReason: dispute.reason || 'general',
        evidenceDueBy,
        disputeId: dispute.id,
        dashboardUrl: `${SITE_URL}/dashboard/leagues/${payment.league_id}/payments`,
      });

      console.info('[webhook] Chargeback alert email sent to:', adminEmail);
    } else {
      console.warn('[Payments Webhook] Could not send chargeback alert - admin email not found');
    }
  } catch (emailError) {
    // Don't fail the webhook if email fails - log and continue
    console.error('[Payments Webhook] Failed to send chargeback alert email:', sanitizeErrorForLogging(emailError));
  }

  return {
    success: true,
    message: `Chargeback recorded: $${(dispute.amount / 100).toFixed(2)}. Evidence due: ${evidenceDueBy || 'N/A'}`
  };
}

// ============================================================================
// Handle: charge.dispute.closed
// ============================================================================

async function handleDisputeClosed(
  dispute: Stripe.Dispute,
  eventId: string
): Promise<WebhookResult> {
  const supabase = createServiceRoleClient();

  // Update dispute status
  const { data: updateResultData, error: updateError } = await supabase.rpc(
    'update_dispute_status',
    {
      p_dispute_id: dispute.id,
      p_new_status: dispute.status,
      p_resolved: true,
    }
  );

  // Cast the Json return type to the expected structure
  const updateResult = updateResultData as {
    success: boolean;
    message?: string;
  } | null;

  if (updateError) {
    console.error('[Payments Webhook] Dispute update error:', sanitizeErrorForLogging(updateError));
    return { success: false, message: 'Failed to update dispute status' };
  }

  if (!updateResult || !updateResult.success) {
    console.error('[Payments Webhook] Dispute update failed:', updateResult);
    return { success: false, message: 'Dispute update returned failure' };
  }

  // Get payment for audit log
  const { data: dispute_record } = await supabase
    .from('payment_disputes')
    .select('league_id, player_payment_id')
    .eq('stripe_dispute_id', dispute.id)
    .single();

  if (dispute_record) {
    await logAuditEvent(
      dispute_record.league_id,
      'webhook_dispute_closed',
      {
        dispute_id: dispute.id,
        status: dispute.status,
        outcome: dispute.status === 'won' ? 'League won' : 'League lost',
      },
      dispute_record.player_payment_id ?? undefined,
      eventId
    );

    // Send email notification about dispute resolution
    try {
      const { data: leagueData } = await supabase
        .from('leagues')
        .select(`
          name,
          organization_id
        `)
        .eq('id', dispute_record.league_id)
        .single();

      // Get organization owner email separately to avoid complex join issues
      let adminEmail: string | undefined;
      let adminName = 'League Admin';
      if (leagueData?.organization_id) {
        // Note: owner_id exists in schema but may not be in generated types
        const { data: orgData } = await supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', leagueData.organization_id)
          .single();

        const ownerId = (orgData as { owner_id?: string } | null)?.owner_id;
        if (ownerId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', ownerId)
            .single();

          adminEmail = profileData?.email ?? undefined;
          adminName = profileData?.full_name || 'League Admin';
        }
      }

      // Get player name - use direct player lookup instead of registrations join
      let playerName = 'Unknown Player';
      if (dispute_record.player_payment_id) {
        const { data: paymentData } = await supabase
          .from('player_payments')
          .select('player_id')
          .eq('id', dispute_record.player_payment_id)
          .single();

        if (paymentData?.player_id) {
          const { data: playerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', paymentData.player_id)
            .single();

          playerName = playerProfile?.full_name || 'Unknown Player';
        }
      }

      if (adminEmail) {
        await sendChargebackResolutionEmail({
          to: adminEmail,
          adminName,
          leagueName: leagueData?.name ?? 'League',
          playerName,
          disputeAmount: dispute.amount,
          outcome: dispute.status === 'won' ? 'won' : 'lost',
          disputeId: dispute.id,
        });

        console.info('[webhook] Chargeback resolution email sent to:', adminEmail);
      }
    } catch (emailError) {
      // Don't fail the webhook if email fails - log and continue
      console.error('[Payments Webhook] Failed to send chargeback resolution email:', sanitizeErrorForLogging(emailError));
    }
  }

  return {
    success: true,
    message: `Dispute closed: ${dispute.status}`
  };
}

// ============================================================================
// Main Webhook Handler
// ============================================================================

export async function handlePlayerPaymentsWebhook(
  event: Stripe.Event
): Promise<WebhookResult> {
  console.info(`[webhook] Processing event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        return await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          event.id
        );

      case 'payment_intent.payment_failed':
        return await handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent,
          event.id
        );

      case 'charge.refunded':
        return await handleChargeRefunded(
          event.data.object as Stripe.Charge,
          event.id
        );

      case 'charge.dispute.created':
        return await handleDisputeCreated(
          event.data.object as Stripe.Dispute,
          event.id
        );

      case 'charge.dispute.closed':
        return await handleDisputeClosed(
          event.data.object as Stripe.Dispute,
          event.id
        );

      default:
        return { success: true, message: `Unhandled event type: ${event.type}` };
    }
  } catch (error) {
    console.error('[Payments Webhook] Error processing event:', sanitizeErrorForLogging(error));
    return { success: false, message: 'Internal error processing webhook' };
  }
}
