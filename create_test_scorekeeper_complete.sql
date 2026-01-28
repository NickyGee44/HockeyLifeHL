-- ============================================
-- COMPLETE TEST SCOREKEEPER SETUP
-- Run this entire script in Supabase SQL Editor
-- Creates: User, League, Teams, Season, Game, and Assignments
-- ============================================

-- Create test user
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create user in auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'scorekeeper@test.com',
    crypt('Test123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Test Scorekeeper"}',
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (email) DO UPDATE SET
    email_confirmed_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO new_user_id;

  -- If user already exists, get their ID
  IF new_user_id IS NULL THEN
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'scorekeeper@test.com';
  END IF;

  -- Create or update profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role
  ) VALUES (
    new_user_id,
    'scorekeeper@test.com',
    'Test Scorekeeper',
    'scorekeeper'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'scorekeeper',
    updated_at = NOW();

  RAISE NOTICE 'User created with ID: %', new_user_id;
END $$;

-- Create test league
INSERT INTO leagues (
  id,
  name,
  slug,
  sport,
  city,
  region,
  contact_email,
  tagline,
  is_public,
  subscription_tier,
  subscription_status
) VALUES (
  'test-league-001',
  'Test Hockey League',
  'test-hockey',
  'hockey',
  'Test City',
  'Test State',
  'scorekeeper@test.com',
  'Test league for scorekeeper testing',
  false,
  'pro',
  'active'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Create test teams
INSERT INTO teams (
  id,
  league_id,
  name,
  short_name,
  primary_color,
  secondary_color
) VALUES
  (
    'team-home-001',
    'test-league-001',
    'Red Wings',
    'RED',
    '#FF0000',
    '#000000'
  ),
  (
    'team-away-001',
    'test-league-001',
    'Blue Jets',
    'BLUE',
    '#0000FF',
    '#FFFFFF'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Create test season
INSERT INTO seasons (
  id,
  league_id,
  name,
  status,
  start_date,
  end_date
) VALUES (
  'season-test-001',
  'test-league-001',
  'Test Season 2026',
  'active',
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'active',
  updated_at = NOW();

-- Create test game
INSERT INTO games (
  id,
  league_id,
  season_id,
  home_team_id,
  away_team_id,
  game_date,
  game_time,
  location,
  status
) VALUES (
  'game-test-001',
  'test-league-001',
  'season-test-001',
  'team-home-001',
  'team-away-001',
  CURRENT_DATE,
  '19:00:00',
  'Test Arena',
  'scheduled'
) ON CONFLICT (id) DO UPDATE SET
  status = 'scheduled',
  updated_at = NOW();

-- Add scorekeeper to league
INSERT INTO league_members (league_id, user_id, role)
SELECT 'test-league-001', id, 'scorekeeper'
FROM profiles
WHERE email = 'scorekeeper@test.com'
ON CONFLICT DO NOTHING;

-- Assign scorekeeper to game
INSERT INTO game_scorekeeper_assignments (game_id, scorekeeper_id, assigned_by)
SELECT 'game-test-001', id, id
FROM profiles
WHERE email = 'scorekeeper@test.com'
ON CONFLICT (game_id, scorekeeper_id) DO NOTHING;

-- Display results
SELECT
  '✅ SETUP COMPLETE!' as status,
  '' as separator,
  '=====================================' as line1
UNION ALL
SELECT
  '📧 Email:' as status,
  'scorekeeper@test.com' as separator,
  '' as line1
UNION ALL
SELECT
  '🔑 Password:' as status,
  'Test123!' as separator,
  '' as line1
UNION ALL
SELECT
  '🏒 League:' as status,
  'Test Hockey League' as separator,
  '(slug: test-hockey)' as line1
UNION ALL
SELECT
  '⚡ Teams:' as status,
  'Red Wings vs Blue Jets' as separator,
  '' as line1
UNION ALL
SELECT
  '🎮 Game:' as status,
  'Ready for scoring' as separator,
  '(ID: game-test-001)' as line1
UNION ALL
SELECT
  '' as status,
  '' as separator,
  '=====================================' as line1
UNION ALL
SELECT
  '🌐 Login URL:' as status,
  'http://localhost:3000/login' as separator,
  '' as line1
UNION ALL
SELECT
  '📊 Scorekeeper:' as status,
  'http://localhost:3000/test-hockey/scorekeeper' as separator,
  '' as line1;
