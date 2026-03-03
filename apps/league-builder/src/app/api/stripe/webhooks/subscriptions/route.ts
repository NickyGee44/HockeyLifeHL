/**
 * Stripe Subscription Webhooks
 *
 * Handles Stripe webhook events for organization subscriptions (Platform 1).
 * Events: subscription created/updated/deleted, invoice paid/failed, payment method attached
 *
 * Security:
 * - Verifies webhook signature using Stripe SDK
 * - Uses service role for database updates (bypasses RLS)
 * - Idempotent: duplicate events handled safely
 * - Logs all events for audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe, STRIPE_WEBHOOK_SECRET_ORGANIZATIONS, getTierByPriceId } from '@/lib/stripe/client';
import Stripe from 'stripe';
import {
  sendWelcomeEmail,
  sendPaymentFailedEmail,
  sendSubscriptionUpgradedEmail,
  sendSubscriptionDowngradedEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentRecoveredEmail,
  sendRecurringPaymentReceiptEmail } from '@/lib/email/subscription-emails';
import {
  logSubscriptionLifecycle,
  logPaymentEvent,
  logDuplicateEvent,
  logEventOrderingRejection,
  logWebhookError,
  logNotificationSent } from '@/lib/logging/webhook-logger';
import { capturePaymentError, withPaymentSpan } from '@/lib/sentry/payments';

// ============================================================================
// Webhook Configuration
// ============================================================================

// Disable body parsing - Stripe needs raw body for signature verification
export const runtime = 'nodejs';

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
// Helper: Check Event Deduplication
// ============================================================================

async function checkEventDuplicate(
  supabase: ReturnType<typeof createServiceClient>,
  stripeEventId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('organization_subscription_events')
    .select('id')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();

  if (error) {
    console.error('[Webhook] Error checking for duplicate event:', error);
    throw error;
  }

  return !!data;
}

// ============================================================================
// Helper: Acquire PostgreSQL Advisory Lock (CRITICAL for race condition fix)
// ============================================================================

/**
 * Acquire PostgreSQL advisory lock for organization to prevent concurrent webhook processing.
 *
 * CRITICAL SECURITY: Prevents TOCTOU (Time-of-Check-Time-of-Use) race condition where
 * out-of-order webhook events can bypass timestamp validation and corrupt subscription state.
 *
 * Attack scenario without lock:
 * 1. Event A (timestamp 1000) arrives, checks ordering (valid), starts processing
 * 2. Event B (timestamp 900) arrives, checks ordering (STILL valid because A hasn't committed)
 * 3. Event B processes and commits (sets last_timestamp=900)
 * 4. Event A processes and commits (sets last_timestamp=1000)
 * 5. Result: Event B bypassed ordering check and corrupted state
 *
 * Defense: PostgreSQL advisory lock serializes ALL webhook processing for each customer.
 * Lock is released automatically at transaction end (even on error).
 *
 * @param supabase - Supabase client with transaction support
 * @param organizationId - Organization ID to lock
 * @returns Lock key (for logging/debugging)
 */
async function acquireOrganizationLock(
  supabase: ReturnType<typeof createServiceClient>,
  organizationId: string
): Promise<void> {
  // Generate deterministic lock key from organization ID
  // Use hashtext() to convert UUID to 32-bit integer for advisory lock
  // Advisory lock will block until any existing lock for this org is released
  const { error } = await supabase.rpc('acquire_webhook_lock', {
    p_organization_id: organizationId });

  if (error) {
    console.error('[Webhook] Failed to acquire advisory lock:', error);
    throw new Error(`Failed to acquire lock for organization ${organizationId}: ${error.message}`);
  }

  // Lock acquired successfully (will be automatically released at transaction end)
}

// ============================================================================
// Helper: Verify Event Ordering (now protected by advisory lock)
// ============================================================================

async function verifyEventOrdering(
  supabase: ReturnType<typeof createServiceClient>,
  organizationId: string,
  eventTimestamp: number
): Promise<{ valid: boolean; lastTimestamp: number }> {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('last_stripe_event_timestamp')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.error('[Webhook] Error fetching organization for event ordering:', error);
    throw error;
  }

  const lastTimestamp = org.last_stripe_event_timestamp || 0;

  return {
    valid: eventTimestamp >= lastTimestamp,
    lastTimestamp };
}

// ============================================================================
// Helper: Update Last Event Timestamp
// ============================================================================

async function updateLastEventTimestamp(
  supabase: ReturnType<typeof createServiceClient>,
  organizationId: string,
  newTimestamp: number,
  expectedLastTimestamp: number
): Promise<boolean> {
  // Optimistic locking: only update if timestamp hasn't changed
  const { error, count } = await supabase
    .from('organizations')
    .update({ last_stripe_event_timestamp: newTimestamp })
    .eq('id', organizationId)
    .eq('last_stripe_event_timestamp', expectedLastTimestamp);

  if (error) {
    console.error('[Webhook] Error updating last event timestamp:', error);
    throw error;
  }

  // Return true if update succeeded (count > 0)
  return (count ?? 0) > 0;
}

// ============================================================================
// Helper: Log Subscription Event (with idempotency)
// ============================================================================

async function logSubscriptionEvent(
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    organizationId: string;
    eventType: string;
    fromTier?: string;
    toTier?: string;
    fromStatus?: string;
    toStatus?: string;
    stripeEventId?: string;
    amountCents?: number;
    metadata?: Record<string, any>;
  }
): Promise<{ isDuplicate: boolean }> {
  try {
    const { data: eventId, error } = await supabase.rpc('log_organization_subscription_event', {
      p_organization_id: params.organizationId,
      p_event_type: params.eventType,
      p_from_tier: params.fromTier ?? null,
      p_to_tier: params.toTier ?? null,
      p_from_status: params.fromStatus ?? null,
      p_to_status: params.toStatus ?? null,
      p_stripe_event_id: params.stripeEventId ?? null,
      p_amount_cents: params.amountCents ?? null,
      p_metadata: params.metadata ?? {},
      p_created_by: null });

    if (error) {
      console.error('[Webhook] Failed to log event:', error);
      throw error;
    }

    // If eventId is null, it means ON CONFLICT DO NOTHING was triggered (duplicate)
    return { isDuplicate: !eventId };
  } catch (error) {
    console.error('[Webhook] Failed to log event:', error);
    throw error;
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription,
  eventId: string,
  eventTimestamp: number
): Promise<void> {
  const organizationId = subscription.metadata.organization_id;

  if (!organizationId) {
    throw new Error('Missing organization_id in subscription metadata');
  }

  // CRITICAL SECURITY: Acquire advisory lock to prevent race conditions
  // This ensures sequential processing of webhooks for this organization
  await acquireOrganizationLock(supabase, organizationId);

  // Verify event ordering (now protected by lock)
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    organizationId,
    eventTimestamp
  );

  if (!valid) {
    logEventOrderingRejection({
      stripe_event_id: eventId,
      organization_id: organizationId,
      event_timestamp: eventTimestamp,
      last_timestamp: lastTimestamp });
    return;
  }

  // Get first price to determine tier
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    throw new Error('Missing price ID in subscription');
  }

  // Map price ID to tier using secure helper
  const tier = getTierByPriceId(priceId);

  if (!tier) {
    throw new Error(`Unknown price ID: ${priceId}`);
  }

  // Log event FIRST (with idempotency check)
  const { isDuplicate } = await logSubscriptionEvent(supabase, {
    organizationId,
    eventType: 'created',
    toTier: tier,
    toStatus: subscription.status,
    stripeEventId: eventId });

  if (isDuplicate) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      organization_id: organizationId });
    return;
  }

  // Fetch organization details for email notification
  const { data: org, error: orgFetchError } = await supabase
    .from('organizations')
    .select('name, owner_user_id')
    .eq('id', organizationId)
    .single();

  if (orgFetchError || !org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // Update organization
  const subscriptionData = subscription as any;
  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_tier: tier,
      subscription_status: subscription.status,
      current_period_start: subscriptionData.current_period_start
        ? new Date(subscriptionData.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscriptionData.current_period_end
        ? new Date(subscriptionData.current_period_end * 1000).toISOString()
        : null,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      subscription_created_at: new Date(subscription.created * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false })
    .eq('id', organizationId);

  if (error) {
    logWebhookError(error, {
      stripe_event_id: eventId,
      stripe_event_type: 'customer.subscription.created',
      organization_id: organizationId,
      action: 'update_organization',
      error_type: 'database_error' });
    throw error;
  }

  // Update last event timestamp with optimistic locking
  const updated = await updateLastEventTimestamp(
    supabase,
    organizationId,
    eventTimestamp,
    lastTimestamp
  );

  if (!updated) {
    console.warn(
      `[Webhook] Failed to update timestamp for event ${eventId} (optimistic lock failed)`
    );
  }

  // Log structured event
  logSubscriptionLifecycle({
    stripe_event_id: eventId,
    organization_id: organizationId,
    action: 'created',
    to_tier: tier,
    to_status: subscription.status,
    decision_path: subscription.trial_end ? 'with_trial' : 'no_trial' });

  // Send welcome email notification (async, don't block webhook response)
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', org.owner_user_id)
      .single();

    if (profile?.email) {
      const emailResult = await sendWelcomeEmail({
        to: profile.email,
        organizationName: org.name,
        tier: tier as any,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : undefined });

      logNotificationSent({
        stripe_event_id: eventId,
        organization_id: organizationId,
        notification_type: 'subscription_created',
        recipient_email: profile.email,
        success: emailResult.success });
    }
  } catch (emailError) {
    // Don't throw - email errors shouldn't block webhook processing
    logWebhookError(emailError, {
      stripe_event_id: eventId,
      stripe_event_type: 'customer.subscription.created',
      organization_id: organizationId,
      action: 'send_welcome_email',
      error_type: 'notification_error' });
  }
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription,
  eventId: string,
  eventTimestamp: number
): Promise<void> {
  const organizationId = subscription.metadata.organization_id;

  if (!organizationId) {
    throw new Error('Missing organization_id in subscription metadata');
  }

  // CRITICAL SECURITY: Acquire advisory lock to prevent race conditions
  await acquireOrganizationLock(supabase, organizationId);

  // Verify event ordering (now protected by lock)
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    organizationId,
    eventTimestamp
  );

  if (!valid) {
    logEventOrderingRejection({
      stripe_event_id: eventId,
      organization_id: organizationId,
      event_timestamp: eventTimestamp,
      last_timestamp: lastTimestamp });
    return;
  }

  // Get current organization state (including name and owner for notifications)
  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('subscription_tier, subscription_status, name, owner_user_id, current_period_end')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    logWebhookError(fetchError, {
      stripe_event_id: eventId,
      stripe_event_type: 'customer.subscription.updated',
      organization_id: organizationId,
      action: 'fetch_organization',
      error_type: 'database_error' });
    throw fetchError;
  }

  // Determine tier from price
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    throw new Error('Missing price ID in subscription');
  }

  // Map price ID to tier using secure helper
  const tier = getTierByPriceId(priceId);

  if (!tier) {
    throw new Error(`Unknown price ID: ${priceId}`);
  }

  // Determine event type
  let eventType = 'updated';
  if (org.subscription_tier !== tier) {
    eventType = org.subscription_tier < tier ? 'upgraded' : 'downgraded';
  } else if (org.subscription_status !== subscription.status) {
    if (subscription.status === 'past_due') {
      eventType = 'payment_failed';
    }
  }

  // Log event FIRST (with idempotency check)
  const { isDuplicate } = await logSubscriptionEvent(supabase, {
    organizationId,
    eventType,
    fromTier: org.subscription_tier,
    toTier: tier,
    fromStatus: org.subscription_status,
    toStatus: subscription.status,
    stripeEventId: eventId });

  if (isDuplicate) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      organization_id: organizationId });
    return;
  }

  // Update organization
  const subscriptionData = subscription as any;
  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      current_period_start: subscriptionData.current_period_start
        ? new Date(subscriptionData.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscriptionData.current_period_end
        ? new Date(subscriptionData.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null })
    .eq('id', organizationId);

  if (error) {
    logWebhookError(error, {
      stripe_event_id: eventId,
      stripe_event_type: 'customer.subscription.updated',
      organization_id: organizationId,
      action: 'update_organization',
      error_type: 'database_error' });
    throw error;
  }

  // Update last event timestamp with optimistic locking
  const updated = await updateLastEventTimestamp(
    supabase,
    organizationId,
    eventTimestamp,
    lastTimestamp
  );

  if (!updated) {
    console.warn(
      `[Webhook] Failed to update timestamp for event ${eventId} (optimistic lock failed)`
    );
  }

  // Log structured event with decision path
  const decisionPath = eventType === 'upgraded'
    ? `tier_change_${org.subscription_tier}_to_${tier}`
    : eventType === 'downgraded'
    ? `tier_change_${org.subscription_tier}_to_${tier}`
    : eventType === 'payment_failed'
    ? 'status_change_to_past_due'
    : 'general_update';

  logSubscriptionLifecycle({
    stripe_event_id: eventId,
    organization_id: organizationId,
    action: eventType as any,
    from_tier: org.subscription_tier,
    to_tier: tier,
    from_status: org.subscription_status,
    to_status: subscription.status,
    decision_path: decisionPath });

  // Send email notifications based on event type
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', org.owner_user_id)
      .single();

    if (profile?.email) {
      let emailResult: { success: boolean; error?: string } | null = null;

      if (eventType === 'upgraded') {
        emailResult = await sendSubscriptionUpgradedEmail({
          to: profile.email,
          organizationName: org.name,
          fromTier: org.subscription_tier as any,
          toTier: tier as any });
      } else if (eventType === 'downgraded') {
        emailResult = await sendSubscriptionDowngradedEmail({
          to: profile.email,
          organizationName: org.name,
          fromTier: org.subscription_tier as any,
          toTier: tier as any,
          effectiveDate: org.current_period_end
            ? new Date(org.current_period_end)
            : new Date() });
      }

      if (emailResult) {
        logNotificationSent({
          stripe_event_id: eventId,
          organization_id: organizationId,
          notification_type: `subscription_${eventType}`,
          recipient_email: profile.email,
          success: emailResult.success });
      }
    }
  } catch (emailError) {
    // Don't throw - email errors shouldn't block webhook processing
    logWebhookError(emailError, {
      stripe_event_id: eventId,
      stripe_event_type: 'customer.subscription.updated',
      organization_id: organizationId,
      action: `send_${eventType}_email`,
      error_type: 'notification_error' });
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription,
  eventId: string,
  eventTimestamp: number
): Promise<void> {
  const organizationId = subscription.metadata.organization_id;

  if (!organizationId) {
    throw new Error('Missing organization_id in subscription metadata');
  }

  // CRITICAL SECURITY: Acquire advisory lock to prevent race conditions
  await acquireOrganizationLock(supabase, organizationId);

  // Verify event ordering (now protected by lock)
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    organizationId,
    eventTimestamp
  );

  if (!valid) {
    logEventOrderingRejection({
      stripe_event_id: eventId,
      organization_id: organizationId,
      event_timestamp: eventTimestamp,
      last_timestamp: lastTimestamp });
    return;
  }

  // Log event FIRST (with idempotency check)
  const { isDuplicate } = await logSubscriptionEvent(supabase, {
    organizationId,
    eventType: 'cancelled',
    toStatus: 'canceled',
    stripeEventId: eventId });

  if (isDuplicate) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      organization_id: organizationId });
    return;
  }

  // Fetch organization details for email notification
  const { data: org, error: orgFetchError } = await supabase
    .from('organizations')
    .select('name, owner_user_id')
    .eq('id', organizationId)
    .single();

  if (orgFetchError || !org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // Update organization - enterprise licensing model, subscription becomes inactive
  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'canceled',
      // Keep enterprise tier but mark as canceled - contact sales to reactivate
      stripe_subscription_id: null,
      cancelled_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (error) {
    logWebhookError(error, {
      stripe_event_id: eventId,
      stripe_event_type: 'customer.subscription.deleted',
      organization_id: organizationId,
      action: 'update_organization',
      error_type: 'database_error' });
    throw error;
  }

  // Update last event timestamp with optimistic locking
  const updated = await updateLastEventTimestamp(
    supabase,
    organizationId,
    eventTimestamp,
    lastTimestamp
  );

  if (!updated) {
    console.warn(
      `[Webhook] Failed to update timestamp for event ${eventId} (optimistic lock failed)`
    );
  }

  // Log structured event
  logSubscriptionLifecycle({
    stripe_event_id: eventId,
    organization_id: organizationId,
    action: 'cancelled',
    to_status: 'canceled',
    decision_path: 'subscription_deleted' });

  // Send cancellation confirmation email
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', org.owner_user_id)
      .single();

    if (profile?.email) {
      const emailResult = await sendSubscriptionCancelledEmail({
        to: profile.email,
        organizationName: org.name,
        effectiveDate: new Date(),
        immediate: true });

      logNotificationSent({
        stripe_event_id: eventId,
        organization_id: organizationId,
        notification_type: 'subscription_cancelled',
        recipient_email: profile.email,
        success: emailResult.success });
    }
  } catch (emailError) {
    // Don't throw - email errors shouldn't block webhook processing
    logWebhookError(emailError, {
      stripe_event_id: eventId,
      stripe_event_type: 'customer.subscription.deleted',
      organization_id: organizationId,
      action: 'send_cancellation_email',
      error_type: 'notification_error' });
  }
}

/**
 * Handle invoice.paid
 */
async function handleInvoicePaid(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice,
  eventId: string,
  eventTimestamp: number
): Promise<void> {
  const invoiceData = invoice as any;
  const subscriptionId = invoiceData.subscription as string;

  if (!subscriptionId) {
    console.warn('[Webhook] Invoice has no subscription, skipping');
    return;
  }

  // Look up organization by subscription ID (primary lookup)
  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('id, subscription_status, stripe_customer_id, name, owner_user_id, subscription_tier, current_period_start, current_period_end')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (fetchError || !org) {
    throw new Error(
      `Organization not found for subscription: ${subscriptionId} (invoice: ${invoice.id})`
    );
  }

  // Verify customer ID matches as secondary check
  if (org.stripe_customer_id !== invoice.customer) {
    throw new Error(
      `Customer ID mismatch: organization has ${org.stripe_customer_id}, invoice has ${invoice.customer}`
    );
  }

  // CRITICAL SECURITY: Acquire advisory lock to prevent race conditions
  await acquireOrganizationLock(supabase, org.id);

  // Verify event ordering (now protected by lock)
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    org.id,
    eventTimestamp
  );

  if (!valid) {
    logEventOrderingRejection({
      stripe_event_id: eventId,
      organization_id: org.id,
      event_timestamp: eventTimestamp,
      last_timestamp: lastTimestamp });
    return;
  }

  // Log payment success FIRST (with idempotency check)
  const { isDuplicate } = await logSubscriptionEvent(supabase, {
    organizationId: org.id,
    eventType: 'payment_succeeded',
    amountCents: invoice.amount_paid,
    stripeEventId: eventId });

  if (isDuplicate) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      organization_id: org.id });
    return;
  }

  const wasPastDue = org.subscription_status === 'past_due';

  // If subscription was past_due, restore it
  if (wasPastDue) {
    const { error } = await supabase
      .from('organizations')
      .update({ subscription_status: 'active' })
      .eq('id', org.id);

    if (error) {
      logWebhookError(error, {
        stripe_event_id: eventId,
        stripe_event_type: 'invoice.paid',
        organization_id: org.id,
        action: 'restore_subscription',
        error_type: 'database_error' });
      throw error;
    }
  }

  // Update last event timestamp with optimistic locking
  const updated = await updateLastEventTimestamp(
    supabase,
    org.id,
    eventTimestamp,
    lastTimestamp
  );

  if (!updated) {
    console.warn(
      `[Webhook] Failed to update timestamp for event ${eventId} (optimistic lock failed)`
    );
  }

  // Log structured event
  logPaymentEvent({
    stripe_event_id: eventId,
    organization_id: org.id,
    action: wasPastDue ? 'payment_recovered' : 'payment_succeeded',
    amount_cents: invoice.amount_paid,
    decision_path: wasPastDue ? 'payment_recovered_from_past_due' : 'recurring_payment' });

  // Send email notification
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', org.owner_user_id)
      .single();

    if (profile?.email) {
      let emailResult: { success: boolean; error?: string };

      if (wasPastDue) {
        // Payment recovered - subscription reactivated
        emailResult = await sendPaymentRecoveredEmail({
          to: profile.email,
          organizationName: org.name,
          amount: invoice.amount_paid });
      } else {
        // Recurring payment receipt
        emailResult = await sendRecurringPaymentReceiptEmail({
          to: profile.email,
          organizationName: org.name,
          tier: org.subscription_tier as any,
          amount: invoice.amount_paid,
          currency: invoice.currency || 'usd',
          periodStart: org.current_period_start
            ? new Date(org.current_period_start)
            : new Date(),
          periodEnd: org.current_period_end
            ? new Date(org.current_period_end)
            : new Date(),
          invoiceUrl: invoice.hosted_invoice_url || undefined });
      }

      logNotificationSent({
        stripe_event_id: eventId,
        organization_id: org.id,
        notification_type: wasPastDue ? 'payment_recovered' : 'recurring_payment',
        recipient_email: profile.email,
        success: emailResult.success });
    }
  } catch (emailError) {
    // Don't throw - email errors shouldn't block webhook processing
    logWebhookError(emailError, {
      stripe_event_id: eventId,
      stripe_event_type: 'invoice.paid',
      organization_id: org.id,
      action: 'send_payment_email',
      error_type: 'notification_error' });
  }
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice,
  eventId: string,
  eventTimestamp: number
): Promise<void> {
  const invoiceData = invoice as any;
  const subscriptionId = invoiceData.subscription as string;

  if (!subscriptionId) {
    console.warn('[Webhook] Invoice has no subscription, skipping');
    return;
  }

  // Look up organization by subscription ID (primary lookup)
  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('id, stripe_customer_id, name, owner_user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (fetchError || !org) {
    throw new Error(
      `Organization not found for subscription: ${subscriptionId} (invoice: ${invoice.id})`
    );
  }

  // Verify customer ID matches as secondary check
  if (org.stripe_customer_id !== invoice.customer) {
    throw new Error(
      `Customer ID mismatch: organization has ${org.stripe_customer_id}, invoice has ${invoice.customer}`
    );
  }

  // CRITICAL SECURITY: Acquire advisory lock to prevent race conditions
  await acquireOrganizationLock(supabase, org.id);

  // Verify event ordering (now protected by lock)
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    org.id,
    eventTimestamp
  );

  if (!valid) {
    logEventOrderingRejection({
      stripe_event_id: eventId,
      organization_id: org.id,
      event_timestamp: eventTimestamp,
      last_timestamp: lastTimestamp });
    return;
  }

  // Log payment failure FIRST (with idempotency check)
  const { isDuplicate } = await logSubscriptionEvent(supabase, {
    organizationId: org.id,
    eventType: 'payment_failed',
    amountCents: invoice.amount_due,
    stripeEventId: eventId,
    metadata: {
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt } });

  if (isDuplicate) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      organization_id: org.id });
    return;
  }

  // Update subscription status to past_due
  const { error } = await supabase
    .from('organizations')
    .update({ subscription_status: 'past_due' })
    .eq('id', org.id);

  if (error) {
    logWebhookError(error, {
      stripe_event_id: eventId,
      stripe_event_type: 'invoice.payment_failed',
      organization_id: org.id,
      action: 'update_organization_status',
      error_type: 'database_error' });
    throw error;
  }

  // Update last event timestamp with optimistic locking
  const updated = await updateLastEventTimestamp(
    supabase,
    org.id,
    eventTimestamp,
    lastTimestamp
  );

  if (!updated) {
    console.warn(
      `[Webhook] Failed to update timestamp for event ${eventId} (optimistic lock failed)`
    );
  }

  // Log structured event
  logPaymentEvent({
    stripe_event_id: eventId,
    organization_id: org.id,
    action: 'payment_failed',
    amount_cents: invoice.amount_due,
    decision_path: `payment_failed_attempt_${invoice.attempt_count}`,
    metadata: {
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt } });

  // Send payment failure notification
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', org.owner_user_id)
      .single();

    if (profile?.email) {
      const emailResult = await sendPaymentFailedEmail({
        to: profile.email,
        organizationName: org.name,
        amount: invoice.amount_due,
        attemptCount: invoice.attempt_count || 1 });

      logNotificationSent({
        stripe_event_id: eventId,
        organization_id: org.id,
        notification_type: 'payment_failed',
        recipient_email: profile.email,
        success: emailResult.success });
    }
  } catch (emailError) {
    // Don't throw - email errors shouldn't block webhook processing
    logWebhookError(emailError, {
      stripe_event_id: eventId,
      stripe_event_type: 'invoice.payment_failed',
      organization_id: org.id,
      action: 'send_payment_failed_email',
      error_type: 'notification_error' });
  }
}

/**
 * Handle payment_method.attached
 */
async function handlePaymentMethodAttached(
  supabase: ReturnType<typeof createServiceClient>,
  paymentMethod: Stripe.PaymentMethod,
  eventId: string,
  eventTimestamp: number
): Promise<void> {
  const customerId = paymentMethod.customer as string;

  if (!customerId) {
    console.warn('[Webhook] Payment method has no customer, skipping');
    return;
  }

  // Get organization by customer ID
  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !org) {
    throw new Error(`Organization not found for customer: ${customerId}`);
  }

  // CRITICAL SECURITY: Acquire advisory lock to prevent race conditions
  await acquireOrganizationLock(supabase, org.id);

  // Verify event ordering (now protected by lock)
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    org.id,
    eventTimestamp
  );

  if (!valid) {
    logEventOrderingRejection({
      stripe_event_id: eventId,
      organization_id: org.id,
      event_timestamp: eventTimestamp,
      last_timestamp: lastTimestamp });
    return;
  }

  // Check for duplicate event
  const isDuplicate = await checkEventDuplicate(supabase, eventId);

  if (isDuplicate) {
    logDuplicateEvent({
      stripe_event_id: eventId,
      organization_id: org.id });
    return;
  }

  // Update payment method info
  const { error } = await supabase
    .from('organizations')
    .update({
      default_payment_method_id: paymentMethod.id,
      payment_method_last4: paymentMethod.card?.last4 || null,
      payment_method_brand: paymentMethod.card?.brand || null })
    .eq('id', org.id);

  if (error) {
    console.error('[Webhook] Failed to update payment method:', error);
    throw error;
  }

  // Update last event timestamp with optimistic locking
  const updated = await updateLastEventTimestamp(
    supabase,
    org.id,
    eventTimestamp,
    lastTimestamp
  );

  if (!updated) {
    console.warn(
      `[Webhook] Failed to update timestamp for event ${eventId} (optimistic lock failed)`
    );
  }

  console.info(`[subscription-webhook] Payment method attached for org ${org.id}`);
}

// ============================================================================
// Main Webhook Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Validate webhook secret is configured before processing
    if (!STRIPE_WEBHOOK_SECRET_ORGANIZATIONS) {
      console.error('[Webhook] Missing STRIPE_WEBHOOK_SECRET_ORGANIZATIONS');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 } // 500 because it's our configuration error
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header');
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
        STRIPE_WEBHOOK_SECRET_ORGANIZATIONS
      );
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Create service client for database operations
    const supabase = createServiceClient();

    // Check for duplicate event BEFORE processing
    const isDuplicate = await checkEventDuplicate(supabase, event.id);

    if (isDuplicate) {
      console.info(`[subscription-webhook] Duplicate event ${event.id}, returning early`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Use timestamp from verified webhook payload (already present in constructEvent result)
    const eventTimestamp = event.created;

    // Route to appropriate handler based on event type
    const spanContext = {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
    };

    switch (event.type) {
      case 'customer.subscription.created':
        await withPaymentSpan('subscription.created', spanContext, () =>
          handleSubscriptionCreated(supabase, event.data.object as Stripe.Subscription, event.id, eventTimestamp));
        break;

      case 'customer.subscription.updated':
        await withPaymentSpan('subscription.updated', spanContext, () =>
          handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription, event.id, eventTimestamp));
        break;

      case 'customer.subscription.deleted':
        await withPaymentSpan('subscription.deleted', spanContext, () =>
          handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription, event.id, eventTimestamp));
        break;

      case 'invoice.paid':
        await withPaymentSpan('invoice.paid', spanContext, () =>
          handleInvoicePaid(supabase, event.data.object as Stripe.Invoice, event.id, eventTimestamp));
        break;

      case 'invoice.payment_failed':
        await withPaymentSpan('invoice.payment_failed', spanContext, () =>
          handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice, event.id, eventTimestamp));
        break;

      case 'payment_method.attached':
        await withPaymentSpan('payment_method.attached', spanContext, () =>
          handlePaymentMethodAttached(supabase, event.data.object as Stripe.PaymentMethod, event.id, eventTimestamp));
        break;

      default:
        console.info(`[subscription-webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    capturePaymentError(error, {
      action: 'subscription_webhook_handler',
      stripe_event_type: 'unknown',
    });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
