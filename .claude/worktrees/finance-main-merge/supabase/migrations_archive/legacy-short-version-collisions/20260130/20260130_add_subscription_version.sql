-- Migration: Add subscription_version column for optimistic locking
-- Created: 2026-01-30
-- Purpose: Enable optimistic locking to prevent race conditions in concurrent subscription updates

-- Add subscription_version column with default value of 0
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_version INTEGER DEFAULT 0 NOT NULL;

-- Add index for version-based queries (optional performance optimization)
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_version
  ON organizations(subscription_version);

-- Add comment for documentation
COMMENT ON COLUMN organizations.subscription_version IS
  'Version counter for optimistic locking on subscription updates. Incremented on each subscription modification to prevent race conditions.';
