-- ============================================
-- Legacy Players Import System
-- Run this in Supabase SQL Editor
-- ============================================

-- Create legacy players table (for players without accounts)
CREATE TABLE IF NOT EXISTS legacy_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  -- Player stats
  games_played INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  points_per_game NUMERIC(5, 2) DEFAULT 0,
  wins INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  win_percentage NUMERIC(5, 2) DEFAULT 0,
  moosehead_cup_wins INTEGER DEFAULT 0,
  -- Goalie stats (if applicable)
  is_goalie BOOLEAN DEFAULT FALSE,
  goals_against INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shutouts INTEGER DEFAULT 0,
  goals_against_average NUMERIC(5, 2) DEFAULT 0,
  save_percentage NUMERIC(5, 2) DEFAULT 0,
  -- Matching
  matched_to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  -- Metadata
  imported_from TEXT DEFAULT 'hockeylifehl.com',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(first_name, last_name)
);

CREATE INDEX IF NOT EXISTS idx_legacy_players_name ON legacy_players(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_legacy_players_matched ON legacy_players(matched_to_profile_id);

COMMENT ON TABLE legacy_players IS 'Historical player stats from old system (pre-account era)';
COMMENT ON COLUMN legacy_players.matched_to_profile_id IS 'If a user creates an account with matching name, link here';

-- Create view for combined player stats (legacy + current)
CREATE OR REPLACE VIEW player_career_stats AS
SELECT 
  COALESCE(p.id, lp.matched_to_profile_id) as player_id,
  COALESCE(p.full_name, lp.full_name) as full_name,
  -- Legacy stats
  COALESCE(lp.games_played, 0) as legacy_games_played,
  COALESCE(lp.goals, 0) as legacy_goals,
  COALESCE(lp.assists, 0) as legacy_assists,
  COALESCE(lp.points, 0) as legacy_points,
  COALESCE(lp.wins, 0) as legacy_wins,
  COALESCE(lp.ties, 0) as legacy_ties,
  COALESCE(lp.moosehead_cup_wins, 0) as legacy_moosehead_cup_wins,
  -- Current stats (from player_stats table)
  COALESCE(SUM(CASE WHEN g.status = 'completed' AND g.home_captain_verified = true AND g.away_captain_verified = true THEN 1 ELSE 0 END), 0) as current_games_played,
  COALESCE(SUM(ps.goals), 0) as current_goals,
  COALESCE(SUM(ps.assists), 0) as current_assists,
  COALESCE(SUM(ps.goals + ps.assists), 0) as current_points,
  -- Combined totals
  COALESCE(lp.games_played, 0) + COALESCE(COUNT(DISTINCT CASE WHEN g.status = 'completed' AND g.home_captain_verified = true AND g.away_captain_verified = true THEN ps.game_id END), 0) as total_games_played,
  COALESCE(lp.goals, 0) + COALESCE(SUM(ps.goals), 0) as total_goals,
  COALESCE(lp.assists, 0) + COALESCE(SUM(ps.assists), 0) as total_assists,
  COALESCE(lp.points, 0) + COALESCE(SUM(ps.goals + ps.assists), 0) as total_points,
  COALESCE(lp.moosehead_cup_wins, 0) as total_moosehead_cup_wins
FROM legacy_players lp
FULL OUTER JOIN profiles p ON p.id = lp.matched_to_profile_id OR (
  LOWER(TRIM(p.full_name)) = LOWER(TRIM(lp.full_name))
)
LEFT JOIN player_stats ps ON ps.player_id = p.id
LEFT JOIN games g ON g.id = ps.game_id
GROUP BY 
  COALESCE(p.id, lp.matched_to_profile_id),
  COALESCE(p.full_name, lp.full_name),
  lp.games_played, lp.goals, lp.assists, lp.points, lp.wins, lp.ties, lp.moosehead_cup_wins;

-- Function to match legacy player to new profile
CREATE OR REPLACE FUNCTION match_legacy_player_to_profile(
  legacy_player_id UUID,
  profile_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE legacy_players
  SET 
    matched_to_profile_id = profile_id,
    matched_at = NOW(),
    updated_at = NOW()
  WHERE id = legacy_player_id;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-match on profile creation (trigger)
CREATE OR REPLACE FUNCTION auto_match_legacy_player()
RETURNS TRIGGER AS $$
DECLARE
  matched_legacy_id UUID;
BEGIN
  -- Try to find a legacy player with matching name
  SELECT id INTO matched_legacy_id
  FROM legacy_players
  WHERE matched_to_profile_id IS NULL
    AND LOWER(TRIM(full_name)) = LOWER(TRIM(NEW.full_name))
  LIMIT 1;
  
  IF matched_legacy_id IS NOT NULL THEN
    UPDATE legacy_players
    SET 
      matched_to_profile_id = NEW.id,
      matched_at = NOW(),
      updated_at = NOW()
    WHERE id = matched_legacy_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-match on profile creation
DROP TRIGGER IF EXISTS trigger_auto_match_legacy_player ON profiles;
CREATE TRIGGER trigger_auto_match_legacy_player
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_match_legacy_player();

-- RLS Policies for legacy_players
ALTER TABLE legacy_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legacy players are viewable by everyone" ON legacy_players
  FOR SELECT USING (true);

CREATE POLICY "Only owners can manage legacy players" ON legacy_players
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- Verify tables created
SELECT 
  'legacy_players' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'legacy_players'
ORDER BY ordinal_position;
