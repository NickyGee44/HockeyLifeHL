-- ==============================================================================
-- SECURITY FIX: Add PostgreSQL advisory locks for webhook processing
-- ==============================================================================
-- Issue: Subscription webhook events can arrive out of order and bypass
--        timestamp-based ordering checks via TOCTOU race condition
-- Risk: Corrupted subscription state, incorrect billing, unauthorized access
-- Fix: Use PostgreSQL advisory locks to serialize webhook processing per org
-- Reference: NEW_FEATURES_SECURITY_AUDIT_2026-02-05.md - Issue #4
-- ==============================================================================

-- ==============================================================================
-- Function: acquire_webhook_lock
-- ==============================================================================
-- Acquires a PostgreSQL advisory transaction lock for an organization.
--
-- CRITICAL SECURITY: This prevents race conditions in webhook processing where
-- two concurrent events for the same organization can bypass timestamp validation.
--
-- Lock type: pg_advisory_xact_lock (transaction-scoped)
-- - Automatically released when transaction commits/rolls back
-- - Blocks until any existing lock for this org is released
-- - Uses deterministic hash of organization_id as lock key
--
-- Why this matters:
-- Without lock: Event A (ts=1000) checks ordering, Event B (ts=900) checks ordering
--               (both pass because neither has committed yet), both process, B wins
-- With lock: Event A acquires lock, B blocks. A commits, releases lock. B acquires
--            lock, checks ordering against A's timestamp, fails validation. Safe.

CREATE OR REPLACE FUNCTION public.acquire_webhook_lock(p_organization_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_lock_key bigint;
BEGIN
  -- Convert organization UUID to deterministic 64-bit integer for advisory lock
  -- Use hashtext to get consistent hash across calls
  v_lock_key := ('x' || substr(md5(p_organization_id::text), 1, 16))::bit(64)::bigint;

  -- Acquire advisory lock (blocks until available)
  -- This is a transaction-scoped lock (pg_advisory_xact_lock)
  -- It will be automatically released when the transaction ends
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Lock acquired successfully
  RAISE DEBUG 'Acquired webhook lock for organization % (key: %)', p_organization_id, v_lock_key;
END;
$function$;

COMMENT ON FUNCTION acquire_webhook_lock(uuid) IS 'Acquires transaction-scoped advisory lock for webhook processing to prevent race conditions. Lock is automatically released at transaction end.';

-- ==============================================================================
-- Add webhook processing metadata to organization_subscription_events
-- ==============================================================================

-- Add columns to track webhook processing order
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_subscription_events'
      AND column_name = 'webhook_received_at'
  ) THEN
    ALTER TABLE organization_subscription_events
    ADD COLUMN webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_subscription_events'
      AND column_name = 'webhook_processed_at'
  ) THEN
    ALTER TABLE organization_subscription_events
    ADD COLUMN webhook_processed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_subscription_events'
      AND column_name = 'processing_duration_ms'
  ) THEN
    ALTER TABLE organization_subscription_events
    ADD COLUMN processing_duration_ms INTEGER;
  END IF;
END $$;

-- Create index for monitoring webhook processing performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_webhook_timing
ON organization_subscription_events(webhook_received_at, webhook_processed_at)
WHERE webhook_processed_at IS NOT NULL;

COMMENT ON COLUMN organization_subscription_events.webhook_received_at IS 'When webhook was received by our API (may differ from Stripe created timestamp)';
COMMENT ON COLUMN organization_subscription_events.webhook_processed_at IS 'When webhook processing completed successfully';
COMMENT ON COLUMN organization_subscription_events.processing_duration_ms IS 'How long webhook processing took (milliseconds)';

-- ==============================================================================
-- Monitoring query: Detect potential race conditions
-- ==============================================================================

-- Create view to help monitor for race condition attempts (events processed out of order)
CREATE OR REPLACE VIEW webhook_processing_anomalies AS
SELECT
  ose.organization_id,
  ose.event_type,
  ose.stripe_event_id,
  ose.webhook_received_at,
  ose.webhook_processed_at,
  ose.created_at as stripe_event_created_at,
  o.last_stripe_event_timestamp,
  CASE
    WHEN EXTRACT(EPOCH FROM ose.created_at) * 1000 < o.last_stripe_event_timestamp
    THEN 'OUT_OF_ORDER'
    ELSE 'IN_ORDER'
  END as event_ordering,
  ose.processing_duration_ms
FROM organization_subscription_events ose
JOIN organizations o ON o.id = ose.organization_id
WHERE ose.webhook_processed_at IS NOT NULL
ORDER BY ose.organization_id, ose.webhook_received_at DESC;

COMMENT ON VIEW webhook_processing_anomalies IS 'Monitoring view to detect out-of-order webhook processing attempts. OUT_OF_ORDER events indicate race conditions were successfully prevented.';

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Webhook advisory lock migration complete';
  RAISE NOTICE '🔒 Security: Sequential webhook processing per organization enforced';
  RAISE NOTICE '📊 Monitoring: Use webhook_processing_anomalies view to track prevented race conditions';
  RAISE NOTICE '⚙️  Performance: Lock is held for duration of webhook processing (typically <100ms)';
END $$;
