-- ==============================================================================
-- CREATE LEAGUE JOIN REQUESTS TABLE
-- ==============================================================================
-- Purpose: Allow users to request to join public leagues
-- Agent: Agent 2 - Backend Development
-- Date: January 26, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: league_join_requests
-- ==============================================================================
CREATE TABLE IF NOT EXISTS league_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Request Details
  message TEXT, -- Optional message from user explaining why they want to join
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Review Information
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT, -- Optional reason for rejection

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_id, user_id) -- User can only have one active request per league
);

COMMENT ON TABLE league_join_requests IS 'Tracks user requests to join public leagues';
COMMENT ON COLUMN league_join_requests.message IS 'Optional message from user explaining why they want to join';
COMMENT ON COLUMN league_join_requests.status IS 'Request status: pending, approved, rejected';
COMMENT ON COLUMN league_join_requests.reviewed_by IS 'Admin/owner who reviewed the request';
COMMENT ON COLUMN league_join_requests.rejection_reason IS 'Optional reason provided when rejecting a request';

-- ==============================================================================
-- INDEXES for Performance
-- ==============================================================================

-- Find pending requests for a league (for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_league_join_requests_league_pending
  ON league_join_requests(league_id, status)
  WHERE status = 'pending';

-- Find user's request status for a league
CREATE INDEX IF NOT EXISTS idx_league_join_requests_user_league
  ON league_join_requests(user_id, league_id);

-- Track who reviewed requests
CREATE INDEX IF NOT EXISTS idx_league_join_requests_reviewer
  ON league_join_requests(reviewed_by)
  WHERE reviewed_by IS NOT NULL;

-- Sort by creation date
CREATE INDEX IF NOT EXISTS idx_league_join_requests_created
  ON league_join_requests(created_at DESC);

-- ==============================================================================
-- TRIGGER: Update updated_at timestamp
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_league_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_league_join_requests_updated_at
  BEFORE UPDATE ON league_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_league_join_requests_updated_at();

-- ==============================================================================
-- TRIGGER: Auto-set reviewed_at and reviewed_by when status changes
-- ==============================================================================
CREATE OR REPLACE FUNCTION auto_set_league_join_request_review_info()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed from pending to approved/rejected
  IF NEW.status != OLD.status AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    -- Set reviewed_at if not already set
    IF NEW.reviewed_at IS NULL THEN
      NEW.reviewed_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_set_review_info
  BEFORE UPDATE ON league_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_league_join_request_review_info();

-- ==============================================================================
-- TRIGGER: Auto-add user to league when request approved
-- ==============================================================================
CREATE OR REPLACE FUNCTION auto_add_user_to_league_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If request was just approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Check if user is not already a member
    IF NOT EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_id = NEW.league_id
        AND user_id = NEW.user_id
    ) THEN
      -- Add user to league with 'member' role
      INSERT INTO league_memberships (league_id, user_id, role, status, invited_by)
      VALUES (NEW.league_id, NEW.user_id, 'member', 'active', NEW.reviewed_by);
    ELSE
      -- If membership exists, reactivate it if needed
      UPDATE league_memberships
      SET status = 'active', role = 'member'
      WHERE league_id = NEW.league_id
        AND user_id = NEW.user_id
        AND status != 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_add_to_league
  AFTER UPDATE ON league_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_user_to_league_on_approval();

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================

-- Enable RLS
ALTER TABLE league_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own join requests"
  ON league_join_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create join requests for public leagues
CREATE POLICY "Users can create join requests"
  ON league_join_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_id
        AND is_public = true
        AND status = 'active'
    )
  );

-- League admins/owners can view all requests for their league
CREATE POLICY "League admins can view requests"
  ON league_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_id = league_join_requests.league_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- League admins/owners can update requests (approve/reject)
CREATE POLICY "League admins can update requests"
  ON league_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_id = league_join_requests.league_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  )
  WITH CHECK (
    -- Ensure updated record still belongs to the same league
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_id = league_join_requests.league_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Users can delete (withdraw) their own pending requests
CREATE POLICY "Users can delete their own pending requests"
  ON league_join_requests FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

/**
 * Get pending join requests for a league
 * For league admin dashboard
 */
CREATE OR REPLACE FUNCTION get_league_pending_join_requests(p_league_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- SECURITY: Verify caller is league owner or admin
  IF NOT EXISTS (
    SELECT 1 FROM league_memberships
    WHERE league_id = p_league_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Must be league owner or admin';
  END IF;

  RETURN QUERY
  SELECT
    ljr.id,
    ljr.user_id,
    p.email AS user_email,
    p.full_name AS user_name,
    ljr.message,
    ljr.created_at
  FROM league_join_requests ljr
  JOIN profiles p ON p.id = ljr.user_id
  WHERE ljr.league_id = p_league_id
    AND ljr.status = 'pending'
  ORDER BY ljr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

COMMENT ON FUNCTION get_league_pending_join_requests IS 'Get all pending join requests for a league (for admin review)';

/**
 * Get user's join request status for a league
 */
CREATE OR REPLACE FUNCTION get_user_league_join_status(
  p_user_id UUID,
  p_league_id UUID
)
RETURNS TABLE(
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
) AS $$
BEGIN
  -- SECURITY: Verify caller is either the user themselves or a league admin
  IF auth.uid() != p_user_id AND NOT EXISTS (
    SELECT 1 FROM league_memberships
    WHERE league_id = p_league_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Can only view own join status or must be league admin';
  END IF;

  RETURN QUERY
  SELECT
    ljr.status,
    ljr.created_at,
    ljr.reviewed_at,
    ljr.rejection_reason
  FROM league_join_requests ljr
  WHERE ljr.user_id = p_user_id
    AND ljr.league_id = p_league_id
  ORDER BY ljr.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

COMMENT ON FUNCTION get_user_league_join_status IS 'Get user''s most recent join request status for a league';

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ League join requests system created successfully';
  RAISE NOTICE '✅ Table: league_join_requests';
  RAISE NOTICE '✅ Indexes created for optimal performance';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Triggers created:';
  RAISE NOTICE '  - Auto-set updated_at timestamp';
  RAISE NOTICE '  - Auto-set reviewed_at/reviewed_by on status change';
  RAISE NOTICE '  - Auto-add user to league when approved';
  RAISE NOTICE '✅ Helper functions created:';
  RAISE NOTICE '  - get_league_pending_join_requests(league_id)';
  RAISE NOTICE '  - get_user_league_join_status(user_id, league_id)';
  RAISE NOTICE '';
END $$;
