/**
 * Subscription Reconciliation Job
 *
 * Syncs database state with Stripe to fix any drift caused by:
 * - Failed webhook deliveries
 * - Out-of-order webhook processing
 * - Database failures during webhook processing
 * - Manual changes in Stripe dashboard
 *
 * Run this script:
 * - Via cron job every hour
 * - After webhook failures
 * - Before critical billing operations
 *
 * Usage:
 *   pnpm tsx apps/league-builder/src/scripts/reconcile-subscriptions.ts
 */

import { createClient } from '@supabase/supabase-js';
import { stripe, getTierByPriceId } from '../lib/stripe/client';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// Reconciliation Logic
// ============================================================================

interface ReconciliationResult {
  totalOrgs: number;
  checkedOrgs: number;
  fixedOrgs: number;
  errors: Array<{ orgId: string; error: string }>;
  discrepancies: Array<{
    orgId: string;
    orgName: string;
    field: string;
    dbValue: string | null | unknown;
    stripeValue: string | null | unknown;
    fixed: boolean;
  }>;
}

async function reconcileSubscriptions(
  dryRun: boolean = false
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    totalOrgs: 0,
    checkedOrgs: 0,
    fixedOrgs: 0,
    errors: [],
    discrepancies: [],
  };

  console.log(
    `[Reconciliation] Starting ${dryRun ? 'DRY RUN' : 'LIVE'} reconciliation...`
  );

  // Get all organizations with Stripe subscriptions
  const { data: orgs, error: fetchError } = await supabase
    .from('organizations')
    .select(
      'id, name, stripe_subscription_id, subscription_status, subscription_tier, current_period_end'
    )
    .not('stripe_subscription_id', 'is', null);

  if (fetchError) {
    console.error('[Reconciliation] Failed to fetch organizations:', fetchError);
    throw fetchError;
  }

  result.totalOrgs = orgs?.length || 0;
  console.log(`[Reconciliation] Found ${result.totalOrgs} organizations with subscriptions`);

  if (!orgs || orgs.length === 0) {
    console.log('[Reconciliation] No organizations to reconcile');
    return result;
  }

  // Check each organization
  for (const org of orgs) {
    try {
      result.checkedOrgs++;

      console.log(`[Reconciliation] Checking org ${org.id} (${org.name})...`);

      // Fetch subscription from Stripe
      const subscriptionResponse = await stripe.subscriptions.retrieve(
        org.stripe_subscription_id!
      );
      // Extract subscription data from the response
      const subscription = subscriptionResponse as unknown as {
        status: string;
        items: { data: Array<{ price: { id: string } }> };
        current_period_end: number;
        current_period_start: number;
        cancel_at_period_end: boolean;
        canceled_at: number | null;
      };

      // Determine tier from Stripe price
      const priceId = subscription.items.data[0]?.price.id;
      const stripeTier = priceId ? getTierByPriceId(priceId) : null;

      // Track discrepancies
      const orgDiscrepancies: typeof result.discrepancies = [];

      // Check subscription status
      if (subscription.status !== org.subscription_status) {
        orgDiscrepancies.push({
          orgId: org.id,
          orgName: org.name,
          field: 'subscription_status',
          dbValue: org.subscription_status,
          stripeValue: subscription.status,
          fixed: false,
        });
      }

      // Check subscription tier
      if (stripeTier && stripeTier !== org.subscription_tier) {
        orgDiscrepancies.push({
          orgId: org.id,
          orgName: org.name,
          field: 'subscription_tier',
          dbValue: org.subscription_tier,
          stripeValue: stripeTier,
          fixed: false,
        });
      }

      // Check current period end
      const stripeCurrentPeriodEnd = new Date(
        subscription.current_period_end * 1000
      ).toISOString();
      const dbCurrentPeriodEnd = org.current_period_end;

      if (stripeCurrentPeriodEnd !== dbCurrentPeriodEnd) {
        orgDiscrepancies.push({
          orgId: org.id,
          orgName: org.name,
          field: 'current_period_end',
          dbValue: dbCurrentPeriodEnd,
          stripeValue: stripeCurrentPeriodEnd,
          fixed: false,
        });
      }

      // If discrepancies found, fix them
      if (orgDiscrepancies.length > 0) {
        console.warn(
          `[Reconciliation] Found ${orgDiscrepancies.length} discrepancies for org ${org.id}`
        );

        result.discrepancies.push(...orgDiscrepancies);

        if (!dryRun) {
          // Update database to match Stripe
          const { error: updateError } = await supabase
            .from('organizations')
            .update({
              subscription_status: subscription.status,
              subscription_tier: stripeTier || org.subscription_tier,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              cancelled_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
            })
            .eq('id', org.id);

          if (updateError) {
            console.error(
              `[Reconciliation] Failed to update org ${org.id}:`,
              updateError
            );
            result.errors.push({
              orgId: org.id,
              error: updateError.message,
            });
          } else {
            result.fixedOrgs++;
            orgDiscrepancies.forEach((d) => (d.fixed = true));
            console.log(`[Reconciliation] Fixed org ${org.id}`);

            // Log reconciliation event
            await supabase.rpc('log_organization_subscription_event', {
              p_organization_id: org.id,
              p_event_type: 'reconciled',
              p_from_status: org.subscription_status,
              p_to_status: subscription.status,
              p_from_tier: org.subscription_tier,
              p_to_tier: stripeTier || org.subscription_tier,
              p_stripe_event_id: null,
              p_amount_cents: null,
              p_metadata: {
                reconciliation_run: new Date().toISOString(),
                discrepancies: orgDiscrepancies.map((d) => d.field),
              },
              p_created_by: null,
            });
          }
        }
      }
    } catch (error) {
      console.error(`[Reconciliation] Error processing org ${org.id}:`, error);
      result.errors.push({
        orgId: org.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

// ============================================================================
// Reporting
// ============================================================================

function printReport(result: ReconciliationResult, dryRun: boolean): void {
  console.log('\n' + '='.repeat(80));
  console.log(`RECONCILIATION REPORT ${dryRun ? '(DRY RUN)' : ''}`);
  console.log('='.repeat(80));

  console.log(`\nTotal organizations: ${result.totalOrgs}`);
  console.log(`Organizations checked: ${result.checkedOrgs}`);
  console.log(`Organizations with discrepancies: ${result.discrepancies.length}`);
  console.log(`Organizations fixed: ${result.fixedOrgs}`);
  console.log(`Errors encountered: ${result.errors.length}`);

  if (result.discrepancies.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('DISCREPANCIES FOUND:');
    console.log('-'.repeat(80));

    result.discrepancies.forEach((d) => {
      console.log(`\nOrg: ${d.orgName} (${d.orgId})`);
      console.log(`  Field: ${d.field}`);
      console.log(`  Database: ${d.dbValue}`);
      console.log(`  Stripe: ${d.stripeValue}`);
      console.log(`  Fixed: ${d.fixed ? 'YES' : 'NO (dry run)'}`);
    });
  }

  if (result.errors.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('ERRORS:');
    console.log('-'.repeat(80));

    result.errors.forEach((e) => {
      console.log(`\nOrg: ${e.orgId}`);
      console.log(`  Error: ${e.error}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('[Reconciliation] Running in DRY RUN mode - no changes will be made');
  }

  try {
    const result = await reconcileSubscriptions(dryRun);
    printReport(result, dryRun);

    // Exit with error code if there were errors
    if (result.errors.length > 0) {
      console.error('\n[Reconciliation] Completed with errors');
      process.exit(1);
    }

    console.log('\n[Reconciliation] Completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Reconciliation] Fatal error:', error);
    process.exit(1);
  }
}

main();
