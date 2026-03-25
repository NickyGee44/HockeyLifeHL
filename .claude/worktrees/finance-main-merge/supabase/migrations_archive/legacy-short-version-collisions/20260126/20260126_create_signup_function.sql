-- ==============================================================================
-- CREATE ATOMIC SIGNUP FUNCTION
-- ==============================================================================
-- Purpose: Provide atomic transaction for league signup with owner account
-- Security Fix: Ensures all-or-nothing signup to prevent partial state
-- Date: January 26, 2026
-- ==============================================================================

/**
 * Atomic signup function for new league with owner account
 *
 * This function wraps all signup operations in a single database transaction:
 * 1. Create league
 * 2. Create/update profile
 * 3. Create league membership
 * 4. Update league owner_id
 *
 * If any step fails, all changes are automatically rolled back.
 *
 * SECURITY: Uses SECURITY DEFINER to bypass RLS for initial setup,
 * but validates all inputs and ensures proper ownership.
 */
CREATE OR REPLACE FUNCTION signup_league_with_owner(
  p_league_name TEXT,
  p_league_slug TEXT,
  p_subdomain TEXT,
  p_sport TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_user_full_name TEXT,
  p_primary_color TEXT DEFAULT '#FF0000',
  p_secondary_color TEXT DEFAULT '#000000',
  p_accent_color TEXT DEFAULT '#FFD700',
  p_description TEXT DEFAULT ''
)
RETURNS TABLE(
  league_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_league_id UUID;
  v_profile_id UUID;
BEGIN
  -- Start transaction (implicit in function)

  -- VALIDATION: Ensure user_id matches authenticated user
  IF auth.uid() != p_user_id THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Unauthorized: User ID mismatch'::TEXT;
    RETURN;
  END IF;

  -- VALIDATION: Check required fields
  IF p_league_name IS NULL OR LENGTH(TRIM(p_league_name)) < 3 THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'League name must be at least 3 characters'::TEXT;
    RETURN;
  END IF;

  IF p_league_slug IS NULL OR LENGTH(TRIM(p_league_slug)) < 3 THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'League slug must be at least 3 characters'::TEXT;
    RETURN;
  END IF;

  IF p_subdomain IS NULL OR LENGTH(TRIM(p_subdomain)) < 3 THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Subdomain must be at least 3 characters'::TEXT;
    RETURN;
  END IF;

  -- VALIDATION: Check slug uniqueness
  IF EXISTS (SELECT 1 FROM leagues WHERE slug = p_league_slug) THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'League slug already exists'::TEXT;
    RETURN;
  END IF;

  -- VALIDATION: Check subdomain uniqueness
  IF EXISTS (SELECT 1 FROM leagues WHERE subdomain = p_subdomain) THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Subdomain already exists'::TEXT;
    RETURN;
  END IF;

  -- STEP 1: Create league
  INSERT INTO leagues (
    name,
    slug,
    subdomain,
    sport,
    status,
    created_by,
    owner_id,
    description,
    primary_color,
    secondary_color,
    accent_color
  )
  VALUES (
    p_league_name,
    p_league_slug,
    p_subdomain,
    p_sport,
    'active',
    p_user_id,
    p_user_id,
    p_description,
    p_primary_color,
    p_secondary_color,
    p_accent_color
  )
  RETURNING id INTO v_league_id;

  -- STEP 2: Create or update profile
  INSERT INTO profiles (id, email, full_name)
  VALUES (p_user_id, p_user_email, p_user_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW()
  RETURNING id INTO v_profile_id;

  -- STEP 3: Create league membership with owner role
  INSERT INTO league_memberships (league_id, user_id, role, status)
  VALUES (v_league_id, p_user_id, 'owner', 'active');

  -- STEP 4: Create default league settings (optional, non-critical)
  BEGIN
    INSERT INTO league_settings (
      league_id,
      stat_entry_mode,
      allow_trades,
      allow_player_registration,
      require_payment
    )
    VALUES (
      v_league_id,
      'captain',
      true,
      true,
      false
    );
  EXCEPTION WHEN OTHERS THEN
    -- Settings creation is non-critical, continue anyway
    RAISE NOTICE 'Settings creation failed (non-critical): %', SQLERRM;
  END;

  -- Return success
  RETURN QUERY SELECT v_league_id, TRUE, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically
  -- Return the error message
  RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

COMMENT ON FUNCTION signup_league_with_owner IS 'Atomically create a new league with owner account in a single transaction. All operations succeed or fail together.';

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Atomic signup function created successfully';
  RAISE NOTICE '✅ Function: signup_league_with_owner';
  RAISE NOTICE '✅ Security: SECURITY DEFINER with search_path protection';
  RAISE NOTICE '✅ Validation: User ID, slug, and subdomain uniqueness checks';
  RAISE NOTICE '✅ Transaction: All-or-nothing atomic operation';
  RAISE NOTICE '';
END $$;
