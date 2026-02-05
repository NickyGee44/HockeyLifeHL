# League Sites - Comprehensive Issues Report

## Testing Summary
Tested from perspectives of: Player, Team Captain, and League Owner

---

## CRITICAL ISSUES (Will Break in Production)

### 1. Database Schema Mismatches

#### 1.1 profiles Table - Wrong Column Names
**Problem:** Our code uses `first_name` and `last_name` but the actual table has `full_name`

| Our Code Uses | Actual Column |
|---------------|---------------|
| `first_name` | `full_name` (single field) |
| `last_name` | `full_name` (single field) |

**Files Affected:**
- `apps/league-sites/src/hooks/usePlayerProfile.ts:69`
- `apps/league-sites/src/components/dashboard/*.tsx`
- `apps/league-sites/src/app/[leagueSlug]/me/page.tsx`
- `apps/league-sites/src/app/[leagueSlug]/me/profile/page.tsx`
- `apps/league-sites/src/app/[leagueSlug]/captain/page.tsx`
- `apps/league-sites/src/components/players/PlayerGrid.tsx`

**Fix Required:** Parse `full_name` into first/last or update UI to use single name field.

---

#### 1.2 team_rosters Table - Wrong Column Names
**Problem:** Our code uses wrong column names for linking and captain detection

| Our Code Uses | Actual Column |
|---------------|---------------|
| `profile_id` | `player_id` |
| `is_captain` (boolean) | `leadership_role` (enum) |
| `is_alternate` (boolean) | `leadership_role` (enum) |

**Leadership Role Enum Values:**
- `captain`
- `alternate_captain`

**Files Affected:**
- `apps/league-sites/src/hooks/usePlayerProfile.ts:91`
- `apps/league-sites/src/app/[leagueSlug]/captain/page.tsx`
- `apps/league-sites/src/components/auth/UserMenu.tsx`
- `apps/league-sites/src/components/dashboard/QuickActions.tsx`
- `apps/league-sites/src/components/dashboard/MyTeamCard.tsx`

**Fix Required:**
```typescript
// Change from:
.eq('profile_id', user.id)
// To:
.eq('player_id', user.id)

// Change from:
is_captain: item.is_captain,
is_alternate: item.is_alternate,
// To:
is_captain: item.leadership_role === 'captain',
is_alternate: item.leadership_role === 'alternate_captain',
```

---

#### 1.3 Table Name Mismatches (Waivers & Payments)
**Problem:** Our code queries non-existent table names

| Our Code Uses | Actual Table Name |
|---------------|-------------------|
| `waivers` | `league_waiver_templates` |
| `waiver_signatures` | `player_waivers` |
| `registrations` | `registration_submissions` |

**Files Affected:**
- `apps/league-sites/src/app/[leagueSlug]/me/waivers/page.tsx`
- `apps/league-sites/src/app/[leagueSlug]/me/payments/page.tsx`

**Fix Required:** Update all table references to use correct names and column structures.

---

### 2. RPC Function Mismatches

#### 2.1 Wrong Function Names
| Our Code Calls | Actual Function |
|----------------|-----------------|
| `get_league_standings` | `get_team_standings` |
| `get_player_career_stats` | `get_player_season_stats` |
| `get_goalie_leaders` | `get_goalie_season_stats` |

#### 2.2 Wrong Parameter Names
| Our Code Uses | Actual Parameter |
|---------------|------------------|
| `p_league_id` | `check_league_id` |
| `p_season_id` | `check_season_id` |
| `p_player_id` | (not supported) |

**Note:** `get_player_season_stats` returns league-wide stats, NOT per-player stats!

**Files Affected:**
- `apps/league-sites/src/lib/data.ts` - Multiple functions
- `apps/league-sites/src/components/dashboard/MyTeamCard.tsx`
- `apps/league-sites/src/components/dashboard/MyStats.tsx`

---

### 3. Missing RPC Functions
These functions don't exist and need to be created or queries rewritten:
- `get_player_career_stats(player_id)` - Per-player stats
- `get_player_game_log(player_id)` - Player game-by-game log

---

## HIGH PRIORITY ISSUES

### 4. Profile Photo Upload Not Implemented
**Location:** `apps/league-sites/src/app/[leagueSlug]/me/profile/page.tsx`
**Problem:** "Change Photo" button exists but has no onClick handler or upload logic
**Fix Required:** Implement Supabase storage upload to `player-photos` bucket

---

### 5. Payments API Endpoint Missing
**Location:** `apps/league-sites/src/app/[leagueSlug]/me/payments/page.tsx`
**Problem:** Calls `/api/payments/create-checkout` which doesn't exist
**Fix Required:** Create API route or use existing Stripe Connect flow from league-builder

---

### 6. Auth Redirect After Login
**Location:** `apps/league-sites/src/components/auth/AuthProvider.tsx:49`
**Problem:** Uses `window.location.reload()` instead of proper redirect to `/me`
**Fix Required:** Use `router.push` to redirect to dashboard after login

---

## MEDIUM PRIORITY ISSUES

### 7. Missing Error Boundaries
**Problem:** No error boundaries around data-fetching components
**Files Affected:** All dashboard components, captain page, waivers page

### 8. No Offline/Empty State Handling
**Problem:** Some components show broken UI when data is missing
**Example:** MyStats shows nothing if RPC fails

### 9. Jersey Number Type Mismatch
**Problem:** Database has `jersey_number` as INTEGER but some code expects STRING
**Files Affected:** Multiple player display components

### 10. Mobile Menu Auth Button Missing
**Location:** `apps/league-sites/src/components/LeagueHeader.tsx`
**Problem:** Mobile navigation menu doesn't include auth button
**Fix Required:** Add AuthButton to mobile menu

---

## MINOR ISSUES

### 11. Inconsistent Date Formatting
**Problem:** Some dates use `toLocaleDateString`, others use custom formatting

### 12. Missing Loading Skeletons
**Problem:** Some pages show spinner, others show nothing during load

### 13. Console Errors Expected
**Problem:** Failed RPC calls will log errors to console (not user-facing but noisy)

---

## SECURITY CONCERNS

### 14. Captain Contact Info Exposure
**Location:** `apps/league-sites/src/app/[leagueSlug]/captain/page.tsx`
**Status:** OK - RLS policies protect data, only captains can view team emails
**Note:** Verify RLS policy `captain_can_view_roster_contact` exists

### 15. Waiver IP/User-Agent Collection
**Location:** `apps/league-sites/src/app/[leagueSlug]/me/waivers/page.tsx`
**Problem:** Code doesn't collect IP/user-agent but database expects it
**Fix Required:** Collect via server action, not client-side

---

## INTEGRATION GAPS (League Builder ↔ League Sites)

### 16. Waiver Content Not Flowing
**Problem:** Waivers created in league-builder use `league_waiver_templates` but league-sites queries wrong table

### 17. Payment Flow Disconnect
**Problem:** League-builder has Stripe Connect setup but league-sites doesn't use same payment flow

### 18. Registration System Mismatch
**Problem:** League-builder uses `registration_submissions` with complex workflow but league-sites expects simpler `registrations` table

---

## RECOMMENDED FIX ORDER

1. **IMMEDIATE (Blocks all testing):**
   - Fix `profile_id` → `player_id` in usePlayerProfile.ts
   - Fix `first_name/last_name` → `full_name` parsing
   - Fix `is_captain/is_alternate` → `leadership_role` enum check

2. **HIGH (Blocks feature testing):**
   - Fix RPC function names and parameters in data.ts
   - Fix table names in waivers and payments pages
   - Implement profile photo upload

3. **MEDIUM (Polish before launch):**
   - Add error boundaries
   - Fix auth redirect after login
   - Add mobile auth button

4. **LOW (Nice to have):**
   - Consistent date formatting
   - Loading skeletons
   - Console error cleanup

---

## FILES REQUIRING CHANGES

| File | Priority | Changes Needed |
|------|----------|----------------|
| `hooks/usePlayerProfile.ts` | CRITICAL | player_id, leadership_role, full_name |
| `lib/data.ts` | CRITICAL | RPC function names and params |
| `me/waivers/page.tsx` | CRITICAL | Table names, column structure |
| `me/payments/page.tsx` | CRITICAL | Table names, API endpoint |
| `captain/page.tsx` | CRITICAL | Column names, leadership_role |
| `auth/UserMenu.tsx` | HIGH | leadership_role check |
| `dashboard/QuickActions.tsx` | HIGH | leadership_role check |
| `dashboard/MyTeamCard.tsx` | HIGH | leadership_role check |
| `me/profile/page.tsx` | HIGH | Photo upload implementation |
| `auth/AuthProvider.tsx` | MEDIUM | Proper redirect after login |
| `LeagueHeader.tsx` | MEDIUM | Mobile auth button |

---

## ESTIMATED EFFORT

| Category | Count | Hours Est. |
|----------|-------|------------|
| Critical Schema Fixes | 5 | 4-6 hrs |
| RPC Function Fixes | 3 | 2-3 hrs |
| Feature Implementations | 2 | 3-4 hrs |
| Polish & Error Handling | 5 | 2-3 hrs |
| **Total** | **15** | **11-16 hrs** |
