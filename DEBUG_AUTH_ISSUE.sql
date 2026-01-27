-- Debug authentication issues
-- Run these queries one by one in Supabase SQL Editor

-- 1. Check if your user exists and their confirmation status
SELECT
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if there are any unconfirmed users
SELECT
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- 3. Check auth settings
SELECT
  key,
  value
FROM auth.config;

-- 4. Force confirm ALL unconfirmed users (if needed)
-- ONLY run this if you see your email in the unconfirmed list above
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 5. Verify all users are now confirmed
SELECT
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  created_at
FROM auth.users
ORDER BY created_at DESC;
