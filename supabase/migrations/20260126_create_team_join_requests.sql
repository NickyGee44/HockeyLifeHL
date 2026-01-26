-- ==============================================================================
-- CREATE TEAM JOIN REQUESTS TABLE
-- ==============================================================================
-- Purpose: Allow players to request to join teams (for open registration mode)
-- Agent: Agent 1 - Database & Infrastructure
-- Date: January 26, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: team_join_requests
-- ==============================================================================
CREATE TABLE IF NOT EXISTS team_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Request Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT, -- Optional message from player to captain

  -- Tracking
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  UNIQUE(team_id, player_id, season_id) -- Player can only have one request per team per season
);

-- ==============================================================================
-- INDEXES for Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team
  ON team_join_requests(team_id);

CREATE INDEX IF NOT EXISTS idx_team_join_requests_player
  ON team_join_requests(player_id);

CREATE INDEX IF NOT EXISTS idx_team_join_requests_season
  ON team_join_requests(season_id);

CREATE INDEX IF NOT EXISTS idx_team_join_requests_league
  ON team_join_requests(league_id);

-- Index for pending requests (most common query)
CREATE INDEX IF NOT EXISTS idx_team_join_requests_pending
  ON team_join_requests(status)
  WHERE status = 'pending';

-- Composite index for team's pending requests
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_pending
  ON team_join_requests(team_id, status)
  WHERE status = 'pending';

-- Composite index for player's requests
CREATE INDEX IF NOT EXISTS idx_team_join_requests_player_status
  ON team_join_requests(player_id, status);

-- ==============================================================================
-- COMMENTS
-- ==============================================================================
COMMENT ON TABLE team_join_requests IS 'Player requests to join teams in open registration mode';
COMMENT ON COLUMN team_join_requests.status IS 'Request status: pending, approved, or rejected';
COMMENT ON COLUMN team_join_requests.message IS 'Optional message from player to captain explaining why they want to join';
COMMENT ON COLUMN team_join_requests.reviewed_by IS 'The captain/admin who approved or rejected the request';

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Players can create join requests
CREATE POLICY "Players can create join requests"
  ON team_join_requests FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Policy: Players can view their own requests
CREATE POLICY "Players can view own requests"
  ON team_join_requests FOR SELECT
  USING (player_id = auth.uid());

-- Policy: Team captains can view requests for their teams
CREATE POLICY "Captains can view team requests"
  ON team_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_join_requests.team_id
        AND captain_id = auth.uid()
    )
  );

-- Policy: League admins can view all requests in their league
CREATE POLICY "Admins can view league requests"
  ON team_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = team_join_requests.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: Team captains can update (approve/reject) requests for their teams
CREATE POLICY "Captains can manage team requests"
  ON team_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_join_requests.team_id
        AND captain_id = auth.uid()
    )
  );

-- Policy: League admins can update any requests in their league
CREATE POLICY "Admins can manage league requests"
  ON team_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = team_join_requests.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: Players can delete their own pending requests
CREATE POLICY "Players can delete own pending requests"
  ON team_join_requests FOR DELETE
  USING (
    player_id = auth.uid()
    AND status = 'pending'
  );

-- ==============================================================================
-- TRIGGER: Set reviewed_at and reviewed_by when status changes
-- ==============================================================================
CREATE OR REPLACE FUNCTION handle_team_join_request_review()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed from pending to approved/rejected
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    NEW.reviewed_at := NOW();
    NEW.reviewed_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_team_join_request_review
  BEFORE UPDATE ON team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_team_join_request_review();

-- ==============================================================================
-- TRIGGER: Auto-add player to team_rosters when request is approved
-- ==============================================================================
CREATE OR REPLACE FUNCTION auto_add_player_to_roster()
RETURNS TRIGGER AS $$
BEGIN
  -- If request was just approved
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    -- Check if player is not already on the roster
    IF NOT EXISTS (
      SELECT 1 FROM team_rosters
      WHERE team_id = NEW.team_id
        AND player_id = NEW.player_id
        AND season_id = NEW.season_id
    ) THEN
      -- Add player to team roster
      INSERT INTO team_rosters (
        team_id,
        player_id,
        season_id,
        league_id,
        status
      ) VALUES (
        NEW.team_id,
        NEW.player_id,
        NEW.season_id,
        NEW.league_id,
        'active'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_add_to_roster
  AFTER UPDATE ON team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_player_to_roster();

-- ==============================================================================
-- TRIGGER: Validate league_id consistency
-- ==============================================================================
CREATE OR REPLACE FUNCTION validate_team_join_request_league_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure team belongs to the specified league
  IF NOT EXISTS (
    SELECT 1 FROM teams WHERE id = NEW.team_id AND league_id = NEW.league_id
  ) THEN
    RAISE EXCEPTION 'Team does not belong to league %', NEW.league_id;
  END IF;

  -- Ensure season belongs to the specified league
  IF NOT EXISTS (
    SELECT 1 FROM seasons WHERE id = NEW.season_id AND league_id = NEW.league_id
  ) THEN
    RAISE EXCEPTION 'Season does not belong to league %', NEW.league_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_team_join_request_league_id
  BEFORE INSERT OR UPDATE ON team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_team_join_request_league_id();

-- ==============================================================================
-- HELPER FUNCTION: Get pending requests for a team
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_team_pending_requests(check_team_id UUID)
RETURNS TABLE(
  id UUID,
  player_id UUID,
  player_name TEXT,
  player_email TEXT,
  message TEXT,
  requested_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tjr.id,
    tjr.player_id,
    p.full_name as player_name,
    p.email as player_email,
    tjr.message,
    tjr.requested_at
  FROM team_join_requests tjr
  JOIN profiles p ON p.id = tjr.player_id
  WHERE tjr.team_id = check_team_id
    AND tjr.status = 'pending'
  ORDER BY tjr.requested_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_team_pending_requests IS 'Get all pending join requests for a team with player details';

-- ==============================================================================
-- HELPER FUNCTION: Get player's request status for a team
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_player_request_status(
  check_player_id UUID,
  check_team_id UUID,
  check_season_id UUID
)
RETURNS TABLE(
  has_request BOOLEAN,
  status TEXT,
  requested_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as has_request,
    tjr.status,
    tjr.requested_at,
    tjr.reviewed_at
  FROM team_join_requests tjr
  WHERE tjr.player_id = check_player_id
    AND tjr.team_id = check_team_id
    AND tjr.season_id = check_season_id;

  -- If no record found
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_player_request_status IS 'Check if a player has a pending/approved/rejected request for a team in a season';

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Team join requests system created successfully';
  RAISE NOTICE '✅ Table: team_join_requests';
  RAISE NOTICE '✅ Indexes created for optimal performance';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Triggers created:';
  RAISE NOTICE '  - Auto-set reviewed_at/reviewed_by on status change';
  RAISE NOTICE '  - Auto-add player to roster when approved';
  RAISE NOTICE '  - Validate league_id consistency';
  RAISE NOTICE '✅ Helper functions created:';
  RAISE NOTICE '  - get_team_pending_requests(team_id)';
  RAISE NOTICE '  - get_player_request_status(player_id, team_id, season_id)';
  RAISE NOTICE '';
END $$;
