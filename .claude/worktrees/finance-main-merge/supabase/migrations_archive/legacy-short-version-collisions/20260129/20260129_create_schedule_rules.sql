-- ==============================================================================
-- BMHL SCHEDULING RULES MIGRATION
-- ==============================================================================
-- Description: Creates schedule_rules table for conflict detection
-- Purpose: Store game timing rules, blackout dates, and scheduling constraints
-- Author: BMHL Implementation - Phase 1A
-- Date: January 29, 2026
-- Related: BMHL_GAP_ANALYSIS.md (P0.2 - Scheduling v1)
-- ==============================================================================

-- ==============================================================================
-- TABLE: schedule_rules
-- ==============================================================================
-- Purpose: Define scheduling rules per league/season for conflict detection
-- Multi-tenant: Scoped by league_id

CREATE TABLE IF NOT EXISTS schedule_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,

  -- Game timing rules
  game_duration_minutes INTEGER DEFAULT 60 CHECK (game_duration_minutes > 0),
  buffer_minutes INTEGER DEFAULT 15 CHECK (buffer_minutes >= 0),
  -- Time between games at same venue to allow ice resurfacing, etc.

  -- Team scheduling rules
  min_hours_between_games INTEGER DEFAULT 24 CHECK (min_hours_between_games >= 0),
  -- Prevent back-to-back scheduling abuse (e.g., team can't play twice in 24 hours)

  max_games_per_week INTEGER DEFAULT 3 CHECK (max_games_per_week > 0),
  -- Maximum games a team can play per week

  max_games_per_day INTEGER DEFAULT 1 CHECK (max_games_per_day > 0),
  -- Maximum games a team can play per day (usually 1, but some leagues allow 2)

  -- Venue rules (optional - NULL means all venues allowed)
  allowed_venue_ids UUID[], -- Array of venue IDs allowed for scheduling

  -- Blackout dates (dates when no games can be scheduled)
  blackout_dates JSONB DEFAULT '[]'::jsonb,
  -- Format: [{"date": "2026-12-25", "reason": "Christmas"}, ...]

  -- Preferred scheduling windows
  preferred_start_times JSONB DEFAULT '[]'::jsonb,
  -- Format: [{"day": "monday", "start": "18:00", "end": "22:00"}, ...]

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  UNIQUE(league_id, season_id)
  -- One set of rules per league/season combination
);

-- Indexes for performance
CREATE INDEX idx_schedule_rules_league_id ON schedule_rules(league_id);
CREATE INDEX idx_schedule_rules_season_id ON schedule_rules(season_id);
CREATE INDEX idx_schedule_rules_league_season ON schedule_rules(league_id, season_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_schedule_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedule_rules_updated_at
  BEFORE UPDATE ON schedule_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_rules_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE schedule_rules ENABLE ROW LEVEL SECURITY;

-- Users can view rules for leagues they belong to
DROP POLICY IF EXISTS "Users can view schedule rules for their leagues" ON schedule_rules;
CREATE POLICY "Users can view schedule rules for their leagues"
  ON schedule_rules FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- League owners/admins can manage schedule rules
DROP POLICY IF EXISTS "League admins can manage schedule rules" ON schedule_rules;
CREATE POLICY "League admins can manage schedule rules"
  ON schedule_rules FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Service role has full access
DROP POLICY IF EXISTS "Service role has full access to schedule rules" ON schedule_rules;
CREATE POLICY "Service role has full access to schedule rules"
  ON schedule_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- SEED DEFAULT RULES FOR EXISTING LEAGUES
-- ==============================================================================
-- Insert default schedule rules for leagues that don't have them yet

INSERT INTO schedule_rules (league_id, season_id, game_duration_minutes, buffer_minutes, min_hours_between_games, max_games_per_week, max_games_per_day)
SELECT
  l.id as league_id,
  NULL as season_id, -- NULL = applies to all seasons
  60 as game_duration_minutes,
  15 as buffer_minutes,
  24 as min_hours_between_games,
  3 as max_games_per_week,
  1 as max_games_per_day
FROM leagues l
WHERE NOT EXISTS (
  SELECT 1 FROM schedule_rules sr
  WHERE sr.league_id = l.id
  AND sr.season_id IS NULL
)
AND l.status = 'active';

-- ==============================================================================
-- GRANT PERMISSIONS
-- ==============================================================================

GRANT SELECT ON schedule_rules TO authenticated;
GRANT ALL ON schedule_rules TO service_role;

-- ==============================================================================
-- MIGRATION VERIFICATION
-- ==============================================================================

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule_rules') THEN
    RAISE EXCEPTION 'Migration failed: schedule_rules table not created';
  END IF;

  RAISE NOTICE 'Migration completed successfully: schedule_rules table created';
END $$;
