-- ==============================================================================
-- DASHBOARD INDEX VALIDATION QUERIES
-- ==============================================================================
-- Description: Queries to validate index performance and usage
-- Purpose: Ensure indexes are being used correctly by query planner
-- Date: January 31, 2026
-- ==============================================================================

-- ==============================================================================
-- STEP 1: Verify All Indexes Exist
-- ==============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_organizations_dashboard_owner_covering',
  'idx_organization_members_active_user',
  'idx_leagues_org_active_covering',
  'idx_teams_league_active_covering',
  'idx_team_rosters_active_count',
  'idx_league_memberships_user_active_covering'
)
ORDER BY tablename, indexname;

-- Expected: 6 rows (all indexes present)

-- ==============================================================================
-- STEP 2: Check Index Sizes
-- ==============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS index_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) AS table_size,
  ROUND(
    100.0 * pg_relation_size(indexrelid::regclass) / NULLIF(pg_relation_size(tablename::regclass), 0),
    2
  ) AS index_to_table_ratio_pct
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%dashboard%'
ORDER BY pg_relation_size(indexrelid::regclass) DESC;

-- Expected: Index size should be 20-30% of table size for covering indexes

-- ==============================================================================
-- STEP 3: Analyze Query Plans (Index Usage)
-- ==============================================================================

-- Query 1: Fetch organizations for user (should use covering index)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  id,
  name,
  slug,
  subscription_tier,
  subscription_status,
  trial_ends_at,
  created_at
FROM organizations
WHERE owner_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
ORDER BY created_at DESC;

-- Expected:
-- -> Index Only Scan using idx_organizations_dashboard_owner_covering
--    Heap Fetches: 0 (important!)

-- Query 2: Fetch active member organizations (should use partial index)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  om.organization_id,
  om.user_id,
  om.role
FROM organization_members om
WHERE om.user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND om.status = 'active';

-- Expected:
-- -> Index Only Scan using idx_organization_members_active_user
--    Filter: status = 'active' (optimized by partial index)

-- Query 3: Fetch leagues for organizations (should use covering index)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  id,
  name,
  slug,
  status,
  created_at,
  organization_id
FROM leagues
WHERE organization_id IN (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid
)
AND status = 'active'
ORDER BY created_at DESC;

-- Expected:
-- -> Index Only Scan using idx_leagues_org_active_covering
--    Index Cond: organization_id = ANY (...)
--    Filter: status = 'active' (optimized by partial index)

-- Query 4: Count teams per league (should use covering index)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  league_id,
  COUNT(*) AS team_count
FROM teams
WHERE league_id IN (
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid
)
AND status = 'active'
GROUP BY league_id;

-- Expected:
-- -> HashAggregate
--    -> Index Only Scan using idx_teams_league_active_covering
--       Index Cond: league_id = ANY (...)

-- Query 5: Count players per team (should use covering index)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  team_id,
  COUNT(DISTINCT player_id) AS player_count
FROM team_rosters
WHERE team_id IN (
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  'gggggggg-gggg-gggg-gggg-gggggggggggg'::uuid
)
AND status = 'active'
GROUP BY team_id;

-- Expected:
-- -> HashAggregate
--    -> Index Only Scan using idx_team_rosters_active_count
--       Index Cond: team_id = ANY (...)
--       Filter: status = 'active' (optimized by partial index)

-- ==============================================================================
-- STEP 4: Validate Index-Only Scans (Critical)
-- ==============================================================================

-- This query checks if indexes are being used as Index-Only Scans (IOS)
-- vs Index Scans (IS) which require heap fetches

DO $$
DECLARE
  plan_text TEXT;
  index_name TEXT;
BEGIN
  -- Test each critical query
  FOR index_name IN
    SELECT DISTINCT indexname
    FROM pg_indexes
    WHERE indexname LIKE 'idx_%dashboard%'
  LOOP
    -- Check if index is used in Index-Only Scan
    SELECT query_plan INTO plan_text
    FROM (
      EXPLAIN
      SELECT * FROM organizations WHERE owner_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
    ) AS query_plan;

    IF plan_text LIKE '%Index Only Scan%' THEN
      RAISE NOTICE '✅ Index % is using Index-Only Scan (optimal)', index_name;
    ELSIF plan_text LIKE '%Index Scan%' THEN
      RAISE WARNING '⚠️  Index % is using Index Scan (suboptimal, heap fetches required)', index_name;
    ELSE
      RAISE WARNING '❌ Index % is NOT being used (query planner chose different plan)', index_name;
    END IF;
  END LOOP;
END $$;

-- Expected: All dashboard indexes should report "Index-Only Scan"

-- ==============================================================================
-- STEP 5: Monitor Index Usage (Run After 24 Hours in Production)
-- ==============================================================================

-- Check how many times each index has been used
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  CASE
    WHEN idx_scan = 0 THEN '❌ UNUSED'
    WHEN idx_scan < 100 THEN '⚠️  LOW USAGE'
    WHEN idx_scan < 1000 THEN '✅ MODERATE'
    ELSE '✅ HIGH USAGE'
  END AS usage_level
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%dashboard%'
ORDER BY idx_scan DESC;

-- Expected after 24 hours:
-- - idx_organizations_dashboard_owner_covering: >1000 scans
-- - idx_leagues_org_active_covering: >1000 scans
-- - idx_teams_league_active_covering: >1000 scans

-- If any index shows "UNUSED", investigate:
-- 1. Is the query being executed?
-- 2. Is the query planner choosing a different index?
-- 3. Are statistics up to date? (run ANALYZE)

-- ==============================================================================
-- STEP 6: Identify Bloated Indexes (Run Monthly)
-- ==============================================================================

-- Index bloat can slow down queries over time
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS index_size,
  pg_size_pretty(
    pg_relation_size(indexrelid::regclass) -
    (pg_relation_size(indexrelid::regclass) * current_setting('fillfactor')::integer / 100)
  ) AS estimated_bloat,
  ROUND(
    100.0 * (
      pg_relation_size(indexrelid::regclass) -
      (pg_relation_size(indexrelid::regclass) * COALESCE(reloptions[array_position(reloptions, 'fillfactor')], '90')::integer / 100)
    ) / NULLIF(pg_relation_size(indexrelid::regclass), 0),
    2
  ) AS bloat_pct
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%dashboard%'
ORDER BY pg_relation_size(indexrelid::regclass) DESC;

-- If bloat_pct > 30%, consider rebuilding:
-- REINDEX INDEX CONCURRENTLY idx_organizations_dashboard_owner_covering;

-- ==============================================================================
-- STEP 7: Validate RLS Performance Impact
-- ==============================================================================

-- Check if RLS policies are causing performance issues
-- Compare query time with and without RLS

-- OPTION 1: Measure with RLS enabled (normal user query)
\timing on
SET ROLE authenticated;
SELECT COUNT(*) FROM organizations WHERE owner_user_id = auth.uid();
\timing off

-- OPTION 2: Measure without RLS (service role)
\timing on
SET ROLE service_role;
SELECT COUNT(*) FROM organizations WHERE owner_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
\timing off

-- Expected: RLS should add <10ms overhead
-- If RLS adds >50ms, investigate:
-- 1. Are subqueries in RLS policies indexed?
-- 2. Is league_memberships query optimized?

-- ==============================================================================
-- STEP 8: Full Dashboard Query Benchmark
-- ==============================================================================

-- Simulate the full dashboard query to measure end-to-end performance

\timing on

-- Step 1: Get user's organizations
WITH user_orgs AS (
  SELECT id, name, slug, subscription_tier, subscription_status, trial_ends_at, created_at
  FROM organizations
  WHERE owner_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid

  UNION

  SELECT o.id, o.name, o.slug, o.subscription_tier, o.subscription_status, o.trial_ends_at, o.created_at
  FROM organizations o
  INNER JOIN organization_members om ON om.organization_id = o.id
  WHERE om.user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
    AND om.status = 'active'
),
-- Step 2: Get league stats
league_stats AS (
  SELECT
    l.organization_id,
    COUNT(DISTINCT l.id) AS league_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') AS team_count,
    COUNT(DISTINCT tr.player_id) FILTER (WHERE tr.status = 'active') AS player_count
  FROM leagues l
  LEFT JOIN teams t ON t.league_id = l.id
  LEFT JOIN team_rosters tr ON tr.team_id = t.id
  WHERE l.organization_id IN (SELECT id FROM user_orgs)
    AND l.status = 'active'
  GROUP BY l.organization_id
)
-- Step 3: Join and aggregate
SELECT
  uo.id,
  uo.name,
  uo.slug,
  uo.subscription_tier,
  uo.subscription_status,
  uo.trial_ends_at,
  uo.created_at,
  COALESCE(ls.league_count, 0) AS league_count,
  COALESCE(ls.team_count, 0) AS team_count,
  COALESCE(ls.player_count, 0) AS player_count
FROM user_orgs uo
LEFT JOIN league_stats ls ON ls.organization_id = uo.id
ORDER BY uo.created_at DESC;

\timing off

-- Expected: <100ms for 10 orgs, 50 leagues, 400 teams
-- If >150ms, check EXPLAIN (ANALYZE) output for bottlenecks

-- ==============================================================================
-- STEP 9: Compare Before/After Performance
-- ==============================================================================

-- This query simulates the "before" scenario (without indexes)
-- DO NOT RUN IN PRODUCTION - for benchmarking only

-- Disable all dashboard indexes temporarily
-- SET enable_indexonlyscan = off;
-- SET enable_indexscan = off;
-- SET enable_bitmapscan = off;

-- \timing on
-- SELECT * FROM organizations WHERE owner_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
-- \timing off

-- Re-enable indexes
-- SET enable_indexonlyscan = on;
-- SET enable_indexscan = on;
-- SET enable_bitmapscan = on;

-- Compare execution time to see performance improvement

-- ==============================================================================
-- STEP 10: Generate Performance Report
-- ==============================================================================

-- Generate a comprehensive report of index performance

SELECT
  'Dashboard Index Performance Report' AS report_title,
  NOW() AS generated_at;

SELECT
  '=== INDEX USAGE STATISTICS ===' AS section;

SELECT
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%dashboard%'
ORDER BY idx_scan DESC;

SELECT
  '=== SLOW QUERIES (>100ms) ===' AS section;

SELECT
  calls,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(max_exec_time::numeric, 2) AS max_ms,
  LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE query LIKE '%organizations%'
  AND mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

SELECT
  '=== TABLE STATISTICS ===' AS section;

SELECT
  schemaname,
  tablename,
  n_live_tup AS row_count,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename IN ('organizations', 'leagues', 'teams', 'team_rosters', 'organization_members')
ORDER BY n_live_tup DESC;

-- ==============================================================================
-- VALIDATION COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Dashboard index validation complete';
  RAISE NOTICE '📊 Review the output above to ensure:';
  RAISE NOTICE '   1. All 6 indexes exist';
  RAISE NOTICE '   2. Queries use Index-Only Scans (not Index Scans)';
  RAISE NOTICE '   3. Index sizes are 20-30%% of table size';
  RAISE NOTICE '   4. No slow queries >100ms';
  RAISE NOTICE '   5. Index usage >1000 scans/day (after 24 hours)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  If any validation fails:';
  RAISE NOTICE '   - Run ANALYZE to update statistics';
  RAISE NOTICE '   - Check EXPLAIN plans for each query';
  RAISE NOTICE '   - Verify RLS policies are not causing overhead';
  RAISE NOTICE '   - Consider REINDEX if bloat >30%%';
END $$;
