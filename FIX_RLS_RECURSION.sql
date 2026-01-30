-- ==============================================================================
-- 🔧 CRITICAL FIX: RLS Infinite Recursion
-- ==============================================================================
-- Issue: User profile cannot load after login due to infinite recursion error
-- Error: "infinite recursion detected in policy for relation 'league_memberships'"
--
-- TO APPLY THIS FIX:
-- 1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your project (ntplczcmhvfkijjxavdl)
-- 3. Go to SQL Editor (left sidebar)
-- 4. Click "New Query"
-- 5. Copy and paste this ENTIRE file
-- 6. Click "Run" (or press Ctrl+Enter)
-- 7. Try logging in again - it should work!
-- ==============================================================================

-- Step 1: Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view memberships in their leagues" ON league_memberships;

-- Step 2: Create a simple, non-recursive policy
-- Users can now view their own memberships without infinite recursion
CREATE POLICY "Users can view own memberships"
  ON league_memberships FOR SELECT
  USING (user_id = auth.uid());

-- Step 3: Create helper function for viewing other league members
-- This uses SECURITY DEFINER to bypass RLS and avoid recursion
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
  -- Verify user has access to this league
  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE league_id = check_league_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RETURN; -- User not a member, return empty
  END IF;

  -- Return all members of the league
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION get_league_members(UUID) TO authenticated;

-- ==============================================================================
-- ✅ FIX COMPLETE
-- ==============================================================================
-- You should see: "Success. No rows returned"
--
-- Now try:
-- 1. Refresh your application
-- 2. Log in with your credentials
-- 3. Your profile should load successfully
-- 4. You should reach the dashboard without errors
-- ==============================================================================
