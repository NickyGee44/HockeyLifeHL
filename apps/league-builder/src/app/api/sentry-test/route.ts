/**
 * Sentry Test Route
 *
 * GET /api/sentry-test — throws a test error to verify Sentry is capturing events.
 * Disabled in production for safety.
 */

import { NextResponse } from 'next/server';
import { capturePaymentError } from '@/lib/sentry/payments';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Test 1: Generic payment error capture
  capturePaymentError(new Error('Sentry test: payment error capture'), {
    action: 'sentry_test',
    stripe_event_type: 'test.event',
    league_id: 'test-league-id',
    amount_cents: 9999,
  });

  // Test 2: Throw to verify global error handler
  throw new Error('Sentry test: unhandled route error');
}
