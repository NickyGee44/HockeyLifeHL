-- ==============================================================================
-- DIAGNOSTIC SCRIPT: Identify Duplicate Season Names
-- ==============================================================================
-- Purpose: Check for duplicate season names that will conflict during migration
-- Run this BEFORE attempting the fixed migration
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'DIAGNOSTIC: Checking for duplicate data that will cause conflicts';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- Check 1: Show all seasons and their current league_id status
-- ==============================================================================
SELECT
  'Current Seasons Status' as info,
  id,
  name,
  league_id,
  CASE
    WHEN league_id IS NULL THEN '❌ NOT MIGRATED'
    WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN '✅ ALREADY MIGRATED'
    ELSE '⚠️ UNEXPECTED league_id'
  END as status,
  created_at
FROM seasons
ORDER BY name, created_at;

-- ==============================================================================
-- Check 2: Identify duplicate season names
-- ==============================================================================
SELECT
  'Duplicate Season Names' as info,
  name,
  COUNT(*) as count,
  COUNT(CASE WHEN league_id IS NULL THEN 1 END) as not_migrated,
  COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END) as already_migrated
FROM seasons
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ==============================================================================
-- Check 3: Show the specific "2025 Winter Season" records
-- ==============================================================================
SELECT
  'Specific: 2025 Winter Season Records' as info,
  id,
  name,
  league_id,
  CASE
    WHEN league_id IS NULL THEN 'NOT MIGRATED'
    ELSE 'ALREADY MIGRATED'
  END as status,
  created_at,
  start_date,
  end_date
FROM seasons
WHERE name = '2025 Winter Season'
ORDER BY created_at;

-- ==============================================================================
-- Check 4: Check if this is a data quality issue (true duplicates)
-- ==============================================================================
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT name, COUNT(*) as cnt
    FROM seasons
    GROUP BY name
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ FOUND % DUPLICATE SEASON NAMES', duplicate_count;
    RAISE NOTICE '';
    RAISE NOTICE 'These duplicates will cause the migration to fail.';
    RAISE NOTICE 'You have two options:';
    RAISE NOTICE '  1. Merge the duplicate records (keep one, delete others)';
    RAISE NOTICE '  2. Rename duplicates to make them unique';
    RAISE NOTICE '';
    RAISE NOTICE 'I will provide a script to handle this automatically.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ No duplicate season names found - migration should work';
  END IF;
END $$;

-- ==============================================================================
-- Check 5: Check other tables for similar issues
-- ==============================================================================
SELECT
  'Duplicate Team Names' as info,
  name,
  COUNT(*) as count,
  COUNT(CASE WHEN league_id IS NULL THEN 1 END) as not_migrated,
  COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END) as already_migrated
FROM teams
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ==============================================================================
-- END OF DIAGNOSTICS
-- ==============================================================================
