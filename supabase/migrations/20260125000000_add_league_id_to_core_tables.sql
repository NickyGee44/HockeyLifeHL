-- Canonicalized from legacy short migration version 20260125.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- ==============================================================================
-- MULTI-TENANT MIGRATION: Add league_id to Core Tables
-- ==============================================================================
-- Description: Adds league_id foreign key to teams, team_rosters, and seasons
-- Priority: CRITICAL - Blocks Agent 2 and Agent 3
-- Author: Agent 1 - Database & Infrastructure
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: teams (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON teams(league_id);

-- Add constraint for unique team names within a league
-- Note: Drop existing unique constraint on name if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teams_name_key' AND conrelid = 'teams'::regclass
  ) THEN
    ALTER TABLE teams DROP CONSTRAINT teams_name_key;
  END IF;
END $$;

-- Add new unique constraint scoped to league
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_team_name_per_league' AND conrelid = 'teams'::regclass
  ) THEN
    ALTER TABLE teams
    ADD CONSTRAINT unique_team_name_per_league UNIQUE (league_id, name);
  END IF;
END $$;

-- ==============================================================================
-- TABLE: seasons (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_seasons_league_id ON seasons(league_id);

-- Add constraint for unique season names within a league
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seasons_name_key' AND conrelid = 'seasons'::regclass
  ) THEN
    ALTER TABLE seasons DROP CONSTRAINT seasons_name_key;
  END IF;
END $$;

-- Add new unique constraint scoped to league
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_season_name_per_league' AND conrelid = 'seasons'::regclass
  ) THEN
    ALTER TABLE seasons
    ADD CONSTRAINT unique_season_name_per_league UNIQUE (league_id, name);
  END IF;
END $$;

-- ==============================================================================
-- TABLE: team_rosters (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE team_rosters
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_team_rosters_league_id ON team_rosters(league_id);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_team_rosters_league_season
ON team_rosters(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_team_rosters_league_player
ON team_rosters(league_id, player_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on tables (if not already enabled)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES: teams
-- ==============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view teams in their leagues" ON teams;

DROP POLICY IF EXISTS "League admins can manage teams" ON teams;

DROP POLICY IF EXISTS "Service role has full access to teams" ON teams;

-- Users can view teams in leagues they belong to
CREATE POLICY "Users can view teams in their leagues"
  ON teams FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins can manage teams
CREATE POLICY "League admins can manage teams"
  ON teams FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to teams"
  ON teams FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: seasons
-- ==============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view seasons in their leagues" ON seasons;

DROP POLICY IF EXISTS "League admins can manage seasons" ON seasons;

DROP POLICY IF EXISTS "Service role has full access to seasons" ON seasons;

-- Users can view seasons in leagues they belong to
CREATE POLICY "Users can view seasons in their leagues"
  ON seasons FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins can manage seasons
CREATE POLICY "League admins can manage seasons"
  ON seasons FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to seasons"
  ON seasons FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: team_rosters
-- ==============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view rosters in their leagues" ON team_rosters;

DROP POLICY IF EXISTS "League admins can manage rosters" ON team_rosters;

DROP POLICY IF EXISTS "Service role has full access to rosters" ON team_rosters;

-- Users can view rosters in leagues they belong to
CREATE POLICY "Users can view rosters in their leagues"
  ON team_rosters FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins can manage rosters
CREATE POLICY "League admins can manage rosters"
  ON team_rosters FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to rosters"
  ON team_rosters FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- IMPORTANT NOTES
-- ==============================================================================
--
-- After running this migration, you MUST:
-- 1. Run the data migration script to set league_id for existing records
-- 2. Add NOT NULL constraint after data is migrated:
--    ALTER TABLE teams ALTER COLUMN league_id SET NOT NULL;
--    ALTER TABLE seasons ALTER COLUMN league_id SET NOT NULL;
--    ALTER TABLE team_rosters ALTER COLUMN league_id SET NOT NULL;
-- 3. Update all server actions to filter by league_id
-- 4. Test RLS policies with multiple users in different leagues
--
-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- Next Steps:
-- 1. Run this in Supabase SQL Editor with service role
-- 2. Verify columns added: SELECT column_name FROM information_schema.columns WHERE table_name IN ('teams', 'seasons', 'team_rosters') AND column_name = 'league_id';
-- 3. Test RLS policies
-- 4. Notify Agent 2 that core tables are ready for backend integration
-- ==============================================================================;

