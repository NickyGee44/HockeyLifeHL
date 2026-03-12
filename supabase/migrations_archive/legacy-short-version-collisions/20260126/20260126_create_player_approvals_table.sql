-- ==============================================================================
-- CREATE player_approvals TABLE - Multi-Tenant
-- ==============================================================================
-- Purpose: Track player approval process for league participation
-- Agent: Agent 1 - Database & Infrastructure
-- Date: January 26, 2026
-- Priority: CRITICAL - Blocking Agent 2 and Agent 4
-- ==============================================================================

-- ==============================================================================
-- TABLE: player_approvals
-- ==============================================================================
CREATE TABLE IF NOT EXISTS player_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Can be NULL if auto-approved
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Approval Details
  approval_method TEXT NOT NULL CHECK (approval_method IN ('owner', 'admin', 'auto')),
  notes TEXT, -- Optional notes about the approval

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(player_id, league_id) -- A player can only have one approval record per league
);

-- ==============================================================================
-- INDEXES for Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_player_approvals_league_id ON player_approvals(league_id);
CREATE INDEX IF NOT EXISTS idx_player_approvals_player_id ON player_approvals(player_id);
CREATE INDEX IF NOT EXISTS idx_player_approvals_approved_by ON player_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_player_approvals_approval_method ON player_approvals(approval_method);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_player_approvals_league_player ON player_approvals(league_id, player_id);

-- ==============================================================================
-- COMMENTS
-- ==============================================================================
COMMENT ON TABLE player_approvals IS 'Tracks which players have been approved to participate in each league';
COMMENT ON COLUMN player_approvals.player_id IS 'The player being approved';
COMMENT ON COLUMN player_approvals.approved_by IS 'The admin/owner who approved the player (NULL for auto-approval)';
COMMENT ON COLUMN player_approvals.league_id IS 'The league the player is approved for';
COMMENT ON COLUMN player_approvals.approval_method IS 'How the player was approved: owner, admin, or auto';
COMMENT ON COLUMN player_approvals.notes IS 'Optional notes about the approval decision';

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE player_approvals ENABLE ROW LEVEL SECURITY;

-- Policy: League admins and owners can view approvals in their league
CREATE POLICY "League admins can view player approvals"
  ON player_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = player_approvals.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: Players can view their own approval status
CREATE POLICY "Players can view their own approvals"
  ON player_approvals FOR SELECT
  USING (player_id = auth.uid());

-- Policy: League admins and owners can insert approvals
CREATE POLICY "League admins can approve players"
  ON player_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = player_approvals.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: League admins and owners can update approvals (e.g., add notes)
CREATE POLICY "League admins can update player approvals"
  ON player_approvals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = player_approvals.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: League owners can delete approvals (revoke access)
CREATE POLICY "League owners can delete player approvals"
  ON player_approvals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = player_approvals.league_id
        AND status = 'active'
        AND role = 'owner'
    )
  );

-- ==============================================================================
-- TRIGGER: Auto-set approved_by if not provided
-- ==============================================================================
CREATE OR REPLACE FUNCTION set_player_approval_approved_by()
RETURNS TRIGGER AS $$
BEGIN
  -- If approved_by is NULL and approval_method is not 'auto', set it to current user
  IF NEW.approved_by IS NULL AND NEW.approval_method != 'auto' THEN
    NEW.approved_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_player_approval_approved_by
  BEFORE INSERT ON player_approvals
  FOR EACH ROW
  EXECUTE FUNCTION set_player_approval_approved_by();

-- ==============================================================================
-- HELPER FUNCTION: Check if player is approved for a league
-- ==============================================================================
CREATE OR REPLACE FUNCTION is_player_approved(
  check_player_id UUID,
  check_league_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM player_approvals
    WHERE player_id = check_player_id
      AND league_id = check_league_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_player_approved IS 'Check if a player has been approved for a specific league';

-- ==============================================================================
-- HELPER FUNCTION: Get approval status for a player in a league
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_player_approval_status(
  check_player_id UUID,
  check_league_id UUID
)
RETURNS TABLE(
  is_approved BOOLEAN,
  approval_method TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_approved,
    pa.approval_method,
    p.full_name as approved_by_name,
    pa.created_at as approved_at,
    pa.notes
  FROM player_approvals pa
  LEFT JOIN profiles p ON p.id = pa.approved_by
  WHERE pa.player_id = check_player_id
    AND pa.league_id = check_league_id;

  -- If no record found, player is not approved
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_player_approval_status IS 'Get detailed approval status for a player in a league';

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ player_approvals table created successfully';
  RAISE NOTICE '✅ Indexes created for optimal performance';
  RAISE NOTICE '✅ RLS policies enabled (only admins/owners can manage)';
  RAISE NOTICE '✅ Helper functions created: is_player_approved(), get_player_approval_status()';
END $$;
