# UX Audit Findings - HockeyLifeHL

## Audit Date: 2026-02-05
## Test Data: Test Hockey League (6 teams, 62 players, 36 games)

---

## Critical Issues (Blocking)

None identified - all core flows are functional.

---

## High Priority Issues (Poor UX)

### 1. Dashboard Stats Cards Mismatch
**Location:** `apps/league-builder/src/app/[locale]/dashboard/page.tsx:58-97`

**Issue:** Stats cards display incorrect labels/values:
- "totalTeams" label shows `total_organizations` value
- Second card uses `navigation.teams` translation but shows `total_leagues` count
- Third card uses `navigation.teams` again but shows `total_teams`
- "gamesPlayed" is hardcoded to 0 instead of actual game count

**Expected:** Each card should have a unique label matching its value:
- Organizations count → "Organizations"
- Leagues count → "Leagues"
- Teams count → "Teams"
- Games played → actual count from data

**Fix:** Update stats cards to use correct translations and values.

### 2. Icon/Label Confusion in LeagueCard
**Location:** `apps/league-builder/src/app/[locale]/dashboard/page.tsx:374-382`

**Issue:** Calendar icon is used for "Players" count:
```tsx
<span className="flex items-center gap-1">
  <Calendar className="w-4 h-4" />
  {t('teams.players', { count: league.player_count })}
</span>
```

**Expected:** Users icon for players, Calendar icon for games/schedule.

**Fix:** Use `<Users />` icon for player counts.

### 3. Scorekeeper QR Scanner Not Implemented
**Location:** `apps/league-builder/src/app/[locale]/scorekeeper/page.tsx:228-238`

**Issue:** QR Scanner button shows `alert('QR Scanner coming soon!')` when clicked.

**Expected:** Either implement QR scanning or hide the button until ready.

**Recommendation:** This is a valuable feature - implement using device camera or hide for MVP.

---

## Medium Priority Issues (UX Improvements)

### 4. Type Safety Issue in Dashboard
**Location:** `apps/league-builder/src/app/[locale]/dashboard/page.tsx:50`

**Issue:** Using `(profile as any)?.full_name` type cast.

**Expected:** Proper type definition for profile object.

**Fix:** Define proper interface for profile or use generated Supabase types.

### 5. Inconsistent Link Imports
**Location:** Multiple dashboard pages

**Issue:** Some pages use `Link` from `next/link`, others use `Link` from `@/i18n/navigation`.

**Examples:**
- `leagues/[id]/page.tsx` uses `next/link`
- `leagues/page.tsx` uses `@/i18n/navigation`

**Expected:** Consistent usage of i18n-aware Link for locale-prefixed URLs.

**Fix:** Standardize on `@/i18n/navigation` for dashboard pages.

### 6. League Settings "Coming Soon" Items
**Location:** `apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/settings/page.tsx:107-113`

**Issue:** "Danger Zone" is marked as unavailable with "Coming Soon" badge.

**Expected:** Either implement or remove from settings list to avoid confusion.

### 7. No Team Captains Assigned
**Location:** Database test data

**Issue:** No captains are assigned in `team_rosters.leadership_role` or `team_staff` table.

**Impact:** Captain dashboard cannot be fully tested.

**Recommendation:** Add seed data for captain role testing.

---

## Low Priority Issues (Nice-to-have)

### 8. Branding Preview is Static
**Location:** `apps/league-builder/src/components/dashboard/settings/branding-settings-client.tsx`

**Issue:** Brand preview shows sample color swatches, not actual website preview.

**Expected:** Live preview of public website with applied colors.

**Recommendation:** This is the core of the Website Editor feature - implement iframe preview.

### 9. Missing Breadcrumb Navigation
**Location:** Deep dashboard pages

**Issue:** Only "Back to X" link is available, no full breadcrumb trail.

**Expected:** Full breadcrumb for complex nested pages:
`Dashboard > Leagues > GFHL > Teams > Ice Hawks`

### 10. Empty State Messaging Could Be More Helpful
**Location:** Various pages

**Issue:** Empty states show generic "No X Yet" messages.

**Expected:** More contextual empty states with guided next steps.

---

## Summary by Priority

| Priority | Count | Action |
|----------|-------|--------|
| Critical | 0 | None |
| High | 3 | Fix before next release |
| Medium | 4 | Fix in upcoming sprint |
| Low | 3 | Add to backlog |

---

## Recommended Fixes (In Order)

1. **Dashboard stats cards** - Quick fix, high visibility
2. **Icon/label mismatch** - Quick fix, improves clarity
3. **QR Scanner** - Either implement or hide
4. **Link imports** - Standardize for i18n consistency
5. **Type safety** - Use generated types
6. **Website Editor** - Major feature (separate implementation)

---

## Test Personas Verified

- [x] **League Owner** (organizer@test.com) - Admin dashboard functional
- [x] **Captain** (captain@test.com) - Dashboard accessible (no team assigned)
- [x] **Scorekeeper** (scorekeeper@test.com) - Token entry + game interface working
- [x] **Player** (player@test.com) - Basic viewing functional
- [x] **Public Visitor** - League sites pages working
