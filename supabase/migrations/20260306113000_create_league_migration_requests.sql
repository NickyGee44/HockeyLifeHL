-- =============================================================================
-- League Migration Requests
-- =============================================================================
-- Purpose: Track owner-submitted historical migration intake inside the app.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.league_migration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scope TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  source_system TEXT,
  source_url TEXT,
  asset_links TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  notes TEXT,
  desired_launch_date DATE,
  estimated_item_count INTEGER,
  admin_notes TEXT,
  quoted_price_cents INTEGER,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT league_migration_requests_status_check CHECK (
    status IN ('draft', 'submitted', 'reviewing', 'quoted', 'scheduled', 'in_progress', 'completed', 'cancelled')
  ),
  CONSTRAINT league_migration_requests_scope_check CHECK (
    scope <@ ARRAY['teams', 'players', 'schedule', 'stats_records', 'news_archive', 'media_archive']::TEXT[]
  ),
  CONSTRAINT league_migration_requests_estimated_item_count_check CHECK (
    estimated_item_count IS NULL OR estimated_item_count >= 0
  ),
  CONSTRAINT league_migration_requests_quoted_price_check CHECK (
    quoted_price_cents IS NULL OR quoted_price_cents >= 0
  )
);

COMMENT ON TABLE public.league_migration_requests IS
  'Owner-submitted migration intake requests for historical league data imports.';

CREATE INDEX IF NOT EXISTS idx_league_migration_requests_league_status
  ON public.league_migration_requests(league_id, status);

CREATE INDEX IF NOT EXISTS idx_league_migration_requests_created_at_desc
  ON public.league_migration_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_league_migration_requests_requested_by
  ON public.league_migration_requests(requested_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_migration_requests_one_active_per_league
  ON public.league_migration_requests(league_id)
  WHERE status IN ('draft', 'submitted', 'reviewing', 'quoted', 'scheduled', 'in_progress');

DROP TRIGGER IF EXISTS league_migration_requests_updated_at
  ON public.league_migration_requests;
CREATE TRIGGER league_migration_requests_updated_at
  BEFORE UPDATE ON public.league_migration_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.league_migration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League owners can view migration requests" ON public.league_migration_requests;
CREATE POLICY "League owners can view migration requests"
  ON public.league_migration_requests
  FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.leagues l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.id = league_migration_requests.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_migration_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "League owners can create migration requests" ON public.league_migration_requests;
CREATE POLICY "League owners can create migration requests"
  ON public.league_migration_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.leagues l
        LEFT JOIN public.organizations o ON o.id = l.organization_id
        WHERE l.id = league_migration_requests.league_id
          AND (
            l.owner_id = auth.uid()
            OR l.created_by = auth.uid()
            OR o.owner_user_id = auth.uid()
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.league_memberships lm
        WHERE lm.league_id = league_migration_requests.league_id
          AND lm.user_id = auth.uid()
          AND lm.status = 'active'
          AND lm.role IN ('owner', 'admin')
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_platform_admin = TRUE
      )
    )
  );

DROP POLICY IF EXISTS "League owners can update migration requests" ON public.league_migration_requests;
CREATE POLICY "League owners can update migration requests"
  ON public.league_migration_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.id = league_migration_requests.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_migration_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.id = league_migration_requests.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_migration_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  );
