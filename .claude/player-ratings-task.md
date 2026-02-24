# Task: Player Rating Calculation Engine + Division Balance Dashboard

## Context
Same monorepo as the goalie marketplace task. Key existing infrastructure:

- `player_ratings` table ALREADY EXISTS with `player_rating` enum (A+ through D-)
- Fields: player_id, season_id, rating, games_played, attendance_rate, points_per_game, calculated_at
- `player_stats` table exists with full game stats (goals, assists, pim, plus_minus, etc)
- `goalie_stats` tracking exists (saves, goals_against, etc)
- `seasons` table has divisions concept
- Current ratings are just mapped from self-assessed skill (beginner→D, etc) — NOT calculated from stats

## Goal
Build the rating calculation engine that populates player_ratings from actual game stats, weighted by division tier. Add team aggregate ratings and a division balance dashboard for league owners.

## What to Build

### 1. Database Migration (`supabase/migrations/20260224_rating_engine.sql`)

```sql
-- Add division_weight and overall_percentile to player_ratings
ALTER TABLE player_ratings ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE player_ratings ADD COLUMN IF NOT EXISTS raw_percentile DECIMAL(5,2);
ALTER TABLE player_ratings ADD COLUMN IF NOT EXISTS overall_percentile DECIMAL(5,2);
ALTER TABLE player_ratings ADD COLUMN IF NOT EXISTS position TEXT; -- 'skater' or 'goalie'
ALTER TABLE player_ratings ADD COLUMN IF NOT EXISTS stats_json JSONB DEFAULT '{}';

-- Drop the unique constraint and recreate to include league_id
-- (existing: UNIQUE player_id, season_id — we need league_id too for multi-league)
-- Check if constraint exists first, only alter if needed

-- Team Ratings (aggregate)
CREATE TABLE IF NOT EXISTS team_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id),
  overall_grade TEXT, -- A+ through D-
  overall_percentile DECIMAL(5,2),
  offense_rating DECIMAL(5,2),
  defense_rating DECIMAL(5,2),
  goaltending_rating DECIMAL(5,2),
  record_factor DECIMAL(5,2), -- based on W/L/T
  roster_count INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, season_id)
);

-- Division balance snapshots (for recommendations)
CREATE TABLE IF NOT EXISTS division_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL, -- full division balance data
  recommendations JSONB, -- suggested moves
  balance_score DECIMAL(5,2), -- 0-100, higher = more balanced
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE team_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE division_balance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League members view team ratings" ON team_ratings
  FOR SELECT USING (
    league_id IN (SELECT league_id FROM team_members WHERE user_id = auth.uid())
    OR league_id IN (SELECT id FROM leagues WHERE owner_id = auth.uid())
  );

CREATE POLICY "System manages team ratings" ON team_ratings
  FOR ALL USING (
    league_id IN (SELECT id FROM leagues WHERE owner_id = auth.uid())
  );

CREATE POLICY "League owners view balance" ON division_balance_snapshots
  FOR SELECT USING (
    league_id IN (SELECT id FROM leagues WHERE owner_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_ratings_league ON team_ratings(league_id, season_id);
CREATE INDEX IF NOT EXISTS idx_team_ratings_division ON team_ratings(division_id);
CREATE INDEX IF NOT EXISTS idx_balance_snapshots_league ON division_balance_snapshots(league_id, season_id);
```

### 2. Rating Calculation Engine (`apps/league-builder/src/lib/ratings/`)

#### `calculate-player-ratings.ts`
Core engine that:
1. Fetches all player_stats for a season
2. Separates skaters vs goalies
3. For skaters: calculates composite score from PPG, +/-, PIM (negative), attendance
4. For goalies: save %, GAA, win %, games played
5. Ranks players within their division → raw_percentile
6. Applies division weight multiplier:
   - Tier 1 (highest div): weight 1.0, floor 60th percentile
   - Tier 2: weight 0.85, floor 40th percentile  
   - Tier 3: weight 0.75, floor 25th percentile
   - Tier 4 (lowest): weight 0.65, floor 10th percentile
7. Maps overall_percentile → letter grade (A+ = 95-100, A = 90-94, etc)
8. Upserts into player_ratings

#### `calculate-team-ratings.ts`
Aggregates player ratings into team ratings:
- Overall = weighted avg of all roster player ratings
- Offense = avg of skater offensive stats
- Defense = avg of defensive stats
- Goaltending = goalie rating(s)
- Record factor = points %, goal differential

#### `division-balance.ts`
Analyzes division balance:
- Compares team ratings across divisions
- Flags teams significantly below their division (>1 std dev below mean)
- Flags teams significantly above their division
- Generates move recommendations
- Calculates balance improvement % if recommendations applied

### 3. Server Actions (`apps/league-builder/src/lib/actions/ratings.ts`)
- `calculateLeagueRatings(leagueId, seasonId)` — triggers full recalculation
- `getPlayerRatings(leagueId, seasonId, filters)` — paginated player directory
- `getTeamRatings(leagueId, seasonId)` — all team ratings
- `getDivisionBalance(leagueId, seasonId)` — balance analysis with recommendations
- `getPlayerDetail(playerId, leagueId)` — single player with rating history

### 4. League Builder UI Components

#### Player Directory (`apps/league-builder/src/components/ratings/`)
- `PlayerDirectory.tsx` — Full sortable/filterable table of all players
  - Columns: Name, Team, Division, Div Rating, Overall Rating, GP, Pts, +/-, Trend
  - Filters: division, team, position, grade range
  - Search by name
  - Click → player detail panel
- `PlayerDetailPanel.tsx` — Season stats, rating history chart, division history
- `TeamRatingsCard.tsx` — Team card showing overall + breakdown (offense/defense/goaltending)
- `DivisionBalanceDashboard.tsx` — Visual breakdown of teams per division with ratings
  - Shows each division's teams sorted by rating
  - Flags misplaced teams (⚠️ BELOW / ⚠️ ABOVE)
  - Recommendations panel with accept/dismiss buttons
  - Balance score indicator
- `RecalculateButton.tsx` — Trigger manual recalculation (league owner only)

#### Integration Points
- Add "Player Ratings" nav item to league dashboard sidebar
- Add team rating badges to existing team list views
- Show player grade on roster views (for captains in draft leagues, owners always)

### 5. Visibility Rules (enforce in both RLS and UI)
- League Owner: sees everything
- Captain (draft league): own team ratings + league-wide team ratings
- Captain (regular): own team only
- Players: NOTHING — ratings are internal only
- Public: NOTHING

## IMPORTANT NOTES
- The `player_ratings` table and `player_rating` enum ALREADY EXIST — don't recreate them
- Check existing `divisions` table structure — it may or may not exist. If not, you'll need to handle division info from wherever it's stored (possibly in `seasons` or `teams`)
- The existing `player_stats` table structure is in `packages/database/src/types.ts` — read it to get exact column names
- Check `standings` module (`apps/league-builder/src/lib/standings/`) for existing team record calculations
- Minimum 5 games played before a rating appears
- Follow existing patterns for server actions, components, and i18n

## When done
Run: `openclaw system event --text "Player Rating Engine complete — calculation, team ratings, division balance dashboard" --mode now`
