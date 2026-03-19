/**
 * Stripe Test Environment Setup Script
 *
 * Creates products, prices, and test data in your Stripe test account
 * for testing league subscriptions, registration payments, and team fees.
 *
 * Usage:
 *   npx tsx scripts/setup-stripe-test.ts
 *
 * Date: February 2026
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ Missing STRIPE_SECRET_KEY in .env.local');
  process.exit(1);
}

if (!stripeSecretKey.startsWith('sk_test_')) {
  console.error('❌ This script only works with TEST keys (sk_test_...)');
  console.error('   Current key prefix:', stripeSecretKey.substring(0, 10) + '...');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

console.log('🔑 Using Stripe account:', stripeSecretKey.substring(8, 28) + '...');

// ============================================================================
// Product Definitions
// ============================================================================

const SUBSCRIPTION_PRODUCTS = [
  {
    name: 'HockeyLife Starter',
    description: 'Perfect for small leagues up to 100 players',
    metadata: { tier: 'starter', maxPlayers: '100' },
    price: { amount: 9900, interval: 'month' as const, nickname: 'Starter Monthly' }
  },
  {
    name: 'HockeyLife Pro',
    description: 'For growing leagues up to 500 players',
    metadata: { tier: 'pro', maxPlayers: '500' },
    price: { amount: 29900, interval: 'month' as const, nickname: 'Pro Monthly' }
  },
  {
    name: 'HockeyLife Business',
    description: 'For large leagues with unlimited players',
    metadata: { tier: 'business', maxPlayers: 'unlimited' },
    price: { amount: 79900, interval: 'month' as const, nickname: 'Business Monthly' }
  },
  {
    name: 'HockeyLife Enterprise',
    description: 'Custom solutions for multi-league organizations',
    metadata: { tier: 'enterprise', maxPlayers: 'unlimited' },
    price: { amount: 100000, interval: 'month' as const, nickname: 'Enterprise Monthly' }
  },
];

const REGISTRATION_PRODUCTS = [
  {
    name: 'Player Registration - Adult',
    description: 'Standard adult player registration fee',
    metadata: { type: 'registration', ageGroup: 'adult' },
    price: { amount: 50000, nickname: 'Adult Registration $500' }
  },
  {
    name: 'Player Registration - Youth',
    description: 'Youth player registration fee',
    metadata: { type: 'registration', ageGroup: 'youth' },
    price: { amount: 35000, nickname: 'Youth Registration $350' }
  },
  {
    name: 'Team Registration Fee',
    description: 'Team entry fee for league participation',
    metadata: { type: 'team_registration' },
    price: { amount: 150000, nickname: 'Team Registration $1500' }
  },
  {
    name: 'Late Registration Surcharge',
    description: 'Additional fee for late registrations',
    metadata: { type: 'late_fee' },
    price: { amount: 5000, nickname: 'Late Fee $50' }
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

async function findExistingProduct(name: string): Promise<Stripe.Product | null> {
  const products = await stripe.products.list({ limit: 100 });
  return products.data.find(p => p.name === name) || null;
}

async function createOrUpdateProduct(
  config: typeof SUBSCRIPTION_PRODUCTS[0],
  isRecurring: boolean
): Promise<{ product: Stripe.Product; price: Stripe.Price }> {
  let product = await findExistingProduct(config.name);

  if (product) {
    console.log(`   ⚠️  Product exists: ${config.name}`);
  } else {
    product = await stripe.products.create({
      name: config.name,
      description: config.description,
      metadata: config.metadata,
    });
    console.log(`   ✓ Created product: ${config.name}`);
  }

  // Check for existing price
  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  });

  // Find matching price
  const matchingPrice = existingPrices.data.find(p =>
    p.unit_amount === config.price.amount &&
    (isRecurring ? p.recurring?.interval === config.price.interval : p.type === 'one_time')
  );

  if (matchingPrice) {
    console.log(`   ⚠️  Price exists: ${config.price.nickname}`);
    return { product, price: matchingPrice };
  }

  // Create new price
  const priceParams: Stripe.PriceCreateParams = {
    product: product.id,
    unit_amount: config.price.amount,
    currency: 'cad',
    nickname: config.price.nickname,
  };

  if (isRecurring && 'interval' in config.price) {
    priceParams.recurring = { interval: config.price.interval };
  }

  const price = await stripe.prices.create(priceParams);
  console.log(`   ✓ Created price: ${config.price.nickname} (${price.id})`);

  return { product, price };
}

// ============================================================================
// Test Customers
// ============================================================================

async function createTestCustomers(): Promise<Stripe.Customer[]> {
  console.log('\n👥 Creating test customers...\n');

  const testCustomers = [
    {
      email: 'league-admin@test.hockeylife.ca',
      name: 'Test League Admin',
      metadata: { type: 'league_admin', league: 'Alpha Hockey League' }
    },
    {
      email: 'player@test.hockeylife.ca',
      name: 'Test Player',
      metadata: { type: 'player', team: 'Alpha Wolves' }
    },
    {
      email: 'team-manager@test.hockeylife.ca',
      name: 'Test Team Manager',
      metadata: { type: 'team_manager', team: 'Alpha Wolves' }
    },
  ];

  const customers: Stripe.Customer[] = [];

  for (const config of testCustomers) {
    // Check if customer exists
    const existing = await stripe.customers.list({ email: config.email, limit: 1 });

    if (existing.data.length > 0) {
      console.log(`   ⚠️  Customer exists: ${config.email}`);
      customers.push(existing.data[0]);
      continue;
    }

    const customer = await stripe.customers.create(config);
    console.log(`   ✓ Created customer: ${config.name} (${config.email})`);
    customers.push(customer);
  }

  return customers;
}

// ============================================================================
// Test Payments
// ============================================================================

async function createTestPayments(
  customers: Stripe.Customer[],
  registrationPrices: Stripe.Price[]
): Promise<void> {
  console.log('\n💳 Creating test payment intents...\n');

  const playerCustomer = customers.find(c => c.metadata?.type === 'player');
  const teamManagerCustomer = customers.find(c => c.metadata?.type === 'team_manager');

  if (!playerCustomer || !teamManagerCustomer) {
    console.log('   ⚠️  Skipping test payments - customers not found');
    return;
  }

  const adultRegPrice = registrationPrices.find(p => p.nickname?.includes('Adult'));
  const teamRegPrice = registrationPrices.find(p => p.nickname?.includes('Team'));

  // Create a successful payment intent for player registration
  if (adultRegPrice) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: adultRegPrice.unit_amount!,
        currency: 'cad',
        customer: playerCustomer.id,
        description: 'Player Registration - Adult (Test)',
        metadata: {
          type: 'player_registration',
          league: 'Alpha Hockey League',
          season: '2025-2026',
          test: 'true',
        },
        // Auto-confirm with test card
        payment_method: 'pm_card_visa',
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });
      console.log(`   ✓ Created player registration payment: ${paymentIntent.id} ($${adultRegPrice.unit_amount! / 100})`);
    } catch (error: any) {
      console.log(`   ⚠️  Payment intent: ${error.message}`);
    }
  }

  // Create a payment intent for team registration
  if (teamRegPrice) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: teamRegPrice.unit_amount!,
        currency: 'cad',
        customer: teamManagerCustomer.id,
        description: 'Team Registration Fee (Test)',
        metadata: {
          type: 'team_registration',
          league: 'Alpha Hockey League',
          team: 'Alpha Wolves',
          season: '2025-2026',
          test: 'true',
        },
        payment_method: 'pm_card_visa',
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });
      console.log(`   ✓ Created team registration payment: ${paymentIntent.id} ($${teamRegPrice.unit_amount! / 100})`);
    } catch (error: any) {
      console.log(`   ⚠️  Payment intent: ${error.message}`);
    }
  }

  // Create a pending payment intent
  try {
    const pendingPayment = await stripe.paymentIntents.create({
      amount: 25000,
      currency: 'cad',
      customer: playerCustomer.id,
      description: 'Season Fee Installment (Pending Test)',
      metadata: {
        type: 'installment',
        installment_number: '2',
        total_installments: '4',
        test: 'true',
      },
    });
    console.log(`   ✓ Created pending payment: ${pendingPayment.id} ($250 - requires_payment_method)`);
  } catch (error: any) {
    console.log(`   ⚠️  Pending payment: ${error.message}`);
  }
}

// ============================================================================
// Stripe Connect Setup
// ============================================================================

async function setupConnectInfo(): Promise<void> {
  console.log('\n🔗 Stripe Connect Configuration...\n');

  console.log('   To test Stripe Connect (league payment setup):');
  console.log('');
  console.log('   1. Go to https://dashboard.stripe.com/test/settings/connect');
  console.log('   2. Enable Connect and configure your platform settings');
  console.log('   3. Set OAuth redirect URL to:');
  console.log('      http://localhost:3000/api/stripe/connect/callback');
  console.log('');
  console.log('   4. Add webhook endpoint at:');
  console.log('      https://dashboard.stripe.com/test/webhooks');
  console.log('      URL: http://localhost:3000/api/stripe/webhooks/connect');
  console.log('      Events: account.updated, payment_intent.succeeded, etc.');
  console.log('');
  console.log('   5. For local testing, use Stripe CLI:');
  console.log('      stripe listen --forward-to localhost:3000/api/stripe/webhooks/connect');
  console.log('');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           HockeyLife Stripe Test Environment Setup           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const subscriptionPrices: { tier: string; priceId: string }[] = [];
  const registrationPrices: Stripe.Price[] = [];

  // Create subscription products
  console.log('📦 Creating subscription products...\n');
  for (const config of SUBSCRIPTION_PRODUCTS) {
    const { price } = await createOrUpdateProduct(config, true);
    subscriptionPrices.push({
      tier: config.metadata.tier,
      priceId: price.id,
    });
  }

  // Create registration products
  console.log('\n📦 Creating registration products...\n');
  for (const config of REGISTRATION_PRODUCTS) {
    const { price } = await createOrUpdateProduct(config as any, false);
    registrationPrices.push(price);
  }

  // Create test customers
  const customers = await createTestCustomers();

  // Create test payments
  await createTestPayments(customers, registrationPrices);

  // Connect info
  await setupConnectInfo();

  // Output environment variables
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 Update your .env.local with these price IDs:');
  console.log('');
  console.log('# Platform 1 Subscription Price IDs');
  for (const { tier, priceId } of subscriptionPrices) {
    const envVar = `STRIPE_PRICE_${tier.toUpperCase()}`;
    console.log(`${envVar}=${priceId}`);
  }
  console.log('');
  console.log('# Registration Price IDs (for reference)');
  for (const price of registrationPrices) {
    console.log(`# ${price.nickname}: ${price.id}`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ Stripe test environment setup complete!');
  console.log('');
  console.log('🔗 View in Stripe Dashboard:');
  console.log('   Products: https://dashboard.stripe.com/test/products');
  console.log('   Customers: https://dashboard.stripe.com/test/customers');
  console.log('   Payments: https://dashboard.stripe.com/test/payments');
  console.log('');
  console.log('🧪 Test card numbers:');
  console.log('   Success: 4242 4242 4242 4242');
  console.log('   Decline: 4000 0000 0000 0002');
  console.log('   3DS Auth: 4000 0025 0000 3155');
  console.log('');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
