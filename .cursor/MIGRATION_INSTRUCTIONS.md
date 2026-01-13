# How to Run the Migration

## Option 1: Using Supabase Dashboard (Recommended - Easiest)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `HockeyLifeHL`

2. **Navigate to SQL Editor**
   - In the left sidebar, click **"SQL Editor"**
   - Click **"New query"** button

3. **Copy and Paste the Migration**
   - Open the file: `supabase/migrations/add_season_to_stats.sql`
   - Copy the entire contents
   - Paste it into the SQL Editor

4. **Run the Migration**
   - Click the **"Run"** button (or press `Ctrl+Enter`)
   - Wait for it to complete (should take a few seconds)

5. **Verify Success**
   - You should see a success message
   - Check that the tables were updated:
     - Go to **"Table Editor"** → `player_stats` → Check for `season_id` column
     - Go to **"Table Editor"** → `goalie_stats` → Check for `season_id` column

## Option 2: Using Supabase CLI (If you want to set it up)

### Install Supabase CLI

```powershell
# Using Scoop (if you have it)
scoop install supabase

# Or using npm
npm install -g supabase
```

### Link Your Project

```powershell
cd C:\Users\NickG\Documents\HockeyApp
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Run Migration

```powershell
supabase db push
```

## What the Migration Does

1. ✅ Adds `season_id` column to `player_stats` table
2. ✅ Adds `season_id` column to `goalie_stats` table
3. ✅ Populates `season_id` for all existing records
4. ✅ Creates indexes for better query performance
5. ✅ Creates triggers to auto-set `season_id` on new inserts
6. ✅ Creates materialized views for fast season aggregations

## After Running the Migration

The migration is **safe** and **backward compatible**:
- Existing data will be preserved
- All existing stats will get their `season_id` populated automatically
- New stats will automatically get `season_id` set via triggers
- No code changes needed immediately (but you can use the new functions for better performance)

## Troubleshooting

If you get an error:
- Make sure you're connected to the correct project
- Check that the `seasons` table exists
- Verify that `games` table has `season_id` populated
- If materialized views fail, you can run the migration in parts (comment out the view creation and run it separately)
