-- Add recap_tone column to leagues for AI article tone control.
-- Bounded to three values: friendly, competitive (default), savage.

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS recap_tone text NOT NULL DEFAULT 'competitive';

ALTER TABLE leagues
  ADD CONSTRAINT leagues_recap_tone_check
  CHECK (recap_tone IN ('friendly', 'competitive', 'savage'));

COMMENT ON COLUMN leagues.recap_tone IS 'Controls the tone of AI-generated game recaps: friendly, competitive, or savage';
