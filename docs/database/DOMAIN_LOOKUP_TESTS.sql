-- ==============================================================================
-- DOMAIN LOOKUP FUNCTION - TEST SUITE
-- ==============================================================================
-- Purpose: Comprehensive tests for get_league_by_hostname() function
-- Agent: Agent 1 - Database Schema & Multi-Tenancy
-- Date: January 26, 2026
--
-- Usage: Run these queries to verify domain routing functionality
-- Expected: All tests should pass with clear success/fail indicators
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'DOMAIN LOOKUP FUNCTION TEST SUITE'
\echo '============================================================'
\echo ''
\echo 'Testing get_league_by_hostname() function for multi-instance routing'
\echo ''

-- ==============================================================================
-- TEST CATEGORY 1: SUBDOMAIN ROUTING
-- ==============================================================================
-- Tests: pilot.beerleaguehockey.ca, pilot.localhost, subdomain with port
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'TEST CATEGORY 1: SUBDOMAIN ROUTING'
\echo '============================================================'
\echo ''

-- Test 1.1: Standard Subdomain (Production Pattern)
\echo 'Test 1.1: pilot.beerleaguehockey.ca'
SELECT
  CASE
    WHEN slug = 'pilot' THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Expected slug: pilot, got: ' || COALESCE(slug, 'NULL')
  END AS result,
  name,
  subdomain,
  primary_color,
  secondary_color,
  accent_color
FROM get_league_by_hostname('pilot.beerleaguehockey.ca')
LIMIT 1;

\echo ''

-- Test 1.2: Localhost Subdomain (Development Pattern)
\echo 'Test 1.2: pilot.localhost'
SELECT
  CASE
    WHEN slug = 'pilot' THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Expected slug: pilot, got: ' || COALESCE(slug, 'NULL')
  END AS result,
  name,
  subdomain
FROM get_league_by_hostname('pilot.localhost')
LIMIT 1;

\echo ''

-- Test 1.3: Subdomain with Port (Development with Port)
\echo 'Test 1.3: pilot.localhost:3000 (port should be stripped)'
SELECT
  CASE
    WHEN slug = 'pilot' THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Port not stripped correctly'
  END AS result,
  name,
  subdomain
FROM get_league_by_hostname('pilot.localhost:3000')
LIMIT 1;

\echo ''

-- Test 1.4: Production Subdomain with Port
\echo 'Test 1.4: pilot.beerleaguehockey.ca:8080'
SELECT
  CASE
    WHEN slug = 'pilot' THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Port not stripped correctly'
  END AS result,
  name
FROM get_league_by_hostname('pilot.beerleaguehockey.ca:8080')
LIMIT 1;

\echo ''
\echo 'Category 1 Summary: Subdomain routing tests complete'
\echo ''

-- ==============================================================================
-- TEST CATEGORY 2: CUSTOM DOMAIN ROUTING
-- ==============================================================================
-- Tests: Verified custom domains, unverified domains, www prefix
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'TEST CATEGORY 2: CUSTOM DOMAIN ROUTING'
\echo '============================================================'
\echo ''

-- Create a test league with custom domain for testing
INSERT INTO leagues (
  name,
  slug,
  subdomain,
  custom_domain,
  custom_domain_verified,
  status,
  subscription_tier,
  primary_color,
  secondary_color,
  accent_color
) VALUES (
  'Test Custom Domain League',
  'test-custom-domain',
  'testcustom',
  'hockeyawesomeleague.com',
  true,
  'active',
  'enterprise',
  '#FF5733',
  '#3366CC',
  '#FFD700'
)
ON CONFLICT (slug) DO UPDATE SET
  custom_domain = EXCLUDED.custom_domain,
  custom_domain_verified = EXCLUDED.custom_domain_verified;

\echo 'Test league with custom domain created/updated'
\echo ''

-- Test 2.1: Verified Custom Domain
\echo 'Test 2.1: hockeyawesomeleague.com (verified)'
SELECT
  CASE
    WHEN custom_domain = 'hockeyawesomeleague.com' AND custom_domain_verified = true
      THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Custom domain not resolved correctly'
  END AS result,
  name,
  slug,
  custom_domain,
  custom_domain_verified
FROM get_league_by_hostname('hockeyawesomeleague.com')
LIMIT 1;

\echo ''

-- Test 2.2: Custom Domain with www Prefix (should strip www)
\echo 'Test 2.2: www.hockeyawesomeleague.com (www should be stripped)'
SELECT
  CASE
    WHEN custom_domain = 'hockeyawesomeleague.com'
      THEN 'PASS ✓'
    ELSE 'FAIL ✗ - www prefix not stripped correctly'
  END AS result,
  name,
  custom_domain
FROM get_league_by_hostname('www.hockeyawesomeleague.com')
LIMIT 1;

\echo ''

-- Test 2.3: Unverified Custom Domain (should NOT resolve)
UPDATE leagues
SET custom_domain_verified = false
WHERE slug = 'test-custom-domain';

\echo 'Test 2.3: hockeyawesomeleague.com (unverified - should NOT resolve)'
SELECT
  CASE
    WHEN id IS NULL THEN 'PASS ✓ - Unverified domain correctly rejected'
    ELSE 'FAIL ✗ - Unverified domain should not resolve'
  END AS result
FROM get_league_by_hostname('hockeyawesomeleague.com')
LIMIT 1;

\echo ''

-- Reset custom domain verification
UPDATE leagues
SET custom_domain_verified = true
WHERE slug = 'test-custom-domain';

-- Test 2.4: Custom Domain with Port
\echo 'Test 2.4: hockeyawesomeleague.com:443 (port should be stripped)'
SELECT
  CASE
    WHEN custom_domain = 'hockeyawesomeleague.com'
      THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Port not stripped from custom domain'
  END AS result,
  name
FROM get_league_by_hostname('hockeyawesomeleague.com:443')
LIMIT 1;

\echo ''
\echo 'Category 2 Summary: Custom domain routing tests complete'
\echo ''

-- ==============================================================================
-- TEST CATEGORY 3: PLATFORM DOMAIN ROUTING
-- ==============================================================================
-- Tests: Platform domains should return NULL (for /discover, /about, etc.)
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'TEST CATEGORY 3: PLATFORM DOMAIN ROUTING'
\echo '============================================================'
\echo ''

-- Test 3.1: Main Platform Domain
\echo 'Test 3.1: beerleaguehockey.ca (should return NULL for platform pages)'
SELECT
  CASE
    WHEN id IS NULL THEN 'PASS ✓ - Platform domain returns NULL'
    ELSE 'FAIL ✗ - Platform domain should not resolve to a league'
  END AS result
FROM get_league_by_hostname('beerleaguehockey.ca')
LIMIT 1;

\echo ''

-- Test 3.2: Platform Domain with www
\echo 'Test 3.2: www.beerleaguehockey.ca'
SELECT
  CASE
    WHEN id IS NULL THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END AS result
FROM get_league_by_hostname('www.beerleaguehockey.ca')
LIMIT 1;

\echo ''

-- Test 3.3: Localhost (Development Platform)
\echo 'Test 3.3: localhost (should return NULL for platform pages)'
SELECT
  CASE
    WHEN id IS NULL THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END AS result
FROM get_league_by_hostname('localhost')
LIMIT 1;

\echo ''

-- Test 3.4: Localhost with Port
\echo 'Test 3.4: localhost:3000'
SELECT
  CASE
    WHEN id IS NULL THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END AS result
FROM get_league_by_hostname('localhost:3000')
LIMIT 1;

\echo ''
\echo 'Category 3 Summary: Platform domain routing tests complete'
\echo ''

-- ==============================================================================
-- TEST CATEGORY 4: INVALID/NON-EXISTENT DOMAINS
-- ==============================================================================
-- Tests: Domains that should not resolve to any league
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'TEST CATEGORY 4: INVALID DOMAIN HANDLING'
\echo '============================================================'
\echo ''

-- Test 4.1: Non-existent Subdomain
\echo 'Test 4.1: nonexistent.beerleaguehockey.ca (should return NULL)'
SELECT
  CASE
    WHEN id IS NULL THEN 'PASS ✓ - Non-existent subdomain returns NULL'
    ELSE 'FAIL ✗ - Non-existent subdomain should not resolve'
  END AS result
FROM get_league_by_hostname('nonexistent.beerleaguehockey.ca')
LIMIT 1;

\echo ''

-- Test 4.2: Random Domain
\echo 'Test 4.2: completelyrandomdomain.com (should return NULL)'
SELECT
  CASE
    WHEN id IS NULL THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END AS result
FROM get_league_by_hostname('completelyrandomdomain.com')
LIMIT 1;

\echo ''

-- Test 4.3: Invalid Subdomain Format
\echo 'Test 4.3: invalid..subdomain.beerleaguehockey.ca (malformed)'
SELECT
  CASE
    WHEN id IS NULL THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END AS result
FROM get_league_by_hostname('invalid..subdomain.beerleaguehockey.ca')
LIMIT 1;

\echo ''

-- Test 4.4: Empty String
\echo 'Test 4.4: Empty hostname (edge case)'
SELECT
  CASE
    WHEN id IS NULL THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END AS result
FROM get_league_by_hostname('')
LIMIT 1;

\echo ''
\echo 'Category 4 Summary: Invalid domain handling tests complete'
\echo ''

-- ==============================================================================
-- TEST CATEGORY 5: BRANDING DATA COMPLETENESS
-- ==============================================================================
-- Tests: Verify all branding fields are returned correctly
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'TEST CATEGORY 5: BRANDING DATA COMPLETENESS'
\echo '============================================================'
\echo ''

\echo 'Test 5.1: Verify pilot league branding data completeness'
\echo ''

SELECT
  'League Information:' AS section,
  name,
  slug,
  subdomain,
  COALESCE(custom_domain, 'Not set') AS custom_domain,
  custom_domain_verified
FROM get_league_by_hostname('pilot.beerleaguehockey.ca')
LIMIT 1;

\echo ''

SELECT
  'Branding Configuration:' AS section,
  COALESCE(logo_url, 'Not set') AS logo_url,
  COALESCE(favicon_url, 'Not set') AS favicon_url,
  primary_color,
  secondary_color,
  accent_color,
  font_family
FROM get_league_by_hostname('pilot.beerleaguehockey.ca')
LIMIT 1;

\echo ''

SELECT
  'Advanced Branding:' AS section,
  CASE WHEN custom_css IS NOT NULL THEN 'Set' ELSE 'Not set' END AS custom_css_status,
  status
FROM get_league_by_hostname('pilot.beerleaguehockey.ca')
LIMIT 1;

\echo ''

-- Test 5.2: Required Fields Validation
\echo 'Test 5.2: Validate required branding fields are present'
SELECT
  CASE
    WHEN primary_color IS NOT NULL
      AND secondary_color IS NOT NULL
      AND accent_color IS NOT NULL
      AND font_family IS NOT NULL
      THEN 'PASS ✓ - All required branding fields present'
    ELSE 'FAIL ✗ - Missing required branding fields'
  END AS result
FROM get_league_by_hostname('pilot.beerleaguehockey.ca')
LIMIT 1;

\echo ''
\echo 'Category 5 Summary: Branding data completeness tests complete'
\echo ''

-- ==============================================================================
-- TEST CATEGORY 6: CASE SENSITIVITY & SPECIAL CHARACTERS
-- ==============================================================================
-- Tests: Hostname handling of case and special characters
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'TEST CATEGORY 6: CASE SENSITIVITY & SPECIAL CHARACTERS'
\echo '============================================================'
\echo ''

-- Test 6.1: Uppercase Hostname (should be case-insensitive)
\echo 'Test 6.1: PILOT.BEERLEAGUEHOCKEY.CA (uppercase - should still work)'
SELECT
  CASE
    WHEN slug = 'pilot' THEN 'PASS ✓ - Case insensitive'
    ELSE 'FAIL ✗ - Hostname should be case insensitive'
  END AS result,
  name
FROM get_league_by_hostname('PILOT.BEERLEAGUEHOCKEY.CA')
LIMIT 1;

\echo ''

-- Test 6.2: Mixed Case
\echo 'Test 6.2: PiLoT.BeErLeAgUeHoCkEy.Ca (mixed case)'
SELECT
  CASE
    WHEN slug = 'pilot' THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END AS result
FROM get_league_by_hostname('PiLoT.BeErLeAgUeHoCkEy.Ca')
LIMIT 1;

\echo ''

-- Test 6.3: Custom Domain Case Sensitivity
\echo 'Test 6.3: HOCKEYAWESOMELEAGUE.COM (custom domain uppercase)'
SELECT
  CASE
    WHEN custom_domain = 'hockeyawesomeleague.com' THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END AS result
FROM get_league_by_hostname('HOCKEYAWESOMELEAGUE.COM')
LIMIT 1;

\echo ''
\echo 'Category 6 Summary: Case sensitivity tests complete'
\echo ''

-- ==============================================================================
-- TEST CATEGORY 7: PERFORMANCE TESTING
-- ==============================================================================
-- Tests: Function performance under various loads
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'TEST CATEGORY 7: PERFORMANCE TESTING'
\echo '============================================================'
\echo ''

\echo 'Test 7.1: Single lookup performance'
\timing on

SELECT id, name, slug FROM get_league_by_hostname('pilot.beerleaguehockey.ca') LIMIT 1;

\timing off
\echo ''

\echo 'Test 7.2: 100 consecutive lookups (subdomain)'
\timing on

DO $$
DECLARE
  i INTEGER;
  result RECORD;
BEGIN
  FOR i IN 1..100 LOOP
    SELECT * INTO result FROM get_league_by_hostname('pilot.beerleaguehockey.ca') LIMIT 1;
  END LOOP;
END $$;

\timing off
\echo ''

\echo 'Test 7.3: 100 consecutive lookups (custom domain)'
\timing on

DO $$
DECLARE
  i INTEGER;
  result RECORD;
BEGIN
  FOR i IN 1..100 LOOP
    SELECT * INTO result FROM get_league_by_hostname('hockeyawesomeleague.com') LIMIT 1;
  END LOOP;
END $$;

\timing off
\echo ''

\echo 'Test 7.4: Mixed lookup patterns (50 each)'
\timing on

DO $$
DECLARE
  i INTEGER;
  result RECORD;
BEGIN
  FOR i IN 1..50 LOOP
    SELECT * INTO result FROM get_league_by_hostname('pilot.beerleaguehockey.ca') LIMIT 1;
    SELECT * INTO result FROM get_league_by_hostname('hockeyawesomeleague.com') LIMIT 1;
  END LOOP;
END $$;

\timing off
\echo ''

\echo 'Category 7 Summary: Performance tests complete'
\echo 'Target: < 10ms per lookup (subdomain should be fastest)'
\echo ''

-- ==============================================================================
-- TEST CATEGORY 8: LEAGUE ROUTING CONFIGURATION SUMMARY
-- ==============================================================================
-- Tests: Display all leagues and their routing configuration
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'TEST CATEGORY 8: LEAGUE ROUTING CONFIGURATION SUMMARY'
\echo '============================================================'
\echo ''

\echo 'All Active Leagues and Their Routing Configuration:'
\echo ''

SELECT
  name AS "League Name",
  slug AS "Slug",
  CASE
    WHEN subdomain IS NOT NULL
      THEN subdomain || '.beerleaguehockey.ca'
    ELSE 'No subdomain'
  END AS "Subdomain Access",
  CASE
    WHEN custom_domain IS NOT NULL AND custom_domain_verified
      THEN custom_domain || ' ✓'
    WHEN custom_domain IS NOT NULL AND NOT custom_domain_verified
      THEN custom_domain || ' (unverified)'
    ELSE 'No custom domain'
  END AS "Custom Domain",
  subscription_tier AS "Tier",
  status AS "Status"
FROM leagues
WHERE status = 'active'
ORDER BY name;

\echo ''

-- ==============================================================================
-- TEST CATEGORY 9: LEAGUE BRANDING VIEW VERIFICATION
-- ==============================================================================
-- Tests: Verify league_branding view works correctly
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'TEST CATEGORY 9: LEAGUE BRANDING VIEW'
\echo '============================================================'
\echo ''

\echo 'Test 9.1: Verify league_branding view contains active leagues'
SELECT
  COUNT(*) AS active_leagues_in_view,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS ✓'
    ELSE 'FAIL ✗ - View should contain active leagues'
  END AS result
FROM league_branding;

\echo ''

\echo 'Test 9.2: Verify pilot league is in branding view'
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM league_branding WHERE slug = 'pilot')
      THEN 'PASS ✓ - Pilot league in view'
    ELSE 'FAIL ✗ - Pilot league missing from view'
  END AS result;

\echo ''

\echo 'Test 9.3: Sample branding data from view'
SELECT
  name,
  slug,
  subdomain,
  primary_color,
  secondary_color,
  accent_color
FROM league_branding
WHERE slug = 'pilot';

\echo ''
\echo 'Category 9 Summary: League branding view tests complete'
\echo ''

-- ==============================================================================
-- CLEANUP: Remove test league
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'CLEANUP: Removing test data'
\echo '============================================================'
\echo ''

DELETE FROM leagues WHERE slug = 'test-custom-domain';

\echo 'Test league "test-custom-domain" removed'
\echo ''

-- ==============================================================================
-- FINAL TEST SUMMARY
-- ==============================================================================

\echo ''
\echo '============================================================'
\echo 'FINAL TEST SUMMARY'
\echo '============================================================'
\echo ''
\echo 'All test categories completed. Review results above.'
\echo ''
\echo 'Test Categories:'
\echo '  1. Subdomain Routing (4 tests)'
\echo '  2. Custom Domain Routing (4 tests)'
\echo '  3. Platform Domain Routing (4 tests)'
\echo '  4. Invalid Domain Handling (4 tests)'
\echo '  5. Branding Data Completeness (2 tests)'
\echo '  6. Case Sensitivity (3 tests)'
\echo '  7. Performance Testing (4 tests)'
\echo '  8. Routing Configuration Summary'
\echo '  9. Branding View Verification (3 tests)'
\echo ''
\echo 'Total Tests: 28'
\echo ''
\echo 'Expected Results:'
\echo '  - All PASS ✓ indicators should be visible'
\echo '  - No FAIL ✗ indicators should appear'
\echo '  - Performance should be < 10ms per lookup'
\echo '  - All leagues should have valid routing configuration'
\echo ''
\echo '============================================================'
\echo 'END OF TEST SUITE'
\echo '============================================================'
\echo ''

-- ==============================================================================
-- ADDITIONAL VERIFICATION QUERIES
-- ==============================================================================
-- These queries can be run separately for detailed analysis
-- ==============================================================================

-- Query 1: Check all indexes on subdomain and custom_domain
\echo 'Bonus Check: Verify indexes exist for performance'
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'leagues'
  AND (indexname LIKE '%subdomain%' OR indexname LIKE '%custom_domain%')
ORDER BY indexname;

\echo ''

-- Query 2: Check function definition
\echo 'Bonus Check: Verify function exists and has correct return type'
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'get_league_by_hostname'
  AND routine_schema = 'public';

\echo ''

-- Query 3: Estimate query plan for function
\echo 'Bonus Check: Explain plan for subdomain lookup'
EXPLAIN ANALYZE
SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.ca');

\echo ''
\echo '============================================================'
\echo 'All tests and verification checks complete!'
\echo '============================================================'
