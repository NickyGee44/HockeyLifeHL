-- ==============================================================================
-- MAPPING TABLE: Link Legacy Players to Their Synthetic Games
-- ==============================================================================
-- Description: Create temporary mapping for migration process
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Create temporary mapping table
CREATE TEMP TABLE IF NOT EXISTS legacy_player_game_mapping AS
WITH numbered_players AS (
  SELECT
    lp.id as legacy_player_id,
    lp.matched_to_profile_id as profile_id,
    lp.full_name,
    lp.is_goalie,
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
  ng.game_id,
  ng.season_id,
  ng.league_id,
  (SELECT id FROM teams WHERE name = 'HLHL Legacy Players' LIMIT 1) as team_id
FROM numbered_players np
JOIN numbered_games ng ON np.player_row_num = ng.game_row_num;

COMMIT;

-- Verification
SELECT
  'Player-Game Mapping Created' as check_name,
  COUNT(*) as mapped_players,
  COUNT(*) FILTER (WHERE is_goalie = TRUE) as goalies,
  COUNT(*) FILTER (WHERE is_goalie = FALSE) as skaters
FROM legacy_player_game_mapping;
