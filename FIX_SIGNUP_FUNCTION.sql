-- Fix signup function - drop old version and recreate
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. DROP OLD FUNCTION (if exists)
-- ============================================================================

DROP FUNCTION IF EXISTS signup_league_with_owner(text,text,text,text,uuid,text,text,text,text,text,text);
DROP FUNCTION IF EXISTS signup_league_with_owner;

-- ============================================================================
-- 2. CREATE NEW VERSION
-- ============================================================================

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
  success BOOLEAN,
  league_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league_id UUID;
BEGIN
  BEGIN
    -- 1. Create/update profile
    INSERT INTO profiles (id, user_id, email, full_name)
    VALUES (p_user_id, p_user_id, p_user_email, p_user_full_name)
    ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

    -- 2. Create league
    INSERT INTO leagues (
      name, slug, subdomain, sport, description,
      primary_color, secondary_color, accent_color,
      status, is_public
    ) VALUES (
      p_league_name, p_league_slug, p_subdomain, p_sport, p_description,
      p_primary_color, p_secondary_color, p_accent_color,
      'active', true
    )
    RETURNING id INTO v_league_id;

    -- 3. Create league membership (owner)
    INSERT INTO league_memberships (league_id, user_id, role, status)
    VALUES (v_league_id, p_user_id, 'owner', 'active');

    -- 4. Create league settings
    INSERT INTO league_settings (
      league_id,
      allow_public_registration,
      require_payment_for_registration,
      season_start_date
    )
    VALUES (v_league_id, false, false, NOW())
    ON CONFLICT (league_id) DO NOTHING;

    -- Return success
    RETURN QUERY SELECT true, v_league_id, NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    -- Return error
    RETURN QUERY SELECT false, NULL::UUID, SQLERRM;
  END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION signup_league_with_owner TO authenticated, anon;

-- ============================================================================
-- 3. CREATE OTHER REQUIRED FUNCTIONS
-- ============================================================================

-- Auto-create profiles trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Email confirmation function
CREATE OR REPLACE FUNCTION confirm_user_email(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = user_id AND email_confirmed_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_user_email(UUID) TO authenticated, anon;

-- ============================================================================
-- 4. VERIFY SETUP
-- ============================================================================

SELECT 'Setup complete!' as status;

-- Show installed functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('signup_league_with_owner', 'confirm_user_email', 'handle_new_user')
  AND routine_schema = 'public';

-- Show triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
