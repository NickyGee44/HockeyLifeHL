-- ==============================================================================
-- AGENT 1 PHASE 2: MIGRATION VERIFICATION QUERIES
-- ==============================================================================
-- Purpose: Verify that all migrations ran successfully
-- Run these queries in Supabase SQL Editor to verify migration success
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- TEST 1: Verify League #1 Exists
-- ==============================================================================
-- Expected: Should return 1 row with name "HockeyLifeHL (Original)"

SELECT
  id,
  name,
  slug,
  subscription_tier,
  status,
  created_at
FROM leagues
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

-- Expected Result: 1 row
-- ✅ PASS if: Row exists with name "HockeyLifeHL (Original)"
-- ❌ FAIL if: No rows returned

-- ==============================================================================
-- TEST 2: Verify All Tables Have league_id Column
-- ==============================================================================
-- Expected: Should return 16 rows (all tables that need league_id)

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'league_id'
  AND table_name IN (
    'teams', 'team_rosters', 'seasons',
    'games', 'player_stats', 'goalie_stats',
    'drafts', 'draft_picks', 'draft_order', 'player_ratings',
    'payments', 'suspensions',
    'articles', 'trades', 'trade_players', 'player_goalie_matchups',
    'season_highlights', 'email_drafts'
  )
ORDER BY table_name;

-- Expected Result: 16 rows (18 if we count divisions and venues which already had it)
-- ✅ PASS if: All 16 tables listed
-- ❌ FAIL if: Missing any tables

-- ==============================================================================
-- TEST 3: Verify league_id is NOT NULL on All Tables
-- ==============================================================================
-- Expected: All tables should have league_id as NOT NULL after data migration

SELECT
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'league_id'
  AND table_name IN (
    'teams', 'team_rosters', 'seasons',
    'games', 'player_stats', 'goalie_stats',
    'drafts', 'draft_picks', 'draft_order', 'player_ratings',
    'payments', 'suspensions',
    'articles', 'trades', 'trade_players', 'player_goalie_matchups',
    'season_highlights', 'email_drafts'
  )
ORDER BY table_name;

-- Expected Result: All rows should show is_nullable = 'NO'
-- ✅ PASS if: All 16 tables have is_nullable = 'NO'
-- ❌ FAIL if: Any table has is_nullable = 'YES'

-- ==============================================================================
-- TEST 4: Verify All Existing Data Has league_id Set to League #1
-- ==============================================================================
-- Expected: All records should have league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

-- Check teams
SELECT 'teams' as table_name, COUNT(*) as total_records,
       COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END) as league_1_records
FROM teams
UNION ALL
-- Check seasons
SELECT 'seasons', COUNT(*),
       COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END)
FROM seasons
UNION ALL
-- Check games
SELECT 'games', COUNT(*),
       COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END)
FROM games
UNION ALL
-- Check player_stats
SELECT 'player_stats', COUNT(*),
       COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END)
FROM player_stats
UNION ALL
-- Check goalie_stats
SELECT 'goalie_stats', COUNT(*),
       COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END)
FROM goalie_stats
UNION ALL
-- Check payments
SELECT 'payments', COUNT(*),
       COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END)
FROM payments
ORDER BY table_name;

-- Expected Result: For each table, total_records should equal league_1_records
-- ✅ PASS if: All tables have total_records = league_1_records
-- ❌ FAIL if: Any table has total_records > league_1_records (means some records missing league_id)

-- ==============================================================================
-- TEST 5: Verify RLS is Enabled on All Tables
-- ==============================================================================
-- Expected: RLS should be enabled on all multi-tenant tables

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'leagues', 'league_memberships', 'divisions', 'venues',
    'teams', 'team_rosters', 'seasons',
    'games', 'player_stats', 'goalie_stats',
    'drafts', 'draft_picks', 'draft_order', 'player_ratings',
    'payments', 'suspensions',
    'articles', 'trades', 'trade_players', 'player_goalie_matchups',
    'season_highlights', 'email_drafts',
    'league_scorekeepers', 'game_scorekeeper_assignments', 'game_stat_entry_log'
  )
ORDER BY tablename;

-- Expected Result: All tables should show rls_enabled = true
-- ✅ PASS if: All tables have rls_enabled = true
-- ❌ FAIL if: Any table has rls_enabled = false

-- ==============================================================================
-- TEST 6: Verify RLS Policies Exist
-- ==============================================================================
-- Expected: Each table should have multiple RLS policies

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'leagues', 'league_memberships', 'teams', 'seasons', 'games',
    'player_stats', 'goalie_stats', 'drafts', 'payments',
    'league_scorekeepers', 'game_scorekeeper_assignments'
  )
ORDER BY tablename, policyname;

-- Expected Result: Should see multiple policies per table (SELECT, INSERT, UPDATE, DELETE)
-- ✅ PASS if: Each table has at least 2-3 policies
-- ❌ FAIL if: Any critical table has 0 policies

-- ==============================================================================
-- TEST 7: Verify Foreign Key Constraints
-- ==============================================================================
-- Expected: All league_id columns should have foreign key to leagues(id)

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'league_id'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Expected Result: All 16+ tables with league_id should reference leagues(id)
-- ✅ PASS if: All tables have foreign key to leagues(id)
-- ❌ FAIL if: Any table missing foreign key constraint

-- ==============================================================================
-- TEST 8: Verify Indexes on league_id Columns
-- ==============================================================================
-- Expected: All league_id columns should have indexes for query performance

SELECT
  t.relname AS table_name,
  i.relname AS index_name,
  a.attname AS column_name
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relkind = 'r'
  AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND a.attname = 'league_id'
ORDER BY t.relname;

-- Expected Result: Each table with league_id should have at least 1 index
-- ✅ PASS if: All tables have index on league_id
-- ❌ FAIL if: Any table missing index

-- ==============================================================================
-- TEST 9: Verify Scorekeeper Tables Exist
-- ==============================================================================
-- Expected: 3 new scorekeeper tables should exist

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'league_scorekeepers',
    'game_scorekeeper_assignments',
    'game_stat_entry_log'
  )
ORDER BY table_name;

-- Expected Result: 3 tables returned
-- ✅ PASS if: All 3 scorekeeper tables exist
-- ❌ FAIL if: Any tables missing

-- ==============================================================================
-- TEST 10: Verify Helper Functions Exist
-- ==============================================================================
-- Expected: All helper functions should be created

SELECT
  routine_name,
  routine_type,
  data_type as return_type
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
  )
ORDER BY routine_name;

-- Expected Result: Should return 18 functions
-- ✅ PASS if: All helper functions exist
-- ❌ FAIL if: Any functions missing

-- ==============================================================================
-- TEST 11: Verify League Memberships for Admins
-- ==============================================================================
-- Expected: Existing admins should be owners of League #1

SELECT
  lm.league_id,
  lm.user_id,
  lm.role,
  lm.status,
  p.email,
  p.role as profile_role
FROM league_memberships lm
JOIN profiles p ON p.id = lm.user_id
WHERE lm.league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
ORDER BY lm.role;

-- Expected Result: Should see memberships for existing admins
-- ✅ PASS if: Admin users have 'owner' role in League #1
-- ❌ FAIL if: No memberships exist

-- ==============================================================================
-- VERIFICATION SUMMARY
-- ==============================================================================
-- Run all tests above and check results
-- All tests should PASS for migration to be considered successful
--
-- If any tests FAIL:
-- 1. Review the migration files
-- 2. Check Supabase logs for errors
-- 3. Re-run failed migrations
-- 4. Document issues in AGENT_1_PHASE_2_REPORT.md
-- ==============================================================================
