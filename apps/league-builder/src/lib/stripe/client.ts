/**
 * Stripe Server Client
 *
 * Server-side Stripe client for organization subscription management.
 * Uses Stripe API v20.1.2 with proper error handling and security.
 */

import Stripe from 'stripe';

// Lazy-initialized Stripe client (build-safe)
let _stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (_stripe) return _stripe;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error(
      'Missing STRIPE_SECRET_KEY environment variable. ' +
      'Please add it to your .env.local file.'
    );
  }

  _stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover', // Latest API version
    typescript: true,
    appInfo: {
      name: 'Beer League Hockey',
      version: '1.0.0',
      url: 'https://beerleaguehockey.ca',
    },
  });

  return _stripe;
}

// Export a proxy that lazily initializes the client
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripeClient()[prop as keyof Stripe];
  },
});

// ============================================================================
// Stripe Price IDs from Environment
// ============================================================================

// Enterprise-only licensing model
export const STRIPE_PRICE_IDS = {
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
} as const;

// Validate price IDs are configured (warn if missing, don't crash)
if (process.env.NODE_ENV !== 'test') {
  if (!STRIPE_PRICE_IDS.enterprise) {
    console.warn(
      `[Stripe] Missing STRIPE_PRICE_ENTERPRISE. ` +
      `Subscription features will be limited.`
    );
  }
}

// ============================================================================
// Webhook Secret
// ============================================================================

export const STRIPE_WEBHOOK_SECRET_ORGANIZATIONS =
  process.env.STRIPE_WEBHOOK_SECRET_ORGANIZATIONS;

if (!STRIPE_WEBHOOK_SECRET_ORGANIZATIONS && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[Stripe] Missing STRIPE_WEBHOOK_SECRET_ORGANIZATIONS. ' +
    'Webhook signature verification will fail.'
  );
}

// ============================================================================
// Helper: Get Price ID by Tier
// ============================================================================

// Enterprise-only licensing model
export function getPriceIdByTier(
  tier: 'enterprise'
): string {
  const priceId = STRIPE_PRICE_IDS[tier];

  if (!priceId) {
    throw new Error(
      `Stripe price ID not configured for tier: ${tier}. ` +
      `Please set STRIPE_PRICE_ENTERPRISE in your environment.`
    );
  }

  return priceId;
}

// ============================================================================
// Helper: Get Tier by Price ID
// ============================================================================

// Enterprise-only licensing model
export function getTierByPriceId(
  priceId: string
): 'enterprise' | null {
  const entry = Object.entries(STRIPE_PRICE_IDS).find(
    ([, id]) => id === priceId
  );

  return entry ? (entry[0] as 'enterprise') : null;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

export function isStripeError(error: unknown): error is Stripe.errors.StripeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as Record<string, unknown>).type === 'string'
  );
}

export function getStripeErrorMessage(error: unknown): string {
  if (isStripeError(error)) {
    return error.message || 'An error occurred with Stripe.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred.';
}
