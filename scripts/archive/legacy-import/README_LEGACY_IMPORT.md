# Legacy Stats Import Guide

This guide explains how to import historical player and goalie stats from the old HockeyLifeHL website.

## Prerequisites

1. Install dependencies:
```bash
npm install xlsx
npm install --save-dev @types/node
```

2. Set up environment variables:
```bash
# In .env.local or .env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Step 1: Run Database Migration

First, run the SQL migration to create the `legacy_players` table:

1. Open Supabase SQL Editor
2. Copy and paste the contents of `supabase/SQL_EDITOR_LEGACY_PLAYERS.sql`
3. Run the migration

## Step 2: Prepare Data Files

### Option A: Excel Files (Recommended)

Place the Excel files in the project root directory:
- `HockeyLifeHL_AllTimePlayerStats_seasonid_ap.xlsx`
- `HockeyLifeHL_AllTimeGoalieStats_seasonid_ag.xlsx`

### Option B: HTML Files

1. **Player Stats:**
   - Visit: https://hockeylifehl.com/league-posts/statscard/?seasonid=ap
   - Right-click → "Save Page As" → Save as `data/legacy-player-stats.html`
   - Or use browser DevTools to copy the HTML from the `<table>` element

2. **Goalie Stats:**
   - Visit: https://hockeylifehl.com/league-posts/statscard/?seasonid=ag
   - Right-click → "Save Page As" → Save as `data/legacy-goalie-stats.html`
   - Or use browser DevTools to copy the HTML from the `<table>` element

3. Create data directory:
```bash
mkdir -p data
```

## Step 3: Run Import Script

### For Excel Files (Recommended):
```bash
npx tsx scripts/import-excel-legacy-stats.ts
```

### For HTML Files:
```bash
npx tsx scripts/import-legacy-stats.ts
```

Or if you have ts-node:
```bash
npx ts-node scripts/import-excel-legacy-stats.ts
```

## Step 4: Verify Import

Check the database:
```sql
SELECT COUNT(*) FROM legacy_players;
SELECT * FROM legacy_players LIMIT 10;
```

## How It Works

### Automatic Matching

When a user creates an account with a name that matches a legacy player:
- The `trigger_auto_match_legacy_player` trigger automatically links them
- Their legacy stats become part of their profile
- Combined stats are available via the `player_career_stats` view

### Manual Matching

If you need to manually match a legacy player to an account:

```sql
SELECT match_legacy_player_to_profile(
  'legacy_player_id_here',
  'profile_id_here'
);
```

### Viewing Combined Stats

Query the view to see legacy + current stats combined:

```sql
SELECT 
  full_name,
  legacy_games_played,
  legacy_goals,
  legacy_assists,
  current_games_played,
  current_goals,
  current_assists,
  total_games_played,
  total_goals,
  total_assists
FROM player_career_stats
WHERE player_id = 'some_profile_id';
```

## Troubleshooting

### Import Fails
- Check that Excel/HTML files are in the correct location
- Verify the file structure matches the expected format
- Check Supabase connection and service role key
- For Excel files, ensure column names match expected format (GP, G, A, etc.)

### Names Don't Match
- The matching is case-insensitive and trims whitespace
- If names don't auto-match, use manual matching function
- Check for typos or name variations (e.g., "Mike" vs "Michael")

### Duplicate Players
- The script uses `upsert` with `first_name, last_name` as unique constraint
- If a player appears in both player and goalie stats, they'll be merged
- The `is_goalie` flag will be set to `true` if they have goalie stats

## Notes

- Legacy stats are stored separately from current stats
- Legacy stats are aggregated totals (not per-game)
- When a player creates an account, their legacy stats are automatically linked
- The `player_career_stats` view combines legacy and current stats for display
- Excel import automatically merges players who appear in both player and goalie stats