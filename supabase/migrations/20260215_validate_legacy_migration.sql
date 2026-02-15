-- ==============================================================================
-- VALIDATION: Verify Legacy Stats Migration Integrity
-- ==============================================================================
-- Description: Comprehensive validation of migration results
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

-- Check 1: All legacy players have profiles
SELECT
  'Profile Matching' as check_name,
  COUNT(*) as total_legacy,
  COUNT(matched_to_profile_id) as matched,
  COUNT(*) - COUNT(matched_to_profile_id) as unmatched
FROM legacy_players;
-- Expected: total=923, matched=923, unmatched=0

-- Check 2: All profiles have stats
SELECT
  'Stats Coverage' as check_name,
  COUNT(DISTINCT lp.matched_to_profile_id) as players_with_profiles,
  COUNT(DISTINCT ps.player_id) as players_with_skater_stats,
  COUNT(DISTINCT gs.player_id) as players_with_goalie_stats
FROM legacy_players lp
LEFT JOIN player_stats ps ON lp.matched_to_profile_id = ps.player_id
  AND ps.season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)')
LEFT JOIN goalie_stats gs ON lp.matched_to_profile_id = gs.player_id
  AND gs.season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)');
-- Expected: players_with_profiles=923, players_with_skater_stats=795, players_with_goalie_stats=128

-- Check 3: Stats totals match legacy data
WITH legacy_totals AS (
  SELECT
    SUM(CASE WHEN is_goalie = FALSE THEN goals ELSE 0 END) as legacy_goals,
    SUM(CASE WHEN is_goalie = FALSE THEN assists ELSE 0 END) as legacy_assists,
    SUM(CASE WHEN is_goalie = FALSE THEN points ELSE 0 END) as legacy_points,
    SUM(CASE WHEN is_goalie = TRUE THEN saves ELSE 0 END) as legacy_saves,
    SUM(CASE WHEN is_goalie = TRUE THEN goals_against ELSE 0 END) as legacy_ga
  FROM legacy_players
),
migrated_totals AS (
  SELECT
    COALESCE(SUM(ps.goals), 0) as migrated_goals,
    COALESCE(SUM(ps.assists), 0) as migrated_assists,
    COALESCE(SUM(ps.goals + ps.assists), 0) as migrated_points,
    COALESCE(SUM(gs.saves), 0) as migrated_saves,
    COALESCE(SUM(gs.goals_against), 0) as migrated_ga
  FROM player_stats ps
  FULL OUTER JOIN goalie_stats gs ON FALSE
  WHERE ps.season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)')
     OR gs.season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)')
)
SELECT
  'Stats Totals Match' as check_name,
  lt.legacy_goals,
  mt.migrated_goals,
  lt.legacy_goals = mt.migrated_goals as goals_match,
  lt.legacy_assists,
  mt.migrated_assists,
  lt.legacy_assists = mt.migrated_assists as assists_match,
  lt.legacy_points,
  mt.migrated_points,
  lt.legacy_points = mt.migrated_points as points_match,
  lt.legacy_saves,
  mt.migrated_saves,
  lt.legacy_saves = mt.migrated_saves as saves_match,
  lt.legacy_ga,
  mt.migrated_ga,
  lt.legacy_ga = mt.migrated_ga as ga_match
FROM legacy_totals lt, migrated_totals mt;

-- Check 4: No orphaned games or stats
SELECT
  'Orphaned Records' as check_name,
  (SELECT COUNT(*) FROM games
   WHERE season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)')
     AND id NOT IN (
       SELECT DISTINCT game_id FROM player_stats
       UNION
       SELECT DISTINCT game_id FROM goalie_stats
     )
  ) as orphaned_games,
  (SELECT COUNT(*) FROM player_stats
   WHERE game_id NOT IN (SELECT id FROM games)
     AND season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)')
  ) as orphaned_player_stats,
  (SELECT COUNT(*) FROM goalie_stats
   WHERE game_id NOT IN (SELECT id FROM games)
     AND season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)')
  ) as orphaned_goalie_stats;
-- Expected: all zeros

-- Check 5: Season stats views work correctly
SELECT
  'Player Season Stats View' as check_name,
  COUNT(DISTINCT player_id) as players_in_view,
  SUM(goals) as total_goals,
  SUM(assists) as total_assists,
  SUM(points) as total_points
FROM player_season_stats
WHERE season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)');
-- Should match legacy totals

SELECT
  'Goalie Season Stats View' as check_name,
  COUNT(DISTINCT player_id) as goalies_in_view,
  SUM(saves) as total_saves,
  SUM(goals_against) as total_goals_against
FROM goalie_season_stats
WHERE season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)');
-- Should match legacy totals

-- Final Summary
SELECT
  '=== MIGRATION VALIDATION COMPLETE ===' as summary,
  CASE
    WHEN (SELECT COUNT(*) - COUNT(matched_to_profile_id) FROM legacy_players) = 0
     AND (SELECT COUNT(DISTINCT player_id) FROM player_stats WHERE season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)')) = 795
     AND (SELECT COUNT(DISTINCT player_id) FROM goalie_stats WHERE season_id IN (SELECT id FROM seasons WHERE name = 'HLHL Legacy Stats (Pre-2026)')) = 128
    THEN '✅ ALL CHECKS PASSED'
    ELSE '❌ VALIDATION FAILED - CHECK INDIVIDUAL TESTS ABOVE'
  END as status;
