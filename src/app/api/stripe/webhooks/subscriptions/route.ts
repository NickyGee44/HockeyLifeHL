/**
 * Stripe Subscription Webhooks (Regular Events)
 *
 * This endpoint handles webhook events for platform subscriptions.
 * These are regular (not thin) events that contain the full event data.
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

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeClient } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
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
    const event = stripeClient.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    ) as Stripe.Event;

    console.log('Received webhook event:', event.type, 'ID:', event.id);

    // Handle different event types
    switch (event.type) {
      // Subscription Events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
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
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error: unknown) {
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
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
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
    const supabase = await createClient();

    // TODO: Store subscription in database
    // await supabase.from('subscriptions').insert({
    //   league_id: leagueId,
    //   stripe_subscription_id: subscription.id,
    //   stripe_account_id: accountId,
    //   status: subscription.status,
    //   current_period_start: new Date(subscription.current_period_start * 1000),
    //   current_period_end: new Date(subscription.current_period_end * 1000),
    //   cancel_at_period_end: subscription.cancel_at_period_end,
    // });

    // Update league subscription tier based on the price
    // await supabase.from('leagues')
    //   .update({ subscription_status: 'active' })
    //   .eq('stripe_account_id', accountId);

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
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  const accountId = subscription.customer_account as string;
  const leagueId = subscription.metadata?.league_id;

  // Check what changed
  const priceId = subscription.items.data[0]?.price?.id;
  const quantity = subscription.items.data[0]?.quantity || 1;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;
  const pauseCollection = subscription.pause_collection;

  try {
    const supabase = await createClient();

    // TODO: Update subscription in database
    // await supabase.from('subscriptions')
    //   .update({
    //     status: subscription.status,
    //     price_id: priceId,
    //     quantity,
    //     cancel_at_period_end: cancelAtPeriodEnd,
    //     current_period_start: new Date(subscription.current_period_start * 1000),
    //     current_period_end: new Date(subscription.current_period_end * 1000),
    //   })
    //   .eq('stripe_subscription_id', subscription.id);

    // Handle specific scenarios
    if (cancelAtPeriodEnd) {
      console.log('Subscription will cancel at period end:', (subscription as any).current_period_end);
      // TODO: Send email notification about upcoming cancellation
    }

    if (!cancelAtPeriodEnd && subscription.status === 'active') {
      console.log('Subscription reactivated');
      // TODO: Send email notification about reactivation
    }

    if (pauseCollection) {
      console.log('Subscription paused, resumes at:', pauseCollection.resumes_at);
      // TODO: Handle paused subscription
    } else if (subscription.status === 'active') {
      console.log('Subscription resumed');
      // TODO: Handle resumed subscription
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
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  const accountId = subscription.customer_account as string;
  const leagueId = subscription.metadata?.league_id;

  try {
    const supabase = await createClient();

    // TODO: Update subscription status in database
    // await supabase.from('subscriptions')
    //   .update({
    //     status: 'canceled',
    //     canceled_at: new Date(),
    //   })
    //   .eq('stripe_subscription_id', subscription.id);

    // TODO: Revoke access to premium features
    // await supabase.from('leagues')
    //   .update({
    //     subscription_status: 'canceled',
    //     subscription_tier: 'free',
    //   })
    //   .eq('stripe_account_id', accountId);

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
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('Invoice paid:', invoice.id, 'Amount:', invoice.amount_paid);

  const accountId = invoice.customer_account as string;
  const subscriptionId = (invoice as any).subscription;

  // TODO: Record successful payment in database
  // TODO: Send receipt email

  // Grant access to services if this is the first payment
  if (invoice.billing_reason === 'subscription_create') {
    console.log('First invoice for subscription:', subscriptionId);
    // TODO: Activate subscription features
  }
}

/**
 * Handle Invoice Payment Failed
 * Triggered when an invoice payment fails
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);

  const accountId = invoice.customer_account as string;
  const subscriptionId = (invoice as any).subscription;

  // TODO: Update subscription status in database
  // TODO: Send payment failure notification email
  // TODO: Stripe will automatically retry failed payments based on settings

  // Potentially restrict access if payment repeatedly fails
}
