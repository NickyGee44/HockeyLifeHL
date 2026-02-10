/**
 * API Route: Create Stripe Billing Portal Session
 *
 * Creates a Stripe Billing Portal session so organization owners
 * can manage payment methods, view invoices, and cancel subscriptions.
 *
 * Security:
 * - Verifies user authentication
 * - Validates organization ownership
 * - Uses server-side Stripe SDK
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';

interface BillingPortalRequest {
  returnUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BillingPortalRequest;
    const { returnUrl } = body;

    if (!returnUrl) {
      return NextResponse.json(
        { error: 'Missing required field: returnUrl' },
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
      .select('id, owner_user_id, stripe_customer_id')
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

    if (!org.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to an add-on first.' },
        { status: 400 }
      );
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Billing Portal] Error creating session:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create billing portal session';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
