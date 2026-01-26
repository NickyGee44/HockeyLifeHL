# Agent 2: League-Aware Update Pattern

**Status:** CRITICAL PATH - In Progress
**Date:** January 25, 2026
**Progress:** 25% Complete (3/12 files updated)

## ✅ Files Completed

### 1. `src/lib/teams/actions.ts` - 100% Complete
- ✅ All 9 functions updated with league_id filters
- ✅ Uses `requireLeagueRole()` for auth
- ✅ All queries filter by `league_id`
- ✅ Try/catch blocks added

### 2. `src/lib/games/actions.ts` - 100% Complete
- ✅ All 9 functions updated with league_id filters
- ✅ Uses `requireLeagueRole()` for auth
- ✅ All queries filter by `league_id`
- ✅ Try/catch blocks added

### 3. `src/lib/seasons/actions.ts` - 30% Complete
- ✅ getAllSeasons, getActiveSeason, getSeasonById updated
- ✅ createSeason updated
- ⏸️ Remaining: updateSeason, updateSeasonStatus, deleteSeason, endSeason, archiveSeason, etc.

## 📋 Standard Update Pattern

For every action file, follow this pattern:

### Step 1: Update Imports
```typescript
// OLD:
import { createClient } from "@/lib/supabase/server";

// NEW:
import { createClient } from "@/lib/supabase/server";
import { requireLeagueRole, getActiveLeagueId } from "@/lib/auth/league-context";
```

### Step 2: Remove Old Auth Functions
```typescript
// DELETE these old functions:
async function requireOwner() { ... }
async function requireAdmin() { ... }
```

### Step 3: Update Each Function

**For READ operations (any role can view):**
```typescript
export async function getSomething(id: string) {
  try {
    // Require league membership (any role)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("table_name")
      .select("*")
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error:", error);
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    console.error("Error in function:", error);
    return { error: error.message || 'Unauthorized' };
  }
}
```

**For CREATE operations (owner/admin only):**
```typescript
export async function createSomething(formData: FormData) {
  try {
    // Require owner or admin role
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("table_name")
      .insert({
        league_id: leagueId, // CRITICAL: Associate with league
        // ... other fields
      })
      .select()
      .single();

    if (error) {
      console.error("Error:", error);
      return { error: error.message };
    }

    revalidatePath("/relevant/path");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error in function:", error);
    return { error: error.message || 'Unauthorized or failed to create' };
  }
}
```

**For UPDATE operations (owner/admin only):**
```typescript
export async function updateSomething(id: string, updates: any) {
  try {
    // Require owner or admin role
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("table_name")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq('league_id', leagueId) // CRITICAL: Only update in this league
      .select()
      .single();

    if (error) {
      console.error("Error:", error);
      return { error: error.message };
    }

    revalidatePath("/relevant/path");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error in function:", error);
    return { error: error.message || 'Unauthorized or failed to update' };
  }
}
```

**For DELETE operations (owner/admin only):**
```typescript
export async function deleteSomething(id: string) {
  try {
    // Require owner or admin role
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    const { error } = await supabase
      .from("table_name")
      .delete()
      .eq("id", id)
      .eq('league_id', leagueId); // CRITICAL: Only delete in this league

    if (error) {
      console.error("Error:", error);
      return { error: error.message };
    }

    revalidatePath("/relevant/path");
    return { success: true };
  } catch (error: any) {
    console.error("Error in function:", error);
    return { error: error.message || 'Unauthorized or failed to delete' };
  }
}
```

### Step 4: Check for Related Queries

If function queries related tables, add `league_id` filters there too:

```typescript
// Check active seasons
const { data: activeSeasons } = await supabase
  .from("seasons")
  .select("id, name")
  .eq('league_id', leagueId) // ADD THIS
  .in("status", ["active", "playoffs"]);
```

## 🔥 Priority Files Remaining

### High Priority (Core Features):
1. ⏸️ **`src/lib/seasons/actions.ts`** - 30% done, finish remaining 10 functions
2. ⏸️ **`src/lib/payments/actions.ts`** - Critical for multi-league billing
3. ⏸️ **`src/lib/draft/actions.ts`** - League-specific drafts
4. ⏸️ **`src/lib/stats/actions.ts`** - Player/team stat isolation

### Medium Priority (Admin Functions):
5. ⏸️ **`src/lib/admin/actions.ts`** - General admin functions
6. ⏸️ **`src/lib/admin/approval-actions.ts`** - Player approvals
7. ⏸️ **`src/lib/admin/stats-actions.ts`** - Stats management
8. ⏸️ **`src/lib/admin/trade-actions.ts`** - Trade management
9. ⏸️ **`src/lib/admin/suspension-actions.ts`** - Suspensions

### Lower Priority (Helper Functions):
10. ⏸️ **`src/lib/players/availability-actions.ts`**
11. ⏸️ **`src/lib/teams/roster-actions.ts`**
12. ⏸️ **`src/lib/teams/invite-actions.ts`**
13. ⏸️ **`src/lib/email/actions.ts`** - Email system

## ⚠️ Special Cases

### Captain-Specific Actions
For actions that can be done by team captains (not just admins):
```typescript
const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain']);
```

### Scorekeeper-Specific Actions
Already handled in `src/lib/scorekeepers/actions.ts` ✅

### Public Read-Only Actions
Some actions might not need authentication (public schedule, standings):
- Still filter by `league_id` if league is known from context
- Use `getActiveLeagueId()` from cookie/session

## 🧪 Testing Checklist

After updating each file, verify:
- [ ] No queries without `league_id` filter
- [ ] All `requireOwner()` replaced with `requireLeagueRole()`
- [ ] Try/catch blocks wrap all functions
- [ ] Imports include `requireLeagueRole` and `getActiveLeagueId`
- [ ] Revalidation paths updated
- [ ] Error messages user-friendly

## 📊 Progress Tracking

| File | Functions | Status | % Complete |
|------|-----------|--------|------------|
| teams/actions.ts | 9 | ✅ Complete | 100% |
| games/actions.ts | 9 | ✅ Complete | 100% |
| seasons/actions.ts | 13 | ⏸️ Partial | 30% |
| payments/actions.ts | ~8 | ⏸️ Not Started | 0% |
| draft/actions.ts | ~10 | ⏸️ Not Started | 0% |
| stats/actions.ts | ~6 | ⏸️ Not Started | 0% |
| admin/actions.ts | ~8 | ⏸️ Not Started | 0% |
| admin/* (7 files) | ~30 | ⏸️ Not Started | 0% |
| players/* (1 file) | ~5 | ⏸️ Not Started | 0% |
| teams/* (3 files) | ~15 | ⏸️ Not Started | 0% |
| email/actions.ts | ~5 | ⏸️ Not Started | 0% |

**Total Progress: ~25% (3 of 12 priority files complete)**

## 🚀 Next Steps

1. **Finish `src/lib/seasons/actions.ts`** (10 functions remaining)
2. **Update `src/lib/payments/actions.ts`** (critical for billing)
3. **Update `src/lib/draft/actions.ts`** (league-specific drafts)
4. **Update `src/lib/stats/actions.ts`** (stat isolation)
5. **Batch update all admin files** (8 files, similar patterns)
6. **Update remaining helper files**

## 💡 Tips for Fast Updates

1. **Search & Replace** old patterns:
   - Find: `const auth = await requireOwner();`
   - Replace: `const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);`

2. **Add league_id filters** to all queries:
   - Find: `.eq("id", id)`
   - Add after: `.eq('league_id', leagueId)`

3. **Wrap functions** in try/catch:
   - Start: `try {`
   - Before return: `} catch (error: any) { ... }`

4. **Use multi-cursor editing** in VS Code for repetitive changes

---

**Estimated Remaining Time:** 8-12 hours for all files
**Critical Path:** This work blocks Agent 3 (UI) from integrating backend

**Status:** 🟡 In Progress - Continue with high priority files
