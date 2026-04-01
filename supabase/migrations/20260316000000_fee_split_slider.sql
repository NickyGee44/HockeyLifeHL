-- Add player fee share percentage to league billing settings
-- Allows leagues to control what % of the platform fee is passed to players vs absorbed by the league.
-- 100 = players pay all (default), 0 = league absorbs all, 50 = split evenly.

ALTER TABLE public.league_billing_settings
  ADD COLUMN IF NOT EXISTS player_fee_share_percent integer NOT NULL DEFAULT 100;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_player_fee_share_percent'
      AND conrelid = 'public.league_billing_settings'::regclass
  ) THEN
    ALTER TABLE public.league_billing_settings
      ADD CONSTRAINT chk_player_fee_share_percent
      CHECK (player_fee_share_percent BETWEEN 0 AND 100);
  END IF;
END $$;

-- Backfill from existing platform_fee_mode
UPDATE public.league_billing_settings
SET player_fee_share_percent = CASE
  WHEN platform_fee_mode = 'absorb_by_league' THEN 0
  ELSE 100
END;
