# HockeyLifeHL Orchestration Report
## Full Codebase Review - 5 Agent Analysis

**Generated:** 2026-02-02
**Goal:** Enable full end-to-end testing of signup, league setup, teams, players, scorekeeping, and schedules

---

## Executive Summary

| Area | Status | Blocking Issues |
|------|--------|-----------------|
| **Build** | PASS | None |
| **Type Check** | FAIL | 7 Stripe SDK errors |
| **Auth/Signup** | WORKING | Minor issues |
| **League Setup** | PARTIALLY WORKING | Teams not linked to seasons |
| **Teams/Players** | WORKING | Type casting issues |
| **Scorekeeper** | WORKING | QR scanner TODO |
| **Schedule Generator** | WORKING | None |

**Overall Assessment:** The application CAN run locally but has **3 critical bugs** that would break the full testing flow.

---

## CRITICAL FIXES (Must Fix Before Testing)

### 1. Stripe SDK Version Mismatch (Blocks Type Check)
**Files:**
- `apps/league-builder/src/lib/stripe/client.ts:26`
- `apps/league-builder/src/lib/stripe/client.ts:121`
- `apps/league-builder/src/scripts/reconcile-subscriptions.ts:141,172,175`

**Problem:** Stripe SDK v20.3.0 expects API version `'2026-01-28.clover'` but code has `'2025-01-27.acacia'`

**Fix:**
```typescript
// client.ts:26 - Change API version
apiVersion: '2026-01-28.clover',

// client.ts:121 - Change error type
export function isStripeError(error: unknown): error is Stripe.StripeRawError {
```

---

### 2. Teams Not Linked to Seasons (Breaks League Setup)
**File:** `apps/league-builder/src/lib/actions/league-wizard.ts:481-500`

**Problem:** When wizard creates teams, they're linked to `league_id` but NOT to `season_id`. The `season_teams` table is never populated.

**Fix:** After team creation, insert into `season_teams`:
```typescript
// After line 500, add:
if (teamIds.length > 0) {
  const seasonTeamInserts = teamIds.map(teamId => ({
    season_id: season.id,
    team_id: teamId,
  }));

  await serviceSupabase.from('season_teams').insert(seasonTeamInserts);
}
```

---

### 3. dev:website Script Wrong Package Name
**File:** `package.json` (root)

**Problem:** Script references `@hockey-life/league-website` instead of `@hockey-life/league-sites`

**Fix:**
```json
"dev:website": "turbo dev --filter=@hockey-life/league-sites"
```

---

## HIGH PRIORITY FIXES

### 4. Remove @ts-nocheck Directives
**Files:**
- `apps/league-builder/src/lib/schemas/league-wizard.ts:1`
- `apps/league-builder/src/lib/hooks/use-wizard-form.ts:1`

**Problem:** These hide TypeScript errors completely

---

### 5. Dashboard Shows Hardcoded 0 for Active Seasons
**File:** `apps/league-builder/src/app/dashboard/page.tsx:83-87`

**Fix:** Query actual active season count from database

---

### 6. Draft Cleanup Deletes ALL User's Drafts
**File:** `apps/league-builder/src/lib/actions/league-wizard.ts:503-507`

**Problem:** Deletes ALL draft leagues for user, not just current one

**Fix:** Store draft ID and delete only that specific draft

---

### 7. Season Status Set to 'draft' Instead of 'active'
**File:** `apps/league-builder/src/lib/actions/league-wizard.ts:468`

**Fix:** Change `status: 'draft'` to `status: 'active'` or add UI option

---

## MEDIUM PRIORITY FIXES

### 8. Generate TypeScript Types for Database
- Run Supabase type generation to fix `as any` casts
- Affects: auth.ts, password-reset.ts, teams.ts, roster.ts, league-wizard.ts

### 9. Limited Timezone Support
**File:** `apps/league-builder/src/components/league-wizard/step-1-league-info.tsx:21-29`
- Only 7 US timezones, missing Canadian/international

### 10. Scorekeeper Hardcoded UUID
**File:** `apps/league-builder/src/lib/actions/scorekeeper.ts:491-492,562-563,622-623,654-655`
- Uses `'00000000-0000-0000-0000-000000000000'` as placeholder

### 11. Dashboard Route Duplication
- Both `/dashboard` and `/[locale]/dashboard` exist
- Decide which to keep

---

## MISSING FEATURES (For Full Testing)

| Feature | Status | Location |
|---------|--------|----------|
| QR Scanner for Scorekeeper | TODO | `scorekeeper/page.tsx:229` |
| Logo Upload UI | Missing | `step-1-league-info.tsx` |
| Division Support in Wizard | Missing | `step-3-teams.tsx` |
| Shootout Tracking | Missing | Scorekeeper |
| OAuth/Social Login | Not Implemented | Auth |
| Email Verification | Disabled (by design) | Auth |

---

## MOCK DATA STATUS

### Existing Scripts:
| Script | Location | Creates |
|--------|----------|---------|
| `generate-test-data.ts` | `scripts/` | 1 season, 4 teams, 16 players, 6 games |
| `create-test-players.ts` | `scripts/` | 91 players (7 teams x 13) |
| `create-test-leagues.ts` | `scripts/` | 3 leagues (Alpha, Beta, Gamma) |
| `test-data-actions.ts` | `src/lib/admin/` | Full mid-season state with stats |

### E2E Fixtures:
- `e2e/fixtures/test-data.ts` - TestDataSeeder, TEST_USERS, STRIPE_TEST_CARDS

### Missing:
- Unified `supabase/seed.sql` for `supabase db reset`
- Test registrations for approval flow
- Test waiver templates

---

## ENVIRONMENT SETUP

### Required Variables for `league-builder`:
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=
STRIPE_WEBHOOK_SECRET_CONNECT=
STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET=
```

### Required Variables for `league-sites`:
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

---

## RECOMMENDED FIX ORDER

### Phase 1: Unblock Development (Do First)
1. Fix Stripe API version mismatch
2. Fix dev:website script
3. Fix teams-to-seasons linking

### Phase 2: Core Functionality
4. Remove @ts-nocheck directives
5. Fix dashboard active seasons count
6. Fix draft cleanup logic
7. Set season status to active

### Phase 3: Polish & Testing
8. Generate TypeScript types
9. Add timezone support
10. Create unified seed.sql
11. Add missing test data

### Phase 4: Nice-to-Have
12. Implement QR scanner
13. Add logo upload
14. Add division support
15. Add OAuth providers

---

## VERIFICATION COMMANDS

After fixes, run:
```bash
# 1. Type check (should pass)
pnpm type-check

# 2. Build (should pass)
pnpm build

# 3. Start dev servers
pnpm dev:builder  # Port 3000
pnpm dev:website  # Port 3001 (after fix)

# 4. Run lint (warnings ok, no errors)
pnpm lint
```

---

## END-TO-END TEST FLOW

Once fixes applied, test this flow:

1. **Signup** → `/signup` → Create account
2. **Dashboard** → Should show 0 leagues
3. **Create League** → `/dashboard/leagues/new` → Complete 4-step wizard
4. **Verify** → Teams appear in season, dashboard shows 1 active season
5. **Add Players** → Via registration or admin add
6. **Generate Schedule** → `/dashboard/seasons/[id]/schedule`
7. **Test Scorekeeper** → `/scorekeeper` → Enter game scores
8. **View Stats** → Verify stats calculated correctly
