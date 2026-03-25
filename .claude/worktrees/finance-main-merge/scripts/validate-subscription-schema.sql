-- ============================================================================
-- Subscription Schema Validation Script
-- ============================================================================
-- Validates that all required tables, columns, and functions exist for
-- organization subscription management.
--
-- Usage (via Supabase SQL Editor):
--   Copy and paste this entire file into the SQL editor and run.
--
-- Expected output:
--   All queries should return results. If any query returns no rows,
--   that component is missing and needs to be created.
-- ============================================================================

-- ============================================================================
-- 1. Verify Tables Exist
-- ============================================================================

SELECT 'Tables Exist Check' AS validation_step;

SELECT
  table_name,
  table_type,
  'OK' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations',
    'organization_subscription_events',
    'organization_addons',
    'webhook_events'
  )
ORDER BY table_name;

-- Expected: 4 rows (organizations, organization_subscription_events, organization_addons, webhook_events)

-- ============================================================================
-- 2. Verify Organizations Table Columns
-- ============================================================================

SELECT 'Organizations Table Columns' AS validation_step;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  'OK' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organizations'
  AND column_name IN (
    'id',
    'stripe_customer_id',
    'stripe_subscription_id',
    'subscription_tier',
    'subscription_status',
    'current_period_start',
    'current_period_end',
    'trial_ends_at',
    'subscription_created_at',
    'cancel_at_period_end',
    'cancelled_at',
    'last_stripe_event_timestamp',
    'default_payment_method_id',
    'payment_method_last4',
    'payment_method_brand'
  )
ORDER BY column_name;

-- Expected: 15 rows (all subscription-related columns)

-- ============================================================================
-- 3. Verify organization_subscription_events Table Schema
-- ============================================================================

SELECT 'Subscription Events Table Columns' AS validation_step;

SELECT
  column_name,
  data_type,
  is_nullable,
  'OK' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organization_subscription_events'
ORDER BY ordinal_position;

-- Expected: Multiple rows with columns like:
-- - id, organization_id, event_type, from_tier, to_tier, from_status, to_status,
--   stripe_event_id, amount_cents, metadata, created_by, created_at

-- ============================================================================
-- 4. Verify Unique Constraint on stripe_event_id
-- ============================================================================

SELECT 'Unique Constraint on stripe_event_id' AS validation_step;

SELECT
  constraint_name,
  constraint_type,
  'OK' AS status
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'organization_subscription_events'
  AND constraint_type = 'UNIQUE';

-- Expected: At least 1 row with constraint on stripe_event_id

-- ============================================================================
-- 5. Verify RPC Functions Exist
-- ============================================================================

SELECT 'RPC Functions Exist' AS validation_step;

SELECT
  routine_name,
  routine_type,
  data_type AS return_type,
  'OK' AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'acquire_webhook_lock',
    'log_organization_subscription_event'
  )
ORDER BY routine_name;

-- Expected: 2 rows (acquire_webhook_lock, log_organization_subscription_event)

-- ============================================================================
-- 6. Verify acquire_webhook_lock Function Signature
-- ============================================================================

SELECT 'acquire_webhook_lock Function Signature' AS validation_step;

SELECT
  routine_name,
  parameter_name,
  data_type,
  parameter_mode,
  'OK' AS status
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'acquire_webhook_lock'
ORDER BY ordinal_position;

-- Expected: 1 row (p_organization_id, uuid, IN)

-- ============================================================================
-- 7. Verify log_organization_subscription_event Function Signature
-- ============================================================================

SELECT 'log_organization_subscription_event Function Signature' AS validation_step;

SELECT
  routine_name,
  parameter_name,
  data_type,
  parameter_mode,
  'OK' AS status
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'log_organization_subscription_event'
ORDER BY ordinal_position;

-- Expected: Multiple rows for parameters:
-- - p_organization_id (uuid)
-- - p_event_type (text)
-- - p_from_tier, p_to_tier, p_from_status, p_to_status (text)
-- - p_stripe_event_id (text)
-- - p_amount_cents (integer)
-- - p_metadata (jsonb)
-- - p_created_by (uuid)

-- ============================================================================
-- 8. Check for Existing Subscriptions
-- ============================================================================

SELECT 'Existing Subscriptions Count' AS validation_step;

SELECT
  COUNT(*) AS total_organizations,
  COUNT(stripe_subscription_id) AS organizations_with_subscription,
  COUNT(CASE WHEN subscription_tier = 'enterprise' THEN 1 END) AS enterprise_count,
  'OK' AS status
FROM organizations;

-- Expected: 1 row with counts

-- ============================================================================
-- 9. Check for Subscription Events
-- ============================================================================

SELECT 'Subscription Events Count' AS validation_step;

SELECT
  COUNT(*) AS total_events,
  COUNT(DISTINCT organization_id) AS organizations_with_events,
  COUNT(DISTINCT stripe_event_id) AS unique_stripe_events,
  'OK' AS status
FROM organization_subscription_events;

-- Expected: 1 row with counts

-- ============================================================================
-- 10. Check for Duplicate Events (Should be 0)
-- ============================================================================

SELECT 'Duplicate Events Check (Should be 0)' AS validation_step;

SELECT
  stripe_event_id,
  COUNT(*) AS occurrence_count,
  'WARNING - DUPLICATE' AS status
FROM organization_subscription_events
WHERE stripe_event_id IS NOT NULL
GROUP BY stripe_event_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)

-- ============================================================================
-- 11. Verify webhook_events Table Exists (Generic Webhook Tracking)
-- ============================================================================

SELECT 'webhook_events Table Columns' AS validation_step;

SELECT
  column_name,
  data_type,
  is_nullable,
  'OK' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'webhook_events'
ORDER BY ordinal_position;

-- Expected: Multiple rows with columns like id, event_id, event_type, etc.

-- ============================================================================
-- 12. Summary Report
-- ============================================================================

SELECT 'VALIDATION SUMMARY' AS validation_step;

WITH validation_results AS (
  SELECT
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = 'public'
     AND table_name IN ('organizations', 'organization_subscription_events', 'webhook_events')
    ) AS tables_count,
    (SELECT COUNT(*) FROM information_schema.routines
     WHERE routine_schema = 'public'
     AND routine_name IN ('acquire_webhook_lock', 'log_organization_subscription_event')
    ) AS functions_count,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public'
     AND table_name = 'organizations'
     AND column_name IN ('stripe_subscription_id', 'subscription_tier', 'last_stripe_event_timestamp')
    ) AS required_columns_count
)
SELECT
  tables_count,
  functions_count,
  required_columns_count,
  CASE
    WHEN tables_count = 3
         AND functions_count = 2
         AND required_columns_count = 3
    THEN '✅ VALIDATION PASSED'
    ELSE '❌ VALIDATION FAILED - Check results above'
  END AS overall_status
FROM validation_results;

-- Expected: All counts correct, status = '✅ VALIDATION PASSED'

-- ============================================================================
-- END OF VALIDATION SCRIPT
-- ============================================================================
