/**
 * Create Checkout Session API Route
 *
 * This endpoint creates a Stripe Checkout session for purchasing products
 * from a connected account using Direct Charges with application fees.
 *
 * Direct Charges:
 * - Payment goes directly to the connected account
 * - Platform takes an application fee
 * - Connected account sees net amount after fees
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripeClient } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { leagueId, priceId, quantity = 1 } = await request.json();

    if (!leagueId || !priceId) {
      return NextResponse.json(
        { error: 'Missing required fields: leagueId, priceId' },
        { status: 400 }
      );
    }

    // Get the league's Stripe account ID
    const supabase = await createClient();
    const { data: league } = await supabase
      .from('leagues')
      .select('stripe_account_id, slug, name')
      .eq('id', leagueId)
      .single();

    if (!league?.stripe_account_id) {
      return NextResponse.json(
        { error: 'League does not have a connected Stripe account' },
        { status: 400 }
      );
    }

    // Get the price details to calculate application fee
    const price = await stripeClient.prices.retrieve(priceId, {
      stripeAccount: league.stripe_account_id,
    });

    if (!price.unit_amount) {
      return NextResponse.json(
        { error: 'Price does not have a unit amount' },
        { status: 400 }
      );
    }

    /**
     * Calculate Application Fee
     * This is how the platform monetizes the transaction.
     *
     * Example: 5% application fee
     * If product is $100, platform takes $5, connected account gets $95
     *
     * TODO: Adjust this percentage based on your business model
     * Typical ranges: 1-10% depending on services provided
     */
    const APPLICATION_FEE_PERCENTAGE = 0.05; // 5%
    const totalAmount = price.unit_amount * quantity;
    const applicationFeeAmount = Math.round(totalAmount * APPLICATION_FEE_PERCENTAGE);

    // Construct URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/store/${league.slug}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/store/${league.slug}`;

    /**
     * Create Checkout Session on Connected Account
     *
     * IMPORTANT: Use Direct Charge with application fee.
     * The payment goes to the connected account, and the platform
     * receives the application fee.
     */
    const session = await stripeClient.checkout.sessions.create(
      {
        // Line items (products being purchased)
        line_items: [
          {
            // Reference the price ID from the connected account
            price: priceId,
            quantity,
          },
        ],

        // Payment mode (one-time payment)
        mode: 'payment',

        /**
         * Payment Intent Data
         * This is where we specify the application fee for Direct Charges
         */
        payment_intent_data: {
          /**
           * Application fee amount in cents
           * This goes to the platform account
           * The connected account receives: totalAmount - applicationFeeAmount
           */
          application_fee_amount: applicationFeeAmount,
        },

        // Success URL (where to redirect after successful payment)
        success_url: successUrl,

        // Cancel URL (where to redirect if user cancels)
        cancel_url: cancelUrl,

        // Allow promotion codes
        allow_promotion_codes: true,

        // Collect customer email
        customer_creation: 'always',
      },
      {
        /**
         * Stripe-Account header
         * Creates the checkout session on the connected account
         */
        stripeAccount: league.stripe_account_id,
      }
    );

    // TODO: Log checkout session creation in database
    // await supabase.from('checkout_sessions').insert({
    //   league_id: leagueId,
    //   session_id: session.id,
    //   amount: totalAmount,
    //   application_fee: applicationFeeAmount,
    //   status: 'pending',
    // });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      applicationFee: applicationFeeAmount,
      message: 'Checkout session created successfully',
    });

  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);

    if (error instanceof Error && 'type' in error) {
      const stripeError = error as Stripe.errors.StripeError;
      return NextResponse.json(
        { error: stripeError.message || 'Stripe API error occurred' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
