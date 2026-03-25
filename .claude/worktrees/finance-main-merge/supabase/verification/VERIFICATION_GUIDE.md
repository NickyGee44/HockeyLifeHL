# Agent 1 Phase 2: Verification Execution Guide

**Date:** January 25, 2026
**Agent:** Agent 1 - Database & Infrastructure
**Purpose:** Step-by-step guide to verify all migrations succeeded

---

## 🎯 Overview

This guide will walk you through verifying that all 8 database migrations ran successfully. You'll run 31 verification tests across 3 categories:

1. **Migration Verification** (11 tests) - Verify schema changes
2. **RLS Security Testing** (10 tests) - Verify tenant isolation
3. **Performance Testing** (10 tests) - Verify query performance

**Estimated Time:** 1-2 hours

---

## ✅ Prerequisites

Before starting verification:
- [x] All 8 migration files have been run in Supabase SQL Editor
- [ ] You have access to Supabase SQL Editor
- [ ] You have the service_role key (for some tests)
- [ ] You have created at least 1 test user account

---

## 📋 Step 1: Basic Migration Verification

### 1.1 Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `ntplczcmhvfkijjxavdl`
3. Click "SQL Editor" in the left sidebar

### 1.2 Run Quick Verification

Copy and paste this into SQL Editor:

```sql
-- Quick verification - should return 1 row with League #1
SELECT
  id,
  name,
  slug,
  status,
  created_at
FROM leagues
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
```

**Expected Result:** 1 row returned with:
- name = "HockeyLifeHL (Original)"
- slug = "hockeylifehl-original"
- status = "active"

✅ **PASS** if you see the league
❌ **FAIL** if no rows returned → Migration 1 didn't run

---

### 1.3 Verify league_id Columns Exist

```sql
-- Should return 16+ rows
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'league_id'
ORDER BY table_name;
```

**Expected Result:** At least 16 tables should have `league_id` column:
- articles
- draft_order
- draft_picks
- drafts
- email_drafts
- games
- goalie_stats
- payments
- player_goalie_matchups
- player_ratings
- player_stats
- season_highlights
- seasons
- suspensions
- team_rosters
- teams
- trade_players
- trades

✅ **PASS** if you see 16+ tables
❌ **FAIL** if missing tables → Migrations 2-5 didn't run

---

### 1.4 Verify Data Migration to League #1

```sql
-- All existing data should belong to League #1
SELECT
  'teams' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END) as league_1_records
FROM teams
UNION ALL
SELECT 'games', COUNT(*), COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END) FROM games
UNION ALL
SELECT 'player_stats', COUNT(*), COUNT(CASE WHEN league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid THEN 1 END) FROM player_stats;
```

**Expected Result:** For each table, `total_records` = `league_1_records`

✅ **PASS** if all data is in League #1
❌ **FAIL** if any records have NULL or different league_id → Migration 7 didn't run correctly

---

### 1.5 Verify RLS is Enabled

```sql
-- Should return ~26 tables with rowsecurity = true
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;
```

**Expected Result:** At least 19 tables should have RLS enabled, including:
- leagues
- league_memberships
- teams
- games
- player_stats
- goalie_stats
- league_scorekeepers
- game_scorekeeper_assignments

✅ **PASS** if RLS is enabled on multi-tenant tables
❌ **FAIL** if critical tables missing → Migrations didn't enable RLS

---

### 1.6 Verify Helper Functions Exist

```sql
-- Should return 18 functions
SELECT
  routine_name,
  routine_type
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
```

**Expected Result:** 18 functions returned

✅ **PASS** if all 18 functions exist
❌ **FAIL** if missing functions → Migration 8 didn't run

---

## 🔒 Step 2: RLS Security Testing

**IMPORTANT:** These tests require creating test users and test leagues. Skip this section if you don't have test users yet.

### 2.1 Create Test League

```sql
-- Create Test League #2
INSERT INTO leagues (
  id,
  name,
  slug,
  description,
  subscription_tier,
  status
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
  'Test League 2',
  'test-league-2',
  'Test league for RLS verification',
  'free',
  'active'
)
ON CONFLICT (id) DO NOTHING;
```

### 2.2 Create Test Teams

```sql
-- Create test team in each league
INSERT INTO teams (league_id, name, short_name)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'League 1 Test Team', 'L1T'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'League 2 Test Team', 'L2T')
ON CONFLICT DO NOTHING;
```

### 2.3 Test Cross-League Data Isolation

**As a user who is ONLY in League #1:**

```sql
-- This should ONLY show League 1 Test Team
-- If you see both teams, RLS is NOT working!
SELECT
  id,
  league_id,
  name
FROM teams
WHERE name LIKE '%Test Team%'
ORDER BY name;
```

**Expected Result:** Only see "League 1 Test Team"

✅ **PASS** if you only see League 1 team
❌ **FAIL** if you see both teams → RLS is not working!

### 2.4 Test Service Role Access

**Using service_role key (bypasses RLS):**

```sql
-- Service role should see ALL teams
SELECT
  league_id,
  name
FROM teams
WHERE name LIKE '%Test Team%'
ORDER BY league_id, name;
```

**Expected Result:** See both test teams

✅ **PASS** if you see both teams
❌ **FAIL** if you only see one → Service role RLS bypass not working

---

## ⚡ Step 3: Performance Testing

### 3.1 Test Index Usage on league_id

```sql
EXPLAIN ANALYZE
SELECT *
FROM teams
WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
```

**Expected Result:** Look for "Index Scan" in the output
- Should use `idx_teams_league_id`
- Execution time should be < 10ms

✅ **PASS** if using Index Scan
❌ **FAIL** if using Seq Scan → Index not being used

### 3.2 Test Player Stats Query Performance

```sql
EXPLAIN ANALYZE
SELECT
  player_id,
  SUM(goals) as total_goals,
  SUM(assists) as total_assists
FROM player_stats
WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
GROUP BY player_id
LIMIT 20;
```

**Expected Result:**
- Should use index on league_id
- Execution time should be < 50ms

✅ **PASS** if query is fast and uses index
❌ **FAIL** if slow or uses Seq Scan

### 3.3 Test Helper Function Performance

```sql
EXPLAIN ANALYZE
SELECT * FROM get_league_teams('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
```

**Expected Result:**
- Execution time should be < 20ms

✅ **PASS** if fast execution
❌ **FAIL** if > 100ms

---

## 📊 Step 4: Record Your Results

### Verification Summary

Fill out this checklist:

**Migration Verification (11 tests):**
- [ ] League #1 exists
- [ ] 16+ tables have league_id column
- [ ] All existing data assigned to League #1
- [ ] league_id is NOT NULL on all tables
- [ ] RLS enabled on 19+ tables
- [ ] RLS policies exist (multiple per table)
- [ ] Foreign keys to leagues(id) exist
- [ ] Indexes on league_id exist
- [ ] 3 scorekeeper tables exist
- [ ] 18 helper functions exist
- [ ] Admin users are owners of League #1

**RLS Security Testing (10 tests):**
- [ ] Cross-league data isolation works
- [ ] Service role bypasses RLS
- [ ] Users without membership see nothing
- [ ] League admins can manage data
- [ ] League members are read-only
- [ ] Scorekeepers have correct permissions
- [ ] Helper functions respect RLS
- [ ] Payment data is isolated
- [ ] League switching works
- [ ] No data leaks detected

**Performance Testing (10 tests):**
- [ ] Simple league queries use indexes (< 10ms)
- [ ] League + season queries use indexes (< 20ms)
- [ ] Player stats aggregation is fast (< 50ms)
- [ ] Team standings calculation is fast (< 100ms)
- [ ] League membership checks are instant (< 5ms)
- [ ] Scorekeeper queries are fast (< 20ms)
- [ ] Recent games query is fast (< 15ms)
- [ ] Draft picks query is fast (< 30ms)
- [ ] Payment summary is fast (< 40ms)
- [ ] Helper functions are fast (< 100ms)

**Overall Result:**
- Total Tests: 31
- Tests Passed: ___/31
- Tests Failed: ___/31
- Critical Failures: ___

---

## 🚨 If Tests Fail

### Common Issues & Solutions

**Issue:** League #1 doesn't exist
- **Solution:** Re-run `20260125_migrate_existing_data_to_league_1.sql`

**Issue:** Tables missing league_id
- **Solution:** Re-run migrations 2-5 in order

**Issue:** RLS not enabled
- **Solution:** Run `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;` for each table

**Issue:** RLS is blocking everything
- **Solution:** Verify you're logged in as a user with league membership

**Issue:** Slow queries (Seq Scan)
- **Solution:** Verify indexes exist with `\di` or check pg_indexes table

---

## ✅ Success Criteria

**Verification is COMPLETE when:**
- ✅ All 11 migration verification tests PASS
- ✅ All 10 RLS security tests PASS
- ✅ All 10 performance tests meet benchmarks
- ✅ No critical failures detected

**If all tests pass:**
1. Document results in `VERIFICATION_RESULTS.md`
2. Notify Agent 2 that database is ready
3. Agent 2 can begin backend API implementation

**If any tests fail:**
1. Document failures in `VERIFICATION_RESULTS.md`
2. Review migration files for issues
3. Re-run failed migrations
4. Consult Agent 1 for troubleshooting

---

## 📝 Next Steps After Verification

### For Agent 2 (Backend API):
- ✅ Database verified and ready
- ✅ Can start implementing league-aware server actions
- ✅ Reference: `docs/AGENT_2_QUERY_EXAMPLES.md`

### For Agent 3 (Frontend):
- ⏸️ Wait for Agent 2 to complete server actions
- ✅ Can start building UI mockups

### For Agent 4 (Scorekeeper):
- ✅ Scorekeeper tables verified
- ✅ Can continue PWA implementation

---

## 📞 Need Help?

If you encounter issues during verification:
1. Check the specific test that failed
2. Review the migration file for that feature
3. Check Supabase logs for errors
4. Review `docs/MULTI_TENANT_EDGE_CASES.md` for common issues
5. Contact Agent 1 with specific test failures

---

**End of Verification Guide**
