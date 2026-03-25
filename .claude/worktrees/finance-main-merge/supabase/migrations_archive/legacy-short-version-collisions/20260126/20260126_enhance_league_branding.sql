-- ==============================================================================
-- ENHANCE LEAGUE BRANDING & MULTI-INSTANCE SUPPORT
-- ==============================================================================
-- Purpose: Add comprehensive branding options and subdomain/custom domain routing
-- Agent: Agent 1 - Database Schema & Multi-Tenancy
-- Date: January 26, 2026
-- ==============================================================================

-- ==============================================================================
-- ADD BRANDING COLUMNS to leagues table
-- ==============================================================================

-- Subdomain for routing (e.g., "pilot" -> pilot.beerleaguehockey.ca)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- Additional branding colors
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#FFD700';

-- Additional branding assets
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS banner_url TEXT;

ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Typography customization
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter, system-ui, sans-serif';

-- Advanced customization for Pro/Enterprise tiers
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS custom_css TEXT;

-- League tagline/motto
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Custom domain verification flag
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false;

-- ==============================================================================
-- COMMENTS
-- ==============================================================================
COMMENT ON COLUMN leagues.subdomain IS 'Subdomain for league access (e.g., "pilot" for pilot.beerleaguehockey.ca)';
COMMENT ON COLUMN leagues.accent_color IS 'Tertiary brand color for highlights and accents (hex format)';
COMMENT ON COLUMN leagues.banner_url IS 'Header/hero banner image URL';
COMMENT ON COLUMN leagues.favicon_url IS 'Custom favicon URL for browser tabs';
COMMENT ON COLUMN leagues.font_family IS 'Custom font family for league branding';
COMMENT ON COLUMN leagues.custom_css IS 'Custom CSS for advanced branding (Pro/Enterprise only)';
COMMENT ON COLUMN leagues.tagline IS 'League tagline or motto';
COMMENT ON COLUMN leagues.custom_domain_verified IS 'Whether custom domain DNS has been verified';

-- ==============================================================================
-- INDEXES for Performance
-- ==============================================================================

-- Subdomain lookup (critical for routing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_subdomain
  ON leagues(subdomain)
  WHERE subdomain IS NOT NULL;

-- Custom domain lookup (critical for routing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_custom_domain
  ON leagues(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- ==============================================================================
-- FUNCTION: get_league_by_hostname
-- ==============================================================================
-- Purpose: Resolve which league to load based on hostname
-- Used by middleware to route requests to the correct league instance
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_league_by_hostname(hostname TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  subdomain TEXT,
  custom_domain TEXT,
  custom_domain_verified BOOLEAN,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  font_family TEXT,
  custom_css TEXT,
  status TEXT
) AS $$
DECLARE
  clean_hostname TEXT;
  subdomain_part TEXT;
BEGIN
  -- Clean the hostname (remove port, www prefix)
  clean_hostname := LOWER(REGEXP_REPLACE(hostname, ':\d+$', ''));
  clean_hostname := REGEXP_REPLACE(clean_hostname, '^www\.', '');

  -- Strategy 1: Check if hostname is a verified custom domain
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.subdomain,
    l.custom_domain,
    l.custom_domain_verified,
    l.logo_url,
    l.favicon_url,
    l.primary_color,
    l.secondary_color,
    l.accent_color,
    l.font_family,
    l.custom_css,
    l.status
  FROM leagues l
  WHERE l.custom_domain = clean_hostname
    AND l.custom_domain_verified = true
    AND l.status = 'active'
  LIMIT 1;

  -- If custom domain match found, return
  IF FOUND THEN
    RETURN;
  END IF;

  -- Strategy 2: Extract subdomain and match (e.g., pilot.beerleaguehockey.ca -> "pilot")
  -- Check if hostname matches pattern: subdomain.beerleaguehockey.ca or subdomain.localhost
  IF clean_hostname ~ '\.beerleaguehockey\.ca$' OR clean_hostname ~ '\.localhost$' THEN
    subdomain_part := REGEXP_REPLACE(clean_hostname, '\.(beerleaguehockey\.ca|localhost)$', '');

    RETURN QUERY
    SELECT
      l.id,
      l.name,
      l.slug,
      l.subdomain,
      l.custom_domain,
      l.custom_domain_verified,
      l.logo_url,
      l.favicon_url,
      l.primary_color,
      l.secondary_color,
      l.accent_color,
      l.font_family,
      l.custom_css,
      l.status
    FROM leagues l
    WHERE l.subdomain = subdomain_part
      AND l.status = 'active'
    LIMIT 1;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- Strategy 3: Fallback to main platform domain (return NULL for platform-level pages)
  -- This allows platform pages like /about, /pricing, /discover to work
  IF clean_hostname IN ('beerleaguehockey.ca', 'localhost', 'hockeylifehl.com') THEN
    RETURN;
  END IF;

  -- No match found
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_league_by_hostname IS 'Resolve league instance from hostname (subdomain or custom domain)';

-- ==============================================================================
-- VIEW: league_branding
-- ==============================================================================
-- Purpose: Simplified view of league branding information for quick access
-- ==============================================================================

CREATE OR REPLACE VIEW league_branding AS
SELECT
  id,
  name,
  slug,
  subdomain,
  custom_domain,
  custom_domain_verified,
  tagline,
  logo_url,
  banner_url,
  favicon_url,
  primary_color,
  secondary_color,
  accent_color,
  font_family,
  custom_css,
  status
FROM leagues
WHERE status = 'active';

COMMENT ON VIEW league_branding IS 'Active league branding information for quick access';

-- Grant access to authenticated users (RLS will still apply)
GRANT SELECT ON league_branding TO authenticated;
GRANT SELECT ON league_branding TO anon;

-- ==============================================================================
-- SEED DATA: Pilot League (HockeyLifeHL)
-- ==============================================================================
-- Purpose: Create the pilot league instance with HockeyLifeHL branding
-- This serves as both a test instance and the primary league
-- ==============================================================================

-- Insert pilot league with explicit UUID for consistency
INSERT INTO leagues (
  id,
  name,
  slug,
  subdomain,
  description,
  tagline,

  -- Branding
  logo_url,
  primary_color,
  secondary_color,
  accent_color,

  -- Location
  city,
  state_province,
  country,
  timezone,

  -- Visibility
  is_public,

  -- Subscription
  subscription_tier,
  subscription_status,

  -- Status
  status
) VALUES (
  gen_random_uuid(),
  'HockeyLifeHL',
  'pilot',
  'pilot',
  'The ultimate men''s recreational hockey league. Experience the thrill of competitive hockey in a fun, organized environment.',
  'Where Beer League Legends Are Made',

  -- Branding (HockeyLifeHL brand colors)
  '/logo.png',
  '#E31837', -- Canada Red
  '#0066CC', -- Blue
  '#FFD700', -- Gold

  -- Location
  'Toronto',
  'Ontario',
  'Canada',
  'America/Toronto',

  -- Visibility
  true,

  -- Subscription (Pro tier for pilot)
  'pro',
  'active',

  -- Status
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  subdomain = EXCLUDED.subdomain,
  description = EXCLUDED.description,
  tagline = EXCLUDED.tagline,
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- ==============================================================================
-- VALIDATION QUERIES
-- ==============================================================================
-- These queries help verify the migration was successful
-- ==============================================================================

-- Check that pilot league was created
DO $$
DECLARE
  pilot_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pilot_count
  FROM leagues
  WHERE slug = 'pilot' AND subdomain = 'pilot';

  IF pilot_count = 0 THEN
    RAISE EXCEPTION 'Pilot league was not created successfully';
  END IF;

  RAISE NOTICE '✅ Pilot league created successfully';
END $$;

-- Test hostname lookup function
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test subdomain lookup
  SELECT * INTO test_result
  FROM get_league_by_hostname('pilot.beerleaguehockey.ca')
  LIMIT 1;

  IF test_result.slug = 'pilot' THEN
    RAISE NOTICE '✅ Hostname lookup working: pilot.beerleaguehockey.ca -> pilot league';
  ELSE
    RAISE WARNING '⚠ Hostname lookup test failed for subdomain';
  END IF;

  -- Test localhost subdomain
  SELECT * INTO test_result
  FROM get_league_by_hostname('pilot.localhost')
  LIMIT 1;

  IF test_result.slug = 'pilot' THEN
    RAISE NOTICE '✅ Hostname lookup working: pilot.localhost -> pilot league';
  ELSE
    RAISE WARNING '⚠ Hostname lookup test failed for localhost';
  END IF;
END $$;

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ LEAGUE BRANDING ENHANCEMENT COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎨 Branding columns added:';
  RAISE NOTICE '  - subdomain (for routing)';
  RAISE NOTICE '  - accent_color (tertiary brand color)';
  RAISE NOTICE '  - banner_url (header images)';
  RAISE NOTICE '  - favicon_url (browser icon)';
  RAISE NOTICE '  - font_family (typography)';
  RAISE NOTICE '  - custom_css (advanced styling)';
  RAISE NOTICE '  - tagline (league motto)';
  RAISE NOTICE '  - custom_domain_verified (DNS verification)';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Indexes created:';
  RAISE NOTICE '  - idx_leagues_subdomain (unique)';
  RAISE NOTICE '  - idx_leagues_custom_domain (unique)';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️  Functions created:';
  RAISE NOTICE '  - get_league_by_hostname(hostname)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Views created:';
  RAISE NOTICE '  - league_branding';
  RAISE NOTICE '';
  RAISE NOTICE '🏒 Pilot league created:';
  RAISE NOTICE '  - Name: HockeyLifeHL';
  RAISE NOTICE '  - Slug: pilot';
  RAISE NOTICE '  - Subdomain: pilot.beerleaguehockey.ca';
  RAISE NOTICE '  - Public: Yes';
  RAISE NOTICE '  - Tier: Pro';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ready for multi-instance deployment!';
  RAISE NOTICE '';
END $$;
