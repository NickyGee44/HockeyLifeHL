-- ==============================================================================
-- FIX: Update handle_new_user() trigger function
-- ==============================================================================
-- Problem: The trigger is trying to insert into 'user_id' column that doesn't exist
-- Solution: Update function to use 'id' column (profiles.id IS the user ID)
-- Date: January 28, 2026
-- Priority: CRITICAL - Blocks all user registration
-- ==============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create corrected function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new profile with id, email, and full_name
  -- The 'id' column in profiles table IS the user_id (references auth.users.id)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,                                                      -- User ID from auth.users
    NEW.email,                                                    -- Email from auth.users
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)  -- Full name from metadata or fallback to email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policy to allow trigger to insert profiles
-- The SECURITY DEFINER should handle this, but add explicit policy for safety
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comment on function
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a profile record when a new user signs up via Supabase Auth';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ handle_new_user() trigger function fixed';
  RAISE NOTICE '✅ Trigger recreated on auth.users table';
  RAISE NOTICE '✅ User registration should now work correctly';
END $$;
