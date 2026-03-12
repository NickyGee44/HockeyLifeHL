-- Create player_goalie_matchups table to track head-to-head stats
-- This table stores historical performance of players against specific goalies

CREATE TABLE IF NOT EXISTS player_goalie_matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goalie_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0 NOT NULL CHECK (games_played >= 0),
  goals INTEGER DEFAULT 0 NOT NULL CHECK (goals >= 0),
  assists INTEGER DEFAULT 0 NOT NULL CHECK (assists >= 0),
  points INTEGER DEFAULT 0 NOT NULL CHECK (points >= 0),
  shots INTEGER DEFAULT 0 NOT NULL CHECK (shots >= 0),
  shooting_percentage DECIMAL(5,2),
  last_game_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (player_id, goalie_id, season_id),
  CHECK (player_id != goalie_id) -- Can't have matchup with yourself
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_goalie_matchups_player ON player_goalie_matchups(player_id);
CREATE INDEX IF NOT EXISTS idx_player_goalie_matchups_goalie ON player_goalie_matchups(goalie_id);
CREATE INDEX IF NOT EXISTS idx_player_goalie_matchups_season ON player_goalie_matchups(season_id);
CREATE INDEX IF NOT EXISTS idx_player_goalie_matchups_last_game ON player_goalie_matchups(last_game_at DESC);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_player_goalie_matchups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.points = NEW.goals + NEW.assists;
  NEW.shooting_percentage = CASE
    WHEN NEW.shots > 0 THEN ROUND((NEW.goals::DECIMAL / NEW.shots::DECIMAL) * 100, 2)
    ELSE NULL
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_goalie_matchups_updated_at
  BEFORE UPDATE ON player_goalie_matchups
  FOR EACH ROW
  EXECUTE FUNCTION update_player_goalie_matchups_updated_at();

-- Add trigger to calculate shooting percentage on insert
CREATE TRIGGER trigger_insert_player_goalie_matchups_calculations
  BEFORE INSERT ON player_goalie_matchups
  FOR EACH ROW
  EXECUTE FUNCTION update_player_goalie_matchups_updated_at();

-- Enable Row Level Security
ALTER TABLE player_goalie_matchups ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read matchup stats
CREATE POLICY "Matchup stats are viewable by everyone"
  ON player_goalie_matchups FOR SELECT
  USING (true);

-- Policy: Only authenticated users with proper role can insert/update
CREATE POLICY "Only captains and admins can update matchup stats"
  ON player_goalie_matchups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'captain')
    )
  );

CREATE POLICY "Only captains and admins can modify matchup stats"
  ON player_goalie_matchups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'captain')
    )
  );

-- Add comment for documentation
COMMENT ON TABLE player_goalie_matchups IS 'Tracks individual player performance statistics against specific goalies across seasons';
COMMENT ON COLUMN player_goalie_matchups.player_id IS 'The player (skater) being tracked';
COMMENT ON COLUMN player_goalie_matchups.goalie_id IS 'The opposing goalie';
COMMENT ON COLUMN player_goalie_matchups.season_id IS 'Season for these stats (NULL for all-time)';
COMMENT ON COLUMN player_goalie_matchups.shooting_percentage IS 'Calculated as (goals / shots) * 100';
