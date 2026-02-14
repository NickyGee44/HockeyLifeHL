/**
 * Sentry instrumentation for payment flows.
 *
 * All payment errors (webhooks, checkout, billing) are captured with
 * rich context so they can be filtered and alerted on in Sentry.
 */

import * as Sentry from '@sentry/nextjs';

export interface PaymentErrorContext {
  /** Stripe webhook event ID (evt_...) */
  stripe_event_id?: string;
  /** Stripe webhook event type (e.g. payment_intent.succeeded) */
  stripe_event_type?: string;
  /** League UUID */
  league_id?: string;
  /** Organization UUID */
  organization_id?: string;
  /** Stripe payment intent ID (pi_...) */
  payment_intent_id?: string;
  /** Stripe customer ID (cus_...) */
  stripe_customer_id?: string;
  /** Stripe connected account ID (acct_...) */
  stripe_account_id?: string;
  /** Which handler/action was running when the error occurred */
  action?: string;
  /** Amount in cents, if applicable */
  amount_cents?: number;
  /** Free-form metadata */
  [key: string]: unknown;
}

/**
 * Capture a payment-related error with full context.
 *
 * Tags the event with `payment: true` so Sentry alerts can
 * filter specifically for payment failures.
 */
export function capturePaymentError(
  error: unknown,
  context: PaymentErrorContext,
): void {
  Sentry.withScope((scope) => {
    scope.setTag('payment', true);
    scope.setLevel('error');

    if (context.stripe_event_type) {
      scope.setTag('stripe.event_type', context.stripe_event_type);
    }
    if (context.stripe_event_id) {
      scope.setTag('stripe.event_id', context.stripe_event_id);
    }
    if (context.league_id) {
      scope.setTag('league_id', context.league_id);
    }
    if (context.organization_id) {
      scope.setTag('organization_id', context.organization_id);
    }
    if (context.action) {
      scope.setTag('payment.action', context.action);
    }

    scope.setContext('payment', context);

    Sentry.captureException(error);
  });
}

/**
 * Run an async function inside a Sentry span for performance monitoring.
 *
 * Use this to wrap individual webhook event handlers so each handler
 * shows up as a measured operation in Sentry's performance tab.
 */
export async function withPaymentSpan<T>(
  name: string,
  context: PaymentErrorContext,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: 'webhook.handler',
      attributes: {
        'stripe.event_type': context.stripe_event_type ?? 'unknown',
        'stripe.event_id': context.stripe_event_id ?? 'unknown',
        'league_id': context.league_id ?? 'unknown',
      },
    },
    async () => {
      try {
        return await fn();
      } catch (error) {
        capturePaymentError(error, { ...context, action: name });
        throw error;
      }
    },
  );
}
