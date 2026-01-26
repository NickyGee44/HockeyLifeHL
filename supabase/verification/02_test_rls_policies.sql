-- ==============================================================================
-- AGENT 1 PHASE 2: RLS POLICY TESTING
-- ==============================================================================
-- Purpose: Test Row Level Security policies for tenant isolation
-- WARNING: These tests require creating test users and test leagues
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- SETUP: Create Test Data
-- ==============================================================================

-- Create Test League #2
DO $$
DECLARE
  test_league_2_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
BEGIN
  -- Only create if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM leagues WHERE id = test_league_2_id) THEN
    INSERT INTO leagues (
      id,
      name,
      slug,
      description,
      subscription_tier,
      status
    ) VALUES (
      test_league_2_id,
      'Test League 2',
      'test-league-2',
      'Test league for RLS policy verification',
      'free',
      'active'
    );
    RAISE NOTICE 'Created Test League 2';
  END IF;
END $$;

-- ==============================================================================
-- TEST SCENARIO 1: User in League A Cannot See League B's Teams
-- ==============================================================================

-- Setup: Create test team in League #1 and League #2
INSERT INTO teams (league_id, name, short_name)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'League 1 Test Team', 'L1T'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'League 2 Test Team', 'L2T')
ON CONFLICT DO NOTHING;

-- Test Query (Run as authenticated user who is member of League #1 only):
-- Expected: Should only see League 1 Test Team, NOT League 2 Test Team
SELECT
  id,
  league_id,
  name,
  short_name
FROM teams
ORDER BY name;

-- ✅ PASS if: Only returns "League 1 Test Team"
-- ❌ FAIL if: Returns both teams (RLS not working)

-- ==============================================================================
-- TEST SCENARIO 2: Verify Service Role Has Full Access
-- ==============================================================================

-- Test Query (Run with service role key):
-- Expected: Should see ALL teams from all leagues
SELECT
  league_id,
  name,
  COUNT(*) as team_count
FROM teams
GROUP BY league_id, name
ORDER BY league_id;

-- ✅ PASS if: Shows teams from multiple leagues
-- ❌ FAIL if: Filtered by league (service role should bypass RLS)

-- ==============================================================================
-- TEST SCENARIO 3: User Without League Membership Sees Nothing
-- ==============================================================================

-- Test Query (Run as authenticated user with NO league memberships):
-- Expected: Should return 0 rows
SELECT COUNT(*) as visible_teams
FROM teams;

-- ✅ PASS if: Returns 0
-- ❌ FAIL if: Returns > 0 (RLS allowing unauthorized access)

-- ==============================================================================
-- TEST SCENARIO 4: League Admin Can Manage Their League's Data
-- ==============================================================================

-- Setup: Create test membership (run as service role)
-- Note: Replace <test_user_id> with actual test user UUID
DO $$
DECLARE
  test_user_id UUID := '<test_user_id>'; -- REPLACE THIS
  test_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
BEGIN
  INSERT INTO league_memberships (league_id, user_id, role, status)
  VALUES (test_league_id, test_user_id, 'admin', 'active')
  ON CONFLICT (league_id, user_id) DO NOTHING;
END $$;

-- Test Query (Run as test user who is admin of League #1):
-- Expected: Should be able to INSERT, UPDATE, DELETE teams in League #1
INSERT INTO teams (league_id, name, short_name)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Admin Test Team', 'ATT')
RETURNING id, name;

-- ✅ PASS if: Insert succeeds
-- ❌ FAIL if: Permission denied

-- ==============================================================================
-- TEST SCENARIO 5: League Member Cannot Modify Data (Read-Only)
-- ==============================================================================

-- Setup: Create member-level user
DO $$
DECLARE
  test_member_id UUID := '<test_member_id>'; -- REPLACE THIS
  test_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
BEGIN
  INSERT INTO league_memberships (league_id, user_id, role, status)
  VALUES (test_league_id, test_member_id, 'member', 'active')
  ON CONFLICT (league_id, user_id) DO NOTHING;
END $$;

-- Test Query (Run as test user who is member of League #1):
-- Expected: SELECT should work, INSERT/UPDATE/DELETE should fail
SELECT COUNT(*) FROM teams WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

-- ✅ PASS if: SELECT works

-- Now try to insert (should fail)
INSERT INTO teams (league_id, name, short_name)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Member Test Team', 'MTT');

-- ✅ PASS if: INSERT fails with permission denied
-- ❌ FAIL if: INSERT succeeds (member should not have write access)

-- ==============================================================================
-- TEST SCENARIO 6: Scorekeeper Can Only Edit Games, Not Create Them
-- ==============================================================================

-- Setup: Create scorekeeper user
DO $$
DECLARE
  test_scorekeeper_id UUID := '<test_scorekeeper_id>'; -- REPLACE THIS
  test_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
BEGIN
  -- Add to league_memberships
  INSERT INTO league_memberships (league_id, user_id, role, status)
  VALUES (test_league_id, test_scorekeeper_id, 'scorekeeper', 'active')
  ON CONFLICT (league_id, user_id) DO NOTHING;

  -- Add to league_scorekeepers
  INSERT INTO league_scorekeepers (league_id, scorekeeper_id, status, hourly_rate)
  VALUES (test_league_id, test_scorekeeper_id, 'active', 25.00)
  ON CONFLICT (league_id, scorekeeper_id) DO NOTHING;
END $$;

-- Test Query (Run as scorekeeper user):
-- Expected: Can view games, can INSERT/UPDATE player_stats, cannot create games
SELECT COUNT(*) FROM games WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

-- ✅ PASS if: Can view games

-- Try to insert game (should fail - scorekeepers shouldn't create games)
INSERT INTO games (league_id, season_id, home_team_id, away_team_id, status, scheduled_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  (SELECT id FROM seasons LIMIT 1),
  (SELECT id FROM teams LIMIT 1),
  (SELECT id FROM teams OFFSET 1 LIMIT 1),
  'scheduled',
  NOW()
);

-- ✅ PASS if: INSERT fails (scorekeepers should not create games)
-- ❌ FAIL if: INSERT succeeds

-- ==============================================================================
-- TEST SCENARIO 7: Helper Functions Respect RLS
-- ==============================================================================

-- Test get_user_league_ids() function
-- Expected: Should only return leagues user has membership in
SELECT * FROM get_user_league_ids(auth.uid());

-- ✅ PASS if: Only returns leagues where user is a member
-- ❌ FAIL if: Returns all leagues

-- Test is_league_owner() function
-- Expected: Should return true only if user is owner
SELECT is_league_owner(auth.uid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);

-- ✅ PASS if: Returns true for owners, false for non-owners
-- ❌ FAIL if: Incorrect permission check

-- Test is_league_admin() function
-- Expected: Should return true for owners and admins
SELECT is_league_admin(auth.uid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);

-- ✅ PASS if: Returns true for owner/admin, false otherwise
-- ❌ FAIL if: Incorrect permission check

-- ==============================================================================
-- TEST SCENARIO 8: Cross-League Data Isolation for Game Stats
-- ==============================================================================

-- Setup: Create test game in each league
DO $$
DECLARE
  league_1_game_id UUID;
  league_2_game_id UUID;
  league_1_player_id UUID;
  league_2_player_id UUID;
BEGIN
  -- Create test games (as service role)
  INSERT INTO games (league_id, season_id, home_team_id, away_team_id, status, scheduled_at)
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    (SELECT id FROM seasons WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid LIMIT 1),
    (SELECT id FROM teams WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid LIMIT 1),
    (SELECT id FROM teams WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid OFFSET 1 LIMIT 1),
    'scheduled',
    NOW()
  ) RETURNING id INTO league_1_game_id;

  INSERT INTO games (league_id, season_id, home_team_id, away_team_id, status, scheduled_at)
  VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    (SELECT id FROM seasons WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid LIMIT 1),
    (SELECT id FROM teams WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid LIMIT 1),
    (SELECT id FROM teams WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid OFFSET 1 LIMIT 1),
    'scheduled',
    NOW()
  ) RETURNING id INTO league_2_game_id;

  RAISE NOTICE 'Created test games: League 1 = %, League 2 = %', league_1_game_id, league_2_game_id;
END $$;

-- Test Query (Run as user in League #1 only):
-- Expected: Should only see games from League #1
SELECT
  id,
  league_id,
  status
FROM games
WHERE status = 'scheduled'
ORDER BY scheduled_at;

-- ✅ PASS if: Only returns League #1 games
-- ❌ FAIL if: Returns games from multiple leagues

-- ==============================================================================
-- TEST SCENARIO 9: Payment Data Isolation
-- ==============================================================================

-- Test Query (Run as user in League #1):
-- Expected: Should only see payments for League #1
SELECT
  league_id,
  COUNT(*) as payment_count,
  SUM(amount) as total_amount
FROM payments
GROUP BY league_id;

-- ✅ PASS if: Only shows League #1 payments
-- ❌ FAIL if: Shows payments from multiple leagues

-- ==============================================================================
-- TEST SCENARIO 10: League Switching Works Correctly
-- ==============================================================================

-- Setup: Add test user to multiple leagues
DO $$
DECLARE
  test_user_id UUID := '<test_user_id>'; -- REPLACE THIS
BEGIN
  -- Add to League #1
  INSERT INTO league_memberships (league_id, user_id, role, status)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, test_user_id, 'admin', 'active')
  ON CONFLICT (league_id, user_id) DO NOTHING;

  -- Add to League #2
  INSERT INTO league_memberships (league_id, user_id, role, status)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, test_user_id, 'admin', 'active')
  ON CONFLICT (league_id, user_id) DO NOTHING;
END $$;

-- Test Query 1 (Filter by League #1):
SELECT COUNT(*) as league_1_teams
FROM teams
WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

-- Test Query 2 (Filter by League #2):
SELECT COUNT(*) as league_2_teams
FROM teams
WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

-- ✅ PASS if: Both queries work and return different counts
-- ❌ FAIL if: Either query fails or returns same data

-- ==============================================================================
-- CLEANUP: Remove Test Data
-- ==============================================================================

-- Run this after all tests to clean up test data

DO $$
BEGIN
  -- Delete test teams
  DELETE FROM teams WHERE name LIKE '%Test Team%';

  -- Delete test league #2
  DELETE FROM leagues WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

  RAISE NOTICE 'Test data cleaned up';
END $$;

-- ==============================================================================
-- RLS TESTING SUMMARY
-- ==============================================================================
--
-- All tests should PASS for RLS to be considered working correctly
--
-- Critical Security Requirements:
-- 1. Users can ONLY see data from leagues they belong to
-- 2. Users CANNOT see data from other leagues
-- 3. Role-based permissions work correctly (owner > admin > scorekeeper > member > player)
-- 4. Service role bypasses RLS for admin operations
-- 5. Helper functions respect RLS policies
--
-- If any tests FAIL:
-- 1. Review RLS policies in migration files
-- 2. Check for missing or incorrect USING/WITH CHECK clauses
-- 3. Verify league_memberships table is correct
-- 4. Document security issues immediately
-- ==============================================================================
