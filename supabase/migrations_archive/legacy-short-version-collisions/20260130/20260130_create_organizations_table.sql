-- ==============================================================================
-- ORGANIZATIONS TABLE & LEAGUE ORGANIZATION FK MIGRATION
-- ==============================================================================
-- Description: Creates organizations table and adds organization_id to leagues
-- Purpose: Proper multi-tenant architecture with organization-level scoping
-- Date: January 30, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: organizations
-- ==============================================================================
-- Purpose: Top-level tenant entity that owns leagues
-- Each organization represents a business/entity that runs one or more leagues

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- URL-safe identifier (e.g., "acme-hockey")

  -- Ownership
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Subscription & Billing
  subscription_tier TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'trialing',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),

  -- Stripe Integration
  stripe_customer_id TEXT, -- Stripe customer ID for billing
  stripe_subscription_id TEXT, -- Stripe subscription ID

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_subscription_tier CHECK (
    subscription_tier IN ('starter', 'basic', 'pro', 'enterprise')
  ),
  CONSTRAINT valid_subscription_status CHECK (
    subscription_status IN ('trialing', 'active', 'cancelled', 'past_due', 'paused')
  ),
  CONSTRAINT valid_slug CHECK (slug ~* '^[a-z0-9-]+$') -- Only lowercase, numbers, hyphens
);

-- Indexes for performance
CREATE INDEX idx_organizations_owner ON organizations(owner_user_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- ==============================================================================
-- ADD ORGANIZATION_ID TO LEAGUES TABLE
-- ==============================================================================

-- Add the foreign key column
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Create index for queries filtering by organization
CREATE INDEX IF NOT EXISTS idx_leagues_organization_id ON leagues(organization_id);

-- ==============================================================================
-- RLS POLICIES: organizations
-- ==============================================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can view organizations they own
CREATE POLICY "Users can view own organizations"
  ON organizations FOR SELECT
  USING (owner_user_id = auth.uid());

-- Users can create organizations
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Users can update their own organizations
CREATE POLICY "Users can update own organizations"
  ON organizations FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Users can delete their own organizations
CREATE POLICY "Users can delete own organizations"
  ON organizations FOR DELETE
  USING (owner_user_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role has full access to organizations"
  ON organizations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Function to get user's organization (assumes one org per user for now)
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  subscription_tier TEXT,
  subscription_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.slug, o.subscription_tier, o.subscription_status
  FROM organizations o
  WHERE o.owner_user_id = user_uuid
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns an organization
CREATE OR REPLACE FUNCTION is_organization_owner(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations
    WHERE id = org_uuid AND owner_user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- Next Steps:
-- 1. Create draft status support migration
-- 2. Create draft RLS policies migration
-- 3. Update auth.ts to properly create organizations during signup
-- ==============================================================================
