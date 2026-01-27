-- Fix unconfirmed users so they can log in immediately
-- Run this in Supabase SQL Editor

-- NOTE: confirmed_at is a GENERATED column in Supabase
-- It automatically updates when email_confirmed_at is set
-- So we only need to update email_confirmed_at

-- Option 1: Confirm specific user by email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'YOUR_EMAIL_HERE@example.com'
  AND email_confirmed_at IS NULL;

-- Option 2: Confirm ALL unconfirmed users (use with caution)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Verify the fix
SELECT
  email,
  email_confirmed_at,
  confirmed_at,  -- This will auto-populate when email_confirmed_at is set
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
