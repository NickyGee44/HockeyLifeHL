-- ============================================
-- Database State Checker
-- Run this in Supabase SQL Editor to see what's already set up
-- ============================================

-- Check if core tables exist
SELECT 
  'Tables' as category,
  table_name as item,
  CASE 
    WHEN table_name IN (
      'profiles', 'teams', 'seasons', 'games', 'team_rosters',
      'player_stats', 'goalie_stats', 'drafts', 'draft_picks',
      'articles', 'suspensions', 'player_ratings'
    ) THEN '✅ Core Table'
    WHEN table_name = 'payments' THEN '✅ Migration: Payments'
    WHEN table_name = 'draft_order' THEN '✅ Migration: Draft Order'
    ELSE '⚠️ Additional Table'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY 
  CASE 
    WHEN table_name IN ('profiles', 'teams', 'seasons', 'games', 'team_rosters', 
                         'player_stats', 'goalie_stats', 'drafts', 'draft_picks',
                         'articles', 'suspensions', 'player_ratings') THEN 1
    WHEN table_name IN ('payments', 'draft_order') THEN 2
    ELSE 3
  END,
  table_name;

-- Check if migrations have been applied
SELECT 
  'Migrations' as category,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_stats' AND column_name = 'season_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goalie_stats' AND column_name = 'season_id')
    THEN '✅ add_season_to_stats.sql'
    ELSE '❌ add_season_to_stats.sql'
  END as migration_status
UNION ALL
SELECT 
  'Migrations',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seasons' AND column_name = 'draft_scheduled_at')
    THEN '✅ add_season_schedule_fields.sql'
    ELSE '❌ add_season_schedule_fields.sql'
  END
UNION ALL
SELECT 
  'Migrations',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'draft_order')
    THEN '✅ add_draft_order.sql'
    ELSE '❌ add_draft_order.sql'
  END
UNION ALL
SELECT 
  'Migrations',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drafts' AND column_name = 'draft_link')
    THEN '✅ add_draft_link.sql'
    ELSE '❌ add_draft_link.sql'
  END
UNION ALL
SELECT 
  'Migrations',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments')
    THEN '✅ add_payments_table.sql'
    ELSE '❌ add_payments_table.sql'
  END;

-- Check for data in core tables (these should exist if schema.sql was run)
SELECT 
  'Data Counts' as category,
  'profiles' as table_name,
  COUNT(*)::text as count
FROM profiles
UNION ALL
SELECT 'Data Counts', 'teams', COUNT(*)::text FROM teams
UNION ALL
SELECT 'Data Counts', 'seasons', COUNT(*)::text FROM seasons
UNION ALL
SELECT 'Data Counts', 'games', COUNT(*)::text FROM games
UNION ALL
SELECT 'Data Counts', 'team_rosters', COUNT(*)::text FROM team_rosters
UNION ALL
SELECT 'Data Counts', 'player_stats', COUNT(*)::text FROM player_stats
UNION ALL
SELECT 'Data Counts', 'goalie_stats', COUNT(*)::text FROM goalie_stats
UNION ALL
SELECT 'Data Counts', 'drafts', COUNT(*)::text FROM drafts;

-- Check if ENUMs exist
SELECT 
  'ENUMs' as category,
  typname as enum_name,
  '✅ Exists' as status
FROM pg_type
WHERE typname IN ('user_role', 'player_rating', 'game_status', 'season_status', 
                  'article_type', 'draft_status', 'payment_method', 'payment_status')
ORDER BY typname;

-- Note: Payments table count is not included here to avoid errors if migration hasn't been run
-- Check the "Migrations" section above to see if payments table exists
-- If it exists, you can manually run: SELECT COUNT(*) FROM payments;

