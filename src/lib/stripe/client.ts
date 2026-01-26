/**
 * Stripe Client Configuration
 *
 * This creates a single Stripe client instance used throughout the application.
 * The client is initialized with your secret key and automatically uses the latest API version.
 */

import Stripe from 'stripe';

// TODO: Ensure STRIPE_SECRET_KEY is set in your .env.local file
// Get your secret key from: https://dashboard.stripe.com/test/apikeys
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'Missing STRIPE_SECRET_KEY environment variable. ' +
    'Please add it to your .env.local file. ' +
    'Get your key from: https://dashboard.stripe.com/test/apikeys'
  );
}

/**
 * Main Stripe client instance
 * Use this for all Stripe API requests throughout the application
 */
export const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // The API version is automatically set by the SDK to the latest version
  // No need to manually specify apiVersion
  typescript: true,
});

/**
 * Publishable key for client-side Stripe.js
 * This is safe to expose in the browser
 */
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn(
    'Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. ' +
    'Client-side Stripe features will not work.'
  );
}
