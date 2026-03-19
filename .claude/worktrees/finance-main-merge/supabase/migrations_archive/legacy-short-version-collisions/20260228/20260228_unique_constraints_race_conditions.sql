-- Fix race conditions by adding database-level unique constraints
-- These prevent duplicate team names and jersey numbers even under concurrent requests.

-- 1. Prevent duplicate team names within the same league
-- Uses a partial unique index to allow NULL names (though name should always be set)
CREATE UNIQUE INDEX IF NOT EXISTS teams_league_id_name_unique
  ON public.teams (league_id, lower(name))
  WHERE name IS NOT NULL;

-- 2. Prevent duplicate jersey numbers per team per season
-- Partial index: only enforce uniqueness when jersey_number is set (it's optional)
CREATE UNIQUE INDEX IF NOT EXISTS team_rosters_jersey_unique
  ON public.team_rosters (team_id, season_id, jersey_number)
  WHERE jersey_number IS NOT NULL;
