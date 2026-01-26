-- ============================================
-- Fix player_career_stats View (Performance Optimized)
-- This fixes the FULL OUTER JOIN issue and improves performance
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop the old view
DROP VIEW IF EXISTS player_career_stats;

-- Create a fixed view using UNION instead of FULL OUTER JOIN
CREATE OR REPLACE VIEW player_career_stats AS
WITH matched_legacy_stats AS (
  SELECT 
    lp.matched_to_profile_id as player_id,
    lp.full_name,
    lp.games_played as legacy_games_played,
    lp.goals as legacy_goals,
    lp.assists as legacy_assists,
    lp.points as legacy_points,
    lp.wins as legacy_wins,
    lp.ties as legacy_ties,
    lp.moosehead_cup_wins as legacy_moosehead_cup_wins
  FROM legacy_players lp
  WHERE lp.matched_to_profile_id IS NOT NULL
),
current_stats AS (
  SELECT 
    p.id as player_id,
    p.full_name,
    COUNT(DISTINCT CASE WHEN g.status = 'completed' AND g.home_captain_verified = true AND g.away_captain_verified = true THEN ps.game_id END) as current_games_played,
    COALESCE(SUM(CASE WHEN g.status = 'completed' AND g.home_captain_verified = true AND g.away_captain_verified = true THEN ps.goals ELSE 0 END), 0) as current_goals,
    COALESCE(SUM(CASE WHEN g.status = 'completed' AND g.home_captain_verified = true AND g.away_captain_verified = true THEN ps.assists ELSE 0 END), 0) as current_assists,
    COALESCE(SUM(CASE WHEN g.status = 'completed' AND g.home_captain_verified = true AND g.away_captain_verified = true THEN ps.goals + ps.assists ELSE 0 END), 0) as current_points
  FROM profiles p
  LEFT JOIN player_stats ps ON ps.player_id = p.id
  LEFT JOIN games g ON g.id = ps.game_id
  GROUP BY p.id, p.full_name
)
SELECT 
  COALESCE(cs.player_id, mls.player_id) as player_id,
  COALESCE(cs.full_name, mls.full_name) as full_name,
  COALESCE(mls.legacy_games_played, 0) as legacy_games_played,
  COALESCE(mls.legacy_goals, 0) as legacy_goals,
  COALESCE(mls.legacy_assists, 0) as legacy_assists,
  COALESCE(mls.legacy_points, 0) as legacy_points,
  COALESCE(mls.legacy_wins, 0) as legacy_wins,
  COALESCE(mls.legacy_ties, 0) as legacy_ties,
  COALESCE(mls.legacy_moosehead_cup_wins, 0) as legacy_moosehead_cup_wins,
  COALESCE(cs.current_games_played, 0) as current_games_played,
  COALESCE(cs.current_goals, 0) as current_goals,
  COALESCE(cs.current_assists, 0) as current_assists,
  COALESCE(cs.current_points, 0) as current_points,
  -- Combined totals
  COALESCE(mls.legacy_games_played, 0) + COALESCE(cs.current_games_played, 0) as total_games_played,
  COALESCE(mls.legacy_goals, 0) + COALESCE(cs.current_goals, 0) as total_goals,
  COALESCE(mls.legacy_assists, 0) + COALESCE(cs.current_assists, 0) as total_assists,
  COALESCE(mls.legacy_points, 0) + COALESCE(cs.current_points, 0) as total_points,
  COALESCE(mls.legacy_moosehead_cup_wins, 0) as total_moosehead_cup_wins
FROM current_stats cs
LEFT JOIN matched_legacy_stats mls ON cs.player_id = mls.player_id

UNION ALL

-- Add unmatched legacy players (no profile match)
SELECT 
  NULL as player_id,
  lp.full_name,
  lp.games_played as legacy_games_played,
  lp.goals as legacy_goals,
  lp.assists as legacy_assists,
  lp.points as legacy_points,
  lp.wins as legacy_wins,
  lp.ties as legacy_ties,
  lp.moosehead_cup_wins as legacy_moosehead_cup_wins,
  0 as current_games_played,
  0 as current_goals,
  0 as current_assists,
  0 as current_points,
  lp.games_played as total_games_played,
  lp.goals as total_goals,
  lp.assists as total_assists,
  lp.points as total_points,
  lp.moosehead_cup_wins as total_moosehead_cup_wins
FROM legacy_players lp
WHERE lp.matched_to_profile_id IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_stats_player_game ON player_stats(player_id, game_id);
CREATE INDEX IF NOT EXISTS idx_games_status_verified ON games(status, home_captain_verified, away_captain_verified);
CREATE INDEX IF NOT EXISTS idx_player_stats_season_game ON player_stats(season_id, game_id) WHERE season_id IS NOT NULL;

-- Verify the view works
SELECT COUNT(*) as total_players FROM player_career_stats WHERE total_games_played > 0;
