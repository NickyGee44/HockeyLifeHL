-- ==============================================================================
-- Rating Engine: Player/Team Ratings + Division Balance Snapshots
-- Date: 2026-02-24
-- ==============================================================================

-- Extend existing player_ratings table
ALTER TABLE player_ratings
  ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id),
  ADD COLUMN IF NOT EXISTS raw_percentile DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS overall_percentile DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS stats_json JSONB DEFAULT '{}'::jsonb;

-- Ensure a player can have one rating per (league, season)
DO $$
DECLARE
  old_constraint_name text;
BEGIN
  SELECT c.conname
    INTO old_constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'player_ratings'
    AND c.contype = 'u'
    AND c.conname <> 'player_ratings_league_player_season_key'
    AND (
      SELECT array_agg(a.attname ORDER BY u.ord)
      FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum = u.attnum
    ) = ARRAY['player_id', 'season_id'];

  IF old_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.player_ratings DROP CONSTRAINT %I', old_constraint_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'player_ratings'
      AND c.conname = 'player_ratings_league_player_season_key'
      AND c.contype = 'u'
  ) THEN
    ALTER TABLE public.player_ratings
      ADD CONSTRAINT player_ratings_league_player_season_key
      UNIQUE (league_id, player_id, season_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_player_ratings_division
  ON player_ratings(division_id);

CREATE INDEX IF NOT EXISTS idx_player_ratings_overall_percentile
  ON player_ratings(league_id, season_id, overall_percentile DESC);

-- Team-level aggregate ratings
CREATE TABLE IF NOT EXISTS team_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id),
  overall_grade TEXT,
  overall_percentile DECIMAL(5,2),
  offense_rating DECIMAL(5,2),
  defense_rating DECIMAL(5,2),
  goaltending_rating DECIMAL(5,2),
  record_factor DECIMAL(5,2),
  roster_count INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, season_id)
);

-- Persisted division balance analysis snapshots
CREATE TABLE IF NOT EXISTS division_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  recommendations JSONB,
  balance_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE team_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE division_balance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can view player ratings" ON player_ratings;
DROP POLICY IF EXISTS "League admins can manage player ratings" ON player_ratings;
DROP POLICY IF EXISTS "Service role has full access to player ratings" ON player_ratings;

CREATE POLICY "Internal users can view player ratings"
  ON player_ratings FOR SELECT
  USING (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'captain')
    )
  );

CREATE POLICY "League admins can manage player ratings"
  ON player_ratings FOR ALL
  USING (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role has full access to player ratings"
  ON player_ratings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Internal users can view team ratings" ON team_ratings;
DROP POLICY IF EXISTS "League admins can manage team ratings" ON team_ratings;
DROP POLICY IF EXISTS "Service role has full access to team ratings" ON team_ratings;

CREATE POLICY "Internal users can view team ratings"
  ON team_ratings FOR SELECT
  USING (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'captain')
    )
  );

CREATE POLICY "League admins can manage team ratings"
  ON team_ratings FOR ALL
  USING (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role has full access to team ratings"
  ON team_ratings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "League owners can view division balance snapshots" ON division_balance_snapshots;
DROP POLICY IF EXISTS "League owners can manage division balance snapshots" ON division_balance_snapshots;
DROP POLICY IF EXISTS "Service role has full access to division balance snapshots" ON division_balance_snapshots;

CREATE POLICY "League owners can view division balance snapshots"
  ON division_balance_snapshots FOR SELECT
  USING (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'owner'
    )
  );

CREATE POLICY "League owners can manage division balance snapshots"
  ON division_balance_snapshots FOR ALL
  USING (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'owner'
    )
  )
  WITH CHECK (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'owner'
    )
  );

CREATE POLICY "Service role has full access to division balance snapshots"
  ON division_balance_snapshots FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_ratings_league
  ON team_ratings(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_team_ratings_division
  ON team_ratings(division_id);

CREATE INDEX IF NOT EXISTS idx_team_ratings_overall
  ON team_ratings(league_id, season_id, overall_percentile DESC);

CREATE INDEX IF NOT EXISTS idx_balance_snapshots_league
  ON division_balance_snapshots(league_id, season_id, created_at DESC);
