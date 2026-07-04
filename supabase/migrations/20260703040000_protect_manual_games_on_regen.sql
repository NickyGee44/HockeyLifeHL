-- ==============================================================================
-- PROTECT MANUALLY-ADDED GAMES FROM SCHEDULE REGENERATION
-- ==============================================================================
-- Date: July 3, 2026
--
-- Problem:
--   save_schedule_games() deletes ALL scheduled/postponed games for a season
--   before inserting the freshly generated set. Games added by hand (via the
--   "Add game" action) have generation_log_id IS NULL — they are not part of any
--   generated batch — yet they were being silently deleted on every regeneration.
--
-- Fix:
--   Scope the pre-insert DELETE to generated games only (generation_log_id IS NOT
--   NULL). Manually-added games (generation_log_id IS NULL) now survive a
--   schedule regeneration, alongside the already-preserved completed/in_progress/
--   cancelled games.
--
-- This is a surgical CREATE OR REPLACE: the body is identical to the original
-- definition (20260205_schedule_generation_functions.sql) except for the one
-- added predicate in STEP 4.
-- ==============================================================================

CREATE OR REPLACE FUNCTION save_schedule_games(
  p_season_id UUID,
  p_league_id UUID,
  p_games JSONB,
  p_log_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_season_exists BOOLEAN;
  v_games_count INTEGER;
  v_game JSONB;
  v_games_created INTEGER := 0;
  v_error_message TEXT;
BEGIN
  -- ============================================================================
  -- STEP 1: AUTHENTICATION & AUTHORIZATION
  -- ============================================================================

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'games_created', 0,
      'error_message', 'Not authenticated'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM league_memberships
    WHERE user_id = v_user_id
      AND league_id = p_league_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'games_created', 0,
      'error_message', 'Insufficient permissions: must be league admin or owner'
    );
  END IF;

  -- ============================================================================
  -- STEP 2: VALIDATE INPUTS
  -- ============================================================================

  SELECT EXISTS (
    SELECT 1 FROM seasons
    WHERE id = p_season_id
      AND league_id = p_league_id
  ) INTO v_season_exists;

  IF NOT v_season_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'games_created', 0,
      'error_message', 'Season not found or does not belong to specified league'
    );
  END IF;

  IF p_games IS NULL OR jsonb_array_length(p_games) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'games_created', 0,
      'error_message', 'No games provided'
    );
  END IF;

  v_games_count := jsonb_array_length(p_games);

  -- ============================================================================
  -- STEP 3: ACQUIRE ADVISORY LOCK
  -- ============================================================================

  IF NOT acquire_schedule_lock(p_season_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'games_created', 0,
      'error_message', 'Another schedule generation is in progress for this season. Please try again.'
    );
  END IF;

  -- ============================================================================
  -- STEP 4: DELETE EXISTING GENERATED GAMES (IF REGENERATING)
  -- ============================================================================
  -- Remove only previously *generated* games for this season. Manually-added
  -- games (generation_log_id IS NULL) are preserved, alongside completed /
  -- in_progress / cancelled games.

  DELETE FROM games
  WHERE season_id = p_season_id
    AND league_id = p_league_id
    AND status IN ('scheduled', 'postponed')
    AND generation_log_id IS NOT NULL;

  -- ============================================================================
  -- STEP 5: INSERT GAMES ATOMICALLY
  -- ============================================================================

  INSERT INTO games (
    season_id,
    league_id,
    home_team_id,
    away_team_id,
    scheduled_at,
    location,
    round_number,
    game_number,
    status,
    generation_log_id,
    created_at,
    updated_at
  )
  SELECT
    p_season_id,
    p_league_id,
    (game->>'home_team_id')::UUID,
    (game->>'away_team_id')::UUID,
    (game->>'scheduled_at')::TIMESTAMPTZ,
    game->>'location',
    (game->>'round_number')::INTEGER,
    (game->>'game_number')::INTEGER,
    'scheduled',
    p_log_id,
    NOW(),
    NOW()
  FROM jsonb_array_elements(p_games) AS game;

  GET DIAGNOSTICS v_games_created = ROW_COUNT;

  -- ============================================================================
  -- STEP 6: UPDATE GENERATION LOG
  -- ============================================================================

  IF p_log_id IS NOT NULL THEN
    UPDATE schedule_generation_log
    SET
      status = 'completed',
      games_generated = v_games_created,
      completed_at = NOW()
    WHERE id = p_log_id;
  END IF;

  UPDATE seasons
  SET
    schedule_generated = true,
    total_games = v_games_created,
    updated_at = NOW()
  WHERE id = p_season_id;

  -- ============================================================================
  -- STEP 7: RETURN SUCCESS
  -- ============================================================================

  RETURN jsonb_build_object(
    'success', true,
    'games_created', v_games_created,
    'error_message', NULL
  );

EXCEPTION
  WHEN OTHERS THEN
    v_error_message := SQLERRM;

    IF p_log_id IS NOT NULL THEN
      BEGIN
        UPDATE schedule_generation_log
        SET
          status = 'failed',
          error_message = v_error_message,
          completed_at = NOW()
        WHERE id = p_log_id;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'games_created', 0,
      'error_message', v_error_message
    );
END;
$$;

COMMENT ON FUNCTION save_schedule_games IS
'Atomically saves generated schedule games with proper locking and validation. Deletes only previously generated games (generation_log_id IS NOT NULL) so manually-added games survive regeneration. Returns JSONB with success status and games created count.';
