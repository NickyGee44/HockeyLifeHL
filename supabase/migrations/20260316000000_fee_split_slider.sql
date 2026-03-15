-- Add player fee share percentage to league billing settings
-- Allows leagues to control what % of the platform fee is passed to players vs absorbed by the league.
-- 100 = players pay all (default), 0 = league absorbs all, 50 = split evenly.

ALTER TABLE league_billing_settings
  ADD COLUMN IF NOT EXISTS player_fee_share_percent integer NOT NULL DEFAULT 100
  CONSTRAINT chk_player_fee_share_percent CHECK (player_fee_share_percent BETWEEN 0 AND 100);

-- Backfill from existing platform_fee_mode
UPDATE league_billing_settings
SET player_fee_share_percent = CASE
  WHEN platform_fee_mode = 'absorb_by_league' THEN 0
  ELSE 100
END;
