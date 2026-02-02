-- ==============================================================================
-- DRAFT LEAGUE RLS POLICIES
-- ==============================================================================
-- Description: Row-level security policies for draft leagues
-- Purpose: Allow users to create and manage draft leagues during wizard flow
-- Date: January 30, 2026
-- ==============================================================================

-- ==============================================================================
-- DRAFT-SPECIFIC RLS POLICIES
-- ==============================================================================

-- Policy: Users can view their own draft leagues
CREATE POLICY "Users can view own draft leagues"
  ON leagues FOR SELECT
  USING (
    status = 'draft'
    AND created_by = auth.uid()
  );

-- Policy: Users can create draft leagues in their organization
CREATE POLICY "Users can create draft leagues"
  ON leagues FOR INSERT
  WITH CHECK (
    status = 'draft'
    AND created_by = auth.uid()
    AND (
      -- Allow if organization_id is NULL (will be set later)
      organization_id IS NULL
      OR
      -- Or if organization belongs to the user
      organization_id IN (
        SELECT id FROM organizations WHERE owner_user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own draft leagues
CREATE POLICY "Users can update own draft leagues"
  ON leagues FOR UPDATE
  USING (
    status = 'draft'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    -- Allow keeping as draft or transitioning to active
    (status = 'draft' OR status = 'active')
    AND created_by = auth.uid()
  );

-- Policy: Users can delete their own draft leagues
CREATE POLICY "Users can delete own draft leagues"
  ON leagues FOR DELETE
  USING (
    status = 'draft'
    AND created_by = auth.uid()
  );

-- ==============================================================================
-- HELPER FUNCTION FOR DRAFT MANAGEMENT
-- ==============================================================================

-- Function to get user's current draft league (if any)
CREATE OR REPLACE FUNCTION get_user_draft_league(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT,
  timezone TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  organization_id UUID,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.description,
    l.city,
    l.state_province,
    l.country,
    l.timezone,
    l.logo_url,
    l.primary_color,
    l.secondary_color,
    l.organization_id,
    l.settings,
    l.created_at,
    l.updated_at
  FROM leagues l
  WHERE l.created_by = user_uuid
    AND l.status = 'draft'
  ORDER BY l.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old draft leagues (for maintenance)
-- Deletes drafts older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_draft_leagues()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM leagues
    WHERE status = 'draft'
      AND updated_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================================================

COMMENT ON FUNCTION get_user_draft_league(UUID) IS 'Returns the most recently updated draft league for a user. Used by the league creation wizard to resume progress.';
COMMENT ON FUNCTION cleanup_old_draft_leagues() IS 'Maintenance function to delete draft leagues older than 30 days. Should be run periodically via cron job.';

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- Draft RLS policies are now in place:
-- ✅ Users can view their own draft leagues
-- ✅ Users can create draft leagues
-- ✅ Users can update their own drafts
-- ✅ Users can delete their own drafts
-- ✅ Organization validation on creation
-- ✅ Helper functions for draft management
--
-- Next Steps:
-- 1. Apply all three migrations to database
-- 2. Begin UI component development
-- ==============================================================================
