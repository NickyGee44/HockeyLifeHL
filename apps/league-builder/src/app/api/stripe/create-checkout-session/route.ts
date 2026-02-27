/**
 * API Route: Create Stripe Checkout Session
 *
 * Creates a Stripe Checkout session for organization subscription upgrades.
 * Handles tier selection and redirects to Stripe Checkout.
 *
 * Security:
 * - Verifies user authentication
 * - Validates organization ownership
 * - Uses server-side Stripe SDK
 * - Includes success/cancel URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, getPriceIdByTier } from '@/lib/stripe/client';
import { generateIdempotencyKey } from '@/lib/stripe/idempotency';
import type { SubscriptionTier } from '@/lib/types/subscription';
import { capturePaymentError } from '@/lib/sentry/payments';
import { isAllowedRedirectUrl } from '@/lib/stripe/validate-redirect-url';

interface CheckoutSessionRequest {
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as CheckoutSessionRequest;
    const { tier, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!tier || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: tier, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    // Validate redirect URLs to prevent open-redirect attacks
    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return NextResponse.json(
        { error: 'Invalid redirect URL' },
        { status: 400 }
      );
    }

    // Only enterprise tier is supported
    if (tier !== 'enterprise') {
      return NextResponse.json(
        { error: 'Only enterprise tier subscriptions are currently supported' },
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

    // Get user's organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_user_id', user.id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (org.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get price ID for tier
    const priceId = getPriceIdByTier(tier);

    // Create or retrieve Stripe customer
    let customerId = org.stripe_customer_id;

    if (!customerId) {
      // Create new customer
      const customerIdempotencyKey = generateIdempotencyKey('create_customer', {
        organization_id: org.id,
        owner_user_id: org.owner_user_id,
      });

      const customer = await stripe.customers.create(
        {
          name: org.name,
          email: user.email,
          metadata: {
            organization_id: org.id,
            owner_user_id: org.owner_user_id,
          },
        },
        {
          idempotencyKey: customerIdempotencyKey,
        }
      );

      customerId = customer.id;

      // Update organization with customer ID
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id);
    }

    // Create Checkout Session
    const sessionIdempotencyKey = generateIdempotencyKey('create_checkout_session', {
      customer_id: customerId,
      price_id: priceId,
      organization_id: org.id,
    });

    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        subscription_data: {
          metadata: {
            organization_id: org.id,
            entity_type: 'organization',
          },
          trial_period_days: 14, // Optional trial
        },
        metadata: {
          organization_id: org.id,
          tier,
        },
      },
      {
        idempotencyKey: sessionIdempotencyKey,
      }
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[Stripe Checkout] Error creating session:', error);
    capturePaymentError(error, {
      action: 'create_checkout_session',
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create checkout session';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
