-- Fix Legacy Data for Multi-Tenant Architecture
-- Run this AFTER reviewing the results from CHECK_DATABASE_SCHEMA.sql

-- ============================================================================
-- STEP 1: Assign a default league to orphaned data
-- ============================================================================

-- First, let's identify or create a default league for legacy data
-- Replace 'YOUR_LEAGUE_ID' with the pilot league ID after running this query:

SELECT
  id as league_id,
  name,
  slug
FROM leagues
WHERE slug = 'pilot' OR subdomain = 'pilot'
LIMIT 1;

-- ============================================================================
-- STEP 2: Create league memberships for profiles without them
-- ============================================================================

-- Option A: Assign ALL orphaned users to the pilot league as players
-- (SAFE - run this if you want all users in one league)

-- INSERT INTO league_memberships (league_id, user_id, role, status)
-- SELECT
--   'YOUR_LEAGUE_ID'::UUID,  -- Replace with pilot league ID from above
--   p.id,
--   'player',
--   'active'
-- FROM profiles p
-- WHERE NOT EXISTS (
--   SELECT 1 FROM league_memberships lm WHERE lm.user_id = p.id
-- )
-- ON CONFLICT (league_id, user_id) DO NOTHING;


-- Option B: Create individual leagues for each orphaned user
-- (Use if each user should have their own league)

-- DO $$
-- DECLARE
--   user_record RECORD;
--   new_league_id UUID;
-- BEGIN
--   FOR user_record IN
--     SELECT p.id as user_id, p.email, p.full_name
--     FROM profiles p
--     WHERE NOT EXISTS (
--       SELECT 1 FROM league_memberships lm WHERE lm.user_id = p.id
--     )
--   LOOP
--     -- Create a league for this user
--     INSERT INTO leagues (
--       name,
--       slug,
--       subdomain,
--       sport,
--       status
--     ) VALUES (
--       COALESCE(user_record.full_name, 'User') || '''s League',
--       LOWER(REGEXP_REPLACE(COALESCE(user_record.full_name, user_record.email), '[^a-zA-Z0-9]', '-', 'g')),
--       LOWER(REGEXP_REPLACE(COALESCE(user_record.full_name, user_record.email), '[^a-zA-Z0-9]', '-', 'g')),
--       'hockey',
--       'active'
--     )
--     RETURNING id INTO new_league_id;
--
--     -- Create league membership
--     INSERT INTO league_memberships (league_id, user_id, role, status)
--     VALUES (new_league_id, user_record.user_id, 'owner', 'active');
--   END LOOP;
-- END $$;

-- ============================================================================
-- STEP 3: Assign league_id to orphaned teams
-- ============================================================================

-- Option: Assign all orphaned teams to pilot league
-- UPDATE teams
-- SET league_id = 'YOUR_LEAGUE_ID'::UUID  -- Replace with pilot league ID
-- WHERE league_id IS NULL;

-- ============================================================================
-- STEP 4: Assign league_id to orphaned seasons
-- ============================================================================

-- Option: Assign all orphaned seasons to pilot league
-- UPDATE seasons
-- SET league_id = 'YOUR_LEAGUE_ID'::UUID  -- Replace with pilot league ID
-- WHERE league_id IS NULL;

-- ============================================================================
-- STEP 5: Assign league_id to orphaned games
-- ============================================================================

-- Option: Assign all orphaned games to pilot league
-- UPDATE games
-- SET league_id = 'YOUR_LEAGUE_ID'::UUID  -- Replace with pilot league ID
-- WHERE league_id IS NULL;

-- ============================================================================
-- STEP 6: Link team captains to league memberships
-- ============================================================================

-- Ensure all team captains have league memberships
-- INSERT INTO league_memberships (league_id, user_id, role, status)
-- SELECT DISTINCT
--   t.league_id,
--   t.captain_id,
--   'captain',
--   'active'
-- FROM teams t
-- WHERE t.captain_id IS NOT NULL
--   AND t.league_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1
--     FROM league_memberships lm
--     WHERE lm.league_id = t.league_id AND lm.user_id = t.captain_id
--   )
-- ON CONFLICT (league_id, user_id) DO UPDATE
-- SET role = 'captain'
-- WHERE league_memberships.role = 'player';

-- ============================================================================
-- STEP 7: Link roster players to league memberships
-- ============================================================================

-- Ensure all players on team rosters have league memberships
-- INSERT INTO league_memberships (league_id, user_id, role, status)
-- SELECT DISTINCT
--   tm.league_id,
--   tr.player_id,
--   'player',
--   'active'
-- FROM team_rosters tr
-- JOIN teams tm ON tr.team_id = tm.id
-- WHERE tm.league_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1
--     FROM league_memberships lm
--     WHERE lm.league_id = tm.league_id AND lm.user_id = tr.player_id
--   )
-- ON CONFLICT (league_id, user_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- After running fixes, verify:

-- 1. Check if all profiles have league memberships
SELECT
  COUNT(*) as profiles_without_memberships
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM league_memberships lm WHERE lm.user_id = p.id
);
-- Expected: 0

-- 2. Check if all teams have league_id
SELECT COUNT(*) as teams_without_league FROM teams WHERE league_id IS NULL;
-- Expected: 0

-- 3. Check if all seasons have league_id
SELECT COUNT(*) as seasons_without_league FROM seasons WHERE league_id IS NULL;
-- Expected: 0

-- 4. Check if all games have league_id
SELECT COUNT(*) as games_without_league FROM games WHERE league_id IS NULL;
-- Expected: 0

-- 5. Show league membership summary
SELECT
  l.name as league_name,
  COUNT(DISTINCT lm.user_id) as member_count,
  COUNT(CASE WHEN lm.role = 'owner' THEN 1 END) as owners,
  COUNT(CASE WHEN lm.role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN lm.role = 'captain' THEN 1 END) as captains,
  COUNT(CASE WHEN lm.role = 'player' THEN 1 END) as players
FROM leagues l
LEFT JOIN league_memberships lm ON lm.league_id = l.id
GROUP BY l.id, l.name
ORDER BY l.name;
