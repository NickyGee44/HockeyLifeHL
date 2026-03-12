-- ==============================================================================
-- GOALIE_STATS: Insert Legacy Goalie Stats
-- ==============================================================================
-- Description: Migrate 128 goalie career totals as single-game stats
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Insert goalie stats from legacy_players via mapping table
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
  COALESCE(lp.goals_against, 0),
  COALESCE(lp.saves, 0),
  -- Calculate shots_against = saves + goals_against
  COALESCE(lp.saves, 0) + COALESCE(lp.goals_against, 0),
  -- Shutout if they have any shutouts in career (arbitrarily mark this game as shutout)
  CASE WHEN COALESCE(lp.shutouts, 0) > 0 THEN TRUE ELSE FALSE END,
  -- Game result: use 'win' if they have wins, else 'loss'
  CASE WHEN COALESCE(lp.wins, 0) > 0 THEN 'win' ELSE 'loss' END,
  NOW()
FROM legacy_players lp
JOIN legacy_player_game_mapping lpgm ON lp.id = lpgm.legacy_player_id
WHERE lp.is_goalie = TRUE
  AND lp.matched_to_profile_id IS NOT NULL
ON CONFLICT (game_id, player_id) DO NOTHING;

COMMIT;

-- Verification: Should have 128 goalie_stats records
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
