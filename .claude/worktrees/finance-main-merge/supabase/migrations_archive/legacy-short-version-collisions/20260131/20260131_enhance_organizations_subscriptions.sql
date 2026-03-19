-- Migration: Enhance organizations table for comprehensive Stripe subscription management
-- Created: 2026-01-31
-- Purpose: Add fields for subscription lifecycle, billing cycle, payment methods, and audit trail

-- ============================================================================
-- 1. Add missing subscription fields to organizations table
-- ============================================================================

-- Add Stripe subscription ID (CRITICAL - missing from original schema)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add billing cycle tracking
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS billing_cycle_anchor INTEGER;

-- Add payment method info (metadata only, no card data)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS default_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT,
ADD COLUMN IF NOT EXISTS payment_method_brand TEXT;

-- Add subscription lifecycle tracking
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Add discount/promo tracking
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS coupon_id TEXT,
ADD COLUMN IF NOT EXISTS discount_end_at TIMESTAMP WITH TIME ZONE;

-- Add metadata for extensibility
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- 2. Create indexes for billing queries (performance optimization)
-- ============================================================================

-- Index for active subscriptions queries
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_active
  ON organizations(subscription_status, current_period_end)
  WHERE subscription_status = 'active';

-- Index for trial ending queries (for email notifications)
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ending
  ON organizations(subscription_status, trial_ends_at)
  WHERE subscription_status = 'trialing';

-- Index for Stripe customer lookups (webhook processing)
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Index for Stripe subscription lookups (webhook processing)
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription
  ON organizations(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ============================================================================
-- 3. Create subscription events audit table
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- created, upgraded, downgraded, cancelled, reactivated, payment_failed, payment_succeeded
  from_tier TEXT,
  to_tier TEXT,
  from_status TEXT,
  to_status TEXT,
  stripe_event_id TEXT, -- For idempotency and traceability
  amount_cents INTEGER, -- For payment events
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- 4. Create indexes for subscription events
-- ============================================================================

CREATE INDEX idx_org_sub_events_org_id
  ON organization_subscription_events(organization_id);

CREATE INDEX idx_org_sub_events_type
  ON organization_subscription_events(event_type);

CREATE INDEX idx_org_sub_events_created_at
  ON organization_subscription_events(created_at DESC);

-- Unique constraint for Stripe event idempotency
CREATE UNIQUE INDEX idx_org_sub_events_stripe_event_id
  ON organization_subscription_events(stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

-- ============================================================================
-- 5. Enable RLS on subscription events table
-- ============================================================================

ALTER TABLE organization_subscription_events ENABLE ROW LEVEL SECURITY;

-- Policy: Organization owners can view their org's subscription events
CREATE POLICY "Owners can view org subscription events"
  ON organization_subscription_events FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_user_id = auth.uid()
    )
  );

-- Policy: Service role can insert events (for webhooks)
CREATE POLICY "Service role can insert subscription events"
  ON organization_subscription_events FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 6. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE organization_subscription_events IS
  'Audit trail for all subscription lifecycle events (upgrades, downgrades, cancellations, payment events)';

COMMENT ON COLUMN organizations.stripe_subscription_id IS
  'Stripe subscription ID for the organization''s platform subscription';

COMMENT ON COLUMN organizations.cancel_at_period_end IS
  'If true, subscription will cancel at the end of the current billing period';

COMMENT ON COLUMN organizations.subscription_metadata IS
  'Additional subscription metadata from Stripe (JSON)';

-- ============================================================================
-- 7. Create helper function to log subscription events
-- ============================================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set search path for security
ALTER FUNCTION log_organization_subscription_event OWNER TO postgres;
GRANT EXECUTE ON FUNCTION log_organization_subscription_event TO authenticated, service_role;

COMMENT ON FUNCTION log_organization_subscription_event IS
  'Helper function to log subscription events with automatic idempotency based on stripe_event_id';
