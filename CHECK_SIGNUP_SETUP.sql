-- Check if signup infrastructure exists
-- Run these in Supabase SQL Editor

-- 1. Check if user exists in auth.users
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if profile exists
SELECT
  id,
  user_id,
  email,
  full_name,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if league exists
SELECT
  id,
  name,
  slug,
  subdomain,
  created_at
FROM leagues
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if the signup_league_with_owner function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'signup_league_with_owner'
  AND routine_schema = 'public';

-- 5. Check if there's a trigger to auto-create profiles
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';
