-- ==============================================================================
-- HLHL CLEANUP: Remove Duplicate Seasons
-- ==============================================================================
-- Description: Delete 10 duplicate/empty season entries from HLHL league
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Safety check: Get list of HLHL seasons and their data
DO $$
DECLARE
  v_league_id UUID := '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c';
  v_seasons_to_delete UUID[];
  v_deleted_count INT;
  rec RECORD;
BEGIN

  -- Identify seasons to delete (keep "Winter Puck 2026" and possibly one other active season)
  -- Delete all others that have no games/stats
  SELECT ARRAY_AGG(id) INTO v_seasons_to_delete
  FROM seasons
  WHERE league_id = v_league_id
    AND id NOT IN (
      -- Keep seasons that have games
      SELECT DISTINCT season_id FROM games WHERE league_id = v_league_id
      UNION
      -- Keep seasons that have stats
      SELECT DISTINCT season_id FROM player_stats WHERE league_id = v_league_id
      UNION
      SELECT DISTINCT season_id FROM goalie_stats WHERE league_id = v_league_id
    )
    -- Also keep the newest season (Winter Puck 2026) even if it has data
    AND name != 'Winter Puck 2026';

  -- Safety check: Verify no games or stats reference these seasons
  IF EXISTS (
    SELECT 1 FROM games WHERE season_id = ANY(v_seasons_to_delete)
  ) THEN
    RAISE EXCEPTION 'Cannot delete seasons - games reference them';
  END IF;

  IF EXISTS (
    SELECT 1 FROM player_stats WHERE season_id = ANY(v_seasons_to_delete)
  ) THEN
    RAISE EXCEPTION 'Cannot delete seasons - player_stats reference them';
  END IF;

  IF EXISTS (
    SELECT 1 FROM goalie_stats WHERE season_id = ANY(v_seasons_to_delete)
  ) THEN
    RAISE EXCEPTION 'Cannot delete seasons - goalie_stats reference them';
  END IF;

  -- Delete empty seasons
  DELETE FROM seasons
  WHERE id = ANY(v_seasons_to_delete);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % empty HLHL seasons', v_deleted_count;

  -- Log remaining seasons
  RAISE NOTICE 'Remaining HLHL seasons:';
  FOR rec IN (
    SELECT id, name, status, start_date, end_date
    FROM seasons
    WHERE league_id = v_league_id
    ORDER BY created_at DESC
  ) LOOP
    RAISE NOTICE '  - % (%) - % to %', rec.name, rec.status, rec.start_date, rec.end_date;
  END LOOP;

END $$;

COMMIT;

-- Verification: Check final season count
SELECT
  'HLHL Seasons After Cleanup' as check_name,
  COUNT(*) as total_seasons,
  COUNT(*) FILTER (WHERE status = 'active') as active_seasons,
  COUNT(*) FILTER (WHERE status = 'archived') as archived_seasons
FROM seasons
WHERE league_id = '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c';
