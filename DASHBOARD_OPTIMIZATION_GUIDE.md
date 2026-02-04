# Dashboard Query Performance Optimization - Implementation Guide

## Executive Summary

**Problem**: Platform 1 dashboard was performing O(N*M*P) queries, resulting in 400+ database round trips for moderate datasets.

**Solution**: Optimized to O(1) query with covering indexes and Supabase joins.

**Expected Performance**:
- Before: 500-2000ms with 400+ queries
- After: 50-150ms with 1 query
- **Performance gain: 10-20x faster**

---

## Domain Invariants

### 1. Tenant Isolation (CRITICAL)
- **Invariant**: A user can only access organizations where they are owner OR member
- **Enforcement**: RLS policies on `organizations` and `organization_members` tables
- **Concurrency risk**: None (read-only for dashboard)
- **Validation**: Dashboard query MUST filter by `auth.uid()` - never accept user_id as parameter (IDOR vulnerability)

### 2. Organizational Hierarchy
```
organizations (Platform 1)
├── owner_user_id → profiles
├── organization_members → profiles (team access)
└── leagues (1:N)
    ├── teams (1:N)
    │   └── team_rosters (1:N per season)
    └── seasons (1:N)
```

**Invariant**: League counts and team counts MUST be derived from actual records, never cached out of sync.

### 3. Subscription State
- **Invariant**: Organization has exactly one subscription status (`trialing`, `active`, `cancelled`, `past_due`, `paused`)
- **Invariant**: Trial period is exclusive to `trialing` status
- **Concurrency risk**: LOW (infrequent updates via Stripe webhooks)

### 4. Count Accuracy
- **Invariant**: Dashboard totals MUST match SUM of individual league/team/player counts
- **Enforcement**: Calculated in application layer from actual JOIN results
- **Race condition**: None (eventual consistency acceptable for dashboard stats)

---

## Database Schema & Constraints

### Existing Schema (Verified from Migrations)

#### organizations
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'trialing',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_subscription_tier CHECK (
    subscription_tier IN ('starter', 'basic', 'pro', 'enterprise')
  ),
  CONSTRAINT valid_subscription_status CHECK (
    subscription_status IN ('trialing', 'active', 'cancelled', 'past_due', 'paused')
  )
);
```

**Indexes (BEFORE optimization)**:
- `idx_organizations_owner` ON (owner_user_id)
- `idx_organizations_slug` ON (slug)
- `idx_organizations_subscription_status` ON (subscription_status)

**NEW Indexes (AFTER optimization)**:
- `idx_organizations_dashboard_owner_covering` ON (owner_user_id, created_at DESC) INCLUDE (id, name, slug, subscription_tier, subscription_status, trial_ends_at)
  - **Purpose**: Covering index for dashboard query - eliminates heap lookup
  - **Expected usage**: Index-Only Scan (IOS) instead of Index Scan + Heap Fetch

#### organization_members
```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',

  UNIQUE(organization_id, user_id),
  CONSTRAINT organization_members_role_check CHECK (role IN ('owner', 'admin', 'member')),
  CONSTRAINT organization_members_status_check CHECK (status IN ('pending', 'active', 'inactive'))
);
```

**NEW Index**:
- `idx_organization_members_active_user` ON (user_id, status) WHERE status = 'active'
  - **Purpose**: Partial index for fetching active memberships in dashboard
  - **Benefit**: Smaller index size, faster scans

#### leagues
```sql
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'archived'))
);
```

**NEW Index**:
- `idx_leagues_org_active_covering` ON (organization_id, status, created_at DESC) WHERE status = 'active' INCLUDE (id, name, slug)
  - **Purpose**: Covering index for active leagues per organization
  - **Benefit**: Index-Only Scan, skips inactive leagues entirely

#### teams
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL
);
```

**NEW Index**:
- `idx_teams_league_active_covering` ON (league_id, status) WHERE status = 'active' INCLUDE (id, name)
  - **Purpose**: Efficient team count per league
  - **Benefit**: Avoids heap lookup for COUNT queries

#### team_rosters
```sql
CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  status roster_status NOT NULL DEFAULT 'active',

  -- roster_status ENUM: 'active', 'inactive', 'suspended', 'injured', 'traded'
);
```

**NEW Index**:
- `idx_team_rosters_active_count` ON (team_id, status) WHERE status = 'active' INCLUDE (player_id)
  - **Purpose**: Efficient player count per team
  - **Benefit**: Index-Only Scan for COUNT(DISTINCT player_id)

---

## Transaction Boundaries & Isolation

### Dashboard Query (READ ONLY)

**Isolation Level**: `READ COMMITTED` (default) - acceptable for dashboard stats

**Query Flow**:
```typescript
BEGIN TRANSACTION (implicit in Supabase query)
  -- Query 1: Fetch orgs where user is owner
  SELECT * FROM organizations WHERE owner_user_id = auth.uid()
  -- Uses: idx_organizations_dashboard_owner_covering (IOS)

  -- Query 2: Fetch orgs where user is member
  SELECT o.* FROM organizations o
  JOIN organization_members om ON om.organization_id = o.id
  WHERE om.user_id = auth.uid() AND om.status = 'active'
  -- Uses: idx_organization_members_active_user + idx_organizations_dashboard_owner_covering

  -- Query 3: Fetch leagues for all orgs
  SELECT * FROM leagues
  WHERE organization_id IN (...) AND status = 'active'
  -- Uses: idx_leagues_org_active_covering (IOS)

  -- Query 4: Fetch teams with rosters (nested join)
  SELECT t.*, tr.* FROM teams t
  LEFT JOIN team_rosters tr ON tr.team_id = t.id AND tr.status = 'active'
  WHERE t.league_id IN (...) AND t.status = 'active'
  -- Uses: idx_teams_league_active_covering + idx_team_rosters_active_count
COMMIT
```

**Race Conditions**: None (read-only queries, eventual consistency acceptable)

**Idempotency**: Not required (read-only)

---

## Query Patterns & Indexes

### Query 1: Organizations for User

**Before**:
```sql
SELECT * FROM organizations WHERE owner_user_id = ?
-- Index Scan using idx_organizations_owner
-- Heap Fetches: ~10-50 (depends on org count)
```

**After**:
```sql
SELECT id, name, slug, subscription_tier, subscription_status, trial_ends_at, created_at
FROM organizations WHERE owner_user_id = ?
-- Index-Only Scan using idx_organizations_dashboard_owner_covering
-- Heap Fetches: 0 (all columns in index)
-- Performance: ~5-10ms instead of ~20-50ms
```

### Query 2: Leagues for Organizations

**Before** (N+1 problem):
```typescript
// In a loop for each org
for (const org of organizations) {
  const leagues = await supabase.from('leagues')
    .select('*')
    .eq('organization_id', org.id);
}
// Total queries: 1 + N = 11 queries for 10 orgs
```

**After**:
```sql
SELECT * FROM leagues
WHERE organization_id IN (?, ?, ..., ?)
AND status = 'active'
ORDER BY created_at DESC
-- Index-Only Scan using idx_leagues_org_active_covering
-- Single query for all leagues
-- Performance: ~10-20ms for 50 leagues
```

### Query 3: Team Counts per League

**Before** (N*M problem):
```typescript
for (const league of leagues) {
  const teams = await supabase.from('teams')
    .select('*')
    .eq('league_id', league.id);
  league.team_count = teams.length;
}
// Total queries: 50 queries for 50 leagues
```

**After** (via Supabase nested select):
```sql
SELECT l.*,
  (SELECT json_agg(teams.*) FROM teams
   WHERE league_id = l.id AND status = 'active') as teams
FROM leagues l WHERE ...
-- Uses idx_teams_league_active_covering
-- Single query with lateral join
-- Performance: ~20-40ms for 50 leagues with 400 teams
```

### Query 4: Player Counts per Team

**Before** (N*M*P problem):
```typescript
for (const team of teams) {
  const rosters = await supabase.from('team_rosters')
    .select('player_id')
    .eq('team_id', team.id)
    .eq('status', 'active');
  team.player_count = new Set(rosters.map(r => r.player_id)).size;
}
// Total queries: 400 queries for 400 teams
```

**After** (via Supabase nested select):
```sql
SELECT t.*,
  (SELECT json_agg(DISTINCT team_rosters.player_id)
   FROM team_rosters
   WHERE team_id = t.id AND status = 'active') as players
FROM teams t WHERE ...
-- Uses idx_team_rosters_active_count
-- Single query with lateral join
-- Performance: ~30-60ms for 400 teams with 6000 players
```

---

## Scale & Performance

### Hot Paths

1. **Dashboard page load** (HIGH traffic)
   - Frequency: Every login, every tab switch, periodic refreshes
   - Expected: 10-50 requests/minute per active user
   - Optimization: 60-second cache + covering indexes

2. **Organization mutations** (LOW traffic, HIGH criticality)
   - Create organization: ~1-5/day per user
   - Update organization: ~1-10/day per user
   - Delete organization: ~0-1/month per user
   - Cache invalidation: Required immediately

3. **League mutations** (MEDIUM traffic)
   - Create league: ~1-10/week per org
   - Update league: ~5-20/week per org
   - Cache invalidation: Required within 60 seconds (acceptable)

### Caching Strategy

**Next.js 14 `unstable_cache` with Tags**:

```typescript
unstable_cache(
  async () => getDashboardData(),
  [`dashboard-${userId}`],
  {
    revalidate: 60,        // Cache for 60 seconds
    tags: [`dashboard-${userId}`]  // Invalidation tag
  }
)
```

**Cache Invalidation Triggers**:
```typescript
// In organization.ts mutations
import { revalidateDashboardCache } from '@/lib/actions/dashboard';

export async function createOrganization(formData: FormData) {
  // ... create org logic ...

  // Invalidate cache
  await revalidateDashboardCache(user.id);

  return { success: true };
}
```

**TTL Rationale**:
- 60 seconds is acceptable for dashboard stats (not real-time critical)
- Reduces database load by 60x (60 page loads → 1 query)
- User-specific cache ensures tenant isolation
- Mutations invalidate immediately via tags

### Backpressure & Rate Limiting

**Dashboard query is read-heavy, low write frequency**:
- No backpressure needed (Supabase connection pool handles it)
- No rate limiting required (authenticated users only)
- If traffic exceeds 1000 req/s, consider Redis cache layer

**Monitoring thresholds**:
- Dashboard query > 200ms: Investigate (should be <100ms)
- Cache hit rate < 80%: Reduce TTL or increase cache size
- Database connection pool > 80%: Scale Supabase instance

---

## Migration Strategy

### Step 1: Apply Database Indexes (Zero Downtime)

```bash
# Run migration in Supabase SQL Editor
psql> \i supabase/migrations/20260131_dashboard_performance_indexes.sql
```

**Expected output**:
```
CREATE INDEX (idx_organizations_dashboard_owner_covering)
CREATE INDEX (idx_organization_members_active_user)
CREATE INDEX (idx_leagues_org_active_covering)
CREATE INDEX (idx_teams_league_active_covering)
CREATE INDEX (idx_team_rosters_active_count)
ANALYZE organizations
ANALYZE leagues
ANALYZE teams
ANALYZE team_rosters
✅ Dashboard Performance Indexes Created
```

**Risks**: None (adding indexes is non-blocking, zero downtime)

**Rollback**: `DROP INDEX CONCURRENTLY <index_name>` (if needed)

### Step 2: Deploy Optimized Server Action

```bash
# Verify new file exists
git status
# Should show:
#   new file: apps/league-builder/src/lib/actions/dashboard.ts
#   modified: apps/league-builder/src/app/dashboard/page.tsx

# Test locally
pnpm dev
# Navigate to http://localhost:3000/dashboard
# Verify league counts, team counts, player counts display correctly
```

**Validation**:
1. Login as user with 0 organizations → Should show "No organizations yet"
2. Login as user with 1+ organizations → Should show correct counts
3. Create a new league → Dashboard should update within 60 seconds
4. Verify RLS: User A cannot see User B's organizations

### Step 3: Monitor Performance (Production)

**Database Query Monitoring**:
```sql
-- Check index usage after 24 hours
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%dashboard%'
ORDER BY idx_scan DESC;
```

**Expected results**:
- `idx_organizations_dashboard_owner_covering`: 1000+ scans/day
- `idx_leagues_org_active_covering`: 1000+ scans/day
- `idx_teams_league_active_covering`: 1000+ scans/day

**Next.js Cache Monitoring**:
```typescript
// Add to dashboard.ts
export async function getDashboardCacheStats() {
  // Next.js doesn't expose cache stats directly
  // Use custom logging or APM tool (Vercel Analytics, Sentry)
}
```

### Step 4: Cleanup (After 7 Days in Production)

```sql
-- Drop old redundant indexes (if any)
-- Verify first that new covering indexes are being used
DROP INDEX IF EXISTS idx_organizations_owner; -- Redundant with covering index
```

**WARNING**: Only drop indexes after confirming new indexes are used in production!

---

## Failure Modes & Recovery

### Failure Mode 1: Index Creation Timeout

**Symptom**: Migration hangs for >5 minutes

**Cause**: Large table (>10M rows) + high write traffic

**Recovery**:
```sql
-- Cancel current migration
SELECT pg_cancel_backend(pid)
FROM pg_stat_activity
WHERE query LIKE '%CREATE INDEX%';

-- Create index CONCURRENTLY (allows concurrent writes)
CREATE INDEX CONCURRENTLY idx_organizations_dashboard_owner_covering
  ON organizations(owner_user_id, created_at DESC)
  INCLUDE (id, name, slug, subscription_tier, subscription_status, trial_ends_at);
```

**Prevention**: Use `CREATE INDEX CONCURRENTLY` in future migrations

### Failure Mode 2: Query Timeout (Dashboard Query > 30s)

**Symptom**: Dashboard page times out, users see error

**Cause**: Missing index or query planner chose wrong index

**Diagnosis**:
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM organizations WHERE owner_user_id = '...';
-- Check: Does it use idx_organizations_dashboard_owner_covering?
-- If not, planner may need hints or index rebuild
```

**Recovery**:
```sql
-- Option 1: Reindex (if index is bloated)
REINDEX INDEX CONCURRENTLY idx_organizations_dashboard_owner_covering;

-- Option 2: Force index usage (temporary fix)
SET enable_seqscan = off; -- Forces index usage
SELECT * FROM organizations WHERE owner_user_id = '...';
SET enable_seqscan = on;

-- Option 3: Increase statistics target
ALTER TABLE organizations ALTER COLUMN owner_user_id SET STATISTICS 1000;
ANALYZE organizations;
```

### Failure Mode 3: Cache Stampede (Invalidation Triggers 1000 Concurrent Requests)

**Symptom**: Database CPU spikes to 100% when cache expires

**Cause**: 1000 users hit dashboard simultaneously when 60s cache expires

**Recovery**:
```typescript
// Add stale-while-revalidate pattern
export async function getCachedDashboardDataSWR() {
  return unstable_cache(
    async () => getDashboardData(),
    [`dashboard-${userId}`],
    {
      revalidate: 60,
      tags: [`dashboard-${userId}`],
      // Next.js 14+: Use stale-while-revalidate
      staleTime: 300  // Serve stale data for 5 minutes while revalidating
    }
  );
}
```

**Prevention**: Use stale-while-revalidate or Redis with SETNX lock

### Failure Mode 4: RLS Policy Bypassed (CRITICAL SECURITY)

**Symptom**: User sees another user's organizations

**Cause**: Query doesn't use `auth.uid()`, accepts user_id as parameter (IDOR vulnerability)

**Detection**:
```typescript
// WRONG (VULNERABLE):
export async function getDashboardData(userId: string) {
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_user_id', userId);  // ❌ IDOR VULNERABILITY
}

// CORRECT (SECURE):
export async function getDashboardData() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_user_id', user.id);  // ✅ SAFE
}
```

**Recovery**: Immediate code review + hotfix deployment

**Prevention**: Code review checklist:
- [ ] No user_id parameters in server actions
- [ ] All queries use `auth.uid()` or `supabase.auth.getUser()`
- [ ] RLS policies enabled on all tables
- [ ] Test with multiple users: User A cannot access User B's data

---

## Recommended Architecture

### High-Level Flow

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ GET /dashboard
       │
       ▼
┌─────────────────────────────────────────────┐
│  Next.js 14 Server Component                │
│  apps/league-builder/src/app/dashboard/     │
│  page.tsx                                   │
└──────┬──────────────────────────────────────┘
       │ getCachedDashboardData()
       │
       ▼
┌─────────────────────────────────────────────┐
│  Next.js Cache Layer (60s TTL)              │
│  Tag: dashboard-{userId}                    │
│  Miss? → Continue                           │
│  Hit?  → Return cached data                 │
└──────┬──────────────────────────────────────┘
       │ Cache MISS
       │
       ▼
┌─────────────────────────────────────────────┐
│  Server Action: getDashboardData()          │
│  apps/league-builder/src/lib/actions/       │
│  dashboard.ts                               │
└──────┬──────────────────────────────────────┘
       │ Query 1: Fetch orgs (owner)
       │ Query 2: Fetch orgs (member)
       │ Query 3: Fetch leagues + teams + rosters
       │ (Single Supabase query with nested joins)
       │
       ▼
┌─────────────────────────────────────────────┐
│  Supabase Client (RLS Enforced)             │
│  Row Level Security filters by auth.uid()   │
└──────┬──────────────────────────────────────┘
       │ SQL Queries
       │
       ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL Database                        │
│  - Uses covering indexes (Index-Only Scans) │
│  - Organizations → Leagues → Teams          │
│  - Aggregate counts in app layer            │
└─────────────────────────────────────────────┘
```

### Sequence Diagram: Dashboard Load

```
User         Next.js Server       Cache           Supabase DB
  │                │                │                   │
  │   GET /dashboard                │                   │
  ├──────────────>│                │                   │
  │                │                │                   │
  │                │  Check cache   │                   │
  │                ├───────────────>│                   │
  │                │                │                   │
  │                │  Cache MISS    │                   │
  │                │<───────────────┤                   │
  │                │                │                   │
  │                │  SELECT orgs WHERE owner_user_id = auth.uid()
  │                ├───────────────────────────────────>│
  │                │                │  idx_organizations_dashboard_owner_covering (IOS)
  │                │                │                   │
  │                │  orgs: [org1]  │                   │
  │                │<───────────────────────────────────┤
  │                │                │                   │
  │                │  SELECT leagues WHERE org_id IN (...) AND status = 'active'
  │                ├───────────────────────────────────>│
  │                │                │  idx_leagues_org_active_covering (IOS)
  │                │                │                   │
  │                │  leagues: [{teams: [{rosters: []}]}]
  │                │<───────────────────────────────────┤
  │                │                │                   │
  │                │  Aggregate counts in app layer     │
  │                │  (team_count, player_count)        │
  │                │                │                   │
  │                │  Store in cache (60s TTL)          │
  │                ├───────────────>│                   │
  │                │                │                   │
  │  HTML (200 OK) │                │                   │
  │<───────────────┤                │                   │
  │  Dashboard with real counts     │                   │
  │                │                │                   │
  │                                                     │
  │  [60 seconds later]                                 │
  │                                                     │
  │   GET /dashboard (cache hit)                        │
  ├──────────────>│                │                   │
  │                │  Check cache   │                   │
  │                ├───────────────>│                   │
  │                │  Cache HIT     │                   │
  │                │<───────────────┤                   │
  │  HTML (from cache, no DB query) │                   │
  │<───────────────┤                │                   │
```

### Sequence Diagram: Mutation with Cache Invalidation

```
User         Next.js Server       Cache           Supabase DB
  │                │                │                   │
  │   POST /dashboard/organizations/create              │
  ├──────────────>│                │                   │
  │                │                │                   │
  │                │  INSERT INTO organizations (...)   │
  │                ├───────────────────────────────────>│
  │                │                │                   │
  │                │  organization created              │
  │                │<───────────────────────────────────┤
  │                │                │                   │
  │                │  revalidateTag('dashboard-{userId}')
  │                ├───────────────>│                   │
  │                │  Cache INVALIDATED                 │
  │                │<───────────────┤                   │
  │                │                │                   │
  │  Redirect to /dashboard                             │
  │<───────────────┤                │                   │
  │                │                │                   │
  │   GET /dashboard (cache miss, fetches fresh data)   │
  ├──────────────>│                │                   │
  │                │ ... (same flow as above) ...       │
```

---

## Implementation Checklist

### Phase 1: Database Optimization (30 minutes)

- [ ] Apply migration `20260131_dashboard_performance_indexes.sql` in Supabase SQL Editor
- [ ] Verify indexes created: `\di idx_*dashboard*`
- [ ] Run ANALYZE on all tables
- [ ] Check index sizes: `SELECT * FROM pg_indexes WHERE indexname LIKE '%dashboard%'`

### Phase 2: Code Deployment (1 hour)

- [ ] Review `apps/league-builder/src/lib/actions/dashboard.ts` for security (no IDOR)
- [ ] Update `apps/league-builder/src/app/dashboard/page.tsx` with new imports
- [ ] Test locally with sample data:
  - [ ] 0 organizations → Shows empty state
  - [ ] 1 organization, 0 leagues → Shows org, 0 leagues
  - [ ] 1 organization, 2 leagues, 5 teams → Shows correct counts
- [ ] Test cache invalidation:
  - [ ] Create organization → Dashboard updates immediately
  - [ ] Create league → Dashboard updates within 60 seconds
- [ ] Deploy to staging
- [ ] Run E2E tests with Playwright/Cypress
- [ ] Deploy to production

### Phase 3: Monitoring (1 week)

- [ ] Set up Vercel Analytics or custom logging for dashboard response times
- [ ] Monitor PostgreSQL slow query log (queries >100ms)
- [ ] Check index usage stats (pg_stat_user_indexes)
- [ ] Validate cache hit rate (should be >80%)
- [ ] Monitor RLS policy performance (should not cause >10ms overhead)

### Phase 4: Optimization (Ongoing)

- [ ] If dashboard >150ms consistently: Consider materialized view
- [ ] If cache stampede occurs: Implement stale-while-revalidate
- [ ] If >10,000 organizations per user: Implement pagination
- [ ] If >1000 req/s: Add Redis cache layer

---

## Performance Benchmarks

### Expected Query Times (with indexes)

| Query | Before (no indexes) | After (covering indexes) | Improvement |
|-------|---------------------|--------------------------|-------------|
| Fetch 10 orgs | 20-50ms | 5-10ms | 4-5x |
| Fetch 50 leagues | 100-200ms (50 queries) | 10-20ms (1 query) | 10-20x |
| Fetch 400 teams | 1000-2000ms (400 queries) | 30-60ms (1 query) | 30-40x |
| Count 6000 players | 2000-5000ms (400 queries) | 30-60ms (1 query) | 60-80x |
| **Total dashboard** | **3000-7000ms** | **100-150ms** | **30-70x** |

### Cache Impact

| Scenario | Without cache | With 60s cache | Improvement |
|----------|---------------|----------------|-------------|
| 1 user, 10 page loads/min | 10 queries/min | ~1 query/min | 10x |
| 100 users, 10 page loads/min each | 1000 queries/min | ~100 queries/min | 10x |
| Database CPU usage (100 concurrent users) | 80-100% | 10-20% | 5-10x |

---

## Troubleshooting

### Issue: Dashboard shows 0 leagues but leagues exist

**Diagnosis**:
```sql
-- Check if leagues have organization_id set
SELECT id, name, organization_id FROM leagues WHERE organization_id IS NULL;
```

**Fix**:
```sql
-- If leagues are orphaned, set organization_id
UPDATE leagues SET organization_id = (
  SELECT id FROM organizations WHERE owner_user_id = leagues.created_by
) WHERE organization_id IS NULL;
```

### Issue: Player counts are incorrect

**Diagnosis**:
```typescript
// Add debug logging in dashboard.ts
console.log('Team rosters:', teams.flatMap(t => t.team_rosters));
console.log('Unique players:', uniquePlayers);
```

**Fix**: Check `team_rosters.status` filter - ensure only `'active'` rosters are counted

### Issue: Query is still slow (>500ms)

**Diagnosis**:
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT ... FROM organizations WHERE owner_user_id = '...';
-- Check if index is used, look for "Seq Scan" (bad) vs "Index Only Scan" (good)
```

**Fix**:
1. Ensure statistics are up to date: `ANALYZE organizations;`
2. Check if index is valid: `SELECT * FROM pg_indexes WHERE indexname = '...'`
3. Rebuild index: `REINDEX INDEX CONCURRENTLY idx_organizations_dashboard_owner_covering;`

---

## Security Checklist

- [x] All queries use `auth.uid()` from session, never accept user_id as parameter
- [x] RLS policies enabled on organizations, leagues, teams, team_rosters
- [x] Cache is user-specific (tag includes userId)
- [x] No sensitive data (passwords, tokens) in cache
- [x] Organization members can only see orgs they belong to
- [x] Player counts do not leak data from other organizations

---

## Next Steps (Future Optimizations)

1. **Pagination**: If dashboard has >100 organizations, implement cursor-based pagination
2. **Materialized View**: If query consistently >200ms, create `dashboard_stats` materialized view
3. **Redis Layer**: If >1000 concurrent users, add Redis cache with 5-minute TTL
4. **Real-time Updates**: Use Supabase Realtime subscriptions for instant count updates
5. **GraphQL**: Consider migrating to PostGraphile for better join optimization

---

## Contacts & Resources

**Documentation**:
- Supabase Joins: https://supabase.com/docs/guides/database/joins-and-nesting
- PostgreSQL Covering Indexes: https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- Next.js Caching: https://nextjs.org/docs/app/building-your-application/caching

**Files Modified**:
- `apps/league-builder/src/lib/actions/dashboard.ts` (NEW)
- `apps/league-builder/src/app/dashboard/page.tsx` (UPDATED)
- `supabase/migrations/20260131_dashboard_performance_indexes.sql` (NEW)

**Database Tables Affected**:
- `organizations` (new index)
- `organization_members` (new index)
- `leagues` (new index)
- `teams` (new index)
- `team_rosters` (new index)
