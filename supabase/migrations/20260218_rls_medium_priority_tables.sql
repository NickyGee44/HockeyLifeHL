-- ==============================================================================
-- RLS POLICIES: MEDIUM PRIORITY CONFIG/METADATA TABLES (14 tables)
-- ==============================================================================
-- Purpose: Enable RLS and create policies for config/metadata tables
-- Agent: rls-medium
-- Date: February 18, 2026
-- Security Level: MEDIUM - Config and metadata tables with league-scoped access
--
-- Tables covered:
--   League-scoped:  league_awards, league_events, league_gallery,
--                   venue_availability, venue_blackout_dates, standings_config,
--                   schedule_constraint_configs, schedule_constraints,
--                   schedule_generation_log, schedule_templates
--   Team-scoped:    duty_types, duty_rotation_settings
--   Player-scoped:  season_opt_ins
--   Gallery child:  gallery_photos (scoped via league_gallery)
-- ==============================================================================

-- ==============================================================================
-- INVARIANTS ENFORCED BY THESE POLICIES:
-- ==============================================================================
-- 1. All authenticated reads require active league membership
-- 2. INSERT/UPDATE/DELETE restricted to league admins (league_admin, commissioner)
-- 3. Public display tables (awards, events, gallery) allow anon read for active leagues
-- 4. Team-scoped tables join through teams → league_memberships
-- 5. Player-scoped tables (season_opt_ins) allow self-management + admin override
-- 6. gallery_photos scoped through parent league_gallery table
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY ON ALL 14 TABLES
-- ==============================================================================

ALTER TABLE league_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_constraint_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_generation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_rotation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- STEP 2: LEAGUE_AWARDS (league_id, public display)
-- ==============================================================================

-- Anon/public can read awards for active leagues
CREATE POLICY IF NOT EXISTS "Anyone can view awards for active leagues"
  ON league_awards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_awards.league_id
        AND l.status = 'active'
    )
  );

COMMENT ON POLICY "Anyone can view awards for active leagues" ON league_awards IS
  'Public read access to awards for active leagues. Enables league-sites display without auth.';

-- League admins can create awards
CREATE POLICY IF NOT EXISTS "League admins can create awards"
  ON league_awards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_awards.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create awards" ON league_awards IS
  'Only league admins and commissioners can create award records.';

-- League admins can update awards
CREATE POLICY IF NOT EXISTS "League admins can update awards"
  ON league_awards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_awards.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update awards" ON league_awards IS
  'Only league admins and commissioners can modify award records.';

-- League admins can delete awards
CREATE POLICY IF NOT EXISTS "League admins can delete awards"
  ON league_awards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_awards.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete awards" ON league_awards IS
  'Only league admins and commissioners can delete award records.';

-- ==============================================================================
-- STEP 3: LEAGUE_EVENTS (league_id, public display)
-- ==============================================================================

-- Anon/public can read events for active leagues
CREATE POLICY IF NOT EXISTS "Anyone can view events for active leagues"
  ON league_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_events.league_id
        AND l.status = 'active'
    )
  );

COMMENT ON POLICY "Anyone can view events for active leagues" ON league_events IS
  'Public read access to events for active leagues. Enables league-sites calendar display.';

-- League admins can create events
CREATE POLICY IF NOT EXISTS "League admins can create events"
  ON league_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_events.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create events" ON league_events IS
  'Only league admins and commissioners can create league events.';

-- League admins can update events
CREATE POLICY IF NOT EXISTS "League admins can update events"
  ON league_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_events.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update events" ON league_events IS
  'Only league admins and commissioners can modify league events.';

-- League admins can delete events
CREATE POLICY IF NOT EXISTS "League admins can delete events"
  ON league_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_events.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete events" ON league_events IS
  'Only league admins and commissioners can delete league events.';

-- ==============================================================================
-- STEP 4: LEAGUE_GALLERY (league_id, public display)
-- ==============================================================================

-- Anon/public can read galleries for active leagues
CREATE POLICY IF NOT EXISTS "Anyone can view galleries for active leagues"
  ON league_gallery FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_gallery.league_id
        AND l.status = 'active'
    )
  );

COMMENT ON POLICY "Anyone can view galleries for active leagues" ON league_gallery IS
  'Public read access to galleries for active leagues. Enables league-sites photo gallery.';

-- League admins can create galleries
CREATE POLICY IF NOT EXISTS "League admins can create galleries"
  ON league_gallery FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_gallery.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create galleries" ON league_gallery IS
  'Only league admins and commissioners can create photo galleries.';

-- League admins can update galleries
CREATE POLICY IF NOT EXISTS "League admins can update galleries"
  ON league_gallery FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_gallery.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update galleries" ON league_gallery IS
  'Only league admins and commissioners can modify photo galleries.';

-- League admins can delete galleries
CREATE POLICY IF NOT EXISTS "League admins can delete galleries"
  ON league_gallery FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_gallery.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete galleries" ON league_gallery IS
  'Only league admins and commissioners can delete photo galleries.';

-- ==============================================================================
-- STEP 5: GALLERY_PHOTOS (scoped via gallery_id → league_gallery.league_id)
-- ==============================================================================
-- gallery_photos has NO league_id column. It has gallery_id FK → league_gallery.
-- All access scoped through the parent league_gallery table.

-- Anon/public can read photos for active leagues (via gallery → league)
CREATE POLICY IF NOT EXISTS "Anyone can view photos for active leagues"
  ON gallery_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_gallery lg
      INNER JOIN leagues l ON l.id = lg.league_id
      WHERE lg.id = gallery_photos.gallery_id
        AND l.status = 'active'
    )
  );

COMMENT ON POLICY "Anyone can view photos for active leagues" ON gallery_photos IS
  'Public read access to photos in galleries of active leagues. Joins through league_gallery to leagues.';

-- League admins can create photos
CREATE POLICY IF NOT EXISTS "League admins can create gallery photos"
  ON gallery_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_gallery lg
      INNER JOIN league_memberships lm ON lm.league_id = lg.league_id
      WHERE lg.id = gallery_photos.gallery_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create gallery photos" ON gallery_photos IS
  'Only league admins can add photos to galleries. Scoped through league_gallery parent.';

-- League admins can update photos
CREATE POLICY IF NOT EXISTS "League admins can update gallery photos"
  ON gallery_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_gallery lg
      INNER JOIN league_memberships lm ON lm.league_id = lg.league_id
      WHERE lg.id = gallery_photos.gallery_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update gallery photos" ON gallery_photos IS
  'Only league admins can modify photo captions/ordering. Scoped through league_gallery parent.';

-- League admins can delete photos
CREATE POLICY IF NOT EXISTS "League admins can delete gallery photos"
  ON gallery_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_gallery lg
      INNER JOIN league_memberships lm ON lm.league_id = lg.league_id
      WHERE lg.id = gallery_photos.gallery_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete gallery photos" ON gallery_photos IS
  'Only league admins can delete photos from galleries. Scoped through league_gallery parent.';

-- ==============================================================================
-- STEP 6: VENUE_AVAILABILITY (league_id)
-- ==============================================================================

-- League members can read venue availability
CREATE POLICY IF NOT EXISTS "League members can view venue availability"
  ON venue_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = venue_availability.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League members can view venue availability" ON venue_availability IS
  'Active league members can view venue availability windows for scheduling.';

-- League admins can create venue availability
CREATE POLICY IF NOT EXISTS "League admins can create venue availability"
  ON venue_availability FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = venue_availability.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create venue availability" ON venue_availability IS
  'Only league admins can define venue availability windows.';

-- League admins can update venue availability
CREATE POLICY IF NOT EXISTS "League admins can update venue availability"
  ON venue_availability FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = venue_availability.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update venue availability" ON venue_availability IS
  'Only league admins can modify venue availability windows.';

-- League admins can delete venue availability
CREATE POLICY IF NOT EXISTS "League admins can delete venue availability"
  ON venue_availability FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = venue_availability.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete venue availability" ON venue_availability IS
  'Only league admins can remove venue availability windows.';

-- ==============================================================================
-- STEP 7: VENUE_BLACKOUT_DATES (league_id)
-- ==============================================================================

-- League members can read venue blackout dates
CREATE POLICY IF NOT EXISTS "League members can view venue blackout dates"
  ON venue_blackout_dates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = venue_blackout_dates.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League members can view venue blackout dates" ON venue_blackout_dates IS
  'Active league members can view venue blackout dates for scheduling awareness.';

-- League admins can create venue blackout dates
CREATE POLICY IF NOT EXISTS "League admins can create venue blackout dates"
  ON venue_blackout_dates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = venue_blackout_dates.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create venue blackout dates" ON venue_blackout_dates IS
  'Only league admins can define venue blackout dates.';

-- League admins can update venue blackout dates
CREATE POLICY IF NOT EXISTS "League admins can update venue blackout dates"
  ON venue_blackout_dates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = venue_blackout_dates.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update venue blackout dates" ON venue_blackout_dates IS
  'Only league admins can modify venue blackout dates.';

-- League admins can delete venue blackout dates
CREATE POLICY IF NOT EXISTS "League admins can delete venue blackout dates"
  ON venue_blackout_dates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = venue_blackout_dates.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete venue blackout dates" ON venue_blackout_dates IS
  'Only league admins can remove venue blackout dates.';

-- ==============================================================================
-- STEP 8: STANDINGS_CONFIG (league_id, season_id)
-- ==============================================================================

-- League members can read standings config
CREATE POLICY IF NOT EXISTS "League members can view standings config"
  ON standings_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = standings_config.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League members can view standings config" ON standings_config IS
  'Active league members can view standings point system configuration.';

-- League admins can create standings config
CREATE POLICY IF NOT EXISTS "League admins can create standings config"
  ON standings_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = standings_config.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create standings config" ON standings_config IS
  'Only league admins can create standings configuration records.';

-- League admins can update standings config
CREATE POLICY IF NOT EXISTS "League admins can update standings config"
  ON standings_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = standings_config.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update standings config" ON standings_config IS
  'Only league admins can modify standings point values and tiebreakers.';

-- League admins can delete standings config
CREATE POLICY IF NOT EXISTS "League admins can delete standings config"
  ON standings_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = standings_config.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete standings config" ON standings_config IS
  'Only league admins can delete standings configuration records.';

-- ==============================================================================
-- STEP 9: SCHEDULE_CONSTRAINT_CONFIGS (league_id, season_id)
-- ==============================================================================

-- League members can read schedule constraint configs
CREATE POLICY IF NOT EXISTS "League members can view schedule constraint configs"
  ON schedule_constraint_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_constraint_configs.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League members can view schedule constraint configs" ON schedule_constraint_configs IS
  'Active league members can view schedule constraint configuration.';

-- League admins can create schedule constraint configs
CREATE POLICY IF NOT EXISTS "League admins can create schedule constraint configs"
  ON schedule_constraint_configs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_constraint_configs.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create schedule constraint configs" ON schedule_constraint_configs IS
  'Only league admins can create schedule constraint configurations.';

-- League admins can update schedule constraint configs
CREATE POLICY IF NOT EXISTS "League admins can update schedule constraint configs"
  ON schedule_constraint_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_constraint_configs.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update schedule constraint configs" ON schedule_constraint_configs IS
  'Only league admins can modify schedule constraint configurations.';

-- League admins can delete schedule constraint configs
CREATE POLICY IF NOT EXISTS "League admins can delete schedule constraint configs"
  ON schedule_constraint_configs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_constraint_configs.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete schedule constraint configs" ON schedule_constraint_configs IS
  'Only league admins can delete schedule constraint configurations.';

-- ==============================================================================
-- STEP 10: SCHEDULE_CONSTRAINTS (league_id, season_id, team_id)
-- ==============================================================================

-- League members can read schedule constraints
CREATE POLICY IF NOT EXISTS "League members can view schedule constraints"
  ON schedule_constraints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_constraints.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League members can view schedule constraints" ON schedule_constraints IS
  'Active league members can view schedule constraints for their league.';

-- League admins can create schedule constraints
CREATE POLICY IF NOT EXISTS "League admins can create schedule constraints"
  ON schedule_constraints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_constraints.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create schedule constraints" ON schedule_constraints IS
  'Only league admins can create schedule constraints.';

-- League admins can update schedule constraints
CREATE POLICY IF NOT EXISTS "League admins can update schedule constraints"
  ON schedule_constraints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_constraints.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update schedule constraints" ON schedule_constraints IS
  'Only league admins can modify schedule constraints.';

-- League admins can delete schedule constraints
CREATE POLICY IF NOT EXISTS "League admins can delete schedule constraints"
  ON schedule_constraints FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_constraints.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete schedule constraints" ON schedule_constraints IS
  'Only league admins can delete schedule constraints.';

-- ==============================================================================
-- STEP 11: SCHEDULE_GENERATION_LOG (league_id)
-- ==============================================================================

-- League members can read schedule generation logs
CREATE POLICY IF NOT EXISTS "League members can view schedule generation logs"
  ON schedule_generation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_generation_log.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League members can view schedule generation logs" ON schedule_generation_log IS
  'Active league members can view schedule generation audit trail.';

-- League admins can create schedule generation logs
CREATE POLICY IF NOT EXISTS "League admins can create schedule generation logs"
  ON schedule_generation_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_generation_log.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create schedule generation logs" ON schedule_generation_log IS
  'Only league admins can create schedule generation log entries (via schedule generation).';

-- League admins can update schedule generation logs
CREATE POLICY IF NOT EXISTS "League admins can update schedule generation logs"
  ON schedule_generation_log FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_generation_log.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update schedule generation logs" ON schedule_generation_log IS
  'Only league admins can update schedule generation log status.';

-- League admins can delete schedule generation logs
CREATE POLICY IF NOT EXISTS "League admins can delete schedule generation logs"
  ON schedule_generation_log FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_generation_log.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete schedule generation logs" ON schedule_generation_log IS
  'Only league admins can delete schedule generation log entries.';

-- ==============================================================================
-- STEP 12: SCHEDULE_TEMPLATES (league_id)
-- ==============================================================================

-- League members can read schedule templates
CREATE POLICY IF NOT EXISTS "League members can view schedule templates"
  ON schedule_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_templates.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League members can view schedule templates" ON schedule_templates IS
  'Active league members can view saved schedule templates.';

-- League admins can create schedule templates
CREATE POLICY IF NOT EXISTS "League admins can create schedule templates"
  ON schedule_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_templates.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create schedule templates" ON schedule_templates IS
  'Only league admins can create schedule templates.';

-- League admins can update schedule templates
CREATE POLICY IF NOT EXISTS "League admins can update schedule templates"
  ON schedule_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_templates.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update schedule templates" ON schedule_templates IS
  'Only league admins can modify schedule templates.';

-- League admins can delete schedule templates
CREATE POLICY IF NOT EXISTS "League admins can delete schedule templates"
  ON schedule_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = schedule_templates.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete schedule templates" ON schedule_templates IS
  'Only league admins can delete schedule templates.';

-- ==============================================================================
-- STEP 13: DUTY_TYPES (team_id → teams.league_id)
-- ==============================================================================
-- duty_types has team_id but NO league_id. Must join through teams.

-- League members can read duty types for their league's teams
CREATE POLICY IF NOT EXISTS "League members can view duty types"
  ON duty_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = duty_types.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League members can view duty types" ON duty_types IS
  'Active league members can view duty types for teams in their league. Joins through teams to league_memberships.';

-- League admins can create duty types
CREATE POLICY IF NOT EXISTS "League admins can create duty types"
  ON duty_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = duty_types.team_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create duty types" ON duty_types IS
  'Only league admins can create duty types for teams. Scoped through teams to league.';

-- League admins can update duty types
CREATE POLICY IF NOT EXISTS "League admins can update duty types"
  ON duty_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = duty_types.team_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update duty types" ON duty_types IS
  'Only league admins can modify duty types. Scoped through teams to league.';

-- League admins can delete duty types
CREATE POLICY IF NOT EXISTS "League admins can delete duty types"
  ON duty_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = duty_types.team_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete duty types" ON duty_types IS
  'Only league admins can delete duty types. Scoped through teams to league.';

-- ==============================================================================
-- STEP 14: DUTY_ROTATION_SETTINGS (team_id → teams.league_id)
-- ==============================================================================
-- duty_rotation_settings has team_id but NO league_id. Must join through teams.

-- League members can read duty rotation settings for their league's teams
CREATE POLICY IF NOT EXISTS "League members can view duty rotation settings"
  ON duty_rotation_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = duty_rotation_settings.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League members can view duty rotation settings" ON duty_rotation_settings IS
  'Active league members can view duty rotation settings. Joins through teams to league_memberships.';

-- League admins can create duty rotation settings
CREATE POLICY IF NOT EXISTS "League admins can create duty rotation settings"
  ON duty_rotation_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = duty_rotation_settings.team_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can create duty rotation settings" ON duty_rotation_settings IS
  'Only league admins can create duty rotation settings. Scoped through teams to league.';

-- League admins can update duty rotation settings
CREATE POLICY IF NOT EXISTS "League admins can update duty rotation settings"
  ON duty_rotation_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = duty_rotation_settings.team_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can update duty rotation settings" ON duty_rotation_settings IS
  'Only league admins can modify duty rotation settings. Scoped through teams to league.';

-- League admins can delete duty rotation settings
CREATE POLICY IF NOT EXISTS "League admins can delete duty rotation settings"
  ON duty_rotation_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = duty_rotation_settings.team_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete duty rotation settings" ON duty_rotation_settings IS
  'Only league admins can delete duty rotation settings. Scoped through teams to league.';

-- ==============================================================================
-- STEP 15: SEASON_OPT_INS (player_id, season_id → seasons.league_id)
-- ==============================================================================
-- season_opt_ins has player_id and season_id but NO league_id.
-- Players can manage their own opt-ins; league admins can manage all.

-- Players can view their own opt-ins
CREATE POLICY IF NOT EXISTS "Players can view their own season opt-ins"
  ON season_opt_ins FOR SELECT
  USING (
    -- Own opt-ins
    player_id = auth.uid()
    OR
    -- League admins can view all opt-ins in their league
    EXISTS (
      SELECT 1 FROM seasons s
      INNER JOIN league_memberships lm ON lm.league_id = s.league_id
      WHERE s.id = season_opt_ins.season_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "Players can view their own season opt-ins" ON season_opt_ins IS
  'Players can view their own opt-ins. League members can view all opt-ins for league seasons.';

-- Players can create their own opt-ins
CREATE POLICY IF NOT EXISTS "Players can create their own season opt-ins"
  ON season_opt_ins FOR INSERT
  WITH CHECK (
    -- Own opt-ins
    player_id = auth.uid()
    OR
    -- League admins can create opt-ins for any player
    EXISTS (
      SELECT 1 FROM seasons s
      INNER JOIN league_memberships lm ON lm.league_id = s.league_id
      WHERE s.id = season_opt_ins.season_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "Players can create their own season opt-ins" ON season_opt_ins IS
  'Players can opt into seasons themselves. League admins can create opt-ins for any player.';

-- Players can update their own opt-ins
CREATE POLICY IF NOT EXISTS "Players can update their own season opt-ins"
  ON season_opt_ins FOR UPDATE
  USING (
    -- Own opt-ins
    player_id = auth.uid()
    OR
    -- League admins can update any opt-in
    EXISTS (
      SELECT 1 FROM seasons s
      INNER JOIN league_memberships lm ON lm.league_id = s.league_id
      WHERE s.id = season_opt_ins.season_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "Players can update their own season opt-ins" ON season_opt_ins IS
  'Players can update their own opt-in status. League admins can update any opt-in.';

-- Only league admins can delete opt-ins
CREATE POLICY IF NOT EXISTS "League admins can delete season opt-ins"
  ON season_opt_ins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM seasons s
      INNER JOIN league_memberships lm ON lm.league_id = s.league_id
      WHERE s.id = season_opt_ins.season_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "League admins can delete season opt-ins" ON season_opt_ins IS
  'Only league admins can delete season opt-in records. Players cannot delete their own (use update to change status instead).';

-- ==============================================================================
-- STEP 16: VERIFICATION
-- ==============================================================================

DO $$
DECLARE
  tbl TEXT;
  has_rls BOOLEAN;
  policy_count INT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'league_awards', 'league_events', 'league_gallery', 'gallery_photos',
      'venue_availability', 'venue_blackout_dates', 'standings_config',
      'schedule_constraint_configs', 'schedule_constraints',
      'schedule_generation_log', 'schedule_templates',
      'duty_types', 'duty_rotation_settings', 'season_opt_ins'
    ])
  LOOP
    -- Check RLS is enabled
    SELECT relrowsecurity INTO has_rls
    FROM pg_class
    WHERE relname = tbl AND relnamespace = 'public'::regnamespace;

    IF NOT has_rls THEN
      RAISE EXCEPTION 'RLS not enabled on table: %', tbl;
    END IF;

    -- Check policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = tbl AND schemaname = 'public';

    IF policy_count < 3 THEN
      RAISE EXCEPTION 'Insufficient policies on table: % (found %, expected >= 3)', tbl, policy_count;
    END IF;

    RAISE NOTICE 'VERIFIED: % has RLS enabled with % policies', tbl, policy_count;
  END LOOP;

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'ALL 14 MEDIUM PRIORITY TABLES VERIFIED SUCCESSFULLY';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;
