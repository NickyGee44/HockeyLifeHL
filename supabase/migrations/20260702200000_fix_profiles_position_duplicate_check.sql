-- ============================================================================
-- Fix: profiles.position had TWO contradictory CHECK constraints.
--
--   profiles_position_check  CHECK (position IN ('C','LW','RW','D','G'))
--       -> the ORIGINAL constraint (short codes), from the base schema.
--
--   profile_position_check   CHECK (position IS NULL OR position IN
--                              ('Forward','Defense','Goalie',
--                               'forward','defense','goalie'))
--       -> added ad-hoc by an earlier hotfix. Its DROP step targeted the wrong
--          name ("profile_position_check" instead of "profiles_position_check"),
--          so it never removed the original and simply stacked a second,
--          conflicting check on top.
--
-- CHECK constraints are AND-ed, and these two share NO common allowed value:
-- the only value satisfying both is NULL. As a result, EVERY non-null write to
-- profiles.position failed ("invalid ... profile_position_check"), regardless of
-- whether the app sent a short code or a long label.
--
-- Resolution: drop the ad-hoc duplicate and keep the original short-code check.
-- profiles.position stores short hockey codes (C/LW/RW/D/G); team_rosters.position
-- (enum player_position) keeps the long labels (Forward/Defense/Goalie) — those
-- are two intentionally different columns and are left untouched here.
--
-- No data backfill is required: a diagnostic confirmed zero rows in
-- profiles.position hold a value outside ('C','LW','RW','D','G').
-- ============================================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profile_position_check;

-- Safety net: ensure the canonical short-code check exists (it should already).
-- NULL is permitted because `NULL = ANY(...)` evaluates to unknown, which a CHECK
-- constraint treats as satisfied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'public.profiles'::regclass
      AND  conname  = 'profiles_position_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_position_check
      CHECK (position IS NULL OR position IN ('C', 'LW', 'RW', 'D', 'G'));
  END IF;
END $$;
