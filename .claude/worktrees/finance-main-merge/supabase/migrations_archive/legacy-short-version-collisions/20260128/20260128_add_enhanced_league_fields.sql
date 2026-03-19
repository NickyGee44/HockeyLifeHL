-- ==============================================================================
-- ADD ENHANCED LEAGUE FIELDS FOR SIGNUP FLOW
-- ==============================================================================
-- Purpose: Add additional fields to leagues table to capture more data during
--          the enhanced signup flow (7-step wizard with templates)
-- Date: January 28, 2026
-- Agent: Agent 4
-- Task: 1.2 from ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md
-- ==============================================================================

-- ==============================================================================
-- ADD NEW FIELDS
-- ==============================================================================

-- League Tagline (e.g., "For Fun, For Beers, For Glory")
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS tagline TEXT;

COMMENT ON COLUMN leagues.tagline IS 'Short catchy tagline for the league (e.g., "For Fun, For Beers, For Glory")';

-- Region (broader than city/state_province)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS region TEXT;

COMMENT ON COLUMN leagues.region IS 'Broader region identifier (e.g., "Greater Toronto Area", "Pacific Northwest")';

-- Team Count Estimate
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS team_count_estimate INTEGER;

COMMENT ON COLUMN leagues.team_count_estimate IS 'Estimated number of teams for planning and pricing (captured during signup)';

-- Season Format
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS season_format TEXT;

COMMENT ON COLUMN leagues.season_format IS 'Season timing format (e.g., "fall", "winter", "spring", "summer", "year-round")';

-- Expected Start Date
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS expected_start_date DATE;

COMMENT ON COLUMN leagues.expected_start_date IS 'Expected league start date (captured during signup for planning)';

-- League Type
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS league_type TEXT;

COMMENT ON COLUMN leagues.league_type IS 'Type of league (e.g., "recreational", "competitive", "co-ed", "youth", "adult")';

-- Features Enabled (JSONB for flexible feature toggles)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS features_enabled JSONB DEFAULT '{
  "drafts": true,
  "payments": false,
  "ai_recaps": true,
  "stats_tracking": true,
  "mobile_app": false
}'::jsonb;

COMMENT ON COLUMN leagues.features_enabled IS 'JSONB object tracking which features are enabled for this league';

-- Sport Type (standardized field)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT 'hockey';

COMMENT ON COLUMN leagues.sport IS 'Sport type (e.g., "hockey", "soccer", "basketball", "baseball")';

-- ==============================================================================
-- UPDATE EXISTING CONSTRAINTS
-- ==============================================================================

-- Update subscription_tier constraint to match new pricing tiers
-- Drop old constraint and add new one
ALTER TABLE leagues
DROP CONSTRAINT IF EXISTS valid_subscription_tier;

ALTER TABLE leagues
ADD CONSTRAINT valid_subscription_tier CHECK (
  subscription_tier IN ('free', 'starter', 'basic', 'pro', 'enterprise')
);

COMMENT ON CONSTRAINT valid_subscription_tier ON leagues IS 'Valid subscription tiers including new "starter" tier';

-- Add constraint for season_format
ALTER TABLE leagues
ADD CONSTRAINT valid_season_format CHECK (
  season_format IS NULL OR
  season_format IN ('fall', 'winter', 'spring', 'summer', 'year-round', 'custom')
);

-- Add constraint for league_type
ALTER TABLE leagues
ADD CONSTRAINT valid_league_type CHECK (
  league_type IS NULL OR
  league_type IN ('recreational', 'competitive', 'co-ed', 'youth', 'adult', 'mixed', 'custom')
);

-- Add constraint for sport
ALTER TABLE leagues
ADD CONSTRAINT valid_sport CHECK (
  sport IN ('hockey', 'soccer', 'basketball', 'baseball', 'softball', 'volleyball', 'football', 'lacrosse', 'other')
);

-- ==============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ==============================================================================

-- Index on league_type for filtering
CREATE INDEX IF NOT EXISTS idx_leagues_league_type
  ON leagues(league_type)
  WHERE league_type IS NOT NULL;

-- Index on season_format for filtering
CREATE INDEX IF NOT EXISTS idx_leagues_season_format
  ON leagues(season_format)
  WHERE season_format IS NOT NULL;

-- Index on expected_start_date for upcoming leagues
CREATE INDEX IF NOT EXISTS idx_leagues_expected_start_date
  ON leagues(expected_start_date)
  WHERE expected_start_date IS NOT NULL;

-- Index on sport for filtering by sport type
CREATE INDEX IF NOT EXISTS idx_leagues_sport
  ON leagues(sport);

-- GIN index on features_enabled for JSONB queries
CREATE INDEX IF NOT EXISTS idx_leagues_features_enabled
  ON leagues USING GIN (features_enabled);

-- ==============================================================================
-- UPDATE DEFAULT VALUES FOR EXISTING RECORDS (OPTIONAL)
-- ==============================================================================

-- Set default sport to 'hockey' for existing leagues without sport specified
UPDATE leagues
SET sport = 'hockey'
WHERE sport IS NULL;

-- Set default features_enabled for existing leagues that don't have it
UPDATE leagues
SET features_enabled = '{
  "drafts": true,
  "payments": false,
  "ai_recaps": true,
  "stats_tracking": true,
  "mobile_app": false
}'::jsonb
WHERE features_enabled IS NULL;

-- ==============================================================================
-- VERIFY MIGRATION
-- ==============================================================================

DO $$
BEGIN
  -- Check if all new columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'tagline') THEN
    RAISE EXCEPTION 'Migration failed: tagline column not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'region') THEN
    RAISE EXCEPTION 'Migration failed: region column not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'team_count_estimate') THEN
    RAISE EXCEPTION 'Migration failed: team_count_estimate column not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'season_format') THEN
    RAISE EXCEPTION 'Migration failed: season_format column not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'expected_start_date') THEN
    RAISE EXCEPTION 'Migration failed: expected_start_date column not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'league_type') THEN
    RAISE EXCEPTION 'Migration failed: league_type column not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'features_enabled') THEN
    RAISE EXCEPTION 'Migration failed: features_enabled column not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'sport') THEN
    RAISE EXCEPTION 'Migration failed: sport column not created';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Enhanced league fields migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 New Fields Added:';
  RAISE NOTICE '  - tagline (TEXT)';
  RAISE NOTICE '  - region (TEXT)';
  RAISE NOTICE '  - team_count_estimate (INTEGER)';
  RAISE NOTICE '  - season_format (TEXT with constraints)';
  RAISE NOTICE '  - expected_start_date (DATE)';
  RAISE NOTICE '  - league_type (TEXT with constraints)';
  RAISE NOTICE '  - features_enabled (JSONB)';
  RAISE NOTICE '  - sport (TEXT with constraints)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Updates:';
  RAISE NOTICE '  - subscription_tier constraint updated with "starter" tier';
  RAISE NOTICE '  - Added 5 new indexes for query performance';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Existing leagues updated with default values';
  RAISE NOTICE '';
END $$;
