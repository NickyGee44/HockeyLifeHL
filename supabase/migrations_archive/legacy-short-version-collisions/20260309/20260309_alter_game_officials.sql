-- Migration: Add structured referee tracking columns to game_officials
-- Keeps existing name column for backwards compatibility

ALTER TABLE game_officials
  ADD COLUMN IF NOT EXISTS league_referee_id UUID REFERENCES league_referees(id),
  ADD COLUMN IF NOT EXISTS assignment_status TEXT NOT NULL DEFAULT 'confirmed',  -- confirmed | pending | declined
  ADD COLUMN IF NOT EXISTS payment_status    TEXT DEFAULT 'pending',             -- pending | paid
  ADD COLUMN IF NOT EXISTS payment_amount    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS paid_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by       UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS confirmed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes             TEXT;

-- Index for referee assignment lookups
CREATE INDEX IF NOT EXISTS idx_game_officials_league_referee_id ON game_officials(league_referee_id);
CREATE INDEX IF NOT EXISTS idx_game_officials_assignment_status ON game_officials(assignment_status);
