-- Performance Indexes for Production
-- These indexes will dramatically improve query performance

-- Player Stats Indexes
CREATE INDEX IF NOT EXISTS idx_player_stats_season_game 
  ON player_stats(season_id, game_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_player_season 
  ON player_stats(player_id, season_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_team_season 
  ON player_stats(team_id, season_id);

-- Goalie Stats Indexes
CREATE INDEX IF NOT EXISTS idx_goalie_stats_season_game 
  ON goalie_stats(season_id, game_id);

CREATE INDEX IF NOT EXISTS idx_goalie_stats_player_season 
  ON goalie_stats(player_id, season_id);

CREATE INDEX IF NOT EXISTS idx_goalie_stats_team_season 
  ON goalie_stats(team_id, season_id);

-- Games Indexes (critical for verification queries)
CREATE INDEX IF NOT EXISTS idx_games_season_status_verified 
  ON games(season_id, status, home_captain_verified, away_captain_verified);

CREATE INDEX IF NOT EXISTS idx_games_season_status 
  ON games(season_id, status);

CREATE INDEX IF NOT EXISTS idx_games_scheduled_at 
  ON games(scheduled_at);

-- Team Rosters Indexes
CREATE INDEX IF NOT EXISTS idx_team_rosters_player_season 
  ON team_rosters(player_id, season_id);

CREATE INDEX IF NOT EXISTS idx_team_rosters_team_season 
  ON team_rosters(team_id, season_id);

-- Legacy Players Indexes
CREATE INDEX IF NOT EXISTS idx_legacy_players_matched_profile 
  ON legacy_players(matched_to_profile_id) 
  WHERE matched_to_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_players_is_goalie 
  ON legacy_players(is_goalie) 
  WHERE is_goalie IS NOT NULL;

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON profiles(role);

-- Seasons Indexes
CREATE INDEX IF NOT EXISTS idx_seasons_status_start_date 
  ON seasons(status, start_date);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_games_verified_completed 
  ON games(season_id) 
  WHERE status = 'completed' 
    AND home_captain_verified = true 
    AND away_captain_verified = true;

-- Analyze tables to update statistics
ANALYZE player_stats;
ANALYZE goalie_stats;
ANALYZE games;
ANALYZE team_rosters;
ANALYZE legacy_players;

