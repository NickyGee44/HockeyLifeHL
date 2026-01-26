# 🚨 URGENT: Run Database Migrations

**Status:** Migrations NOT YET RUN - Database needs setup
**Issue:** `leagues` table does not exist
**Solution:** Run all 8 migration files in Supabase SQL Editor

---

## 📋 Step-by-Step Migration Instructions

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project: `ntplczcmhvfkijjxavdl`
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

---

### Step 2: Run Migrations IN ORDER

**CRITICAL:** You must run these in the exact order listed below!

Copy and paste each file's contents into the SQL Editor and click **"Run"**

---

#### Migration 1: Core Multi-Tenant Tables

**File:** `supabase/migrations/20260125_create_core_multi_tenant_tables.sql`

**What it does:**
- Creates `leagues` table
- Creates `league_memberships` table
- Creates `divisions` table (multi-tenant)
- Creates `venues` table (multi-tenant)
- Sets up RLS policies
- Creates helper functions (is_league_owner, is_league_admin, get_user_league_ids)

**How to run:**
1. Open the file in VS Code
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **"Run"** (or Ctrl+Enter)
5. Wait for success message

**Expected result:** "Success. No rows returned"

---

#### Migration 2: Add league_id to Core Tables

**File:** `supabase/migrations/20260125_add_league_id_to_core_tables.sql`

**What it does:**
- Adds `league_id` column to `teams`
- Adds `league_id` column to `team_rosters`
- Adds `league_id` column to `seasons`
- Creates indexes and RLS policies

**How to run:**
1. Open the file in VS Code
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

**Expected result:** "Success. No rows returned"

---

#### Migration 3: Add league_id to Games and Stats

**File:** `supabase/migrations/20260125_add_league_id_to_games_and_stats.sql`

**What it does:**
- Adds `league_id` to `games`
- Adds `league_id` to `player_stats`
- Adds `league_id` to `goalie_stats`
- Creates indexes and RLS policies

**How to run:**
1. Open the file in VS Code
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

**Expected result:** "Success. No rows returned"

---

#### Migration 4: Add league_id to Draft/Payment Tables

**File:** `supabase/migrations/20260125_add_league_id_to_draft_payment_tables.sql`

**What it does:**
- Adds `league_id` to `drafts`, `draft_picks`, `draft_order`
- Adds `league_id` to `player_ratings`
- Adds `league_id` to `payments`
- Adds `league_id` to `suspensions`
- Creates indexes and RLS policies

**How to run:**
1. Open the file in VS Code
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

**Expected result:** "Success. No rows returned"

---

#### Migration 5: Add league_id to Feature Tables

**File:** `supabase/migrations/20260125_add_league_id_to_feature_tables.sql`

**What it does:**
- Adds `league_id` to `articles`, `trades`, `trade_players`
- Adds `league_id` to `player_goalie_matchups`
- Adds `league_id` to `season_highlights`, `email_drafts`
- Creates indexes and RLS policies

**How to run:**
1. Open the file in VS Code
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

**Expected result:** "Success. No rows returned"

---

#### Migration 6: Create Scorekeeper Tables

**File:** `supabase/migrations/20260125_create_scorekeeper_tables.sql`

**What it does:**
- Creates `league_scorekeepers` table
- Creates `game_scorekeeper_assignments` table
- Creates `game_stat_entry_log` table
- Adds scorekeeper fields to `games` table
- Creates RLS policies and helper functions

**How to run:**
1. Open the file in VS Code
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

**Expected result:** "Success. No rows returned"

---

#### Migration 7: Migrate Existing Data to League #1

**File:** `supabase/migrations/20260125_migrate_existing_data_to_league_1.sql`

**What it does:**
- Creates League #1 (HockeyLifeHL Original)
- Assigns ALL existing data to League #1
- Sets league_id = NOT NULL on all tables
- Creates league memberships for existing admins

**How to run:**
1. Open the file in VS Code
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

**Expected result:** Multiple "NOTICE" messages showing:
- "Created League #1: HockeyLifeHL (Original)"
- "Updated X teams"
- "Updated X games"
- etc.

---

#### Migration 8: Create Helper Functions

**File:** `supabase/migrations/20260125_create_league_helper_functions.sql`

**What it does:**
- Creates 18 helper functions for league-aware queries
- get_league_teams(), get_league_seasons()
- get_player_season_stats(), get_team_standings()
- is_league_slug_available(), get_league_by_slug()
- etc.

**How to run:**
1. Open the file in VS Code
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

**Expected result:** "Success. No rows returned"

---

## ✅ Step 3: Verify Migrations Succeeded

After running ALL 8 migrations, run the verification:

**File:** `supabase/verification/00_quick_verification.sql`

1. Copy contents
2. Paste into Supabase SQL Editor
3. Click **"Run"**

**Expected result:** All tests show ✅

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

## 🚨 Common Issues

### Issue: "relation already exists"
**Solution:** Migration already ran - skip to next migration

### Issue: "column already exists"
**Solution:** Migration already ran - skip to next migration

### Issue: "permission denied"
**Solution:** Make sure you're using the service_role key in Supabase settings

### Issue: "syntax error"
**Solution:** Make sure you copied the ENTIRE file contents (check for missing closing statements)

---

## 📝 Migration Checklist

Track your progress:

- [ ] Migration 1: Core multi-tenant tables ✅
- [ ] Migration 2: league_id to core tables ✅
- [ ] Migration 3: league_id to games/stats ✅
- [ ] Migration 4: league_id to drafts/payments ✅
- [ ] Migration 5: league_id to feature tables ✅
- [ ] Migration 6: Scorekeeper tables ✅
- [ ] Migration 7: Data migration to League #1 ✅
- [ ] Migration 8: Helper functions ✅
- [ ] Verification: Run 00_quick_verification.sql ✅

---

## 📊 After All Migrations Run

You should see in your Supabase database:

**New Tables (7):**
- leagues
- league_memberships
- divisions (updated)
- venues (updated)
- league_scorekeepers
- game_scorekeeper_assignments
- game_stat_entry_log

**Updated Tables (16):**
- All have `league_id` column
- All have RLS enabled
- All have indexes on league_id

**Functions (18):**
- Helper functions for common queries

**League #1:**
- ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
- Name: HockeyLifeHL (Original)
- Slug: hockeylifehl-original
- All existing data assigned to it

---

## 🎯 Next Steps After Migrations

1. ✅ Run verification: `00_quick_verification.sql`
2. ✅ All tests should PASS
3. ✅ Agent 2 can begin backend implementation
4. ✅ Continue with project

---

## ⏱️ Estimated Time

- Running all 8 migrations: 5-10 minutes
- Verification: 1 minute
- Total: ~15 minutes

---

## 📞 Need Help?

If you encounter errors:
1. Copy the FULL error message
2. Note which migration failed
3. Check if table/column already exists
4. Try the next migration

Most common issue: Migration partially ran before. Just skip to next migration.

---

**Let's get started! Run Migration 1 first.** 🚀
