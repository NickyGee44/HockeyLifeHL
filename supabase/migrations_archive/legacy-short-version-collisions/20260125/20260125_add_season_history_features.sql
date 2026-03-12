-- Extend seasons table to support league history page features
-- Adds photo galleries, summaries, and calculated stats for each season

-- Add new columns to seasons table
ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS photo_gallery_url TEXT[],
  ADD COLUMN IF NOT EXISTS season_summary TEXT,
  ADD COLUMN IF NOT EXISTS champion_team_id UUID REFERENCES teams(id),
  ADD COLUMN IF NOT EXISTS total_goals_scored INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_goals_per_game DECIMAL(5,2);

-- Create season_highlights table for photos and milestones
CREATE TABLE IF NOT EXISTS season_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  highlight_type TEXT NOT NULL CHECK (highlight_type IN ('photo', 'stat', 'milestone')),
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_season_highlights_season ON season_highlights(season_id);
CREATE INDEX IF NOT EXISTS idx_season_highlights_type ON season_highlights(highlight_type);
CREATE INDEX IF NOT EXISTS idx_season_highlights_order ON season_highlights(season_id, display_order);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_season_highlights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_season_highlights_updated_at
  BEFORE UPDATE ON season_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_season_highlights_updated_at();

-- Enable Row Level Security
ALTER TABLE season_highlights ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view highlights
CREATE POLICY "Season highlights are viewable by everyone"
  ON season_highlights FOR SELECT
  USING (true);

-- Policy: Only owners can manage highlights
CREATE POLICY "Only owners can create highlights"
  ON season_highlights FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can update highlights"
  ON season_highlights FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can delete highlights"
  ON season_highlights FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Function to calculate and update season stats
CREATE OR REPLACE FUNCTION calculate_season_stats(season_uuid UUID)
RETURNS void AS $$
DECLARE
  total_goals INT;
  total_games INT;
  avg_gpg DECIMAL(5,2);
  winner_team UUID;
BEGIN
  -- Calculate total goals scored in season
  SELECT COALESCE(SUM(home_score + away_score), 0)
  INTO total_goals
  FROM games
  WHERE season_id = season_uuid
    AND status = 'completed';

  -- Count total completed games
  SELECT COUNT(*)
  INTO total_games
  FROM games
  WHERE season_id = season_uuid
    AND status = 'completed';

  -- Calculate average goals per game
  IF total_games > 0 THEN
    avg_gpg := ROUND(total_goals::DECIMAL / total_games::DECIMAL, 2);
  ELSE
    avg_gpg := 0;
  END IF;

  -- Determine champion (team with most points)
  SELECT ts.team_id
  INTO winner_team
  FROM team_standings ts
  WHERE ts.season_id = season_uuid
  ORDER BY ts.points DESC, ts.wins DESC, (ts.goals_for - ts.goals_against) DESC
  LIMIT 1;

  -- Update seasons table
  UPDATE seasons
  SET
    total_goals_scored = total_goals,
    average_goals_per_game = avg_gpg,
    champion_team_id = winner_team
  WHERE id = season_uuid;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE season_highlights IS 'Stores photos, stats, and milestones for league history page';
COMMENT ON COLUMN seasons.photo_gallery_url IS 'Array of photo URLs for season gallery';
COMMENT ON COLUMN seasons.season_summary IS 'Text summary of season highlights and key events';
COMMENT ON COLUMN seasons.champion_team_id IS 'Team that won the championship';
COMMENT ON COLUMN seasons.total_goals_scored IS 'Total goals scored by all teams in season';
COMMENT ON COLUMN seasons.average_goals_per_game IS 'Average goals per game for the season';
COMMENT ON FUNCTION calculate_season_stats IS 'Calculates and updates season statistics (run after season completion)';
