-- FIX: Authentication and Profile Creation
-- Run this in Supabase SQL Editor to fix registration issues

-- Step 1: Update the handle_new_user function to include all user metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, jersey_number, position, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'jersey_number' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'jersey_number')::integer
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'position',
    'player'::user_role
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 3: Fix RLS policy to allow the trigger to work
-- The SECURITY DEFINER on the function should handle this, but let's add a service role policy just in case

-- Add a policy that allows inserts from the service role (trigger runs as service role)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT 
  TO service_role
  WITH CHECK (true);

-- Step 4: Also allow the trigger to work by checking the profiles table exists
-- Verify the profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 5: Check if there are any orphaned auth users without profiles
-- This will show users who signed up but don't have profiles
SELECT 
  u.id,
  u.email,
  u.created_at as user_created,
  p.id as profile_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Step 6: Create profiles for any orphaned users
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  'player'::user_role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

