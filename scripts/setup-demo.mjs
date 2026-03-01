/**
 * Demo League Full Setup Script
 *
 * Configures the demo league (slug='demo') for a complete end-to-end test experience:
 *   1. Creates an Organization for the demo league (if one doesn't exist)
 *   2. Links the league to the org and enables bypass_subscription_gate
 *   3. Enables demoMode in league settings (shows the DemoTourPanel)
 *   4. Opens registration on the active season (sets date window)
 *   5. Creates a season_fees record ($75 CAD) so the payment step activates
 *   6. Creates a Stripe test Express connected account
 *   7. Updates the league with the Stripe account ID
 *
 * After running this script you'll get an onboarding URL. Complete the Stripe
 * test onboarding (takes ~2 min with test data), then run this script again
 * with --finalize to mark the account as 'complete' in the database.
 *
 * Usage:
 *   node scripts/setup-demo.mjs             # Full setup + prints Stripe onboarding URL
 *   node scripts/setup-demo.mjs --finalize  # Checks Stripe status, marks DB complete
 *   node scripts/setup-demo.mjs --check     # Print current demo league status
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Allow a dedicated test key so you don't have to swap out the live key.
// Add STRIPE_SECRET_KEY_TEST=sk_test_... to .env.local and this script will
// use it automatically, leaving STRIPE_SECRET_KEY (live) untouched.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_TEST_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FINALIZE = process.argv.includes('--finalize');
const CHECK = process.argv.includes('--check');

// Registration window: now → 18 months from now
const REG_OPENS = new Date('2026-01-01T00:00:00Z').toISOString();
const REG_CLOSES = new Date('2027-12-31T23:59:59Z').toISOString();

// Season fee: $75 CAD
const REGISTRATION_FEE_CENTS = 7500;
const REGISTRATION_CURRENCY = 'cad';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) { console.log(msg); }
function ok(msg)  { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }
function err(msg) { console.error(`  ❌ ${msg}`); }
function hr()     { console.log('─'.repeat(62)); }

async function getDemoLeague() {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, organization_id, stripe_account_id, stripe_account_status, settings, created_by')
    .eq('slug', 'demo')
    .single();

  if (error || !data) {
    err('Demo league not found. Run: node scripts/seed-demo-league.mjs');
    process.exit(1);
  }
  return data;
}

async function getDemoSeason(leagueId) {
  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, status, registration_opens_at, registration_closes_at, registration_type')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

// ---------------------------------------------------------------------------
// --check: Print current status
// ---------------------------------------------------------------------------

async function checkStatus() {
  log('');
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║               Demo League Status Check                      ║');
  log('╚══════════════════════════════════════════════════════════════╝');
  log('');

  const league = await getDemoLeague();
  const season = await getDemoSeason(league.id);

  log(`League:         ${league.name} (${league.id})`);
  log(`Org ID:         ${league.organization_id ?? 'MISSING ⚠️'}`);
  log(`Stripe acct:    ${league.stripe_account_id ?? 'MISSING ⚠️'}`);
  log(`Stripe status:  ${league.stripe_account_status ?? 'not set'}`);
  log(`Demo mode:      ${league.settings?.website?.demoMode ? '✓ enabled' : '✗ disabled ⚠️'}`);
  log('');

  if (season) {
    log(`Season:         ${season.name} (${season.id})`);
    log(`Reg opens:      ${season.registration_opens_at ?? 'NOT SET ⚠️'}`);
    log(`Reg closes:     ${season.registration_closes_at ?? 'NOT SET ⚠️'}`);
  } else {
    log('Season:         NOT FOUND ⚠️');
  }

  if (league.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, bypass_subscription_gate')
      .eq('id', league.organization_id)
      .maybeSingle();

    if (org) {
      log(`Org name:       ${org.name}`);
      log(`Bypass gate:    ${org.bypass_subscription_gate ? '✓ enabled' : '✗ disabled ⚠️'}`);
    }
  }

  // Check season fee
  if (season) {
    const { data: fee } = await supabase
      .from('season_fees')
      .select('amount_cents, currency, is_active')
      .eq('season_id', season.id)
      .maybeSingle();

    if (fee) {
      log(`Season fee:     $${(fee.amount_cents / 100).toFixed(2)} ${fee.currency.toUpperCase()} (active: ${fee.is_active})`);
    } else {
      log('Season fee:     NOT SET ⚠️');
    }
  }

  log('');
}

// ---------------------------------------------------------------------------
// --finalize: Check Stripe status and mark DB complete
// ---------------------------------------------------------------------------

async function finalizeStripe() {
  if (!STRIPE_SECRET_KEY) {
    err('STRIPE_SECRET_KEY not set in .env.local');
    process.exit(1);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' });
  const league = await getDemoLeague();

  log('');
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║          Finalize Stripe Connect Account                     ║');
  log('╚══════════════════════════════════════════════════════════════╝');
  log('');

  if (!league.stripe_account_id) {
    err('No Stripe account ID on demo league. Run setup first (no flags).');
    process.exit(1);
  }

  log(`Checking account: ${league.stripe_account_id}`);

  let account;
  try {
    account = await stripe.accounts.retrieve(league.stripe_account_id);
  } catch (e) {
    err(`Could not retrieve Stripe account: ${e.message}`);
    process.exit(1);
  }

  log(`  charges_enabled:  ${account.charges_enabled}`);
  log(`  payouts_enabled:  ${account.payouts_enabled}`);
  log(`  details_submitted: ${account.details_submitted}`);
  log('');

  if (account.charges_enabled) {
    const { error: updateErr } = await supabase
      .from('leagues')
      .update({ stripe_account_status: 'complete' })
      .eq('id', league.id);

    if (updateErr) {
      err(`Failed to update DB: ${updateErr.message}`);
    } else {
      ok('stripe_account_status → "complete" saved to database');
      ok('Demo league is fully configured for end-to-end payment testing!');
    }
  } else {
    warn('Account is not yet charges-enabled.');
    warn('Complete the Stripe test onboarding, then run --finalize again.');
    log('');

    // Generate a fresh onboarding link
    const link = await stripe.accountLinks.create({
      account: league.stripe_account_id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/demo`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/demo`,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    log('Fresh onboarding URL:');
    log('');
    log(`  ${link.url}`);
    log('');
  }
}

// ---------------------------------------------------------------------------
// Main setup
// ---------------------------------------------------------------------------

async function setup() {
  log('');
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║             Demo League Full Setup                           ║');
  log('╚══════════════════════════════════════════════════════════════╝');
  log('');

  // Step 1: Get demo league
  hr();
  log('Step 1 — Fetch demo league');
  const league = await getDemoLeague();
  ok(`Found league: ${league.name} (${league.id})`);

  // Ensure league name is "DEMO LEAGUE" (idempotent)
  if (league.name !== 'DEMO LEAGUE') {
    const { error: nameErr } = await supabase
      .from('leagues')
      .update({ name: 'DEMO LEAGUE' })
      .eq('id', league.id);
    if (nameErr) err(`Failed to rename league: ${nameErr.message}`);
    else ok('League name → "DEMO LEAGUE"');
  } else {
    ok('League name already "DEMO LEAGUE"');
  }

  // Step 2: Get or create organization
  hr();
  log('Step 2 — Organization + subscription bypass');

  let orgId = league.organization_id;

  if (orgId) {
    // Check if org exists and update bypass
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, name, bypass_subscription_gate')
      .eq('id', orgId)
      .maybeSingle();

    if (existingOrg) {
      ok(`Org already linked: ${existingOrg.name} (${existingOrg.id})`);
      if (!existingOrg.bypass_subscription_gate) {
        const { error } = await supabase
          .from('organizations')
          .update({ bypass_subscription_gate: true })
          .eq('id', existingOrg.id);
        if (error) err(`Failed to enable bypass: ${error.message}`);
        else ok('bypass_subscription_gate → true');
      } else {
        ok('bypass_subscription_gate already enabled');
      }
    } else {
      warn('organization_id set but org not found — will create new org');
      orgId = null;
    }
  }

  if (!orgId) {
    // Create an org for the demo league
    const { data: insertedOrg, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        name: 'Demo Organization (DEMO LEAGUE)',
        slug: 'demo-org',
        owner_user_id: league.created_by,
        bypass_subscription_gate: true,
      })
      .select('id')
      .single();

    if (orgErr || !insertedOrg) {
      // Slug might conflict — try with unique suffix
      const { data: insertedOrg2, error: orgErr2 } = await supabase
        .from('organizations')
        .insert({
          name: 'Demo Organization (DEMO LEAGUE)',
          slug: `demo-org-${Date.now()}`,
          owner_user_id: league.created_by,
          bypass_subscription_gate: true,
        })
        .select('id')
        .single();

      if (orgErr2 || !insertedOrg2) {
        err(`Failed to create org: ${orgErr?.message ?? orgErr2?.message}`);
        process.exit(1);
      }
      orgId = insertedOrg2.id;
    } else {
      orgId = insertedOrg.id;
    }

    ok(`Created organization: ${orgId}`);

    // Link league to org
    const { error: linkErr } = await supabase
      .from('leagues')
      .update({ organization_id: orgId })
      .eq('id', league.id);

    if (linkErr) {
      err(`Failed to link league to org: ${linkErr.message}`);
      process.exit(1);
    }
    ok('Linked league → organization');
  }

  // Step 3: Enable demoMode in league settings
  hr();
  log('Step 3 — Enable demo mode');

  const currentSettings = league.settings ?? {};
  const currentWebsite = currentSettings.website ?? {};
  if (currentWebsite.demoMode) {
    ok('demoMode already enabled');
  } else {
    const newSettings = {
      ...currentSettings,
      website: {
        ...currentWebsite,
        demoMode: true,
      },
    };

    const { error: settingsErr } = await supabase
      .from('leagues')
      .update({ settings: newSettings })
      .eq('id', league.id);

    if (settingsErr) {
      err(`Failed to update settings: ${settingsErr.message}`);
    } else {
      ok('settings.website.demoMode → true (DemoTourPanel now visible)');
    }
  }

  // Step 4: Open registration on the active season
  hr();
  log('Step 4 — Season registration window');

  const season = await getDemoSeason(league.id);
  if (!season) {
    warn('No season found — skipping registration dates. Run seed-demo-league.mjs first.');
  } else {
    ok(`Season: ${season.name} (${season.id})`);

    if (!season.registration_opens_at || !season.registration_closes_at) {
      const { error: seasonErr } = await supabase
        .from('seasons')
        .update({
          registration_opens_at: REG_OPENS,
          registration_closes_at: REG_CLOSES,
        })
        .eq('id', season.id);

      if (seasonErr) {
        err(`Failed to set registration dates: ${seasonErr.message}`);
      } else {
        ok(`Registration window: ${REG_OPENS} → ${REG_CLOSES}`);
      }
    } else {
      ok('Registration window already set');
    }

    // Step 5: Season fee
    hr();
    log('Step 5 — Season registration fee ($75 CAD)');

    const { data: existingFee } = await supabase
      .from('season_fees')
      .select('id, amount_cents')
      .eq('season_id', season.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existingFee) {
      ok(`Fee already set: $${(existingFee.amount_cents / 100).toFixed(2)} CAD`);
    } else {
      const { error: feeErr } = await supabase
        .from('season_fees')
        .insert({
          league_id: league.id,
          season_id: season.id,
          name: 'Season Registration',
          amount_cents: REGISTRATION_FEE_CENTS,
          currency: REGISTRATION_CURRENCY,
          is_active: true,
        });

      if (feeErr) {
        err(`Failed to create season fee: ${feeErr.message}`);
      } else {
        ok(`Season fee created: $${(REGISTRATION_FEE_CENTS / 100).toFixed(2)} CAD`);
      }
    }
  }

  // Step 6: Stripe Connect test account
  hr();
  log('Step 6 — Stripe Connect test account');

  if (!STRIPE_SECRET_KEY) {
    warn('STRIPE_SECRET_KEY not set — skipping Stripe setup.');
    warn('Add STRIPE_SECRET_KEY to .env.local and re-run to complete Stripe setup.');
  } else if (!STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    warn('STRIPE_SECRET_KEY is not a test key (sk_test_...).');
    warn('Switch to Stripe test mode before setting up the demo league.');
  } else {
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' });

    // Reload league to get latest stripe_account_id
    const { data: freshLeague } = await supabase
      .from('leagues')
      .select('stripe_account_id, stripe_account_status')
      .eq('id', league.id)
      .single();

    const existingAccountId = freshLeague?.stripe_account_id;

    if (existingAccountId) {
      ok(`Stripe account already linked: ${existingAccountId}`);

      // Check if charges are enabled
      try {
        const acct = await stripe.accounts.retrieve(existingAccountId);
        if (acct.charges_enabled) {
          ok('charges_enabled: true — account is ready!');
          if (freshLeague?.stripe_account_status !== 'complete') {
            await supabase
              .from('leagues')
              .update({ stripe_account_status: 'complete' })
              .eq('id', league.id);
            ok('stripe_account_status → "complete"');
          }
        } else {
          warn('Account exists but is not yet charges-enabled.');
          warn('Complete the test onboarding, then run: node scripts/setup-demo.mjs --finalize');
        }
      } catch (e) {
        warn(`Could not check Stripe account status: ${e.message}`);
      }
    } else {
      // Create new Express account for demo league
      log('  Creating Stripe Express test account...');

      let account;
      try {
        account = await stripe.accounts.create({
          type: 'express',
          country: 'CA',
          email: 'demo@beerleaguehockey.ca',
          business_type: 'company',
          company: { name: 'DEMO LEAGUE (Demo)' },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            league_id: league.id,
            league_slug: 'demo',
            platform: 'beerleaguehockey',
            environment: 'test',
          },
        });
        ok(`Stripe account created: ${account.id}`);
      } catch (e) {
        err(`Failed to create Stripe account: ${e.message}`);
        process.exit(1);
      }

      // Save account ID to league
      const { error: stripeUpdateErr } = await supabase
        .from('leagues')
        .update({
          stripe_account_id: account.id,
          stripe_account_status: 'pending',
        })
        .eq('id', league.id);

      if (stripeUpdateErr) {
        err(`Failed to save Stripe account to DB: ${stripeUpdateErr.message}`);
      } else {
        ok('Stripe account ID saved to database (status: pending)');
      }

      // Generate onboarding link
      let onboardingUrl = '';
      try {
        const link = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/demo`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/demo`,
          type: 'account_onboarding',
          collect: 'eventually_due',
        });
        onboardingUrl = link.url;
      } catch (e) {
        warn(`Could not generate onboarding link: ${e.message}`);
      }

      hr();
      log('');
      log('📋 STRIPE ONBOARDING REQUIRED');
      log('');
      log('Complete the test onboarding at this URL (~2 min):');
      log('');
      if (onboardingUrl) {
        log(`  ${onboardingUrl}`);
      } else {
        log('  (Could not generate link — check Stripe Dashboard)');
      }
      log('');
      log('Test values to use during onboarding:');
      log('  • Phone:       Any format (e.g. 555-555-5555)');
      log('  • SIN/BN:      123456789');
      log('  • Address:     Any Canadian address');
      log('  • Bank routing: 11000-000  Account: 000123456789');
      log('');
      log('After completing onboarding, run:');
      log('  node scripts/setup-demo.mjs --finalize');
      log('');
    }
  }

  hr();
  log('');
  log('✅ Demo league setup complete!');
  log('');
  log('   Public site:     /demo');
  log('   Registration:    /demo/register');
  log('   Player dashboard: /demo/me');
  log('');
  log('   The DemoTourPanel (sparkle button) should now be visible');
  log('   on the demo league public site.');
  log('');

  if (STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    log('   Test card numbers for payment:');
    log('   • Success:  4242 4242 4242 4242');
    log('   • Declined: 4000 0000 0000 0002');
    log('   • 3DS:      4000 0025 0000 3155');
    log('   Expiry: any future date, CVC: any 3 digits');
    log('');
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
  try {
    if (CHECK) {
      await checkStatus();
    } else if (FINALIZE) {
      await finalizeStripe();
    } else {
      await setup();
    }
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
