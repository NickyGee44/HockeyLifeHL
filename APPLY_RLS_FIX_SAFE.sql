-- ==============================================================================
-- SAFE RLS FIX - Won't error if already partially applied
-- ==============================================================================

-- Step 1: Drop old policy if exists (already done, but safe to run again)
DROP POLICY IF EXISTS "Users can view memberships in their leagues" ON league_memberships;

-- Step 2: Drop new policy if it exists (in case we need to recreate)
DROP POLICY IF EXISTS "Users can view own memberships" ON league_memberships;

-- Step 3: Create the new simple policy
CREATE POLICY "Users can view own memberships"
  ON league_memberships FOR SELECT
  USING (user_id = auth.uid());

-- Step 4: Create or replace helper function (safe - uses CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION get_league_members(check_league_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  league_id UUID,
  role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE league_id = check_league_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    lm.id,
    lm.user_id,
    lm.league_id,
    lm.role,
    lm.status,
    lm.joined_at
  FROM public.league_memberships lm
  WHERE lm.league_id = check_league_id
  ORDER BY lm.joined_at DESC;
END;
$$;

-- Step 5: Grant permissions (safe - won't error if already granted)
GRANT EXECUTE ON FUNCTION get_league_members(UUID) TO authenticated;

-- ==============================================================================
-- ✅ COMPLETE - This should succeed even if partially applied before
-- ==============================================================================
