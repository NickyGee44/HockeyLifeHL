# Database Migration Guide 🗄️

## Understanding Your Database State

### Can I See What's Already Set Up?

**I cannot directly access your Supabase database**, but you can check it yourself:

1. **Go to Supabase Dashboard** → Your Project → **SQL Editor**
2. **Run the diagnostic script**: Copy and paste `supabase/check_database_state.sql`
3. **Review the results** to see:
   - Which tables exist
   - Which migrations have been applied
   - How much data you have

## Two Different Approaches

### Option 1: `schema.sql` (Full Setup - Empty Database)

**Use this if:**
- ✅ Your database is **completely empty**
- ✅ You're setting up a **new project**
- ✅ You want to start fresh

**What it does:**
- Creates ALL tables, ENUMs, indexes, triggers, RLS policies
- Sets up the complete database structure from scratch
- **⚠️ WARNING**: Will fail if tables already exist (unless you drop them first)

**How to use:**
```sql
-- In Supabase SQL Editor, run:
-- Copy entire contents of supabase/schema.sql
```

### Option 2: Migrations (Incremental - Existing Database)

**Use this if:**
- ✅ Your database **already has tables**
- ✅ You've **already deployed** and have data
- ✅ You want to **add new features** without losing data

**What they do:**
- Each migration adds specific features incrementally
- Uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` - **safe to run multiple times**
- **✅ SAFE**: Won't break existing data or structure

**Migration files (in order):**
1. `add_season_to_stats.sql` - Adds season_id to stats tables
2. `add_season_schedule_fields.sql` - Adds schedule management fields
3. `add_draft_order.sql` - Creates draft order system
4. `add_draft_link.sql` - Adds unique draft links
5. `update_player_rating_enum.sql` - Updates rating enum if needed
6. `enable_draft_realtime.sql` - Enables realtime subscriptions
7. `add_payments_table.sql` - Creates payments system

## If You've Already Deployed

### ✅ Safe Approach: Run Migrations Only

If your database already has data:

1. **Check what's missing** using `check_database_state.sql`
2. **Run only the migrations you need** (they're idempotent - safe to run multiple times)
3. **Your existing data will be preserved**

### Example: Checking What You Need

```sql
-- Run this first to see what's missing:
-- (Copy from supabase/check_database_state.sql)

-- Then run only the migrations that show as ❌
```

## Migration Safety Features

All migrations use safe patterns:

```sql
-- ✅ Safe - won't fail if column exists
ADD COLUMN IF NOT EXISTS season_id UUID

-- ✅ Safe - won't fail if table exists  
CREATE TABLE IF NOT EXISTS payments

-- ✅ Safe - won't fail if index exists
CREATE INDEX IF NOT EXISTS idx_name
```

## Step-by-Step: What Should You Do?

### Scenario A: Brand New Database (Empty)

1. Run `supabase/schema.sql` in SQL Editor
2. Done! ✅

### Scenario B: Database Already Has Data (Deployed)

1. **First, check your current state:**
   ```sql
   -- Run supabase/check_database_state.sql
   ```

2. **Then run missing migrations:**
   - If `add_season_to_stats.sql` shows ❌ → Run it
   - If `add_payments_table.sql` shows ❌ → Run it
   - etc.

3. **Each migration is independent** - you can run them in any order (they check for existence first)

### Scenario C: Not Sure What You Have

1. **Run the diagnostic script** (`check_database_state.sql`)
2. **Look at the results:**
   - If you see tables with data → Use **Option 2 (Migrations)**
   - If you see no tables → Use **Option 1 (schema.sql)**

## Will Migrations Change Existing Data?

### ✅ Safe Changes (No Data Loss)

- Adding new columns with defaults
- Creating new tables
- Adding indexes
- Adding new ENUM values

### ⚠️ Potentially Risky Changes

- Changing column types (migrations don't do this)
- Dropping columns (migrations don't do this)
- Changing constraints (migrations are careful)

### What the Migrations Actually Do

1. **`add_season_to_stats.sql`**:
   - Adds `season_id` columns
   - **Populates existing records** automatically from games table
   - Creates indexes and views
   - ✅ **Safe for existing data**

2. **`add_season_schedule_fields.sql`**:
   - Adds new optional columns to seasons
   - ✅ **Safe - doesn't touch existing data**

3. **`add_draft_order.sql`**:
   - Creates new `draft_order` table
   - ✅ **Safe - new table only**

4. **`add_draft_link.sql`**:
   - Adds optional column to drafts
   - ✅ **Safe - doesn't touch existing data**

5. **`add_payments_table.sql`**:
   - Creates completely new table
   - ✅ **Safe - new table only**

## Quick Decision Tree

```
Do you have a Supabase project?
│
├─ No → Create one, then run schema.sql
│
└─ Yes → Do you have tables with data?
    │
    ├─ No → Run schema.sql
    │
    └─ Yes → Run check_database_state.sql
             Then run only missing migrations
```

## Testing Migrations Safely

If you're worried about production data:

1. **Create a backup** (Supabase Dashboard → Settings → Database → Backups)
2. **Or use a test/staging project** first
3. **Run migrations one at a time** and verify after each

## Need Help?

1. Run `supabase/check_database_state.sql` and share the results
2. I can help you determine which migrations to run
3. Or guide you through the full setup if starting fresh

---

**TL;DR:**
- **Empty database?** → Run `schema.sql`
- **Has data?** → Run `check_database_state.sql` first, then only missing migrations
- **All migrations are safe** - they use `IF NOT EXISTS` patterns

