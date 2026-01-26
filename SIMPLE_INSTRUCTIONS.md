# ✅ Simple Instructions - Run Migration 7

I cannot execute SQL directly on your Supabase database because:
- psql is not installed
- Supabase CLI doesn't support arbitrary SQL execution on remote databases
- Migration history mismatch with remote

## 🚀 What You Need to Do (Very Simple)

### Step 1: Open This File

Open: `MIGRATION_7_RUN_THIS.sql`

### Step 2: Copy Everything

Press `Ctrl+A` then `Ctrl+C`

### Step 3: Go to Supabase SQL Editor

Click this link: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new

### Step 4: Paste and Run

1. Click in the SQL editor
2. Press `Ctrl+V` to paste
3. Click the green **"Run"** button (or press `Ctrl+Enter`)

### Step 5: Wait for Success

You'll see:
```
✅ Created League #1: HockeyLifeHL (Original)
✅ Duplicate season names handled
✅ Duplicate team names handled
✅ Updated X teams
✅ Updated X seasons
✅ Updated X games
... (all 18 tables)
✅ All league_id columns are now NOT NULL
✅ Created X admin memberships
✅ MIGRATION 7 COMPLETE
```

## 📋 After Migration 7 Completes

Then run these two files the same way:

1. **Migration 8:**
   - Open: `supabase/migrations/20260125_create_league_helper_functions.sql`
   - Copy all (Ctrl+A, Ctrl+C)
   - Paste in SQL Editor (Ctrl+V)
   - Run (Ctrl+Enter)

2. **Verification:**
   - Open: `supabase/verification/00_quick_verification.sql`
   - Copy all (Ctrl+A, Ctrl+C)
   - Paste in SQL Editor (Ctrl+V)
   - Run (Ctrl+Enter)
   - Should see all ✅ checkmarks

## 🎯 That's It!

Three files to run, same process for each:
1. `MIGRATION_7_RUN_THIS.sql` ← **START HERE**
2. `supabase/migrations/20260125_create_league_helper_functions.sql`
3. `supabase/verification/00_quick_verification.sql`

---

**The `MIGRATION_7_RUN_THIS.sql` file has everything you need and handles:**
- Creating League #1
- Renaming duplicate seasons/teams automatically
- Updating all league_id values
- Setting NOT NULL constraints
- Creating admin memberships

Copy, paste, run. That's it! 🚀
