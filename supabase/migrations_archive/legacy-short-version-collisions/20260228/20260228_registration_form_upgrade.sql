-- ============================================================================
-- Registration Form Upgrade
-- 2026-02-28
--
-- 1. Add waiver_accepted flag to player_waivers
-- 2. Add registration_form_config JSONB to leagues
-- 3. Create team_registrations table for team rep submissions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. player_waivers: add waiver_accepted + waiver_accepted_at
-- ----------------------------------------------------------------------------
ALTER TABLE player_waivers
  ADD COLUMN IF NOT EXISTS waiver_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS waiver_accepted_at TIMESTAMPTZ;

-- Backfill: mark existing signed waivers as accepted (they already agreed)
UPDATE player_waivers
  SET waiver_accepted = TRUE,
      waiver_accepted_at = agreed_at
  WHERE agreed_at IS NOT NULL AND waiver_accepted = FALSE;

-- ----------------------------------------------------------------------------
-- 2. leagues: add registration_form_config JSONB
-- Shape: {
--   "levels": ["A", "B", "C", "Recreational"],
--   "locations": ["Main Arena"],
--   "nights": ["Monday", "Wednesday", "Friday", "Sunday"],
--   "enabled_fields": {
--     "played_last_season": true,
--     "level": true,
--     "location_preference": true,
--     "preferred_night": true,
--     "referral_source": true,
--     "paid_team_rep": true
--   }
-- }
-- ----------------------------------------------------------------------------
ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS registration_form_config JSONB NOT NULL DEFAULT '{}';

-- ----------------------------------------------------------------------------
-- 3. team_registrations: team rep registration submissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id           UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id           UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  submitted_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Team info
  team_name           TEXT NOT NULL,
  level               TEXT,
  played_last_season  BOOLEAN,
  team_last_season    TEXT,

  -- Contact
  backup_rep_name     TEXT,
  backup_rep_email    TEXT,

  -- Preferences
  location_preference TEXT,
  preferred_day       TEXT,
  alternate_day       TEXT,
  comments            TEXT,

  -- Waiver
  waiver_accepted     BOOLEAN NOT NULL DEFAULT FALSE,
  waiver_accepted_at  TIMESTAMPTZ,
  waiver_version      TEXT,

  -- Admin
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted', 'cancelled')),
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  review_notes        TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for league admin queries
CREATE INDEX IF NOT EXISTS idx_team_registrations_league_id ON team_registrations(league_id);
CREATE INDEX IF NOT EXISTS idx_team_registrations_season_id ON team_registrations(season_id);
CREATE INDEX IF NOT EXISTS idx_team_registrations_submitted_by ON team_registrations(submitted_by);
CREATE INDEX IF NOT EXISTS idx_team_registrations_status ON team_registrations(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_team_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_registrations_updated_at ON team_registrations;
CREATE TRIGGER team_registrations_updated_at
  BEFORE UPDATE ON team_registrations
  FOR EACH ROW EXECUTE FUNCTION update_team_registrations_updated_at();

-- ----------------------------------------------------------------------------
-- RLS for team_registrations
-- ----------------------------------------------------------------------------
ALTER TABLE team_registrations ENABLE ROW LEVEL SECURITY;

-- Submitters can see their own submissions
CREATE POLICY "team_registrations_select_own"
  ON team_registrations FOR SELECT
  USING (submitted_by = auth.uid());

-- Submitters can insert their own submissions
CREATE POLICY "team_registrations_insert_own"
  ON team_registrations FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- League admins/owners can see all submissions for their leagues
CREATE POLICY "team_registrations_select_admin"
  ON team_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_registrations.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin', 'commissioner')
    )
  );

-- League admins/owners can update (approve/reject) submissions
CREATE POLICY "team_registrations_update_admin"
  ON team_registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_registrations.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin', 'commissioner')
    )
  );
