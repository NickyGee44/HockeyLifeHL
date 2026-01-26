-- ==============================================================================
-- ENHANCE LEAGUES FOR PUBLIC DISCOVERY
-- ==============================================================================
-- Purpose: Add location, public visibility, and search features to leagues
-- Agent: Agent 1 - Database & Infrastructure
-- Date: January 26, 2026
-- ==============================================================================

-- ==============================================================================
-- ADD COLUMNS to leagues table
-- ==============================================================================

-- Public Visibility
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Search & Discovery
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS search_keywords TEXT[];

-- Location Data
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Registration URL
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS registration_url TEXT;

-- ==============================================================================
-- COMMENTS
-- ==============================================================================
COMMENT ON COLUMN leagues.is_public IS 'If true, league appears in public discovery/search';
COMMENT ON COLUMN leagues.search_keywords IS 'Additional keywords for search optimization';
COMMENT ON COLUMN leagues.latitude IS 'Latitude for map display and location-based search';
COMMENT ON COLUMN leagues.longitude IS 'Longitude for map display and location-based search';
COMMENT ON COLUMN leagues.address IS 'Full street address of league location';
COMMENT ON COLUMN leagues.postal_code IS 'Postal/ZIP code for location filtering';
COMMENT ON COLUMN leagues.registration_url IS 'External registration URL if league uses separate system';

-- ==============================================================================
-- INDEXES for Performance
-- ==============================================================================

-- Public discovery index
CREATE INDEX IF NOT EXISTS idx_leagues_public
  ON leagues(is_public)
  WHERE is_public = true;

-- Location-based search (for "find leagues near me")
CREATE INDEX IF NOT EXISTS idx_leagues_location
  ON leagues(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- City/state search
CREATE INDEX IF NOT EXISTS idx_leagues_city_state
  ON leagues(city, state_province);

-- Country filter
CREATE INDEX IF NOT EXISTS idx_leagues_country
  ON leagues(country);

-- Postal code search
CREATE INDEX IF NOT EXISTS idx_leagues_postal
  ON leagues(postal_code)
  WHERE postal_code IS NOT NULL;

-- Full-text search on keywords
CREATE INDEX IF NOT EXISTS idx_leagues_search_keywords
  ON leagues USING GIN(search_keywords)
  WHERE search_keywords IS NOT NULL;

-- Composite index for public active leagues
CREATE INDEX IF NOT EXISTS idx_leagues_public_active
  ON leagues(is_public, status)
  WHERE is_public = true AND status = 'active';

-- ==============================================================================
-- VIEW: public_leagues (For unauthenticated users to discover leagues)
-- ==============================================================================
CREATE OR REPLACE VIEW public_leagues AS
SELECT
  id,
  name,
  slug,
  description,
  logo_url,
  city,
  state_province,
  country,
  latitude,
  longitude,
  primary_color,
  secondary_color,
  website_url,
  contact_email,
  registration_url,
  search_keywords,
  address,
  postal_code,
  created_at
FROM leagues
WHERE is_public = true
  AND status = 'active';

COMMENT ON VIEW public_leagues IS 'Publicly visible leagues for discovery (safe for unauthenticated access)';

-- ==============================================================================
-- HELPER FUNCTION: Search nearby leagues
-- ==============================================================================
CREATE OR REPLACE FUNCTION search_nearby_leagues(
  user_lat DECIMAL,
  user_lon DECIMAL,
  radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  city TEXT,
  state_province TEXT,
  distance_km DECIMAL,
  logo_url TEXT,
  primary_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.city,
    l.state_province,
    ROUND(
      CAST(
        (6371 * acos(
          cos(radians(user_lat))
          * cos(radians(l.latitude))
          * cos(radians(l.longitude) - radians(user_lon))
          + sin(radians(user_lat))
          * sin(radians(l.latitude))
        )) AS NUMERIC
      ), 2
    ) AS distance_km,
    l.logo_url,
    l.primary_color
  FROM leagues l
  WHERE l.is_public = true
    AND l.status = 'active'
    AND l.latitude IS NOT NULL
    AND l.longitude IS NOT NULL
    -- Rough bounding box filter for performance
    AND l.latitude BETWEEN (user_lat - (radius_km / 111.0)) AND (user_lat + (radius_km / 111.0))
    AND l.longitude BETWEEN (user_lon - (radius_km / (111.0 * cos(radians(user_lat))))) AND (user_lon + (radius_km / (111.0 * cos(radians(user_lat)))))
  HAVING
    -- Precise distance calculation
    (6371 * acos(
      cos(radians(user_lat))
      * cos(radians(l.latitude))
      * cos(radians(l.longitude) - radians(user_lon))
      + sin(radians(user_lat))
      * sin(radians(l.latitude))
    )) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION search_nearby_leagues IS 'Find public leagues within a given radius (in kilometers) of a location';

-- ==============================================================================
-- HELPER FUNCTION: Search leagues by keyword
-- ==============================================================================
CREATE OR REPLACE FUNCTION search_leagues_by_keyword(
  search_query TEXT,
  limit_results INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT,
  logo_url TEXT,
  relevance INTEGER
) AS $$
DECLARE
  search_term TEXT;
BEGIN
  search_term := LOWER(search_query);

  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.description,
    l.city,
    l.state_province,
    l.country,
    l.logo_url,
    (
      -- Calculate relevance score
      CASE WHEN LOWER(l.name) = search_term THEN 100 ELSE 0 END +
      CASE WHEN LOWER(l.name) LIKE search_term || '%' THEN 50 ELSE 0 END +
      CASE WHEN LOWER(l.name) LIKE '%' || search_term || '%' THEN 20 ELSE 0 END +
      CASE WHEN LOWER(l.description) LIKE '%' || search_term || '%' THEN 10 ELSE 0 END +
      CASE WHEN LOWER(l.city) = search_term THEN 30 ELSE 0 END +
      CASE WHEN search_term = ANY(ARRAY(SELECT LOWER(unnest(l.search_keywords)))) THEN 40 ELSE 0 END
    ) AS relevance
  FROM leagues l
  WHERE l.is_public = true
    AND l.status = 'active'
    AND (
      LOWER(l.name) LIKE '%' || search_term || '%'
      OR LOWER(l.description) LIKE '%' || search_term || '%'
      OR LOWER(l.city) LIKE '%' || search_term || '%'
      OR LOWER(l.state_province) LIKE '%' || search_term || '%'
      OR search_term = ANY(ARRAY(SELECT LOWER(unnest(l.search_keywords))))
    )
  ORDER BY relevance DESC, l.name ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION search_leagues_by_keyword IS 'Full-text search for public leagues by keyword with relevance scoring';

-- ==============================================================================
-- HELPER FUNCTION: Get leagues by location (city/state)
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_leagues_by_location(
  search_city TEXT DEFAULT NULL,
  search_state TEXT DEFAULT NULL,
  search_country TEXT DEFAULT 'USA'
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  city TEXT,
  state_province TEXT,
  logo_url TEXT,
  primary_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.city,
    l.state_province,
    l.logo_url,
    l.primary_color
  FROM leagues l
  WHERE l.is_public = true
    AND l.status = 'active'
    AND (search_city IS NULL OR LOWER(l.city) = LOWER(search_city))
    AND (search_state IS NULL OR LOWER(l.state_province) = LOWER(search_state))
    AND LOWER(l.country) = LOWER(search_country)
  ORDER BY l.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_leagues_by_location IS 'Find public leagues by city, state, and/or country';

-- ==============================================================================
-- RLS POLICY UPDATE: Allow public access to public leagues
-- ==============================================================================

-- Add policy for public league discovery (unauthenticated users)
CREATE POLICY "Public can view public leagues"
  ON leagues FOR SELECT
  USING (is_public = true AND status = 'active');

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Leagues enhanced for public discovery';
  RAISE NOTICE '✅ Added columns:';
  RAISE NOTICE '  - is_public (visibility flag)';
  RAISE NOTICE '  - latitude, longitude (map display)';
  RAISE NOTICE '  - address, postal_code (location details)';
  RAISE NOTICE '  - search_keywords (search optimization)';
  RAISE NOTICE '  - registration_url (external registration)';
  RAISE NOTICE '✅ Indexes created for location and search';
  RAISE NOTICE '✅ View created: public_leagues';
  RAISE NOTICE '✅ Helper functions created:';
  RAISE NOTICE '  - search_nearby_leagues(lat, lon, radius_km)';
  RAISE NOTICE '  - search_leagues_by_keyword(query, limit)';
  RAISE NOTICE '  - get_leagues_by_location(city, state, country)';
  RAISE NOTICE '✅ RLS policy added for public league access';
  RAISE NOTICE '';
END $$;
