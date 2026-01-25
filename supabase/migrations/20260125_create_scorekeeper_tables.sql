-- ==============================================================================
-- MULTI-TENANT MIGRATION: Create Scorekeeper System Tables
-- ==============================================================================
-- Description: Creates tables for scorekeeper management, game assignments, and payment tracking
-- Priority: MEDIUM - Required for scorekeeper feature (Agent 4 dependency)
-- Author: Agent 1 - Database & Infrastructure
-- Date: January 25, 2026
-- Reference: SCOREKEEPER_SYSTEM_DESIGN.md
-- ==============================================================================

-- ==============================================================================
-- TABLE: league_scorekeepers
-- ==============================================================================
-- Purpose: Tracks which scorekeepers are hired by each league
-- A scorekeeper can work for multiple leagues

CREATE TABLE IF NOT EXISTS league_scorekeepers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- League & Scorekeeper
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  scorekeeper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Employment Details
  status TEXT DEFAULT 'active',
  hourly_rate DECIMAL(10,2), -- Payment rate per hour
  notes TEXT, -- Special instructions, availability notes

  -- Access Control
  can_edit_games BOOLEAN DEFAULT TRUE, -- Can modify game stats
  can_verify_games BOOLEAN DEFAULT FALSE, -- Can mark games as verified

  -- Timestamps
  hired_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_id, scorekeeper_id), -- Scorekeeper can only be hired once per league
  CONSTRAINT valid_scorekeeper_status CHECK (status IN ('active', 'inactive'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_league_scorekeepers_league_id ON league_scorekeepers(league_id);
CREATE INDEX IF NOT EXISTS idx_league_scorekeepers_scorekeeper_id ON league_scorekeepers(scorekeeper_id);
CREATE INDEX IF NOT EXISTS idx_league_scorekeepers_status ON league_scorekeepers(status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_league_scorekeepers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_league_scorekeepers_updated_at ON league_scorekeepers;
CREATE TRIGGER trigger_league_scorekeepers_updated_at
  BEFORE UPDATE ON league_scorekeepers
  FOR EACH ROW
  EXECUTE FUNCTION update_league_scorekeepers_updated_at();

-- ==============================================================================
-- TABLE: game_scorekeeper_assignments
-- ==============================================================================
-- Purpose: Tracks which scorekeeper is assigned to which game
-- Includes payment tracking and time logging

CREATE TABLE IF NOT EXISTS game_scorekeeper_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game & Scorekeeper
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  scorekeeper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE, -- For RLS

  -- Assignment Details
  assigned_by UUID NOT NULL REFERENCES profiles(id), -- Who assigned this scorekeeper
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Game Work Tracking
  checked_in_at TIMESTAMP WITH TIME ZONE, -- When scorekeeper arrived at rink
  started_at TIMESTAMP WITH TIME ZONE, -- When stat entry began
  completed_at TIMESTAMP WITH TIME ZONE, -- When stat entry finished
  duration_minutes INTEGER, -- Calculated: completed_at - started_at

  -- Payment Tracking
  payment_status TEXT DEFAULT 'pending',
  payment_amount DECIMAL(10,2), -- Calculated based on duration and hourly rate
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT, -- Special notes about this game assignment

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(game_id, scorekeeper_id), -- One scorekeeper per game (can be relaxed if needed)
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'approved', 'paid'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_scorekeeper_assignments_game_id ON game_scorekeeper_assignments(game_id);
CREATE INDEX IF NOT EXISTS idx_game_scorekeeper_assignments_scorekeeper_id ON game_scorekeeper_assignments(scorekeeper_id);
CREATE INDEX IF NOT EXISTS idx_game_scorekeeper_assignments_league_id ON game_scorekeeper_assignments(league_id);
CREATE INDEX IF NOT EXISTS idx_game_scorekeeper_assignments_payment_status ON game_scorekeeper_assignments(payment_status);
CREATE INDEX IF NOT EXISTS idx_game_scorekeeper_assignments_assigned_at ON game_scorekeeper_assignments(assigned_at DESC);

-- Composite index for scorekeeper's pending payments
CREATE INDEX IF NOT EXISTS idx_game_scorekeeper_assignments_scorekeeper_payment
ON game_scorekeeper_assignments(scorekeeper_id, payment_status, league_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_game_scorekeeper_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_game_scorekeeper_assignments_updated_at ON game_scorekeeper_assignments;
CREATE TRIGGER trigger_game_scorekeeper_assignments_updated_at
  BEFORE UPDATE ON game_scorekeeper_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_game_scorekeeper_assignments_updated_at();

-- ==============================================================================
-- TABLE: game_stat_entry_log
-- ==============================================================================
-- Purpose: Audit trail for all stat entries (who entered what, when)
-- Critical for accountability and resolving disputes

CREATE TABLE IF NOT EXISTS game_stat_entry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Who entered the stat
  entered_by UUID NOT NULL REFERENCES profiles(id),
  entered_by_role TEXT NOT NULL, -- 'scorekeeper', 'captain', 'admin'

  -- What changed
  stat_type TEXT NOT NULL, -- 'goal', 'assist', 'penalty', 'save', etc.
  action TEXT NOT NULL, -- 'add', 'remove', 'edit'
  previous_value JSONB, -- Previous stat value (if editing)
  new_value JSONB, -- New stat value

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_action CHECK (action IN ('add', 'remove', 'edit')),
  CONSTRAINT valid_entered_by_role CHECK (entered_by_role IN ('scorekeeper', 'captain', 'admin', 'owner'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_stat_entry_log_game_id ON game_stat_entry_log(game_id);
CREATE INDEX IF NOT EXISTS idx_game_stat_entry_log_player_id ON game_stat_entry_log(player_id);
CREATE INDEX IF NOT EXISTS idx_game_stat_entry_log_entered_by ON game_stat_entry_log(entered_by);
CREATE INDEX IF NOT EXISTS idx_game_stat_entry_log_league_id ON game_stat_entry_log(league_id);
CREATE INDEX IF NOT EXISTS idx_game_stat_entry_log_created_at ON game_stat_entry_log(created_at DESC);

-- Composite index for game audit trail
CREATE INDEX IF NOT EXISTS idx_game_stat_entry_log_game_created
ON game_stat_entry_log(game_id, created_at DESC);

-- ==============================================================================
-- UPDATE: Add scorekeeper fields to games table
-- ==============================================================================

-- Add scorekeeper-related fields to games table (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scorekeeper_verified'
  ) THEN
    ALTER TABLE games ADD COLUMN scorekeeper_verified BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scorekeeper_verified_at'
  ) THEN
    ALTER TABLE games ADD COLUMN scorekeeper_verified_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scorekeeper_verified_by'
  ) THEN
    ALTER TABLE games ADD COLUMN scorekeeper_verified_by UUID REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scorekeeper_notes'
  ) THEN
    ALTER TABLE games ADD COLUMN scorekeeper_notes TEXT;
  END IF;
END $$;

-- Index for scorekeeper verification queries
CREATE INDEX IF NOT EXISTS idx_games_scorekeeper_verified ON games(scorekeeper_verified);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on new tables
ALTER TABLE league_scorekeepers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scorekeeper_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stat_entry_log ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES: league_scorekeepers
-- ==============================================================================

DROP POLICY IF EXISTS "Scorekeepers can view their own assignments" ON league_scorekeepers;
DROP POLICY IF EXISTS "League admins can manage scorekeepers" ON league_scorekeepers;
DROP POLICY IF EXISTS "Service role has full access to league scorekeepers" ON league_scorekeepers;

-- Scorekeepers can view their own league assignments
CREATE POLICY "Scorekeepers can view their own assignments"
  ON league_scorekeepers FOR SELECT
  USING (scorekeeper_id = auth.uid());

-- League owners/admins can manage scorekeepers
CREATE POLICY "League admins can manage scorekeepers"
  ON league_scorekeepers FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to league scorekeepers"
  ON league_scorekeepers FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: game_scorekeeper_assignments
-- ==============================================================================

DROP POLICY IF EXISTS "Scorekeepers can view their own game assignments" ON game_scorekeeper_assignments;
DROP POLICY IF EXISTS "Scorekeepers can update their own assignments" ON game_scorekeeper_assignments;
DROP POLICY IF EXISTS "League admins can manage game assignments" ON game_scorekeeper_assignments;
DROP POLICY IF EXISTS "Service role has full access to game assignments" ON game_scorekeeper_assignments;

-- Scorekeepers can view their own game assignments
CREATE POLICY "Scorekeepers can view their own game assignments"
  ON game_scorekeeper_assignments FOR SELECT
  USING (scorekeeper_id = auth.uid());

-- Scorekeepers can update their own assignments (check-in, start, complete)
CREATE POLICY "Scorekeepers can update their own assignments"
  ON game_scorekeeper_assignments FOR UPDATE
  USING (scorekeeper_id = auth.uid())
  WITH CHECK (scorekeeper_id = auth.uid());

-- League owners/admins can manage all assignments
CREATE POLICY "League admins can manage game assignments"
  ON game_scorekeeper_assignments FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to game assignments"
  ON game_scorekeeper_assignments FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: game_stat_entry_log
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view stat logs in their leagues" ON game_stat_entry_log;
DROP POLICY IF EXISTS "Scorekeepers can view their own stat entries" ON game_stat_entry_log;
DROP POLICY IF EXISTS "League admins can view all stat logs" ON game_stat_entry_log;
DROP POLICY IF EXISTS "System can create stat logs" ON game_stat_entry_log;
DROP POLICY IF EXISTS "Service role has full access to stat logs" ON game_stat_entry_log;

-- Users can view stat logs for games in their leagues
CREATE POLICY "Users can view stat logs in their leagues"
  ON game_stat_entry_log FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Scorekeepers can view their own stat entries
CREATE POLICY "Scorekeepers can view their own stat entries"
  ON game_stat_entry_log FOR SELECT
  USING (entered_by = auth.uid());

-- League owners/admins can view all stat logs in their leagues
CREATE POLICY "League admins can view all stat logs"
  ON game_stat_entry_log FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Authenticated users can create stat logs (INSERT only - audit trail is append-only)
CREATE POLICY "System can create stat logs"
  ON game_stat_entry_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Service role full access
CREATE POLICY "Service role has full access to stat logs"
  ON game_stat_entry_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Function to check if user is a scorekeeper for a specific league
CREATE OR REPLACE FUNCTION is_league_scorekeeper(user_uuid UUID, check_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM league_scorekeepers
    WHERE scorekeeper_id = user_uuid
      AND league_id = check_league_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get scorekeeper's assigned games
CREATE OR REPLACE FUNCTION get_scorekeeper_assigned_games(scorekeeper_uuid UUID)
RETURNS TABLE(
  game_id UUID,
  league_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  payment_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gsa.game_id,
    gsa.league_id,
    gsa.assigned_at,
    gsa.payment_status
  FROM game_scorekeeper_assignments gsa
  WHERE gsa.scorekeeper_id = scorekeeper_uuid
  ORDER BY gsa.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- IMPORTANT NOTES
-- ==============================================================================
--
-- After running this migration:
-- 1. Verify all tables created successfully
-- 2. Test RLS policies with scorekeeper role
-- 3. Notify Agent 4 that scorekeeper tables are ready
-- 4. Create server actions for:
--    - Hiring scorekeepers
--    - Assigning scorekeepers to games
--    - Tracking scorekeeper payments
--    - Logging stat entries
--
-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- Next Steps:
-- 1. Run this in Supabase SQL Editor with service role
-- 2. Verify tables created
-- 3. Test RLS policies
-- 4. Proceed with data migration for existing HockeyLifeHL data
-- ==============================================================================
