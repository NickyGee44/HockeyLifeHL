/**
 * Stripe Connect Test Environment Setup Script
 *
 * Creates a test Express Connected Account for testing the league payment flow.
 * This simulates a league connecting their Stripe account to receive payments.
 *
 * Usage:
 *   npx tsx scripts/setup-stripe-connect-test.ts
 *
 * Date: February 2026
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

if (!stripeSecretKey.startsWith('sk_test_')) {
  console.error('❌ This script only works with TEST keys (sk_test_...)');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Main Setup
// ============================================================================

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        HockeyLife Stripe Connect Test Environment            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Get the test league
  const { data: testLeague, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, slug, stripe_account_id, stripe_account_status')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  if (leagueError || !testLeague) {
    console.error('❌ Test league not found. Run create-test-leagues.ts first.');
    process.exit(1);
  }

  console.log(`📋 Test League: ${testLeague.name} (${testLeague.slug})`);
  console.log(`   Current Stripe Account: ${testLeague.stripe_account_id || 'None'}`);
  console.log('');

  // Check if account already exists
  if (testLeague.stripe_account_id) {
    console.log('🔍 Checking existing Connect account...');
    try {
      const existingAccount = await stripe.accounts.retrieve(testLeague.stripe_account_id);
      console.log(`   ✓ Account exists: ${existingAccount.id}`);
      console.log(`   Status: charges_enabled=${existingAccount.charges_enabled}, payouts_enabled=${existingAccount.payouts_enabled}`);

      if (!existingAccount.charges_enabled) {
        console.log('');
        console.log('⚠️  Account is not fully onboarded. Creating account link...');
        const accountLink = await createOnboardingLink(existingAccount.id);
        console.log(`   Onboarding URL: ${accountLink}`);
      }

      await printTestInstructions(existingAccount.id, testLeague);
      return;
    } catch (error: any) {
      console.log(`   ⚠️  Account not found in Stripe (${error.message}). Creating new one...`);
    }
  }

  // Create new Express account
  console.log('🔗 Creating Stripe Connect Express account...');

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'CA', // Canada for hockey leagues!
    email: 'testleague@beerleaguehockey.ca',
    business_type: 'company',
    company: {
      name: testLeague.name,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      league_id: testLeague.id,
      platform: 'beerleaguehockey',
      test: 'true',
    },
    settings: {
      payouts: {
        schedule: {
          interval: 'daily',
        },
      },
    },
  });

  console.log(`   ✓ Created account: ${account.id}`);

  // Update database
  console.log('');
  console.log('💾 Updating database...');

  const { error: updateError } = await supabase
    .from('leagues')
    .update({
      stripe_account_id: account.id,
      stripe_account_status: 'pending',
    })
    .eq('id', testLeague.id);

  if (updateError) {
    console.error(`   ❌ Failed to update database: ${updateError.message}`);
  } else {
    console.log(`   ✓ League linked to Stripe account`);
  }

  // Create onboarding link
  console.log('');
  console.log('🔗 Creating onboarding link...');
  const onboardingUrl = await createOnboardingLink(account.id);

  await printTestInstructions(account.id, testLeague);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📝 NEXT STEP - Complete Onboarding:');
  console.log('');
  console.log(`   ${onboardingUrl}`);
  console.log('');
  console.log('   Use these test values during onboarding:');
  console.log('   • Phone: Any valid format (e.g., 555-555-5555)');
  console.log('   • Business number: 123456789');
  console.log('   • Address: Any Canadian address');
  console.log('   • Bank: Use test account 000123456789 with routing 11000-000');
  console.log('');
}

async function createOnboardingLink(accountId: string): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: 'http://localhost:3000/dashboard/settings/payments?refresh=true',
    return_url: 'http://localhost:3000/dashboard/settings/payments?success=true',
    type: 'account_onboarding',
    collect: 'eventually_due',
  });

  return accountLink.url;
}

async function printTestInstructions(accountId: string, league: any) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('🧪 TESTING PLAYER PAYMENTS:');
  console.log('');
  console.log('   The payment flow works like this:');
  console.log('   1. Player initiates payment for registration');
  console.log('   2. PaymentIntent created with:');
  console.log(`      • destination: ${accountId} (league's account)`);
  console.log('      • application_fee_amount: 2.99% platform fee');
  console.log('   3. Player pays with card');
  console.log('   4. Funds go to league, platform fee to you');
  console.log('');
  console.log('   To test manually via Stripe CLI:');
  console.log('');
  console.log('   # Create a PaymentIntent with destination charge:');
  console.log(`   stripe payment_intents create \\`);
  console.log(`     --amount=50000 \\`);
  console.log(`     --currency=cad \\`);
  console.log(`     --application-fee-amount=1495 \\`);
  console.log(`     --transfer-data[destination]=${accountId} \\`);
  console.log(`     --payment-method=pm_card_visa \\`);
  console.log(`     --confirm=true`);
  console.log('');
  console.log('   View in dashboards:');
  console.log(`   • Platform: https://dashboard.stripe.com/test/payments`);
  console.log(`   • Connected: https://dashboard.stripe.com/test/connect/accounts/${accountId}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('🔔 WEBHOOK SETUP (for local testing):');
  console.log('');
  console.log('   stripe listen --forward-to localhost:3000/api/stripe/webhooks/connect');
  console.log('');
  console.log('   Then update STRIPE_WEBHOOK_SECRET_ORGANIZATIONS in .env.local');
  console.log('   with the webhook signing secret shown by stripe listen.');
  console.log('');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
