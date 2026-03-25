-- ==============================================================================
-- RLS MIGRATION: HIGH PRIORITY TABLES (7 tables)
-- ==============================================================================
-- Tables: game_duties, game_officials, game_submissions, league_staff,
--         player_availability, team_invites, team_registration_requests
-- Severity: HIGH - Operational data exposed without tenant isolation
-- Date: 2026-02-18
-- ==============================================================================

-- ==============================================================================
-- 1. ENABLE ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE game_duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_registration_requests ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. game_duties POLICIES
-- ==============================================================================
-- Columns: id, game_id, team_id, duty_type_id, assigned_player_id, status, notes
-- Scope: game_id -> games.league_id

-- SELECT: league members (via games.league_id)
CREATE POLICY IF NOT EXISTS "game_duties_select_league_members"
  ON game_duties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_duties.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "game_duties_select_league_members" ON game_duties IS
  'League members can view game duty assignments for games in their league.';

-- INSERT: league admins or team captains
CREATE POLICY IF NOT EXISTS "game_duties_insert_admins_captains"
  ON game_duties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_duties.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
    OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = game_duties.team_id
        AND t.captain_id = auth.uid()
    )
  );

COMMENT ON POLICY "game_duties_insert_admins_captains" ON game_duties IS
  'League admins and team captains can create game duty assignments.';

-- UPDATE: league admins or team captains
CREATE POLICY IF NOT EXISTS "game_duties_update_admins_captains"
  ON game_duties FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_duties.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
    OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = game_duties.team_id
        AND t.captain_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_duties.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
    OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = game_duties.team_id
        AND t.captain_id = auth.uid()
    )
  );

COMMENT ON POLICY "game_duties_update_admins_captains" ON game_duties IS
  'League admins and team captains can update game duty assignments.';

-- DELETE: league admins only
CREATE POLICY IF NOT EXISTS "game_duties_delete_admins"
  ON game_duties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_duties.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "game_duties_delete_admins" ON game_duties IS
  'Only league admins can delete game duty assignments.';

-- ==============================================================================
-- 3. game_officials POLICIES
-- ==============================================================================
-- Columns: id, game_id, name, role, jersey_number
-- Scope: game_id -> games.league_id

-- SELECT: league members OR anon if league is active
CREATE POLICY IF NOT EXISTS "game_officials_select_league_members"
  ON game_officials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_officials.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "game_officials_select_league_members" ON game_officials IS
  'League members can view officials assigned to games in their league.';

-- SELECT for anon: only if league is active (public league sites)
CREATE POLICY IF NOT EXISTS "game_officials_select_anon_active_league"
  ON game_officials FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN leagues l ON l.id = g.league_id
      WHERE g.id = game_officials.game_id
        AND l.status = 'active'
    )
  );

COMMENT ON POLICY "game_officials_select_anon_active_league" ON game_officials IS
  'Anonymous users can view officials for games in active leagues (public league sites).';

-- INSERT: league admins only
CREATE POLICY IF NOT EXISTS "game_officials_insert_admins"
  ON game_officials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_officials.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "game_officials_insert_admins" ON game_officials IS
  'Only league admins can assign officials to games.';

-- UPDATE: league admins only
CREATE POLICY IF NOT EXISTS "game_officials_update_admins"
  ON game_officials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_officials.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_officials.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "game_officials_update_admins" ON game_officials IS
  'Only league admins can update game official assignments.';

-- DELETE: league admins only
CREATE POLICY IF NOT EXISTS "game_officials_delete_admins"
  ON game_officials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_officials.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "game_officials_delete_admins" ON game_officials IS
  'Only league admins can remove officials from games.';

-- ==============================================================================
-- 4. game_submissions POLICIES
-- ==============================================================================
-- Columns: id, game_id, league_id, submitted_by, status, scores, signatures...
-- Scope: league_id directly available

-- SELECT: league members
CREATE POLICY IF NOT EXISTS "game_submissions_select_league_members"
  ON game_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_submissions.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "game_submissions_select_league_members" ON game_submissions IS
  'League members can view game score submissions in their league.';

-- INSERT: scorekeepers (assigned to the game) or league admins
CREATE POLICY IF NOT EXISTS "game_submissions_insert_scorekeepers_admins"
  ON game_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_submissions.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
    OR
    EXISTS (
      SELECT 1 FROM game_scorekeeper_assignments gsa
      WHERE gsa.game_id = game_submissions.game_id
        AND gsa.scorekeeper_id = auth.uid()
    )
  );

COMMENT ON POLICY "game_submissions_insert_scorekeepers_admins" ON game_submissions IS
  'Scorekeepers assigned to the game and league admins can submit game scores.';

-- UPDATE: league admins only
CREATE POLICY IF NOT EXISTS "game_submissions_update_admins"
  ON game_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_submissions.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_submissions.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "game_submissions_update_admins" ON game_submissions IS
  'Only league admins can update game submissions (verify, resolve disputes).';

-- DELETE: league admins only
CREATE POLICY IF NOT EXISTS "game_submissions_delete_admins"
  ON game_submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_submissions.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "game_submissions_delete_admins" ON game_submissions IS
  'Only league admins can delete game submissions.';

-- ==============================================================================
-- 5. league_staff POLICIES
-- ==============================================================================
-- Columns: id, league_id, name, role_title, email, phone, bio, photo_url, ...
-- Scope: league_id directly available

-- SELECT: league members
CREATE POLICY IF NOT EXISTS "league_staff_select_league_members"
  ON league_staff FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_staff.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "league_staff_select_league_members" ON league_staff IS
  'League members can view staff directory for their league.';

-- INSERT: league admins only
CREATE POLICY IF NOT EXISTS "league_staff_insert_admins"
  ON league_staff FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_staff.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "league_staff_insert_admins" ON league_staff IS
  'Only league admins can add staff members.';

-- UPDATE: league admins only
CREATE POLICY IF NOT EXISTS "league_staff_update_admins"
  ON league_staff FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_staff.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_staff.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "league_staff_update_admins" ON league_staff IS
  'Only league admins can update staff member information.';

-- DELETE: league admins only
CREATE POLICY IF NOT EXISTS "league_staff_delete_admins"
  ON league_staff FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_staff.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "league_staff_delete_admins" ON league_staff IS
  'Only league admins can remove staff members.';

-- ==============================================================================
-- 6. player_availability POLICIES
-- ==============================================================================
-- Columns: id, game_id, player_id, season_id, team_id, status, reason, ...
-- Scope: team_id -> teams.league_id

-- SELECT: league members (via team's league)
CREATE POLICY IF NOT EXISTS "player_availability_select_league_members"
  ON player_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = player_availability.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

COMMENT ON POLICY "player_availability_select_league_members" ON player_availability IS
  'League members can view player availability for teams in their league.';

-- INSERT: the player themselves, captains, or league admins
CREATE POLICY IF NOT EXISTS "player_availability_insert_player_captain_admin"
  ON player_availability FOR INSERT
  WITH CHECK (
    -- The player themselves
    player_availability.player_id = auth.uid()
    OR
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = player_availability.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = player_availability.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "player_availability_insert_player_captain_admin" ON player_availability IS
  'Players can set their own availability. Captains and league admins can set availability for team members.';

-- UPDATE: the player themselves, captains, or league admins
CREATE POLICY IF NOT EXISTS "player_availability_update_player_captain_admin"
  ON player_availability FOR UPDATE
  USING (
    -- The player themselves
    player_availability.player_id = auth.uid()
    OR
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = player_availability.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = player_availability.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  )
  WITH CHECK (
    -- The player themselves
    player_availability.player_id = auth.uid()
    OR
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = player_availability.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = player_availability.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "player_availability_update_player_captain_admin" ON player_availability IS
  'Players can update their own availability. Captains and league admins can update availability for team members.';

-- DELETE: the player themselves or league admins
CREATE POLICY IF NOT EXISTS "player_availability_delete_player_admin"
  ON player_availability FOR DELETE
  USING (
    -- The player themselves
    player_availability.player_id = auth.uid()
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = player_availability.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "player_availability_delete_player_admin" ON player_availability IS
  'Players can delete their own availability. League admins can delete any availability record.';

-- ==============================================================================
-- 7. team_invites POLICIES
-- ==============================================================================
-- Columns: id, team_id, season_id, email, invite_token, invite_type,
--          invited_by, accepted_by, status, message, expires_at
-- Scope: team_id -> teams.league_id
-- Note: invited player matched by email (not user_id) since they may not have an account yet

-- SELECT: the invited player (by email), team captain, or league admins
CREATE POLICY IF NOT EXISTS "team_invites_select_invited_captain_admin"
  ON team_invites FOR SELECT
  USING (
    -- The invited player (match by email from their profile)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email = team_invites.email
    )
    OR
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_invites.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = team_invites.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "team_invites_select_invited_captain_admin" ON team_invites IS
  'Invited players (matched by email), team captains, and league admins can view team invites.';

-- INSERT: team captains or league admins
CREATE POLICY IF NOT EXISTS "team_invites_insert_captain_admin"
  ON team_invites FOR INSERT
  WITH CHECK (
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_invites.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = team_invites.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "team_invites_insert_captain_admin" ON team_invites IS
  'Team captains and league admins can create team invitations.';

-- UPDATE: invited player (accept/decline), captain, or league admins
CREATE POLICY IF NOT EXISTS "team_invites_update_invited_captain_admin"
  ON team_invites FOR UPDATE
  USING (
    -- The invited player (match by email)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email = team_invites.email
    )
    OR
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_invites.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = team_invites.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  )
  WITH CHECK (
    -- The invited player (match by email)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email = team_invites.email
    )
    OR
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_invites.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = team_invites.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "team_invites_update_invited_captain_admin" ON team_invites IS
  'Invited players can accept/decline invites. Captains and league admins can update invite status.';

-- DELETE: invited player, captain, or league admins
CREATE POLICY IF NOT EXISTS "team_invites_delete_invited_captain_admin"
  ON team_invites FOR DELETE
  USING (
    -- The invited player (match by email)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email = team_invites.email
    )
    OR
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_invites.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = team_invites.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "team_invites_delete_invited_captain_admin" ON team_invites IS
  'Invited players, captains, and league admins can delete team invitations.';

-- ==============================================================================
-- 8. team_registration_requests POLICIES
-- ==============================================================================
-- Columns: id, league_id, requester_id, team_name, team_short_name, status, ...
-- Scope: league_id directly available

-- SELECT: the requesting user or league admins
CREATE POLICY IF NOT EXISTS "team_reg_requests_select_requester_admin"
  ON team_registration_requests FOR SELECT
  USING (
    -- The requesting user
    team_registration_requests.requester_id = auth.uid()
    OR
    -- League admin
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_registration_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "team_reg_requests_select_requester_admin" ON team_registration_requests IS
  'Requesters can view their own registration requests. League admins can view all requests for their league.';

-- INSERT: any authenticated user
CREATE POLICY IF NOT EXISTS "team_reg_requests_insert_authenticated"
  ON team_registration_requests FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND team_registration_requests.requester_id = auth.uid()
  );

COMMENT ON POLICY "team_reg_requests_insert_authenticated" ON team_registration_requests IS
  'Any authenticated user can submit a team registration request. Requester must be the current user.';

-- UPDATE: league admins only
CREATE POLICY IF NOT EXISTS "team_reg_requests_update_admins"
  ON team_registration_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_registration_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_registration_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "team_reg_requests_update_admins" ON team_registration_requests IS
  'Only league admins can update registration requests (approve, deny, assign division).';

-- DELETE: league admins only
CREATE POLICY IF NOT EXISTS "team_reg_requests_delete_admins"
  ON team_registration_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_registration_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

COMMENT ON POLICY "team_reg_requests_delete_admins" ON team_registration_requests IS
  'Only league admins can delete team registration requests.';

-- ==============================================================================
-- 9. VERIFICATION
-- ==============================================================================

DO $$
DECLARE
  v_table TEXT;
  v_rls_enabled BOOLEAN;
  v_policy_count INT;
  v_tables TEXT[] := ARRAY[
    'game_duties',
    'game_officials',
    'game_submissions',
    'league_staff',
    'player_availability',
    'team_invites',
    'team_registration_requests'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    -- Check RLS is enabled
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = v_table AND relnamespace = 'public'::regnamespace;

    IF NOT v_rls_enabled THEN
      RAISE EXCEPTION 'RLS not enabled on %', v_table;
    END IF;

    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = v_table;

    IF v_policy_count = 0 THEN
      RAISE EXCEPTION 'No policies found on %', v_table;
    END IF;

    RAISE NOTICE 'OK: % — RLS enabled, % policies', v_table, v_policy_count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'HIGH priority RLS migration verified successfully (7 tables).';
END $$;
