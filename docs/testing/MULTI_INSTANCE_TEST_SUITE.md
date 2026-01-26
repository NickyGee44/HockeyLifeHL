# Multi-Instance Architecture Test Suite

**Agent:** Agent 4 - Testing & Integration Specialist
**Date:** January 26, 2026
**Status:** Complete
**Purpose:** Comprehensive testing plan for multi-instance scorekeeper features and data isolation

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Test Category 1: Platform Site](#test-category-1-platform-site)
3. [Test Category 2: Pilot League Subdomain](#test-category-2-pilot-league-subdomain)
4. [Test Category 3: Custom Domain](#test-category-3-custom-domain)
5. [Test Category 4: Data Isolation](#test-category-4-data-isolation)
6. [Test Category 5: Scorekeeper Live Entry](#test-category-5-scorekeeper-live-entry)
7. [Test Category 6: Cross-League Prevention](#test-category-6-cross-league-prevention)
8. [Test Category 7: Performance Testing](#test-category-7-performance-testing)
9. [Test Category 8: Branding Verification](#test-category-8-branding-verification)
10. [Pass/Fail Criteria](#passfail-criteria)

---

## Test Environment Setup

### Prerequisites

- Node.js 18+ installed
- Supabase project configured
- Environment variables set in `.env.local`
- Development server running (`npm run dev`)

### Hosts File Configuration

**Location:**
- Windows: `C:\Windows\System32\drivers\etc\hosts`
- Mac/Linux: `/etc/hosts`

**Required Entries:**
```
127.0.0.1 beerleaguehockey.local
127.0.0.1 pilot.beerleaguehockey.local
127.0.0.1 alpha.beerleaguehockey.local
127.0.0.1 beta.beerleaguehockey.local
127.0.0.1 gamma.local
```

**Windows:** Edit as Administrator
**Mac/Linux:** `sudo nano /etc/hosts`

### Database Setup

Run the test data creation script (see Test Category 4 for details):

```bash
cd HockeyLifeHL
npm run test:data:create
```

This creates three test leagues:
1. **Alpha League** - `alpha.beerleaguehockey.local`
2. **Beta League** - `beta.beerleaguehockey.local`
3. **Gamma League** - `gamma.local` (custom domain)

### Test Users

Create test users in each league:

| User Type | League | Email | Role |
|-----------|--------|-------|------|
| Admin | Alpha | admin@alpha.test | owner |
| Scorekeeper | Alpha | scorekeeper@alpha.test | scorekeeper |
| Player | Alpha | player@alpha.test | player |
| Admin | Beta | admin@beta.test | owner |
| Scorekeeper | Beta | scorekeeper@beta.test | scorekeeper |
| Player | Beta | player@beta.test | player |

### Clear Browser Cache

Before testing:
1. Open browser DevTools (F12)
2. Right-click Refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use Incognito/Private mode

---

## Test Category 1: Platform Site

**Goal:** Verify platform marketing site is accessible without league context

### Test 1.1: Platform Homepage

**URL:** `http://localhost:3000/`

**Steps:**
1. Open URL in browser
2. Verify page loads without errors
3. Check that platform branding is displayed

**Expected Results:**
- [ ] Page loads successfully (200 OK)
- [ ] BLH branding visible (colors: #1F4FD8, #D72638, #FFD700)
- [ ] Marketing content displayed (hero section, features, pricing)
- [ ] No league-specific content visible
- [ ] "Sign In" and "Get Started" buttons present
- [ ] No `x-league-hostname` header in requests (check DevTools Network tab)

**DevTools Verification:**
```javascript
// In browser console
console.log(getComputedStyle(document.documentElement).getPropertyValue('--league-primary-color'));
// Should be empty or undefined (no league context)
```

**Pass Criteria:** All checkboxes checked, no errors in console

---

### Test 1.2: Platform Marketing Pages

**URLs to Test:**
- `http://localhost:3000/about`
- `http://localhost:3000/contact`
- `http://localhost:3000/pricing`
- `http://localhost:3000/features`

**Steps:**
1. Navigate to each URL
2. Verify platform branding persists
3. Check for any league-specific content (should be none)

**Expected Results:**
- [ ] All pages load successfully
- [ ] Consistent BLH branding across all pages
- [ ] No league context in any requests
- [ ] Navigation works correctly

**Pass Criteria:** Consistent platform experience across all pages

---

### Test 1.3: Platform Login

**URL:** `http://localhost:3000/login`

**Steps:**
1. Navigate to login page
2. Verify platform branding
3. Attempt login with test credentials
4. Check redirect behavior

**Expected Results:**
- [ ] Login page uses platform branding
- [ ] No league context present
- [ ] After login, user is redirected to dashboard or league selector
- [ ] No errors during auth flow

**Pass Criteria:** Login works without league context

---

## Test Category 2: Pilot League Subdomain

**Goal:** Verify subdomain requests route to league instance with correct branding

### Test 2.1: Pilot League Homepage

**URL:** `http://pilot.beerleaguehockey.local:3000/`

**Steps:**
1. Open URL in browser
2. Inspect page source and CSS variables
3. Check DevTools Network tab for headers

**Expected Results:**
- [ ] Page loads successfully (200 OK)
- [ ] HockeyLifeHL branding displayed
- [ ] Colors: Primary #E31837, Secondary #0066CC, Accent #FFD700
- [ ] Logo: `/logo.png` (HockeyLifeHL logo)
- [ ] `x-league-hostname` header set to `pilot.beerleaguehockey.local:3000`
- [ ] `x-league-subdomain` header set to `pilot`
- [ ] CSS variables set correctly

**DevTools Verification:**
```javascript
// In browser console
console.log(getComputedStyle(document.documentElement).getPropertyValue('--league-primary-color'));
// Should output: #E31837

// Check Network tab -> Headers
// x-league-hostname: pilot.beerleaguehockey.local:3000
// x-league-subdomain: pilot
```

**Pass Criteria:** Pilot branding applied, headers set correctly

---

### Test 2.2: Pilot League Navigation

**URLs to Test:**
- `http://pilot.beerleaguehockey.local:3000/schedule`
- `http://pilot.beerleaguehockey.local:3000/standings`
- `http://pilot.beerleaguehockey.local:3000/stats`
- `http://pilot.beerleaguehockey.local:3000/teams`

**Steps:**
1. Navigate to each page
2. Verify branding persists
3. Check that only pilot league data is displayed

**Expected Results:**
- [ ] All pages load with pilot branding
- [ ] Only pilot league games, teams, players visible
- [ ] No data from other leagues visible
- [ ] Navigation links work correctly
- [ ] Headers maintain league context

**Pass Criteria:** Consistent pilot branding, data isolation enforced

---

### Test 2.3: Pilot League Scorekeeper Dashboard

**URL:** `http://pilot.beerleaguehockey.local:3000/scorekeeper/dashboard`

**Prerequisites:**
- Login as scorekeeper assigned to pilot league

**Steps:**
1. Login as pilot scorekeeper
2. Navigate to scorekeeper dashboard
3. Verify assignments list

**Expected Results:**
- [ ] Only pilot league games in assignments
- [ ] Pilot branding applied to scorekeeper UI
- [ ] Check-in/completion functions work
- [ ] No games from other leagues visible

**Pass Criteria:** Scorekeeper sees only pilot games

---

## Test Category 3: Custom Domain

**Goal:** Verify custom domain requests route to league instance

### Test 3.1: Custom Domain Setup

**Prerequisites:**
Create test league with custom domain:

```sql
INSERT INTO leagues (
  name, slug, custom_domain, custom_domain_verified,
  primary_color, secondary_color, accent_color,
  logo_url, status, is_public
) VALUES (
  'Gamma League',
  'gamma',
  'gamma.local',
  true,
  '#008080',
  '#FFD700',
  '#DC143C',
  '/gamma-logo.png',
  'active',
  true
) ON CONFLICT (slug) DO UPDATE SET
  custom_domain = EXCLUDED.custom_domain,
  custom_domain_verified = EXCLUDED.custom_domain_verified;
```

---

### Test 3.2: Custom Domain Homepage

**URL:** `http://gamma.local:3000/`

**Steps:**
1. Open URL in browser
2. Verify custom domain is detected
3. Check branding and headers

**Expected Results:**
- [ ] Page loads successfully
- [ ] Gamma league branding applied (colors: #008080, #FFD700, #DC143C)
- [ ] `x-league-hostname` header set to `gamma.local:3000`
- [ ] NO `x-league-subdomain` header (custom domains don't have subdomains)
- [ ] League context loaded from database using custom domain

**DevTools Verification:**
```javascript
console.log(getComputedStyle(document.documentElement).getPropertyValue('--league-primary-color'));
// Should output: #008080
```

**Pass Criteria:** Custom domain routes to correct league with proper branding

---

### Test 3.3: Custom Domain Data Isolation

**URL:** `http://gamma.local:3000/teams`

**Steps:**
1. Navigate to teams page
2. Verify only gamma league teams visible
3. Attempt direct URL access to other league's data

**Expected Results:**
- [ ] Only gamma league teams displayed
- [ ] No alpha or beta league data visible
- [ ] Direct URL manipulation fails (e.g., accessing `/teams/<beta-team-id>`)

**Pass Criteria:** Data isolation enforced on custom domain

---

## Test Category 4: Data Isolation

**Goal:** Prove that leagues cannot see each other's data at any level

### Test 4.1: Database-Level Isolation (RLS)

**Prerequisites:**
- Two leagues exist: Alpha (id: `alpha-uuid`) and Beta (id: `beta-uuid`)
- User is member of Alpha only

**Steps:**
Run these SQL queries as the test user:

```sql
-- Try to access Beta league teams while in Alpha context
SET LOCAL auth.user_id = '<alpha-user-uuid>';

SELECT * FROM teams WHERE league_id = '<beta-uuid>';
-- Expected: 0 rows (RLS blocks access)

SELECT * FROM teams WHERE league_id = '<alpha-uuid>';
-- Expected: Alpha league teams returned
```

**Expected Results:**
- [ ] Beta league query returns 0 rows
- [ ] Alpha league query returns teams
- [ ] RLS policies enforced at database level

**Pass Criteria:** RLS prevents cross-league access

---

### Test 4.2: Application-Level Isolation (Actions)

**Test Setup:**
- Login as scorekeeper in Alpha league
- Set active league context to Alpha
- Attempt to access Beta game via API

**Test Code:**
```javascript
// Client-side test
fetch('/api/games/<beta-game-id>')
  .then(res => res.json())
  .then(data => {
    console.log('Should be empty or error:', data);
  });
```

**Expected Results:**
- [ ] API returns empty result or 403 Forbidden
- [ ] No Beta league data exposed
- [ ] Action filters by `league_id` correctly

**Pass Criteria:** Application layer enforces league context

---

### Test 4.3: Scorekeeper Assignment Isolation

**Test Setup:**
- Create scorekeeper who works for both Alpha and Beta leagues
- Assign games to scorekeeper in both leagues
- Login as scorekeeper and switch between leagues

**Steps:**
1. Login as multi-league scorekeeper
2. Visit `http://alpha.beerleaguehockey.local:3000/scorekeeper/dashboard`
3. Note assignments shown
4. Visit `http://beta.beerleaguehockey.local:3000/scorekeeper/dashboard`
5. Note assignments shown

**Expected Results:**
- [ ] Alpha subdomain shows only Alpha game assignments
- [ ] Beta subdomain shows only Beta game assignments
- [ ] No cross-league assignments visible
- [ ] `getScorekeeperAssignments()` filters by `league_id`

**Pass Criteria:** Scorekeepers see only current league's assignments

---

### Test 4.4: Direct URL Manipulation

**Test Setup:**
- User is member of Alpha league only
- Beta league game exists with id `beta-game-uuid`

**Steps:**
1. Login to Alpha league
2. Navigate to `http://alpha.beerleaguehockey.local:3000/scorekeeper/live-entry/<beta-game-uuid>`
3. Attempt to access Beta game from Alpha context

**Expected Results:**
- [ ] Page returns "Access Denied" or 404
- [ ] No game data displayed
- [ ] League context validation prevents access
- [ ] Error logged: "This game is not in the current league"

**Pass Criteria:** Direct URL manipulation fails securely

---

### Test 4.5: Audit Log Isolation

**Test Setup:**
- Stat entries logged in both Alpha and Beta leagues

**Steps:**
```sql
-- Try to access Beta audit logs from Alpha context
SELECT * FROM game_stat_entry_log
WHERE league_id = '<beta-uuid>'
AND game_id = '<beta-game-uuid>';
-- Expected: 0 rows (RLS blocks)

SELECT * FROM game_stat_entry_log
WHERE league_id = '<alpha-uuid>';
-- Expected: Alpha league logs returned
```

**Expected Results:**
- [ ] Beta logs inaccessible from Alpha context
- [ ] Alpha logs accessible in Alpha context
- [ ] Audit trail maintains league isolation

**Pass Criteria:** Audit logs properly isolated

---

## Test Category 5: Scorekeeper Live Entry

**Goal:** Verify scorekeeper live entry works correctly with league context

### Test 5.1: Basic Stat Entry

**URL:** `http://pilot.beerleaguehockey.local:3000/scorekeeper/live-entry/<pilot-game-id>`

**Prerequisites:**
- Login as pilot scorekeeper
- Assigned to a pilot league game

**Steps:**
1. Navigate to live entry page
2. Check in to game
3. Start game clock
4. Record goals, assists, penalties
5. Complete game

**Expected Results:**
- [ ] Page loads with pilot branding
- [ ] Game details displayed correctly (pilot teams only)
- [ ] Check-in button works
- [ ] Clock starts correctly
- [ ] Stat entry pad functional
- [ ] Stats saved with `league_id = pilot-league-id`
- [ ] Completion button works

**DevTools Verification:**
Check Network tab for stat submission requests:
```json
{
  "game_id": "<pilot-game-uuid>",
  "league_id": "<pilot-league-uuid>",
  "player_id": "<player-uuid>",
  "stat_type": "goal"
}
```

**Pass Criteria:** All stat entry functions work with league context

---

### Test 5.2: Real-Time Updates

**Test Setup:**
- Two browsers open to same game (different scorekeepers or admin + scorekeeper)

**Steps:**
1. Browser A: Record a goal
2. Browser B: Verify goal appears in stat summary
3. Measure latency

**Expected Results:**
- [ ] Stats update in real-time (< 1 second)
- [ ] Both browsers see same data
- [ ] No lag or sync issues
- [ ] Updates include league context

**Pass Criteria:** Real-time sync works correctly

---

### Test 5.3: Offline Queue

**Test Setup:**
- Enable offline mode or disable network

**Steps:**
1. Disconnect network
2. Record stats while offline
3. Reconnect network
4. Verify stats sync

**Expected Results:**
- [ ] Stats queued locally while offline
- [ ] UI indicates offline status
- [ ] On reconnect, stats sync to server
- [ ] All stats include correct `league_id`

**Pass Criteria:** Offline mode works with league context

---

## Test Category 6: Cross-League Prevention

**Goal:** Ensure scorekeepers cannot bypass league isolation through any method

### Test 6.1: Cookie Manipulation

**Test Setup:**
- Login to Alpha league
- Manually change `active_league_id` cookie to Beta league ID

**Steps:**
1. Login to Alpha league
2. Open DevTools -> Application -> Cookies
3. Change `active_league_id` value to Beta league UUID
4. Refresh page
5. Attempt to access scorekeeper dashboard

**Expected Results:**
- [ ] System detects invalid league access
- [ ] User redirected or shown error
- [ ] No Beta league data accessible
- [ ] Server-side validation catches mismatch

**Pass Criteria:** Cookie manipulation fails securely

---

### Test 6.2: API Endpoint Testing

**Test Setup:**
- Use Postman or curl to test API endpoints directly

**Test Commands:**
```bash
# Attempt to get Beta game from Alpha context
curl -X GET 'http://alpha.beerleaguehockey.local:3000/api/games/<beta-game-id>' \
  -H 'Cookie: active_league_id=<alpha-uuid>' \
  -H 'Authorization: Bearer <token>'

# Expected: 403 Forbidden or empty result
```

**Expected Results:**
- [ ] API rejects cross-league requests
- [ ] Headers enforced at API level
- [ ] No data leakage through API

**Pass Criteria:** API endpoints enforce league context

---

### Test 6.3: SQL Injection Attempt

**Test Setup:**
- Attempt SQL injection in league_id parameter

**Test Input:**
```javascript
// Try to inject SQL via league context
const maliciousLeagueId = "'; DROP TABLE teams; --";
// System should sanitize and reject
```

**Expected Results:**
- [ ] Input sanitized
- [ ] No SQL injection possible
- [ ] Parameterized queries used
- [ ] Error logged, attack blocked

**Pass Criteria:** SQL injection prevented

---

### Test 6.4: Subdomain Spoofing

**Test Setup:**
- Attempt to spoof subdomain in request headers

**Test Command:**
```bash
curl -X GET 'http://localhost:3000/' \
  -H 'Host: beta.beerleaguehockey.local:3000' \
  -H 'X-Forwarded-Host: alpha.beerleaguehockey.local:3000'

# System should use actual Host header, not X-Forwarded-Host
```

**Expected Results:**
- [ ] Middleware uses actual Host header
- [ ] Spoofed headers ignored
- [ ] Correct league context set

**Pass Criteria:** Header spoofing fails

---

## Test Category 7: Performance Testing

**Goal:** Ensure multi-instance architecture doesn't degrade performance

### Test 7.1: Middleware Latency

**Test Setup:**
- Use browser DevTools Network tab or curl timing

**Test Command:**
```bash
# Measure middleware execution time
time curl -w "@curl-format.txt" -o /dev/null -s 'http://pilot.beerleaguehockey.local:3000/'

# Create curl-format.txt:
# time_total: %{time_total}s\n
```

**Repeat:** 100 times and calculate average

**Expected Results:**
- [ ] Average latency < 10ms
- [ ] P95 latency < 20ms
- [ ] No timeout errors
- [ ] Consistent performance

**Pass Criteria:** Middleware adds < 10ms average latency

---

### Test 7.2: League Lookup Performance

**Test Setup:**
- Measure `getLeagueFromHostname()` execution time

**Test Code:**
```javascript
// In server component or API route
console.time('league-lookup');
const league = await getLeagueFromHostname();
console.timeEnd('league-lookup');
```

**Expected Results:**
- [ ] First request (uncached): < 50ms
- [ ] Subsequent requests (cached): < 5ms
- [ ] No database connection issues
- [ ] React cache() working correctly

**Pass Criteria:** League lookup meets performance targets

---

### Test 7.3: N+1 Query Detection

**Test Setup:**
- Enable Supabase query logging
- Load a page with multiple items (e.g., teams, games)

**Steps:**
1. Open scorekeeper dashboard
2. Check Supabase logs for query count
3. Identify N+1 patterns

**Expected Results:**
- [ ] Single query for league branding
- [ ] Single query for assignments (with joins)
- [ ] NO separate query per assignment item
- [ ] Total queries < 5 per page load

**Pass Criteria:** No N+1 queries detected

---

### Test 7.4: Bundle Size Impact

**Test Command:**
```bash
# Before multi-instance (baseline)
npm run build
# Note .next/static sizes

# After multi-instance
npm run build
# Compare sizes
```

**Expected Results:**
- [ ] Total bundle size increase < 5%
- [ ] No large new dependencies added
- [ ] Code splitting works correctly
- [ ] Minimal impact on client-side bundle

**Pass Criteria:** Bundle size increase < 5%

---

## Test Category 8: Branding Verification

**Goal:** Verify dynamic branding works correctly in all contexts

### Test 8.1: CSS Variables

**Test Setup:**
- Visit league instance
- Inspect CSS variables

**Test Code:**
```javascript
// In browser console
const root = document.documentElement;
const primaryColor = getComputedStyle(root).getPropertyValue('--league-primary-color');
const secondaryColor = getComputedStyle(root).getPropertyValue('--league-secondary-color');
const accentColor = getComputedStyle(root).getPropertyValue('--league-accent-color');
const fontFamily = getComputedStyle(root).getPropertyValue('--league-font-family');

console.log({
  primaryColor,
  secondaryColor,
  accentColor,
  fontFamily
});
```

**Expected Results:**
- [ ] CSS variables set on `:root`
- [ ] Values match league configuration
- [ ] Variables apply to all components
- [ ] Fonts load correctly

**Pass Criteria:** CSS variables correctly applied

---

### Test 8.2: Component Branding

**Test Setup:**
- Inspect various UI components

**Components to Check:**
- Buttons
- Cards
- Headers
- Badges
- Links (hover state)

**Expected Results:**
- [ ] All components use CSS variables
- [ ] No hardcoded colors visible
- [ ] Hover states use league colors
- [ ] Consistent branding across all components

**Pass Criteria:** All components respect league branding

---

### Test 8.3: Logo and Images

**Test Setup:**
- Check league logo, banner, favicon

**URLs to Test:**
- Logo: Check header and footer
- Banner: Check hero sections
- Favicon: Check browser tab icon

**Expected Results:**
- [ ] Correct logo displayed for each league
- [ ] Images load without 404 errors
- [ ] Favicon shows league icon
- [ ] Images respect branding guidelines

**Pass Criteria:** All images load correctly

---

### Test 8.4: Custom CSS Injection

**Test Setup:**
- Add custom CSS to league branding
- Verify it applies correctly

**Test CSS:**
```css
.scorekeeper-dashboard {
  background: linear-gradient(135deg, var(--league-primary-color), var(--league-secondary-color));
}
```

**Expected Results:**
- [ ] Custom CSS injected into page
- [ ] CSS applied correctly
- [ ] No CSP violations
- [ ] CSS sanitized for security

**Pass Criteria:** Custom CSS works safely

---

## Pass/Fail Criteria

### Critical Tests (Must Pass)

All tests in these categories MUST pass:
- Test Category 4: Data Isolation (ALL tests)
- Test Category 6: Cross-League Prevention (ALL tests)
- Test 5.1: Basic Stat Entry
- Test 7.3: N+1 Query Detection

**Failure in any critical test requires immediate remediation before production deployment.**

### High Priority Tests (Should Pass)

These tests should pass, but minor issues may be acceptable with documented workarounds:
- Test Category 2: Pilot League Subdomain
- Test Category 5: Scorekeeper Live Entry
- Test Category 7: Performance Testing (except 7.3)

### Medium Priority Tests (Nice to Have)

These tests improve user experience but aren't blockers:
- Test Category 8: Branding Verification
- Test 5.2: Real-Time Updates (< 1 second target can be relaxed to < 3 seconds)

### Overall Pass Criteria

**PASS Requirements:**
- 100% of Critical Tests passing
- 90% of High Priority Tests passing
- 75% of Medium Priority Tests passing
- Zero data leakage issues
- Zero security vulnerabilities

**CONDITIONAL PASS Requirements:**
- 100% of Critical Tests passing
- 80% of High Priority Tests passing
- Issues documented with remediation plan
- Timeline for fixes established

**FAIL Criteria:**
- ANY Critical Test failing
- < 80% of High Priority Tests passing
- Any data leakage detected
- Any security vulnerability found

---

## Test Execution Log

Use this template to record test execution:

```markdown
### Test Execution: [Test ID]

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** Development / Staging / Production

**Result:** PASS / FAIL

**Observations:**
- [What happened during test]

**Issues Found:**
- [List any issues]

**Screenshots:**
- [Attach if relevant]

**Next Steps:**
- [What to do if test failed]
```

---

## Automation Recommendations

### Tests to Automate

1. **Database RLS Tests** - Run via SQL scripts in CI/CD
2. **API Endpoint Tests** - Use Jest + Supertest
3. **Performance Tests** - Use Lighthouse CI
4. **Bundle Size Tests** - Use bundlesize package

### Example Automation Script

```javascript
// tests/multi-instance.test.ts
describe('Multi-Instance Data Isolation', () => {
  it('should prevent cross-league data access', async () => {
    const alphaContext = { leagueId: 'alpha-uuid', userId: 'user-uuid' };
    const betaGameId = 'beta-game-uuid';

    const response = await getGame(betaGameId, alphaContext);

    expect(response.error).toBeTruthy();
    expect(response.data).toBeNull();
  });
});
```

---

## Troubleshooting Guide

### Common Issues

#### Issue: Hosts file not working

**Windows:**
```cmd
ipconfig /flushdns
```

**Mac:**
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux:**
```bash
sudo systemd-resolve --flush-caches
```

#### Issue: League context not set

Check:
1. Middleware is running
2. Headers are being set
3. Cookie is being set (check DevTools -> Application -> Cookies)
4. Database has league with matching hostname

#### Issue: Branding not applying

Check:
1. CSS variables set on `:root`
2. League branding data exists in database
3. `LeagueThemeProvider` is wrapping the app
4. No CSS specificity issues overriding variables

---

## Conclusion

This test suite provides comprehensive coverage of the multi-instance architecture with emphasis on:

1. **Data Isolation** - Ensuring leagues cannot access each other's data
2. **Security** - Preventing cross-league attacks and data leakage
3. **Performance** - Verifying acceptable performance overhead
4. **Branding** - Confirming dynamic branding works correctly
5. **Scorekeeper Features** - Testing all scorekeeper functionality in multi-instance context

**Status:** Ready for execution

**Next Steps:**
1. Execute all tests and document results
2. Fix any failing tests
3. Automate critical tests in CI/CD
4. Schedule regular regression testing

---

**Document Author:** Agent 4 - Testing & Integration Specialist
**Date:** January 26, 2026
**Version:** 1.0
