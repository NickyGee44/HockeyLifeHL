-- ============================================
-- BASIC TEST DATA SETUP
-- Only uses base columns (no enhanced fields)
-- Run this in Supabase SQL Editor
-- ============================================

-- Create test league (using only base columns)
INSERT INTO leagues (
  id,
  name,
  slug,
  description,
  city,
  state_province,
  contact_email,
  subscription_tier,
  subscription_status,
  status
) VALUES (
  'test-league-001',
  'Test Hockey League',
  'test-hockey',
  'Test league for scorekeeper testing',
  'Test City',
  'Test State',
  'admin@testhockey.com',
  'pro',
  'active',
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
    '#FFFFFF'
  ),
  (
    'team-away-001',
    'test-league-001',
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
  '1️⃣ Sign up at:' as status,
  'http://localhost:3000/login' as info
UNION ALL
SELECT
  '2️⃣ Use any email/password' as status,
  '' as info
UNION ALL
SELECT
  '3️⃣ After signup, run:' as status,
  'setup_user_as_scorekeeper.sql' as info
UNION ALL
SELECT
  '   (Remember to change YOUR_EMAIL_HERE!)' as status,
  '' as info;
