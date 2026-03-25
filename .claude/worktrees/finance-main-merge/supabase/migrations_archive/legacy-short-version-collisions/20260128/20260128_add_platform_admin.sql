-- Add platform_admin field to profiles table
-- This allows certain users to manage all leagues in the platform

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin ON profiles(is_platform_admin) WHERE is_platform_admin = TRUE;

-- Add comment
COMMENT ON COLUMN profiles.is_platform_admin IS 'Whether this user has platform-wide admin access to manage all leagues';

-- Note: To grant platform admin access to a user, run:
-- UPDATE profiles SET is_platform_admin = TRUE WHERE email = 'admin@example.com';
