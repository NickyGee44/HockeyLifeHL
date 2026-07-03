-- Add league-level control for whether scorekeeper events require periods/times.
-- Existing behavior is preserved by default: leagues track periods/times unless explicitly disabled.

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS scorekeeper_tracks_time_periods boolean NOT NULL DEFAULT true;

-- Hockey Life legacy league: unordered goals, no period/time required in scorekeeper.
-- Stable identifiers observed in repo history: UUID below and HockeyLifeHL slugs/names.
UPDATE leagues
SET scorekeeper_tracks_time_periods = false
WHERE id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c'::uuid
  )
   OR lower(slug) IN ('hockeylifehl', 'hockeylifehl-original', 'hockey-life', 'hockey-life-hl')
   OR lower(name) IN ('hockeylifehl', 'hockeylifehl (original)', 'hockey life', 'hockey life hl');

-- Allow unordered scorekeeper events for leagues with scorekeeper_tracks_time_periods=false.
ALTER TABLE game_events
  ALTER COLUMN period DROP NOT NULL;
