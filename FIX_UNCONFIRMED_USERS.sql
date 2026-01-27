-- Fix unconfirmed users so they can log in immediately
-- Run this in Supabase SQL Editor

-- Option 1: Confirm specific user by email
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'YOUR_EMAIL_HERE@example.com'
  AND email_confirmed_at IS NULL;

-- Option 2: Confirm ALL unconfirmed users (use with caution)
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Verify the fix
SELECT
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
