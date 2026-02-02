// @ts-nocheck
/**
 * Stripe Server Client
 *
 * Server-side Stripe client for organization subscription management.
 * Uses Stripe API v20.1.2 with proper error handling and security.
 */

import Stripe from 'stripe';

// Validate Stripe secret key exists
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error(
    'Missing STRIPE_SECRET_KEY environment variable. ' +
    'Please add it to your .env.local file.'
  );
}

// Initialize Stripe client with API version and app info
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia', // Latest API version
  typescript: true,
  appInfo: {
    name: 'HockeyLifeHL',
    version: '1.0.0',
    url: 'https://hockeylifehl.com',
  },
});

// ============================================================================
// Stripe Price IDs from Environment
// ============================================================================

export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
} as const;

// Validate price IDs are configured (warn if missing, don't crash)
if (process.env.NODE_ENV !== 'test') {
  const missingPrices = Object.entries(STRIPE_PRICE_IDS)
    .filter(([_, id]) => !id)
    .map(([tier]) => tier);

  if (missingPrices.length > 0) {
    console.warn(
      `[Stripe] Missing price IDs for tiers: ${missingPrices.join(', ')}. ` +
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

export function getPriceIdByTier(
  tier: 'starter' | 'pro' | 'business' | 'enterprise'
): string {
  const priceId = STRIPE_PRICE_IDS[tier];

  if (!priceId) {
    throw new Error(
      `Stripe price ID not configured for tier: ${tier}. ` +
      `Please set STRIPE_PRICE_${tier.toUpperCase()} in your environment.`
    );
  }

  return priceId;
}

// ============================================================================
// Helper: Get Tier by Price ID
// ============================================================================

export function getTierByPriceId(
  priceId: string
): 'starter' | 'pro' | 'business' | 'enterprise' | null {
  const entry = Object.entries(STRIPE_PRICE_IDS).find(
    ([_, id]) => id === priceId
  );

  return entry ? (entry[0] as 'starter' | 'pro' | 'business' | 'enterprise') : null;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

export function isStripeError(error: unknown): error is Stripe.StripeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as any).type === 'string'
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
