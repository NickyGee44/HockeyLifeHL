-- ==============================================================================
-- FIX: divisions table — broken public read RLS + missing sort_order column
-- ==============================================================================
-- Problem 1: The "public_read_divisions" policy references divisions.season_id
--   which does not exist (divisions use league_id). This causes the policy to
--   always return FALSE, making divisions invisible on public league sites.
-- Problem 2: The app's getDivisions() orders by sort_order, but that column
--   was never added to the table.
-- ==============================================================================

-- 1. Add sort_order column (defaults to 0 so existing divisions remain valid)
ALTER TABLE public.divisions
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. Drop the broken public_read policy
DROP POLICY IF EXISTS "public_read_divisions" ON public.divisions;

-- 3. Recreate with correct join through league_id
CREATE POLICY "public_read_divisions"
  ON public.divisions
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = divisions.league_id
        AND l.status = 'active'
    )
  );

COMMENT ON POLICY "public_read_divisions" ON public.divisions IS
  'Allow public read access to divisions of active leagues (fixed: was referencing non-existent season_id)';
