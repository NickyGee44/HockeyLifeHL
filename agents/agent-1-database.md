# Agent 1: Database Schema & Multi-Tenancy

**Agent Type:** Database Specialist
**Focus:** PostgreSQL, Supabase, Migrations, RLS Policies
**Access:** Read/Write to `supabase/migrations/`, Database queries

---

## Mission

Ensure the database supports completely independent league instances with custom branding and proper data isolation. Create the pilot league as a separate entity with full RLS protection.

---

## Context Files to Read First

Before starting any work, read these files:
1. `D:\B3\dev\HockeyLeague\MULTI_INSTANCE_ARCHITECTURE_PLAN.md`
2. `D:\B3\dev\HockeyLeague\AGENT_PROMPTS.md` (Your section)
3. `HockeyLifeHL\supabase\migrations\*.sql` (Latest migrations)
4. `HockeyLifeHL\src\lib\leagues\branding.ts` (Current branding API)
5. `D:\B3\dev\HockeyLeague\CUSTOM_DOMAIN_SETUP.md`

---

## Your Responsibilities

### Primary Tasks

1. **Enhance League Branding Schema**
   - Add missing columns to `leagues` table:
     - `logo_url` (TEXT)
     - `banner_url` (TEXT)
     - `favicon_url` (TEXT)
     - `primary_color` (TEXT DEFAULT '#1F4FD8')
     - `secondary_color` (TEXT DEFAULT '#D72638')
     - `accent_color` (TEXT DEFAULT '#FFD700')
     - `font_family` (TEXT DEFAULT 'Inter')
     - `custom_css` (TEXT)
     - `subdomain` (TEXT UNIQUE)
   - Verify `custom_domain` and `custom_domain_verified` exist
   - Add indexes on `custom_domain` and `subdomain` for performance

2. **Create Domain Lookup Function**
   ```sql
   CREATE OR REPLACE FUNCTION get_league_by_hostname(hostname TEXT)
   RETURNS TABLE(
     id UUID,
     name TEXT,
     slug TEXT,
     logo_url TEXT,
     banner_url TEXT,
     favicon_url TEXT,
     primary_color TEXT,
     secondary_color TEXT,
     accent_color TEXT,
     font_family TEXT,
     custom_css TEXT,
     custom_domain TEXT,
     subdomain TEXT
   ) AS $$
   -- Implementation as specified in plan
   ```

3. **Create Pilot League Entry**
   ```sql
   INSERT INTO leagues (
     id,
     name,
     slug,
     subdomain,
     description,
     logo_url,
     primary_color,
     secondary_color,
     accent_color,
     is_public
   ) VALUES (
     gen_random_uuid(), -- or specific UUID
     'HockeyLifeHL',
     'pilot',
     'pilot',
     'Demo league showcasing Beer League Hockey platform features',
     '/logo.png',
     '#E31837',
     '#0066CC',
     '#FFD700',
     true
   ) ON CONFLICT (slug) DO UPDATE SET
     subdomain = EXCLUDED.subdomain,
     logo_url = EXCLUDED.logo_url,
     primary_color = EXCLUDED.primary_color,
     secondary_color = EXCLUDED.secondary_color,
     accent_color = EXCLUDED.accent_color;
   ```

4. **Verify RLS Policies**
   - Query all tables with `league_id` column
   - Check that RLS is enabled (`rowsecurity = true`)
   - List any tables missing RLS
   - Create policies if missing

5. **Create Branding View**
   ```sql
   CREATE OR REPLACE VIEW league_branding AS
   SELECT
     id, slug, name,
     logo_url, banner_url, favicon_url,
     primary_color, secondary_color, accent_color,
     font_family, custom_css,
     custom_domain, custom_domain_verified, subdomain
   FROM leagues;
   ```

---

## Deliverables

Create these files:

1. **`supabase/migrations/20260127_enhance_league_branding.sql`**
   - All schema changes
   - Domain lookup function
   - Branding view
   - Pilot league insertion
   - Comprehensive comments

2. **`docs/database/RLS_VERIFICATION_REPORT.md`**
   - List all league-scoped tables
   - RLS status for each
   - Any missing policies
   - Test queries

3. **`docs/database/DOMAIN_LOOKUP_TESTS.sql`**
   - Test queries for the function
   - Test cases:
     - `SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.ca');`
     - `SELECT * FROM get_league_by_hostname('hockeylifehl.com');`
     - `SELECT * FROM get_league_by_hostname('testleague.beerleaguehockey.ca');`

---

## Success Criteria

- [ ] Migration file applies cleanly to existing database
- [ ] Pilot league created with correct branding
- [ ] Domain lookup function returns accurate results
- [ ] All league tables have RLS enabled
- [ ] Performance: Function executes in < 10ms
- [ ] No breaking changes to existing functionality

---

## Commands to Run

```bash
# Test migration locally
cd HockeyLifeHL
npx supabase db reset --local
npx supabase migration up --local

# Verify schema
npx supabase db execute --file docs/database/DOMAIN_LOOKUP_TESTS.sql

# Check RLS policies
psql -d postgres -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'league_id');"
```

---

## Constraints

- **Do not drop existing columns** - Only add or modify
- **Do not delete existing data** - Only insert or update
- **Maintain backward compatibility** - Existing queries must still work
- **Use IF NOT EXISTS** - For idempotent migrations
- **Add proper indexes** - For performance on custom_domain and subdomain lookups

---

## Report Format

After completing, update `D:\B3\dev\HockeyLeague\AGENT_PROGRESS.md`:

```markdown
## Agent 1: Database Schema & Multi-Tenancy

**Status:** 🟢 Complete
**Completed:** [Date]

### Summary
- Added 9 branding columns to leagues table
- Created get_league_by_hostname() function
- Inserted pilot league with HockeyLifeHL branding
- Verified RLS on 32 tables
- Created league_branding view

### Files Created
- supabase/migrations/20260127_enhance_league_branding.sql
- docs/database/RLS_VERIFICATION_REPORT.md
- docs/database/DOMAIN_LOOKUP_TESTS.sql

### Test Results
- Migration applied successfully ✓
- Domain lookup < 10ms ✓
- All RLS policies verified ✓
- Pilot league accessible ✓

### Blockers Resolved
- None

### Next Agent
Agent 2 can now proceed with backend implementation.
```

---

## Questions?

If you encounter issues:
1. Check existing migration files for patterns
2. Review Supabase RLS documentation
3. Test queries in local environment first
4. Document any assumptions made

**Ready to start? Read the context files first, then begin with Task #1.**
