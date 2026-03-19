/**
 * Connect Demo League to Stripe Connect
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const leagueId = '20000000-0000-0000-0000-000000000001';

  // Check if already connected
  const { data: league } = await supabase
    .from('leagues')
    .select('stripe_account_id, name')
    .eq('id', leagueId)
    .single();

  if (league?.stripe_account_id) {
    console.log(`League already has Stripe account: ${league.stripe_account_id}`);

    // Just create new onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: league.stripe_account_id,
      refresh_url: 'http://localhost:3000/en/dashboard/settings/payments?refresh=true',
      return_url: 'http://localhost:3000/en/dashboard/settings/payments?success=true',
      type: 'account_onboarding',
    });

    console.log('');
    console.log('Onboarding URL:', accountLink.url);
    return;
  }

  console.log('Creating Stripe Connect Express account for Metro Beer League Hockey...');

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'CA',
    email: 'demo-owner@hockeylifehl.com',
    business_type: 'company',
    company: {
      name: 'Metro Beer League Hockey',
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      league_id: leagueId,
      platform: 'hockeylifehl',
      environment: 'demo',
    },
  });

  console.log('Created account:', account.id);

  // Update database
  const { error } = await supabase
    .from('leagues')
    .update({
      stripe_account_id: account.id,
      stripe_account_status: 'pending',
    })
    .eq('id', leagueId);

  if (error) {
    console.error('DB Error:', error.message);
    return;
  }

  console.log('Database updated successfully');

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'http://localhost:3000/en/dashboard/settings/payments?refresh=true',
    return_url: 'http://localhost:3000/en/dashboard/settings/payments?success=true',
    type: 'account_onboarding',
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('DEMO LEAGUE STRIPE CONNECT SETUP COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('League: Metro Beer League Hockey (demo)');
  console.log('Owner: Demo League Owner (demo-owner@hockeylifehl.com)');
  console.log('');
  console.log('Stripe Account ID:', account.id);
  console.log('');
  console.log('Complete onboarding at:');
  console.log(accountLink.url);
  console.log('');
  console.log('View in Stripe Dashboard:');
  console.log(`https://dashboard.stripe.com/test/connect/accounts/${account.id}`);
  console.log('');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
