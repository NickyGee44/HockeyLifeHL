#!/usr/bin/env tsx

import Stripe from 'stripe';
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../.env.local') });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
});

type PriceExpectation = {
  envVar: string;
  amount: number;
  currency: string;
  interval: 'month';
};

const EXPECTED: PriceExpectation[] = [
  { envVar: 'STRIPE_PRICE_ENTERPRISE', amount: 29999, currency: 'cad', interval: 'month' },
  { envVar: 'STRIPE_PRICE_PLATFORM_MONTHLY', amount: 29999, currency: 'cad', interval: 'month' },
  { envVar: 'STRIPE_PRICE_ADVANCED_STATS', amount: 1499, currency: 'cad', interval: 'month' },
  { envVar: 'STRIPE_PRICE_AI_NEWS', amount: 1499, currency: 'cad', interval: 'month' },
];

async function validateOne(def: PriceExpectation): Promise<{ ok: boolean; message: string }> {
  const priceId = process.env[def.envVar];
  if (!priceId) {
    return { ok: true, message: `${def.envVar}: not set (skipped)` };
  }
  if (!priceId.startsWith('price_')) {
    return { ok: false, message: `${def.envVar}: invalid format (${priceId})` };
  }

  const price = await stripe.prices.retrieve(priceId);
  const amountOk = price.unit_amount === def.amount;
  const currencyOk = price.currency.toLowerCase() === def.currency;
  const intervalOk = price.recurring?.interval === def.interval;
  const activeOk = price.active === true;

  const ok = amountOk && currencyOk && intervalOk && activeOk;
  const details = `amount=${price.unit_amount} currency=${price.currency} interval=${price.recurring?.interval} active=${price.active}`;
  return {
    ok,
    message: `${def.envVar}: ${ok ? 'OK' : 'MISMATCH'} (${details})`,
  };
}

async function main() {
  console.log('\nStripe Pricing Validation');
  console.log('=========================\n');

  const testMode = STRIPE_SECRET_KEY.startsWith('sk_test_');
  console.log(`Stripe mode: ${testMode ? 'test' : 'live'}\n`);

  let failed = 0;
  for (const exp of EXPECTED) {
    try {
      const result = await validateOne(exp);
      if (result.ok) {
        console.log(`✅ ${result.message}`);
      } else {
        failed++;
        console.log(`❌ ${result.message}`);
      }
    } catch (err) {
      failed++;
      console.log(`❌ ${exp.envVar}: exception ${(err as Error).message}`);
    }
  }

  if (failed > 0) {
    console.log(`\nResult: FAIL (${failed} mismatches)`);
    process.exit(1);
  }
  console.log('\nResult: PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
