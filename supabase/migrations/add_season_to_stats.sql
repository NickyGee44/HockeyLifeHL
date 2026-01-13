-- Add season_id to player_stats and goalie_stats for NHL-style data structure
-- This allows stats to be directly linked to seasons for better aggregation

-- Add season_id column to player_stats
ALTER TABLE player_stats 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;

-- Add season_id column to goalie_stats
ALTER TABLE goalie_stats 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;

-- Populate season_id from games for existing records
UPDATE player_stats ps
SET season_id = g.season_id
FROM games g
WHERE ps.game_id = g.id AND ps.season_id IS NULL;

UPDATE goalie_stats gs
SET season_id = g.season_id
FROM games g
WHERE gs.game_id = g.id AND gs.season_id IS NULL;

-- Make season_id NOT NULL after populating
ALTER TABLE player_stats 
ALTER COLUMN season_id SET NOT NULL;

ALTER TABLE goalie_stats 
ALTER COLUMN season_id SET NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_player_stats_season ON player_stats(season_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_season ON player_stats(player_id, season_id);
CREATE INDEX IF NOT EXISTS idx_goalie_stats_season ON goalie_stats(season_id);
CREATE INDEX IF NOT EXISTS idx_goalie_stats_player_season ON goalie_stats(player_id, season_id);

-- Create function to automatically set season_id when inserting stats
CREATE OR REPLACE FUNCTION set_stats_season_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get season_id from the game
  SELECT season_id INTO NEW.season_id
  FROM games
  WHERE id = NEW.game_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-set season_id
DROP TRIGGER IF EXISTS set_player_stats_season_id ON player_stats;
CREATE TRIGGER set_player_stats_season_id
  BEFORE INSERT OR UPDATE ON player_stats
  FOR EACH ROW
  WHEN (NEW.season_id IS NULL)
  EXECUTE FUNCTION set_stats_season_id();

DROP TRIGGER IF EXISTS set_goalie_stats_season_id ON goalie_stats;
CREATE TRIGGER set_goalie_stats_season_id
  BEFORE INSERT OR UPDATE ON goalie_stats
  FOR EACH ROW
  WHEN (NEW.season_id IS NULL)
  EXECUTE FUNCTION set_stats_season_id();

-- Create materialized view for player season stats (NHL-style)
DROP MATERIALIZED VIEW IF EXISTS player_season_stats_mv;
CREATE MATERIALIZED VIEW player_season_stats_mv AS
SELECT 
  ps.player_id,
  ps.season_id,
  tr.team_id,
  COUNT(DISTINCT ps.game_id) as games_played,
  SUM(ps.goals) as goals,
  SUM(ps.assists) as assists,
  SUM(ps.goals + ps.assists) as points,
  ROUND(AVG(ps.goals + ps.assists)::DECIMAL, 2) as points_per_game,
  ROUND(AVG(ps.goals)::DECIMAL, 2) as goals_per_game,
  ROUND(AVG(ps.assists)::DECIMAL, 2) as assists_per_game
FROM player_stats ps
JOIN games g ON ps.game_id = g.id
LEFT JOIN team_rosters tr ON ps.player_id = tr.player_id 
  AND ps.season_id = tr.season_id
  AND ps.team_id = tr.team_id
WHERE g.status = 'completed'
  AND g.home_captain_verified = true
  AND g.away_captain_verified = true
GROUP BY ps.player_id, ps.season_id, tr.team_id;

-- Create materialized view for goalie season stats (NHL-style)
DROP MATERIALIZED VIEW IF EXISTS goalie_season_stats_mv;
CREATE MATERIALIZED VIEW goalie_season_stats_mv AS
SELECT 
  gs.player_id,
  gs.season_id,
  tr.team_id,
  COUNT(DISTINCT gs.game_id) as games_played,
  SUM(gs.goals_against) as goals_against,
  SUM(gs.saves) as saves,
  COUNT(CASE WHEN gs.shutout THEN 1 END) as shutouts,
  ROUND(SUM(gs.goals_against)::DECIMAL / NULLIF(COUNT(DISTINCT gs.game_id), 0), 2) as gaa,
  ROUND(
    (SUM(gs.saves)::DECIMAL / NULLIF(SUM(gs.goals_against) + SUM(gs.saves), 0)) * 100, 
    2
  ) as save_percentage
FROM goalie_stats gs
JOIN games g ON gs.game_id = g.id
LEFT JOIN team_rosters tr ON gs.player_id = tr.player_id 
  AND gs.season_id = tr.season_id
  AND gs.team_id = tr.team_id
WHERE g.status = 'completed'
  AND g.home_captain_verified = true
  AND g.away_captain_verified = true
GROUP BY gs.player_id, gs.season_id, tr.team_id;

-- Create indexes on materialized views
CREATE INDEX IF NOT EXISTS idx_player_season_stats_mv_player ON player_season_stats_mv(player_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_mv_season ON player_season_stats_mv(season_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_mv_team ON player_season_stats_mv(team_id);
CREATE INDEX IF NOT EXISTS idx_goalie_season_stats_mv_player ON goalie_season_stats_mv(player_id);
CREATE INDEX IF NOT EXISTS idx_goalie_season_stats_mv_season ON goalie_season_stats_mv(season_id);
CREATE INDEX IF NOT EXISTS idx_goalie_season_stats_mv_team ON goalie_season_stats_mv(team_id);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_season_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY player_season_stats_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY goalie_season_stats_mv;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh views when stats are updated
CREATE OR REPLACE FUNCTION trigger_refresh_season_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh views asynchronously (in production, you might want to use a job queue)
  PERFORM refresh_season_stats();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We'll refresh views manually or via cron job for better performance
-- Automatic refresh on every insert would be too slow
