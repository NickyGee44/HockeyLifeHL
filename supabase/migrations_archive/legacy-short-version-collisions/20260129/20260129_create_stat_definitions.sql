-- ==============================================================================
-- BMHL STAT DEFINITIONS MIGRATION
-- ==============================================================================
-- Description: Creates stat_definitions table for customizable stats tracking
-- Purpose: Support BMHL's custom stat categories and display preferences
-- Author: BMHL Implementation - Phase 1A
-- Date: January 29, 2026
-- Related: BMHL_GAP_ANALYSIS.md, BMHL_UI_REQUIREMENTS.md
-- ==============================================================================

-- ==============================================================================
-- TABLE: stat_definitions
-- ==============================================================================
-- Purpose: Define which stats are tracked and how they're displayed per league
-- Multi-tenant: Scoped by league_id (NULL = system-wide default)

CREATE TABLE IF NOT EXISTS stat_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant (NULL = system default stat available to all leagues)
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,

  -- Stat identification
  stat_key TEXT NOT NULL, -- Unique key: 'goals', 'assists', 'pim', 'gaa', etc.
  stat_name TEXT NOT NULL, -- Display name: 'Goals', 'Assists', 'PIM', 'GAA', etc.
  stat_abbreviation TEXT, -- Short form: 'G', 'A', 'PIM', 'GAA', etc.

  -- Category
  category TEXT NOT NULL CHECK (category IN (
    'skater_offense',  -- Goals, Assists, Points
    'skater_defense',  -- +/-, Blocks, Hits
    'skater_discipline', -- PIM, Misconducts
    'goalie_performance', -- GAA, SV%, Wins
    'goalie_counting',  -- Saves, Shots Against
    'team_offense',    -- Team goals, PP%
    'team_defense',    -- Team goals against, PK%
    'custom'           -- League-specific custom stat
  )),

  -- Display configuration
  display_order INTEGER DEFAULT 0, -- Order to display stats (lower = first)
  display_format TEXT DEFAULT 'number', -- 'number', 'decimal', 'percentage', 'time'
  decimal_places INTEGER DEFAULT 0, -- For decimal/percentage formats

  -- Visibility
  is_active BOOLEAN DEFAULT true,
  show_in_player_profile BOOLEAN DEFAULT true,
  show_in_game_stats BOOLEAN DEFAULT true,
  show_in_leaderboard BOOLEAN DEFAULT true,
  show_in_team_stats BOOLEAN DEFAULT false,

  -- Calculation rules (for derived stats)
  is_calculated BOOLEAN DEFAULT false, -- True if stat is calculated from others
  calculation_formula TEXT, -- SQL expression or formula (e.g., 'goals + assists' for points)

  -- Description
  description TEXT, -- What this stat measures
  help_text TEXT, -- Tooltip/help text for users

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  UNIQUE(league_id, stat_key), -- Each league can define a stat_key once
  CONSTRAINT valid_decimal_places CHECK (decimal_places >= 0 AND decimal_places <= 4)
);

-- Indexes for performance
CREATE INDEX idx_stat_definitions_league_id ON stat_definitions(league_id);
CREATE INDEX idx_stat_definitions_stat_key ON stat_definitions(stat_key);
CREATE INDEX idx_stat_definitions_category ON stat_definitions(category);
CREATE INDEX idx_stat_definitions_active ON stat_definitions(league_id, is_active)
  WHERE is_active = true;

-- Composite index for stat display queries
CREATE INDEX idx_stat_definitions_display ON stat_definitions(
  league_id,
  category,
  display_order ASC
) WHERE is_active = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_stat_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stat_definitions_updated_at
  BEFORE UPDATE ON stat_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_stat_definitions_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE stat_definitions ENABLE ROW LEVEL SECURITY;

-- Public can view active stat definitions
DROP POLICY IF EXISTS "Public can view stat definitions" ON stat_definitions;
CREATE POLICY "Public can view stat definitions"
  ON stat_definitions FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (
      league_id IS NULL  -- System defaults
      OR league_id IN (
        SELECT league_id FROM league_memberships
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- League admins can manage their stat definitions
DROP POLICY IF EXISTS "League admins can manage stat definitions" ON stat_definitions;
CREATE POLICY "League admins can manage stat definitions"
  ON stat_definitions FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Service role has full access
DROP POLICY IF EXISTS "Service role has full access to stat definitions" ON stat_definitions;
CREATE POLICY "Service role has full access to stat definitions"
  ON stat_definitions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- GRANT PERMISSIONS
-- ==============================================================================

GRANT SELECT ON stat_definitions TO authenticated;
GRANT SELECT ON stat_definitions TO anon;
GRANT ALL ON stat_definitions TO service_role;

-- ==============================================================================
-- SEED SYSTEM DEFAULT STATS
-- ==============================================================================
-- Insert standard hockey stats available to all leagues (league_id = NULL)

INSERT INTO stat_definitions (league_id, stat_key, stat_name, stat_abbreviation, category, display_order, display_format, decimal_places, is_calculated, calculation_formula, description, show_in_player_profile, show_in_game_stats, show_in_leaderboard, show_in_team_stats)
VALUES
  -- Skater Offense
  (NULL, 'games_played', 'Games Played', 'GP', 'skater_offense', 1, 'number', 0, false, NULL, 'Total games played', true, false, true, false),
  (NULL, 'goals', 'Goals', 'G', 'skater_offense', 2, 'number', 0, false, NULL, 'Goals scored', true, true, true, true),
  (NULL, 'assists', 'Assists', 'A', 'skater_offense', 3, 'number', 0, false, NULL, 'Assists recorded', true, true, true, true),
  (NULL, 'points', 'Points', 'PTS', 'skater_offense', 4, 'number', 0, true, 'goals + assists', 'Total points (goals + assists)', true, true, true, true),
  (NULL, 'power_play_goals', 'Power Play Goals', 'PPG', 'skater_offense', 5, 'number', 0, false, NULL, 'Goals scored on power play', true, true, true, false),
  (NULL, 'short_handed_goals', 'Short Handed Goals', 'SHG', 'skater_offense', 6, 'number', 0, false, NULL, 'Goals scored while short-handed', true, true, true, false),
  (NULL, 'game_winning_goals', 'Game Winning Goals', 'GWG', 'skater_offense', 7, 'number', 0, false, NULL, 'Game-winning goals', true, true, true, false),
  (NULL, 'shots', 'Shots on Goal', 'SOG', 'skater_offense', 8, 'number', 0, false, NULL, 'Shots on goal', true, true, false, false),
  (NULL, 'shooting_percentage', 'Shooting Percentage', 'SH%', 'skater_offense', 9, 'percentage', 1, true, '(goals / NULLIF(shots, 0)) * 100', 'Shooting percentage', true, false, true, false),

  -- Skater Discipline
  (NULL, 'penalty_minutes', 'Penalty Minutes', 'PIM', 'skater_discipline', 20, 'number', 0, false, NULL, 'Penalty minutes accumulated', true, true, true, false),
  (NULL, 'major_penalties', 'Major Penalties', 'MAJ', 'skater_discipline', 21, 'number', 0, false, NULL, 'Major penalties taken', true, true, false, false),
  (NULL, 'misconducts', 'Misconducts', 'MIS', 'skater_discipline', 22, 'number', 0, false, NULL, 'Misconduct penalties', true, true, false, false),
  (NULL, 'game_misconducts', 'Game Misconducts', 'GM', 'skater_discipline', 23, 'number', 0, false, NULL, 'Game misconduct penalties', true, true, false, false),

  -- Skater Defense (optional, not always tracked in beer league)
  (NULL, 'plus_minus', 'Plus/Minus', '+/-', 'skater_defense', 30, 'number', 0, false, NULL, 'Plus/minus rating', false, false, false, false),
  (NULL, 'blocked_shots', 'Blocked Shots', 'BLK', 'skater_defense', 31, 'number', 0, false, NULL, 'Shots blocked', false, true, false, false),
  (NULL, 'hits', 'Hits', 'HIT', 'skater_defense', 32, 'number', 0, false, NULL, 'Body checks delivered', false, true, false, false),

  -- Goalie Performance
  (NULL, 'goalie_games_played', 'Games Played', 'GP', 'goalie_performance', 40, 'number', 0, false, NULL, 'Games played as goalie', true, false, true, false),
  (NULL, 'wins', 'Wins', 'W', 'goalie_performance', 41, 'number', 0, false, NULL, 'Games won', true, true, true, false),
  (NULL, 'losses', 'Losses', 'L', 'goalie_performance', 42, 'number', 0, false, NULL, 'Games lost', true, true, true, false),
  (NULL, 'ties', 'Ties/OTL', 'T', 'goalie_performance', 43, 'number', 0, false, NULL, 'Ties or overtime losses', true, true, false, false),
  (NULL, 'goals_against_average', 'Goals Against Average', 'GAA', 'goalie_performance', 44, 'decimal', 2, true, 'goals_against / (NULLIF(minutes_played, 0) / 60)', 'Average goals against per 60 minutes', true, true, true, false),
  (NULL, 'save_percentage', 'Save Percentage', 'SV%', 'goalie_performance', 45, 'decimal', 3, true, 'saves / NULLIF(shots_against, 0)', 'Save percentage', true, true, true, false),
  (NULL, 'shutouts', 'Shutouts', 'SO', 'goalie_performance', 46, 'number', 0, false, NULL, 'Games with zero goals against', true, true, true, false),

  -- Goalie Counting Stats
  (NULL, 'minutes_played', 'Minutes Played', 'MIN', 'goalie_counting', 50, 'number', 0, false, NULL, 'Total minutes played in goal', true, false, false, false),
  (NULL, 'shots_against', 'Shots Against', 'SA', 'goalie_counting', 51, 'number', 0, false, NULL, 'Total shots faced', true, true, false, false),
  (NULL, 'saves', 'Saves', 'SV', 'goalie_counting', 52, 'number', 0, false, NULL, 'Total saves made', true, true, false, false),
  (NULL, 'goals_against', 'Goals Against', 'GA', 'goalie_counting', 53, 'number', 0, false, NULL, 'Total goals allowed', true, true, false, false),

  -- Team Stats
  (NULL, 'team_goals_for', 'Goals For', 'GF', 'team_offense', 60, 'number', 0, false, NULL, 'Team total goals scored', false, false, false, true),
  (NULL, 'team_goals_against', 'Goals Against', 'GA', 'team_defense', 61, 'number', 0, false, NULL, 'Team total goals allowed', false, false, false, true),
  (NULL, 'team_goal_differential', 'Goal Differential', 'DIFF', 'team_offense', 62, 'number', 0, true, 'team_goals_for - team_goals_against', 'Goal differential', false, false, false, true),
  (NULL, 'team_power_play_percentage', 'Power Play %', 'PP%', 'team_offense', 63, 'percentage', 1, true, '(power_play_goals / NULLIF(power_play_opportunities, 0)) * 100', 'Power play success rate', false, false, false, true),
  (NULL, 'team_penalty_kill_percentage', 'Penalty Kill %', 'PK%', 'team_defense', 64, 'percentage', 1, true, '((power_play_opportunities_against - power_play_goals_against) / NULLIF(power_play_opportunities_against, 0)) * 100', 'Penalty kill success rate', false, false, false, true)

ON CONFLICT (league_id, stat_key) DO NOTHING;

-- ==============================================================================
-- HELPER FUNCTION: Get Stats for Category
-- ==============================================================================
-- Function to get all active stats for a specific category

CREATE OR REPLACE FUNCTION get_stats_for_category(
  league_id_param UUID,
  category_param TEXT
)
RETURNS TABLE (
  id UUID,
  stat_key TEXT,
  stat_name TEXT,
  stat_abbreviation TEXT,
  display_format TEXT,
  decimal_places INTEGER,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sd.id,
    sd.stat_key,
    sd.stat_name,
    sd.stat_abbreviation,
    sd.display_format,
    sd.decimal_places,
    sd.display_order
  FROM stat_definitions sd
  WHERE sd.category = category_param
    AND sd.is_active = true
    AND (sd.league_id = league_id_param OR sd.league_id IS NULL)
  ORDER BY sd.display_order ASC, sd.stat_name ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_stats_for_category(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stats_for_category(UUID, TEXT) TO anon;

-- ==============================================================================
-- MIGRATION VERIFICATION
-- ==============================================================================

DO $$
DECLARE
  stat_count INTEGER;
BEGIN
  -- Verify table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stat_definitions') THEN
    RAISE EXCEPTION 'Migration failed: stat_definitions table not created';
  END IF;

  -- Verify system stats were seeded
  SELECT COUNT(*) INTO stat_count
  FROM stat_definitions
  WHERE league_id IS NULL;

  IF stat_count < 30 THEN
    RAISE WARNING 'Expected at least 30 system stat definitions, found %', stat_count;
  END IF;

  RAISE NOTICE 'Migration completed successfully: stat_definitions table created with % system stats', stat_count;
END $$;
