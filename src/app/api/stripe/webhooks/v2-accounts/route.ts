/**
 * Stripe V2 Account Webhooks (Thin Events)
 *
 * This endpoint handles webhook events for V2 connected accounts.
 * V2 events use "thin" events, which only contain the event ID and must be
 * fetched separately to get the full data.
 *
 * Events handled:
 * - v2.core.account[requirements].updated - Account requirements changed
 * - v2.core.account[configuration.merchant].capability_status_updated - Merchant capability status changed
 * - v2.core.account[configuration.customer].capability_status_updated - Customer capability status changed
 *
 * To listen locally with Stripe CLI:
 * stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.merchant].capability_status_updated,v2.core.account[configuration.customer].capability_status_updated' --forward-thin-to http://localhost:3000/api/stripe/webhooks/v2-accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

export const runtime = 'nodejs';

type ServiceRoleSupabaseClient = ReturnType<typeof createServiceRoleClient>;
type WebhookLockState = 'acquired' | 'duplicate' | 'in_progress';

const WEBHOOK_LOCK_STALE_MS = 15 * 60 * 1000;
const UNIQUE_VIOLATION_CODE = '23505';

function isWebhookLockRecent(createdAt: string | null): boolean {
  if (!createdAt) {
    return false;
  }

  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) {
    return false;
  }

  return Date.now() - createdAtMs < WEBHOOK_LOCK_STALE_MS;
}

async function acquireWebhookLock(
  supabase: ServiceRoleSupabaseClient,
  stripeEventId: string,
  eventType: string
): Promise<WebhookLockState> {
  const { error: insertError } = await supabase.from('webhook_events').insert({
    stripe_event_id: stripeEventId,
    event_type: eventType,
    processed_at: null,
  });

  if (!insertError) {
    return 'acquired';
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
    return 'duplicate';
  }

  if (isWebhookLockRecent(existing.created_at)) {
    return 'in_progress';
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

  return claimResult.data ? 'acquired' : 'in_progress';
}

async function completeWebhookLock(supabase: ServiceRoleSupabaseClient, stripeEventId: string): Promise<void> {
  const { error } = await supabase
    .from('webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('stripe_event_id', stripeEventId)
    .is('processed_at', null);

  if (error) throw error;
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

    // TODO: Set STRIPE_WEBHOOK_SECRET_V2 in your .env.local
    // Get this from the webhook endpoint in Stripe Dashboard after creating it
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_V2;

    if (!webhookSecret) {
      console.error(
        'Missing STRIPE_WEBHOOK_SECRET_V2 environment variable. ' +
        'Create a webhook endpoint in Stripe Dashboard for V2 events and add the secret.'
      );
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    /**
     * Parse Thin Event
     * Thin events only contain the event ID, not the full event data
     */
    const thinEvent = (getStripeClient() as any).parseThinEvent(body, signature, webhookSecret);

    console.log('Received thin event:', thinEvent.type, 'ID:', thinEvent.id);

    const supabase = createServiceRoleClient();
    const lockState = await acquireWebhookLock(
      supabase,
      thinEvent.id,
      String(thinEvent.type)
    );

    if (lockState === 'duplicate') {
      console.log(`Thin webhook event ${thinEvent.id} already processed - ignoring duplicate`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (lockState === 'in_progress') {
      console.log(`Thin webhook event ${thinEvent.id} is currently in progress - skipping`);
      return NextResponse.json({ received: true, inProgress: true });
    }

    lockedEventId = thinEvent.id;

    /**
     * Fetch Full Event Data
     * We need to retrieve the full event from Stripe to get the details
     */
    const event = await getStripeClient().v2.core.events.retrieve(thinEvent.id);

    console.log('Full event type:', event.type);

    // Handle different event types
    switch (event.type as string) {
      /**
       * Account Requirements Updated
       * Triggered when account requirements change (e.g., need to verify identity)
       */
      case 'v2.core.account[requirements].updated':
        await handleRequirementsUpdated(event, supabase);
        break;

      /**
       * Merchant Capability Status Updated
       * Triggered when the merchant (payment acceptance) capability status changes
       */
      case 'v2.core.account[configuration.merchant].capability_status_updated':
        await handleMerchantCapabilityUpdated(event, supabase);
        break;

      /**
       * Customer Capability Status Updated
       * Triggered when the customer (being charged) capability status changes
       */
      case 'v2.core.account[configuration.customer].capability_status_updated':
        await handleCustomerCapabilityUpdated(event, supabase);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    await completeWebhookLock(supabase, thinEvent.id);
    lockedEventId = null;

    return NextResponse.json({ received: true});

  } catch (error: unknown) {
    if (lockedEventId) {
      console.error('V2 account webhook processing failed after lock acquisition; leaving processed_at null for stale retry:', {
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
 * Handle Requirements Updated Event
 *
 * Account requirements can change due to:
 * - Regulatory changes
 * - Card network requirements
 * - Identity verification needs
 */
async function handleRequirementsUpdated(event: any, supabase: ServiceRoleSupabaseClient) {
  console.log('Handling requirements updated for account:', event.data?.object?.id);
  void supabase;

  const accountId = event.data?.object?.id;
  if (!accountId) return;

  try {
    // Fetch the full account details to see what's required
    const account = await getStripeClient().v2.core.accounts.retrieve(accountId, {
      include: ['requirements'],
    });

    const currentlyDue = (account.requirements as any)?.currently_due || [];
    const pastDue = (account.requirements as any)?.past_due || [];
    const eventuallyDue = (account.requirements as any)?.eventually_due || [];

    console.log('Requirements status:', {
      currentlyDue,
      pastDue,
      eventuallyDue,
    });

    // TODO: Store requirements in database for tracking
    // await supabase.from('leagues')
    //   .update({
    //     stripe_requirements_currently_due: currentlyDue,
    //     stripe_requirements_past_due: pastDue,
    //     stripe_requirements_eventually_due: eventuallyDue,
    //   })
    //   .eq('stripe_account_id', accountId);

    // TODO: Send email notification to league owner if requirements are due
    // if (currentlyDue.length > 0 || pastDue.length > 0) {
    //   await sendRequirementsNotificationEmail(accountId, currentlyDue, pastDue);
    // }

  } catch (error) {
    console.error('Error handling requirements updated:', error);
  }
}

/**
 * Handle Merchant Capability Status Updated
 *
 * Triggered when card_payments capability status changes
 * Statuses: inactive, pending, active, restricted, suspended
 */
async function handleMerchantCapabilityUpdated(event: any, supabase: ServiceRoleSupabaseClient) {
  console.log('Handling merchant capability updated for account:', event.data?.object?.id);

  const accountId = event.data?.object?.id;
  if (!accountId) return;

  try {
    // Fetch the account to get the current capability status
    const account = await getStripeClient().v2.core.accounts.retrieve(accountId, {
      include: ['configuration.merchant'],
    });

    const cardPaymentsStatus =
      account.configuration?.merchant?.capabilities?.card_payments?.status;

    console.log('Card payments capability status:', cardPaymentsStatus);

    const status = cardPaymentsStatus === 'active' ? 'active' : 'pending';

    await supabase
      .from('leagues')
      .update({
        stripe_account_status: status,
      })
      .eq('stripe_account_id', accountId);

    // TODO: Send notification if capability became active
    // if (cardPaymentsStatus === 'active') {
    //   await sendCapabilityActiveNotification(accountId);
    // }

  } catch (error) {
    console.error('Error handling merchant capability updated:', error);
  }
}

/**
 * Handle Customer Capability Status Updated
 *
 * Triggered when the account's ability to be charged changes
 * This is important for platform subscriptions
 */
async function handleCustomerCapabilityUpdated(event: any, supabase: ServiceRoleSupabaseClient) {
  console.log('Handling customer capability updated for account:', event.data?.object?.id);
  void supabase;

  const accountId = event.data?.object?.id;
  if (!accountId) return;

  try {
    // Fetch the account to get the current capability status
    const account = await getStripeClient().v2.core.accounts.retrieve(accountId, {
      include: ['configuration.customer'],
    });

    const customerStatus = account.configuration?.customer;

    console.log('Customer capability status:', customerStatus);

    // TODO: Update database with customer capability status
    // This affects whether the platform can charge subscriptions to this account

  } catch (error) {
    console.error('Error handling customer capability updated:', error);
  }
}
