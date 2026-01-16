# Production Performance Fixes (10+ minute load times)

## Critical Issues Found

### 1. **Unlimited Data Fetching**
- `getSeasonPlayerStats()` - Fetches ALL player stats for a season (could be thousands)
- `getSeasonGoalieStats()` - Fetches ALL goalie stats for a season
- `getCareerGoalieStats()` - Fetches ALL goalie stats without limits
- Client-side filtering after fetching all data (extremely slow)

### 2. **Missing Database Indexes**
- No indexes on `player_stats(season_id, game_id)`
- No indexes on `goalie_stats(season_id, game_id)`
- No indexes on `games(season_id, status, home_captain_verified, away_captain_verified)`
- No indexes on foreign keys

### 3. **No Query Limits**
- Many queries return unlimited results
- No pagination

### 4. **Client-Side Data Processing**
- Stats page is client-side, can't use Next.js caching
- All data fetched on client, then filtered/sorted in JavaScript

### 5. **No Caching Strategy**
- Server actions don't use React cache
- No revalidation strategy
- Every request hits the database

## Fixes Applied

### 1. Add Database Indexes
Created migration to add critical indexes for performance.

### 2. Optimize Queries
- Add limits to all queries
- Filter at database level, not client-side
- Use proper WHERE clauses with indexes

### 3. Add Caching
- Use Next.js `unstable_cache` for server actions
- Add `revalidate` to server components
- Cache frequently accessed data

### 4. Optimize Stats Queries
- Filter verified games at database level
- Add limits to prevent fetching thousands of records
- Use aggregation queries instead of fetching all rows

### 5. Convert Client Components to Server Components
- Move stats page to server component where possible
- Use server-side rendering for better performance

