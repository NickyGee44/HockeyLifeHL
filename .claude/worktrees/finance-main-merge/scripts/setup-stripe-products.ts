/**
 * Stripe Product & Price Setup Script
 *
 * Creates the three platform addon products and their recurring monthly prices
 * in your Stripe account. Idempotent — safe to run multiple times.
 *
 * Products created:
 *   - Platform Monthly ($299.99/mo)  → STRIPE_PRICE_PLATFORM_MONTHLY
 *   - Advanced Stats  ($14.99/mo)    → STRIPE_PRICE_ADVANCED_STATS
 *   - AI News Writer  ($14.99/mo)    → STRIPE_PRICE_AI_NEWS
 *
 * Usage:
 *   npx tsx scripts/setup-stripe-products.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('Missing STRIPE_SECRET_KEY in .env.local');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

// ============================================================================
// Product Definitions
// ============================================================================

const ADDON_PRODUCTS = [
  {
    name: 'Platform Monthly',
    description: 'Full hockey league management platform — unlimited teams, seasons, admin dashboard, scorekeeper app, real-time stats',
    metadata: { blh_addon_type: 'platform_subscription' },
    amountCents: 29999,
    envVar: 'STRIPE_PRICE_PLATFORM_MONTHLY',
  },
  {
    name: 'Advanced Stats',
    description: 'Deep analytics — full leaderboards, special teams stats, goalie analytics, player comparisons, advanced box scores',
    metadata: { blh_addon_type: 'advanced_stats' },
    amountCents: 1499,
    envVar: 'STRIPE_PRICE_ADVANCED_STATS',
  },
  {
    name: 'AI News Writer',
    description: 'AI-generated game recaps, weekly roundups, and player spotlights powered by Claude',
    metadata: { blh_addon_type: 'ai_news' },
    amountCents: 1499,
    envVar: 'STRIPE_PRICE_AI_NEWS',
  },
] as const;

// ============================================================================
// Helpers
// ============================================================================

async function findProductByMetadata(addonType: string): Promise<Stripe.Product | null> {
  const products = await stripe.products.list({ limit: 100, active: true });
  return products.data.find((p) => p.metadata.blh_addon_type === addonType) || null;
}

async function findMatchingPrice(
  productId: string,
  amountCents: number
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 10 });
  return (
    prices.data.find(
      (p) => p.unit_amount === amountCents && p.recurring?.interval === 'month'
    ) || null
  );
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('');
  console.log('  Beer League Hockey — Stripe Product Setup');
  console.log('  =========================================');
  console.log('');

  const isTestMode = stripeSecretKey!.startsWith('sk_test_');
  console.log(`  Mode: ${isTestMode ? 'TEST' : 'LIVE'}`);
  console.log('');

  const envLines: string[] = [];

  for (const config of ADDON_PRODUCTS) {
    const addonType = config.metadata.blh_addon_type;

    // Check if product already exists
    let product = await findProductByMetadata(addonType);

    if (product) {
      console.log(`  [exists] Product: ${config.name} (${product.id})`);
    } else {
      product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: config.metadata,
      });
      console.log(`  [created] Product: ${config.name} (${product.id})`);
    }

    // Check if price already exists
    let price = await findMatchingPrice(product.id, config.amountCents);

    if (price) {
      console.log(`  [exists] Price: $${(config.amountCents / 100).toFixed(2)}/mo (${price.id})`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: config.amountCents,
        currency: 'cad',
        recurring: { interval: 'month' },
        nickname: `${config.name} Monthly`,
      });
      console.log(`  [created] Price: $${(config.amountCents / 100).toFixed(2)}/mo (${price.id})`);
    }

    envLines.push(`${config.envVar}=${price.id}`);
    console.log('');
  }

  console.log('  -----------------------------------------');
  console.log('  Add these to your .env.local:');
  console.log('');
  for (const line of envLines) {
    console.log(`  ${line}`);
  }
  console.log('');
  console.log('  Done!');
  console.log('');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
