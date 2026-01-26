# 📊 Game Stats Table Requirements (Agent 4 → Agent 1)

**From:** Agent 4 - Scorekeeper System
**To:** Agent 1 - Database & Infrastructure
**Date:** January 25, 2026
**Priority:** HIGH - Blocking Agent 4 functionality

---

## 🚨 Current Blocker

Agent 4's scorekeeper system is complete but has **@ts-ignore comments** in 3 files because the `game_stats` table doesn't exist yet. Once you create this table, I can remove the type ignores and the system will be fully functional.

**Files Blocked:**
- `src/app/api/scorekeepers/submit-stat/route.ts` (lines 70, 81)
- `src/components/scorekeeper/StatSummary.tsx` (line 28)
- `src/lib/scorekeepers/stat-actions.ts` (multiple locations)

---

## 📋 Required Table Schema: `game_stats`

### Table: game_stats

```sql
CREATE TABLE IF NOT EXISTS game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core References
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Stat Details
  stat_type TEXT NOT NULL CHECK (stat_type IN (
    'Goal',
    'Assist',
    'Shot',
    'Save',
    'PIM',           -- Penalty Minutes
    'Hit',
    'Takeaway',
    'Giveaway',
    'Blocked Shot',
    'Faceoff Win',
    'Faceoff Loss',
    'Goal Against'   -- For goalies
  )),

  -- Stat Value
  value INTEGER DEFAULT 1,  -- For PIM, this is minutes (2, 4, 5, 10)

  -- Game Context
  period INTEGER NOT NULL CHECK (period IN (1, 2, 3, 4)),  -- 4 = OT
  period_time TEXT,  -- Optional: "14:32" format (minutes:seconds remaining)
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Team Context
  team_type TEXT NOT NULL CHECK (team_type IN ('home', 'away')),

  -- Multi-Point Tracking (for goals with assists)
  assist1_id UUID REFERENCES profiles(id),  -- Primary assist
  assist2_id UUID REFERENCES profiles(id),  -- Secondary assist

  -- Goalie Specific
  is_empty_net BOOLEAN DEFAULT FALSE,       -- Empty net goal
  is_power_play BOOLEAN DEFAULT FALSE,      -- Power play goal
  is_short_handed BOOLEAN DEFAULT FALSE,    -- Short-handed goal

  -- Metadata
  entered_by UUID REFERENCES profiles(id),  -- Scorekeeper who entered this
  verified_by UUID REFERENCES profiles(id), -- Captain who verified (if applicable)
  verified_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes (CRITICAL for Performance)

```sql
-- Primary query patterns for scorekeeper system
CREATE INDEX idx_game_stats_game_id ON game_stats(game_id);
CREATE INDEX idx_game_stats_player_id ON game_stats(player_id);
CREATE INDEX idx_game_stats_team_id ON game_stats(team_id);
CREATE INDEX idx_game_stats_league_id ON game_stats(league_id);

-- For real-time updates and duplicate detection
CREATE INDEX idx_game_stats_game_created ON game_stats(game_id, created_at);

-- For stats aggregation queries
CREATE INDEX idx_game_stats_player_stat_type ON game_stats(player_id, stat_type);
CREATE INDEX idx_game_stats_game_stat_type ON game_stats(game_id, stat_type);

-- For duplicate detection (same player, stat, period within 30 seconds)
CREATE INDEX idx_game_stats_duplicate_check ON game_stats(
  game_id, player_id, stat_type, period, created_at
);
```

### RLS Policies

```sql
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Scorekeepers can view stats for games they're assigned to
CREATE POLICY "Scorekeepers view assigned game stats"
  ON game_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_scorekeeper_assignments
      WHERE game_scorekeeper_assignments.game_id = game_stats.game_id
      AND game_scorekeeper_assignments.scorekeeper_id = auth.uid()
    )
  );

-- Scorekeepers can insert stats for assigned games
CREATE POLICY "Scorekeepers insert stats for assigned games"
  ON game_stats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_scorekeeper_assignments
      WHERE game_scorekeeper_assignments.game_id = game_stats.game_id
      AND game_scorekeeper_assignments.scorekeeper_id = auth.uid()
    )
  );

-- Scorekeepers can update their own entries (within 5 minutes)
CREATE POLICY "Scorekeepers update own recent stats"
  ON game_stats FOR UPDATE
  USING (
    entered_by = auth.uid()
    AND created_at > NOW() - INTERVAL '5 minutes'
  );

-- Scorekeepers can delete their own entries (within 5 minutes)
CREATE POLICY "Scorekeepers delete own recent stats"
  ON game_stats FOR DELETE
  USING (
    entered_by = auth.uid()
    AND created_at > NOW() - INTERVAL '5 minutes'
  );

-- League members can view stats for their league's games
CREATE POLICY "League members view league stats"
  ON game_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_memberships.league_id = game_stats.league_id
      AND league_memberships.user_id = auth.uid()
      AND league_memberships.status = 'active'
    )
  );

-- League admins can update/delete any stats
CREATE POLICY "League admins manage stats"
  ON game_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_memberships.league_id = game_stats.league_id
      AND league_memberships.user_id = auth.uid()
      AND league_memberships.role IN ('owner', 'admin')
    )
  );
```

### Triggers

```sql
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_game_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_stats_updated_at
  BEFORE UPDATE ON game_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_game_stats_updated_at();
```

---

## 🔗 Related Tables Already Created by Agent 1

These should already exist (created by Agent 1 in scorekeeper migrations):

**✅ game_stat_entry_log** - Audit trail for stat entries
```sql
CREATE TABLE game_stat_entry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id),
  stat_id UUID REFERENCES game_stats(id),  -- Will work once game_stats exists
  scorekeeper_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  stat_type TEXT,
  player_id UUID REFERENCES profiles(id),
  period INTEGER,
  old_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** The `stat_id` foreign key in `game_stat_entry_log` will fail until `game_stats` table is created. You may need to add this constraint after creating `game_stats`.

---

## 🎯 What Agent 4 Needs

### Critical Fields for Scorekeeper System:
1. ✅ **game_id** - Which game
2. ✅ **player_id** - Which player
3. ✅ **team_id** - Which team
4. ✅ **league_id** - Which league (for RLS)
5. ✅ **stat_type** - Goal, Assist, Shot, PIM, etc.
6. ✅ **value** - For PIM (2, 4, 5, 10 minutes)
7. ✅ **period** - 1st, 2nd, 3rd, OT
8. ✅ **team_type** - 'home' or 'away'
9. ✅ **entered_by** - Scorekeeper who entered it
10. ✅ **timestamp** - When stat occurred

### Nice-to-Have Fields:
1. ⭐ **assist1_id, assist2_id** - Multi-point tracking for goals
2. ⭐ **period_time** - Exact time in period (e.g., "14:32")
3. ⭐ **is_power_play, is_short_handed, is_empty_net** - Special situations
4. ⭐ **verified_by, verified_at** - Captain verification

### Performance Requirements:
- ✅ Index on `(game_id, created_at)` for real-time queries
- ✅ Index on `(game_id, player_id, stat_type, period, created_at)` for duplicate detection
- ✅ RLS policies for scorekeeper access

---

## 📊 Query Patterns Agent 4 Uses

### 1. Real-Time Stat Summary (Every 2 seconds)
```sql
SELECT
  stat_type,
  team_type,
  COUNT(*) as count,
  SUM(value) as total_value
FROM game_stats
WHERE game_id = $1
GROUP BY stat_type, team_type;
```

### 2. Duplicate Detection (Before Insert)
```sql
SELECT id
FROM game_stats
WHERE game_id = $1
  AND player_id = $2
  AND stat_type = $3
  AND period = $4
  AND created_at > (NOW() - INTERVAL '30 seconds')
LIMIT 1;
```

### 3. Player Stats for Game
```sql
SELECT
  player_id,
  stat_type,
  COUNT(*) as count,
  SUM(value) as total
FROM game_stats
WHERE game_id = $1
  AND team_id = $2
GROUP BY player_id, stat_type;
```

### 4. Audit Trail
```sql
SELECT
  gs.*,
  p.full_name as player_name,
  e.full_name as entered_by_name
FROM game_stats gs
JOIN profiles p ON gs.player_id = p.id
LEFT JOIN profiles e ON gs.entered_by = e.id
WHERE game_id = $1
ORDER BY created_at DESC;
```

---

## ✅ Next Steps

**Agent 1 - Please:**
1. Create the `game_stats` table with the schema above
2. Create the indexes for performance
3. Add the RLS policies for security
4. Create the update trigger
5. Add the foreign key constraint to `game_stat_entry_log.stat_id` (if not already there)
6. Notify Agent 4 when complete

**Agent 4 - Will Then:**
1. Remove @ts-ignore comments from 3 files
2. Test real-time subscriptions
3. Verify duplicate detection works
4. Test offline sync with actual data
5. Add stat validation logic
6. Implement captain verification

---

## 🔗 References

- **Scorekeeper System Design:** `SCOREKEEPER_SYSTEM_DESIGN.md`
- **Agent 4 Implementation:**
  - `src/app/api/scorekeepers/submit-stat/route.ts`
  - `src/components/scorekeeper/StatSummary.tsx`
  - `src/lib/scorekeepers/stat-actions.ts`

---

**🚨 BLOCKER: Agent 4 cannot proceed with removing @ts-ignore comments until this table is created!**

**Estimated Time for Agent 1:** 30-60 minutes to create table + indexes + RLS policies

**Thank you, Agent 1!** 🙏
