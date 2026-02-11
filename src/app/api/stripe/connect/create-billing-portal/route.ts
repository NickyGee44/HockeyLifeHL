/**
 * Create Billing Portal Session API Route
 *
 * This endpoint creates a Stripe Billing Portal session where connected accounts
 * can manage their subscriptions, payment methods, and billing details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
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
    const { leagueId } = await request.json();

    if (!leagueId) {
      return NextResponse.json(
        { error: 'Missing required field: leagueId' },
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
        { error: 'You must be a league owner or admin to manage billing' },
        { status: 403 }
      );
    }

    // Get the league's Stripe account ID and slug
    const { data: league } = await supabase
      .from('leagues')
      .select('stripe_account_id, slug')
      .eq('id', leagueId)
      .single();

    if (!league?.stripe_account_id) {
      return NextResponse.json(
        { error: 'League does not have a connected Stripe account' },
        { status: 400 }
      );
    }

    // Construct return URL (match dashboard route structure)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/${league.slug}/settings/subscription`;

    /**
     * Create Billing Portal Session
     *
     * IMPORTANT: Use customer_account instead of customer for V2 accounts.
     * This allows the connected account to manage their subscription to the platform.
     *
     * The billing portal allows users to:
     * - Update payment methods
     * - View invoices
     * - Cancel or reactivate subscriptions
     * - Update billing details
     */
    const session = await getStripeClient().billingPortal.sessions.create({
      /**
       * Customer Account
       * The connected account ID (V2 account)
       */
      customer_account: league.stripe_account_id,

      /**
       * Return URL
       * Where to redirect the user after they're done managing their billing
       */
      return_url: returnUrl,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      message: 'Billing portal session created successfully',
    });

  } catch (error: unknown) {
    console.error('Error creating billing portal session:', error);

    if (error instanceof Error && 'type' in error) {
      const stripeError = error as Stripe.errors.StripeError;

      // Handle case where customer_account doesn't have a subscription yet
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json(
          {
            error: 'No active subscription found. Subscribe first before accessing billing portal.',
          },
          { status: 400 }
        );
      }

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
