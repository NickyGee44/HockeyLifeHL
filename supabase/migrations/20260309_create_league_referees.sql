-- Migration: Create league_referees table
-- Mirrors league_scorekeepers pattern — links referees to user profiles

CREATE TABLE league_referees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id     UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  referee_id    UUID REFERENCES profiles(id),          -- nullable for unregistered refs
  display_name  TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'active',         -- active | inactive
  hired_date    DATE,
  game_fee      NUMERIC(10,2),                          -- per-game flat fee (beer league standard)
  game_fee_cents INTEGER NOT NULL DEFAULT 0,
  certification TEXT,                                    -- e.g., "Hockey Canada Level 3"
  can_referee   BOOLEAN NOT NULL DEFAULT TRUE,
  can_linesman  BOOLEAN NOT NULL DEFAULT TRUE,
  max_games_per_week INTEGER,
  preferred_days INTEGER[],                              -- 0=Sun..6=Sat
  total_assignments  INTEGER NOT NULL DEFAULT 0,
  completed_assignments INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, referee_id),
  UNIQUE(league_id, email)
);

-- RLS: league owners/admins can manage; referees can read own row
ALTER TABLE league_referees ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "league_referees_admin_all" ON league_referees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_referees.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin')
    )
  );

-- Referees can read their own row
CREATE POLICY "league_referees_self_read" ON league_referees
  FOR SELECT
  USING (referee_id = auth.uid());

-- Index for common lookups
CREATE INDEX idx_league_referees_league_id ON league_referees(league_id);
CREATE INDEX idx_league_referees_referee_id ON league_referees(referee_id);
CREATE INDEX idx_league_referees_status ON league_referees(league_id, status);
