-- ============================================================================
-- Bug Reporter System
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  expected_behavior TEXT,
  category TEXT NOT NULL DEFAULT 'bug',
  url TEXT NOT NULL,
  route_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_role TEXT,
  browser_info JSONB NOT NULL,
  console_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  network_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  navigation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_interactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  performance_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_state JSONB,
  screenshot_url TEXT,
  app_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  github_issue_url TEXT,
  error_signature TEXT,
  duplicate_of UUID REFERENCES public.bug_reports(id) ON DELETE SET NULL,
  report_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bug_reports_category_check CHECK (category IN ('bug', 'visual', 'confusing', 'suggestion', 'other')),
  CONSTRAINT bug_reports_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT bug_reports_status_check CHECK (status IN ('new', 'investigating', 'fix_deployed', 'closed', 'duplicate', 'wont_fix')),
  CONSTRAINT bug_reports_report_count_check CHECK (report_count >= 1)
);

DROP TRIGGER IF EXISTS bug_reports_updated_at ON public.bug_reports;
CREATE TRIGGER bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bug_reports_league_status
  ON public.bug_reports(league_id, status);

CREATE INDEX IF NOT EXISTS idx_bug_reports_severity_status
  ON public.bug_reports(severity, status);

CREATE INDEX IF NOT EXISTS idx_bug_reports_error_signature
  ON public.bug_reports(error_signature);

CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at_desc
  ON public.bug_reports(created_at DESC);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create bug reports" ON public.bug_reports;
CREATE POLICY "Anyone can create bug reports"
  ON public.bug_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "League owners can view bug reports" ON public.bug_reports;
CREATE POLICY "League owners can view bug reports"
  ON public.bug_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = bug_reports.league_id
        AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = bug_reports.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Platform admins can view all bug reports" ON public.bug_reports;
CREATE POLICY "Platform admins can view all bug reports"
  ON public.bug_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update bug reports" ON public.bug_reports;
CREATE POLICY "Owners and admins can update bug reports"
  ON public.bug_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = bug_reports.league_id
        AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = bug_reports.league_id
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
      WHERE l.id = bug_reports.league_id
        AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = bug_reports.league_id
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

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bug-report-screenshots',
  'bug-report-screenshots',
  false,
  512000,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Bug report screenshots upload" ON storage.objects;
CREATE POLICY "Bug report screenshots upload"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'bug-report-screenshots');

DROP POLICY IF EXISTS "Bug report screenshots select" ON storage.objects;
CREATE POLICY "Bug report screenshots select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bug-report-screenshots'
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_platform_admin = TRUE
      )
      OR EXISTS (
        SELECT 1
        FROM public.bug_reports br
        JOIN public.leagues l ON l.id = br.league_id
        WHERE br.screenshot_url IS NOT NULL
          AND split_part(storage.objects.name, '/', 1) = br.league_id::text
          AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
      )
    )
  );
