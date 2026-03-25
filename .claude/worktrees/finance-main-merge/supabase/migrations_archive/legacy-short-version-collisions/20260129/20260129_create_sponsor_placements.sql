-- ==============================================================================
-- BMHL SPONSOR PLACEMENTS MIGRATION
-- ==============================================================================
-- Description: Creates sponsor_placements table for league sponsor ads
-- Purpose: Support BMHL sponsor banner/logo display in UI
-- Author: BMHL Implementation - Phase 1A
-- Date: January 29, 2026
-- Related: BMHL_GAP_ANALYSIS.md, BMHL_UI_REQUIREMENTS.md
-- ==============================================================================

-- ==============================================================================
-- TABLE: sponsor_placements
-- ==============================================================================
-- Purpose: Define where and when sponsor logos/banners appear in the UI
-- Multi-tenant: Scoped by league_id

CREATE TABLE IF NOT EXISTS sponsor_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Sponsor details
  sponsor_name TEXT NOT NULL,
  sponsor_logo_url TEXT, -- URL to sponsor logo image
  sponsor_website_url TEXT, -- Link when logo is clicked

  -- Placement configuration
  placement_type TEXT NOT NULL CHECK (placement_type IN (
    'header_banner',      -- Top banner across site
    'schedule_sidebar',   -- Sidebar on schedule page
    'game_detail_banner', -- Banner on game detail page
    'footer_logo',        -- Footer sponsor logo
    'scoresheet_header'   -- Top of scoresheet/game sheet
  )),

  -- Display rules
  priority INTEGER DEFAULT 0, -- Higher priority shows first
  is_active BOOLEAN DEFAULT true,

  -- Scheduling
  start_date DATE, -- When to start showing (NULL = immediately)
  end_date DATE,   -- When to stop showing (NULL = indefinitely)

  -- Dimensions and styling
  max_width_px INTEGER, -- Max width for logo
  max_height_px INTEGER, -- Max height for logo
  background_color TEXT, -- Optional background color for banner placements

  -- Analytics
  impression_count INTEGER DEFAULT 0, -- How many times displayed
  click_count INTEGER DEFAULT 0, -- How many times clicked

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_date_range CHECK (
    start_date IS NULL OR end_date IS NULL OR start_date <= end_date
  ),
  CONSTRAINT valid_dimensions CHECK (
    (max_width_px IS NULL OR max_width_px > 0) AND
    (max_height_px IS NULL OR max_height_px > 0)
  )
);

-- Indexes for performance
CREATE INDEX idx_sponsor_placements_league_id ON sponsor_placements(league_id);
CREATE INDEX idx_sponsor_placements_placement_type ON sponsor_placements(placement_type);
CREATE INDEX idx_sponsor_placements_active ON sponsor_placements(league_id, placement_type, is_active)
  WHERE is_active = true;
CREATE INDEX idx_sponsor_placements_priority ON sponsor_placements(league_id, placement_type, priority DESC)
  WHERE is_active = true;

-- Composite index for active sponsor queries
CREATE INDEX idx_sponsor_placements_active_lookup ON sponsor_placements(
  league_id,
  placement_type,
  priority DESC,
  start_date,
  end_date
) WHERE is_active = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_sponsor_placements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sponsor_placements_updated_at
  BEFORE UPDATE ON sponsor_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsor_placements_updated_at();

-- ==============================================================================
-- HELPER FUNCTION: Get Active Sponsors for Placement
-- ==============================================================================
-- Function to get active sponsors for a specific placement type and league

CREATE OR REPLACE FUNCTION get_active_sponsors(
  league_id_param UUID,
  placement_type_param TEXT
)
RETURNS TABLE (
  id UUID,
  sponsor_name TEXT,
  sponsor_logo_url TEXT,
  sponsor_website_url TEXT,
  priority INTEGER,
  max_width_px INTEGER,
  max_height_px INTEGER,
  background_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.sponsor_name,
    sp.sponsor_logo_url,
    sp.sponsor_website_url,
    sp.priority,
    sp.max_width_px,
    sp.max_height_px,
    sp.background_color
  FROM sponsor_placements sp
  WHERE sp.league_id = league_id_param
    AND sp.placement_type = placement_type_param
    AND sp.is_active = true
    AND (sp.start_date IS NULL OR sp.start_date <= CURRENT_DATE)
    AND (sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE)
  ORDER BY sp.priority DESC, sp.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_sponsors(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_sponsors(UUID, TEXT) TO anon;

-- ==============================================================================
-- HELPER FUNCTION: Track Sponsor Impression
-- ==============================================================================
-- Function to increment impression count when sponsor is displayed

CREATE OR REPLACE FUNCTION track_sponsor_impression(sponsor_placement_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sponsor_placements
  SET impression_count = impression_count + 1
  WHERE id = sponsor_placement_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION track_sponsor_impression(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_sponsor_impression(UUID) TO anon;

-- ==============================================================================
-- HELPER FUNCTION: Track Sponsor Click
-- ==============================================================================
-- Function to increment click count when sponsor logo is clicked

CREATE OR REPLACE FUNCTION track_sponsor_click(sponsor_placement_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sponsor_placements
  SET click_count = click_count + 1
  WHERE id = sponsor_placement_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION track_sponsor_click(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_sponsor_click(UUID) TO anon;

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE sponsor_placements ENABLE ROW LEVEL SECURITY;

-- Public can view active sponsors (for display on site)
DROP POLICY IF EXISTS "Public can view active sponsors" ON sponsor_placements;
CREATE POLICY "Public can view active sponsors"
  ON sponsor_placements FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

-- League admins can manage sponsors
DROP POLICY IF EXISTS "League admins can manage sponsors" ON sponsor_placements;
CREATE POLICY "League admins can manage sponsors"
  ON sponsor_placements FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Service role has full access
DROP POLICY IF EXISTS "Service role has full access to sponsors" ON sponsor_placements;
CREATE POLICY "Service role has full access to sponsors"
  ON sponsor_placements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- GRANT PERMISSIONS
-- ==============================================================================

GRANT SELECT ON sponsor_placements TO authenticated;
GRANT SELECT ON sponsor_placements TO anon;
GRANT ALL ON sponsor_placements TO service_role;

-- ==============================================================================
-- MIGRATION VERIFICATION
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sponsor_placements') THEN
    RAISE EXCEPTION 'Migration failed: sponsor_placements table not created';
  END IF;

  RAISE NOTICE 'Migration completed successfully: sponsor_placements table created';
END $$;
