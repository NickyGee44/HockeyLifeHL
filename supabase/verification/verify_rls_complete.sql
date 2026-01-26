-- ==============================================================================
-- VERIFY RLS POLICIES - Complete Multi-Tenant Check
-- ==============================================================================
-- Purpose: Verify ALL tables have RLS enabled and proper league_id isolation
-- Date: January 26, 2026
-- Agent: Agent 1 - Database & Infrastructure
-- ==============================================================================

-- ==============================================================================
-- TEST 1: Check RLS is Enabled on All Multi-Tenant Tables
-- ==============================================================================
DO $$
DECLARE
  rls_enabled_count INTEGER;
  tables_without_rls TEXT[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'TEST 1: Verify RLS Enabled on All Multi-Tenant Tables';
  RAISE NOTICE '============================================================================';

  -- Get count of tables with RLS enabled
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'leagues', 'league_memberships', 'divisions', 'venues',
      'teams', 'team_rosters', 'seasons', 'games',
      'player_stats', 'goalie_stats', 'game_stats',
      'drafts', 'draft_picks', 'draft_order', 'player_ratings',
      'payments', 'suspensions', 'player_approvals',
      'articles', 'trades', 'trade_players', 'player_goalie_matchups',
      'season_highlights', 'email_drafts',
      'league_scorekeepers', 'game_scorekeeper_assignments', 'game_stat_entry_log'
    )
    AND rowsecurity = true;

  -- Get list of tables without RLS
  SELECT ARRAY_AGG(tablename) INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'leagues', 'league_memberships', 'divisions', 'venues',
      'teams', 'team_rosters', 'seasons', 'games',
      'player_stats', 'goalie_stats', 'game_stats',
      'drafts', 'draft_picks', 'draft_order', 'player_ratings',
      'payments', 'suspensions', 'player_approvals',
      'articles', 'trades', 'trade_players', 'player_goalie_matchups',
      'season_highlights', 'email_drafts',
      'league_scorekeepers', 'game_scorekeeper_assignments', 'game_stat_entry_log'
    )
    AND rowsecurity = false;

  IF rls_enabled_count >= 28 THEN
    RAISE NOTICE '✅ TEST 1 PASS: RLS enabled on % tables', rls_enabled_count;
  ELSE
    RAISE NOTICE '❌ TEST 1 FAIL: Only % tables have RLS (expected 28+)', rls_enabled_count;
    IF tables_without_rls IS NOT NULL THEN
      RAISE NOTICE '  ⚠️  Tables without RLS: %', tables_without_rls;
    END IF;
  END IF;
END $$;

-- ==============================================================================
-- TEST 2: Check All Multi-Tenant Tables Have league_id Column
-- ==============================================================================
DO $$
DECLARE
  league_id_count INTEGER;
  tables_without_league_id TEXT[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'TEST 2: Verify league_id Column Exists on All Multi-Tenant Tables';
  RAISE NOTICE '============================================================================';

  SELECT COUNT(*) INTO league_id_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'league_id'
    AND table_name IN (
      'league_memberships', 'divisions', 'venues',
      'teams', 'team_rosters', 'seasons', 'games',
      'player_stats', 'goalie_stats', 'game_stats',
      'drafts', 'draft_picks', 'draft_order', 'player_ratings',
      'payments', 'suspensions', 'player_approvals',
      'articles', 'trades', 'trade_players', 'player_goalie_matchups',
      'season_highlights', 'email_drafts',
      'league_scorekeepers', 'game_scorekeeper_assignments', 'game_stat_entry_log'
    );

  -- Get list of tables that should have league_id but don't
  SELECT ARRAY_AGG(table_name::text) INTO tables_without_league_id
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_name IN (
      'league_memberships', 'divisions', 'venues',
      'teams', 'team_rosters', 'seasons', 'games',
      'player_stats', 'goalie_stats', 'game_stats',
      'drafts', 'draft_picks', 'draft_order', 'player_ratings',
      'payments', 'suspensions', 'player_approvals',
      'articles', 'trades', 'trade_players', 'player_goalie_matchups',
      'season_highlights', 'email_drafts',
      'league_scorekeepers', 'game_scorekeeper_assignments', 'game_stat_entry_log'
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = t.table_name
        AND c.table_schema = 'public'
        AND c.column_name = 'league_id'
    );

  IF league_id_count >= 27 THEN
    RAISE NOTICE '✅ TEST 2 PASS: % tables have league_id column', league_id_count;
  ELSE
    RAISE NOTICE '❌ TEST 2 FAIL: Only % tables have league_id (expected 27+)', league_id_count;
    IF tables_without_league_id IS NOT NULL THEN
      RAISE NOTICE '  ⚠️  Tables without league_id: %', tables_without_league_id;
    END IF;
  END IF;
END $$;

-- ==============================================================================
-- TEST 3: Check league_id is NOT NULL on All Tables
-- ==============================================================================
DO $$
DECLARE
  not_null_count INTEGER;
  nullable_tables TEXT[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'TEST 3: Verify league_id is NOT NULL on All Multi-Tenant Tables';
  RAISE NOTICE '============================================================================';

  SELECT COUNT(*) INTO not_null_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'league_id'
    AND is_nullable = 'NO'
    AND table_name IN (
      'league_memberships', 'divisions', 'venues',
      'teams', 'team_rosters', 'seasons', 'games',
      'player_stats', 'goalie_stats', 'game_stats',
      'drafts', 'draft_picks', 'draft_order', 'player_ratings',
      'payments', 'suspensions', 'player_approvals',
      'articles', 'trades', 'trade_players', 'player_goalie_matchups',
      'season_highlights', 'email_drafts',
      'league_scorekeepers', 'game_scorekeeper_assignments', 'game_stat_entry_log'
    );

  SELECT ARRAY_AGG(table_name::text) INTO nullable_tables
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'league_id'
    AND is_nullable = 'YES'
    AND table_name IN (
      'league_memberships', 'divisions', 'venues',
      'teams', 'team_rosters', 'seasons', 'games',
      'player_stats', 'goalie_stats', 'game_stats',
      'drafts', 'draft_picks', 'draft_order', 'player_ratings',
      'payments', 'suspensions', 'player_approvals',
      'articles', 'trades', 'trade_players', 'player_goalie_matchups',
      'season_highlights', 'email_drafts',
      'league_scorekeepers', 'game_scorekeeper_assignments', 'game_stat_entry_log'
    );

  IF not_null_count >= 27 THEN
    RAISE NOTICE '✅ TEST 3 PASS: league_id is NOT NULL on % tables', not_null_count;
  ELSE
    RAISE NOTICE '❌ TEST 3 FAIL: league_id is NOT NULL on only % tables (expected 27+)', not_null_count;
    IF nullable_tables IS NOT NULL THEN
      RAISE NOTICE '  ⚠️  Tables with nullable league_id: %', nullable_tables;
    END IF;
  END IF;
END $$;

-- ==============================================================================
-- TEST 4: Check RLS Policies Exist
-- ==============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'TEST 4: Verify RLS Policies Exist';
  RAISE NOTICE '============================================================================';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  IF policy_count >= 50 THEN
    RAISE NOTICE '✅ TEST 4 PASS: % RLS policies exist', policy_count;
  ELSE
    RAISE NOTICE '⚠️  TEST 4 WARNING: Only % RLS policies exist (expected 50+)', policy_count;
  END IF;
END $$;

-- ==============================================================================
-- TEST 5: Check New Tables (game_stats, player_approvals)
-- ==============================================================================
DO $$
DECLARE
  game_stats_exists BOOLEAN;
  player_approvals_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'TEST 5: Verify New Tables Exist';
  RAISE NOTICE '============================================================================';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'game_stats'
  ) INTO game_stats_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'player_approvals'
  ) INTO player_approvals_exists;

  IF game_stats_exists THEN
    RAISE NOTICE '✅ game_stats table exists';
  ELSE
    RAISE NOTICE '❌ game_stats table MISSING';
  END IF;

  IF player_approvals_exists THEN
    RAISE NOTICE '✅ player_approvals table exists';
  ELSE
    RAISE NOTICE '❌ player_approvals table MISSING';
  END IF;

  IF game_stats_exists AND player_approvals_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ TEST 5 PASS: All new tables exist';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ TEST 5 FAIL: Missing tables';
  END IF;
END $$;

-- ==============================================================================
-- DETAILED RLS POLICY LIST
-- ==============================================================================
RAISE NOTICE '';
RAISE NOTICE '============================================================================';
RAISE NOTICE 'RLS POLICY SUMMARY';
RAISE NOTICE '============================================================================';

SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'leagues', 'league_memberships', 'divisions', 'venues',
    'teams', 'team_rosters', 'seasons', 'games',
    'player_stats', 'goalie_stats', 'game_stats',
    'drafts', 'draft_picks', 'draft_order', 'player_ratings',
    'payments', 'suspensions', 'player_approvals',
    'articles', 'trades', 'trade_players', 'player_goalie_matchups',
    'season_highlights', 'email_drafts',
    'league_scorekeepers', 'game_scorekeeper_assignments', 'game_stat_entry_log'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ==============================================================================
-- SUMMARY
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'RLS VERIFICATION COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the test results above.';
  RAISE NOTICE 'All tests should show ✅ for multi-tenant security to be properly enforced.';
  RAISE NOTICE '';
END $$;
