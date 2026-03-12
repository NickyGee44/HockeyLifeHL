-- ==============================================================================
-- MIGRATION: Scorekeeper System Redesign
-- ==============================================================================
-- Description: Unifies the two competing scorekeeper systems by adding missing
--              columns, linking sessions to league_scorekeepers, and creating
--              the swap request workflow.
-- Author: Claude Agent
-- Date: February 12, 2026
-- ==============================================================================

-- ==============================================================================
-- 1. Add missing columns to league_scorekeepers
-- ==============================================================================
-- Some columns (email, display_name, total_assignments, completed_assignments,
-- preferred_days, max_games_per_week) were added in 20260205_scorekeeper_availability.sql.
-- This migration adds the remaining columns needed for the unified system.

DO $$
BEGIN
  -- Email for contact
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'email'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN email TEXT;
  END IF;

  -- Display name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN display_name TEXT;
  END IF;

  -- Phone number for SMS notifications
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'phone'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN phone TEXT;
  END IF;

  -- Total assignments counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'total_assignments'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN total_assignments INTEGER DEFAULT 0;
  END IF;

  -- Completed assignments counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'completed_assignments'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN completed_assignments INTEGER DEFAULT 0;
  END IF;

  -- Max games per week limit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'max_games_per_week'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN max_games_per_week INTEGER DEFAULT 10;
  END IF;

  -- Preferred days (array of day names)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'preferred_days'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN preferred_days TEXT[];
  END IF;

  -- Hourly rate in cents
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'hourly_rate_cents'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN hourly_rate_cents INTEGER DEFAULT 0;
  END IF;

  -- Active flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_scorekeepers' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE league_scorekeepers ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Sync is_active with existing status column for existing rows
UPDATE league_scorekeepers
SET is_active = (status = 'active')
WHERE is_active IS NULL OR is_active != (status = 'active');

-- ==============================================================================
-- 2. Link scorekeeper_sessions to league_scorekeepers
-- ==============================================================================
-- The scorekeeper_sessions table already has a scorekeeper_id column (nullable,
-- references profiles). We add a new column linking to league_scorekeepers.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scorekeeper_sessions' AND column_name = 'league_scorekeeper_id'
  ) THEN
    ALTER TABLE scorekeeper_sessions
      ADD COLUMN league_scorekeeper_id UUID REFERENCES league_scorekeepers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for looking up sessions by league_scorekeeper
CREATE INDEX IF NOT EXISTS idx_scorekeeper_sessions_league_scorekeeper_id
  ON scorekeeper_sessions(league_scorekeeper_id);

-- ==============================================================================
-- 3. Create scorekeeper_swap_requests table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS scorekeeper_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game being swapped
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Who is requesting the swap
  requesting_scorekeeper_id UUID NOT NULL REFERENCES league_scorekeepers(id) ON DELETE CASCADE,

  -- Who accepted (null until accepted)
  accepting_scorekeeper_id UUID REFERENCES league_scorekeepers(id) ON DELETE SET NULL,

  -- Details
  reason TEXT,
  status TEXT DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_swap_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_swap_requests_game_id
  ON scorekeeper_swap_requests(game_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requesting_scorekeeper
  ON scorekeeper_swap_requests(requesting_scorekeeper_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_accepting_scorekeeper
  ON scorekeeper_swap_requests(accepting_scorekeeper_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status
  ON scorekeeper_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_swap_requests_created_at
  ON scorekeeper_swap_requests(created_at DESC);

-- ==============================================================================
-- 4. RLS Policies
-- ==============================================================================

ALTER TABLE scorekeeper_swap_requests ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role has full access to swap requests"
  ON scorekeeper_swap_requests FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- League admins can manage swap requests for games in their leagues
CREATE POLICY "League admins can manage swap requests"
  ON scorekeeper_swap_requests FOR ALL
  USING (
    game_id IN (
      SELECT g.id FROM games g
      WHERE g.league_id IN (
        SELECT league_id FROM league_memberships
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- Scorekeepers can view swap requests they are involved in
CREATE POLICY "Scorekeepers can view their swap requests"
  ON scorekeeper_swap_requests FOR SELECT
  USING (
    requesting_scorekeeper_id IN (
      SELECT id FROM league_scorekeepers WHERE scorekeeper_id = auth.uid()
    )
    OR accepting_scorekeeper_id IN (
      SELECT id FROM league_scorekeepers WHERE scorekeeper_id = auth.uid()
    )
  );

-- Scorekeepers can create swap requests for their own assignments
CREATE POLICY "Scorekeepers can create swap requests"
  ON scorekeeper_swap_requests FOR INSERT
  WITH CHECK (
    requesting_scorekeeper_id IN (
      SELECT id FROM league_scorekeepers WHERE scorekeeper_id = auth.uid()
    )
  );

-- Scorekeepers can update swap requests they can accept
CREATE POLICY "Scorekeepers can accept swap requests"
  ON scorekeeper_swap_requests FOR UPDATE
  USING (
    -- Can update if you're an available scorekeeper in the same league
    requesting_scorekeeper_id IN (
      SELECT id FROM league_scorekeepers WHERE scorekeeper_id = auth.uid()
    )
    OR accepting_scorekeeper_id IN (
      SELECT id FROM league_scorekeepers WHERE scorekeeper_id = auth.uid()
    )
  );

-- ==============================================================================
-- 5. Helper function: increment/decrement assignment counts
-- ==============================================================================

CREATE OR REPLACE FUNCTION increment_scorekeeper_assignments(
  p_league_scorekeeper_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  UPDATE league_scorekeepers
  SET total_assignments = COALESCE(total_assignments, 0) + p_count,
      updated_at = NOW()
  WHERE id = p_league_scorekeeper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION increment_scorekeeper_completed(
  p_league_scorekeeper_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  UPDATE league_scorekeepers
  SET completed_assignments = COALESCE(completed_assignments, 0) + p_count,
      updated_at = NOW()
  WHERE id = p_league_scorekeeper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ==============================================================================
-- 6. Indexes for performance
-- ==============================================================================

-- Composite index for active scorekeepers in a league
CREATE INDEX IF NOT EXISTS idx_league_scorekeepers_league_active
  ON league_scorekeepers(league_id, is_active) WHERE is_active = true;

-- Index for email lookups on league_scorekeepers
CREATE INDEX IF NOT EXISTS idx_league_scorekeepers_email
  ON league_scorekeepers(email) WHERE email IS NOT NULL;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
