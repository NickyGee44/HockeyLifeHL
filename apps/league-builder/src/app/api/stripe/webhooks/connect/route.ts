/**
 * Stripe Connect Webhooks
 *
 * Handles Stripe webhook events for league Connect accounts.
 * Events: account.updated, payment_intent.succeeded/failed, charge.refunded, payout.paid/failed
 *
 * Security:
 * - Verifies webhook signature using STRIPE_WEBHOOK_SECRET_CONNECT
 * - Uses service role for database updates (bypasses RLS)
 * - Idempotent: duplicate events handled safely via stripe_event_id
 * - All events logged to audit table for compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/client';
import Stripe from 'stripe';
import { sendPayoutFailureAlertEmail } from '@/lib/email/payment-emails';

// ============================================================================
// Webhook Configuration
// ============================================================================

// Disable body parsing - Stripe needs raw body for signature verification
export const runtime = 'nodejs';

// Connect webhook secret (separate from subscription webhooks)
const STRIPE_WEBHOOK_SECRET_CONNECT = process.env.STRIPE_WEBHOOK_SECRET_CONNECT;

// Create service role client (bypasses RLS for webhook processing)
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// Helper: Log Audit Event
// ============================================================================

async function logAuditEvent(
  supabase: ReturnType<typeof createServiceClient>,
  leagueId: string,
  eventType: string,
  stripeEventId: string,
  payload: Record<string, any>
): Promise<boolean> {
  // Insert with ON CONFLICT DO NOTHING for idempotency
  const { error, count } = await supabase
    .from('stripe_connect_audit_log')
    .insert({
      league_id: leagueId,
      event_type: eventType,
      stripe_event_id: stripeEventId,
      payload,
    });

  if (error) {
    // If it's a duplicate key error, that's expected (idempotency)
    if (error.code === '23505') {
      console.log(`[Connect Webhook] Duplicate event ${stripeEventId}, skipping`);
      return false; // Indicates duplicate
    }
    console.error('[Connect Webhook] Failed to log audit event:', error);
    throw error;
  }

  return true; // New event logged
}

// ============================================================================
// Helper: Get League by Stripe Account ID
// ============================================================================

async function getLeagueByStripeAccount(
  supabase: ReturnType<typeof createServiceClient>,
  stripeAccountId: string
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('stripe_account_id', stripeAccountId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle account.updated - Update onboarding status
 */
async function handleAccountUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  account: Stripe.Account,
  eventId: string
): Promise<void> {
  const league = await getLeagueByStripeAccount(supabase, account.id);

  if (!league) {
    console.warn(`[Connect Webhook] No league found for account ${account.id}`);
    return;
  }

  // Log event first (idempotency check)
  const isNew = await logAuditEvent(supabase, league.id, 'account_updated', eventId, {
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    requirements: account.requirements,
  });

  if (!isNew) {
    return; // Duplicate event
  }

  // Determine account status
  let status = 'pending';
  if (account.charges_enabled && account.payouts_enabled) {
    status = 'complete';
  } else if (account.requirements?.disabled_reason) {
    status = 'disabled';
  } else if (
    account.requirements?.currently_due &&
    account.requirements.currently_due.length > 0
  ) {
    status = 'restricted';
  }

  // Update league
  const { error } = await supabase
    .from('leagues')
    .update({
      stripe_account_status: status,
      payment_mode: account.charges_enabled ? 'stripe' : 'manual',
    })
    .eq('id', league.id);

  if (error) {
    console.error('[Connect Webhook] Failed to update league:', error);
    throw error;
  }

  console.log(`[Connect Webhook] Account updated for league ${league.id}: ${status}`);
}

/**
 * Handle payment_intent.succeeded - Record successful payment
 */
async function handlePaymentIntentSucceeded(
  supabase: ReturnType<typeof createServiceClient>,
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
): Promise<void> {
  const leagueId = paymentIntent.metadata?.league_id;

  if (!leagueId) {
    console.warn(`[Connect Webhook] No league_id in payment intent ${paymentIntent.id}`);
    return;
  }

  // Log event first (idempotency check)
  const isNew = await logAuditEvent(supabase, leagueId, 'payment_succeeded', eventId, {
    payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    customer_email: paymentIntent.receipt_email,
  });

  if (!isNew) {
    return; // Duplicate event
  }

  // Get charge ID if available
  const chargeId = paymentIntent.latest_charge as string | null;

  // Update payment record
  const { error } = await supabase
    .from('stripe_connect_payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: chargeId,
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('[Connect Webhook] Failed to update payment:', error);
    throw error;
  }

  console.log(`[Connect Webhook] Payment succeeded for league ${leagueId}: $${paymentIntent.amount / 100}`);
}

/**
 * Handle payment_intent.payment_failed - Record failed payment
 */
async function handlePaymentIntentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
): Promise<void> {
  const leagueId = paymentIntent.metadata?.league_id;

  if (!leagueId) {
    console.warn(`[Connect Webhook] No league_id in payment intent ${paymentIntent.id}`);
    return;
  }

  // Log event first (idempotency check)
  const isNew = await logAuditEvent(supabase, leagueId, 'payment_failed', eventId, {
    payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    error: paymentIntent.last_payment_error?.message,
  });

  if (!isNew) {
    return; // Duplicate event
  }

  // Update payment record
  const { error } = await supabase
    .from('stripe_connect_payments')
    .update({
      status: 'failed',
      metadata: {
        error_message: paymentIntent.last_payment_error?.message,
        error_code: paymentIntent.last_payment_error?.code,
      },
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('[Connect Webhook] Failed to update payment:', error);
    throw error;
  }

  console.log(`[Connect Webhook] Payment failed for league ${leagueId}: ${paymentIntent.last_payment_error?.message}`);
}

/**
 * Handle charge.refunded - Update payment status on refund
 */
async function handleChargeRefunded(
  supabase: ReturnType<typeof createServiceClient>,
  charge: Stripe.Charge,
  eventId: string
): Promise<void> {
  // Get payment intent ID from charge
  const paymentIntentId = charge.payment_intent as string | null;

  if (!paymentIntentId) {
    console.warn(`[Connect Webhook] No payment_intent in charge ${charge.id}`);
    return;
  }

  // Get league ID from payment record
  const { data: payment, error: fetchError } = await supabase
    .from('stripe_connect_payments')
    .select('id, league_id, amount_cents')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (fetchError || !payment) {
    console.warn(`[Connect Webhook] No payment record for intent ${paymentIntentId}`);
    return;
  }

  // Log event first (idempotency check)
  const isNew = await logAuditEvent(supabase, payment.league_id, 'charge_refunded', eventId, {
    charge_id: charge.id,
    payment_intent_id: paymentIntentId,
    amount_refunded: charge.amount_refunded,
    fully_refunded: charge.refunded,
  });

  if (!isNew) {
    return; // Duplicate event
  }

  // Determine refund status
  const status = charge.refunded ? 'refunded' : 'partially_refunded';

  // Update payment record
  const { error } = await supabase
    .from('stripe_connect_payments')
    .update({ status })
    .eq('id', payment.id);

  if (error) {
    console.error('[Connect Webhook] Failed to update payment:', error);
    throw error;
  }

  console.log(`[Connect Webhook] Charge ${status} for league ${payment.league_id}: $${charge.amount_refunded / 100}`);
}

/**
 * Handle payout.paid - Log successful payout
 */
async function handlePayoutPaid(
  supabase: ReturnType<typeof createServiceClient>,
  payout: Stripe.Payout,
  stripeAccountId: string,
  eventId: string
): Promise<void> {
  const league = await getLeagueByStripeAccount(supabase, stripeAccountId);

  if (!league) {
    console.warn(`[Connect Webhook] No league found for account ${stripeAccountId}`);
    return;
  }

  // Log event first (idempotency check)
  const isNew = await logAuditEvent(supabase, league.id, 'payout_paid', eventId, {
    payout_id: payout.id,
    amount: payout.amount,
    currency: payout.currency,
    arrival_date: payout.arrival_date,
    method: payout.method,
  });

  if (!isNew) {
    return; // Duplicate event
  }

  console.log(`[Connect Webhook] Payout completed for league ${league.id}: $${payout.amount / 100}`);
}

/**
 * Handle payout.failed - Alert on payout failure
 */
async function handlePayoutFailed(
  supabase: ReturnType<typeof createServiceClient>,
  payout: Stripe.Payout,
  stripeAccountId: string,
  eventId: string
): Promise<void> {
  const league = await getLeagueByStripeAccount(supabase, stripeAccountId);

  if (!league) {
    console.warn(`[Connect Webhook] No league found for account ${stripeAccountId}`);
    return;
  }

  // Log event first (idempotency check)
  const isNew = await logAuditEvent(supabase, league.id, 'payout_failed', eventId, {
    payout_id: payout.id,
    amount: payout.amount,
    failure_code: payout.failure_code,
    failure_message: payout.failure_message,
  });

  if (!isNew) {
    return; // Duplicate event
  }

  console.error(
    `[Connect Webhook] Payout FAILED for league ${league.id}: ` +
    `$${payout.amount / 100} - ${payout.failure_message}`
  );

  // Send alert notification to league admin
  try {
    // Look up league owner: leagues → organization_id → organizations → owner_id → profiles
    const { data: leagueOrg } = await supabase
      .from('leagues')
      .select('organization_id')
      .eq('id', league.id)
      .single();

    if (leagueOrg?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', leagueOrg.organization_id)
        .single();

      if (org?.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', org.owner_id)
          .single();

        if (profile?.email) {
          await sendPayoutFailureAlertEmail({
            to: profile.email,
            adminName: profile.full_name || 'League Admin',
            leagueName: league.name,
            payoutAmount: payout.amount,
            currency: payout.currency,
            failureCode: payout.failure_code,
            failureMessage: payout.failure_message,
            payoutId: payout.id,
          });
        }
      }
    }
  } catch (emailError) {
    console.error('[Connect Webhook] Failed to send payout failure alert email:', emailError);
  }
}

// ============================================================================
// Main Webhook Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Validate webhook secret is configured
    if (!STRIPE_WEBHOOK_SECRET_CONNECT) {
      console.error('[Connect Webhook] Missing STRIPE_WEBHOOK_SECRET_CONNECT');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Connect Webhook] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET_CONNECT
      );
    } catch (err) {
      console.error('[Connect Webhook] Signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Create service client for database operations
    const supabase = createServiceClient();

    // Get connected account ID if this is a Connect event
    const accountId = event.account;

    // Route to appropriate handler based on event type
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(
          supabase,
          event.data.object as Stripe.Account,
          event.id
        );
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          supabase,
          event.data.object as Stripe.PaymentIntent,
          event.id
        );
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(
          supabase,
          event.data.object as Stripe.PaymentIntent,
          event.id
        );
        break;

      case 'charge.refunded':
        await handleChargeRefunded(
          supabase,
          event.data.object as Stripe.Charge,
          event.id
        );
        break;

      case 'payout.paid':
        if (accountId) {
          await handlePayoutPaid(
            supabase,
            event.data.object as Stripe.Payout,
            accountId,
            event.id
          );
        }
        break;

      case 'payout.failed':
        if (accountId) {
          await handlePayoutFailed(
            supabase,
            event.data.object as Stripe.Payout,
            accountId,
            event.id
          );
        }
        break;

      default:
        console.log(`[Connect Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Connect Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
