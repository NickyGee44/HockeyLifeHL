/**
 * Get Account Status API Route
 *
 * This endpoint retrieves the current status of a connected account directly from Stripe.
 * Use this to check if onboarding is complete and if the account can accept payments.
 *
 * IMPORTANT: Always get account status from the API directly (not from database)
 * to ensure you have the most up-to-date information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripeClient } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
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

    // Get leagueId from query params
    const searchParams = request.nextUrl.searchParams;
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: leagueId' },
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

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a league member to view account status' },
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
      return NextResponse.json({
        hasAccount: false,
        message: 'No Stripe account connected',
      });
    }

    /**
     * Retrieve account status from Stripe V2 API
     *
     * We include specific fields to get detailed status information:
     * - configuration.merchant: Merchant capabilities (payment acceptance)
     * - requirements: Outstanding requirements and verification status
     */
    const account = await stripeClient.v2.core.accounts.retrieve(
      league.stripe_account_id,
      {
        include: ['configuration.merchant', 'requirements'],
      }
    );

    /**
     * Check if the account can process payments
     * The card_payments capability status must be 'active'
     */
    const readyToProcessPayments =
      account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active';

    /**
     * Check if onboarding is complete
     * Requirements status should not be 'currently_due' or 'past_due'
     */
    const requirementsStatus =
      account.requirements?.summary?.minimum_deadline?.status;

    const onboardingComplete =
      requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

    /**
     * Get list of currently due requirements (if any)
     * These are fields the account holder needs to provide
     */
    const currentlyDue = (account.requirements as any)?.currently_due || [];

    // Update the league's status in the database
    // Note: This is for caching purposes only. Always use API for authoritative status.
    if (readyToProcessPayments && onboardingComplete) {
      await supabase
        .from('leagues')
        .update({ stripe_account_status: 'active' })
        .eq('id', leagueId);
    } else if (currentlyDue.length > 0) {
      await supabase
        .from('leagues')
        .update({ stripe_account_status: 'pending' })
        .eq('id', leagueId);
    }

    return NextResponse.json({
      hasAccount: true,
      accountId: league.stripe_account_id,
      readyToProcessPayments,
      onboardingComplete,
      requirementsStatus,
      currentlyDue,
      capabilities: {
        cardPayments: account?.configuration?.merchant?.capabilities?.card_payments?.status,
      },
      message: readyToProcessPayments
        ? 'Account is ready to accept payments'
        : onboardingComplete
        ? 'Onboarding complete but payment processing not yet active'
        : 'Onboarding incomplete - additional information required',
    });

  } catch (error: unknown) {
    console.error('Error fetching account status:', error);

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
