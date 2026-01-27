-- Fix broken get_league_by_hostname function
-- The current version has syntax errors in REGEXP patterns
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS get_league_by_hostname(text);

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
  -- Clean the hostname: lowercase, remove port, remove www
  clean_hostname := LOWER(REGEXP_REPLACE(hostname, ':\d+$', ''));
  clean_hostname := REGEXP_REPLACE(clean_hostname, '^www\.', '');

  -- First, try custom domain lookup
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
  FROM public.leagues l
  WHERE l.custom_domain = clean_hostname
    AND l.custom_domain_verified = true
    AND l.status = 'active'
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Second, try subdomain lookup for *.beerleaguehockey.ca or *.localhost
  IF clean_hostname ~ '\.beerleaguehockey\.ca$' OR clean_hostname ~ '\.localhost$' THEN
    -- Extract subdomain (everything before .beerleaguehockey.ca or .localhost)
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
    FROM public.leagues l
    WHERE l.subdomain = subdomain_part
      AND l.status = 'active'
    LIMIT 1;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- If hostname is a platform domain, return nothing (not a league instance)
  IF clean_hostname IN ('beerleaguehockey.ca', 'localhost', '127.0.0.1', 'hockeylifehl.com') THEN
    RETURN;
  END IF;

  -- No match found
  RETURN;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_league_by_hostname(TEXT) TO authenticated, anon;

-- ============================================================================
-- Test the fixed function
-- ============================================================================

-- Test with pilot subdomain
SELECT 'Testing pilot.beerleaguehockey.ca:' as test;
SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.ca');

-- Test with localhost
SELECT 'Testing pilot.localhost:' as test;
SELECT * FROM get_league_by_hostname('pilot.localhost');

-- Verify function exists
SELECT 'Function installed successfully!' as status;
