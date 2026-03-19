-- Critical Security Fix: Enable RLS on stat_disputes, stat_changes, and team_messages
-- These tables were exposed to all authenticated users without tenant isolation
-- Severity: CRITICAL - Cross-tenant data leakage

-- =============================================================================
-- 1. Enable Row Level Security
-- =============================================================================

ALTER TABLE stat_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stat_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. stat_disputes RLS Policies
-- =============================================================================
-- stat_disputes references games via game_id
-- Users can only access disputes for games in their leagues

CREATE POLICY "Users can view stat_disputes in their leagues"
  ON stat_disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = stat_disputes.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

CREATE POLICY "Users can create stat_disputes for their team's games"
  ON stat_disputes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN teams t ON t.id = stat_disputes.disputed_by_team_id
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = stat_disputes.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND (g.home_team_id = t.id OR g.away_team_id = t.id)
    )
  );

CREATE POLICY "League admins can update stat_disputes"
  ON stat_disputes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = stat_disputes.game_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "League admins can delete stat_disputes"
  ON stat_disputes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = stat_disputes.game_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- =============================================================================
-- 3. stat_changes RLS Policies
-- =============================================================================
-- stat_changes references games via game_id
-- Only league admins should be able to modify stats

CREATE POLICY "Users can view stat_changes in their leagues"
  ON stat_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = stat_changes.game_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

CREATE POLICY "League admins can create stat_changes"
  ON stat_changes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      INNER JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = stat_changes.game_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- stat_changes should be immutable (audit log), so no UPDATE/DELETE policies

-- =============================================================================
-- 4. team_messages RLS Policies
-- =============================================================================
-- team_messages references teams via team_id
-- Only team members should access their team messages

CREATE POLICY "League members can view team messages"
  ON team_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = team_messages.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

CREATE POLICY "League members can send team messages"
  ON team_messages FOR INSERT
  WITH CHECK (
    sent_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = team_messages.team_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

CREATE POLICY "Message sender can update their own messages"
  ON team_messages FOR UPDATE
  USING (sent_by = auth.uid())
  WITH CHECK (sent_by = auth.uid());

CREATE POLICY "Message sender can delete their own messages"
  ON team_messages FOR DELETE
  USING (
    sent_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM teams t
      INNER JOIN league_memberships lm ON lm.league_id = t.league_id
      WHERE t.id = team_messages.team_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- =============================================================================
-- Verification
-- =============================================================================

-- Verify RLS is enabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'stat_disputes' AND relnamespace = 'public'::regnamespace;

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on stat_disputes';
  END IF;

  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'stat_changes' AND relnamespace = 'public'::regnamespace;

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on stat_changes';
  END IF;

  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'team_messages' AND relnamespace = 'public'::regnamespace;

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on team_messages';
  END IF;

  RAISE NOTICE 'RLS successfully enabled on all critical tables';
END $$;
