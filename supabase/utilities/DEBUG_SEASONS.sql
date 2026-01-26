-- ==============================================================================
-- DEBUG: Show All Seasons and Their Status
-- ==============================================================================
-- Run this FIRST to see exactly what duplicate data you have
-- ==============================================================================

-- Show all seasons
SELECT
  '=== ALL SEASONS ===' as section,
  id,
  name,
  CASE
    WHEN league_id IS NULL THEN '❌ NULL'
    WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN '✅ League #1'
    ELSE '⚠️ Other League'
  END as league_status,
  league_id,
  created_at
FROM seasons
ORDER BY name, created_at;

-- Count duplicates by name
SELECT
  '=== DUPLICATE COUNTS ===' as section,
  name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN league_id IS NULL THEN 1 END) as null_count,
  COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END) as league1_count,
  STRING_AGG(id::text, ', ') as all_ids
FROM seasons
GROUP BY name
ORDER BY total_count DESC, name;

-- Show specifically "2025 Winter Season"
SELECT
  '=== 2025 WINTER SEASON RECORDS ===' as section,
  id,
  name,
  league_id,
  created_at,
  start_date,
  end_date
FROM seasons
WHERE name = '2025 Winter Season'
ORDER BY created_at;

-- Show how many seasons have NULL league_id
SELECT
  '=== SUMMARY ===' as section,
  COUNT(*) as total_seasons,
  COUNT(CASE WHEN league_id IS NULL THEN 1 END) as null_league_id,
  COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END) as already_in_league_1
FROM seasons;
