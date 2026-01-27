-- Debug pilot league subdomain issue
-- Run these queries in Supabase SQL Editor

-- ============================================================================
-- 1. Check if pilot league exists
-- ============================================================================

SELECT
  id,
  name,
  slug,
  subdomain,
  custom_domain,
  status,
  primary_color,
  secondary_color
FROM leagues
WHERE subdomain = 'pilot' OR slug = 'pilot';

-- ============================================================================
-- 2. List all leagues
-- ============================================================================

SELECT
  id,
  name,
  slug,
  subdomain,
  custom_domain,
  status
FROM leagues
ORDER BY created_at DESC;

-- ============================================================================
-- 3. Test get_league_by_hostname function with pilot subdomain
-- ============================================================================

SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.ca');

-- ============================================================================
-- 4. Test get_league_by_hostname function with localhost
-- ============================================================================

SELECT * FROM get_league_by_hostname('pilot.localhost');

-- ============================================================================
-- 5. Check if get_league_by_hostname function exists
-- ============================================================================

SELECT
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_league_by_hostname';
