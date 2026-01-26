-- Add fields for season schedule management
-- total_games: Total number of games to be played in the season
-- playoff_format: Format for playoffs (single_elimination, double_elimination, round_robin, none)
-- draft_scheduled_at: When the draft will take place

ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS total_games INTEGER,
ADD COLUMN IF NOT EXISTS playoff_format TEXT DEFAULT 'none' CHECK (playoff_format IN ('none', 'single_elimination', 'double_elimination', 'round_robin')),
ADD COLUMN IF NOT EXISTS draft_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS schedule_generated BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN seasons.total_games IS 'Total number of games to be played in the regular season';
COMMENT ON COLUMN seasons.playoff_format IS 'Playoff format: none, single_elimination, double_elimination, or round_robin';
COMMENT ON COLUMN seasons.draft_scheduled_at IS 'Scheduled date and time for the draft';
COMMENT ON COLUMN seasons.schedule_generated IS 'Whether the season schedule has been generated';
