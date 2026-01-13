# NHL-Style Stats Structure Implementation

## Overview
The data structure has been updated to match how the NHL records and organizes player statistics, with clear separation between:
- **Game-level stats** (individual game performance)
- **Season-level stats** (aggregated stats for a player/team in a specific season)
- **Career stats** (aggregated stats across all seasons)

## Data Model Changes

### 1. Added `season_id` to Stats Tables

Both `player_stats` and `goalie_stats` now include `season_id` to directly link stats to seasons:

```sql
-- Player Stats
player_stats (
  game_id,      -- Links to specific game
  player_id,    -- Links to player
  team_id,      -- Links to team (for that game)
  season_id,    -- NEW: Links to season (NHL-style)
  goals,
  assists
)

-- Goalie Stats
goalie_stats (
  game_id,      -- Links to specific game
  player_id,    -- Links to goalie
  team_id,      -- Links to team (for that game)
  season_id,    -- NEW: Links to season (NHL-style)
  goals_against,
  saves,
  shutout
)
```

### 2. Materialized Views for Performance

Created materialized views for fast season-level queries:

- `player_season_stats_mv` - Aggregated player stats per season
- `goalie_season_stats_mv` - Aggregated goalie stats per season

These views are automatically maintained and can be refreshed when needed.

### 3. NHL-Style Query Functions

New functions in `src/lib/stats/season-queries.ts`:

- `getPlayerSeasonStats(playerId, seasonId)` - Get a player's stats for a specific season
- `getPlayerCareerStats(playerId)` - Get a player's career totals across all seasons
- `getTeamSeasonStats(teamId, seasonId)` - Get team performance for a season
- `getSeasonPlayerLeaderboard(seasonId)` - Get all players ranked for a season

## How It Works

### Player Stats Structure

1. **Game Stats** → Stored in `player_stats` table
   - One row per player per game
   - Includes `season_id` for direct season lookup

2. **Season Stats** → Aggregated from game stats
   - Calculated per player per season
   - Includes team assignment for that season
   - Stored in materialized view for performance

3. **Career Stats** → Aggregated across all seasons
   - Sum of all season stats
   - Includes season-by-season breakdown

### Team Stats Structure

1. **Team Season Stats** → Calculated from games
   - Wins, losses, ties
   - Goals for/against
   - Points (2 for win, 1 for tie)

2. **Team Roster** → Links players to teams per season
   - `team_rosters` table: `player_id`, `team_id`, `season_id`
   - A player can only be on one team per season

## Migration

Run the migration to add `season_id` to existing stats:

```sql
-- Migration file: supabase/migrations/add_season_to_stats.sql
```

This migration:
1. Adds `season_id` column to both stats tables
2. Populates `season_id` from existing game records
3. Creates indexes for performance
4. Creates triggers to auto-set `season_id` on insert
5. Creates materialized views for season aggregations

## Usage Examples

### Get Player Season Stats
```typescript
import { getPlayerSeasonStats } from "@/lib/stats/season-queries";

const stats = await getPlayerSeasonStats(playerId, seasonId);
// Returns: { stats, totals, team }
```

### Get Player Career Stats
```typescript
import { getPlayerCareerStats } from "@/lib/stats/season-queries";

const career = await getPlayerCareerStats(playerId);
// Returns: { career_totals, season_breakdown }
```

### Get Team Season Stats
```typescript
import { getTeamSeasonStats } from "@/lib/stats/season-queries";

const teamStats = await getTeamSeasonStats(teamId, seasonId);
// Returns: { games_played, wins, losses, ties, points, goals_for, goals_against }
```

## Benefits

1. **Performance**: Direct `season_id` lookup is faster than joining through games
2. **Clarity**: Stats are explicitly linked to seasons (NHL-style)
3. **Flexibility**: Easy to query season stats, career stats, or team stats
4. **Consistency**: Matches how professional hockey leagues structure data
5. **Scalability**: Materialized views handle large datasets efficiently

## Next Steps

1. Run the migration: `supabase/migrations/add_season_to_stats.sql`
2. Update existing queries to use new season-based functions
3. Refresh materialized views periodically (or via trigger)
4. Update UI to show season vs career stats clearly
