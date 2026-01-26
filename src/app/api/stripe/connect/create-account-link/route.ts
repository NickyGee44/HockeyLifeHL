/**
 * Create Account Link API Route
 *
 * This endpoint creates an account link for onboarding a connected account.
 * Account links are temporary URLs that allow connected accounts to complete
 * their onboarding process (providing business details, bank info, etc.)
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
        { error: 'You must be a league owner or admin to manage Stripe settings' },
        { status: 403 }
      );
    }

    // Get the league's Stripe account ID
    const { data: league } = await supabase
      .from('leagues')
      .select('stripe_account_id, slug')
      .eq('id', leagueId)
      .single();

    if (!league?.stripe_account_id) {
      return NextResponse.json(
        { error: 'League does not have a connected Stripe account. Create one first.' },
        { status: 400 }
      );
    }

    // Construct return and refresh URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/dashboard/leagues/${league.slug}/settings/payments?onboarding=complete`;
    const refreshUrl = `${baseUrl}/dashboard/leagues/${league.slug}/settings/payments?onboarding=refresh`;

    /**
     * Create Account Link using V2 API
     *
     * This creates a one-time use URL that allows the connected account to complete
     * or update their onboarding information. The link expires after a short period.
     */
    const accountLink = await getStripeClient().v2.core.accountLinks.create({
      // The connected account ID to create the link for
      account: league.stripe_account_id,

      // Use case configuration
      use_case: {
        // Type of account link - account onboarding
        type: 'account_onboarding',

        // Onboarding-specific configuration
        account_onboarding: {
          /**
           * Configurations to onboard
           * - 'merchant': Set up payment acceptance
           * - 'customer': Set up to be charged (for subscriptions)
           */
          configurations: ['merchant', 'customer'],

          /**
           * Refresh URL: Where to redirect if the link expires or user needs to restart
           * The user will be redirected here if they need to re-enter the flow
           */
          refresh_url: refreshUrl,

          /**
           * Return URL: Where to redirect after successful onboarding
           * Include the account ID so we can verify completion
           */
          return_url: returnUrl,
        },
      },
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      message: 'Account link created successfully',
    });

  } catch (error: unknown) {
    console.error('Error creating account link:', error);

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
