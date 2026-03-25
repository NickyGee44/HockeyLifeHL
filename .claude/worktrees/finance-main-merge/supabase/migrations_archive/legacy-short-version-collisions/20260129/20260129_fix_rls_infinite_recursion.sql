-- ==============================================================================
-- FIX: RLS Infinite Recursion in league_memberships
-- ==============================================================================
-- Issue: The "Users can view memberships in their leagues" policy has a subquery
--        that queries league_memberships itself, causing infinite recursion:
--
--        PostgreSQL Error: infinite recursion detected in policy for relation "league_memberships"
--        Error Code: 42P17
--
-- Root Cause: The policy USING clause contains:
--   league_id IN (SELECT league_id FROM league_memberships WHERE ...)
--   This creates a circular dependency: to read league_memberships, we query
--   league_memberships, which triggers the same policy check, ad infinitum.
--
-- Fix: Replace the recursive policy with a simple, non-recursive one
-- ==============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view memberships in their leagues" ON league_memberships;

-- Create a simple, non-recursive policy
-- Users can view their own memberships without any subquery
CREATE POLICY "Users can view own memberships"
  ON league_memberships FOR SELECT
  USING (user_id = auth.uid());

-- For viewing other members in the same league, we'll provide a helper function
-- instead of an RLS policy (to avoid recursion)

-- ==============================================================================
-- HELPER FUNCTION: Get members of leagues the user belongs to
-- ==============================================================================
-- This function uses SECURITY DEFINER to bypass RLS and avoid recursion
-- It safely returns only members of leagues the current user has access to

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
  -- First verify the user has access to this league
  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE league_id = check_league_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    -- User is not a member of this league, return empty result
    RETURN;
  END IF;

  -- User is a member, return all members of this league
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_league_members(UUID) TO authenticated;

COMMENT ON FUNCTION get_league_members IS 'Returns all members of a league if the current user is a member. Uses SECURITY DEFINER to avoid RLS recursion.';

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '  RLS INFINITE RECURSION FIX APPLIED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  1. Removed recursive policy on league_memberships';
  RAISE NOTICE '  2. Created simple policy: users can view own memberships';
  RAISE NOTICE '  3. Added get_league_members() function for cross-member queries';
  RAISE NOTICE '';
  RAISE NOTICE 'Impact:';
  RAISE NOTICE '  - Users can now fetch their profile without recursion errors';
  RAISE NOTICE '  - Login and dashboard loading should work correctly';
  RAISE NOTICE '  - Use get_league_members(league_id) to view league member lists';
  RAISE NOTICE '';
END $$;
