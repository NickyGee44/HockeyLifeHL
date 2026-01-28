-- ============================================
-- TEST DATA SETUP WITH PROPER UUIDs
-- Run this in Supabase SQL Editor
-- ============================================

-- Create test league with proper UUID
INSERT INTO leagues (
  id,
  name,
  slug,
  sport,
  city,
  state_province,
  contact_email,
  tagline,
  is_public,
  subscription_tier,
  subscription_status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Hockey League',
  'test-hockey',
  'hockey',
  'Test City',
  'Test State',
  'admin@testhockey.com',
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
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'Red Wings',
    'RED',
    '#FF0000',
    '#FFFFFF'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000001',
    'Blue Jets',
    'BLUE',
    '#0066CC',
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
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
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
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  CURRENT_DATE,
  '19:00:00',
  'Test Arena',
  'scheduled'
) ON CONFLICT (id) DO UPDATE SET
  status = 'scheduled',
  updated_at = NOW();

-- Display results
SELECT
  '✅ TEST DATA CREATED!' as status,
  '' as info
UNION ALL
SELECT
  '=====================================' as status,
  '' as info
UNION ALL
SELECT
  '🏒 League:' as status,
  'Test Hockey League (slug: test-hockey)' as info
UNION ALL
SELECT
  '⚡ Teams:' as status,
  'Red Wings vs Blue Jets' as info
UNION ALL
SELECT
  '📅 Game:' as status,
  'Scheduled for today at 7:00 PM' as info
UNION ALL
SELECT
  '' as status,
  '' as info
UNION ALL
SELECT
  '📝 NEXT STEPS:' as status,
  '' as info
UNION ALL
SELECT
  '1️⃣' as status,
  'Sign up at: http://localhost:3000/login' as info
UNION ALL
SELECT
  '2️⃣' as status,
  'Use any email/password you want' as info
UNION ALL
SELECT
  '3️⃣' as status,
  'After signup, run setup_user_as_scorekeeper.sql' as info
UNION ALL
SELECT
  '   📋' as status,
  'with your email address' as info;
