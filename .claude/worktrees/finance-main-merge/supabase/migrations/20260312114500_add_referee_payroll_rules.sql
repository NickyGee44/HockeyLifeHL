-- Add referee payroll configuration and assignment snapshots for bookkeeping.

ALTER TABLE public.league_referees
  ADD COLUMN IF NOT EXISTS referee_identifier text,
  ADD COLUMN IF NOT EXISTS default_jersey_number text,
  ADD COLUMN IF NOT EXISTS solo_game_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paired_game_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linesman_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS single_game_fee_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.game_officials
  ADD COLUMN IF NOT EXISTS payment_amount_cents integer,
  ADD COLUMN IF NOT EXISTS payment_rule_applied text,
  ADD COLUMN IF NOT EXISTS referee_identifier_snapshot text;

CREATE INDEX IF NOT EXISTS idx_game_officials_payment_status
  ON public.game_officials (payment_status);
