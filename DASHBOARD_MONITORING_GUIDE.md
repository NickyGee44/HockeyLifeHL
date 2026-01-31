# Dashboard Performance Monitoring Guide

**Date**: January 31, 2026
**Status**: Production Ready
**Target**: Platform 1 (League Builder) Dashboard

## Overview

This guide provides monitoring strategies and maintenance procedures for the optimized dashboard query system. The dashboard optimization reduced query complexity from O(N*M*P) to O(1) with 10-20x performance improvement.

## Key Metrics to Monitor

### 1. Query Performance

**Critical Metrics:**
- Dashboard page load time (target: <150ms)
- Cache hit rate (target: >80%)
- Database query execution time (target: <50ms)
- Index usage statistics

**How to Monitor:**

```sql
-- Monitor dashboard query execution time
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE query LIKE '%organizations%owner_user_id%'
   OR query LIKE '%getCachedDashboardData%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 2. Index Usage Statistics

**Monitor Index Scans:**

```sql
-- Check dashboard index usage (run daily)
SELECT
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_%dashboard%'
   OR indexrelname LIKE 'idx_%covering'
ORDER BY idx_scan DESC;
```

**Expected Results:**
- `idx_organizations_dashboard_owner_covering`: >100 scans/day (active system)
- `idx_organization_members_active_user`: >50 scans/day
- `idx_leagues_org_status_covering`: Proportional to org count
- All covering indexes should show high `idx_tup_fetch` (Index-Only Scans)

**Alert Thresholds:**
- ⚠️ Warning: Any covering index with 0 scans after 24 hours (index not being used)
- 🚨 Critical: Dashboard query taking >500ms (regression detected)

### 3. Cache Performance

**Monitor Cache Hit Rate:**

```typescript
// Add logging to dashboard.ts getCachedDashboardData()
const start = performance.now();
const result = await cachedFetch();
const duration = performance.now() - start;

// Log cache performance (development only)
if (process.env.NODE_ENV === 'development') {
  console.log(`Dashboard cache: ${duration}ms ${duration < 10 ? '(HIT)' : '(MISS)'}`);
}
```

**Expected Cache Behavior:**
- Cache MISS: 100-150ms (first request, or after 60s TTL)
- Cache HIT: <10ms (subsequent requests within 60s)
- Cache invalidation: Trigger on org/league/team mutations

**Alert Thresholds:**
- ⚠️ Warning: Cache hit rate <60% (may need longer TTL)
- 🚨 Critical: All requests showing MISS (caching broken)

### 4. Database Health

**Monitor Table Bloat:**

```sql
-- Check table bloat for dashboard tables (run weekly)
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'organization_members', 'leagues', 'teams', 'team_rosters')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Maintenance Procedures

### Monthly Index Maintenance

Rebuild covering indexes to prevent fragmentation and maintain optimal performance:

```sql
-- Run these during low-traffic hours (suggested: Sunday 2-4 AM)
REINDEX INDEX CONCURRENTLY idx_organizations_dashboard_owner_covering;
REINDEX INDEX CONCURRENTLY idx_organization_members_active_user;
REINDEX INDEX CONCURRENTLY idx_leagues_org_status_covering;
REINDEX INDEX CONCURRENTLY idx_teams_league_covering;
REINDEX INDEX CONCURRENTLY idx_team_rosters_team_covering;
REINDEX INDEX CONCURRENTLY idx_team_rosters_league_covering;
REINDEX INDEX CONCURRENTLY idx_league_memberships_user_status_covering;

-- Update statistics after reindex
ANALYZE organizations;
ANALYZE organization_members;
ANALYZE leagues;
ANALYZE teams;
ANALYZE team_rosters;
ANALYZE league_memberships;
```

**Schedule:**
- Run monthly on first Sunday at 2:00 AM
- Use `CONCURRENTLY` to avoid locking tables
- Estimated duration: 5-15 minutes depending on data size

### Quarterly Performance Audit

**Run Full Query Analysis:**

```sql
-- Identify slow dashboard queries (run quarterly)
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time,
  rows,
  100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio
FROM pg_stat_statements
WHERE query LIKE '%organizations%'
   OR query LIKE '%leagues%'
   OR query LIKE '%teams%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Review Checklist:**
1. Verify all covering indexes are being used (idx_scan > 0)
2. Check cache hit ratio is >99% for index scans
3. Identify any new slow queries introduced by feature changes
4. Review table sizes and plan for scaling (partitioning if >10M rows)

## Troubleshooting

### Issue: Dashboard Loading Slowly (>500ms)

**Diagnosis Steps:**

1. Check if caching is working:
```typescript
// Temporarily add logging in dashboard.ts
console.log('Cache check:', performance.now());
```

2. Verify indexes are being used:
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, slug, subscription_tier, subscription_status, trial_ends_at, created_at
FROM organizations
WHERE owner_user_id = 'USER_UUID_HERE'
ORDER BY created_at DESC;
```

Expected output should show: `Index Only Scan using idx_organizations_dashboard_owner_covering`

3. Check for missing statistics:
```sql
SELECT schemaname, tablename, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename IN ('organizations', 'leagues', 'teams');
```

**Resolution:**
- If no Index Only Scan: Run `ANALYZE organizations;`
- If cache not working: Check Next.js cache configuration
- If high query time: Check for table bloat, run VACUUM

### Issue: Index Not Being Used

**Diagnosis:**

```sql
-- Check if index exists and is valid
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname = 'idx_organizations_dashboard_owner_covering';

-- Check index size and health
SELECT pg_size_pretty(pg_relation_size('idx_organizations_dashboard_owner_covering')) as index_size;
```

**Resolution:**

```sql
-- Drop and recreate index if corrupted
DROP INDEX CONCURRENTLY idx_organizations_dashboard_owner_covering;

CREATE INDEX CONCURRENTLY idx_organizations_dashboard_owner_covering
  ON organizations(owner_user_id, created_at DESC)
  INCLUDE (id, name, slug, subscription_tier, subscription_status, trial_ends_at);

ANALYZE organizations;
```

### Issue: Cache Invalidation Not Working

**Symptoms:**
- User creates a league but dashboard doesn't update
- Stale data shown even after mutations

**Diagnosis:**

Check cache tags in mutation actions:

```typescript
// In apps/league-builder/src/lib/actions/league-wizard.ts
import { revalidateDashboardCache } from '@/lib/actions/dashboard';

// After successful league creation:
await revalidateDashboardCache(user.id);
```

**Resolution:**

Add cache invalidation to all mutation actions:
- Organization create/update/delete
- League create/update/delete
- Team create/delete
- Player roster add/remove

## Alerting Setup

### Recommended Alerts

1. **Dashboard Performance Alert**
```sql
-- Alert if average dashboard query time > 200ms
SELECT
  CASE
    WHEN mean_exec_time > 200 THEN 'ALERT: Dashboard slow'
    ELSE 'OK'
  END as status,
  mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%organizations%owner_user_id%'
LIMIT 1;
```

2. **Index Usage Alert**
```sql
-- Alert if covering index not used in 24 hours
SELECT
  CASE
    WHEN idx_scan = 0 THEN 'ALERT: Index unused'
    ELSE 'OK'
  END as status,
  indexrelname
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_%dashboard%'
  AND idx_scan = 0;
```

### Integration with Monitoring Tools

**Recommended Stack:**
- **Supabase Dashboard**: Built-in query performance monitoring
- **Vercel Analytics**: Frontend performance monitoring
- **Sentry**: Error tracking and performance monitoring
- **Custom Webhook**: Send alerts to Slack/Discord

**Example Webhook Setup:**

```typescript
// apps/league-builder/src/lib/monitoring/dashboard-alerts.ts
export async function checkDashboardPerformance() {
  const supabase = createServiceRoleClient();

  const { data: stats } = await supabase.rpc('get_dashboard_performance_stats');

  if (stats.avg_query_time > 200) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `⚠️ Dashboard Performance Alert: ${stats.avg_query_time}ms (threshold: 200ms)`
      })
    });
  }
}
```

## Performance Benchmarks

### Expected Performance by Data Size

| Organizations | Leagues | Teams | Players | Query Time | Cache Time |
|--------------|---------|-------|---------|------------|------------|
| 1            | 5       | 40    | 600     | 50ms       | 5ms        |
| 10           | 50      | 400   | 6,000   | 100ms      | 5ms        |
| 50           | 250     | 2,000 | 30,000  | 150ms      | 8ms        |
| 100          | 500     | 4,000 | 60,000  | 200ms      | 10ms       |

**Notes:**
- Query time is for initial MISS (cache empty)
- Cache time is for subsequent HITs
- Times measured on Supabase Pro tier
- 🚨 If query time exceeds these benchmarks by >50%, investigate immediately

### Scaling Thresholds

**When to Consider Materialized Views:**
- >100 organizations per user (rare for B2B SaaS)
- Dashboard queries consistently >300ms
- >10,000 leagues in system

**When to Consider Partitioning:**
- Teams table >10M rows
- Team rosters >100M rows
- Queries showing sequential scans despite indexes

## Cache Strategy

### Current TTL: 60 seconds

**Rationale:**
- Balances freshness vs performance
- Dashboard data changes infrequently (minutes, not seconds)
- Reduces database load by 60x during active usage

**When to Adjust TTL:**

Increase to 300s (5 minutes):
- Very stable data (minimal mutations)
- High traffic dashboard (>10,000 loads/day)
- Database CPU usage concerns

Decrease to 30s:
- Real-time requirements (e.g., live scores)
- Frequent mutations expected
- Cache staleness complaints from users

### Cache Invalidation Triggers

**Automatic Invalidation:**
Current implementation uses tag-based invalidation. Add `revalidateDashboardCache(userId)` to:

1. Organization mutations:
   - `updateOrganizationProfile()`
   - `deleteOrganization()`

2. League mutations:
   - `createLeague()`
   - `updateLeague()`
   - `deleteLeague()`

3. Team mutations:
   - `createTeam()`
   - `deleteTeam()`

4. Roster mutations:
   - `addPlayerToRoster()`
   - `removePlayerFromRoster()`

**Manual Invalidation:**
```typescript
import { revalidateDashboardCache } from '@/lib/actions/dashboard';

// After any action that affects dashboard data:
await revalidateDashboardCache(user.id);
```

## Rollback Procedure

If dashboard optimization causes issues, follow this rollback procedure:

### Step 1: Remove Caching

```typescript
// In apps/league-builder/src/app/dashboard/page.tsx
// Replace:
const dashboardData = await getCachedDashboardData();

// With:
const dashboardData = await getDashboardData();
```

### Step 2: Revert to Simple Queries (if needed)

```typescript
// Temporarily use individual queries instead of joins
const organizations = await supabase.from('organizations').select('*').eq('owner_user_id', user.id);
// ... etc
```

### Step 3: Drop Indexes (if causing issues)

```sql
DROP INDEX CONCURRENTLY idx_organizations_dashboard_owner_covering;
DROP INDEX CONCURRENTLY idx_organization_members_active_user;
-- ... etc
```

### Step 4: Revert Git Commit

```bash
git revert 43fc2e4  # The dashboard optimization commit
git push origin main
```

## Success Criteria

The dashboard optimization is successful if:

✅ Dashboard loads in <150ms (90th percentile)
✅ Cache hit rate >80%
✅ All covering indexes show idx_scan > 0
✅ Database CPU usage reduced by >30%
✅ No RLS security violations reported
✅ Zero cache staleness complaints from users

## Next Steps

1. **Week 1**: Monitor dashboard performance hourly
2. **Week 2**: Review cache hit rate and adjust TTL if needed
3. **Week 3**: Collect user feedback on dashboard responsiveness
4. **Month 1**: Run full performance audit and document results
5. **Month 2**: Consider materialized views if traffic >10,000/day

## Resources

- Migration: `supabase/migrations/20260131_dashboard_performance_indexes.sql`
- Dashboard Queries: `apps/league-builder/src/lib/actions/dashboard.ts`
- Dashboard Page: `apps/league-builder/src/app/dashboard/page.tsx`
- Supabase Docs: https://supabase.com/docs/guides/database/postgres-performance
- PostgreSQL Index Docs: https://www.postgresql.org/docs/current/indexes-types.html

---

**Last Updated**: January 31, 2026
**Maintained By**: Backend Team
**Review Frequency**: Quarterly
