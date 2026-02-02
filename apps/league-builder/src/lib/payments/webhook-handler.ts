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
    payload,
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
// Handle: checkout.session.completed
// ============================================================================

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<WebhookResult> {
  // Check for duplicate event processing
  if (await isEventProcessed(eventId)) {
    console.log(`[Payments Webhook] Event ${eventId} already processed, skipping`);
    return { success: true, message: 'Event already processed' };
  }

  const playerPaymentId = session.metadata?.player_payment_id;

  if (!playerPaymentId || session.metadata?.type !== 'player_fee') {
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
  const applicationFee = calculateApplicationFee(amountPaid);

  // Record transaction
  const { error: txnError } = await supabase.from('payment_transactions').insert({
    player_payment_id: playerPaymentId,
    transaction_type: 'payment',
    amount_cents: amountPaid,
    application_fee_cents: applicationFee,
    currency: session.currency || 'usd',
    stripe_payment_intent_id: paymentIntent,
    stripe_checkout_session_id: session.id,
    status: 'succeeded',
    installment_number: payment.current_installment + 1,
    description: `Payment via Stripe Checkout`,
    completed_at: new Date().toISOString(),
    idempotency_key: `checkout_${session.id}`,
  });

  if (txnError) {
    // Check if duplicate (idempotent)
    if (txnError.code === '23505') {
      return { success: true, message: 'Transaction already processed' };
    }
    console.error('[Payments Webhook] Transaction insert error:', sanitizeErrorForLogging(txnError));
    return { success: false, message: 'Failed to record transaction' };
  }

  // Use atomic update function to prevent race conditions
  const { data: updatedPayment, error: updateError } = await supabase.rpc(
    'update_payment_amount_atomic',
    {
      p_payment_id: playerPaymentId,
      p_amount_to_add: amountPaid,
      p_installment_increment: 1,
    }
  );

  if (updateError) {
    console.error('[Payments Webhook] Payment update error:', sanitizeErrorForLogging(updateError));
    return { success: false, message: 'Failed to update payment' };
  }

  // Get new values from the atomic update result
  const newAmountPaid = updatedPayment?.amount_paid_cents || payment.amount_paid_cents + amountPaid;
  const newInstallment = updatedPayment?.current_installment || payment.current_installment + 1;
  const isFullyPaid = newAmountPaid >= payment.total_amount_cents;

  await logAuditEvent(
    payment.league_id,
    'webhook_checkout_completed',
    {
      checkout_session_id: session.id,
      payment_intent_id: paymentIntent,
      amount_cents: amountPaid,
      installment_number: newInstallment,
      is_fully_paid: isFullyPaid,
    },
    playerPaymentId,
    eventId
  );

  return { success: true, message: `Payment processed: $${(amountPaid / 100).toFixed(2)}` };
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
    installment_number: payment.current_installment + 1,
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

  await logAuditEvent(
    payment.league_id,
    'webhook_charge_refunded',
    {
      charge_id: charge.id,
      payment_intent_id: paymentIntentId,
      amount_refunded: charge.amount_refunded,
    },
    payment.id,
    eventId
  );

  return { success: true, message: 'Refund event logged' };
}

// ============================================================================
// Main Webhook Handler
// ============================================================================

export async function handlePlayerPaymentsWebhook(
  event: Stripe.Event
): Promise<WebhookResult> {
  console.log(`[Payments Webhook] Processing event: ${event.type}`);

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

      default:
        return { success: true, message: `Unhandled event type: ${event.type}` };
    }
  } catch (error) {
    console.error('[Payments Webhook] Error processing event:', sanitizeErrorForLogging(error));
    return { success: false, message: 'Internal error processing webhook' };
  }
}
