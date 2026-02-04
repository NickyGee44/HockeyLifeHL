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
      persistSession: false,
    },
  });
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
// Helper: Verify Event Ordering
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
    lastTimestamp,
  };
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
      p_created_by: null,
    });

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

  // Verify event ordering
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    organizationId,
    eventTimestamp
  );

  if (!valid) {
    console.warn(
      `[Webhook] Rejecting out-of-order event ${eventId} (timestamp: ${eventTimestamp}, last: ${lastTimestamp})`
    );
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
    stripeEventId: eventId,
  });

  if (isDuplicate) {
    console.log(`[Webhook] Duplicate event ${eventId}, skipping organization update`);
    return;
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
      cancel_at_period_end: subscription.cancel_at_period_end || false,
    })
    .eq('id', organizationId);

  if (error) {
    console.error('[Webhook] Failed to update organization:', error);
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

  console.log(`[Webhook] Subscription created for org ${organizationId}`);
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

  // Verify event ordering
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    organizationId,
    eventTimestamp
  );

  if (!valid) {
    console.warn(
      `[Webhook] Rejecting out-of-order event ${eventId} (timestamp: ${eventTimestamp}, last: ${lastTimestamp})`
    );
    return;
  }

  // Get current organization state
  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('subscription_tier, subscription_status')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    console.error('[Webhook] Failed to fetch organization:', fetchError);
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
    stripeEventId: eventId,
  });

  if (isDuplicate) {
    console.log(`[Webhook] Duplicate event ${eventId}, skipping organization update`);
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
        : null,
    })
    .eq('id', organizationId);

  if (error) {
    console.error('[Webhook] Failed to update organization:', error);
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

  console.log(`[Webhook] Subscription updated for org ${organizationId}: ${eventType}`);
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

  // Verify event ordering
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    organizationId,
    eventTimestamp
  );

  if (!valid) {
    console.warn(
      `[Webhook] Rejecting out-of-order event ${eventId} (timestamp: ${eventTimestamp}, last: ${lastTimestamp})`
    );
    return;
  }

  // Log event FIRST (with idempotency check)
  const { isDuplicate } = await logSubscriptionEvent(supabase, {
    organizationId,
    eventType: 'cancelled',
    toStatus: 'canceled',
    stripeEventId: eventId,
  });

  if (isDuplicate) {
    console.log(`[Webhook] Duplicate event ${eventId}, skipping organization update`);
    return;
  }

  // Update organization - enterprise licensing model, subscription becomes inactive
  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'canceled',
      // Keep enterprise tier but mark as canceled - contact sales to reactivate
      stripe_subscription_id: null,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  if (error) {
    console.error('[Webhook] Failed to update organization:', error);
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

  console.log(`[Webhook] Subscription deleted for org ${organizationId}`);
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
    .select('id, subscription_status, stripe_customer_id')
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

  // Verify event ordering
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    org.id,
    eventTimestamp
  );

  if (!valid) {
    console.warn(
      `[Webhook] Rejecting out-of-order event ${eventId} (timestamp: ${eventTimestamp}, last: ${lastTimestamp})`
    );
    return;
  }

  // Log payment success FIRST (with idempotency check)
  const { isDuplicate } = await logSubscriptionEvent(supabase, {
    organizationId: org.id,
    eventType: 'payment_succeeded',
    amountCents: invoice.amount_paid,
    stripeEventId: eventId,
  });

  if (isDuplicate) {
    console.log(`[Webhook] Duplicate event ${eventId}, skipping organization update`);
    return;
  }

  // If subscription was past_due, restore it
  if (org.subscription_status === 'past_due') {
    const { error } = await supabase
      .from('organizations')
      .update({ subscription_status: 'active' })
      .eq('id', org.id);

    if (error) {
      console.error('[Webhook] Failed to update organization status:', error);
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

  console.log(`[Webhook] Invoice paid for org ${org.id}: $${invoice.amount_paid / 100}`);
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
    .select('id, stripe_customer_id')
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

  // Verify event ordering
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    org.id,
    eventTimestamp
  );

  if (!valid) {
    console.warn(
      `[Webhook] Rejecting out-of-order event ${eventId} (timestamp: ${eventTimestamp}, last: ${lastTimestamp})`
    );
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
      next_payment_attempt: invoice.next_payment_attempt,
    },
  });

  if (isDuplicate) {
    console.log(`[Webhook] Duplicate event ${eventId}, skipping organization update`);
    return;
  }

  // Update subscription status to past_due
  const { error } = await supabase
    .from('organizations')
    .update({ subscription_status: 'past_due' })
    .eq('id', org.id);

  if (error) {
    console.error('[Webhook] Failed to update organization status:', error);
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

  console.log(`[Webhook] Payment failed for org ${org.id}: $${invoice.amount_due / 100}`);
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

  // Verify event ordering
  const { valid, lastTimestamp } = await verifyEventOrdering(
    supabase,
    org.id,
    eventTimestamp
  );

  if (!valid) {
    console.warn(
      `[Webhook] Rejecting out-of-order event ${eventId} (timestamp: ${eventTimestamp}, last: ${lastTimestamp})`
    );
    return;
  }

  // Check for duplicate event
  const isDuplicate = await checkEventDuplicate(supabase, eventId);

  if (isDuplicate) {
    console.log(`[Webhook] Duplicate event ${eventId}, skipping`);
    return;
  }

  // Update payment method info
  const { error } = await supabase
    .from('organizations')
    .update({
      default_payment_method_id: paymentMethod.id,
      payment_method_last4: paymentMethod.card?.last4 || null,
      payment_method_brand: paymentMethod.card?.brand || null,
    })
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

  console.log(`[Webhook] Payment method attached for org ${org.id}`);
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
      console.log(`[Webhook] Duplicate event ${event.id}, returning early`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Retrieve full event from Stripe API to get timestamp
    const fullEvent = await stripe.events.retrieve(event.id);
    const eventTimestamp = fullEvent.created;

    // Route to appropriate handler based on event type
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(
          supabase,
          event.data.object as Stripe.Subscription,
          event.id,
          eventTimestamp
        );
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          supabase,
          event.data.object as Stripe.Subscription,
          event.id,
          eventTimestamp
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          supabase,
          event.data.object as Stripe.Subscription,
          event.id,
          eventTimestamp
        );
        break;

      case 'invoice.paid':
        await handleInvoicePaid(
          supabase,
          event.data.object as Stripe.Invoice,
          event.id,
          eventTimestamp
        );
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          supabase,
          event.data.object as Stripe.Invoice,
          event.id,
          eventTimestamp
        );
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(
          supabase,
          event.data.object as Stripe.PaymentMethod,
          event.id,
          eventTimestamp
        );
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
