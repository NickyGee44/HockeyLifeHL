-- ============================================================================== -- MULTI-INSTANCE ARCHITECTURE - MANUAL APPLICATION
-- ==============================================================================
-- This file contains ONLY the new multi-instance changes that need to be applied
-- All existing columns are skipped with IF NOT EXISTS checks
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. ENHANCE LEAGUE BRANDING COLUMNS
-- ==============================================================================

-- Add missing branding columns (skip if exist)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS subdomain TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#FFD700';
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter, system-ui, sans-serif';
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS custom_css TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false;

-- Add unique constraints (skip if exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leagues_subdomain_unique' AND conrelid = 'leagues'::regclass
  ) THEN
    ALTER TABLE leagues ADD CONSTRAINT leagues_subdomain_unique UNIQUE (subdomain);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leagues_custom_domain_unique' AND conrelid = 'leagues'::regclass
  ) THEN
    ALTER TABLE leagues ADD CONSTRAINT leagues_custom_domain_unique UNIQUE (custom_domain);
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leagues_subdomain ON leagues(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leagues_custom_domain ON leagues(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leagues_status_tier ON leagues(status, tier);

-- ==============================================================================
-- 2. CREATE DOMAIN LOOKUP FUNCTION
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_league_by_hostname(hostname TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  logo_url TEXT,
  banner_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  font_family TEXT,
  custom_css TEXT,
  custom_domain TEXT,
  subdomain TEXT,
  tagline TEXT,
  status TEXT,
  tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_hostname TEXT;
  subdomain_part TEXT;
BEGIN
  -- Remove port and www prefix
  clean_hostname := LOWER(TRIM(hostname));
  clean_hostname := regexp_replace(clean_hostname, ':\d+$', '');
  clean_hostname := regexp_replace(clean_hostname, '^www\.', '');

  -- Try custom domain match first (exact match)
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.logo_url,
    l.banner_url,
    l.favicon_url,
    l.primary_color,
    l.secondary_color,
    l.accent_color,
    l.font_family,
    l.custom_css,
    l.custom_domain,
    l.subdomain,
    l.tagline,
    l.status,
    l.tier
  FROM leagues l
  WHERE l.custom_domain = clean_hostname
    AND l.custom_domain_verified = true
    AND l.status = 'active'
  LIMIT 1;

  -- If found via custom domain, return
  IF FOUND THEN
    RETURN;
  END IF;

  -- Try subdomain match (*.beerleaguehockey.ca or *.beerleaguehockey.local)
  IF clean_hostname ~ '\.(beerleaguehockey\.ca|beerleaguehockey\.local)$' THEN
    subdomain_part := regexp_replace(clean_hostname, '\.(beerleaguehockey\.ca|beerleaguehockey\.local)$', '');

    RETURN QUERY
    SELECT
      l.id,
      l.name,
      l.slug,
      l.logo_url,
      l.banner_url,
      l.favicon_url,
      l.primary_color,
      l.secondary_color,
      l.accent_color,
      l.font_family,
      l.custom_css,
      l.custom_domain,
      l.subdomain,
      l.tagline,
      l.status,
      l.tier
    FROM leagues l
    WHERE l.subdomain = subdomain_part
      AND l.status = 'active'
    LIMIT 1;
  END IF;

  -- Return empty if no match
  RETURN;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_league_by_hostname IS 'Resolves league from hostname (subdomain or custom domain). Returns NULL for platform domains.';

-- ==============================================================================
-- 3. CREATE LEAGUE BRANDING VIEW
-- ==============================================================================

CREATE OR REPLACE VIEW league_branding AS
SELECT
  id,
  slug,
  name,
  logo_url,
  banner_url,
  favicon_url,
  primary_color,
  secondary_color,
  accent_color,
  font_family,
  custom_css,
  custom_domain,
  custom_domain_verified,
  subdomain,
  tagline,
  status,
  tier,
  created_at,
  updated_at
FROM leagues
WHERE status = 'active';

COMMENT ON VIEW league_branding IS 'Simplified view of active league branding data for public access';

-- ==============================================================================
-- 4. INSERT/UPDATE PILOT LEAGUE
-- ==============================================================================

INSERT INTO leagues (
  name,
  slug,
  subdomain,
  description,
  logo_url,
  primary_color,
  secondary_color,
  accent_color,
  font_family,
  tagline,
  is_public,
  status,
  tier,
  created_at,
  updated_at
) VALUES (
  'HockeyLifeHL',
  'pilot',
  'pilot',
  'Demo league showcasing Beer League Hockey platform features with complete stats tracking, live game entry, and league management tools.',
  '/logo.png',
  '#E31837',
  '#0066CC',
  '#FFD700',
  'Inter, system-ui, sans-serif',
  'Your Hockey League, Elevated',
  true,
  'active',
  'pro',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  subdomain = EXCLUDED.subdomain,
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  font_family = EXCLUDED.font_family,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  status = EXCLUDED.status,
  tier = EXCLUDED.tier,
  updated_at = NOW();

COMMIT;

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

-- Test the domain lookup function
SELECT 'Testing domain lookup...' as message;
SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.ca');
SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.local');

-- Show league branding view
SELECT 'Showing league branding...' as message;
SELECT id, name, slug, subdomain, primary_color, secondary_color FROM league_branding;

SELECT 'Multi-instance architecture applied successfully!' as message;
