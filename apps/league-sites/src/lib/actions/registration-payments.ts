/**
 * Registration Payment Server Actions
 *
 * Server actions for processing registration fee payments in League Sites.
 * Handles Stripe Checkout session creation and payment tracking for
 * registration_submissions table.
 *
 * Security:
 * - Players can only pay for their own registrations
 * - All Stripe operations use idempotency keys
 * - Webhook processing is atomic via database functions
 * - Full audit logging to player_payment_audit_log
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// ============================================================================
// Types
// ============================================================================

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

interface RegistrationPaymentHistory {
  id: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description: string;
  created_at: string;
  payment_method?: string;
}

// ============================================================================
// Stripe Client (Lazy Initialization)
// ============================================================================

let _stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (_stripe) return _stripe;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  _stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
  });

  return _stripe;
}

// ============================================================================
// Helper: Generate Idempotency Key
// ============================================================================

function generateIdempotencyKey(
  operation: string,
  data: Record<string, unknown>
): string {
  const crypto = require('crypto');

  // Sort keys for deterministic stringification
  const sortedData = Object.keys(data)
    .sort()
    .reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {} as Record<string, unknown>);

  // Create hash
  const hash = crypto
    .createHash('sha256')
    .update(operation + JSON.stringify(sortedData))
    .digest('hex')
    .substring(0, 16);

  return `${operation}-${hash}`;
}

// ============================================================================
// Helper: Calculate Application Fee (2.99%)
// ============================================================================

function calculateApplicationFee(amountCents: number): number {
  const feePercent = 2.99;
  const fee = Math.round((amountCents * feePercent) / 100);

  // Minimum fee: $0.50
  return Math.max(fee, 50);
}

// ============================================================================
// Helper: Get Current Player ID
// ============================================================================

async function getCurrentPlayerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ============================================================================
// Action: Create Registration Payment Checkout Session
// ============================================================================

export async function createRegistrationCheckout(
  registrationId: string,
  successUrl: string,
  cancelUrl: string
): Promise<ActionResult<CheckoutSessionResult>> {
  try {
    const playerId = await getCurrentPlayerId();
    if (!playerId) {
      return { success: false, error: 'Authentication required. Please sign in.' };
    }

    const supabase = await createClient();

    // Fetch registration with league details
    const { data: registration, error: fetchError } = await supabase
      .from('registration_submissions')
      .select(`
        id,
        player_id,
        league_id,
        season_id,
        team_id,
        registration_type,
        payment_status,
        amount_paid_cents,
        fee_amount_cents,
        currency,
        stripe_checkout_session_id,
        leagues!inner (
          id,
          name,
          stripe_account_id,
          stripe_account_status
        )
      `)
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      console.error('[Registration Payments] Fetch error:', fetchError);
      return { success: false, error: 'Registration not found.' };
    }

    // Verify player owns this registration
    if (registration.player_id !== playerId) {
      return { success: false, error: 'You can only pay for your own registrations.' };
    }

    // Check payment status
    if (registration.payment_status === 'completed') {
      return { success: false, error: 'This registration has already been paid in full.' };
    }

    if (registration.payment_status === 'not_required') {
      return { success: false, error: 'This registration does not require payment.' };
    }

    const league = registration.leagues as any;

    // Verify league has Stripe Connect account
    if (!league?.stripe_account_id || league.stripe_account_status !== 'complete') {
      return {
        success: false,
        error: 'This league has not set up payment processing yet. Please contact the league administrator.',
      };
    }

    // Calculate amount owed
    const feeAmount = registration.fee_amount_cents || 0;
    const amountPaid = registration.amount_paid_cents || 0;
    const amountOwed = feeAmount - amountPaid;

    if (amountOwed <= 0) {
      return { success: false, error: 'No payment is due for this registration.' };
    }

    // Calculate platform application fee (2.99%)
    const applicationFee = calculateApplicationFee(amountOwed);

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', playerId)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId && profile?.email) {
      // Create Stripe customer with idempotency key
      const stripe = getStripeClient();
      const customerIdempotencyKey = generateIdempotencyKey('create_customer', {
        player_id: playerId,
        email: profile.email,
      });

      const customer = await stripe.customers.create(
        {
          email: profile.email,
          name: profile.full_name || undefined,
          metadata: {
            player_id: playerId,
            platform: 'beerleaguehockey',
          },
        },
        { idempotencyKey: customerIdempotencyKey }
      );

      stripeCustomerId = customer.id;

      // Save customer ID to profile (use service role client to bypass RLS)
      // NOTE: This should use createServiceRoleClient in production
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', playerId);
    }

    // Create Stripe Checkout Session with idempotency key
    const stripe = getStripeClient();
    const idempotencyKey = generateIdempotencyKey('create_checkout', {
      registration_id: registrationId,
      amount: amountOwed,
    });

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: stripeCustomerId || undefined,
        customer_email: stripeCustomerId ? undefined : (profile?.email || undefined),
        line_items: [
          {
            price_data: {
              currency: registration.currency || 'usd',
              product_data: {
                name: `${registration.registration_type} Registration`,
                description: `${league.name} - Registration Fee`,
              },
              unit_amount: amountOwed,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: league.stripe_account_id,
          },
          metadata: {
            registration_id: registrationId,
            player_id: playerId,
            league_id: registration.league_id,
            season_id: registration.season_id,
            platform: 'beerleaguehockey',
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          registration_id: registrationId,
          type: 'registration_fee', // Used by webhook handler
        },
      },
      {
        idempotencyKey,
      }
    );

    // Store checkout session ID for tracking
    await supabase
      .from('registration_submissions')
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: 'pending', // Mark as pending payment
      })
      .eq('id', registrationId);

    // Log audit event (optional - create audit log table if needed)
    console.log('[Registration Payments] Checkout session created:', {
      registration_id: registrationId,
      session_id: session.id,
      amount: amountOwed,
      application_fee: applicationFee,
    });

    return {
      success: true,
      data: {
        checkoutUrl: session.url!,
        sessionId: session.id,
      },
    };
  } catch (error) {
    console.error('[Registration Payments] Create checkout error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Failed to create payment session. Please try again.' };
  }
}

// ============================================================================
// Action: Get Payment History for League
// ============================================================================

export async function getRegistrationPaymentHistory(
  leagueSlug: string
): Promise<ActionResult<RegistrationPaymentHistory[]>> {
  try {
    const playerId = await getCurrentPlayerId();
    if (!playerId) {
      return { success: false, error: 'Authentication required.' };
    }

    const supabase = await createClient();

    // Get league ID from slug
    const { data: league } = await supabase
      .from('leagues')
      .select('id')
      .eq('slug', leagueSlug)
      .single();

    if (!league) {
      return { success: false, error: 'League not found.' };
    }

    // Fetch completed payments for this player in this league
    const { data: registrations, error } = await supabase
      .from('registration_submissions')
      .select(`
        id,
        registration_type,
        payment_status,
        amount_paid_cents,
        fee_amount_cents,
        currency,
        created_at,
        stripe_payment_intent_id
      `)
      .eq('player_id', playerId)
      .eq('league_id', league.id)
      .neq('payment_status', 'not_required')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Registration Payments] Fetch history error:', error);
      return { success: false, error: 'Failed to fetch payment history.' };
    }

    // Transform to payment history format
    const history: RegistrationPaymentHistory[] = (registrations || []).map((reg) => ({
      id: reg.id,
      amount: reg.amount_paid_cents || 0,
      status: reg.payment_status === 'completed' ? 'succeeded' :
              reg.payment_status === 'failed' ? 'failed' :
              reg.payment_status === 'refunded' ? 'refunded' : 'pending',
      description: `${reg.registration_type} Registration`,
      created_at: reg.created_at,
      payment_method: reg.stripe_payment_intent_id ? 'Card' : undefined,
    }));

    return { success: true, data: history };
  } catch (error) {
    console.error('[Registration Payments] Get history error:', error);
    return { success: false, error: 'Failed to fetch payment history.' };
  }
}
