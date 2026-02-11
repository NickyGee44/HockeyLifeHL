/**
 * Create Subscription Checkout API Route
 *
 * This endpoint creates a checkout session to charge a subscription to a connected account.
 * With V2 accounts, we can use the connected account ID as both the customer and the account.
 *
 * Use Case: Platform charges league owners monthly/annual subscription fees
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, getPriceIdByTier, type SubscriptionTier } from '@/lib/stripe/client';
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
    const { leagueId, tier } = await request.json();

    if (!leagueId || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields: leagueId and tier' },
        { status: 400 }
      );
    }

    // Validate tier
    const validTiers: SubscriptionTier[] = ['platform_monthly', 'advanced_stats', 'ai_news_writer'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier: ${tier}. Must be one of: ${validTiers.join(', ')}` },
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
        { error: 'You must be a league owner or admin to subscribe' },
        { status: 403 }
      );
    }

    // Get the league's Stripe account ID and slug
    const { data: league } = await supabase
      .from('leagues')
      .select('id, stripe_account_id, slug')
      .eq('id', leagueId)
      .single();

    if (!league?.stripe_account_id) {
      return NextResponse.json(
        { error: 'League does not have a connected Stripe account' },
        { status: 400 }
      );
    }

    // Get the Stripe Price ID for the requested tier
    let priceId: string;
    try {
      priceId = getPriceIdByTier(tier);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid subscription tier' },
        { status: 500 }
      );
    }

    // Construct callback URLs (match dashboard route structure)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/${league.slug}/settings/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/${league.slug}/settings/subscription?checkout=cancelled`;

    /**
     * Create Subscription Checkout Session
     *
     * IMPORTANT: Use customer_account instead of customer for V2 accounts.
     * This charges the connected account for the platform subscription.
     *
     * The subscription is created on the PLATFORM account, but the connected
     * account is charged for it.
     */
    const session = await getStripeClient().checkout.sessions.create({
      /**
       * Customer Account
       * With V2 accounts, use the connected account ID as the customer_account.
       * This allows the platform to charge the connected account for subscriptions.
       */
      customer_account: league.stripe_account_id,

      // Subscription mode
      mode: 'subscription',

      // Line items (subscription price)
      line_items: [
        {
          // Subscription price ID for the selected tier
          price: priceId,
          quantity: 1,
        },
      ],

      // Success URL
      success_url: successUrl,

      // Cancel URL
      cancel_url: cancelUrl,

      // Allow promotion codes
      allow_promotion_codes: true,

      // Subscription options
      subscription_data: {
        // Metadata to track which league and tier this subscription belongs to
        metadata: {
          league_id: leagueId,
          user_id: user.id,
          tier: tier,
        },
      },
    });

    // TODO: Store subscription intent in database
    // await supabase.from('subscriptions').insert({
    //   league_id: leagueId,
    //   checkout_session_id: session.id,
    //   status: 'pending',
    // });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      message: 'Subscription checkout session created successfully',
    });

  } catch (error: unknown) {
    console.error('Error creating subscription checkout:', error);

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
