-- ============================================
-- MAKE YOURSELF A SCOREKEEPER (WORKING VERSION)
-- Replace 'YOUR_EMAIL_HERE' with the email you used to sign up
-- Run this AFTER you create your account
-- ============================================

-- Step 1: Update your role to scorekeeper
UPDATE profiles
SET role = 'scorekeeper'
WHERE email = 'YOUR_EMAIL_HERE';  -- ⚠️ CHANGE THIS TO YOUR EMAIL

-- Step 2: Add yourself to the test league
INSERT INTO league_members (league_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, 'scorekeeper'
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
ON CONFLICT DO NOTHING;

-- Step 3: Assign yourself to the test game
INSERT INTO game_scorekeeper_assignments (game_id, scorekeeper_id, assigned_by)
SELECT '00000000-0000-0000-0000-000000000301', id, id
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
ON CONFLICT (game_id, scorekeeper_id) DO NOTHING;

-- Verify setup
SELECT
  '✅ SCOREKEEPER SETUP COMPLETE!' as status,
  '' as info
UNION ALL
SELECT
  '=====================================' as status,
  '' as info
UNION ALL
SELECT
  '📧 Your email:' as status,
  email as info
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
UNION ALL
SELECT
  '🎭 Role:' as status,
  role as info
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
UNION ALL
SELECT
  '🏒 League:' as status,
  'Test Hockey League' as info
UNION ALL
SELECT
  '🎮 Game:' as status,
  'Red Wings vs Blue Jets' as info
UNION ALL
SELECT
  '' as status,
  '' as info
UNION ALL
SELECT
  '🌐 Scorekeeper URL:' as status,
  'http://localhost:3000/test-hockey/scorekeeper' as info;
