-- ==============================================================================
-- CREATE SIGNUP HELPER FUNCTION
-- ==============================================================================
-- Purpose: Bypass RLS to add new users to pilot league during signup
-- Date: January 29, 2026
-- ==============================================================================
-- Issue: When users sign up, they can't add themselves to a league because
--        the RLS policy requires them to already be an owner/admin.
-- Solution: Create a SECURITY DEFINER function that bypasses RLS for this
--          specific operation.
-- ==============================================================================

/**
 * Add a new user to the pilot league during signup
 *
 * This function uses SECURITY DEFINER to bypass RLS policies and add
 * the user to the specified league. It's called automatically during
 * the signup process.
 *
 * SECURITY: Only allows adding the authenticated user (auth.uid())
 * and validates that the league exists before creating membership.
 *
 * @param p_user_id - The user ID to add (must match auth.uid())
 * @param p_league_id - The league to add them to (typically pilot league)
 * @param p_role - The role to assign (default: 'player')
 *
 * @returns success boolean and error message if any
 */
CREATE OR REPLACE FUNCTION add_user_to_league_on_signup(
  p_user_id UUID,
  p_league_id UUID,
  p_role TEXT DEFAULT 'player'
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_league_exists BOOLEAN;
BEGIN
  -- SECURITY: Only allow adding the authenticated user
  IF auth.uid() != p_user_id THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Can only add authenticated user'::TEXT;
    RETURN;
  END IF;

  -- VALIDATION: Check that league exists and is active
  SELECT EXISTS(
    SELECT 1 FROM leagues
    WHERE id = p_league_id AND status = 'active'
  ) INTO v_league_exists;

  IF NOT v_league_exists THEN
    RETURN QUERY SELECT FALSE, 'League does not exist or is not active'::TEXT;
    RETURN;
  END IF;

  -- VALIDATION: Check valid role
  IF p_role NOT IN ('owner', 'admin', 'captain', 'scorekeeper', 'player') THEN
    RETURN QUERY SELECT FALSE, 'Invalid role specified'::TEXT;
    RETURN;
  END IF;

  -- VALIDATION: Check if membership already exists
  IF EXISTS(
    SELECT 1 FROM league_memberships
    WHERE user_id = p_user_id AND league_id = p_league_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'User is already a member of this league'::TEXT;
    RETURN;
  END IF;

  -- CREATE MEMBERSHIP
  -- This bypasses RLS because function is SECURITY DEFINER
  INSERT INTO league_memberships (
    league_id,
    user_id,
    role,
    status
  )
  VALUES (
    p_league_id,
    p_user_id,
    p_role,
    'active'
  );

  -- Return success
  RETURN QUERY SELECT TRUE, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- Return error message
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

COMMENT ON FUNCTION add_user_to_league_on_signup IS 'Add authenticated user to a league during signup, bypassing RLS. Security: Only allows adding auth.uid() and validates league exists.';

-- ==============================================================================
-- GRANT EXECUTE PERMISSION
-- ==============================================================================

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION add_user_to_league_on_signup(UUID, UUID, TEXT) TO authenticated;

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Signup helper function created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Function: add_user_to_league_on_signup';
  RAISE NOTICE 'Security: SECURITY DEFINER';
  RAISE NOTICE 'Purpose: Add new users to pilot league';
  RAISE NOTICE 'Validates: User auth, league exists, no duplicate';
  RAISE NOTICE '';
  RAISE NOTICE 'This fixes the signup issue where new users';
  RAISE NOTICE 'could not add themselves to leagues due to RLS.';
  RAISE NOTICE '';
END $$;
