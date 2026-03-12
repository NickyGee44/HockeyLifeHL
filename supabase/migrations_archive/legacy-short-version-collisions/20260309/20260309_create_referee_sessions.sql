-- Migration: Create referee_sessions table
-- Mirrors scorekeeper_sessions pattern — token-based portal access

CREATE TABLE referee_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token                 TEXT NOT NULL UNIQUE,
  session_type          TEXT NOT NULL DEFAULT 'multi',   -- single | multi
  league_id             UUID NOT NULL REFERENCES leagues(id),
  league_referee_id     UUID REFERENCES league_referees(id),
  referee_id            UUID REFERENCES profiles(id),
  game_id               UUID REFERENCES games(id),       -- for single-game sessions
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES profiles(id),
  expires_at            TIMESTAMPTZ NOT NULL,
  deactivated_at        TIMESTAMPTZ,
  deactivated_by        UUID REFERENCES profiles(id),
  deactivation_reason   TEXT,
  access_count          INTEGER NOT NULL DEFAULT 0,
  last_accessed_at      TIMESTAMPTZ,
  device_info           JSONB
);

ALTER TABLE referee_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can manage sessions
CREATE POLICY "referee_sessions_admin_all" ON referee_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = referee_sessions.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin')
    )
  );

-- Indexes
CREATE INDEX idx_referee_sessions_token ON referee_sessions(token) WHERE is_active = TRUE;
CREATE INDEX idx_referee_sessions_league_id ON referee_sessions(league_id);
CREATE INDEX idx_referee_sessions_league_referee_id ON referee_sessions(league_referee_id);
