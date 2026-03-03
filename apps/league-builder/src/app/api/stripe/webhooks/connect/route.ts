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
import {
  sendPayoutFailureAlertEmail,
  sendChargebackAlertEmail,
  sendChargebackResolutionEmail,
} from '@/lib/email/payment-emails';
import {
  sendMerchantCapabilityActiveEmail } from '@/lib/email/subscription-emails';
import {
  logConnectAccountEvent,
  logDuplicateEvent,
  logWebhookError,
  logNotificationSent } from '@/lib/logging/webhook-logger';
import { capturePaymentError, withPaymentSpan } from '@/lib/sentry/payments';

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
      persistSession: false } });
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
  const { error } = await supabase
    .from('stripe_connect_audit_log')
    .insert({
      league_id: leagueId,
      event_type: eventType,
      stripe_event_id: stripeEventId,
      payload });

  if (error) {
    // If it's a duplicate key error, that's expected (idempotency)
    if (error.code === '23505') {
      console.info(`[connect-webhook] Duplicate event ${stripeEventId}, skipping`);
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
): Promise<{ id: string; name: string; stripe_account_status: string | null } | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, stripe_account_status')
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
    requirements: account.requirements });

  if (!isNew) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      league_id: league.id });
    return; // Duplicate event
  }

  // Determine account status
  let status = 'pending';
  let decisionPath = 'pending';

  if (account.charges_enabled && account.payouts_enabled) {
    status = 'complete';
    decisionPath = 'fully_enabled';
  } else if (account.requirements?.disabled_reason) {
    status = 'disabled';
    decisionPath = `disabled_${account.requirements.disabled_reason}`;
  } else if (
    account.requirements?.currently_due &&
    account.requirements.currently_due.length > 0
  ) {
    status = 'restricted';
    decisionPath = `restricted_${account.requirements.currently_due.length}_requirements`;
  }

  // Update league
  const { error } = await supabase
    .from('leagues')
    .update({
      stripe_account_status: status,
      payment_mode: account.charges_enabled ? 'stripe' : 'manual' })
    .eq('id', league.id);

  if (error) {
    logWebhookError(error, {
      stripe_event_id: eventId,
      stripe_event_type: 'account.updated',
      league_id: league.id,
      action: 'update_league',
      error_type: 'database_error' });
    throw error;
  }

  // Log structured event
  logConnectAccountEvent({
    stripe_event_id: eventId,
    league_id: league.id,
    action: 'account_updated',
    decision_path: decisionPath,
    metadata: {
      status,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled } });

  // Send notification if account just transitioned to fully enabled
  const previousStatus = league.stripe_account_status;
  if (status === 'complete' && previousStatus !== 'complete') {
    try {
      // Fetch league owner email
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('organization_id')
        .eq('id', league.id)
        .single();

      if (leagueData?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('owner_user_id')
          .eq('id', leagueData.organization_id)
          .single();

        if (org?.owner_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', org.owner_user_id)
            .single();

          if (profile?.email) {
            const emailResult = await sendMerchantCapabilityActiveEmail({
              to: profile.email,
              organizationName: league.name });

            logNotificationSent({
              stripe_event_id: eventId,
              league_id: league.id,
              notification_type: 'merchant_capability_active',
              recipient_email: profile.email,
              success: emailResult.success });
          }
        }
      }
    } catch (emailError) {
      logWebhookError(emailError, {
        stripe_event_id: eventId,
        stripe_event_type: 'account.updated',
        league_id: league.id,
        action: 'send_capability_active_email',
        error_type: 'notification_error' });
    }
  }
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
    customer_email: paymentIntent.receipt_email });

  if (!isNew) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      league_id: leagueId });
    return; // Duplicate event
  }

  // Get charge ID if available
  const chargeId = paymentIntent.latest_charge as string | null;

  // Update payment record
  const { error } = await supabase
    .from('stripe_connect_payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: chargeId })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('[Connect Webhook] Failed to update payment:', error);
    throw error;
  }

  // Log structured event
  logConnectAccountEvent({
    stripe_event_id: eventId,
    league_id: leagueId,
    action: 'account_updated',
    decision_path: 'payment_succeeded',
    metadata: {
      payment_intent_id: paymentIntent.id,
      amount_cents: paymentIntent.amount } });
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
    error: paymentIntent.last_payment_error?.message });

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
        error_code: paymentIntent.last_payment_error?.code } })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('[Connect Webhook] Failed to update payment:', error);
    throw error;
  }

  // Log structured event
  logConnectAccountEvent({
    stripe_event_id: eventId,
    league_id: leagueId,
    action: 'account_updated',
    decision_path: 'payment_failed',
    metadata: {
      payment_intent_id: paymentIntent.id,
      error_message: paymentIntent.last_payment_error?.message } });
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
    fully_refunded: charge.refunded });

  if (!isNew) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      league_id: payment.league_id });
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
    logWebhookError(error, {
      stripe_event_id: eventId,
      stripe_event_type: 'charge.refunded',
      league_id: payment.league_id,
      action: 'update_payment',
      error_type: 'database_error' });
    throw error;
  }

  // Log structured event
  logConnectAccountEvent({
    stripe_event_id: eventId,
    league_id: payment.league_id,
    action: 'account_updated',
    decision_path: `charge_${status}`,
    metadata: {
      charge_id: charge.id,
      amount_refunded_cents: charge.amount_refunded,
      fully_refunded: charge.refunded } });
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
    method: payout.method });

  if (!isNew) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      league_id: league.id });
    return; // Duplicate event
  }

  // Log structured event
  logConnectAccountEvent({
    stripe_event_id: eventId,
    league_id: league.id,
    action: 'account_updated',
    decision_path: 'payout_paid',
    metadata: {
      payout_id: payout.id,
      amount_cents: payout.amount,
      arrival_date: payout.arrival_date } });
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
    failure_message: payout.failure_message });

  if (!isNew) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      league_id: league.id });
    return; // Duplicate event
  }

  // Log structured event
  logConnectAccountEvent({
    stripe_event_id: eventId,
    league_id: league.id,
    action: 'account_updated',
    decision_path: 'payout_failed',
    metadata: {
      payout_id: payout.id,
      amount_cents: payout.amount,
      failure_code: payout.failure_code,
      failure_message: payout.failure_message } });

  // Send alert notification to league admin
  try {
    // Look up league owner: leagues → organization_id → organizations → owner_user_id → profiles
    const { data: leagueOrg } = await supabase
      .from('leagues')
      .select('organization_id')
      .eq('id', league.id)
      .single();

    if (leagueOrg?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_user_id')
        .eq('id', leagueOrg.organization_id)
        .single();

      if (org?.owner_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', org.owner_user_id)
          .single();

        if (profile?.email) {
          const emailResult = await sendPayoutFailureAlertEmail({
            to: profile.email,
            adminName: profile.full_name || 'League Admin',
            leagueName: league.name,
            payoutAmount: payout.amount,
            currency: payout.currency,
            failureCode: payout.failure_code,
            failureMessage: payout.failure_message,
            payoutId: payout.id });

          logNotificationSent({
            stripe_event_id: eventId,
            league_id: league.id,
            notification_type: 'payout_failed',
            recipient_email: profile.email,
            success: emailResult.success });
        }
      }
    }
  } catch (emailError) {
    logWebhookError(emailError, {
      stripe_event_id: eventId,
      stripe_event_type: 'payout.failed',
      league_id: league.id,
      action: 'send_payout_failure_email',
      error_type: 'notification_error' });
  }
}

/**
 * Handle charge.dispute.created - Alert league admin of new chargeback
 */
async function handleDisputeCreated(
  supabase: ReturnType<typeof createServiceClient>,
  dispute: Stripe.Dispute,
  eventId: string
): Promise<void> {
  const chargeId = dispute.charge as string;

  // Look up the payment record by charge ID
  const { data: payment, error: fetchError } = await supabase
    .from('stripe_connect_payments')
    .select('id, league_id, status')
    .eq('stripe_charge_id', chargeId)
    .single();

  if (fetchError || !payment) {
    console.warn(`[Connect Webhook] No payment record for charge ${chargeId} (dispute ${dispute.id})`);
    return;
  }

  // Log event first (idempotency check)
  const isNew = await logAuditEvent(supabase, payment.league_id, 'dispute_created', eventId, {
    dispute_id: dispute.id,
    charge_id: chargeId,
    amount: dispute.amount,
    reason: dispute.reason,
    evidence_due_by: dispute.evidence_details?.due_by });

  if (!isNew) {
    logDuplicateEvent({ stripe_event_id: eventId, league_id: payment.league_id });
    return;
  }

  // Update payment status to disputed
  await supabase
    .from('stripe_connect_payments')
    .update({ status: 'disputed' })
    .eq('id', payment.id);

  logConnectAccountEvent({
    stripe_event_id: eventId,
    league_id: payment.league_id,
    action: 'account_updated',
    decision_path: 'dispute_created',
    metadata: { dispute_id: dispute.id, charge_id: chargeId, amount_cents: dispute.amount } });

  // Send chargeback alert email to league admin
  try {
    const { data: leagueOrg } = await supabase
      .from('leagues')
      .select('name, organization_id')
      .eq('id', payment.league_id)
      .single();

    if (leagueOrg?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_user_id')
        .eq('id', leagueOrg.organization_id)
        .single();

      if (org?.owner_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', org.owner_user_id)
          .single();

        if (profile?.email) {
          const evidenceDueBy = dispute.evidence_details?.due_by
            ? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString()
            : null;

          const emailResult = await sendChargebackAlertEmail({
            to: profile.email,
            adminName: profile.full_name || 'League Admin',
            leagueName: leagueOrg.name,
            playerName: 'Unknown',
            playerEmail: '',
            feeName: 'League payment',
            disputeAmount: dispute.amount,
            disputeReason: dispute.reason,
            evidenceDueBy,
            disputeId: dispute.id,
            dashboardUrl: `https://dashboard.stripe.com/disputes/${dispute.id}` });

          logNotificationSent({
            stripe_event_id: eventId,
            league_id: payment.league_id,
            notification_type: 'dispute_created',
            recipient_email: profile.email,
            success: emailResult.success });
        }
      }
    }
  } catch (emailError) {
    logWebhookError(emailError, {
      stripe_event_id: eventId,
      stripe_event_type: 'charge.dispute.created',
      league_id: payment.league_id,
      action: 'send_chargeback_alert_email',
      error_type: 'notification_error' });
  }
}

/**
 * Handle charge.dispute.closed - Notify league admin of dispute resolution
 */
async function handleDisputeClosed(
  supabase: ReturnType<typeof createServiceClient>,
  dispute: Stripe.Dispute,
  eventId: string
): Promise<void> {
  const chargeId = dispute.charge as string;

  const { data: payment, error: fetchError } = await supabase
    .from('stripe_connect_payments')
    .select('id, league_id')
    .eq('stripe_charge_id', chargeId)
    .single();

  if (fetchError || !payment) {
    console.warn(`[Connect Webhook] No payment record for charge ${chargeId} (dispute ${dispute.id})`);
    return;
  }

  // Log event first (idempotency check)
  const isNew = await logAuditEvent(supabase, payment.league_id, 'dispute_closed', eventId, {
    dispute_id: dispute.id,
    charge_id: chargeId,
    amount: dispute.amount,
    status: dispute.status });

  if (!isNew) {
    logDuplicateEvent({ stripe_event_id: eventId, league_id: payment.league_id });
    return;
  }

  // Update payment status based on outcome
  const isWon = dispute.status === 'won';
  const newStatus = isWon ? 'succeeded' : 'refunded';
  await supabase
    .from('stripe_connect_payments')
    .update({ status: newStatus })
    .eq('id', payment.id);

  logConnectAccountEvent({
    stripe_event_id: eventId,
    league_id: payment.league_id,
    action: 'account_updated',
    decision_path: `dispute_${dispute.status}`,
    metadata: { dispute_id: dispute.id, charge_id: chargeId, outcome: dispute.status } });

  // Send resolution email to league admin
  try {
    const { data: leagueOrg } = await supabase
      .from('leagues')
      .select('name, organization_id')
      .eq('id', payment.league_id)
      .single();

    if (leagueOrg?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_user_id')
        .eq('id', leagueOrg.organization_id)
        .single();

      if (org?.owner_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', org.owner_user_id)
          .single();

        if (profile?.email) {
          const emailResult = await sendChargebackResolutionEmail({
            to: profile.email,
            adminName: profile.full_name || 'League Admin',
            leagueName: leagueOrg.name,
            playerName: 'Unknown',
            disputeAmount: dispute.amount,
            outcome: isWon ? 'won' : 'lost',
            disputeId: dispute.id });

          logNotificationSent({
            stripe_event_id: eventId,
            league_id: payment.league_id,
            notification_type: 'dispute_closed',
            recipient_email: profile.email,
            success: emailResult.success });
        }
      }
    }
  } catch (emailError) {
    logWebhookError(emailError, {
      stripe_event_id: eventId,
      stripe_event_type: 'charge.dispute.closed',
      league_id: payment.league_id,
      action: 'send_chargeback_resolution_email',
      error_type: 'notification_error' });
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
    const spanContext = {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      stripe_account_id: accountId || undefined,
    };

    switch (event.type) {
      case 'account.updated':
        await withPaymentSpan('connect.account_updated', spanContext, () =>
          handleAccountUpdated(supabase, event.data.object as Stripe.Account, event.id));
        break;

      case 'payment_intent.succeeded':
        await withPaymentSpan('connect.payment_succeeded', spanContext, () =>
          handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent, event.id));
        break;

      case 'payment_intent.payment_failed':
        await withPaymentSpan('connect.payment_failed', spanContext, () =>
          handlePaymentIntentFailed(supabase, event.data.object as Stripe.PaymentIntent, event.id));
        break;

      case 'charge.refunded':
        await withPaymentSpan('connect.charge_refunded', spanContext, () =>
          handleChargeRefunded(supabase, event.data.object as Stripe.Charge, event.id));
        break;

      case 'payout.paid':
        if (accountId) {
          await withPaymentSpan('connect.payout_paid', spanContext, () =>
            handlePayoutPaid(supabase, event.data.object as Stripe.Payout, accountId, event.id));
        }
        break;

      case 'payout.failed':
        if (accountId) {
          await withPaymentSpan('connect.payout_failed', spanContext, () =>
            handlePayoutFailed(supabase, event.data.object as Stripe.Payout, accountId, event.id));
        }
        break;

      case 'charge.dispute.created':
        await withPaymentSpan('connect.dispute_created', spanContext, () =>
          handleDisputeCreated(supabase, event.data.object as Stripe.Dispute, event.id));
        break;

      case 'charge.dispute.closed':
        await withPaymentSpan('connect.dispute_closed', spanContext, () =>
          handleDisputeClosed(supabase, event.data.object as Stripe.Dispute, event.id));
        break;

      default:
        console.info(`[connect-webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Connect Webhook] Error processing webhook:', error);
    capturePaymentError(error, {
      action: 'connect_webhook_handler',
      stripe_event_type: 'unknown',
    });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
