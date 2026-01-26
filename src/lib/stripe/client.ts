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
