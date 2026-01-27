-- Comprehensive Database Schema and Data Integrity Check
-- Run this in Supabase SQL Editor to verify multi-tenant setup

-- ============================================================================
-- 1. CHECK PROFILES TABLE
-- ============================================================================
SELECT 'PROFILES TABLE STRUCTURE' as check_name;

-- Check if profiles table has correct columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check profiles data
SELECT
  COUNT(*) as total_profiles,
  COUNT(DISTINCT id) as unique_users,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as profiles_without_email,
  COUNT(CASE WHEN full_name IS NULL THEN 1 END) as profiles_without_name
FROM profiles;

-- ============================================================================
-- 2. CHECK LEAGUE_MEMBERSHIPS TABLE (Critical for multi-tenant)
-- ============================================================================
SELECT 'LEAGUE_MEMBERSHIPS TABLE' as check_name;

-- Check if league_memberships table exists and has correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'league_memberships'
ORDER BY ordinal_position;

-- Check memberships data
SELECT
  COUNT(*) as total_memberships,
  COUNT(DISTINCT league_id) as leagues_with_members,
  COUNT(DISTINCT user_id) as users_with_memberships,
  COUNT(CASE WHEN role = 'owner' THEN 1 END) as owners,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'captain' THEN 1 END) as captains,
  COUNT(CASE WHEN role = 'player' THEN 1 END) as players
FROM league_memberships;

-- ============================================================================
-- 3. CHECK LEAGUES TABLE
-- ============================================================================
SELECT 'LEAGUES TABLE STRUCTURE' as check_name;

-- Check leagues table structure (should have branding columns)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leagues'
ORDER BY ordinal_position;

-- Check leagues data
SELECT
  id,
  name,
  slug,
  subdomain,
  custom_domain,
  status,
  primary_color,
  secondary_color,
  created_at
FROM leagues
ORDER BY created_at DESC;

-- ============================================================================
-- 4. CHECK SEASONS TABLE (Should have league_id)
-- ============================================================================
SELECT 'SEASONS TABLE' as check_name;

-- Check if seasons are linked to leagues
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'seasons'
AND column_name IN ('id', 'league_id', 'name', 'status');

-- Count seasons per league
SELECT
  l.name as league_name,
  COUNT(s.id) as season_count
FROM leagues l
LEFT JOIN seasons s ON s.league_id = l.id
GROUP BY l.id, l.name
ORDER BY l.name;

-- ============================================================================
-- 5. CHECK TEAMS TABLE (Should have league_id)
-- ============================================================================
SELECT 'TEAMS TABLE' as check_name;

-- Check teams table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'teams'
AND column_name IN ('id', 'league_id', 'name', 'captain_id');

-- Count teams per league
SELECT
  l.name as league_name,
  COUNT(t.id) as team_count
FROM leagues l
LEFT JOIN teams t ON t.league_id = l.id
GROUP BY l.id, l.name
ORDER BY l.name;

-- ============================================================================
-- 6. CHECK TEAM_ROSTERS TABLE (Links players to teams)
-- ============================================================================
SELECT 'TEAM_ROSTERS TABLE' as check_name;

-- Check team_rosters structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'team_rosters'
AND column_name IN ('id', 'team_id', 'player_id', 'season_id', 'jersey_number');

-- Count players per league
SELECT
  l.name as league_name,
  COUNT(DISTINCT tr.player_id) as player_count,
  COUNT(*) as total_roster_entries
FROM leagues l
LEFT JOIN teams t ON t.league_id = l.id
LEFT JOIN team_rosters tr ON tr.team_id = t.id
GROUP BY l.id, l.name
ORDER BY l.name;

-- ============================================================================
-- 7. CHECK GAMES TABLE (Should have league_id)
-- ============================================================================
SELECT 'GAMES TABLE' as check_name;

-- Check games table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'games'
AND column_name IN ('id', 'league_id', 'season_id', 'home_team_id', 'away_team_id');

-- Count games per league
SELECT
  l.name as league_name,
  COUNT(g.id) as game_count
FROM leagues l
LEFT JOIN games g ON g.league_id = l.id
GROUP BY l.id, l.name
ORDER BY l.name;

-- ============================================================================
-- 8. IDENTIFY ORPHANED DATA (Data without league associations)
-- ============================================================================
SELECT 'ORPHANED DATA CHECK' as check_name;

-- Profiles without league memberships
SELECT
  'Profiles without league memberships' as issue,
  COUNT(*) as count
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM league_memberships lm WHERE lm.user_id = p.id
);

-- Teams without a league
SELECT
  'Teams without league_id' as issue,
  COUNT(*) as count
FROM teams
WHERE league_id IS NULL;

-- Seasons without a league
SELECT
  'Seasons without league_id' as issue,
  COUNT(*) as count
FROM seasons
WHERE league_id IS NULL;

-- Games without a league
SELECT
  'Games without league_id' as issue,
  COUNT(*) as count
FROM games
WHERE league_id IS NULL;

-- ============================================================================
-- 9. CHECK ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
SELECT 'RLS POLICIES CHECK' as check_name;

-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'league_memberships', 'leagues', 'seasons', 'teams', 'games', 'team_rosters')
ORDER BY tablename;

-- Check RLS policies for key tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('league_memberships', 'seasons', 'teams', 'games')
ORDER BY tablename, policyname;

-- ============================================================================
-- 10. CHECK FOR MISSING FOREIGN KEYS
-- ============================================================================
SELECT 'FOREIGN KEYS CHECK' as check_name;

-- Check foreign key constraints on key tables
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
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('league_memberships', 'seasons', 'teams', 'games', 'team_rosters')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 'DATABASE HEALTH SUMMARY' as summary;

SELECT
  'Total Leagues' as metric,
  COUNT(*) as value
FROM leagues
UNION ALL
SELECT
  'Total Users',
  COUNT(DISTINCT id)
FROM profiles
UNION ALL
SELECT
  'Users with League Memberships',
  COUNT(DISTINCT user_id)
FROM league_memberships
UNION ALL
SELECT
  'Total Teams',
  COUNT(*)
FROM teams
UNION ALL
SELECT
  'Total Seasons',
  COUNT(*)
FROM seasons
UNION ALL
SELECT
  'Total Games',
  COUNT(*)
FROM games;
