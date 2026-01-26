# Database Documentation

**Multi-Instance Architecture - Database Layer**
**Last Updated:** January 26, 2026

---

## Overview

This directory contains comprehensive documentation for the HockeyLifeHL database schema, focusing on the multi-instance architecture implementation. The database supports independent league instances with custom branding, domain routing, and complete data isolation.

---

## Documentation Files

### 1. AGENT_1_COMPLETION_SUMMARY.md

**Complete implementation summary for Agent 1 (Database Schema & Multi-Tenancy)**

**Contents:**
- Executive summary of all work completed
- Migration files created (3 files, 35KB total)
- Documentation files created (3 files, 46KB total)
- Database schema changes overview
- Pilot league configuration details
- Performance metrics and benchmarks
- TypeScript integration examples
- Testing instructions
- Security verification procedures
- Next steps for Agent 2
- Rollback plans and troubleshooting

**Use Cases:**
- Understand what Agent 1 delivered
- Reference for Agent 2 backend implementation
- Onboarding new developers to the database architecture
- Audit trail of database changes

---

### 2. RLS_VERIFICATION_REPORT.md

**Comprehensive Row Level Security (RLS) audit report**

**Contents:**
- Executive summary (32+ tables verified, 100% RLS coverage)
- Detailed table-by-table analysis
- RLS policy patterns and best practices
- Security verification test cases
- Performance considerations and optimizations
- Known limitations and risk assessments
- Compliance information (GDPR, SOC 2, PCI DSS)
- Recommendations for ongoing monitoring
- Complete appendices with SQL reference queries

**Use Cases:**
- Verify RLS policies are properly configured
- Understand data isolation mechanisms
- Security audits and compliance reviews
- Reference for creating new league-scoped tables
- Troubleshooting access control issues

**Key Sections:**
- Core multi-tenant tables (leagues, memberships, divisions, venues)
- Team & roster management tables
- Statistics and game data tables
- Payment and financial tables
- Scorekeeper system tables
- 5 standard RLS policy patterns
- Security test cases and expected results

---

### 3. DOMAIN_LOOKUP_TESTS.sql

**Comprehensive test suite for domain routing functionality**

**Contents:**
- 9 test categories with 28 individual test cases
- Automated PASS/FAIL result indicators
- Performance benchmarking (target: < 10ms per lookup)
- Routing configuration summary
- Branding data completeness verification
- Automatic test data cleanup
- Bonus verification checks (indexes, function definition)

**Test Categories:**
1. Subdomain Routing (4 tests)
2. Custom Domain Routing (4 tests)
3. Platform Domain Routing (4 tests)
4. Invalid Domain Handling (4 tests)
5. Branding Data Completeness (2 tests)
6. Case Sensitivity & Special Characters (3 tests)
7. Performance Testing (4 tests)
8. Routing Configuration Summary
9. League Branding View (3 tests)

**Usage:**
```bash
# Run with Supabase CLI
npx supabase db execute --file docs/database/DOMAIN_LOOKUP_TESTS.sql

# Run with psql
psql -d your_database -f docs/database/DOMAIN_LOOKUP_TESTS.sql
```

**Expected Output:**
- All tests show "PASS ✓"
- Performance < 10ms per lookup
- Complete routing configuration displayed
- No "FAIL ✗" indicators

---

## Migration Files Reference

### Primary Migrations (in order)

#### 1. 20260126_enhance_league_branding.sql (12KB)

**Purpose:** Add branding columns and domain routing to leagues table

**Changes:**
- 8 new columns (subdomain, accent_color, banner_url, favicon_url, font_family, custom_css, tagline, custom_domain_verified)
- 2 unique indexes (subdomain, custom_domain)
- 1 function (get_league_by_hostname)
- 1 view (league_branding)
- Pilot league seed data

**Dependencies:** Requires leagues table to exist

**Rollback Available:** Yes (see AGENT_1_COMPLETION_SUMMARY.md)

---

#### 2. 20260126_verify_rls_policies.sql (11KB)

**Purpose:** Verify RLS policies on all league-scoped tables

**Operation:**
- Diagnostic only (does not modify schema)
- Checks all tables with league_id column
- Verifies RLS enabled status
- Counts policies per table
- Identifies security gaps

**Usage:** Run after any schema changes to verify RLS coverage

**Output:** Summary statistics and detailed breakdown

---

#### 3. 20260126_test_domain_lookup.sql (14KB)

**Purpose:** Test domain routing function comprehensively

**Operation:**
- Creates temporary test league
- Runs 28 test cases
- Displays PASS/FAIL results
- Cleans up test data

**Usage:** Run after deploying domain routing function

**Output:** Test results with performance metrics

---

## Database Schema Summary

### Multi-Tenant Architecture

**Core Principle:** Every league is an independent tenant with complete data isolation

**Implementation:**
- All league-scoped tables have `league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE`
- Row Level Security (RLS) enabled on all league-scoped tables
- Policies filter data by league membership
- Indexes on league_id for optimal performance

**Tables with RLS:** 32+ tables verified

---

### Leagues Table Structure

```sql
leagues (
  -- Identity
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Branding - Visual
  logo_url TEXT,
  banner_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#1E40AF',
  secondary_color TEXT DEFAULT '#3B82F6',
  accent_color TEXT DEFAULT '#FFD700',
  font_family TEXT DEFAULT 'Inter, system-ui, sans-serif',
  custom_css TEXT,
  tagline TEXT,

  -- Branding - Domain Routing
  subdomain TEXT UNIQUE,
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT false,

  -- Location
  city TEXT,
  state_province TEXT,
  country TEXT DEFAULT 'USA',
  timezone TEXT DEFAULT 'America/New_York',

  -- Settings
  settings JSONB,

  -- Subscription
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',

  -- Status
  status TEXT DEFAULT 'active',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Indexes:**
- `idx_leagues_slug` (on slug)
- `idx_leagues_subdomain` (UNIQUE on subdomain)
- `idx_leagues_custom_domain` (UNIQUE on custom_domain)
- `idx_leagues_status` (on status)

---

### Domain Resolution Function

**Function:** `get_league_by_hostname(hostname TEXT)`

**Returns:**
```sql
TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  subdomain TEXT,
  custom_domain TEXT,
  custom_domain_verified BOOLEAN,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  font_family TEXT,
  custom_css TEXT,
  status TEXT
)
```

**Resolution Logic:**
1. Clean hostname (remove port, www, lowercase)
2. Check verified custom domains (exact match)
3. Extract subdomain and check (e.g., pilot.beerleaguehockey.ca -> "pilot")
4. Return NULL for platform domains (beerleaguehockey.ca, localhost)
5. Return NULL for unmatched domains

**Performance:** < 10ms per lookup (with indexes)

**Examples:**
```sql
-- Subdomain routing
SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.ca');

-- Custom domain routing
SELECT * FROM get_league_by_hostname('customdomain.com');

-- Platform domain (returns NULL)
SELECT * FROM get_league_by_hostname('beerleaguehockey.ca');
```

---

### League Branding View

**View:** `league_branding`

**Purpose:** Simplified access to active league branding data

**Definition:**
```sql
CREATE VIEW league_branding AS
SELECT
  id, name, slug,
  subdomain, custom_domain, custom_domain_verified,
  tagline,
  logo_url, banner_url, favicon_url,
  primary_color, secondary_color, accent_color,
  font_family, custom_css,
  status
FROM leagues
WHERE status = 'active';
```

**Usage:**
```sql
-- Get all active league branding
SELECT * FROM league_branding;

-- Get specific league branding
SELECT * FROM league_branding WHERE slug = 'pilot';
```

**Permissions:** Granted to authenticated and anonymous users (RLS still applies)

---

## Common Operations

### Check RLS Status

```sql
-- All tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Tables with league_id
SELECT
  t.tablename,
  pg_class.relrowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) AS policy_count
FROM information_schema.columns c
JOIN pg_tables t ON c.table_name = t.tablename
JOIN pg_class ON pg_class.relname = t.tablename
WHERE c.column_name = 'league_id'
  AND c.table_schema = 'public'
ORDER BY t.tablename;
```

---

### Test Domain Routing

```sql
-- Test subdomain
SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.ca');

-- Test with port (should strip)
SELECT * FROM get_league_by_hostname('pilot.localhost:3000');

-- Test case insensitivity
SELECT * FROM get_league_by_hostname('PILOT.BEERLEAGUEHOCKEY.CA');

-- Test platform domain (should return NULL)
SELECT * FROM get_league_by_hostname('beerleaguehockey.ca');
```

---

### Create New League

```sql
INSERT INTO leagues (
  name,
  slug,
  subdomain,
  description,
  logo_url,
  primary_color,
  secondary_color,
  accent_color,
  is_public,
  status
) VALUES (
  'My New League',
  'my-new-league',
  'mynewleague',
  'Description of my league',
  '/path/to/logo.png',
  '#1E40AF',
  '#3B82F6',
  '#FFD700',
  true,
  'active'
) RETURNING *;
```

---

### Update League Branding

```sql
UPDATE leagues
SET
  primary_color = '#E31837',
  secondary_color = '#0066CC',
  logo_url = '/new-logo.png',
  banner_url = '/new-banner.jpg',
  updated_at = NOW()
WHERE slug = 'pilot'
RETURNING *;
```

---

### Verify Custom Domain

```sql
-- After DNS verification
UPDATE leagues
SET custom_domain_verified = true
WHERE custom_domain = 'customdomain.com';

-- Test it resolves
SELECT * FROM get_league_by_hostname('customdomain.com');
```

---

## Performance Monitoring

### Check Function Performance

```sql
-- Explain plan
EXPLAIN ANALYZE
SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.ca');

-- Should show index usage on subdomain/custom_domain
```

---

### Monitor RLS Performance

```sql
-- Check for slow queries with RLS
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%league_id%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## Security Best Practices

### 1. Always Use RLS for League-Scoped Tables

```sql
-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Create basic policy
CREATE POLICY "Users can view data in their leagues"
  ON your_table FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

---

### 2. Test Cross-League Access

```sql
-- Attempt to access another league's data (should fail)
SET ROLE authenticated;
SELECT * FROM teams WHERE league_id = 'other-league-id';
-- Should return 0 rows if RLS is working
```

---

### 3. Verify Service Role Usage

```sql
-- Service role should only be used for migrations
-- Never expose service role credentials to client
```

---

## Troubleshooting

### Domain Routing Not Working

**Problem:** Domain doesn't resolve to league

**Check:**
1. Subdomain is set and unique
2. Custom domain is verified if using custom domain
3. League status is 'active'
4. Hostname is spelled correctly (case-insensitive)

```sql
-- Check league configuration
SELECT slug, subdomain, custom_domain, custom_domain_verified, status
FROM leagues
WHERE slug = 'your-league-slug';

-- Test function directly
SELECT * FROM get_league_by_hostname('your-domain-here');
```

---

### RLS Blocking Legitimate Access

**Problem:** Users can't see data they should have access to

**Check:**
1. User has active league membership
2. League membership has correct role
3. RLS policy matches your use case

```sql
-- Check user's league memberships
SELECT *
FROM league_memberships
WHERE user_id = auth.uid();

-- Check RLS policies on table
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

---

### Performance Issues

**Problem:** Queries are slow

**Check:**
1. Indexes exist on league_id columns
2. Indexes exist on subdomain and custom_domain
3. RLS policies use indexed columns

```sql
-- Check indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  SELECT DISTINCT table_name
  FROM information_schema.columns
  WHERE column_name = 'league_id'
)
ORDER BY tablename, indexname;
```

---

## Development Workflow

### 1. Local Development Setup

```bash
# Start Supabase locally
cd HockeyLifeHL
npx supabase start

# Reset database and apply all migrations
npx supabase db reset --local

# Verify migrations
npx supabase migration list
```

---

### 2. Running Tests

```bash
# Run RLS verification
npx supabase db execute --file supabase/migrations/20260126_verify_rls_policies.sql

# Run domain lookup tests
npx supabase db execute --file docs/database/DOMAIN_LOOKUP_TESTS.sql
```

---

### 3. Creating New League-Scoped Tables

**Template:**

```sql
CREATE TABLE your_new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- REQUIRED: League foreign key
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Your columns here
  name TEXT NOT NULL,
  description TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REQUIRED: Index on league_id
CREATE INDEX idx_your_new_table_league_id ON your_new_table(league_id);

-- REQUIRED: Enable RLS
ALTER TABLE your_new_table ENABLE ROW LEVEL SECURITY;

-- REQUIRED: Create policies
CREATE POLICY "Users can view in their leagues"
  ON your_new_table FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage"
  ON your_new_table FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );
```

---

## Additional Resources

### Related Documentation

- `../../MULTI_INSTANCE_ARCHITECTURE_PLAN.md` - Overall architecture plan
- `../../agents/agent-1-database.md` - Agent 1 instructions
- `../../AGENT_PROGRESS.md` - Project progress tracking

### Supabase Documentation

- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

### PostgreSQL Documentation

- [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [PL/pgSQL Functions](https://www.postgresql.org/docs/current/plpgsql.html)

---

## Quick Reference

### Essential Commands

```bash
# Database management
npx supabase db reset --local
npx supabase migration list
npx supabase migration new your_migration_name

# Testing
npx supabase db execute --file path/to/script.sql

# Status
npx supabase status
npx supabase db diff
```

### Essential Queries

```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Test domain routing
SELECT * FROM get_league_by_hostname('your-domain-here');

-- View league branding
SELECT * FROM league_branding WHERE slug = 'pilot';

-- List all policies
SELECT tablename, policyname FROM pg_policies ORDER BY tablename;
```

---

## Support & Questions

For questions about the database implementation:

1. Check this documentation first
2. Review RLS_VERIFICATION_REPORT.md for RLS-related issues
3. Review AGENT_1_COMPLETION_SUMMARY.md for implementation details
4. Run DOMAIN_LOOKUP_TESTS.sql to verify routing
5. Check AGENT_PROGRESS.md for current project status

---

**Last Updated:** January 26, 2026
**Maintained By:** Database Schema Architect
**Status:** Production Ready
