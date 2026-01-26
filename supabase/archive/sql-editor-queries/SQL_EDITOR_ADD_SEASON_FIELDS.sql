-- ============================================
-- Add Season Schedule Management Fields
-- Run this in Supabase SQL Editor
-- ============================================

-- Add new columns to seasons table
ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS total_games INTEGER,
ADD COLUMN IF NOT EXISTS playoff_format TEXT DEFAULT 'none' CHECK (playoff_format IN ('none', 'single_elimination', 'double_elimination', 'round_robin')),
ADD COLUMN IF NOT EXISTS draft_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS schedule_generated BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN seasons.total_games IS 'Total number of games to be played in the regular season';
COMMENT ON COLUMN seasons.playoff_format IS 'Playoff format: none, single_elimination, double_elimination, or round_robin';
COMMENT ON COLUMN seasons.draft_scheduled_at IS 'Scheduled date and time for the draft';
COMMENT ON COLUMN seasons.schedule_generated IS 'Whether the season schedule has been generated';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'seasons'
  AND column_name IN ('total_games', 'playoff_format', 'draft_scheduled_at', 'schedule_generated')
ORDER BY column_name;
