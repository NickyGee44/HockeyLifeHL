# Legacy Stats Import System

## Overview

This system allows you to import historical player and goalie statistics from the old HockeyLifeHL website (https://hockeylifehl.com) into the new system. Players don't need accounts initially, but when someone creates an account with a matching name, their legacy stats will automatically be linked.

## How It Works

1. **Legacy Players Table**: Stores historical stats for players who haven't created accounts yet
2. **Automatic Matching**: When a user creates an account, the system checks if their name matches a legacy player and links them automatically
3. **Combined Stats View**: The `player_career_stats` view combines legacy and current stats for display
4. **Manual Matching**: Owners can manually match legacy players to accounts if needed

## Database Schema

### `legacy_players` Table

Stores aggregated career stats from the old system:
- Player info: `first_name`, `last_name`, `full_name` (generated)
- Player stats: `games_played`, `goals`, `assists`, `points`, `points_per_game`, `wins`, `ties`, `win_percentage`, `moosehead_cup_wins`
- Goalie stats: `is_goalie`, `goals_against`, `saves`, `shutouts`, `goals_against_average`, `save_percentage`
- Matching: `matched_to_profile_id`, `matched_at`

### `player_career_stats` View

Combines legacy and current stats:
- Shows both legacy and current stats separately
- Calculates combined totals
- Automatically updates when new stats are added

## Import Process

### Step 1: Run Database Migration

Run `supabase/SQL_EDITOR_LEGACY_PLAYERS.sql` in Supabase SQL Editor to create:
- `legacy_players` table
- `player_career_stats` view
- Auto-matching trigger
- RLS policies

### Step 2: Download HTML Files

1. **Player Stats:**
   - Visit: https://hockeylifehl.com/league-posts/statscard/?seasonid=ap
   - Save the page HTML to `data/legacy-player-stats.html`

2. **Goalie Stats:**
   - Visit: https://hockeylifehl.com/league-posts/statscard/?seasonid=ag
   - Save the page HTML to `data/legacy-goalie-stats.html`

### Step 3: Run Import Script

```bash
# Make sure you have the HTML files in data/ directory
npx tsx scripts/import-legacy-stats.ts
```

The script will:
- Parse the HTML tables
- Extract player/goalie stats
- Merge players who appear in both lists
- Import into `legacy_players` table

## Automatic Matching

When a user creates an account:

1. The `trigger_auto_match_legacy_player` trigger fires
2. It searches for a legacy player with matching name (case-insensitive, trimmed)
3. If found, it links the legacy player to the new profile
4. The user's stats page will show combined legacy + current stats

## Manual Matching

If automatic matching doesn't work (e.g., name variations), owners can manually match:

```sql
SELECT match_legacy_player_to_profile(
  'legacy_player_id',
  'profile_id'
);
```

Or use the admin interface (when implemented):
- Navigate to `/admin/legacy-players`
- Search for legacy player
- Select matching profile
- Click "Match"

## Viewing Combined Stats

Query the view to see legacy + current stats:

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
  total_assists,
  total_points
FROM player_career_stats
WHERE player_id = 'some_profile_id';
```

## Server Actions

Available in `src/lib/admin/legacy-player-actions.ts`:

- `getAllLegacyPlayers()` - Get all legacy players (with matched profiles)
- `matchLegacyPlayer()` - Manually match a legacy player to a profile
- `getPlayerCareerStats()` - Get combined legacy + current stats for a player
- `searchLegacyPlayers()` - Search for unmatched legacy players

## UI Components Needed

1. **Admin Legacy Players Page** (`/admin/legacy-players`)
   - List all legacy players
   - Show matched/unmatched status
   - Manual matching interface
   - Search functionality

2. **Player Stats Page Enhancement**
   - Show legacy stats section
   - Display combined totals
   - Show "Legacy Player" badge if matched

3. **Public Stats Pages**
   - Include legacy players in all-time stats
   - Show combined career stats

## Notes

- Legacy stats are **aggregated totals**, not per-game stats
- Players can be both skaters and goalies (merged automatically)
- Matching is case-insensitive and trims whitespace
- Legacy players without accounts are still visible in public stats
- When matched, legacy stats become part of the player's profile

## Troubleshooting

### Import Fails
- Check HTML file format matches expected table structure
- Verify Supabase connection and service role key
- Check console for parsing errors

### Names Don't Auto-Match
- Check for typos or name variations
- Use manual matching function
- Verify name format (First Last) matches exactly

### Duplicate Entries
- Script uses `upsert` with `first_name, last_name` as unique key
- If same player appears in both lists, they're merged automatically

---

**Files Created:**
- `supabase/SQL_EDITOR_LEGACY_PLAYERS.sql` - Database migration
- `scripts/import-legacy-stats.ts` - Import script
- `scripts/README_LEGACY_IMPORT.md` - Detailed import guide
- `src/lib/admin/legacy-player-actions.ts` - Server actions
