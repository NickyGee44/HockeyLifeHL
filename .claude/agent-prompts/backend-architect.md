# Backend Architect Agent Prompts

**Agent:** backend-architect
**Purpose:** Database schema design, data integrity, migrations, scalability

---

## Database Schema Design

```
Design database schema for: [FEATURE_NAME]

Requirements:
- Must support multi-tenant architecture (organization-scoped)
- Must handle [ESTIMATED_SCALE] organizations
- Must support [SPECIFIC_REQUIREMENTS]

Provide:

1. Table Structure
   For each table:
   - Table name (singular, snake_case)
   - All columns with types
   - Primary key
   - Foreign keys
   - Unique constraints
   - Check constraints
   - Default values

2. Indexes
   - List all indexes needed
   - Justify each index (query pattern it optimizes)
   - Consider composite indexes

3. RLS Policies
   - Policy for SELECT operations
   - Policy for INSERT operations
   - Policy for UPDATE operations
   - Policy for DELETE operations
   - Verify policies enforce organization isolation

4. Migration SQL
   - Complete migration script
   - Include all tables, indexes, constraints
   - Include RLS policies
   - Include comments

5. Rollback SQL
   - Complete rollback script
   - Safe to run if migration partially applied

6. Data Integrity
   - What constraints enforce data integrity?
   - How are orphaned records prevented?
   - How are circular dependencies prevented?

7. Performance Considerations
   - Expected query patterns
   - Index strategy
   - Partitioning strategy (if needed)
   - Caching strategy

8. Scalability Analysis
   - How does this scale to 10k+ organizations?
   - Any bottlenecks?
   - Sharding considerations (if needed)

Example table:
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_id, slug),
  CHECK(length(name) >= 1 AND length(name) <= 100)
);

-- Indexes
CREATE INDEX idx_teams_league_id ON teams(league_id);

-- RLS Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teams in their organization's leagues"
  ON teams FOR SELECT
  USING (
    league_id IN (
      SELECT l.id FROM leagues l
      JOIN organizations o ON l.organization_id = o.id
      JOIN league_ownerships lo ON o.id = lo.organization_id
      WHERE lo.user_id = auth.uid()
    )
  );
```

Provide TypeScript types:
```typescript
export interface Team {
  id: string;
  league_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}
```
```

---

## Migration Review

```
Review this database migration for safety and correctness.

Migration: [MIGRATION_FILE_PATH]

Review:

1. Data Integrity
   - Are foreign keys properly defined?
   - Are constraints appropriate?
   - Will this cause data loss?
   - Are default values sensible?

2. Backwards Compatibility
   - Is this migration backwards compatible?
   - Can the app run with old and new schema?
   - Are column additions nullable or have defaults?

3. Performance Impact
   - Will this migration lock tables?
   - How long will this take on production?
   - Can this be done with zero downtime?
   - Are indexes added concurrently?

4. Rollback Safety
   - Can this migration be rolled back?
   - Is rollback SQL provided?
   - Will rollback cause data loss?

5. RLS Policy Review
   - Are RLS policies comprehensive?
   - Do policies enforce organization isolation?
   - Are there any policy gaps?
   - Are policies performant?

6. Testing
   - Has this been tested on dev branch?
   - Have edge cases been tested?
   - Has rollback been tested?

Recommendations:
- Should this be applied? (GO/NO-GO)
- What are the risks?
- How to mitigate risks?
- Monitoring after deployment

Example issues to flag:
- Column added without default (breaks old app)
- Missing index (performance issue)
- Foreign key not indexed (performance issue)
- RLS policy too broad (security issue)
- Migration without rollback (risk)
```

---

## Query Performance Review

```
Review query performance for: [QUERY_DESCRIPTION]

Query:
```sql
[PASTE_QUERY_HERE]
```

Analyze:

1. Query Plan
   - What is the execution plan?
   - Are indexes being used?
   - Are there sequential scans?
   - What are the costs?

2. Performance Issues
   - N+1 query problem?
   - Missing indexes?
   - Inefficient joins?
   - Unnecessary data fetching?

3. Optimization Recommendations
   - What indexes should be added?
   - How can query be rewritten?
   - Should this be denormalized?
   - Should this be cached?

4. Scalability
   - How does this perform with 10k+ organizations?
   - How does this perform with 1M+ records?
   - Does this need pagination?
   - Does this need partitioning?

Provide:
- Current performance metrics (if available)
- Recommended optimizations
- Optimized query
- Index additions needed
- Expected performance improvement

Example optimization:
```sql
-- Before (slow)
SELECT * FROM teams WHERE league_id IN (
  SELECT id FROM leagues WHERE organization_id = 'xxx'
);

-- After (fast)
SELECT t.* FROM teams t
INNER JOIN leagues l ON t.league_id = l.id
WHERE l.organization_id = 'xxx';

-- Add index
CREATE INDEX idx_teams_league_id ON teams(league_id);
```
```

---

## Data Migration Plan

```
Create data migration plan for: [MIGRATION_DESCRIPTION]

Context:
- Current state: [Describe current data structure]
- Target state: [Describe target data structure]
- Data volume: [Estimate number of records]

Plan should include:

1. Pre-Migration
   - Backup strategy
   - Rollback plan
   - Downtime requirements
   - Communication plan

2. Migration Steps
   - Step-by-step process
   - SQL scripts for each step
   - Validation queries
   - Estimated duration

3. Data Transformation
   - How is data transformed?
   - Are there data quality issues?
   - How are errors handled?
   - Data validation logic

4. Testing Strategy
   - Test on copy of production data
   - Verify data integrity
   - Verify application still works
   - Performance testing

5. Rollback Plan
   - How to rollback if migration fails?
   - Can we rollback after partial completion?
   - Data recovery strategy

6. Monitoring
   - What to monitor during migration?
   - What to monitor after migration?
   - Alerting setup

Example migration:
```sql
-- Step 1: Add new column
ALTER TABLE organizations ADD COLUMN subscription_tier TEXT;

-- Step 2: Migrate data
UPDATE organizations
SET subscription_tier = 'starter'
WHERE subscription_tier IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE organizations
ALTER COLUMN subscription_tier SET NOT NULL;

-- Step 4: Add check constraint
ALTER TABLE organizations
ADD CONSTRAINT subscription_tier_check
CHECK (subscription_tier IN ('starter', 'pro', 'business', 'enterprise'));
```
```

---

## Multi-Tenancy Architecture Review

```
Review multi-tenancy architecture for Hockey Life platform.

Current design:
- Organizations own leagues
- League ownerships grant access
- RLS policies enforce isolation

Analyze:

1. Isolation Strategy
   - How is data isolated between tenants?
   - Are RLS policies comprehensive?
   - Can tenant A access tenant B's data?
   - Are there any isolation gaps?

2. Performance
   - How does RLS affect query performance?
   - Are organization_id columns indexed?
   - Are queries efficient with many tenants?
   - Do we need partitioning?

3. Scalability
   - How many organizations can we support?
   - What are the bottlenecks?
   - When do we need sharding?
   - How do we scale reads vs writes?

4. Data Model
   - Is the organization hierarchy correct?
   - Should leagues belong to multiple orgs?
   - Should users belong to multiple orgs?
   - Are foreign keys correct?

5. RLS Policy Review
   For each table, verify:
   - SELECT policy enforces organization scope
   - INSERT policy prevents cross-org inserts
   - UPDATE policy prevents cross-org updates
   - DELETE policy prevents cross-org deletes

Tables to review:
- organizations
- leagues
- teams
- profiles
- league_memberships
- league_ownerships
- [add others]

6. Edge Cases
   - User switches organizations
   - User belongs to multiple organizations
   - Organization deleted (cascade behavior)
   - User removed from organization

Provide:
- Current architecture strengths
- Potential issues
- Recommended improvements
- Migration path for improvements
```

---

## Database Backup & Recovery Strategy

```
Design backup and recovery strategy for Hockey Life production database.

Requirements:
- RTO (Recovery Time Objective): [X hours]
- RPO (Recovery Point Objective): [X minutes]
- Data retention: [X days]

Design should include:

1. Backup Strategy
   - Backup frequency (continuous, hourly, daily?)
   - Backup retention policy
   - Backup location and redundancy
   - Backup encryption

2. Point-in-Time Recovery
   - Can we restore to specific timestamp?
   - How far back can we go?
   - How to handle org-specific recovery?

3. Testing
   - How often do we test restores?
   - Automated restore testing?
   - Validation after restore

4. Disaster Recovery
   - What if primary region fails?
   - Failover strategy
   - Data replication setup

5. Per-Tenant Backup (if needed)
   - Can we backup/restore individual orgs?
   - Export org data on demand?
   - Data portability for GDPR

6. Monitoring
   - Backup success/failure alerts
   - Backup size trending
   - Restore time monitoring

Provide:
- Recommended backup configuration
- Supabase backup setup
- Recovery procedures
- Cost estimate
```

---

## Database Performance Tuning

```
Tune database performance for Hockey Life platform.

Current issues: [DESCRIBE_ISSUES]

Analyze:

1. Slow Queries
   - Identify slowest queries
   - Review query plans
   - Recommend indexes
   - Recommend query rewrites

2. Database Statistics
   - Table sizes
   - Index sizes
   - Query frequency
   - Cache hit ratio

3. Index Analysis
   - Unused indexes (waste space)
   - Missing indexes (slow queries)
   - Redundant indexes (waste space)
   - Index bloat

4. Connection Pooling
   - Connection pool size
   - Connection timeout
   - Idle connection handling

5. Caching Strategy
   - What should be cached?
   - Cache invalidation strategy
   - Redis or in-memory?

6. Vacuuming (Postgres)
   - Auto-vacuum configured?
   - Dead tuple monitoring
   - Table bloat analysis

Provide:
- Performance baseline
- Bottleneck identification
- Optimization recommendations
- Expected improvements
- Implementation priority
```

---

## Concurrent Modification Handling

```
Design strategy for handling concurrent modifications in: [FEATURE/TABLE]

Scenarios:
- Two admins editing same league settings simultaneously
- User updating profile while admin updates same profile
- Bulk operations conflicting with individual updates

Analyze:

1. Conflict Detection
   - How do we detect conflicts?
   - Optimistic locking (version column)?
   - Pessimistic locking (SELECT FOR UPDATE)?
   - Last-write-wins?

2. Conflict Resolution
   - How do we resolve conflicts?
   - User chooses?
   - Automatic merge?
   - Reject later write?

3. Database Strategy
   - Use version column?
   - Use updated_at timestamp?
   - Use database locks?
   - Use transactions?

4. Application Strategy
   - Retry logic?
   - Error messaging to user?
   - Show conflict UI?

5. Edge Cases
   - What if conflict during delete?
   - What if conflict during status change?
   - What if conflict during payment?

Example implementation:
```sql
-- Add version column
ALTER TABLE leagues ADD COLUMN version INT DEFAULT 1;

-- Update with version check
UPDATE leagues
SET
  name = 'New Name',
  version = version + 1
WHERE
  id = 'xxx'
  AND version = 5;  -- Only update if version matches

-- Check affected rows
-- If 0 rows affected, conflict occurred
```

Provide:
- Recommended strategy
- Database schema changes
- Application code changes
- Test scenarios
```

---

## Data Archival Strategy

```
Design data archival strategy for: [TABLE/FEATURE]

Requirements:
- Retain data for [X time period]
- Archive data older than [Y time period]
- Restore archived data if needed

Design:

1. Archival Criteria
   - What data should be archived?
   - When should it be archived?
   - Can archived data be accessed?

2. Archival Process
   - Archive to separate table?
   - Archive to separate database?
   - Archive to object storage (S3)?
   - Archive frequency?

3. Data Retention
   - How long to retain archived data?
   - Automatic deletion policy?
   - Legal/compliance requirements?

4. Restoration Process
   - How to restore archived data?
   - How long does restore take?
   - Can users request restore?

5. Performance Impact
   - Does archival affect production?
   - Run during low-traffic hours?
   - Use background job?

6. Cost Analysis
   - Storage costs
   - Processing costs
   - Cost vs benefit

Example archival:
```sql
-- Create archive table
CREATE TABLE leagues_archived AS
SELECT * FROM leagues WHERE FALSE;

-- Archive old leagues
INSERT INTO leagues_archived
SELECT * FROM leagues
WHERE deleted_at < NOW() - INTERVAL '1 year';

-- Delete archived leagues
DELETE FROM leagues
WHERE deleted_at < NOW() - INTERVAL '1 year';
```

Provide:
- Recommended archival strategy
- Implementation steps
- Cost estimate
- Monitoring requirements
```

---

## Database Monitoring Setup

```
Set up database monitoring for Hockey Life platform.

Metrics to monitor:

1. Performance Metrics
   - Query execution time
   - Slow query log
   - Connection pool usage
   - Cache hit rate
   - Disk I/O

2. Capacity Metrics
   - Database size
   - Table sizes
   - Index sizes
   - Connection count
   - Disk space usage

3. Health Metrics
   - Replication lag
   - Backup status
   - Vacuum status
   - Deadlocks
   - Failed queries

4. Application Metrics
   - RLS policy denials
   - Authorization failures
   - Concurrent user count
   - Active organization count

Setup:

1. Supabase Monitoring
   - Enable performance insights
   - Configure alerts
   - Set up log exports

2. Custom Monitoring
   - Key query monitoring
   - Business metric tracking
   - Error rate tracking

3. Alerting
   - Slow query alert (> X ms)
   - High error rate alert (> Y%)
   - Disk space alert (< Z GB)
   - Connection pool alert (> W%)

4. Dashboards
   - Performance dashboard
   - Capacity dashboard
   - Error dashboard
   - Business metrics dashboard

Provide:
- Monitoring setup guide
- Alert thresholds
- Dashboard configurations
- On-call runbook
```

---

## Usage Examples

### Design New Schema
```bash
claude --agent backend-architect \
  "Use 'Database Schema Design' prompt for team invitation feature"
```

### Review Migration
```bash
claude --agent backend-architect \
  "Use 'Migration Review' prompt for add_team_memberships migration"
```

### Optimize Query
```bash
claude --agent backend-architect \
  "Use 'Query Performance Review' prompt for league dashboard query"
```

### Review Multi-Tenancy
```bash
claude --agent backend-architect \
  "Use 'Multi-Tenancy Architecture Review' prompt"
```

---

**Last Updated:** 2026-01-30
