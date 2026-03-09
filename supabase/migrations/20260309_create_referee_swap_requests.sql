-- Migration: Create referee_swap_requests table
-- Mirrors scorekeeper_swap_requests pattern

CREATE TABLE referee_swap_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id                  UUID NOT NULL REFERENCES games(id),
  requesting_referee_id    UUID NOT NULL REFERENCES league_referees(id),
  accepting_referee_id     UUID REFERENCES league_referees(id),
  status                   TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected | cancelled
  reason                   TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at              TIMESTAMPTZ,
  resolved_by              UUID REFERENCES profiles(id)
);

ALTER TABLE referee_swap_requests ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "referee_swap_requests_admin_all" ON referee_swap_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN league_memberships lm ON lm.league_id = g.league_id
      WHERE g.id = referee_swap_requests.game_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin')
    )
  );

-- Referees can view and create swap requests they're involved in
CREATE POLICY "referee_swap_requests_self_read" ON referee_swap_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_referees lr
      WHERE (lr.id = referee_swap_requests.requesting_referee_id
          OR lr.id = referee_swap_requests.accepting_referee_id)
        AND lr.referee_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_referee_swap_requests_game_id ON referee_swap_requests(game_id);
CREATE INDEX idx_referee_swap_requests_requesting ON referee_swap_requests(requesting_referee_id);
CREATE INDEX idx_referee_swap_requests_status ON referee_swap_requests(status);
