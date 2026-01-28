-- Test Scorekeeper Setup Script
-- Run this in Supabase SQL Editor to create a complete test environment
-- This creates: league, teams, season, game, and scorekeeper user

-- ============================================
-- 1. CREATE TEST LEAGUE
-- ============================================

-- First, let's create a test league
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
  'test@example.com',
  'Test league for scorekeeper testing',
  false,
  'pro',
  'active'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================
-- 2. CREATE TEST TEAMS
-- ============================================

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
    'Test Home Team',
    'HOME',
    '#FF0000',
    '#000000'
  ),
  (
    'team-away-001',
    'test-league-001',
    'Test Away Team',
    'AWAY',
    '#0000FF',
    '#FFFFFF'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================
-- 3. CREATE TEST SEASON
-- ============================================

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
  updated_at = NOW();

-- ============================================
-- 4. CREATE TEST GAME
-- ============================================

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
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================
-- 5. OUTPUT INSTRUCTIONS
-- ============================================

-- Display the test data created
SELECT
  'Test data created successfully!' as message,
  'League ID: test-league-001' as league,
  'Home Team: Test Home Team (ID: team-home-001)' as team1,
  'Away Team: Test Away Team (ID: team-away-001)' as team2,
  'Season: Test Season 2026 (ID: season-test-001)' as season,
  'Game: Ready for scoring (ID: game-test-001)' as game;

-- ============================================
-- 6. DISPLAY NEXT STEPS
-- ============================================

SELECT
  '========================================' as step,
  'NEXT STEPS:' as action,
  '========================================' as step2
UNION ALL
SELECT
  'Step 1' as step,
  'Create a user account at: http://localhost:3000/signup/league' as action,
  'Use email: scorekeeper@test.com, password: Test123!' as step2
UNION ALL
SELECT
  'Step 2' as step,
  'After signup, run the following SQL to make yourself a scorekeeper:' as action,
  '' as step2
UNION ALL
SELECT
  'SQL' as step,
  'UPDATE profiles SET role = ''scorekeeper'' WHERE email = ''scorekeeper@test.com'';' as action,
  '' as step2
UNION ALL
SELECT
  'Step 3' as step,
  'Assign yourself to the game as scorekeeper:' as action,
  '' as step2
UNION ALL
SELECT
  'SQL' as step,
  'INSERT INTO game_scorekeeper_assignments (game_id, scorekeeper_id, assigned_by)' as action,
  'SELECT ''game-test-001'', id, id FROM profiles WHERE email = ''scorekeeper@test.com'';' as step2;
