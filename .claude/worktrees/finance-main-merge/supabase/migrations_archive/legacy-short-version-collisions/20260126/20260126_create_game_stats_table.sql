-- ==============================================================================
-- CREATE game_stats TABLE - Multi-Tenant
-- ==============================================================================
-- Purpose: Track individual player stats during games (goals, assists, saves, etc.)
-- Agent: Agent 1 - Database & Infrastructure
-- Date: January 26, 2026
-- Priority: CRITICAL - Blocking Agent 2 and Agent 4
-- ==============================================================================

-- ==============================================================================
-- TABLE: game_stats
-- ==============================================================================
CREATE TABLE IF NOT EXISTS game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Stat Details
  stat_type TEXT NOT NULL CHECK (stat_type IN ('Goal', 'Assist', 'Shot', 'Save', 'PIM')),
  value INTEGER NOT NULL DEFAULT 1, -- For PIMs, this is the number of minutes
  period TEXT NOT NULL CHECK (period IN ('1', '2', '3', 'OT', 'SO')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- When the stat occurred in the game

  -- Game Context
  team_type TEXT NOT NULL CHECK (team_type IN ('home', 'away')),

  -- Tracking
  entered_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL, -- The scorekeeper who entered this stat
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_value CHECK (value >= 0)
);

-- ==============================================================================
-- INDEXES for Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_game_stats_league_id ON game_stats(league_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_game_id ON game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_player_id ON game_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_team_id ON game_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_stat_type ON game_stats(stat_type);
CREATE INDEX IF NOT EXISTS idx_game_stats_period ON game_stats(period);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_game_stats_league_game ON game_stats(league_id, game_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_league_player ON game_stats(league_id, player_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_game_player ON game_stats(game_id, player_id);

-- ==============================================================================
-- COMMENTS
-- ==============================================================================
COMMENT ON TABLE game_stats IS 'Individual player statistics recorded during games';
COMMENT ON COLUMN game_stats.stat_type IS 'Type of stat: Goal, Assist, Shot, Save, or PIM (Penalty in Minutes)';
COMMENT ON COLUMN game_stats.value IS 'Value of the stat (e.g., 2 for a 2-minute penalty, 1 for goals/assists)';
COMMENT ON COLUMN game_stats.period IS 'Period when stat occurred: 1, 2, 3, OT, or SO';
COMMENT ON COLUMN game_stats.timestamp IS 'When the stat occurred during the game';
COMMENT ON COLUMN game_stats.team_type IS 'Whether this stat was for the home or away team';
COMMENT ON COLUMN game_stats.entered_by IS 'The scorekeeper who entered this stat';

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view stats for games in their leagues
CREATE POLICY "Users can view game stats in their leagues"
  ON game_stats FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Scorekeepers can insert stats for games they're assigned to
CREATE POLICY "Scorekeepers can insert game stats"
  ON game_stats FOR INSERT
  WITH CHECK (
    -- Must be a scorekeeper or admin/owner in the league
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = game_stats.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
    OR
    -- Or assigned as scorekeeper for this game
    EXISTS (
      SELECT 1 FROM game_scorekeeper_assignments
      WHERE game_id = game_stats.game_id
        AND scorekeeper_id = auth.uid()
    )
  );

-- Policy: Scorekeepers can update stats they entered
CREATE POLICY "Scorekeepers can update their own game stats"
  ON game_stats FOR UPDATE
  USING (
    entered_by = auth.uid()
    OR
    -- Or if they're an admin/owner in the league
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = game_stats.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: Admins/owners can delete stats in their leagues
CREATE POLICY "Admins can delete game stats in their leagues"
  ON game_stats FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = game_stats.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- ==============================================================================
-- TRIGGER: Validate league_id consistency
-- ==============================================================================
CREATE OR REPLACE FUNCTION validate_game_stats_league_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure game belongs to the specified league
  IF NOT EXISTS (
    SELECT 1 FROM games WHERE id = NEW.game_id AND league_id = NEW.league_id
  ) THEN
    RAISE EXCEPTION 'Game does not belong to league %', NEW.league_id;
  END IF;

  -- Ensure team belongs to the specified league
  IF NOT EXISTS (
    SELECT 1 FROM teams WHERE id = NEW.team_id AND league_id = NEW.league_id
  ) THEN
    RAISE EXCEPTION 'Team does not belong to league %', NEW.league_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_game_stats_league_id
  BEFORE INSERT OR UPDATE ON game_stats
  FOR EACH ROW
  EXECUTE FUNCTION validate_game_stats_league_id();

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ game_stats table created successfully';
  RAISE NOTICE '✅ Indexes created for optimal performance';
  RAISE NOTICE '✅ RLS policies enabled for multi-tenant isolation';
  RAISE NOTICE '✅ Validation trigger added for league_id consistency';
END $$;
