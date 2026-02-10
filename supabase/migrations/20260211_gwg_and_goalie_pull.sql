-- ==============================================================================
-- MIGRATION: GWG Tracking and Goalie Pull State
-- ==============================================================================
-- Description: Adds is_gwg to game_events and goalie pull tracking to games
-- Author: Claude Agent
-- Date: February 11, 2026
-- ==============================================================================

DO $$
BEGIN
  -- Add GWG flag to game_events
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'is_gwg'
  ) THEN
    ALTER TABLE game_events ADD COLUMN is_gwg BOOLEAN DEFAULT false;
  END IF;

  -- Add goalie pull tracking to games
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'home_goalie_pulled'
  ) THEN
    ALTER TABLE games ADD COLUMN home_goalie_pulled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'away_goalie_pulled'
  ) THEN
    ALTER TABLE games ADD COLUMN away_goalie_pulled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
