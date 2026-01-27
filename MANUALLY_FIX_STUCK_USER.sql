-- Manually fix stuck user account
-- Use this if signup created user but not profile/league

-- ============================================================================
-- STEP 1: Find your user ID
-- ============================================================================
-- Run this first to get your user_id
SELECT
  id as user_id,
  email,
  email_confirmed_at,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- Copy the user_id from the result above


-- ============================================================================
-- STEP 2: Create missing profile
-- ============================================================================
-- Replace YOUR_USER_ID and YOUR_EMAIL with values from Step 1

INSERT INTO profiles (id, user_id, email, full_name)
VALUES (
  'YOUR_USER_ID'::UUID,  -- Replace with user_id from Step 1
  'YOUR_USER_ID'::UUID,  -- Same user_id
  'YOUR_EMAIL@example.com',  -- Your email
  'Your Full Name'  -- Your name
)
ON CONFLICT (user_id) DO NOTHING;


-- ============================================================================
-- STEP 3: Create league
-- ============================================================================
-- Replace with your desired league info

INSERT INTO leagues (
  name,
  slug,
  subdomain,
  sport,
  description,
  primary_color,
  secondary_color,
  accent_color,
  status,
  is_public
) VALUES (
  'Your League Name',  -- League name
  'your-league',  -- Slug (lowercase, no spaces)
  'your-league',  -- Subdomain (same as slug usually)
  'hockey',  -- Sport
  'Our awesome league',  -- Description
  '#E31837',  -- Primary color
  '#0066CC',  -- Secondary color
  '#FFD700',  -- Accent color
  'active',
  true
)
RETURNING id;

-- Copy the league ID from the result above


-- ============================================================================
-- STEP 4: Create league membership (owner role)
-- ============================================================================
-- Replace YOUR_USER_ID and YOUR_LEAGUE_ID

INSERT INTO league_memberships (
  league_id,
  user_id,
  role,
  status
) VALUES (
  'YOUR_LEAGUE_ID'::UUID,  -- From Step 3
  'YOUR_USER_ID'::UUID,  -- From Step 1
  'owner',
  'active'
);


-- ============================================================================
-- STEP 5: Confirm email
-- ============================================================================

UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = 'YOUR_USER_ID'::UUID;


-- ============================================================================
-- STEP 6: Verify everything is set up
-- ============================================================================

-- Check profile exists
SELECT * FROM profiles WHERE user_id = 'YOUR_USER_ID'::UUID;

-- Check league exists
SELECT * FROM leagues WHERE id = 'YOUR_LEAGUE_ID'::UUID;

-- Check membership exists
SELECT * FROM league_memberships
WHERE user_id = 'YOUR_USER_ID'::UUID
  AND league_id = 'YOUR_LEAGUE_ID'::UUID;

-- Check email is confirmed
SELECT email, email_confirmed_at
FROM auth.users
WHERE id = 'YOUR_USER_ID'::UUID;
