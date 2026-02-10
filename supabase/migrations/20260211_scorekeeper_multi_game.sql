-- ==============================================================================
-- MIGRATION: Multi-Game Scorekeeper Sessions + Timer Support
-- ==============================================================================
-- Description: Adds multi-game session support and game timer columns
-- Author: Claude Agent
-- Date: February 11, 2026
-- ==============================================================================

-- ==============================================================================
-- Add session_type to scorekeeper_sessions
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scorekeeper_sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE scorekeeper_sessions ADD COLUMN session_type text NOT NULL DEFAULT 'single'
      CHECK (session_type IN ('single', 'multi'));
  END IF;
END $$;

-- ==============================================================================
-- TABLE: scorekeeper_session_games
-- ==============================================================================
-- Purpose: Links multiple games to a single scorekeeper session
-- Enables scorekeepers to manage multiple concurrent games (e.g., back-to-back)

CREATE TABLE IF NOT EXISTS scorekeeper_session_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES scorekeeper_sessions(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id),
  game_order INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, game_id)
);

ALTER TABLE scorekeeper_session_games ENABLE ROW LEVEL SECURITY;

-- Service role needs full access for server actions
CREATE POLICY "service_role_access" ON scorekeeper_session_games
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- League admins can view session games
CREATE POLICY "League admins can view session games" ON scorekeeper_session_games
  FOR SELECT USING (
    session_id IN (
      SELECT ss.id FROM scorekeeper_sessions ss
      WHERE ss.league_id IN (
        SELECT league_id FROM league_memberships
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_sk_session_games_session ON scorekeeper_session_games(session_id);
CREATE INDEX IF NOT EXISTS idx_sk_session_games_game ON scorekeeper_session_games(game_id);

-- ==============================================================================
-- Add timer columns to games table
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'timer_running'
  ) THEN
    ALTER TABLE games ADD COLUMN timer_running BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'timer_started_at'
  ) THEN
    ALTER TABLE games ADD COLUMN timer_started_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'timer_elapsed_seconds'
  ) THEN
    ALTER TABLE games ADD COLUMN timer_elapsed_seconds INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'current_period'
  ) THEN
    -- current_period may already exist, only add if missing
    ALTER TABLE games ADD COLUMN current_period INTEGER DEFAULT 1;
  END IF;
END $$;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
