/**
 * API Route: Create Registration Fee Checkout Session
 *
 * Creates a Stripe Checkout session for player registration fee payments.
 * Uses Stripe Connect to direct payments to the league's connected account
 * with the platform's application fee (2.99%).
 *
 * Security:
 * - Verifies user authentication
 * - Validates fee exists and is active
 * - Validates league has a connected Stripe account
 * - Uses idempotency keys to prevent duplicate charges
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { generateIdempotencyKey } from '@/lib/stripe/idempotency';
import { calculateApplicationFee } from '@/lib/leagues/stripe-connect';
import { capturePaymentError } from '@/lib/sentry/payments';

interface RegistrationCheckoutRequest {
  leagueId: string;
  seasonId: string;
  seasonFeeId: string;
  playerPaymentId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegistrationCheckoutRequest;
    const { leagueId, seasonId, seasonFeeId, playerPaymentId, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!leagueId || !seasonId || !seasonFeeId || !playerPaymentId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the season fee details
    const { data: fee, error: feeError } = await supabase
      .from('season_fees')
      .select('*')
      .eq('id', seasonFeeId)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('is_active', true)
      .single();

    if (feeError || !fee) {
      return NextResponse.json(
        { error: 'Season fee not found or is no longer active' },
        { status: 404 }
      );
    }

    // Get the player payment record
    const { data: playerPayment, error: paymentError } = await supabase
      .from('player_payments')
      .select('*')
      .eq('id', playerPaymentId)
      .eq('player_id', user.id)
      .single();

    if (paymentError || !playerPayment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    if (['paid', 'refunded', 'cancelled'].includes(playerPayment.status)) {
      return NextResponse.json(
        { error: 'This payment has already been completed or cancelled' },
        { status: 400 }
      );
    }

    // Get league with Stripe account info
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, stripe_account_id, stripe_account_status')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }

    if (!league.stripe_account_id) {
      return NextResponse.json(
        { error: 'This league has not set up payment processing yet' },
        { status: 400 }
      );
    }

    if (league.stripe_account_status !== 'complete') {
      return NextResponse.json(
        { error: 'League payment processing is not yet active' },
        { status: 400 }
      );
    }

    // Calculate amount to charge for this checkout
    // For installment plans, charge the per-installment amount
    const totalOwed = (playerPayment.total_amount_cents ?? 0) - (playerPayment.amount_paid_cents ?? 0);
    let checkoutAmountCents: number;

    if (playerPayment.payment_plan === 'full') {
      checkoutAmountCents = totalOwed;
    } else {
      // For installment plans, charge one installment
      const totalInstallments = playerPayment.total_installments ?? 1;
      const currentInstallment = playerPayment.current_installment ?? 0;
      const remainingInstallments = totalInstallments - currentInstallment;
      checkoutAmountCents = remainingInstallments > 0
        ? Math.ceil(totalOwed / remainingInstallments)
        : totalOwed;
    }

    if (checkoutAmountCents <= 0) {
      return NextResponse.json(
        { error: 'No amount due for this payment' },
        { status: 400 }
      );
    }

    // Calculate platform application fee (2.99%)
    const applicationFeeCents = await calculateApplicationFee(checkoutAmountCents);

    const currentInstallment = playerPayment.current_installment ?? 0;

    // Create idempotency key
    const idempotencyKey = generateIdempotencyKey('registration_checkout', {
      player_payment_id: playerPaymentId,
      player_id: user.id,
      installment: currentInstallment.toString(),
    });

    // Create Checkout Session on the connected account
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: playerPayment.currency || 'cad',
              product_data: {
                name: fee.name,
                description: `${league.name} - Registration Fee`,
              },
              unit_amount: checkoutAmountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFeeCents,
          metadata: {
            type: 'registration_fee',
            player_payment_id: playerPaymentId,
            season_fee_id: seasonFeeId,
            player_id: user.id,
            league_id: leagueId,
            season_id: seasonId,
            installment_number: (currentInstallment + 1).toString(),
          },
        },
        customer_email: user.email || undefined,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          type: 'registration_fee',
          player_payment_id: playerPaymentId,
          league_id: leagueId,
        },
      },
      {
        stripeAccount: league.stripe_account_id,
        idempotencyKey,
      }
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[Registration Checkout] Error creating session:', error);
    capturePaymentError(error, {
      action: 'create_registration_checkout',
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create checkout session';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
