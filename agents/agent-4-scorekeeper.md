# Agent 4: Scorekeeper - Multi-Instance Support & Testing

**Agent Type:** Testing & Integration Specialist
**Focus:** Data Isolation, Scorekeeper Features, QA, Performance
**Access:** Read all files, Write to `src/lib/scorekeeper/`, `src/app/(dashboard)/[league]/scorekeeper/`, `docs/testing/`
**Depends On:** Agents 1, 2, 3 completion

---

## Mission

Ensure scorekeeper features work correctly within each league instance. Verify complete data isolation between leagues. Test the entire multi-instance architecture thoroughly and document findings.

---

## Context Files to Read First

Before starting any work, read these files:
1. `D:\B3\dev\HockeyLeague\MULTI_INSTANCE_ARCHITECTURE_PLAN.md`
2. `D:\B3\dev\HockeyLeague\AGENT_PROMPTS.md` (Your section)
3. `HockeyLifeHL\src\app\(dashboard)\[league]\scorekeeper\**\*.tsx` (Scorekeeper pages)
4. `HockeyLifeHL\src\lib\scorekeeper\*.ts` (Scorekeeper actions)
5. `HockeyLifeHL\supabase\migrations\*scorekeeper*.sql` (Scorekeeper schema)
6. Agent 1, 2, 3 deliverables

---

## Your Responsibilities

### Primary Tasks

1. **Verify Scorekeeper Schema**

   Check that all scorekeeper tables are league-scoped:

   ```sql
   -- Query to check scorekeeper tables
   SELECT
     table_name,
     column_name
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name LIKE '%scorekeeper%'
     AND column_name = 'league_id';
   ```

   Expected tables:
   - `scorekeeper_assignments` - Should have `league_id`
   - `scorekeeper_payments` - Should have `league_id`
   - Any other scorekeeper-related tables

   Verify RLS policies:
   ```sql
   SELECT
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd,
     qual
   FROM pg_policies
   WHERE tablename LIKE '%scorekeeper%';
   ```

   **Document findings in:** `docs/testing/SCOREKEEPER_SCHEMA_REPORT.md`

2. **Update Scorekeeper Actions for League Context**

   File: `src/lib/scorekeeper/actions.ts`

   Ensure ALL functions filter by league_id:

   ```typescript
   // Example: getScorekeeperAssignments
   export async function getScorekeeperAssignments(userId: string) {
     const supabase = await createClient();
     const leagueId = await getActiveLeagueId(); // Get from context

     const { data, error } = await supabase
       .from('scorekeeper_assignments')
       .select(`
         *,
         game:games(*)
       `)
       .eq('user_id', userId)
       .eq('league_id', leagueId) // CRITICAL: Filter by league
       .order('created_at', { ascending: false });

     if (error) {
       console.error('[Scorekeeper] Failed to get assignments:', error);
       return { error: error.message };
     }

     return { data };
   }
   ```

   **Review these functions:**
   - `getScorekeeperAssignments()`
   - `assignScorekeeper()`
   - `submitGameStats()`
   - `getScorekeeperPayments()`
   - `createScorekeeperPayment()`
   - Any other scorekeeper functions

   **Ensure:**
   - All queries include `.eq('league_id', leagueId)`
   - Use `getActiveLeagueId()` from league context
   - No cross-league data access possible

3. **Update Scorekeeper Components for Dynamic Branding**

   Files to update:
   - `src/app/(dashboard)/[league]/scorekeeper/page.tsx`
   - `src/app/(dashboard)/[league]/scorekeeper/assignments/page.tsx`
   - `src/app/(dashboard)/[league]/scorekeeper/live-entry/[gameId]/page.tsx`
   - `src/components/scorekeeper/ScorekeeperDashboard.tsx`
   - `src/components/scorekeeper/LiveGameEntry.tsx`

   Replace hardcoded colors with CSS variables:
   ```typescript
   // Before
   <div className="bg-[#1F4FD8] text-white">

   // After
   <div className="bg-[var(--primary-color)] text-white">
   ```

   Or use the hook:
   ```typescript
   import { useLeagueBranding } from '@/components/providers/LeagueThemeProvider';

   export function ScorekeeperDashboard() {
     const league = useLeagueBranding();

     return (
       <div style={{ backgroundColor: league.primaryColor }}>
         {/* component content */}
       </div>
     );
   }
   ```

4. **Create Multi-Instance Test Suite**

   File: `docs/testing/MULTI_INSTANCE_TEST_SUITE.md`

   ### Test 1: Platform Site

   ```markdown
   ## Test 1: Platform Site (beerleaguehockey.ca)

   **URL:** http://localhost:3000/

   **Expected Results:**
   - [ ] Shows BLH marketing page
   - [ ] BLH branding (#1F4FD8 blue, #D72638 red, #FFD700 gold)
   - [ ] "Sign In" button visible
   - [ ] No league-specific content
   - [ ] Marketing header with BLH logo
   - [ ] Footer with platform links

   **Steps:**
   1. Open http://localhost:3000/
   2. Verify hero section uses BLH branding
   3. Check browser DevTools for CSS variables
   4. Verify no x-league-hostname header
   5. Click "Sign In" - should go to auth page with BLH branding
   ```

   ### Test 2: Pilot League

   ```markdown
   ## Test 2: Pilot League (pilot.beerleaguehockey.ca)

   **Setup:**
   1. Add to hosts file:
      - Windows: `C:\Windows\System32\drivers\etc\hosts`
      - Mac/Linux: `/etc/hosts`
      ```
      127.0.0.1 pilot.beerleaguehockey.local
      ```
   2. Restart browser to clear DNS cache

   **URL:** http://pilot.beerleaguehockey.local:3000/

   **Expected Results:**
   - [ ] Shows HockeyLifeHL branding
   - [ ] Colors: #E31837 (red), #0066CC (blue), #FFD700 (gold)
   - [ ] Logo is /logo.png (HockeyLifeHL logo)
   - [ ] League header (not marketing header)
   - [ ] Navigation: Schedule, Standings, Stats, Teams
   - [ ] Only pilot league data visible

   **Steps:**
   1. Open http://pilot.beerleaguehockey.local:3000/
   2. Verify middleware sets x-league-hostname header
   3. Check CSS variables match HockeyLifeHL branding
   4. Navigate to /schedule - verify only pilot games
   5. Navigate to /standings - verify only pilot teams
   6. Navigate to /stats - verify only pilot players
   7. Open browser DevTools Network tab - verify x-league-hostname header present
   ```

   ### Test 3: Data Isolation

   ```markdown
   ## Test 3: Data Isolation Verification

   **Goal:** Prove that leagues cannot see each other's data

   **Setup:**
   1. Create two test leagues in database:
      - League A (pilot)
      - League B (test league)
   2. Create test data for each:
      - 2 teams per league
      - 2 games per league
      - 2 players per team
      - 1 scorekeeper per league

   **Test Steps:**

   ### 3.1 Scorekeeper Assignments
   - [ ] Login as scorekeeper for League A
   - [ ] Visit /scorekeeper/assignments
   - [ ] Verify only League A games visible
   - [ ] Attempt direct URL access to League B game: /scorekeeper/live-entry/[league-b-game-id]
   - [ ] Expected: 404 or Access Denied

   ### 3.2 Team Data
   - [ ] Login as player in League A
   - [ ] Visit /teams
   - [ ] Verify only League A teams visible
   - [ ] Check database query in Network tab - should include league_id filter

   ### 3.3 Player Stats
   - [ ] Login as player in League A
   - [ ] Visit /stats
   - [ ] Verify only League A player stats visible
   - [ ] Check player profile - verify stats from League A only

   ### 3.4 RLS Policy Test (Database Level)
   ```sql
   -- Switch to League A user context
   SET LOCAL auth.user_id = '[league-a-user-id]';
   SET LOCAL auth.league_id = '[league-a-id]';

   -- Try to query League B data
   SELECT * FROM teams WHERE league_id = '[league-b-id]';
   -- Expected: 0 rows (RLS blocks access)

   -- Query League A data
   SELECT * FROM teams WHERE league_id = '[league-a-id]';
   -- Expected: League A teams returned
   ```
   ```

   ### Test 4: Custom Domain Simulation

   ```markdown
   ## Test 4: Custom Domain

   **Setup:**
   1. Add to hosts file:
      ```
      127.0.0.1 testleague.local
      ```
   2. Create test league in database:
      ```sql
      INSERT INTO leagues (id, name, slug, custom_domain, custom_domain_verified)
      VALUES (
        gen_random_uuid(),
        'Test League',
        'testleague',
        'testleague.local',
        true
      );
      ```

   **URL:** http://testleague.local:3000/

   **Expected Results:**
   - [ ] Middleware detects custom domain
   - [ ] Sets x-league-hostname header to 'testleague.local'
   - [ ] Loads test league branding
   - [ ] Shows test league data only
   - [ ] League context API returns correct league

   **Steps:**
   1. Open http://testleague.local:3000/
   2. Verify correct league loads
   3. Check Network tab for x-league-hostname header
   4. Verify database function: `SELECT * FROM get_league_by_hostname('testleague.local');`
   ```

   ### Test 5: Scorekeeper Live Entry

   ```markdown
   ## Test 5: Scorekeeper Live Entry (Multi-Instance)

   **Setup:**
   1. Create game in pilot league
   2. Assign scorekeeper to game
   3. Login as scorekeeper

   **URL:** http://pilot.beerleaguehockey.local:3000/scorekeeper/live-entry/[game-id]

   **Test Scenarios:**

   ### 5.1 Basic Entry
   - [ ] Page loads with pilot branding
   - [ ] Shows correct game details (pilot league only)
   - [ ] Can record goals
   - [ ] Can record assists
   - [ ] Can record penalties
   - [ ] Can record saves
   - [ ] All submissions include league_id

   ### 5.2 Real-Time Updates
   - [ ] Stats update immediately
   - [ ] No lag > 100ms
   - [ ] No errors in console

   ### 5.3 Cross-League Prevention
   - [ ] Create game in different league
   - [ ] Try to access via direct URL
   - [ ] Expected: Access denied (league_id mismatch)
   ```

5. **Create Test Data Script**

   File: `scripts/create-test-leagues.ts`

   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

   const supabase = createClient(supabaseUrl, supabaseKey);

   async function createTestLeagues() {
     console.log('Creating test leagues...');

     // Create 3 test leagues
     const leagues = [
       {
         name: 'Test League Alpha',
         slug: 'alpha',
         subdomain: 'alpha',
         primary_color: '#FF0000',
         secondary_color: '#0000FF',
         accent_color: '#00FF00',
       },
       {
         name: 'Test League Beta',
         slug: 'beta',
         subdomain: 'beta',
         primary_color: '#800080',
         secondary_color: '#FFA500',
         accent_color: '#FF69B4',
       },
       {
         name: 'Test League Gamma',
         slug: 'gamma',
         custom_domain: 'gamma.local',
         custom_domain_verified: true,
         primary_color: '#008080',
         secondary_color: '#FFD700',
         accent_color: '#DC143C',
       },
     ];

     for (const league of leagues) {
       const { data: createdLeague, error: leagueError } = await supabase
         .from('leagues')
         .insert(league)
         .select()
         .single();

       if (leagueError) {
         console.error(`Failed to create ${league.name}:`, leagueError);
         continue;
       }

       console.log(`✓ Created ${league.name}`);

       // Create 2 teams for this league
       const teams = [
         { league_id: createdLeague.id, name: `${league.name} Team 1`, slug: `${league.slug}-team1` },
         { league_id: createdLeague.id, name: `${league.name} Team 2`, slug: `${league.slug}-team2` },
       ];

       const { error: teamsError } = await supabase.from('teams').insert(teams);

       if (teamsError) {
         console.error(`Failed to create teams for ${league.name}:`, teamsError);
         continue;
       }

       console.log(`  ✓ Created 2 teams`);

       // Create a game
       const { error: gameError } = await supabase.from('games').insert({
         league_id: createdLeague.id,
         home_team_id: teams[0].id,
         away_team_id: teams[1].id,
         scheduled_date: new Date().toISOString(),
         status: 'scheduled',
       });

       if (gameError) {
         console.error(`Failed to create game for ${league.name}:`, gameError);
         continue;
       }

       console.log(`  ✓ Created 1 game`);
     }

     console.log('\n✅ Test data creation complete!');
   }

   async function resetTestData() {
     console.log('Resetting test data...');

     // Delete test leagues (cascade will handle related data)
     const { error } = await supabase
       .from('leagues')
       .delete()
       .in('slug', ['alpha', 'beta', 'gamma']);

     if (error) {
       console.error('Failed to reset test data:', error);
     } else {
       console.log('✅ Test data reset complete!');
     }
   }

   // Run based on command line arg
   const command = process.argv[2];

   if (command === 'create') {
     createTestLeagues();
   } else if (command === 'reset') {
     resetTestData();
   } else {
     console.log('Usage: ts-node create-test-leagues.ts [create|reset]');
   }
   ```

   Add to `package.json`:
   ```json
   {
     "scripts": {
       "test:data:create": "ts-node scripts/create-test-leagues.ts create",
       "test:data:reset": "ts-node scripts/create-test-leagues.ts reset"
     }
   }
   ```

6. **Performance Testing**

   File: `docs/testing/PERFORMANCE_REPORT.md`

   Test these metrics:

   ### Middleware Performance
   ```typescript
   // Add timing to middleware.ts
   export function middleware(request: NextRequest) {
     const startTime = performance.now();

     // ... middleware logic ...

     const endTime = performance.now();
     const duration = endTime - startTime;

     console.log(`[Middleware] Execution time: ${duration.toFixed(2)}ms`);

     // ... return response ...
   }
   ```

   **Target:** < 10ms per request

   ### Branding Lookup Performance
   ```typescript
   // Test get_league_by_hostname function
   console.time('league-lookup');
   const league = await getLeagueFromHostname();
   console.timeEnd('league-lookup');
   ```

   **Targets:**
   - With cache: < 5ms
   - Without cache: < 50ms

   ### N+1 Query Check
   - Use Supabase dashboard to monitor query count
   - Each page load should make:
     - 1 query for league branding
     - 1 query for user data
     - 1 query for page-specific data
   - **No:** Separate query per team/player/game

   ### Bundle Size Impact
   ```bash
   # Before multi-instance
   npm run build
   # Note bundle sizes

   # After multi-instance
   npm run build
   # Compare bundle sizes
   ```

   **Target:** < 5% increase in bundle size

---

## Deliverables

Create these files:

1. **`docs/testing/SCOREKEEPER_SCHEMA_REPORT.md`** - Schema verification
2. **`docs/testing/MULTI_INSTANCE_TEST_SUITE.md`** - Complete test suite
3. **`docs/testing/PERFORMANCE_REPORT.md`** - Performance metrics
4. **`scripts/create-test-leagues.ts`** - Test data script
5. **Updated `src/lib/scorekeeper/actions.ts`** - All functions filter by league_id
6. **Updated scorekeeper components** - All use dynamic branding

---

## Success Criteria

- [ ] All scorekeeper tables have league_id column
- [ ] All scorekeeper tables have RLS policies
- [ ] All scorekeeper functions filter by league_id
- [ ] Scorekeeper UI adapts to league branding
- [ ] No cross-league data visible in any scenario
- [ ] Platform site works (no league context)
- [ ] Pilot subdomain works (pilot league context)
- [ ] Custom domain works (league context)
- [ ] Data isolation verified through testing
- [ ] Middleware latency < 10ms
- [ ] League lookup < 50ms (uncached)
- [ ] All tests pass
- [ ] Performance impact acceptable

---

## Commands to Run

```bash
# Setup test environment
cd HockeyLifeHL
npm run test:data:create

# Run development server
npm run dev

# Test platform
curl http://localhost:3000/

# Test subdomain (after hosts file setup)
curl -H "Host: pilot.beerleaguehockey.local:3000" http://localhost:3000/

# Test custom domain (after hosts file setup)
curl -H "Host: testleague.local:3000" http://localhost:3000/

# Check database
npx supabase db execute --file docs/testing/verify-rls.sql

# Cleanup test data
npm run test:data:reset

# Build for production
npm run build
```

---

## Report Format

After completing, update `D:\B3\dev\HockeyLeague\AGENT_PROGRESS.md`:

```markdown
## Agent 4: Scorekeeper - Multi-Instance Support & Testing

**Status:** 🟢 Complete
**Completed:** [Date]

### Summary
- Verified scorekeeper schema with league_id on all tables
- Updated all scorekeeper actions to filter by league context
- Updated scorekeeper components with dynamic branding
- Created comprehensive multi-instance test suite
- Created test data generation script
- Performed performance testing
- Verified complete data isolation

### Files Created/Updated
- docs/testing/SCOREKEEPER_SCHEMA_REPORT.md (new)
- docs/testing/MULTI_INSTANCE_TEST_SUITE.md (new)
- docs/testing/PERFORMANCE_REPORT.md (new)
- scripts/create-test-leagues.ts (new)
- src/lib/scorekeeper/actions.ts (updated)
- src/app/(dashboard)/[league]/scorekeeper/page.tsx (updated)
- src/components/scorekeeper/LiveGameEntry.tsx (updated)

### Test Results
- Platform site: ✓ (BLH branding, no league context)
- Pilot subdomain: ✓ (HockeyLifeHL branding, pilot data only)
- Custom domain: ✓ (Custom branding, league data only)
- Data isolation: ✓ (No cross-league access possible)
- Scorekeeper assignments: ✓ (League-scoped)
- Live game entry: ✓ (League-scoped with branding)
- RLS policies: ✓ (All tables protected)

### Performance Metrics
- Middleware latency: 6.2ms average ✓
- League lookup (cached): 2.1ms ✓
- League lookup (uncached): 38.7ms ✓
- Bundle size increase: +3.2% ✓
- No N+1 queries detected ✓

### Bugs Found & Fixed
1. [List any bugs discovered during testing]
2. [And how they were fixed]

### Recommendations
1. Add automated E2E tests with Playwright
2. Set up monitoring for middleware latency in production
3. Add caching layer for frequently accessed leagues
4. Consider CDN for static assets per league

### Blockers Resolved
- None

### Project Complete
All 4 agents have completed their deliverables. Multi-instance architecture is ready for production deployment.
```

---

## Questions?

If you encounter issues:
1. Check that Agents 1, 2, 3 completed successfully
2. Verify database migrations applied
3. Test with browser cache disabled
4. Use browser DevTools Network tab to inspect headers
5. Check Supabase logs for RLS policy violations

**Ready to start? Verify Agents 1-3 are complete, then begin with Task #1.**
