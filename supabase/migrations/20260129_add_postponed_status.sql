-- ==============================================================================
-- BMHL POSTPONED STATUS & RESCHEDULE TRACKING MIGRATION
-- ==============================================================================
-- Description: Adds postponed status to games and reschedule tracking fields
-- Purpose: Support BMHL's bulk reschedule workflow (weather cancellations, etc.)
-- Author: BMHL Implementation - Phase 1A
-- Date: January 29, 2026
-- Related: BMHL_GAP_ANALYSIS.md (P0.2 - Scheduling v1)
-- ==============================================================================

-- ==============================================================================
-- UPDATE: game_status ENUM
-- ==============================================================================
-- Add 'postponed' status to existing game_status enum

-- Check if enum type exists, if not create it
DO $$ BEGIN
  CREATE TYPE game_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add 'postponed' value if it doesn't exist
DO $$ BEGIN
  ALTER TYPE game_status ADD VALUE IF NOT EXISTS 'postponed';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- ADD RESCHEDULE TRACKING FIELDS TO GAMES TABLE
-- ==============================================================================
-- Track game reschedule history and reasons

-- Add columns if they don't exist
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES games(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
  ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rescheduled_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN games.rescheduled_from IS 'Reference to original game if this is a rescheduled game';
COMMENT ON COLUMN games.reschedule_reason IS 'Reason for reschedule (e.g., weather, venue unavailable)';
COMMENT ON COLUMN games.rescheduled_at IS 'Timestamp when game was rescheduled';
COMMENT ON COLUMN games.rescheduled_by IS 'User who performed the reschedule action';

-- ==============================================================================
-- ADD CANCELLATION TRACKING FIELDS
-- ==============================================================================
-- Track when games are cancelled and why

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_notes TEXT;

-- Add comments
COMMENT ON COLUMN games.cancelled_at IS 'Timestamp when game was cancelled';
COMMENT ON COLUMN games.cancelled_by IS 'User who cancelled the game';
COMMENT ON COLUMN games.cancellation_reason IS 'Reason for cancellation (e.g., weather, venue_unavailable, other)';
COMMENT ON COLUMN games.cancellation_notes IS 'Additional notes about cancellation';

-- ==============================================================================
-- CREATE INDEXES
-- ==============================================================================
-- Optimize queries for reschedule tracking and postponed games

CREATE INDEX IF NOT EXISTS idx_games_rescheduled_from ON games(rescheduled_from)
  WHERE rescheduled_from IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_games_status_postponed ON games(status)
  WHERE status = 'postponed';

CREATE INDEX IF NOT EXISTS idx_games_status_cancelled ON games(status)
  WHERE status = 'cancelled';

CREATE INDEX IF NOT EXISTS idx_games_rescheduled_at ON games(rescheduled_at)
  WHERE rescheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_games_cancelled_at ON games(cancelled_at)
  WHERE cancelled_at IS NOT NULL;

-- Composite index for admin "needs reschedule" queue
CREATE INDEX IF NOT EXISTS idx_games_postponed_queue ON games(league_id, status, scheduled_at)
  WHERE status = 'postponed';

-- ==============================================================================
-- CREATE HELPER FUNCTION: Get Reschedule History
-- ==============================================================================
-- Function to get full reschedule chain for a game

CREATE OR REPLACE FUNCTION get_game_reschedule_history(game_id_param UUID)
RETURNS TABLE (
  game_id UUID,
  scheduled_at TIMESTAMPTZ,
  status game_status,
  reschedule_reason TEXT,
  rescheduled_at TIMESTAMPTZ,
  rescheduled_by UUID,
  is_original BOOLEAN,
  is_current BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE reschedule_chain AS (
    -- Get original game (no rescheduled_from)
    SELECT
      g.id,
      g.scheduled_at,
      g.status,
      g.reschedule_reason,
      g.rescheduled_at,
      g.rescheduled_by,
      true as is_original,
      false as is_current,
      1 as depth
    FROM games g
    WHERE g.id = (
      SELECT COALESCE(g2.rescheduled_from, game_id_param)
      FROM games g2
      WHERE g2.id = game_id_param
    )
    AND g.rescheduled_from IS NULL

    UNION ALL

    -- Get all rescheduled versions
    SELECT
      g.id,
      g.scheduled_at,
      g.status,
      g.reschedule_reason,
      g.rescheduled_at,
      g.rescheduled_by,
      false as is_original,
      false as is_current,
      rc.depth + 1
    FROM games g
    INNER JOIN reschedule_chain rc ON g.rescheduled_from = rc.game_id
  )
  SELECT
    rc.id as game_id,
    rc.scheduled_at,
    rc.status,
    rc.reschedule_reason,
    rc.rescheduled_at,
    rc.rescheduled_by,
    rc.is_original,
    rc.id = game_id_param as is_current
  FROM reschedule_chain rc
  ORDER BY rc.depth;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_game_reschedule_history(UUID) TO authenticated;

-- ==============================================================================
-- CREATE HELPER FUNCTION: Get Postponed Games Queue
-- ==============================================================================
-- Function to get all postponed games that need rescheduling

CREATE OR REPLACE FUNCTION get_postponed_games_queue(league_id_param UUID)
RETURNS TABLE (
  game_id UUID,
  home_team_name TEXT,
  away_team_name TEXT,
  original_scheduled_at TIMESTAMPTZ,
  division_name TEXT,
  venue_name TEXT,
  postponed_at TIMESTAMPTZ,
  postponed_by_name TEXT,
  cancellation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id as game_id,
    ht.name as home_team_name,
    at.name as away_team_name,
    g.scheduled_at as original_scheduled_at,
    d.name as division_name,
    v.name as venue_name,
    g.cancelled_at as postponed_at,
    p.name as postponed_by_name,
    g.cancellation_reason
  FROM games g
  INNER JOIN teams ht ON g.home_team_id = ht.id
  INNER JOIN teams at ON g.away_team_id = at.id
  LEFT JOIN divisions d ON g.division_id = d.id
  LEFT JOIN venues v ON g.venue_id = v.id
  LEFT JOIN profiles p ON g.cancelled_by = p.id
  WHERE g.league_id = league_id_param
    AND g.status = 'postponed'
  ORDER BY g.cancelled_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_postponed_games_queue(UUID) TO authenticated;

-- ==============================================================================
-- CREATE TRIGGER: Auto-set cancelled_at on status change
-- ==============================================================================
-- Automatically set cancelled_at when status changes to cancelled/postponed

CREATE OR REPLACE FUNCTION auto_set_cancellation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to cancelled or postponed, set cancelled_at
  IF (NEW.status IN ('cancelled', 'postponed')) AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at = NOW();
    END IF;

    -- Set cancelled_by if not already set
    IF NEW.cancelled_by IS NULL THEN
      NEW.cancelled_by = auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_set_cancellation_timestamp ON games;
CREATE TRIGGER trigger_auto_set_cancellation_timestamp
  BEFORE UPDATE ON games
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION auto_set_cancellation_timestamp();

-- ==============================================================================
-- MIGRATION VERIFICATION
-- ==============================================================================

DO $$
DECLARE
  postponed_exists BOOLEAN;
  column_count INTEGER;
BEGIN
  -- Verify postponed status exists in enum
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'postponed'
    AND enumtypid = 'game_status'::regtype
  ) INTO postponed_exists;

  IF NOT postponed_exists THEN
    RAISE EXCEPTION 'Migration failed: postponed status not added to game_status enum';
  END IF;

  -- Verify new columns exist
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'games'
  AND column_name IN ('rescheduled_from', 'reschedule_reason', 'rescheduled_at', 'rescheduled_by', 'cancelled_at', 'cancelled_by', 'cancellation_reason', 'cancellation_notes');

  IF column_count < 8 THEN
    RAISE WARNING 'Migration warning: Expected 8 new columns, found %', column_count;
  END IF;

  RAISE NOTICE 'Migration completed successfully: postponed status and reschedule tracking added';
END $$;
