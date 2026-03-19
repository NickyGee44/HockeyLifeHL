#!/usr/bin/env tsx
/**
 * Stripe Environment Validation Script
 *
 * Validates all required Stripe environment variables are configured correctly.
 * Run this before deploying to production.
 *
 * Usage:
 *   npx tsx scripts/validate-stripe-env.ts
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local from root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
config({ path: path.join(rootDir, '.env.local') });

interface ValidationCheck {
  name: string;
  test: () => boolean | Promise<boolean>;
  critical: boolean;
  errorMessage?: string;
}

async function validateStripeEnv() {
  console.log('🔍 Validating Stripe Environment Configuration...\n');

  const checks: ValidationCheck[] = [
    {
      name: 'STRIPE_SECRET_KEY',
      test: () => {
        const key = process.env.STRIPE_SECRET_KEY;
        return !!key && (key.startsWith('sk_test_') || key.startsWith('sk_live_'));
      },
      critical: true,
      errorMessage: 'Must be set and start with sk_test_ or sk_live_',
    },
    {
      name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      test: () => {
        const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        return !!key && (key.startsWith('pk_test_') || key.startsWith('pk_live_'));
      },
      critical: true,
      errorMessage: 'Must be set and start with pk_test_ or pk_live_',
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET_ORGANIZATIONS',
      test: () => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET_ORGANIZATIONS;
        return !!secret && secret.startsWith('whsec_');
      },
      critical: true,
      errorMessage: 'Must be set and start with whsec_',
    },
    {
      name: 'STRIPE_PRICE_ENTERPRISE',
      test: () => {
        const priceId = process.env.STRIPE_PRICE_ENTERPRISE;
        return !!priceId && priceId.startsWith('price_');
      },
      critical: true,
      errorMessage: 'Must be set and start with price_',
    },
    {
      name: 'Environment Consistency (test vs live)',
      test: () => {
        const secretKey = process.env.STRIPE_SECRET_KEY || '';
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

        const isTestMode =
          secretKey.startsWith('sk_test_') && publishableKey.startsWith('pk_test_');
        const isLiveMode =
          secretKey.startsWith('sk_live_') && publishableKey.startsWith('pk_live_');

        return isTestMode || isLiveMode;
      },
      critical: true,
      errorMessage: 'Secret and publishable keys must both be test or both be live',
    },
    {
      name: 'Stripe API Connection',
      test: async () => {
        try {
          // Lazy load Stripe to avoid import errors if env vars not set
          const { stripe } = await import(
            '../apps/league-builder/src/lib/stripe/client.js'
          );

          // Test API connection by listing customers (limit 1)
          await stripe.customers.list({ limit: 1 });
          return true;
        } catch (error) {
          console.error(
            `  ⚠️  API Connection Error: ${error instanceof Error ? error.message : String(error)}`
          );
          return false;
        }
      },
      critical: true,
      errorMessage: 'Could not connect to Stripe API',
    },
  ];

  let passed = 0;
  let failed = 0;
  const failures: Array<{ name: string; message?: string }> = [];

  for (const check of checks) {
    try {
      const result = await check.test();
      if (result) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        const criticalFlag = check.critical ? ' (CRITICAL)' : '';
        console.log(`❌ ${check.name}${criticalFlag}`);
        if (check.errorMessage) {
          console.log(`   → ${check.errorMessage}`);
        }
        failed++;
        failures.push({ name: check.name, message: check.errorMessage });
      }
    } catch (error) {
      console.log(`❌ ${check.name} - EXCEPTION`);
      console.log(`   → ${error instanceof Error ? error.message : String(error)}`);
      failed++;
      failures.push({
        name: check.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  VALIDATION FAILED\n');
    console.log('The following checks failed:');
    failures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.name}`);
      if (failure.message) {
        console.log(`   ${failure.message}`);
      }
    });
    console.log('\nPlease fix these issues before deploying to production.');
    console.log('See .env.example for required environment variables.\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL CHECKS PASSED\n');
    console.log('Stripe environment is correctly configured.');
    console.log('Safe to deploy to production.\n');
    process.exit(0);
  }
}

// Run validation
validateStripeEnv().catch((error) => {
  console.error('\n❌ VALIDATION SCRIPT ERROR\n');
  console.error(error);
  process.exit(1);
});
