-- ============================================================================
-- SITE TEMPLATES SYSTEM
-- ============================================================================
-- Description: Creates tables and functions for managing site templates
--              and league template customizations
-- Date: 2026-01-28
-- Agent: Agent 1
-- ============================================================================

-- ============================================================================
-- TABLE: site_templates
-- ============================================================================
-- Purpose: Store available site template configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  preview_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE site_templates IS 'Available site template configurations for league branding';
COMMENT ON COLUMN site_templates.name IS 'Display name of the template (e.g., "Classic Sports")';
COMMENT ON COLUMN site_templates.slug IS 'URL-friendly identifier (e.g., "classic-sports")';
COMMENT ON COLUMN site_templates.description IS 'Short description of the template style';
COMMENT ON COLUMN site_templates.preview_image_url IS 'URL to preview image for template selection';
COMMENT ON COLUMN site_templates.is_active IS 'Whether template is available for selection';
COMMENT ON COLUMN site_templates.config IS 'JSON configuration for template (colors, layout, components)';
COMMENT ON COLUMN site_templates.sort_order IS 'Display order in template selector';

-- ============================================================================
-- TABLE: league_template_settings
-- ============================================================================
-- Purpose: Store each league's template selection and customizations
-- ============================================================================

CREATE TABLE IF NOT EXISTS league_template_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES site_templates(id) ON DELETE RESTRICT,
  customizations JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure one template setting per league
  UNIQUE(league_id)
);

-- Add comments for documentation
COMMENT ON TABLE league_template_settings IS 'League-specific template selections and customizations';
COMMENT ON COLUMN league_template_settings.league_id IS 'Reference to the league';
COMMENT ON COLUMN league_template_settings.template_id IS 'Selected template for this league';
COMMENT ON COLUMN league_template_settings.customizations IS 'Custom colors, logo, and overrides for template';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for active templates (used in selection UI)
CREATE INDEX IF NOT EXISTS idx_site_templates_active
  ON site_templates(is_active, sort_order)
  WHERE is_active = TRUE;

-- Index for template lookup by slug
CREATE INDEX IF NOT EXISTS idx_site_templates_slug
  ON site_templates(slug);

-- Index for league template lookup
CREATE INDEX IF NOT EXISTS idx_league_template_settings_league_id
  ON league_template_settings(league_id);

-- Index for template usage analytics
CREATE INDEX IF NOT EXISTS idx_league_template_settings_template_id
  ON league_template_settings(template_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE site_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_template_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: site_templates
-- ============================================================================

-- Policy: Anyone can view active templates
CREATE POLICY "site_templates_public_read"
  ON site_templates
  FOR SELECT
  USING (is_active = TRUE);

-- Policy: Only platform admins can insert templates
CREATE POLICY "site_templates_admin_insert"
  ON site_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_platform_admin = TRUE
    )
  );

-- Policy: Only platform admins can update templates
CREATE POLICY "site_templates_admin_update"
  ON site_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_platform_admin = TRUE
    )
  );

-- Policy: Only platform admins can delete templates
CREATE POLICY "site_templates_admin_delete"
  ON site_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_platform_admin = TRUE
    )
  );

-- ============================================================================
-- RLS POLICIES: league_template_settings
-- ============================================================================

-- Policy: Users can view template settings for their leagues
CREATE POLICY "league_template_settings_member_read"
  ON league_template_settings
  FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Policy: League owners/admins can insert template settings
CREATE POLICY "league_template_settings_admin_insert"
  ON league_template_settings
  FOR INSERT
  WITH CHECK (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Policy: League owners/admins can update template settings
CREATE POLICY "league_template_settings_admin_update"
  ON league_template_settings
  FOR UPDATE
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Policy: League owners can delete template settings (reset to default)
CREATE POLICY "league_template_settings_owner_delete"
  ON league_template_settings
  FOR DELETE
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get all active templates
-- Purpose: Fetch templates for selection UI
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_site_templates()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  preview_image_url TEXT,
  config JSONB,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.name,
    st.slug,
    st.description,
    st.preview_image_url,
    st.config,
    st.sort_order
  FROM site_templates st
  WHERE st.is_active = TRUE
  ORDER BY st.sort_order ASC, st.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get league's template configuration
-- Purpose: Fetch template + customizations for a specific league
-- ============================================================================

CREATE OR REPLACE FUNCTION get_league_template_config(p_league_id UUID)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  template_slug TEXT,
  template_config JSONB,
  customizations JSONB,
  final_config JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id AS template_id,
    st.name AS template_name,
    st.slug AS template_slug,
    st.config AS template_config,
    COALESCE(lts.customizations, '{}'::JSONB) AS customizations,
    st.config || COALESCE(lts.customizations, '{}'::JSONB) AS final_config
  FROM league_template_settings lts
  INNER JOIN site_templates st ON lts.template_id = st.id
  WHERE lts.league_id = p_league_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get template usage statistics
-- Purpose: Analytics for template popularity
-- ============================================================================

CREATE OR REPLACE FUNCTION get_template_usage_stats()
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  template_slug TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id AS template_id,
    st.name AS template_name,
    st.slug AS template_slug,
    COUNT(lts.league_id) AS usage_count
  FROM site_templates st
  LEFT JOIN league_template_settings lts ON st.id = lts.template_id
  WHERE st.is_active = TRUE
  GROUP BY st.id, st.name, st.slug
  ORDER BY usage_count DESC, st.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at timestamp on site_templates
CREATE OR REPLACE FUNCTION update_site_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_templates_updated_at
  BEFORE UPDATE ON site_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_site_templates_updated_at();

-- Trigger: Update updated_at timestamp on league_template_settings
CREATE OR REPLACE FUNCTION update_league_template_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER league_template_settings_updated_at
  BEFORE UPDATE ON league_template_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_league_template_settings_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION get_active_site_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION get_league_template_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_usage_stats() TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
