/**
 * Create Connected Account API Route
 *
 * This endpoint creates a new Stripe Connect account for a league using the V2 API.
 * The V2 API uses a unified account model where the same ID can be used for both
 * the customer and the connected account.
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
    const { leagueId, displayName, contactEmail } = await request.json();

    if (!leagueId || !displayName || !contactEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: leagueId, displayName, contactEmail' },
        { status: 400 }
      );
    }

    // Verify user has permission to create account for this league
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You must be a league owner or admin to connect Stripe' },
        { status: 403 }
      );
    }

    // Check if league already has a connected account
    const { data: league } = await supabase
      .from('leagues')
      .select('stripe_account_id')
      .eq('id', leagueId)
      .single();

    if (league?.stripe_account_id) {
      return NextResponse.json(
        { error: 'League already has a connected Stripe account', accountId: league.stripe_account_id },
        { status: 400 }
      );
    }

    /**
     * Create Connected Account using V2 API
     *
     * IMPORTANT: Use the V2 API with these exact properties.
     * Do NOT use top-level type: 'express' or type: 'standard' or type: 'custom'
     *
     * The V2 API creates a unified account that can be used for both:
     * - Merchant capabilities (accepting payments)
     * - Customer capabilities (being charged for subscriptions)
     */
    const account = await getStripeClient().v2.core.accounts.create({
      // Display name shown to customers during checkout
      display_name: displayName,

      // Contact email for the account
      contact_email: contactEmail,

      // Identity configuration
      identity: {
        country: 'us', // TODO: Make this dynamic based on league location
      },

      // Enable full Stripe Dashboard access for the connected account
      dashboard: 'full',

      // Set default responsibilities for fees and losses
      defaults: {
        responsibilities: {
          // Stripe collects fees (not the connected account)
          fees_collector: 'stripe',
          // Stripe handles losses/chargebacks (protects the connected account)
          losses_collector: 'stripe',
        },
      },

      // Configure capabilities for the account
      configuration: {
        // Customer configuration - allows this account to be charged (subscriptions)
        customer: {},

        // Merchant configuration - allows this account to accept payments
        merchant: {
          capabilities: {
            // Request card payment processing capability
            card_payments: {
              requested: true,
            },
          },
        },
      },
    });

    // Store the account ID in the database
    const { error: updateError } = await supabase
      .from('leagues')
      .update({
        stripe_account_id: account.id,
        stripe_account_status: 'incomplete', // Will be updated via webhooks
        payment_mode: 'stripe_connect',
      })
      .eq('id', leagueId);

    if (updateError) {
      console.error('Failed to save Stripe account ID:', updateError);
      return NextResponse.json(
        { error: 'Failed to save account information' },
        { status: 500 }
      );
    }

    // TODO: Log this action in audit_logs table
    // await logAuditEvent({
    //   action: 'stripe_account_created',
    //   resourceType: 'league',
    //   resourceId: leagueId,
    //   details: { stripe_account_id: account.id },
    // });

    return NextResponse.json({
      success: true,
      accountId: account.id,
      message: 'Stripe Connect account created successfully',
    });

  } catch (error: unknown) {
    console.error('Error creating Stripe Connect account:', error);

    // Handle Stripe-specific errors
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
