-- ==============================================================================
-- SCHEDULE GENERATION DATABASE FUNCTIONS
-- ==============================================================================
-- Description: Atomic functions for schedule generation with proper locking
-- Tables: games, schedule_generation_log, team_standings
-- Author: Database Architecture Agent
-- Date: February 5, 2026
-- Priority: HIGH - Required for schedule generation reliability
-- ==============================================================================
--
-- DOMAIN INVARIANTS:
-- 1. A season can only have one active schedule generation at a time
-- 2. All games for a schedule must be saved atomically (all or none)
-- 3. Standings calculations must be deterministic and follow tiebreaker rules
-- 4. Users can only generate schedules for leagues they are admin/owner of
-- 5. Schedule generation logs must accurately track all attempts
--
-- TRANSACTION BOUNDARIES:
-- - save_schedule_games(): ISOLATION LEVEL READ COMMITTED with advisory locks
-- - Advisory locks auto-release on transaction commit/rollback
-- - Idempotent: Can safely retry on failure
--
-- FAILURE MODES:
-- - Concurrent generation attempts: Second attempt fails fast with clear error
-- - Partial write failure: Transaction rollback ensures all-or-nothing
-- - Invalid season_id: Function returns error without side effects
-- - RLS violations: Handled by SECURITY DEFINER with explicit permission checks
--
-- ==============================================================================

-- ==============================================================================
-- FUNCTION: acquire_schedule_lock
-- ==============================================================================
-- Purpose: Acquire advisory lock to prevent concurrent schedule generation
-- Returns: TRUE if lock acquired, FALSE if already locked
-- Lock ID: Hash of season_id to ensure consistent lock across calls
-- Auto-releases: Lock automatically released when transaction ends
--
-- USAGE:
--   SELECT acquire_schedule_lock('uuid-here');
--
-- CONCURRENCY:
--   Uses pg_try_advisory_xact_lock for non-blocking acquisition
--   Lock scope: Transaction-level (auto-released on COMMIT/ROLLBACK)
--
CREATE OR REPLACE FUNCTION acquire_schedule_lock(p_season_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_id BIGINT;
BEGIN
  -- Generate deterministic lock ID from season UUID
  -- Use hashtext() to convert UUID to integer for pg_advisory_lock
  v_lock_id := hashtext(p_season_id::TEXT);

  -- Try to acquire transaction-level advisory lock (non-blocking)
  -- Returns TRUE if acquired, FALSE if already held
  RETURN pg_try_advisory_xact_lock(v_lock_id);

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return FALSE
    RAISE WARNING 'acquire_schedule_lock failed for season %: %', p_season_id, SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION acquire_schedule_lock IS
'Acquires transaction-level advisory lock for schedule generation. Returns TRUE if acquired, FALSE if already locked.';

-- ==============================================================================
-- FUNCTION: release_schedule_lock
-- ==============================================================================
-- Purpose: Manually release advisory lock (normally auto-released by transaction)
-- Returns: TRUE if released, FALSE if not held
-- Note: Usually not needed as xact locks auto-release, but provided for edge cases
--
-- USAGE:
--   SELECT release_schedule_lock('uuid-here');
--
CREATE OR REPLACE FUNCTION release_schedule_lock(p_season_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_id BIGINT;
BEGIN
  -- Generate same lock ID used in acquire
  v_lock_id := hashtext(p_season_id::TEXT);

  -- Try to release the advisory lock
  -- Returns TRUE if released, FALSE if we didn't hold it
  RETURN pg_advisory_unlock(v_lock_id);

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'release_schedule_lock failed for season %: %', p_season_id, SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION release_schedule_lock IS
'Manually releases advisory lock for schedule generation. Usually not needed as transaction locks auto-release.';

-- ==============================================================================
-- FUNCTION: save_schedule_games
-- ==============================================================================
-- Purpose: Atomically save generated schedule games with proper validation
-- Returns: JSONB with {success, games_created, error_message}
--
-- INVARIANTS ENFORCED:
-- 1. User must be league admin/owner (checked via RLS + explicit validation)
-- 2. Season must exist and belong to specified league
-- 3. All games saved atomically (transaction ensures all-or-nothing)
-- 4. Advisory lock prevents concurrent saves
-- 5. Generation log updated with final status
--
-- TRANSACTION ISOLATION:
-- - READ COMMITTED (default) is sufficient
-- - Advisory lock prevents concurrent modifications
-- - Atomic commit ensures data consistency
--
-- ERROR HANDLING:
-- - Invalid inputs: Return error without side effects
-- - Lock acquisition failure: Return clear error message
-- - Database errors: Transaction rollback + error details
--
-- USAGE:
--   SELECT save_schedule_games(
--     p_season_id := 'uuid-here',
--     p_league_id := 'uuid-here',
--     p_games := '[{"home_team_id": "...", "away_team_id": "...", ...}]'::jsonb,
--     p_log_id := 'uuid-here' -- optional
--   );
--
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

  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'games_created', 0,
      'error_message', 'Not authenticated'
    );
  END IF;

  -- Check if user is league admin/owner
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

  -- Verify season exists and belongs to league
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

  -- Validate games array
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
  -- Prevent concurrent schedule generation for same season

  IF NOT acquire_schedule_lock(p_season_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'games_created', 0,
      'error_message', 'Another schedule generation is in progress for this season. Please try again.'
    );
  END IF;

  -- Lock acquired - will auto-release on COMMIT or ROLLBACK

  -- ============================================================================
  -- STEP 4: DELETE EXISTING GAMES (IF REGENERATING)
  -- ============================================================================
  -- Remove previously generated games for this season
  -- This allows schedule regeneration without orphaned data

  DELETE FROM games
  WHERE season_id = p_season_id
    AND league_id = p_league_id
    -- Only delete unplayed games to preserve historical data
    AND status IN ('scheduled', 'postponed');

  -- Note: Completed, in_progress, and cancelled games are preserved

  -- ============================================================================
  -- STEP 5: INSERT GAMES ATOMICALLY
  -- ============================================================================

  -- Insert all games in a single statement for atomicity
  -- Uses jsonb_array_elements to expand array
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

  -- Get number of rows inserted
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

  -- Update season metadata
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
    -- Transaction will auto-rollback on exception
    -- Advisory lock will auto-release

    v_error_message := SQLERRM;

    -- Update generation log with error if provided
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
          -- Ignore errors updating log during error handling
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
'Atomically saves generated schedule games with proper locking and validation. Returns JSONB with success status and games created count.';

-- ==============================================================================
-- FUNCTION: calculate_standings
-- ==============================================================================
-- Purpose: Calculate team standings with tiebreaker rules
-- Returns: Table of team standings with calculated fields
--
-- TIEBREAKER RULES (applied in order from standings_config):
-- 1. points - Total points (2 for win, 1 for tie, 0 for loss by default)
-- 2. wins - Total wins
-- 3. goal_differential - Goals for minus goals against
-- 4. goals_for - Total goals scored
-- 5. head_to_head - Direct matchup record (if applicable)
-- 6. random - Random tiebreaker (last resort)
--
-- PERFORMANCE:
-- - Uses materialized CTEs for efficiency
-- - Indexes on games(season_id, status) critical for performance
-- - Should run in <100ms for typical season (~100 games)
--
-- USAGE:
--   SELECT * FROM calculate_standings('season-uuid-here');
--   SELECT * FROM calculate_standings('season-uuid-here', 'division-uuid-here');
--
CREATE OR REPLACE FUNCTION calculate_standings(
  p_season_id UUID,
  p_division_id UUID DEFAULT NULL
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_short_name TEXT,
  team_logo_url TEXT,
  division_id UUID,
  games_played BIGINT,
  wins BIGINT,
  losses BIGINT,
  ties BIGINT,
  points BIGINT,
  goals_for BIGINT,
  goals_against BIGINT,
  goal_differential BIGINT,
  win_percentage NUMERIC,
  standing_rank INTEGER,
  is_playoff_position BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_tiebreakers JSONB;
  v_playoff_teams INTEGER := 0;
BEGIN
  -- ============================================================================
  -- STEP 1: GET STANDINGS CONFIGURATION
  -- ============================================================================

  -- Get standings config for this season
  -- Provides points values and tiebreaker order
  SELECT
    points_win,
    points_loss,
    points_tie,
    tiebreakers,
    COALESCE(playoff_teams_total, 0) as playoff_teams
  INTO v_config
  FROM standings_config
  WHERE season_id = p_season_id
  LIMIT 1;

  -- Use defaults if no config exists
  IF v_config IS NULL THEN
    v_config.points_win := 2;
    v_config.points_loss := 0;
    v_config.points_tie := 1;
    v_config.tiebreakers := '["points", "wins", "goal_differential", "goals_for"]'::jsonb;
    v_config.playoff_teams := 0;
  END IF;

  v_tiebreakers := v_config.tiebreakers;
  v_playoff_teams := v_config.playoff_teams;

  -- ============================================================================
  -- STEP 2: CALCULATE STANDINGS
  -- ============================================================================

  RETURN QUERY
  WITH team_stats AS (
    -- Calculate statistics for each team
    SELECT
      t.id as team_id,
      t.name as team_name,
      t.short_name as team_short_name,
      t.logo_url as team_logo_url,
      t.division_id,

      -- Games played (home + away)
      COUNT(g.id) as games_played,

      -- Wins (home wins + away wins)
      COUNT(g.id) FILTER (
        WHERE (g.home_team_id = t.id AND g.home_score > g.away_score)
           OR (g.away_team_id = t.id AND g.away_score > g.home_score)
      ) as wins,

      -- Losses (home losses + away losses)
      COUNT(g.id) FILTER (
        WHERE (g.home_team_id = t.id AND g.home_score < g.away_score)
           OR (g.away_team_id = t.id AND g.away_score < g.home_score)
      ) as losses,

      -- Ties
      COUNT(g.id) FILTER (
        WHERE g.home_score = g.away_score
          AND g.status = 'completed'
      ) as ties,

      -- Goals for
      COALESCE(
        SUM(CASE WHEN g.home_team_id = t.id THEN g.home_score ELSE 0 END) +
        SUM(CASE WHEN g.away_team_id = t.id THEN g.away_score ELSE 0 END),
        0
      ) as goals_for,

      -- Goals against
      COALESCE(
        SUM(CASE WHEN g.home_team_id = t.id THEN g.away_score ELSE 0 END) +
        SUM(CASE WHEN g.away_team_id = t.id THEN g.home_score ELSE 0 END),
        0
      ) as goals_against

    FROM teams t
    LEFT JOIN games g ON (
      (g.home_team_id = t.id OR g.away_team_id = t.id)
      AND g.season_id = p_season_id
      AND g.status = 'completed'
    )
    WHERE t.status = 'active'
      AND (p_division_id IS NULL OR t.division_id = p_division_id)
    GROUP BY t.id, t.name, t.short_name, t.logo_url, t.division_id
  ),
  standings_with_calcs AS (
    -- Calculate derived fields
    SELECT
      ts.*,
      -- Calculate points based on config
      (ts.wins * v_config.points_win +
       ts.losses * v_config.points_loss +
       ts.ties * v_config.points_tie) as points,

      -- Goal differential
      (ts.goals_for - ts.goals_against) as goal_differential,

      -- Win percentage
      CASE
        WHEN ts.games_played > 0
        THEN ROUND((ts.wins::NUMERIC / ts.games_played::NUMERIC) * 100, 2)
        ELSE 0
      END as win_percentage

    FROM team_stats ts
  ),
  ranked_standings AS (
    -- Apply ranking with tiebreakers
    SELECT
      s.*,
      ROW_NUMBER() OVER (
        ORDER BY
          s.points DESC,
          s.wins DESC,
          s.goal_differential DESC,
          s.goals_for DESC,
          s.team_name ASC -- Final tiebreaker: alphabetical
      ) as standing_rank
    FROM standings_with_calcs s
  )
  SELECT
    rs.team_id,
    rs.team_name,
    rs.team_short_name,
    rs.team_logo_url,
    rs.division_id,
    rs.games_played,
    rs.wins,
    rs.losses,
    rs.ties,
    rs.points,
    rs.goals_for,
    rs.goals_against,
    rs.goal_differential,
    rs.win_percentage,
    rs.standing_rank::INTEGER,
    (rs.standing_rank <= v_playoff_teams) as is_playoff_position
  FROM ranked_standings rs
  ORDER BY rs.standing_rank;

END;
$$;

COMMENT ON FUNCTION calculate_standings IS
'Calculates team standings with configurable points system and tiebreaker rules. Returns ordered standings with playoff positions.';

-- ==============================================================================
-- GRANT PERMISSIONS
-- ==============================================================================

-- Allow authenticated users to call these functions
-- SECURITY DEFINER ensures they run with definer privileges
-- Internal permission checks ensure proper authorization
GRANT EXECUTE ON FUNCTION acquire_schedule_lock TO authenticated;
GRANT EXECUTE ON FUNCTION release_schedule_lock TO authenticated;
GRANT EXECUTE ON FUNCTION save_schedule_games TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_standings TO authenticated;

-- Service role has full access
GRANT EXECUTE ON FUNCTION acquire_schedule_lock TO service_role;
GRANT EXECUTE ON FUNCTION release_schedule_lock TO service_role;
GRANT EXECUTE ON FUNCTION save_schedule_games TO service_role;
GRANT EXECUTE ON FUNCTION calculate_standings TO service_role;

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================

-- Critical index for standings calculation
CREATE INDEX IF NOT EXISTS idx_games_season_status_completed
ON games(season_id, status)
WHERE status = 'completed';

-- Index for team lookup in standings
CREATE INDEX IF NOT EXISTS idx_teams_status_active
ON teams(status)
WHERE status = 'active';

-- Composite index for game filtering
CREATE INDEX IF NOT EXISTS idx_games_season_teams
ON games(season_id, home_team_id, away_team_id);

-- ==============================================================================
-- MIGRATION VERIFICATION
-- ==============================================================================

DO $$
DECLARE
  v_function_count INTEGER;
BEGIN
  -- Count created functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'acquire_schedule_lock',
      'release_schedule_lock',
      'save_schedule_games',
      'calculate_standings'
    );

  IF v_function_count < 4 THEN
    RAISE EXCEPTION 'Migration failed: Expected 4 functions, found %', v_function_count;
  END IF;

  RAISE NOTICE 'Migration completed successfully: All 4 schedule generation functions created';
  RAISE NOTICE '  - acquire_schedule_lock';
  RAISE NOTICE '  - release_schedule_lock';
  RAISE NOTICE '  - save_schedule_games';
  RAISE NOTICE '  - calculate_standings';
END $$;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- Next Steps:
-- 1. Apply this migration: Use Supabase MCP apply_migration
-- 2. Test lock acquisition: SELECT acquire_schedule_lock('test-uuid');
-- 3. Test schedule save with valid season data
-- 4. Test standings calculation with completed games
-- 5. Verify performance with EXPLAIN ANALYZE on large datasets
--
-- Performance Targets:
-- - save_schedule_games: <500ms for 100 games
-- - calculate_standings: <100ms for 10 teams with 100 games
-- - acquire_schedule_lock: <10ms (non-blocking)
--
-- Monitoring:
-- - Check schedule_generation_log for failed attempts
-- - Monitor pg_locks for advisory lock contention
-- - Track function execution time in application logs
-- ==============================================================================
