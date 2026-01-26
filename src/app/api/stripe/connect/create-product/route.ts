/**
 * Create Product API Route
 *
 * This endpoint creates a Stripe product on a connected account.
 * Products represent items that can be sold (e.g., league registration, merchandise, etc.)
 *
 * IMPORTANT: Use the Stripe-Account header to create products on the connected account,
 * not on the platform account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripeClient } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Parse request body
    const { leagueId, name, description, priceInCents, currency = 'usd' } = await request.json();

    if (!leagueId || !name || !priceInCents) {
      return NextResponse.json(
        { error: 'Missing required fields: leagueId, name, priceInCents' },
        { status: 400 }
      );
    }

    // Validate price
    if (typeof priceInCents !== 'number' || priceInCents < 50) {
      return NextResponse.json(
        { error: 'Price must be a number and at least 50 cents' },
        { status: 400 }
      );
    }

    // Verify user has permission
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You must be a league owner or admin to create products' },
        { status: 403 }
      );
    }

    // Get the league's Stripe account ID
    const { data: league } = await supabase
      .from('leagues')
      .select('stripe_account_id')
      .eq('id', leagueId)
      .single();

    if (!league?.stripe_account_id) {
      return NextResponse.json(
        { error: 'League does not have a connected Stripe account' },
        { status: 400 }
      );
    }

    /**
     * Create Product on Connected Account
     *
     * IMPORTANT: Use the stripeAccount option to specify which connected account
     * to create the product on. This sets the Stripe-Account header.
     *
     * The product and price will be created on the connected account,
     * not on the platform account.
     */
    const product = await stripeClient.products.create(
      {
        // Product name (e.g., "Season Registration", "Team Jersey")
        name,

        // Product description (optional)
        description,

        // Create a default price along with the product
        default_price_data: {
          // Price in smallest currency unit (cents for USD)
          unit_amount: priceInCents,

          // Currency (ISO 4217 code)
          currency,
        },

        // Make the product active immediately
        active: true,
      },
      {
        /**
         * Stripe-Account header
         * This tells Stripe to create the product on the connected account
         * instead of the platform account
         */
        stripeAccount: league.stripe_account_id,
      }
    );

    // TODO: Store product information in database if needed
    // await supabase.from('league_products').insert({
    //   league_id: leagueId,
    //   stripe_product_id: product.id,
    //   stripe_price_id: product.default_price,
    //   name,
    //   description,
    //   price_in_cents: priceInCents,
    //   currency,
    // });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        priceId: product.default_price,
        priceInCents,
        currency,
      },
      message: 'Product created successfully',
    });

  } catch (error: unknown) {
    console.error('Error creating product:', error);

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
