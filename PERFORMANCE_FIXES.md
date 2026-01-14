# Performance Fixes Applied

## Issues Found

1. **Players not showing in career stats**: The `player_career_stats` view had a SQL error with FULL OUTER JOIN
2. **Slow page loads**: Queries were fetching too much data without limits

## Fixes Applied

### 1. Fixed `player_career_stats` View

**Problem**: The view used a FULL OUTER JOIN with a complex condition that PostgreSQL couldn't optimize.

**Solution**: Created a new view using UNION ALL to combine:
- Matched legacy players (with profiles)
- Unmatched legacy players (no profile)
- Current players with stats

**File**: `supabase/SQL_EDITOR_FIX_CAREER_STATS_VIEW.sql`

**To Apply**:
1. Go to Supabase SQL Editor
2. Run `supabase/SQL_EDITOR_FIX_CAREER_STATS_VIEW.sql`
3. This will recreate the view and add performance indexes

### 2. Added Query Limits

**Problem**: Career stats queries could return thousands of records, causing slow loads.

**Solution**: Added limits to queries:
- `getCareerPlayerStats()`: Limited to 1000 records
- `getCareerGoalieStats()`: Limited to 500 records

**Files Modified**:
- `src/lib/stats/queries.ts`

### 3. Added Database Indexes

**Indexes Created**:
- `idx_player_stats_player_game` - For faster player stats lookups
- `idx_games_status_verified` - For faster game verification checks
- `idx_player_stats_season_game` - For season-specific queries

### 4. Optimized View Query

The new view uses:
- CTEs (Common Table Expressions) for better query planning
- LEFT JOINs instead of FULL OUTER JOINs
- Proper grouping and aggregation

## Next Steps

1. **Run the SQL fix** in Supabase SQL Editor
2. **Test the career stats page** - should now show all 795 players
3. **Monitor performance** - pages should load faster

## Performance Tips

- The view now limits results automatically
- Indexes will speed up queries significantly
- Consider pagination for very large datasets in the future
