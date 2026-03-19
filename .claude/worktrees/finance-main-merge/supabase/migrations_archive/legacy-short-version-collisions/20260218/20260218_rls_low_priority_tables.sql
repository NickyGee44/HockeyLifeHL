-- =============================================================================
-- LOW Priority: Enable RLS on remaining 12 tables
-- =============================================================================
-- Categories:
--   A. Security/audit logs (5 tables) — DENY all client access, service-role only
--   B. League-scoped (4 tables) — standard tenant isolation
--   C. Platform/reference (3 tables) — read-only or skip
-- =============================================================================

-- =============================================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================

-- Category A: Security/audit logs — block all client access
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_recovery_requests ENABLE ROW LEVEL SECURITY;

-- Category B: League-scoped data
ALTER TABLE game_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_schedule_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_auto_pick_log ENABLE ROW LEVEL SECURITY;

-- Category C: Platform/reference
ALTER TABLE platform_fee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_players ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CATEGORY A: Security/Audit Logs — Service-Role Only
-- =============================================================================
-- These tables contain sensitive security data. Enabling RLS with NO policies
-- means all client access is denied. Only the service_role key can read/write.
-- This is the correct pattern for audit/security logging tables.
-- =============================================================================

-- admin_audit_log: No policies needed. Service role writes via server actions.
-- login_attempts_log: No policies needed. Service role writes via password-reset.ts.
-- password_reset_log: No policies needed. Service role writes via password-reset.ts.
-- password_reset_rate_limits: No policies needed. Service role manages rate limits.
-- account_recovery_requests: No policies needed. Service role writes via password-reset.ts.

-- =============================================================================
-- CATEGORY B: League-Scoped Tables
-- =============================================================================

-- -------------------------
-- game_audit_log
-- -------------------------
-- Has league_id directly. Admin read for audit trail.

CREATE POLICY "game_audit_log_select_admin"
  ON game_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = game_audit_log.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- INSERT: service role only (no policy = denied to client)
-- UPDATE/DELETE: not allowed (audit logs are append-only)

-- -------------------------
-- team_schedule_preferences
-- -------------------------
-- Has league_id and team_id. Members read, admins/captains write.

CREATE POLICY "team_schedule_preferences_select_member"
  ON team_schedule_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_schedule_preferences.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

CREATE POLICY "team_schedule_preferences_insert_admin_captain"
  ON team_schedule_preferences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_schedule_preferences.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner', 'captain')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "team_schedule_preferences_update_admin_captain"
  ON team_schedule_preferences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_schedule_preferences.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner', 'captain')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "team_schedule_preferences_delete_admin"
  ON team_schedule_preferences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_schedule_preferences.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- -------------------------
-- contact_submissions
-- -------------------------
-- Has league_id. Anyone can submit (public contact form for active leagues).
-- League admins can read submissions.

CREATE POLICY "contact_submissions_insert_public"
  ON contact_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = contact_submissions.league_id
        AND l.status = 'active'
    )
  );

CREATE POLICY "contact_submissions_select_admin"
  ON contact_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = contact_submissions.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "contact_submissions_update_admin"
  ON contact_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = contact_submissions.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "contact_submissions_delete_admin"
  ON contact_submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = contact_submissions.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- -------------------------
-- draft_auto_pick_log
-- -------------------------
-- Has draft_id (FK to drafts). League-scoped via drafts → league_id join.
-- Admin read-only (auto-pick debugging).

CREATE POLICY "draft_auto_pick_log_select_admin"
  ON draft_auto_pick_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drafts d
      INNER JOIN league_memberships lm ON lm.league_id = d.league_id
      WHERE d.id = draft_auto_pick_log.draft_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- INSERT/UPDATE/DELETE: service role only (automated system writes)

-- =============================================================================
-- CATEGORY C: Platform/Reference Tables
-- =============================================================================

-- -------------------------
-- platform_fee_config
-- -------------------------
-- Platform-level singleton. Authenticated users can read (needed for fee display).
-- Only service role can write (admin actions use service role client).

CREATE POLICY "platform_fee_config_select_authenticated"
  ON platform_fee_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE: service role only (admin server actions)

-- -------------------------
-- colors
-- -------------------------
-- Shared reference data. Everyone (including anon) can read.
-- Only service role can write.

CREATE POLICY "colors_select_all"
  ON colors FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: service role only

-- -------------------------
-- legacy_players
-- -------------------------
-- Historical import data without league_id. Access scoped to:
-- - The matched profile owner (can see their own matched records)
-- - Platform admins via service role
-- No league_id means no tenant scoping possible at DB level.

CREATE POLICY "legacy_players_select_matched_user"
  ON legacy_players FOR SELECT
  USING (
    legacy_players.matched_to_profile_id = auth.uid()
  );

-- INSERT/UPDATE/DELETE: service role only (import/admin operations)

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
  rls_enabled BOOLEAN;
  tables TEXT[] := ARRAY[
    'admin_audit_log',
    'login_attempts_log',
    'password_reset_log',
    'password_reset_rate_limits',
    'account_recovery_requests',
    'game_audit_log',
    'team_schedule_preferences',
    'contact_submissions',
    'draft_auto_pick_log',
    'platform_fee_config',
    'colors',
    'legacy_players'
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

  RAISE NOTICE 'RLS successfully enabled on all 12 LOW priority tables';
END $$;
