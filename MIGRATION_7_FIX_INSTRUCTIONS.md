# 🔧 Migration 7 Fix Instructions

**Issue:** You encountered a duplicate key constraint violation when running Migration 7.

**Error:** `duplicate key value violates unique constraint "unique_season_name_per_league"`

**Root Cause:** Migration 7 was partially executed before, so some records already have `league_id` set. The original script tried to update ALL records, causing the duplicate constraint violation.

---

## ✅ Solution: Use the FIXED Migration Script

I've created a fixed version that only updates records where `league_id IS NULL`, preventing duplicate constraint violations.

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project: `ntplczcmhvfkijjxavdl`
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

---

### Step 2: Run the FIXED Migration 7

**File:** `supabase/migrations/20260125_migrate_existing_data_to_league_1_FIXED.sql`

1. Open the file in VS Code: `HockeyLifeHL/supabase/migrations/20260125_migrate_existing_data_to_league_1_FIXED.sql`
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **"Run"** (or Ctrl+Enter)

**Expected Output:**
```
✅ Created League #1: HockeyLifeHL (Original)
✅ Updated X teams (only NULL league_id records)
✅ Updated X seasons (only NULL league_id records)
✅ Updated X games (only NULL league_id records)
... (similar for all 16 tables)
✅ Set league_id to NOT NULL on all tables
✅ Created X admin memberships for League #1
```

**What this does:**
- Creates League #1 if it doesn't exist (skips if already exists)
- Only updates records WHERE league_id IS NULL (avoids duplicates)
- Sets NOT NULL constraints idempotently
- Creates admin memberships safely

---

### Step 3: Run Migration 8 (Helper Functions)

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

### Step 4: Run Quick Verification

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

## 📊 What Changed in the FIXED Version

### Original Script (BROKEN):
```sql
-- Updates ALL records, causing duplicates
UPDATE seasons SET league_id = legacy_league_id;
```

### Fixed Script (WORKS):
```sql
-- Only updates records without league_id
UPDATE seasons SET league_id = legacy_league_id WHERE league_id IS NULL;
```

### NOT NULL Constraints Made Idempotent:
```sql
-- Check if constraint already exists before adding
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE teams ALTER COLUMN league_id SET NOT NULL;
  END IF;
END $;
```

---

## ⚠️ Important Notes

1. **DO NOT run the original Migration 7** (`20260125_migrate_existing_data_to_league_1.sql`) again
2. **USE the FIXED version** (`20260125_migrate_existing_data_to_league_1_FIXED.sql`)
3. The FIXED version is safe to run multiple times (idempotent)
4. It will only update records that haven't been migrated yet

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
- [x] Migration 7: PARTIAL (needs FIXED version)
- [ ] Migration 7 FIXED: **RUN THIS NOW**
- [ ] Migration 8: PENDING
- [ ] Verification: PENDING

---

**Next action:** Run the FIXED Migration 7 script now! 🚀
