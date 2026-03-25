-- ==============================================================================
-- AGENT 1 PHASE 2: PERFORMANCE TESTING
-- ==============================================================================
-- Purpose: Test query performance and index usage for multi-tenant queries
-- Run these with EXPLAIN ANALYZE to check execution plans
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- PERFORMANCE TEST 1: Simple League Filter on Teams
-- ==============================================================================

-- Query: Get all teams for a specific league
-- Expected: Should use idx_teams_league_id index
EXPLAIN ANALYZE
SELECT
  id,
  name,
  short_name,
  logo_url
FROM teams
WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

-- ✅ PASS if: Uses Index Scan on idx_teams_league_id
-- ✅ PASS if: Execution time < 10ms for small dataset
-- ❌ FAIL if: Uses Seq Scan (index not being used)

-- ==============================================================================
-- PERFORMANCE TEST 2: League + Season Filter on Games
-- ==============================================================================

-- Query: Get all games for a specific league and season
-- Expected: Should use composite index idx_games_league_season
EXPLAIN ANALYZE
SELECT
  g.id,
  g.home_team_id,
  g.away_team_id,
  g.scheduled_at,
  g.status
FROM games g
WHERE g.league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND g.season_id = (SELECT id FROM seasons WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid LIMIT 1);

-- ✅ PASS if: Uses Index Scan on idx_games_league_season
-- ✅ PASS if: Execution time < 20ms
-- ❌ FAIL if: Uses Seq Scan or slow execution

-- ==============================================================================
-- PERFORMANCE TEST 3: Player Stats Aggregation
-- ==============================================================================

-- Query: Get player stats for a league and season
-- Expected: Should use idx_player_stats_league_season index
EXPLAIN ANALYZE
SELECT
  ps.player_id,
  COUNT(DISTINCT ps.game_id) as games_played,
  SUM(ps.goals) as total_goals,
  SUM(ps.assists) as total_assists,
  SUM(ps.goals + ps.assists) as total_points
FROM player_stats ps
WHERE ps.league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND ps.season_id = (SELECT id FROM seasons WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid LIMIT 1)
GROUP BY ps.player_id
ORDER BY total_points DESC
LIMIT 20;

-- ✅ PASS if: Uses Index Scan on idx_player_stats_league_season
-- ✅ PASS if: Execution time < 50ms for typical dataset
-- ❌ FAIL if: Takes > 100ms (needs optimization)

-- ==============================================================================
-- PERFORMANCE TEST 4: Team Standings Calculation
-- ==============================================================================

-- Query: Calculate team standings for a league and season
-- Expected: Should efficiently join games and teams with league filter
EXPLAIN ANALYZE
SELECT
  t.id AS team_id,
  t.name,
  COUNT(g.id) AS games_played,
  SUM(CASE
    WHEN (g.home_team_id = t.id AND g.home_score > g.away_score) OR
         (g.away_team_id = t.id AND g.away_score > g.home_score)
    THEN 1 ELSE 0
  END) AS wins,
  SUM(CASE
    WHEN (g.home_team_id = t.id AND g.home_score < g.away_score) OR
         (g.away_team_id = t.id AND g.away_score < g.home_score)
    THEN 1 ELSE 0
  END) AS losses,
  SUM(CASE
    WHEN g.home_score = g.away_score THEN 1 ELSE 0
  END) AS ties
FROM teams t
LEFT JOIN games g ON (
  (g.home_team_id = t.id OR g.away_team_id = t.id)
  AND g.status = 'completed'
  AND g.league_id = t.league_id
)
WHERE t.league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
GROUP BY t.id, t.name
ORDER BY wins DESC;

-- ✅ PASS if: Uses Index Scans on league_id indexes
-- ✅ PASS if: Execution time < 100ms
-- ❌ FAIL if: Hash Join with Seq Scan (not using indexes)

-- ==============================================================================
-- PERFORMANCE TEST 5: League Membership Check
-- ==============================================================================

-- Query: Check if user is member of a league
-- Expected: Should use composite index idx_league_memberships_league_user
EXPLAIN ANALYZE
SELECT
  role,
  status
FROM league_memberships
WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND user_id = (SELECT id FROM profiles LIMIT 1);

-- ✅ PASS if: Uses Index Scan on idx_league_memberships_league_user
-- ✅ PASS if: Execution time < 5ms
-- ❌ FAIL if: Seq Scan or slow performance

-- ==============================================================================
-- PERFORMANCE TEST 6: Scorekeeper Assigned Games
-- ==============================================================================

-- Query: Get all games assigned to a specific scorekeeper
-- Expected: Should use idx_game_scorekeeper_assignments_scorekeeper_id
EXPLAIN ANALYZE
SELECT
  gsa.id,
  gsa.game_id,
  gsa.league_id,
  gsa.assigned_at,
  gsa.payment_status,
  g.scheduled_at,
  g.status as game_status
FROM game_scorekeeper_assignments gsa
JOIN games g ON g.id = gsa.game_id
WHERE gsa.scorekeeper_id = (SELECT id FROM profiles LIMIT 1)
  AND gsa.payment_status = 'pending'
ORDER BY gsa.assigned_at DESC;

-- ✅ PASS if: Uses Index Scan on scorekeeper_id
-- ✅ PASS if: Execution time < 20ms
-- ❌ FAIL if: Seq Scan on large table

-- ==============================================================================
-- PERFORMANCE TEST 7: Recent Games for a League
-- ==============================================================================

-- Query: Get recent completed games for a league
-- Expected: Should use idx_games_league_status and idx_games_league_scheduled
EXPLAIN ANALYZE
SELECT
  g.id,
  g.home_team_id,
  g.away_team_id,
  g.home_score,
  g.away_score,
  g.scheduled_at
FROM games g
WHERE g.league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND g.status = 'completed'
  AND g.scheduled_at >= NOW() - INTERVAL '7 days'
ORDER BY g.scheduled_at DESC
LIMIT 10;

-- ✅ PASS if: Uses Index Scan on idx_games_league_scheduled
-- ✅ PASS if: Execution time < 15ms
-- ❌ FAIL if: Seq Scan or bitmap scan without index

-- ==============================================================================
-- PERFORMANCE TEST 8: Draft Picks for a League
-- ==============================================================================

-- Query: Get all draft picks for a league and season
-- Expected: Should use idx_draft_picks_league_draft composite index
EXPLAIN ANALYZE
SELECT
  dp.id,
  dp.draft_id,
  dp.team_id,
  dp.player_id,
  dp.pick_number,
  dp.round
FROM draft_picks dp
JOIN drafts d ON d.id = dp.draft_id
WHERE dp.league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND d.season_id = (SELECT id FROM seasons WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid LIMIT 1)
ORDER BY dp.pick_number;

-- ✅ PASS if: Uses Index Scan
-- ✅ PASS if: Execution time < 30ms
-- ❌ FAIL if: Slow join or missing indexes

-- ==============================================================================
-- PERFORMANCE TEST 9: Payment Summary for a League
-- ==============================================================================

-- Query: Get payment summary for all players in a league
-- Expected: Should use idx_payments_league_status
EXPLAIN ANALYZE
SELECT
  p.player_id,
  COUNT(*) as payment_count,
  SUM(p.amount) as total_paid,
  MAX(p.payment_date) as last_payment
FROM payments p
WHERE p.league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND p.status = 'paid'
GROUP BY p.player_id
ORDER BY total_paid DESC;

-- ✅ PASS if: Uses Index Scan on idx_payments_league_status
-- ✅ PASS if: Execution time < 40ms
-- ❌ FAIL if: Seq Scan or slow aggregation

-- ==============================================================================
-- PERFORMANCE TEST 10: Helper Function Performance
-- ==============================================================================

-- Query: Test get_player_season_stats() helper function
-- Expected: Should complete quickly and use indexes internally
EXPLAIN ANALYZE
SELECT *
FROM get_player_season_stats(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  (SELECT id FROM seasons WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid LIMIT 1)
);

-- ✅ PASS if: Execution time < 50ms
-- ❌ FAIL if: Takes > 100ms (function needs optimization)

-- Query: Test get_team_standings() helper function
EXPLAIN ANALYZE
SELECT *
FROM get_team_standings(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  (SELECT id FROM seasons WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid LIMIT 1)
);

-- ✅ PASS if: Execution time < 100ms
-- ❌ FAIL if: Takes > 200ms (needs optimization)

-- ==============================================================================
-- INDEX COVERAGE ANALYSIS
-- ==============================================================================

-- Check which indexes exist and their usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'games', 'player_stats', 'goalie_stats',
    'league_memberships', 'game_scorekeeper_assignments'
  )
ORDER BY tablename, indexname;

-- ✅ PASS if: All league_id indexes show usage (idx_scan > 0)
-- ❌ FAIL if: Critical indexes have idx_scan = 0 (not being used)

-- ==============================================================================
-- MISSING INDEX RECOMMENDATIONS
-- ==============================================================================

-- Check for potential missing indexes by analyzing query patterns
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  CASE
    WHEN seq_scan > idx_scan THEN 'Consider adding index'
    ELSE 'OK'
  END as recommendation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'games', 'player_stats', 'goalie_stats',
    'drafts', 'payments', 'league_memberships'
  )
ORDER BY seq_scan DESC;

-- ✅ PASS if: Most tables show idx_scan > seq_scan
-- ⚠️ WARNING if: High seq_scan counts (may need additional indexes)

-- ==============================================================================
-- PERFORMANCE OPTIMIZATION RECOMMENDATIONS
-- ==============================================================================

-- If any queries are slow, consider these optimizations:
--
-- 1. Composite Indexes for Common Query Patterns:
--    - CREATE INDEX idx_games_league_season_status ON games(league_id, season_id, status);
--    - CREATE INDEX idx_player_stats_league_player_season ON player_stats(league_id, player_id, season_id);
--
-- 2. Partial Indexes for Specific Queries:
--    - CREATE INDEX idx_games_league_completed ON games(league_id, scheduled_at) WHERE status = 'completed';
--    - CREATE INDEX idx_payments_league_unpaid ON payments(league_id, player_id) WHERE status != 'paid';
--
-- 3. Covering Indexes for Read-Heavy Queries:
--    - CREATE INDEX idx_teams_league_with_name ON teams(league_id) INCLUDE (name, short_name, logo_url);
--
-- 4. Function-Based Indexes:
--    - CREATE INDEX idx_games_scheduled_date ON games(league_id, DATE(scheduled_at));
--
-- ==============================================================================
-- PERFORMANCE TESTING SUMMARY
-- ==============================================================================
--
-- All queries should complete in reasonable time:
-- - Simple filters: < 10ms
-- - Joins: < 50ms
-- - Aggregations: < 100ms
-- - Complex calculations: < 200ms
--
-- If queries exceed these thresholds:
-- 1. Check EXPLAIN ANALYZE output for Seq Scans
-- 2. Verify indexes are being used
-- 3. Consider adding recommended indexes above
-- 4. Check for N+1 query problems in application code
-- 5. Document slow queries in AGENT_1_PHASE_2_REPORT.md
-- ==============================================================================
