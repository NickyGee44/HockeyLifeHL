/**
 * Stripe Subscription Webhooks (Regular Events)
 *
 * This endpoint handles webhook events for platform subscriptions.
 * These are regular (not thin) events that contain the full event data.
 *
 * NOTE: @ts-nocheck is used because stripe_webhook_events and stripe_subscriptions
 * table types will be available after creating and applying the migrations.
 *
 * Events handled:
 * - customer.subscription.created - New subscription created
 * - customer.subscription.updated - Subscription changed (upgrade, downgrade, cancel scheduled, etc.)
 * - customer.subscription.deleted - Subscription canceled/ended
 * - payment_method.attached - Payment method added
 * - payment_method.detached - Payment method removed
 * - customer.updated - Customer details updated
 * - customer.tax_id.created - Tax ID added
 * - customer.tax_id.updated - Tax ID updated
 * - customer.tax_id.deleted - Tax ID removed
 * - billing_portal.configuration.created - Billing portal config created
 * - billing_portal.configuration.updated - Billing portal config updated
 * - billing_portal.session.created - Billing portal session created
 * - invoice.paid - Invoice paid successfully
 * - invoice.payment_failed - Invoice payment failed
 *
 * To listen locally with Stripe CLI:
 * stripe listen --forward-to http://localhost:3000/api/stripe/webhooks/subscriptions
 */

// @ts-nocheck
// NOTE: Stripe webhook and subscription table types will be available after migrations
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

const WEBHOOK_LOCK_STALE_MS = 15 * 60 * 1000;
const UNIQUE_VIOLATION_CODE = '23505';

function isWebhookLockRecent(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) return false;
  return Date.now() - createdAtMs < WEBHOOK_LOCK_STALE_MS;
}

async function acquireWebhookLock(supabase: any, stripeEventId: string, eventType: string) {
  const { error: insertError } = await supabase.from('webhook_events').insert({
    stripe_event_id: stripeEventId,
    event_type: eventType,
    processed_at: null,
  });

  if (!insertError) {
    return 'acquired' as const;
  }

  if ((insertError as { code?: string }).code !== UNIQUE_VIOLATION_CODE) {
    throw insertError;
  }

  const { data: existing, error: existingError } = await supabase
    .from('webhook_events')
    .select('created_at, processed_at')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error(`Webhook lock row missing for duplicate event ${stripeEventId}`);
  }

  if (existing.processed_at) {
    return 'duplicate' as const;
  }

  if (isWebhookLockRecent(existing.created_at)) {
    return 'in_progress' as const;
  }

  const claimPayload = {
    created_at: new Date().toISOString(),
    event_type: eventType,
  };

  const claimResult = existing.created_at
    ? await supabase
        .from('webhook_events')
        .update(claimPayload)
        .eq('stripe_event_id', stripeEventId)
        .is('processed_at', null)
        .eq('created_at', existing.created_at)
        .select('stripe_event_id')
        .maybeSingle()
    : await supabase
        .from('webhook_events')
        .update(claimPayload)
        .eq('stripe_event_id', stripeEventId)
        .is('processed_at', null)
        .is('created_at', null)
        .select('stripe_event_id')
        .maybeSingle();

  if (claimResult.error) {
    throw claimResult.error;
  }

  return claimResult.data ? ('acquired' as const) : ('in_progress' as const);
}

async function completeWebhookLock(supabase: any, stripeEventId: string) {
  const { error } = await supabase
    .from('webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('stripe_event_id', stripeEventId)
    .is('processed_at', null);

  if (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  let lockedEventId: string | null = null;

  try {
    // Get the raw body for signature verification
    const body = await request.text();

    // Get the Stripe signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // TODO: Set STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS in your .env.local
    // Get this from the webhook endpoint in Stripe Dashboard
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS ||
                          process.env.STRIPE_WEBHOOK_SECRET; // Fallback to main secret

    if (!webhookSecret) {
      console.error(
        'Missing STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS environment variable. ' +
        'Create a webhook endpoint in Stripe Dashboard and add the secret.'
      );
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    /**
     * Construct Event from Webhook
     * This verifies the signature and parses the event
     */
    const event = getStripeClient().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    ) as Stripe.Event;

    console.log('Received webhook event:', event.type, 'ID:', event.id);

    const supabase = createServiceRoleClient();
    const lockState = await acquireWebhookLock(supabase, event.id, event.type);

    if (lockState === 'duplicate') {
      console.log(`Webhook event ${event.id} already processed - ignoring duplicate`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (lockState === 'in_progress') {
      console.log(`Webhook event ${event.id} is currently in progress - skipping`);
      return NextResponse.json({ received: true, inProgress: true });
    }

    lockedEventId = event.id;

    // Handle different event types
    switch (event.type) {
      // Subscription Events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;

      // Payment Method Events
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
        break;

      // Customer Events
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      // Tax ID Events
      case 'customer.tax_id.created':
      case 'customer.tax_id.updated':
      case 'customer.tax_id.deleted':
        await handleTaxIdEvent(event);
        break;

      // Billing Portal Events
      case 'billing_portal.configuration.created':
      case 'billing_portal.configuration.updated':
      case 'billing_portal.session.created':
        // These are informational, no action needed
        console.log('Billing portal event:', event.type);
        break;

      // Invoice Events
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    await completeWebhookLock(supabase, event.id);
    lockedEventId = null;

    return NextResponse.json({ received: true });

  } catch (error: unknown) {
    if (lockedEventId) {
      console.error('Subscription webhook processing failed after lock acquisition; leaving processed_at null for stale retry:', {
        stripe_event_id: lockedEventId,
        error,
      });
    }
    console.error('Webhook error:', error);

    if (error instanceof Error && 'type' in error) {
      const stripeError = error as Stripe.errors.StripeError;
      return NextResponse.json(
        { error: stripeError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle Subscription Created
 * Triggered when a new subscription is created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription, supabase: any) {
  console.log('Subscription created:', subscription.id);

  /**
   * IMPORTANT: For V2 accounts, get the account ID from customer_account, not customer
   * subscription.customer_account will have shape: acct_xxxxx
   */
  const accountId = subscription.customer_account as string;
  const leagueId = subscription.metadata?.league_id;

  if (!accountId) {
    console.error('No customer_account found in subscription');
    return;
  }

  try {

    // Store subscription in database
    const { error: insertError } = await supabase.from('stripe_subscriptions').insert({
      league_id: leagueId || null,
      stripe_subscription_id: subscription.id,
      stripe_account_id: accountId,
      stripe_customer_id: (subscription as any).customer || null,
      status: subscription.status,
      price_id: subscription.items.data[0]?.price?.id || null,
      product_id: subscription.items.data[0]?.price?.product as string || null,
      quantity: subscription.items.data[0]?.quantity || 1,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      metadata: subscription.metadata as any,
    });

    if (insertError) {
      console.error('Error inserting subscription:', insertError);
    }

    // Update league subscription tier based on the price
    if (leagueId) {
      const { error: updateError } = await supabase.from('leagues')
        .update({
          subscription_status: 'active',
          stripe_subscription_id: subscription.id,
        })
        .eq('id', leagueId);

      if (updateError) {
        console.error('Error updating league subscription status:', updateError);
      }
    }

    console.log('Subscription stored for account:', accountId);

  } catch (error) {
    console.error('Error storing subscription:', error);
  }
}

/**
 * Handle Subscription Updated
 *
 * This can be triggered by:
 * - Upgrade/downgrade (price change)
 * - Quantity change
 * - Cancellation scheduled (cancel_at_period_end = true)
 * - Cancellation reverted (cancel_at_period_end = false)
 * - Pause/resume
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: any) {
  console.log('Subscription updated:', subscription.id);

  const accountId = subscription.customer_account as string;
  const leagueId = subscription.metadata?.league_id;

  // Check what changed
  const priceId = subscription.items.data[0]?.price?.id;
  const quantity = subscription.items.data[0]?.quantity || 1;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;
  const pauseCollection = subscription.pause_collection;

  try {

    // Update subscription in database
    const { error: updateError } = await supabase.from('stripe_subscriptions')
      .update({
        status: subscription.status,
        price_id: priceId,
        product_id: subscription.items.data[0]?.price?.product as string || null,
        quantity,
        cancel_at_period_end: cancelAtPeriodEnd,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        pause_collection_behavior: pauseCollection?.behavior || null,
        pause_collection_resumes_at: pauseCollection?.resumes_at ? new Date(pauseCollection.resumes_at * 1000).toISOString() : null,
        metadata: subscription.metadata as any,
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
    }

    // Update league status
    if (leagueId) {
      const { error: leagueUpdateError } = await supabase.from('leagues')
        .update({
          subscription_status: subscription.status,
        })
        .eq('id', leagueId);

      if (leagueUpdateError) {
        console.error('Error updating league status:', leagueUpdateError);
      }
    }

    // Handle specific scenarios
    if (cancelAtPeriodEnd) {
      console.log('Subscription will cancel at period end:', new Date(subscription.current_period_end * 1000));
      // TODO: Send email notification about upcoming cancellation
    }

    if (!cancelAtPeriodEnd && subscription.status === 'active') {
      console.log('Subscription reactivated');
      // TODO: Send email notification about reactivation
    }

    if (pauseCollection) {
      console.log('Subscription paused, resumes at:', pauseCollection.resumes_at);
      // TODO: Handle paused subscription - could restrict features
    } else if (subscription.status === 'active') {
      console.log('Subscription resumed');
      // TODO: Handle resumed subscription - restore features
    }

    // Handle tier changes
    // TODO: Check if priceId changed and grant/revoke access to features accordingly

  } catch (error) {
    console.error('Error updating subscription:', error);
  }
}

/**
 * Handle Subscription Deleted
 * Triggered when a subscription is canceled/ended
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: any) {
  console.log('Subscription deleted:', subscription.id);

  const accountId = subscription.customer_account as string;
  const leagueId = subscription.metadata?.league_id;

  try{

    // Update subscription status in database
    const { error: updateError } = await supabase.from('stripe_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
    }

    // Revoke access to premium features
    if (leagueId) {
      const { error: leagueUpdateError } = await supabase.from('leagues')
        .update({
          subscription_status: 'canceled',
          subscription_tier: 'free',
        })
        .eq('id', leagueId);

      if (leagueUpdateError) {
        console.error('Error updating league:', leagueUpdateError);
      }
    }

    // TODO: Send cancellation confirmation email

  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

/**
 * Handle Payment Method Attached
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  console.log('Payment method attached:', paymentMethod.id, 'Customer:', paymentMethod.customer);
  // TODO: Update payment method information in database if needed
}

/**
 * Handle Payment Method Detached
 */
async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod) {
  console.log('Payment method detached:', paymentMethod.id);
  // TODO: Handle payment method removal
}

/**
 * Handle Customer Updated
 *
 * Check for changes in:
 * - Default payment method
 * - Email address (billing email only, not for login)
 * - Other billing details
 */
async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log('Customer updated:', customer.id);

  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

  // TODO: Update customer information in database
  // Note: Do NOT use customer billing email as login credential
  // Treat all updates as billing information changes only
}

/**
 * Handle Tax ID Events
 */
async function handleTaxIdEvent(event: Stripe.Event) {
  console.log('Tax ID event:', event.type);
  const taxId = event.data.object as Stripe.TaxId;

  // Tax IDs can be validated by Stripe
  // Learn more: https://docs.stripe.com/billing/customer/tax-ids
  console.log('Tax ID:', taxId.id, 'Status:', taxId.verification?.status);

  // TODO: Store/update/delete tax ID in database
}

/**
 * Handle Invoice Paid
 * Triggered when an invoice is successfully paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice, supabase: any) {
  console.log('Invoice paid:', invoice.id, 'Amount:', invoice.amount_paid);

  const accountId = invoice.customer_account as string;
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  try {

    // Get subscription from database to link payment
    const { data: subscription } = await supabase
      .from('stripe_subscriptions')
      .select('id, league_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    // Record successful payment in database
    const { error: paymentError } = await supabase.from('stripe_payment_history').insert({
      league_id: subscription?.league_id || null,
      subscription_id: subscription?.id || null,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent as string || null,
      stripe_account_id: accountId,
      stripe_customer_id: customerId,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      billing_reason: invoice.billing_reason || null,
      payment_method_type: invoice.payment_settings?.payment_method_types?.[0] || null,
      invoice_pdf_url: invoice.invoice_pdf || null,
      invoice_hosted_url: invoice.hosted_invoice_url || null,
      paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
      metadata: invoice.metadata as any,
    });

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
    }

    // Grant access to services if this is the first payment
    if (invoice.billing_reason === 'subscription_create') {
      console.log('First invoice for subscription:', subscriptionId);
      // TODO: Activate subscription features
      // TODO: Send welcome email with receipt
    } else {
      // TODO: Send receipt email for recurring payment
    }
  } catch (error) {
    console.error('Error handling paid invoice:', error);
  }
}

/**
 * Handle Invoice Payment Failed
 * Triggered when an invoice payment fails
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  console.log('Invoice payment failed:', invoice.id);

  const accountId = invoice.customer_account as string;
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  try {

    // Get subscription from database
    const { data: subscription } = await supabase
      .from('stripe_subscriptions')
      .select('id, league_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    // Record failed payment in database
    const { error: paymentError } = await supabase.from('stripe_payment_history').insert({
      league_id: subscription?.league_id || null,
      subscription_id: subscription?.id || null,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent as string || null,
      stripe_account_id: accountId,
      stripe_customer_id: customerId,
      amount_paid: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      billing_reason: invoice.billing_reason || null,
      payment_method_type: invoice.payment_settings?.payment_method_types?.[0] || null,
      failure_code: (invoice as any).charge?.failure_code || null,
      failure_message: (invoice as any).charge?.failure_message || 'Payment failed',
      invoice_pdf_url: invoice.invoice_pdf || null,
      invoice_hosted_url: invoice.hosted_invoice_url || null,
      metadata: invoice.metadata as any,
    });

    if (paymentError) {
      console.error('Error recording failed payment:', paymentError);
    }

    // Update subscription status to past_due if applicable
    if (subscription) {
      const { error: updateError } = await supabase.from('stripe_subscriptions')
        .update({ status: 'past_due' })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription status:', updateError);
      }
    }

    // TODO: Send payment failure notification email with retry instructions
    // Note: Stripe will automatically retry failed payments based on settings

    // TODO: Potentially restrict access if payment repeatedly fails
    // Could check payment_history for number of consecutive failures
  } catch (error) {
    console.error('Error handling failed invoice:', error);
  }
}
