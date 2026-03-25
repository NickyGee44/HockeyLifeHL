-- ==============================================================================
-- GAMES: Create Synthetic Games for Legacy Stats
-- ==============================================================================
-- Description: Create 923 synthetic games (1 per legacy player)
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Create synthetic games for each legacy player
DO $$
DECLARE
  v_legacy_season_id UUID;
  v_home_team_id UUID;
  v_away_team_id UUID;
  v_league_id UUID := '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c';
  v_game_date DATE := '2025-12-31'; -- End of legacy period
  v_games_created INT;
BEGIN
  -- Get legacy season ID
  SELECT id INTO v_legacy_season_id
  FROM seasons
  WHERE league_id = v_league_id
    AND name = 'HLHL Legacy Stats (Pre-2026)';

  -- Get legacy home team ID
  SELECT id INTO v_home_team_id
  FROM teams
  WHERE name = 'HLHL Legacy Home'
    AND league_id = v_league_id;

  -- Get legacy away team ID
  SELECT id INTO v_away_team_id
  FROM teams
  WHERE name = 'HLHL Legacy Away'
    AND league_id = v_league_id;

  IF v_legacy_season_id IS NULL OR v_home_team_id IS NULL OR v_away_team_id IS NULL THEN
    RAISE EXCEPTION 'Legacy season or teams not found - run previous migrations first';
  END IF;

  -- Create one game per legacy player
  -- Using ROW_NUMBER to stagger game times (1 minute apart for uniqueness)
  INSERT INTO games (
    id,
    league_id,
    season_id,
    home_team_id,
    away_team_id,
    scheduled_at,
    status,
    home_score,
    away_score,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    v_league_id,
    v_legacy_season_id,
    v_home_team_id,
    v_away_team_id,
    v_game_date + ((ROW_NUMBER() OVER (ORDER BY lp.full_name) - 1) || ' minutes')::INTERVAL,
    'completed',
    0, -- Scores don't matter for legacy stats
    0,
    NOW(),
    NOW()
  FROM legacy_players lp
  WHERE lp.matched_to_profile_id IS NOT NULL;

  GET DIAGNOSTICS v_games_created = ROW_COUNT;

  RAISE NOTICE 'Created % synthetic games for legacy stats', v_games_created;
END $$;

COMMIT;

-- Verification: Should have 923 games for legacy season
SELECT
  'Synthetic Games Created' as check_name,
  s.name as season_name,
  COUNT(g.id) as game_count,
  MIN(g.scheduled_at) as first_game,
  MAX(g.scheduled_at) as last_game
FROM games g
JOIN seasons s ON g.season_id = s.id
WHERE s.name = 'HLHL Legacy Stats (Pre-2026)'
GROUP BY s.name;
