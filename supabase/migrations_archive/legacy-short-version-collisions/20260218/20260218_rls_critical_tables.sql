-- =============================================================================
-- CRITICAL Security Fix: Enable RLS on 5 core tables with no tenant isolation
-- =============================================================================
-- Tables: game_events, game_checkins, league_billing_settings,
--         league_ownerships, scorekeeper_sessions
-- Severity: CRITICAL — any authenticated user can read/write every row
-- Without these policies, multi-tenant data leaks across leagues
-- =============================================================================

-- =============================================================================
-- 1. Enable Row Level Security on all 5 tables
-- =============================================================================

ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorekeeper_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. game_events RLS Policies
-- =============================================================================
-- game_events has league_id directly.
-- Public read for active leagues (league-sites), member read, admin/scorekeeper write.

-- SELECT: league members OR anyone if league is active (public game data)
CREATE POLICY "game_events_select_member_or_public"
  ON game_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_events.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = game_events.league_id
        AND l.status = 'active'
    )
  );

-- INSERT: league admins or scorekeepers only
CREATE POLICY "game_events_insert_admin_or_scorekeeper"
  ON game_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_events.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner', 'scorekeeper')
        AND lm.status = 'active'
    )
  );

-- UPDATE: league admins only
CREATE POLICY "game_events_update_admin"
  ON game_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_events.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- DELETE: league admins only
CREATE POLICY "game_events_delete_admin"
  ON game_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_events.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- =============================================================================
-- 3. game_checkins RLS Policies
-- =============================================================================
-- game_checkins does NOT have league_id — must join through games table.
-- Public read for active leagues (league-sites attendance display).

-- SELECT: league members (via games table) OR anyone if league is active
CREATE POLICY "game_checkins_select_member_or_public"
  ON game_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_checkins.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN leagues l ON l.id = g.league_id
      WHERE g.id = game_checkins.game_id
        AND l.status = 'active'
    )
  );

-- INSERT: the player checking themselves in, captains, or league admins
CREATE POLICY "game_checkins_insert_player_captain_admin"
  ON game_checkins FOR INSERT
  WITH CHECK (
    -- Player checking themselves in
    (
      game_checkins.player_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM games g
        INNER JOIN league_memberships lm ON lm.league_id = g.league_id
        WHERE g.id = game_checkins.game_id
          AND lm.user_id = auth.uid()
          AND lm.status = 'active'
      )
    )
    OR
    -- Captains or league admins
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_checkins.game_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner', 'captain')
        AND lm.status = 'active'
    )
  );

-- UPDATE: the player themselves, captains, or league admins
CREATE POLICY "game_checkins_update_player_captain_admin"
  ON game_checkins FOR UPDATE
  USING (
    -- Player updating their own checkin
    (
      game_checkins.player_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM games g
        INNER JOIN league_memberships lm ON lm.league_id = g.league_id
        WHERE g.id = game_checkins.game_id
          AND lm.user_id = auth.uid()
          AND lm.status = 'active'
      )
    )
    OR
    -- Captains or league admins
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_checkins.game_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner', 'captain')
        AND lm.status = 'active'
    )
  );

-- DELETE: league admins only
CREATE POLICY "game_checkins_delete_admin"
  ON game_checkins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = game_checkins.game_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- =============================================================================
-- 4. league_billing_settings RLS Policies
-- =============================================================================
-- Sensitive financial data — admin-only access. NO public read.

-- SELECT: league admins only
CREATE POLICY "league_billing_settings_select_admin"
  ON league_billing_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_billing_settings.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- INSERT: league admins only
CREATE POLICY "league_billing_settings_insert_admin"
  ON league_billing_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_billing_settings.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- UPDATE: league admins only
CREATE POLICY "league_billing_settings_update_admin"
  ON league_billing_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_billing_settings.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- DELETE: league admins only
CREATE POLICY "league_billing_settings_delete_admin"
  ON league_billing_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_billing_settings.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- =============================================================================
-- 5. league_ownerships RLS Policies
-- =============================================================================
-- Maps leagues to organizations. Org-level scoping required.
-- league_ownerships has: league_id, organization_id, user_id

-- SELECT: organization members OR league members
CREATE POLICY "league_ownerships_select_org_or_league_member"
  ON league_ownerships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = league_ownerships.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_ownerships.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

-- INSERT: organization owners/admins only
CREATE POLICY "league_ownerships_insert_org_owner"
  ON league_ownerships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = league_ownerships.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- UPDATE: organization owners/admins only
CREATE POLICY "league_ownerships_update_org_owner"
  ON league_ownerships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = league_ownerships.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- DELETE: organization owners/admins only
CREATE POLICY "league_ownerships_delete_org_owner"
  ON league_ownerships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = league_ownerships.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- =============================================================================
-- 6. scorekeeper_sessions RLS Policies
-- =============================================================================
-- Contains auth tokens — HIGH sensitivity. Restrict to scorekeeper + admins.
-- scorekeeper_sessions has: league_id, scorekeeper_id, created_by

-- SELECT: the scorekeeper themselves OR league admins
CREATE POLICY "scorekeeper_sessions_select_scorekeeper_or_admin"
  ON scorekeeper_sessions FOR SELECT
  USING (
    scorekeeper_sessions.scorekeeper_id = auth.uid()
    OR
    scorekeeper_sessions.created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = scorekeeper_sessions.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- INSERT: league admins or the assigned scorekeeper
CREATE POLICY "scorekeeper_sessions_insert_admin_or_scorekeeper"
  ON scorekeeper_sessions FOR INSERT
  WITH CHECK (
    scorekeeper_sessions.created_by = auth.uid()
    AND (
      -- The scorekeeper creating their own session
      scorekeeper_sessions.scorekeeper_id = auth.uid()
      OR
      -- A league admin creating a session for someone
      EXISTS (
        SELECT 1 FROM league_memberships lm
        WHERE lm.league_id = scorekeeper_sessions.league_id
          AND lm.user_id = auth.uid()
          AND lm.role IN ('league_admin', 'commissioner')
          AND lm.status = 'active'
      )
    )
  );

-- UPDATE: the scorekeeper themselves OR league admins
CREATE POLICY "scorekeeper_sessions_update_scorekeeper_or_admin"
  ON scorekeeper_sessions FOR UPDATE
  USING (
    scorekeeper_sessions.scorekeeper_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = scorekeeper_sessions.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- DELETE: league admins only
CREATE POLICY "scorekeeper_sessions_delete_admin"
  ON scorekeeper_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = scorekeeper_sessions.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- =============================================================================
-- 7. Verification — ensure RLS is enabled on all 5 tables
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
  rls_enabled BOOLEAN;
  tables TEXT[] := ARRAY[
    'game_events',
    'game_checkins',
    'league_billing_settings',
    'league_ownerships',
    'scorekeeper_sessions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = tbl AND relnamespace = 'public'::regnamespace;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Table % not found in public schema', tbl;
    END IF;

    IF NOT rls_enabled THEN
      RAISE EXCEPTION 'RLS not enabled on %', tbl;
    END IF;
  END LOOP;

  RAISE NOTICE 'RLS successfully enabled on all 5 critical tables: game_events, game_checkins, league_billing_settings, league_ownerships, scorekeeper_sessions';
END $$;
