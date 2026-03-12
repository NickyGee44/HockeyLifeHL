-- ==============================================================================
-- FIX: Add missing RLS policy for scorekeepers on scorekeeper_session_games
-- ==============================================================================
-- The original migration only had service_role and league admin policies.
-- Scorekeepers need to access their own session games.

DROP POLICY IF EXISTS "Scorekeepers can manage own session games" ON scorekeeper_session_games;
CREATE POLICY "Scorekeepers can manage own session games" ON scorekeeper_session_games
  FOR ALL USING (
    session_id IN (
      SELECT ss.id FROM scorekeeper_sessions ss
      WHERE ss.scorekeeper_id = auth.uid()
    )
  );
