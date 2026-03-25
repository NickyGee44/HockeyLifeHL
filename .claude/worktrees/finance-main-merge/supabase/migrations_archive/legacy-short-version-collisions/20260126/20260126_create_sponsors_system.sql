-- ==============================================================================
-- CREATE SPONSORS SYSTEM - Platform & League Sponsors
-- ==============================================================================
-- Purpose: Support site-wide platform sponsors and per-league sponsors
-- Agent: Agent 1 - Database & Infrastructure
-- Date: January 26, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: platform_sponsors (Site-Wide Sponsors for Platform Revenue)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS platform_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sponsor Details
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT CHECK (tier IN ('gold', 'silver', 'bronze')),

  -- Status & Timing
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,

  -- Ad Placement
  placement_preference TEXT[], -- e.g., ['homepage', 'dashboard', 'scorekeeper']

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- TABLE: league_sponsors (Per-League Sponsors)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS league_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-Tenant
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Sponsor Details
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT CHECK (tier IN ('gold', 'silver', 'bronze', 'title')), -- title = naming rights

  -- Status & Timing
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,

  -- Ad Placement
  placement_preference TEXT[], -- e.g., ['dashboard', 'games', 'teams']

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES for Performance
-- ==============================================================================

-- Platform Sponsors
CREATE INDEX IF NOT EXISTS idx_platform_sponsors_active
  ON platform_sponsors(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_platform_sponsors_tier
  ON platform_sponsors(tier);

CREATE INDEX IF NOT EXISTS idx_platform_sponsors_dates
  ON platform_sponsors(start_date, end_date)
  WHERE is_active = true;

-- League Sponsors
CREATE INDEX IF NOT EXISTS idx_league_sponsors_league
  ON league_sponsors(league_id);

CREATE INDEX IF NOT EXISTS idx_league_sponsors_active
  ON league_sponsors(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_league_sponsors_tier
  ON league_sponsors(tier);

CREATE INDEX IF NOT EXISTS idx_league_sponsors_league_active
  ON league_sponsors(league_id, is_active);

-- ==============================================================================
-- COMMENTS
-- ==============================================================================
COMMENT ON TABLE platform_sponsors IS 'Site-wide sponsors that generate revenue for the platform';
COMMENT ON TABLE league_sponsors IS 'Per-league sponsors managed by league admins';
COMMENT ON COLUMN league_sponsors.tier IS 'Sponsor tier: gold, silver, bronze, or title (naming rights)';
COMMENT ON COLUMN platform_sponsors.tier IS 'Sponsor tier: gold, silver, or bronze';
COMMENT ON COLUMN league_sponsors.placement_preference IS 'Array of preferred ad placements for this sponsor';

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - league_sponsors
-- ==============================================================================
ALTER TABLE league_sponsors ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view league sponsors for their leagues
CREATE POLICY "Users can view league sponsors"
  ON league_sponsors FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Admins/owners can insert league sponsors
CREATE POLICY "Admins can create league sponsors"
  ON league_sponsors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = league_sponsors.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: Admins/owners can update league sponsors
CREATE POLICY "Admins can update league sponsors"
  ON league_sponsors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = league_sponsors.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: Owners can delete league sponsors
CREATE POLICY "Owners can delete league sponsors"
  ON league_sponsors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = league_sponsors.league_id
        AND status = 'active'
        AND role = 'owner'
    )
  );

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - platform_sponsors
-- ==============================================================================
-- Note: Platform sponsors are managed by platform admins only
-- Regular users can view active sponsors for ad display
ALTER TABLE platform_sponsors ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active platform sponsors
CREATE POLICY "Public can view active platform sponsors"
  ON platform_sponsors FOR SELECT
  USING (is_active = true);

-- Policy: Only service role can manage platform sponsors
-- (Managed via admin dashboard or direct DB access)

-- ==============================================================================
-- HELPER FUNCTION: Get Active Sponsors for Display
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_active_league_sponsors(check_league_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT,
  placement_preference TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.id,
    ls.name,
    ls.logo_url,
    ls.website_url,
    ls.tier,
    ls.placement_preference
  FROM league_sponsors ls
  WHERE ls.league_id = check_league_id
    AND ls.is_active = true
    AND (ls.start_date IS NULL OR ls.start_date <= NOW())
    AND (ls.end_date IS NULL OR ls.end_date >= NOW())
  ORDER BY
    CASE ls.tier
      WHEN 'title' THEN 1
      WHEN 'gold' THEN 2
      WHEN 'silver' THEN 3
      WHEN 'bronze' THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_league_sponsors IS 'Get all active sponsors for a league, ordered by tier';

-- ==============================================================================
-- HELPER FUNCTION: Get Active Platform Sponsors
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_active_platform_sponsors()
RETURNS TABLE(
  id UUID,
  name TEXT,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT,
  placement_preference TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.name,
    ps.logo_url,
    ps.website_url,
    ps.tier,
    ps.placement_preference
  FROM platform_sponsors ps
  WHERE ps.is_active = true
    AND (ps.start_date IS NULL OR ps.start_date <= NOW())
    AND (ps.end_date IS NULL OR ps.end_date >= NOW())
  ORDER BY
    CASE ps.tier
      WHEN 'gold' THEN 1
      WHEN 'silver' THEN 2
      WHEN 'bronze' THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_platform_sponsors IS 'Get all active platform sponsors, ordered by tier';

-- ==============================================================================
-- TRIGGER: Update updated_at timestamp
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_platform_sponsors_updated_at
  BEFORE UPDATE ON platform_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsors_updated_at();

CREATE TRIGGER trigger_league_sponsors_updated_at
  BEFORE UPDATE ON league_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsors_updated_at();

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sponsors system created successfully';
  RAISE NOTICE '  - platform_sponsors table (site-wide sponsors)';
  RAISE NOTICE '  - league_sponsors table (per-league sponsors)';
  RAISE NOTICE '✅ Indexes created for optimal performance';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Helper functions created:';
  RAISE NOTICE '  - get_active_league_sponsors(league_id)';
  RAISE NOTICE '  - get_active_platform_sponsors()';
  RAISE NOTICE '';
END $$;
