-- ==============================================================================
-- INSERT ALL LEGACY STATS: Player Stats + Goalie Stats
-- ==============================================================================
-- Description: Create mapping and insert all legacy stats in one transaction
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Create temporary mapping table
CREATE TEMP TABLE legacy_player_game_mapping AS
WITH numbered_players AS (
  SELECT
    lp.id as legacy_player_id,
    lp.matched_to_profile_id as profile_id,
    lp.full_name,
    lp.is_goalie,
    lp.goals,
    lp.assists,
    lp.saves,
    lp.goals_against,
    lp.shutouts,
    lp.wins,
    ROW_NUMBER() OVER (ORDER BY lp.full_name) as player_row_num
  FROM legacy_players lp
  WHERE lp.matched_to_profile_id IS NOT NULL
),
numbered_games AS (
  SELECT
    g.id as game_id,
    g.season_id,
    g.league_id,
    ROW_NUMBER() OVER (ORDER BY g.scheduled_at) as game_row_num
  FROM games g
  JOIN seasons s ON g.season_id = s.id
  WHERE s.name = 'HLHL Legacy Stats (Pre-2026)'
    AND s.league_id = '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c'
)
SELECT
  np.legacy_player_id,
  np.profile_id,
  np.full_name,
  np.is_goalie,
  np.goals,
  np.assists,
  np.saves,
  np.goals_against,
  np.shutouts,
  np.wins,
  ng.game_id,
  ng.season_id,
  ng.league_id,
  (SELECT id FROM teams WHERE name = 'HLHL Legacy Home' LIMIT 1) as team_id
FROM numbered_players np
JOIN numbered_games ng ON np.player_row_num = ng.game_row_num;

-- Insert skater stats (795 players)
INSERT INTO player_stats (
  id,
  game_id,
  player_id,
  team_id,
  season_id,
  league_id,
  goals,
  assists,
  penalty_minutes,
  shots,
  plus_minus,
  power_play_goals,
  power_play_assists,
  short_handed_goals,
  short_handed_assists,
  game_winning_goals,
  empty_net_goals,
  created_at
)
SELECT
  gen_random_uuid(),
  lpgm.game_id,
  lpgm.profile_id,
  lpgm.team_id,
  lpgm.season_id,
  lpgm.league_id,
  COALESCE(lpgm.goals, 0),
  COALESCE(lpgm.assists, 0),
  0, -- legacy data doesn't have penalty_minutes
  0, -- no shots data
  0, -- no plus/minus data
  0, -- no power play goals
  0, -- no power play assists
  0, -- no short handed goals
  0, -- no short handed assists
  0, -- no game winning goals
  0, -- no empty net goals
  NOW()
FROM legacy_player_game_mapping lpgm
WHERE lpgm.is_goalie = FALSE
ON CONFLICT (game_id, player_id) DO NOTHING;

-- Insert goalie stats (128 players)
INSERT INTO goalie_stats (
  id,
  game_id,
  player_id,
  team_id,
  season_id,
  league_id,
  goals_against,
  saves,
  shots_against,
  shutout,
  game_result,
  created_at
)
SELECT
  gen_random_uuid(),
  lpgm.game_id,
  lpgm.profile_id,
  lpgm.team_id,
  lpgm.season_id,
  lpgm.league_id,
  COALESCE(lpgm.goals_against, 0),
  COALESCE(lpgm.saves, 0),
  -- Calculate shots_against = saves + goals_against
  COALESCE(lpgm.saves, 0) + COALESCE(lpgm.goals_against, 0),
  -- Shutout if they have any shutouts in career
  CASE WHEN COALESCE(lpgm.shutouts, 0) > 0 THEN TRUE ELSE FALSE END,
  -- Game result: use 'W' if they have wins, else 'L'
  CASE WHEN COALESCE(lpgm.wins, 0) > 0 THEN 'W' ELSE 'L' END,
  NOW()
FROM legacy_player_game_mapping lpgm
WHERE lpgm.is_goalie = TRUE
ON CONFLICT (game_id, player_id) DO NOTHING;

COMMIT;

-- Verification
SELECT
  'Player Stats Inserted' as check_name,
  s.name as season_name,
  COUNT(ps.id) as player_stats_count,
  SUM(ps.goals) as total_goals,
  SUM(ps.assists) as total_assists,
  SUM(ps.goals + ps.assists) as total_points
FROM player_stats ps
JOIN seasons s ON ps.season_id = s.id
WHERE s.name = 'HLHL Legacy Stats (Pre-2026)'
GROUP BY s.name;

SELECT
  'Goalie Stats Inserted' as check_name,
  s.name as season_name,
  COUNT(gs.id) as goalie_stats_count,
  SUM(gs.saves) as total_saves,
  SUM(gs.goals_against) as total_goals_against,
  SUM(CASE WHEN gs.shutout THEN 1 ELSE 0 END) as shutout_games
FROM goalie_stats gs
JOIN seasons s ON gs.season_id = s.id
WHERE s.name = 'HLHL Legacy Stats (Pre-2026)'
GROUP BY s.name;
