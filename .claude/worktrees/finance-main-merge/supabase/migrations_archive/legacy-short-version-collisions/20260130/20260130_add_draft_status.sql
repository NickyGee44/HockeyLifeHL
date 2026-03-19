-- ==============================================================================
-- ADD DRAFT STATUS SUPPORT TO LEAGUES
-- ==============================================================================
-- Description: Adds 'draft' status to leagues for wizard functionality
-- Purpose: Allow users to save incomplete leagues while building them
-- Date: January 30, 2026
-- ==============================================================================

-- ==============================================================================
-- UPDATE STATUS CONSTRAINT
-- ==============================================================================

-- Drop the existing constraint
ALTER TABLE leagues
DROP CONSTRAINT IF EXISTS valid_status;

-- Add new constraint with 'draft' status included
ALTER TABLE leagues
ADD CONSTRAINT valid_status CHECK (
  status IN ('draft', 'active', 'suspended', 'archived')
);

-- ==============================================================================
-- CREATE INDEXES FOR DRAFT QUERIES
-- ==============================================================================

-- Index for finding user's draft leagues (common query in wizard)
CREATE INDEX IF NOT EXISTS idx_leagues_draft_created_by
  ON leagues(status, created_by)
  WHERE status = 'draft';

-- Index for finding organization's draft leagues
CREATE INDEX IF NOT EXISTS idx_leagues_draft_organization
  ON leagues(status, organization_id)
  WHERE status = 'draft';

-- ==============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================================================

COMMENT ON COLUMN leagues.status IS 'League lifecycle status: draft (being created), active (operational), suspended (temporarily disabled), archived (historical)';

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- Next Steps:
-- 1. Create draft RLS policies migration
-- 2. Update application code to handle draft status
-- ==============================================================================
