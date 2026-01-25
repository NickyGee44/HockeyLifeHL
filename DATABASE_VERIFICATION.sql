-- ============================================
-- 🍁🏒 HockeyLifeHL Database Verification 🏒🍁
-- ============================================
-- Run this script in Supabase SQL Editor to check database status

-- ============================================
-- STEP 1: CHECK EXISTING TABLES
-- ============================================
-- This will show all tables in your database

SELECT
  tablename,
  CASE
    WHEN tablename IN (
      'profiles', 'teams', 'seasons', 'games', 'team_rosters',
      'player_stats', 'goalie_stats', 'suspensions', 'articles',
      'drafts', 'draft_picks', 'draft_order', 'player_ratings',
      'season_opt_ins', 'player_availability', 'team_messages',
      'stat_disputes', 'payments', 'email_drafts'
    ) THEN '✅ EXPECTED'
    ELSE '⚠️ EXTRA'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- STEP 2: CHECK MISSING TABLES
-- ============================================
-- This will show which expected tables are missing

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'profiles', 'teams', 'seasons', 'games', 'team_rosters',
    'player_stats', 'goalie_stats', 'suspensions', 'articles',
    'drafts', 'draft_picks', 'draft_order', 'player_ratings',
    'season_opt_ins', 'player_availability', 'team_messages',
    'stat_disputes', 'payments', 'email_drafts'
  ]) as table_name
),
existing_tables AS (
  SELECT tablename as table_name
  FROM pg_tables
  WHERE schemaname = 'public'
)
SELECT
  e.table_name,
  CASE
    WHEN x.table_name IS NULL THEN '❌ MISSING - NEEDS MIGRATION'
    ELSE '✅ EXISTS'
  END as status
FROM expected_tables e
LEFT JOIN existing_tables x ON e.table_name = x.table_name
ORDER BY
  CASE WHEN x.table_name IS NULL THEN 0 ELSE 1 END,
  e.table_name;

-- ============================================
-- STEP 3: CHECK ENUMS
-- ============================================

SELECT
  typname as enum_name,
  CASE
    WHEN typname IN (
      'user_role', 'player_rating', 'game_status',
      'season_status', 'article_type', 'draft_status',
      'payment_method', 'payment_status'
    ) THEN '✅ EXPECTED'
    ELSE '⚠️ EXTRA'
  END as status
FROM pg_type
WHERE typtype = 'e'
ORDER BY typname;

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Run this script in Supabase SQL Editor
-- 2. Review the results to see what's missing
-- 3. If you see "❌ MISSING" tables, continue to the next step
-- 4. Copy and run the "APPLY_MIGRATIONS.sql" script to add missing tables
