# 🔧 Migration 7 Fix Instructions - UPDATED

**Issue:** You encountered a duplicate key constraint violation when running Migration 7.

**Error:** `duplicate key value violates unique constraint "unique_season_name_per_league"`

**Root Cause:** You have duplicate season/team names in your database. When the migration tries to assign them all to League #1, the unique constraint `UNIQUE(league_id, name)` prevents duplicates.

**Example:** You might have two seasons both named "2025 Winter Season" - one already migrated and one not yet migrated.

---

## ✅ Solution: Diagnostic First, Then FINAL FIX

I've created:
1. **Diagnostic script** to show you the duplicate data
2. **FINAL FIX migration** that automatically renames duplicates before updating

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project: `ntplczcmhvfkijjxavdl`
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

---

### Step 2: Run Diagnostic Script (OPTIONAL BUT RECOMMENDED)

**File:** `supabase/migrations/DIAGNOSE_DUPLICATES.sql`

This will show you exactly what duplicate data you have.

1. Open the file in VS Code
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **"Run"** (or Ctrl+Enter)

**What you'll see:**
- List of all seasons and their migration status
- Which season names are duplicated
- Specific "2025 Winter Season" records
- Similar checks for teams

This is just for information - you don't need to fix anything manually.

---

### Step 3: Run the FINAL FIX Migration 7

**File:** `supabase/migrations/20260125_migrate_existing_data_to_league_1_FINAL_FIX.sql`

This script will:
1. Check for duplicate names
2. Automatically rename duplicates (e.g., "2025 Winter Season" → "2025 Winter Season (2)")
3. Then update league_id for all records
4. Set NOT NULL constraints

**Instructions:**
1. Open the file in VS Code: `HockeyLifeHL/supabase/migrations/20260125_migrate_existing_data_to_league_1_FINAL_FIX.sql`
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **"Run"** (or Ctrl+Enter)

**Expected Output:**
```
✅ Created League #1: HockeyLifeHL (Original)
🔍 Checking for duplicate season names...
  ⚠️ Renamed duplicate season: "2025 Winter Season" → "2025 Winter Season (2)"
✅ Duplicate season names handled
🔍 Checking for duplicate team names...
✅ Duplicate team names handled
📝 Updating league_id for records with NULL league_id...
  ✅ Updated X teams
  ✅ Updated X seasons
  ✅ Updated X games
  ... (all 18 tables)
🔒 Setting league_id to NOT NULL on all tables...
  ✅ All columns set to NOT NULL
👤 Creating admin memberships for League #1...
  ✅ Created X admin memberships
✅ MIGRATION 7 COMPLETE (FINAL FIX)
```

---

### Step 4: Run Migration 8 (Helper Functions)

**File:** `supabase/migrations/20260125_create_league_helper_functions.sql`

1. Open the file in VS Code
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

**Expected Output:** `Success. No rows returned`

**What this does:**
- Creates 18 helper functions for league-aware queries
- Functions like: `get_league_teams()`, `get_player_season_stats()`, etc.

---

### Step 5: Run Quick Verification

**File:** `supabase/verification/00_quick_verification.sql`

1. Open the file in VS Code
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

**Expected Output:**
```
✅ TEST 1 PASS: League #1 exists
✅ TEST 2 PASS: 18 tables have league_id column
✅ TEST 3 PASS: All data migrated to League #1
✅ TEST 4 PASS: RLS enabled on 19 tables
✅ TEST 5 PASS: 40+ RLS policies exist
✅ TEST 6 PASS: 16+ foreign keys to leagues(id)
✅ TEST 7 PASS: 16+ tables have indexes on league_id
✅ TEST 8 PASS: All 3 scorekeeper tables exist
✅ TEST 9 PASS: All 18 helper functions exist
✅ TEST 10 PASS: X admin memberships exist for League #1
```

---

## 🎯 Success Criteria

If all tests show ✅, you're ready to proceed to Agent 2!

If any tests show ❌:
1. Copy the full error message
2. Note which test failed
3. We'll troubleshoot together

---

## 📊 What Changed in the FINAL FIX Version

### Problem: Duplicate Names

You had duplicate season/team names in your database:
- "2025 Winter Season" exists twice
- One already migrated (league_id set)
- One not yet migrated (league_id NULL)

When both try to get league_id = 'aaaaa...', the UNIQUE constraint fails.

### Solution: Automatic Renaming

The FINAL FIX script:

**Step 1: Find duplicates**
```sql
-- Find seasons with NULL league_id that would conflict
SELECT s1.id, s1.name
FROM seasons s1
WHERE s1.league_id IS NULL
  AND EXISTS (
    SELECT 1 FROM seasons s2
    WHERE s2.name = s1.name
      AND s2.league_id = legacy_league_id
  )
```

**Step 2: Rename duplicates**
```sql
-- Rename "2025 Winter Season" → "2025 Winter Season (2)"
UPDATE seasons
SET name = new_name
WHERE id = season_record.id;
```

**Step 3: Update league_id**
```sql
-- Now safe to update, no duplicates
UPDATE seasons SET league_id = legacy_league_id WHERE league_id IS NULL;
```

**Step 4: Set NOT NULL (idempotent)**
```sql
-- Only add constraint if not already present
IF NOT EXISTS (...) THEN
  ALTER TABLE seasons ALTER COLUMN league_id SET NOT NULL;
END IF;
```

---

## ⚠️ Important Notes

1. **DO NOT run the original Migration 7** (`20260125_migrate_existing_data_to_league_1.sql`) again
2. **DO NOT run the first FIXED version** (`20260125_migrate_existing_data_to_league_1_FIXED.sql`) - it doesn't handle duplicates
3. **USE the FINAL FIX version** (`20260125_migrate_existing_data_to_league_1_FINAL_FIX.sql`)
4. The FINAL FIX version is safe to run multiple times (idempotent)
5. Duplicate names will be automatically renamed (e.g., "Season" → "Season (2)")
6. You can review the renamed items after migration if needed

---

## 🚀 After Successful Migration

Once all tests pass:

1. ✅ Mark Migration 7 as COMPLETE (using FIXED version)
2. ✅ Mark Migration 8 as COMPLETE
3. ✅ Mark verification as COMPLETE
4. ✅ Ready for Agent 2 to begin backend API implementation

---

## 📞 Need Help?

If you encounter any errors:
1. Copy the FULL error message
2. Note which step failed
3. Note which migration file you were running
4. We'll troubleshoot together

---

## 📝 Current Status

- [x] Migrations 1-6: COMPLETE (ran successfully)
- [x] Migration 7: PARTIAL (encountered duplicates)
- [ ] Migration 7 DIAGNOSTIC: OPTIONAL (run to see duplicates)
- [ ] Migration 7 FINAL FIX: **RUN THIS NOW**
- [ ] Migration 8: PENDING
- [ ] Verification: PENDING

---

## 🎓 What You'll Learn

After running the diagnostic script, you'll see:
- Which seasons/teams have duplicate names
- How many records need to be renamed
- The exact data causing the constraint violation

The FINAL FIX will handle all of this automatically.

---

**Next action:**
1. (Optional) Run `DIAGNOSE_DUPLICATES.sql` to see the duplicate data
2. Run `20260125_migrate_existing_data_to_league_1_FINAL_FIX.sql` to fix everything! 🚀
