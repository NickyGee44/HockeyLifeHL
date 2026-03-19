-- Drop the duplicate FK on teams.captain_id → profiles.id.
-- Two FKs existed (fk_teams_captain and teams_captain_id_fkey) with identical
-- columns and referenced table, causing PostgREST to raise an ambiguous
-- relationship error when joining the captain on the teams table.
-- We keep teams_captain_id_fkey (follows the {table}_{column}_fkey convention).

ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS fk_teams_captain;
