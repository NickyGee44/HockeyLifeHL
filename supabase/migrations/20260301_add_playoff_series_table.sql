-- Migration: add_playoff_series_table
-- Tracks playoff bracket series for a season

CREATE TABLE IF NOT EXISTS playoff_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE NOT NULL,
  round_number INT NOT NULL,
  series_number INT NOT NULL,
  high_seed_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  low_seed_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  high_seed_wins INT DEFAULT 0 NOT NULL,
  low_seed_wins INT DEFAULT 0 NOT NULL,
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(season_id, round_number, series_number)
);

ALTER TABLE playoff_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League members can view playoff series"
  ON playoff_series FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = playoff_series.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM leagues l WHERE l.id = playoff_series.league_id AND l.created_by = auth.uid()
    )
  );

CREATE POLICY "League owners can manage playoff series"
  ON playoff_series FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = playoff_series.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin')
        AND lm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM leagues l WHERE l.id = playoff_series.league_id AND l.created_by = auth.uid()
    )
  );
