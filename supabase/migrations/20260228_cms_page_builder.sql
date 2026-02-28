-- ============================================================================
-- CMS Page Builder: Custom Pages + Nav Items
-- ============================================================================

-- Custom pages table (UUID primary key to match rest of schema)
CREATE TABLE IF NOT EXISTS public.custom_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '[]',
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, slug)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_pages_league_id ON public.custom_pages(league_id);
CREATE INDEX IF NOT EXISTS idx_custom_pages_league_slug ON public.custom_pages(league_id, slug);

-- RLS
ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Public can view published custom pages"
  ON public.custom_pages FOR SELECT
  USING (is_published = true);

-- League owners/admins can manage their pages
CREATE POLICY "League admins can manage custom pages"
  ON public.custom_pages FOR ALL
  USING (
    league_id IN (
      SELECT l.id FROM public.leagues l
      WHERE l.owner_id = auth.uid() OR l.created_by = auth.uid()
    )
    OR
    league_id IN (
      SELECT lm.league_id FROM public.league_memberships lm
      WHERE lm.user_id = auth.uid() AND lm.role IN ('owner', 'admin', 'commissioner')
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_custom_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_pages_updated_at
  BEFORE UPDATE ON public.custom_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_custom_pages_updated_at();

-- Note: nav_items and showGameTicker are stored inside the existing
-- settings JSONB column on leagues (settings.website.navItems, settings.website.showGameTicker)
-- No schema change needed for leagues table.
