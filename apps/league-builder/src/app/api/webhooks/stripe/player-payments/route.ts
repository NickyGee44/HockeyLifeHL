/**
 * Stripe Webhook Endpoint for Player Payments
 *
 * Handles Stripe webhook events for player fee collection.
 * Verifies webhook signature and processes events idempotently.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPlayerPaymentsWebhook,
  handlePlayerPaymentsWebhook,
} from '@/lib/payments/webhook-handler';
import { capturePaymentError } from '@/lib/sentry/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = verifyPlayerPaymentsWebhook(body, signature);

    if (!event) {
      console.error('[Webhook] Signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Process the event
    const result = await handlePlayerPaymentsWebhook(event);

    if (!result.success) {
      console.error('[Webhook] Event processing failed:', result.message);
      capturePaymentError(new Error(result.message || 'Player payment webhook failed'), {
        action: 'player_payments_webhook',
        stripe_event_id: event.id,
        stripe_event_type: event.type,
      });
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      received: true,
      type: event.type,
      message: result.message,
    });
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    capturePaymentError(error, {
      action: 'player_payments_webhook',
      stripe_event_type: 'unknown',
    });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
