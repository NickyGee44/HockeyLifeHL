-- ==============================================================================
-- COMPLETE DATABASE FIX - All Issues in One File
-- ==============================================================================
-- Purpose: Fix ALL database issues blocking registration and login
-- Date: January 28, 2026
-- Priority: CRITICAL
-- ==============================================================================

-- ==============================================================================
-- PART 1: ADD MISSING COLUMNS TO LEAGUES TABLE
-- ==============================================================================

-- Add sport column (if not exists)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT 'hockey';

-- Add subdomain column (if not exists)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- Add owner_id column (if not exists)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);

-- Add accent_color column (if not exists)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#FFD700';

-- Add constraints
DO $$
BEGIN
  -- Add sport constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_sport' AND conrelid = 'leagues'::regclass
  ) THEN
    ALTER TABLE leagues
    ADD CONSTRAINT valid_sport CHECK (
      sport IN ('hockey', 'soccer', 'basketball', 'baseball', 'softball', 'volleyball', 'football', 'lacrosse', 'other')
    );
  END IF;

  -- Add subdomain unique constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leagues_subdomain_key'
  ) THEN
    ALTER TABLE leagues ADD CONSTRAINT leagues_subdomain_key UNIQUE (subdomain);
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_leagues_subdomain ON leagues(subdomain);
CREATE INDEX IF NOT EXISTS idx_leagues_owner_id ON leagues(owner_id);
CREATE INDEX IF NOT EXISTS idx_leagues_sport ON leagues(sport);

-- ==============================================================================
-- PART 2: FIX AUTHENTICATION TRIGGER
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
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ==============================================================================
-- PART 3: FIX ORPHANED USERS
-- ==============================================================================

-- Create profiles for any existing auth users without profiles
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
