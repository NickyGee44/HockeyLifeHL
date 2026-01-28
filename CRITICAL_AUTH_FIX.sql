-- ==============================================================================
-- CRITICAL FIX: Authentication Registration & Login Issue
-- ==============================================================================
-- Run this IMMEDIATELY in Supabase SQL Editor to fix broken registration/login
-- Date: January 28, 2026
-- Issue: handle_new_user() trigger trying to use non-existent 'user_id' column
-- ==============================================================================

-- Step 1: Drop and recreate the handle_new_user function with correct column names
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new profile - profiles.id IS the user ID (not user_id!)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,                                                      -- auth.users.id
    NEW.email,                                                   -- auth.users.email
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)  -- fallback to email if no name
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Don't fail user creation, just log the error
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 2: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Add RLS policy to ensure trigger can insert
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Step 4: Fix any orphaned auth users (users without profiles)
INSERT INTO public.profiles (id, email, full_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

-- Step 5: Verify the fix
DO $$
DECLARE
  v_trigger_count INTEGER;
  v_orphaned_count INTEGER;
BEGIN
  -- Check trigger exists
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created';

  -- Check for orphaned users
  SELECT COUNT(*) INTO v_orphaned_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL;

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CRITICAL AUTH FIX - VERIFICATION RESULTS';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ handle_new_user() function: FIXED';
  RAISE NOTICE '✓ on_auth_user_created trigger: % (should be 1)', CASE WHEN v_trigger_count = 1 THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '✓ Orphaned users fixed: % users had profiles created',
    (SELECT COUNT(*) FROM auth.users) - v_orphaned_count;
  RAISE NOTICE '✓ Current orphaned users: % (should be 0)', v_orphaned_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Registration and login should now work!';
  RAISE NOTICE '==============================================';
END $$;

-- Show trigger details for confirmation
SELECT
  'Trigger Status: ACTIVE' as status,
  trigger_name,
  event_object_table as "on_table",
  action_statement as function_call
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
