-- ==============================================================================
-- TEST DOMAIN LOOKUP FUNCTIONALITY
-- ==============================================================================
-- Purpose: Test get_league_by_hostname() function with various scenarios
-- Agent: Agent 1 - Database Schema & Multi-Tenancy
-- Date: January 26, 2026
-- ==============================================================================

-- ==============================================================================
-- TEST 1: Subdomain Routing (Primary Method)
-- ==============================================================================

DO $$
DECLARE
  result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST 1: SUBDOMAIN ROUTING';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Test 1a: pilot.beerleaguehockey.ca
  RAISE NOTICE 'Test 1a: pilot.beerleaguehockey.ca';
  SELECT * INTO result FROM get_league_by_hostname('pilot.beerleaguehockey.ca') LIMIT 1;

  IF result.slug = 'pilot' THEN
    RAISE NOTICE '  ✅ PASS: Resolved to pilot league';
    RAISE NOTICE '      - League: %', result.name;
    RAISE NOTICE '      - Subdomain: %', result.subdomain;
    RAISE NOTICE '      - Primary Color: %', result.primary_color;
  ELSE
    RAISE WARNING '  ❌ FAIL: Did not resolve to pilot league';
  END IF;

  -- Test 1b: pilot.localhost (for local development)
  RAISE NOTICE '';
  RAISE NOTICE 'Test 1b: pilot.localhost (local development)';
  SELECT * INTO result FROM get_league_by_hostname('pilot.localhost') LIMIT 1;

  IF result.slug = 'pilot' THEN
    RAISE NOTICE '  ✅ PASS: Resolved to pilot league';
  ELSE
    RAISE WARNING '  ❌ FAIL: Did not resolve to pilot league';
  END IF;

  -- Test 1c: pilot.localhost:3000 (with port)
  RAISE NOTICE '';
  RAISE NOTICE 'Test 1c: pilot.localhost:3000 (with port)';
  SELECT * INTO result FROM get_league_by_hostname('pilot.localhost:3000') LIMIT 1;

  IF result.slug = 'pilot' THEN
    RAISE NOTICE '  ✅ PASS: Resolved to pilot league (port stripped correctly)';
  ELSE
    RAISE WARNING '  ❌ FAIL: Did not resolve to pilot league';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- TEST 2: Custom Domain Routing (For Pro/Enterprise Leagues)
-- ==============================================================================

DO $$
DECLARE
  result RECORD;
  test_league_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST 2: CUSTOM DOMAIN ROUTING';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Create a test league with custom domain
  INSERT INTO leagues (
    name,
    slug,
    subdomain,
    custom_domain,
    custom_domain_verified,
    status,
    subscription_tier,
    primary_color
  ) VALUES (
    'Test Custom Domain League',
    'test-custom',
    'testcustom',
    'hockeyawesomeleague.com',
    true,
    'active',
    'enterprise',
    '#FF5733'
  )
  ON CONFLICT (slug) DO UPDATE SET
    custom_domain = EXCLUDED.custom_domain,
    custom_domain_verified = EXCLUDED.custom_domain_verified
  RETURNING id INTO test_league_id;

  -- Test 2a: Custom domain lookup
  RAISE NOTICE 'Test 2a: hockeyawesomeleague.com (verified custom domain)';
  SELECT * INTO result FROM get_league_by_hostname('hockeyawesomeleague.com') LIMIT 1;

  IF result.custom_domain = 'hockeyawesomeleague.com' THEN
    RAISE NOTICE '  ✅ PASS: Resolved to custom domain league';
    RAISE NOTICE '      - League: %', result.name;
    RAISE NOTICE '      - Custom Domain: %', result.custom_domain;
    RAISE NOTICE '      - Verified: %', result.custom_domain_verified;
  ELSE
    RAISE WARNING '  ❌ FAIL: Did not resolve to custom domain league';
  END IF;

  -- Test 2b: Custom domain with www prefix
  RAISE NOTICE '';
  RAISE NOTICE 'Test 2b: www.hockeyawesomeleague.com (with www)';
  SELECT * INTO result FROM get_league_by_hostname('www.hockeyawesomeleague.com') LIMIT 1;

  IF result.custom_domain = 'hockeyawesomeleague.com' THEN
    RAISE NOTICE '  ✅ PASS: Resolved correctly (www stripped)';
  ELSE
    RAISE WARNING '  ❌ FAIL: Did not strip www prefix correctly';
  END IF;

  -- Test 2c: Unverified custom domain should not resolve
  UPDATE leagues SET custom_domain_verified = false WHERE id = test_league_id;

  RAISE NOTICE '';
  RAISE NOTICE 'Test 2c: hockeyawesomeleague.com (unverified)';
  SELECT * INTO result FROM get_league_by_hostname('hockeyawesomeleague.com') LIMIT 1;

  IF result.custom_domain IS NULL THEN
    RAISE NOTICE '  ✅ PASS: Unverified domain correctly rejected';
  ELSE
    RAISE WARNING '  ❌ FAIL: Unverified domain should not resolve';
  END IF;

  -- Clean up test league
  DELETE FROM leagues WHERE id = test_league_id;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- TEST 3: Platform Domain (No League)
-- ==============================================================================

DO $$
DECLARE
  result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST 3: PLATFORM DOMAIN ROUTING';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Test 3a: Main platform domain
  RAISE NOTICE 'Test 3a: beerleaguehockey.ca (platform homepage)';
  SELECT * INTO result FROM get_league_by_hostname('beerleaguehockey.ca') LIMIT 1;

  IF result.id IS NULL THEN
    RAISE NOTICE '  ✅ PASS: Platform domain returns NULL (correct for /discover, /about, etc.)';
  ELSE
    RAISE WARNING '  ❌ FAIL: Platform domain should not resolve to a league';
  END IF;

  -- Test 3b: localhost (local development platform)
  RAISE NOTICE '';
  RAISE NOTICE 'Test 3b: localhost (local platform)';
  SELECT * INTO result FROM get_league_by_hostname('localhost') LIMIT 1;

  IF result.id IS NULL THEN
    RAISE NOTICE '  ✅ PASS: localhost returns NULL (correct for platform pages)';
  ELSE
    RAISE WARNING '  ❌ FAIL: localhost should not resolve to a league';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- TEST 4: Invalid/Non-existent Subdomains
-- ==============================================================================

DO $$
DECLARE
  result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST 4: INVALID SUBDOMAIN HANDLING';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Test 4a: Non-existent subdomain
  RAISE NOTICE 'Test 4a: nonexistent.beerleaguehockey.ca';
  SELECT * INTO result FROM get_league_by_hostname('nonexistent.beerleaguehockey.ca') LIMIT 1;

  IF result.id IS NULL THEN
    RAISE NOTICE '  ✅ PASS: Non-existent subdomain returns NULL';
  ELSE
    RAISE WARNING '  ❌ FAIL: Non-existent subdomain should return NULL';
  END IF;

  -- Test 4b: Random domain
  RAISE NOTICE '';
  RAISE NOTICE 'Test 4b: completelyrandomdomain.com';
  SELECT * INTO result FROM get_league_by_hostname('completelyrandomdomain.com') LIMIT 1;

  IF result.id IS NULL THEN
    RAISE NOTICE '  ✅ PASS: Random domain returns NULL';
  ELSE
    RAISE WARNING '  ❌ FAIL: Random domain should return NULL';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- TEST 5: Branding Data Completeness
-- ==============================================================================

DO $$
DECLARE
  result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST 5: BRANDING DATA COMPLETENESS';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Verifying pilot league branding data:';
  RAISE NOTICE '';

  SELECT * INTO result FROM get_league_by_hostname('pilot.beerleaguehockey.ca') LIMIT 1;

  IF result.id IS NOT NULL THEN
    RAISE NOTICE '  League: %', result.name;
    RAISE NOTICE '  Slug: %', result.slug;
    RAISE NOTICE '  Subdomain: %', result.subdomain;
    RAISE NOTICE '  Logo URL: %', COALESCE(result.logo_url, 'NOT SET');
    RAISE NOTICE '  Favicon URL: %', COALESCE(result.favicon_url, 'NOT SET');
    RAISE NOTICE '  Primary Color: %', result.primary_color;
    RAISE NOTICE '  Secondary Color: %', result.secondary_color;
    RAISE NOTICE '  Accent Color: %', result.accent_color;
    RAISE NOTICE '  Font Family: %', result.font_family;
    RAISE NOTICE '  Status: %', result.status;
    RAISE NOTICE '';

    -- Verify required fields
    IF result.primary_color IS NOT NULL AND result.secondary_color IS NOT NULL THEN
      RAISE NOTICE '  ✅ PASS: Required branding fields present';
    ELSE
      RAISE WARNING '  ❌ FAIL: Missing required branding fields';
    END IF;
  ELSE
    RAISE WARNING '  ❌ FAIL: Could not load pilot league';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- TEST 6: League Branding View
-- ==============================================================================

DO $$
DECLARE
  view_count INTEGER;
  pilot_in_view BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST 6: LEAGUE BRANDING VIEW';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Check if view exists and has data
  SELECT COUNT(*) INTO view_count FROM league_branding;

  RAISE NOTICE 'Leagues in branding view: %', view_count;

  -- Check if pilot league is in view
  SELECT EXISTS (
    SELECT 1 FROM league_branding WHERE slug = 'pilot'
  ) INTO pilot_in_view;

  IF pilot_in_view THEN
    RAISE NOTICE '  ✅ PASS: Pilot league visible in branding view';
  ELSE
    RAISE WARNING '  ❌ FAIL: Pilot league not in branding view';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- TEST 7: Performance Test (Multiple Lookups)
-- ==============================================================================

DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTERVAL;
  i INTEGER;
  result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST 7: PERFORMANCE TEST';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Running 100 hostname lookups...';

  start_time := clock_timestamp();

  FOR i IN 1..100 LOOP
    SELECT * INTO result FROM get_league_by_hostname('pilot.beerleaguehockey.ca') LIMIT 1;
  END LOOP;

  end_time := clock_timestamp();
  duration := end_time - start_time;

  RAISE NOTICE '';
  RAISE NOTICE '  Total time: %', duration;
  RAISE NOTICE '  Average per lookup: % ms', EXTRACT(MILLISECONDS FROM duration) / 100;

  IF EXTRACT(MILLISECONDS FROM duration) / 100 < 10 THEN
    RAISE NOTICE '  ✅ PASS: Performance is excellent (< 10ms per lookup)';
  ELSIF EXTRACT(MILLISECONDS FROM duration) / 100 < 50 THEN
    RAISE NOTICE '  ✅ PASS: Performance is good (< 50ms per lookup)';
  ELSE
    RAISE WARNING '  ⚠️  Performance could be improved (> 50ms per lookup)';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- SUMMARY QUERY: Show all leagues and their routing configuration
-- ==============================================================================

DO $$
DECLARE
  league_rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'LEAGUE ROUTING CONFIGURATION SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  FOR league_rec IN
    SELECT
      name,
      slug,
      subdomain,
      custom_domain,
      custom_domain_verified,
      status
    FROM leagues
    WHERE status = 'active'
    ORDER BY name
  LOOP
    RAISE NOTICE '📋 %', league_rec.name;
    RAISE NOTICE '    Slug: %', league_rec.slug;

    IF league_rec.subdomain IS NOT NULL THEN
      RAISE NOTICE '    Subdomain: %.beerleaguehockey.ca', league_rec.subdomain;
      RAISE NOTICE '               %.localhost (dev)', league_rec.subdomain;
    END IF;

    IF league_rec.custom_domain IS NOT NULL THEN
      IF league_rec.custom_domain_verified THEN
        RAISE NOTICE '    Custom Domain: % ✅', league_rec.custom_domain;
      ELSE
        RAISE NOTICE '    Custom Domain: % ⚠️ (unverified)', league_rec.custom_domain;
      END IF;
    END IF;

    RAISE NOTICE '';
  END LOOP;
END $$;

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ DOMAIN LOOKUP TESTS COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review test results above to verify:';
  RAISE NOTICE '  1. Subdomain routing works correctly';
  RAISE NOTICE '  2. Custom domain routing works for verified domains';
  RAISE NOTICE '  3. Platform domains return NULL (for /discover, /about)';
  RAISE NOTICE '  4. Invalid domains return NULL';
  RAISE NOTICE '  5. Branding data is complete';
  RAISE NOTICE '  6. Performance is acceptable';
  RAISE NOTICE '';
END $$;
