/**
 * List Products API Route
 *
 * This endpoint retrieves all active products from a connected account.
 * Used to display products in a storefront.
 *
 * IMPORTANT: Use the Stripe-Account header to list products from the connected account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    // Get leagueId from query params
    const searchParams = request.nextUrl.searchParams;
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: leagueId' },
        { status: 400 }
      );
    }

    // Get the league's Stripe account ID
    // NOTE: This endpoint is public (for storefront) so no auth check
    const supabase = await createClient();
    const { data: league } = await supabase
      .from('leagues')
      .select('stripe_account_id, name')
      .eq('id', leagueId)
      .eq('status', 'active')
      .single();

    if (!league?.stripe_account_id) {
      return NextResponse.json(
        { error: 'League does not have a connected Stripe account' },
        { status: 400 }
      );
    }

    /**
     * List Products from Connected Account
     *
     * IMPORTANT: Use the stripeAccount option to list products from
     * the connected account, not the platform account.
     *
     * We expand the default_price to get pricing information in a single request.
     */
    const products = await getStripeClient().products.list(
      {
        // Only show active products
        active: true,

        // Limit results (adjust as needed)
        limit: 20,

        /**
         * Expand the default_price field
         * This includes full price details in the response
         * without requiring a separate API call
         */
        expand: ['data.default_price'],
      },
      {
        /**
         * Stripe-Account header
         * This tells Stripe to list products from the connected account
         */
        stripeAccount: league.stripe_account_id,
      }
    );

    // Format the response for easier consumption
    const formattedProducts = products.data.map((product) => {
      // The default_price is expanded, so we can access its properties
      const price = product.default_price as Stripe.Price | null;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        priceId: price?.id,
        priceInCents: price?.unit_amount || 0,
        currency: price?.currency || 'usd',
        formattedPrice: price?.unit_amount
          ? `$${(price.unit_amount / 100).toFixed(2)}`
          : 'Price not set',
      };
    });

    return NextResponse.json({
      success: true,
      leagueName: league.name,
      products: formattedProducts,
      count: formattedProducts.length,
    });

  } catch (error: unknown) {
    console.error('Error listing products:', error);

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
