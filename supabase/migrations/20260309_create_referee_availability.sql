-- Migration: Create referee_availability table
-- Mirrors scorekeeper_availability pattern

CREATE TABLE referee_availability (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_id        UUID NOT NULL REFERENCES league_referees(id) ON DELETE CASCADE,
  league_id         UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  day_of_week       INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  availability_type TEXT NOT NULL DEFAULT 'available',  -- available | unavailable | preferred
  is_recurring      BOOLEAN NOT NULL DEFAULT TRUE,
  specific_date     DATE,                                -- for one-off overrides
  notes             TEXT,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE referee_availability ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "referee_availability_admin_all" ON referee_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = referee_availability.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin')
    )
  );

-- Referees can manage their own availability
CREATE POLICY "referee_availability_self_all" ON referee_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_referees lr
      WHERE lr.id = referee_availability.referee_id
        AND lr.referee_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_referee_availability_referee_id ON referee_availability(referee_id);
CREATE INDEX idx_referee_availability_league_id ON referee_availability(league_id);
