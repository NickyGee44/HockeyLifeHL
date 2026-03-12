-- ==============================================================================
-- PLAYER_STATS: Insert Legacy Skater Stats
-- ==============================================================================
-- Description: Migrate 795 skater career totals as single-game stats
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Insert skater stats from legacy_players via mapping table
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
  COALESCE(lp.goals, 0),
  COALESCE(lp.assists, 0),
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
FROM legacy_players lp
JOIN legacy_player_game_mapping lpgm ON lp.id = lpgm.legacy_player_id
WHERE lp.is_goalie = FALSE
  AND lp.matched_to_profile_id IS NOT NULL
ON CONFLICT (game_id, player_id) DO NOTHING;

COMMIT;

-- Verification: Should have 795 player_stats records
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
