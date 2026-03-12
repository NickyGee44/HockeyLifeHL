-- ==============================================================================
-- MIGRATION: Scorekeeper Availability and Auto-Assignment Support
-- ==============================================================================
-- Description: Adds availability tracking and auto-assignment history for scorekeepers
-- Author: Claude Agent
-- Date: February 5, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: scorekeeper_availability
-- ==============================================================================
-- Purpose: Tracks when scorekeepers are available or unavailable
-- This enables auto-assignment to avoid conflicts

CREATE TABLE IF NOT EXISTS scorekeeper_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scorekeeper & League
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  scorekeeper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Availability Type
  availability_type TEXT NOT NULL DEFAULT 'unavailable',

  -- Time Range
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Recurrence (optional, for weekly patterns)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- 'weekly', 'daily', etc.
  day_of_week INTEGER, -- 0-6 for recurring weekly patterns

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT valid_availability_type CHECK (availability_type IN ('available', 'unavailable', 'preferred')),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scorekeeper_availability_league_id ON scorekeeper_availability(league_id);
CREATE INDEX IF NOT EXISTS idx_scorekeeper_availability_scorekeeper_id ON scorekeeper_availability(scorekeeper_id);
CREATE INDEX IF NOT EXISTS idx_scorekeeper_availability_start_time ON scorekeeper_availability(start_time);
CREATE INDEX IF NOT EXISTS idx_scorekeeper_availability_end_time ON scorekeeper_availability(end_time);

-- Composite index for availability lookups
CREATE INDEX IF NOT EXISTS idx_scorekeeper_availability_lookup
ON scorekeeper_availability(league_id, scorekeeper_id, start_time, end_time);

-- ==============================================================================
-- TABLE: scorekeeper_auto_assign_log
-- ==============================================================================
-- Purpose: Tracks auto-assignment history for audit and analytics

CREATE TABLE IF NOT EXISTS scorekeeper_auto_assign_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,

  -- Assignment Details
  games_processed INTEGER NOT NULL DEFAULT 0,
  games_assigned INTEGER NOT NULL DEFAULT 0,
  games_skipped INTEGER NOT NULL DEFAULT 0,

  -- Algorithm Used
  assignment_strategy TEXT NOT NULL DEFAULT 'round_robin',

  -- Results
  assignments JSONB, -- Array of { game_id, scorekeeper_id, reason }
  skipped_games JSONB, -- Array of { game_id, reason }
  conflicts_detected INTEGER DEFAULT 0,

  -- Execution Details
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'running',
  error_message TEXT,

  -- Who triggered it
  triggered_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_auto_assign_status CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  CONSTRAINT valid_assignment_strategy CHECK (assignment_strategy IN ('round_robin', 'least_assigned', 'availability_based', 'random'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scorekeeper_auto_assign_log_league_id ON scorekeeper_auto_assign_log(league_id);
CREATE INDEX IF NOT EXISTS idx_scorekeeper_auto_assign_log_triggered_by ON scorekeeper_auto_assign_log(triggered_by);
CREATE INDEX IF NOT EXISTS idx_scorekeeper_auto_assign_log_created_at ON scorekeeper_auto_assign_log(created_at DESC);

-- ==============================================================================
-- Add fields to league_scorekeepers for workload tracking
-- ==============================================================================

DO $$
BEGIN
  -- Add total_assignments counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'total_assignments'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN total_assignments INTEGER DEFAULT 0;
  END IF;

  -- Add completed_assignments counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'completed_assignments'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN completed_assignments INTEGER DEFAULT 0;
  END IF;

  -- Add preferred_days (JSONB array of day numbers 0-6)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'preferred_days'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN preferred_days JSONB;
  END IF;

  -- Add max_games_per_week
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'max_games_per_week'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN max_games_per_week INTEGER;
  END IF;

  -- Add email for non-registered scorekeepers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'email'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN email TEXT;
  END IF;

  -- Add name for display purposes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- ==============================================================================
-- RLS POLICIES: scorekeeper_availability
-- ==============================================================================

ALTER TABLE scorekeeper_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scorekeepers can view their own availability" ON scorekeeper_availability;
DROP POLICY IF EXISTS "Scorekeepers can manage their own availability" ON scorekeeper_availability;
DROP POLICY IF EXISTS "League admins can manage scorekeeper availability" ON scorekeeper_availability;
DROP POLICY IF EXISTS "Service role has full access to availability" ON scorekeeper_availability;

-- Scorekeepers can view their own availability
CREATE POLICY "Scorekeepers can view their own availability"
  ON scorekeeper_availability FOR SELECT
  USING (scorekeeper_id = auth.uid());

-- Scorekeepers can manage their own availability
CREATE POLICY "Scorekeepers can manage their own availability"
  ON scorekeeper_availability FOR ALL
  USING (scorekeeper_id = auth.uid())
  WITH CHECK (scorekeeper_id = auth.uid());

-- League admins can manage scorekeeper availability
CREATE POLICY "League admins can manage scorekeeper availability"
  ON scorekeeper_availability FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to availability"
  ON scorekeeper_availability FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: scorekeeper_auto_assign_log
-- ==============================================================================

ALTER TABLE scorekeeper_auto_assign_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League admins can view auto-assign logs" ON scorekeeper_auto_assign_log;
DROP POLICY IF EXISTS "Service role has full access to auto-assign logs" ON scorekeeper_auto_assign_log;

-- League admins can view auto-assign logs
CREATE POLICY "League admins can view auto-assign logs"
  ON scorekeeper_auto_assign_log FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to auto-assign logs"
  ON scorekeeper_auto_assign_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Function to check if a scorekeeper is available at a given time
CREATE OR REPLACE FUNCTION is_scorekeeper_available(
  p_scorekeeper_id UUID,
  p_league_id UUID,
  p_game_time TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_conflict BOOLEAN;
  v_has_unavailable BOOLEAN;
BEGIN
  -- Check if scorekeeper has another game at the same time
  SELECT EXISTS (
    SELECT 1 FROM game_scorekeeper_assignments gsa
    JOIN games g ON gsa.game_id = g.id
    WHERE gsa.scorekeeper_id = p_scorekeeper_id
      AND gsa.league_id = p_league_id
      AND g.status NOT IN ('cancelled', 'postponed')
      AND g.scheduled_at = p_game_time
  ) INTO v_has_conflict;

  IF v_has_conflict THEN
    RETURN FALSE;
  END IF;

  -- Check if scorekeeper has marked themselves unavailable
  SELECT EXISTS (
    SELECT 1 FROM scorekeeper_availability
    WHERE scorekeeper_id = p_scorekeeper_id
      AND league_id = p_league_id
      AND availability_type = 'unavailable'
      AND p_game_time >= start_time
      AND p_game_time < end_time
  ) INTO v_has_unavailable;

  RETURN NOT v_has_unavailable;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function to get scorekeeper workload for a time period
CREATE OR REPLACE FUNCTION get_scorekeeper_workload(
  p_scorekeeper_id UUID,
  p_league_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM game_scorekeeper_assignments gsa
  JOIN games g ON gsa.game_id = g.id
  WHERE gsa.scorekeeper_id = p_scorekeeper_id
    AND gsa.league_id = p_league_id
    AND g.scheduled_at >= p_start_date
    AND g.scheduled_at < p_end_date + INTERVAL '1 day'
    AND g.status NOT IN ('cancelled', 'postponed');

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ==============================================================================
-- UPDATED AT TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_scorekeeper_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_scorekeeper_availability_updated_at ON scorekeeper_availability;
CREATE TRIGGER trigger_scorekeeper_availability_updated_at
  BEFORE UPDATE ON scorekeeper_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_scorekeeper_availability_updated_at();

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
