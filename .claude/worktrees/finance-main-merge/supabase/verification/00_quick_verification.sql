-- ==============================================================================
-- QUICK VERIFICATION SCRIPT
-- ==============================================================================
-- Purpose: Run all critical verification tests in one script
-- Usage: Run this in Supabase SQL Editor to quickly verify migrations
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- QUICK TEST 1: League #1 Exists
-- ==============================================================================
DO $$
DECLARE
  league_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO league_count
  FROM leagues
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

  IF league_count = 1 THEN
    RAISE NOTICE '✅ TEST 1 PASS: League #1 exists';
  ELSE
    RAISE NOTICE '❌ TEST 1 FAIL: League #1 does not exist';
  END IF;
END $$;

-- ==============================================================================
-- QUICK TEST 2: league_id Columns Exist
-- ==============================================================================
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'league_id';

  IF column_count >= 16 THEN
    RAISE NOTICE '✅ TEST 2 PASS: % tables have league_id column', column_count;
  ELSE
    RAISE NOTICE '❌ TEST 2 FAIL: Only % tables have league_id (expected 16+)', column_count;
  END IF;
END $$;

-- ==============================================================================
-- QUICK TEST 3: Data Migrated to League #1
-- ==============================================================================
DO $$
DECLARE
  teams_total INTEGER;
  teams_in_league_1 INTEGER;
  games_total INTEGER;
  games_in_league_1 INTEGER;
BEGIN
  SELECT COUNT(*) INTO teams_total FROM teams;
  SELECT COUNT(*) INTO teams_in_league_1 FROM teams
    WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

  SELECT COUNT(*) INTO games_total FROM games;
  SELECT COUNT(*) INTO games_in_league_1 FROM games
    WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

  IF teams_total = teams_in_league_1 AND games_total = games_in_league_1 THEN
    RAISE NOTICE '✅ TEST 3 PASS: All data migrated to League #1';
    RAISE NOTICE '  - Teams: %/%', teams_in_league_1, teams_total;
    RAISE NOTICE '  - Games: %/%', games_in_league_1, games_total;
  ELSE
    RAISE NOTICE '❌ TEST 3 FAIL: Not all data in League #1';
    RAISE NOTICE '  - Teams: %/% (orphaned: %)', teams_in_league_1, teams_total, teams_total - teams_in_league_1;
    RAISE NOTICE '  - Games: %/% (orphaned: %)', games_in_league_1, games_total, games_total - games_in_league_1;
  END IF;
END $$;

-- ==============================================================================
-- QUICK TEST 4: RLS Enabled
-- ==============================================================================
DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true;

  IF rls_count >= 19 THEN
    RAISE NOTICE '✅ TEST 4 PASS: RLS enabled on % tables', rls_count;
  ELSE
    RAISE NOTICE '❌ TEST 4 FAIL: RLS only enabled on % tables (expected 19+)', rls_count;
  END IF;
END $$;

-- ==============================================================================
-- QUICK TEST 5: RLS Policies Exist
-- ==============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  IF policy_count >= 40 THEN
    RAISE NOTICE '✅ TEST 5 PASS: % RLS policies exist', policy_count;
  ELSE
    RAISE NOTICE '⚠️  TEST 5 WARNING: Only % RLS policies (expected 40+)', policy_count;
  END IF;
END $$;

-- ==============================================================================
-- QUICK TEST 6: Foreign Keys to leagues(id)
-- ==============================================================================
DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'league_id'
    AND tc.table_schema = 'public';

  IF fk_count >= 16 THEN
    RAISE NOTICE '✅ TEST 6 PASS: % foreign keys to leagues(id)', fk_count;
  ELSE
    RAISE NOTICE '❌ TEST 6 FAIL: Only % foreign keys (expected 16+)', fk_count;
  END IF;
END $$;

-- ==============================================================================
-- QUICK TEST 7: Indexes on league_id
-- ==============================================================================
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT t.relname) INTO index_count
  FROM pg_class t
  JOIN pg_index ix ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
  WHERE t.relkind = 'r'
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND a.attname = 'league_id';

  IF index_count >= 16 THEN
    RAISE NOTICE '✅ TEST 7 PASS: % tables have indexes on league_id', index_count;
  ELSE
    RAISE NOTICE '❌ TEST 7 FAIL: Only % tables have indexes (expected 16+)', index_count;
  END IF;
END $$;

-- ==============================================================================
-- QUICK TEST 8: Scorekeeper Tables Exist
-- ==============================================================================
DO $$
DECLARE
  scorekeeper_tables INTEGER;
BEGIN
  SELECT COUNT(*) INTO scorekeeper_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'league_scorekeepers',
      'game_scorekeeper_assignments',
      'game_stat_entry_log'
    );

  IF scorekeeper_tables = 3 THEN
    RAISE NOTICE '✅ TEST 8 PASS: All 3 scorekeeper tables exist';
  ELSE
    RAISE NOTICE '❌ TEST 8 FAIL: Only %/3 scorekeeper tables exist', scorekeeper_tables;
  END IF;
END $$;

-- ==============================================================================
-- QUICK TEST 9: Helper Functions Exist
-- ==============================================================================
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'get_user_league_ids',
      'is_league_owner',
      'is_league_admin',
      'is_league_scorekeeper',
      'get_league_teams',
      'get_league_seasons',
      'get_player_season_stats',
      'get_goalie_season_stats',
      'get_team_standings',
      'get_upcoming_games',
      'get_recent_games',
      'get_scorekeeper_payments',
      'is_league_slug_available',
      'get_league_by_slug',
      'user_has_league_access',
      'get_user_league_role',
      'get_unpaid_fees',
      'get_scorekeeper_assigned_games'
    );

  IF function_count = 18 THEN
    RAISE NOTICE '✅ TEST 9 PASS: All 18 helper functions exist';
  ELSE
    RAISE NOTICE '❌ TEST 9 FAIL: Only %/18 helper functions exist', function_count;
  END IF;
END $$;

-- ==============================================================================
-- QUICK TEST 10: Admin Memberships Exist
-- ==============================================================================
DO $$
DECLARE
  membership_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO membership_count
  FROM league_memberships
  WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
    AND role = 'owner'
    AND status = 'active';

  IF membership_count > 0 THEN
    RAISE NOTICE '✅ TEST 10 PASS: % admin memberships exist for League #1', membership_count;
  ELSE
    RAISE NOTICE '⚠️  TEST 10 WARNING: No admin memberships for League #1';
  END IF;
END $$;

-- ==============================================================================
-- SUMMARY
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE 'QUICK VERIFICATION COMPLETE';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the results above:';
  RAISE NOTICE '  ✅ = Test passed';
  RAISE NOTICE '  ❌ = Test failed (requires attention)';
  RAISE NOTICE '  ⚠️  = Warning (review recommended)';
  RAISE NOTICE '';
  RAISE NOTICE 'If all tests show ✅, migrations were successful!';
  RAISE NOTICE '';
  RAISE NOTICE 'For detailed testing, run:';
  RAISE NOTICE '  1. supabase/verification/01_verify_migrations.sql';
  RAISE NOTICE '  2. supabase/verification/02_test_rls_policies.sql';
  RAISE NOTICE '  3. supabase/verification/03_performance_testing.sql';
  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- DETAILED RESULTS (Optional - View if needed)
-- ==============================================================================

-- View League #1 details
SELECT
  'League #1 Details' as info,
  id,
  name,
  slug,
  status,
  subscription_tier,
  created_at
FROM leagues
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

-- View tables with league_id
SELECT
  'Tables with league_id' as info,
  table_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'league_id'
ORDER BY table_name;

-- View RLS enabled tables
SELECT
  'RLS Enabled Tables' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- ==============================================================================
-- END OF QUICK VERIFICATION
-- ==============================================================================
