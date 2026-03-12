-- Migration: Fix SECURITY DEFINER SQL injection vulnerability
-- CRITICAL: Add search_path to prevent SQL injection in SECURITY DEFINER function
-- Date: 2026-01-31

-- Drop and recreate function with proper search_path
DROP FUNCTION IF EXISTS log_organization_subscription_event;

CREATE OR REPLACE FUNCTION log_organization_subscription_event(
  p_organization_id UUID,
  p_event_type TEXT,
  p_from_tier TEXT DEFAULT NULL,
  p_to_tier TEXT DEFAULT NULL,
  p_from_status TEXT DEFAULT NULL,
  p_to_status TEXT DEFAULT NULL,
  p_stripe_event_id TEXT DEFAULT NULL,
  p_amount_cents INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO organization_subscription_events (
    organization_id,
    event_type,
    from_tier,
    to_tier,
    from_status,
    to_status,
    stripe_event_id,
    amount_cents,
    metadata,
    created_by
  ) VALUES (
    p_organization_id,
    p_event_type,
    p_from_tier,
    p_to_tier,
    p_from_status,
    p_to_status,
    p_stripe_event_id,
    p_amount_cents,
    p_metadata,
    p_created_by
  )
  ON CONFLICT (stripe_event_id) DO NOTHING
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public, pg_temp; -- CRITICAL FIX: Prevent SQL injection

ALTER FUNCTION log_organization_subscription_event OWNER TO postgres;
GRANT EXECUTE ON FUNCTION log_organization_subscription_event TO authenticated, service_role;

COMMENT ON FUNCTION log_organization_subscription_event IS
  'Helper function to log subscription events with automatic idempotency based on stripe_event_id. SECURITY DEFINER with hardened search_path.';

-- Add webhook event timestamp tracking for event ordering
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS last_stripe_event_timestamp INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_organizations_last_event_ts
  ON organizations(last_stripe_event_timestamp DESC)
  WHERE last_stripe_event_timestamp > 0;

-- Fix subscription status constraint to include all Stripe statuses
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS valid_subscription_status;

ALTER TABLE organizations
ADD CONSTRAINT valid_subscription_status CHECK (
  subscription_status IN (
    'trialing',
    'active',
    'past_due',
    'canceled', -- Stripe uses 'canceled' not 'cancelled'
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused'
  )
);

-- Fix RLS policy on subscription events to be more restrictive
DROP POLICY IF EXISTS "Service role can insert subscription events" ON organization_subscription_events;

CREATE POLICY "Service role can insert valid subscription events"
  ON organization_subscription_events FOR INSERT
  WITH CHECK (
    -- Verify organization exists
    organization_id IN (SELECT id FROM organizations)
    AND
    -- Verify created_by references valid user (if provided)
    (created_by IS NULL OR created_by IN (SELECT id FROM auth.users))
    AND
    -- Verify event_type is valid
    event_type IN (
      'created', 'upgraded', 'downgraded', 'cancelled', 'reactivated',
      'payment_failed', 'payment_succeeded', 'trial_ending', 'trial_ended'
    )
  );

COMMENT ON POLICY "Service role can insert valid subscription events" ON organization_subscription_events IS
  'Allows service role to insert subscription events only if organization exists and event type is valid';
