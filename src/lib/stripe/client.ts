/**
 * Stripe Client Configuration
 *
 * This creates a single Stripe client instance used throughout the application.
 * The client is initialized with your secret key and automatically uses the latest API version.
 */

import Stripe from 'stripe';

let _stripeClient: Stripe | null = null;

/**
 * Get Stripe client instance (lazy initialization)
 * Only initializes when actually used, not at import time
 */
export function getStripeClient(): Stripe {
  if (_stripeClient) {
    return _stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'Missing STRIPE_SECRET_KEY environment variable. ' +
      'Please add it to your .env.local file. ' +
      'Get your key from: https://dashboard.stripe.com/test/apikeys'
    );
  }

  _stripeClient = new Stripe(secretKey, {
    typescript: true,
  });

  return _stripeClient;
}

/**
 * Publishable key for client-side Stripe.js
 * This is safe to expose in the browser
 */
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_PUBLISHABLE_KEY && typeof window !== 'undefined') {
  console.warn(
    'Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. ' +
    'Client-side Stripe features will not work.'
  );
}

// ============================================================================
// Subscription Tiers & Pricing
// ============================================================================

/**
 * Canonical subscription tiers for leagues
 * Maps to leagues.subscription_tier in database
 *
 * Current model:
 * - free: Platform is FREE forever with 2.99% transaction fee on payments
 * - platform_monthly: $299.99/mo - Priority support, custom branding, advanced tools
 * - advanced_stats: $14.99/mo add-on - Deep analytics, player comparisons
 * - ai_news_writer: $14.99/mo add-on - Auto-generated game recaps, roundups
 */
export type SubscriptionTier = 'free' | 'platform_monthly' | 'advanced_stats' | 'ai_news_writer';

/**
 * Canonical subscription status values
 * Maps to leagues.subscription_status in database
 *
 * - active: Subscription is current and paid
 * - trialing: In trial period, no payment required yet
 * - past_due: Payment failed, awaiting retry
 * - canceled: Subscription has been canceled (ends at period_end)
 * - incomplete: Subscription created but initial payment pending
 * - incomplete_expired: Initial payment never completed
 * - unpaid: Multiple payment failures, access restricted
 * - paused: Temporarily paused (future Stripe feature)
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

/**
 * Stripe Price IDs from environment variables
 * Set these in your .env.local file from Stripe Dashboard → Products
 */
export const STRIPE_PRICE_IDS: Record<SubscriptionTier, string | undefined> = {
  free: undefined, // Free tier has no Stripe price
  platform_monthly: process.env.STRIPE_PRICE_PLATFORM_MONTHLY,
  advanced_stats: process.env.STRIPE_PRICE_ADVANCED_STATS,
  ai_news_writer: process.env.STRIPE_PRICE_AI_NEWS_WRITER,
} as const;

/**
 * Validate that all required Stripe environment variables are set
 * Call this on app startup or before processing subscriptions
 */
export function validateStripeEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!process.env.STRIPE_SECRET_KEY) {
    missing.push('STRIPE_SECRET_KEY');
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    missing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }

  // Check for price IDs (except free tier)
  const paidTiers: Array<Exclude<SubscriptionTier, 'free'>> = [
    'platform_monthly',
    'advanced_stats',
    'ai_news_writer',
  ];

  for (const tier of paidTiers) {
    const envVarName = `STRIPE_PRICE_${tier.toUpperCase()}`;
    if (!STRIPE_PRICE_IDS[tier]) {
      missing.push(envVarName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get Stripe Price ID for a subscription tier
 * @throws Error if tier is not configured in environment
 */
export function getPriceIdByTier(tier: Exclude<SubscriptionTier, 'free'>): string {
  const priceId = STRIPE_PRICE_IDS[tier];

  if (!priceId) {
    const envVarName = `STRIPE_PRICE_${tier.toUpperCase()}`;
    throw new Error(
      `Stripe price ID not configured for tier: ${tier}. ` +
      `Please set ${envVarName} in your environment variables.`
    );
  }

  return priceId;
}

/**
 * Get subscription tier from Stripe Price ID
 * @returns The tier name, or null if price ID is not recognized
 */
export function getTierByPriceId(priceId: string): SubscriptionTier | null {
  const entry = Object.entries(STRIPE_PRICE_IDS).find(
    ([, id]) => id === priceId
  );

  return entry ? (entry[0] as SubscriptionTier) : null;
}

/**
 * Check if a subscription status grants active access
 * Used to determine if league features should be available
 */
export function isSubscriptionActive(status: SubscriptionStatus | string | null): boolean {
  if (!status) return false;
  return status === 'active' || status === 'trialing';
}

/**
 * Check if a subscription status requires payment attention
 * Used to show billing alerts/warnings
 */
export function requiresPaymentAttention(status: SubscriptionStatus | string | null): boolean {
  if (!status) return false;
  return status === 'past_due' || status === 'incomplete' || status === 'unpaid';
}

// ============================================================================
// Webhook Secrets
// ============================================================================

/**
 * Webhook secret for subscription lifecycle events
 * Get this from Stripe Dashboard → Developers → Webhooks
 */
export const STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS =
  process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS;

/**
 * Webhook secret for V2 account events (thin events)
 * Get this from Stripe Dashboard → Developers → Webhooks
 */
export const STRIPE_WEBHOOK_SECRET_V2 =
  process.env.STRIPE_WEBHOOK_SECRET_V2;

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
