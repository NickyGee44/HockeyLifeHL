-- ==============================================================================
-- MULTI-TENANT MIGRATION: Add league_id to Games and Stats Tables
-- ==============================================================================
-- Description: Adds league_id foreign key to games, player_stats, and goalie_stats
-- Priority: HIGH - Required for multi-tenant game and stat tracking
-- Author: Agent 1 - Database & Infrastructure
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: games (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE games
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_games_league_id ON games(league_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_games_league_season
ON games(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_games_league_status
ON games(league_id, status);

CREATE INDEX IF NOT EXISTS idx_games_league_scheduled
ON games(league_id, scheduled_at);

-- ==============================================================================
-- TABLE: player_stats (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE player_stats
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_player_stats_league_id ON player_stats(league_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_player_stats_league_player
ON player_stats(league_id, player_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_league_season
ON player_stats(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_league_game
ON player_stats(league_id, game_id);

-- ==============================================================================
-- TABLE: goalie_stats (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE goalie_stats
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_goalie_stats_league_id ON goalie_stats(league_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_goalie_stats_league_player
ON goalie_stats(league_id, player_id);

CREATE INDEX IF NOT EXISTS idx_goalie_stats_league_season
ON goalie_stats(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_goalie_stats_league_game
ON goalie_stats(league_id, game_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on tables (if not already enabled)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE goalie_stats ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES: games
-- ==============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view games in their leagues" ON games;
DROP POLICY IF EXISTS "League admins can manage games" ON games;
DROP POLICY IF EXISTS "Captains can verify games" ON games;
DROP POLICY IF EXISTS "Service role has full access to games" ON games;

-- Users can view games in leagues they belong to
CREATE POLICY "Users can view games in their leagues"
  ON games FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins can manage games
CREATE POLICY "League admins can manage games"
  ON games FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Team captains can verify games (UPDATE only for their team's games)
CREATE POLICY "Captains can verify games"
  ON games FOR UPDATE
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND (
      home_team_id IN (SELECT id FROM teams WHERE captain_id = auth.uid())
      OR away_team_id IN (SELECT id FROM teams WHERE captain_id = auth.uid())
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to games"
  ON games FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: player_stats
-- ==============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view player stats in their leagues" ON player_stats;
DROP POLICY IF EXISTS "League admins and scorekeepers can manage player stats" ON player_stats;
DROP POLICY IF EXISTS "Service role has full access to player stats" ON player_stats;

-- Users can view player stats in leagues they belong to
CREATE POLICY "Users can view player stats in their leagues"
  ON player_stats FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins/scorekeepers can manage player stats
CREATE POLICY "League admins and scorekeepers can manage player stats"
  ON player_stats FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'scorekeeper')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to player stats"
  ON player_stats FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: goalie_stats
-- ==============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view goalie stats in their leagues" ON goalie_stats;
DROP POLICY IF EXISTS "League admins and scorekeepers can manage goalie stats" ON goalie_stats;
DROP POLICY IF EXISTS "Service role has full access to goalie stats" ON goalie_stats;

-- Users can view goalie stats in leagues they belong to
CREATE POLICY "Users can view goalie stats in their leagues"
  ON goalie_stats FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins/scorekeepers can manage goalie stats
CREATE POLICY "League admins and scorekeepers can manage goalie stats"
  ON goalie_stats FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'scorekeeper')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to goalie stats"
  ON goalie_stats FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- IMPORTANT NOTES
-- ==============================================================================
--
-- After running this migration, you MUST:
-- 1. Run the data migration script to set league_id for existing records
-- 2. Add NOT NULL constraint after data is migrated:
--    ALTER TABLE games ALTER COLUMN league_id SET NOT NULL;
--    ALTER TABLE player_stats ALTER COLUMN league_id SET NOT NULL;
--    ALTER TABLE goalie_stats ALTER COLUMN league_id SET NOT NULL;
-- 3. Update all server actions to filter by league_id
-- 4. Test RLS policies with scorekeepers to ensure they can enter stats
--
-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- Next Steps:
-- 1. Run this in Supabase SQL Editor with service role
-- 2. Verify columns added
-- 3. Test RLS policies with different user roles
-- 4. Proceed with next migration for remaining tables
-- ==============================================================================
