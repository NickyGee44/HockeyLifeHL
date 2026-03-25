-- =============================================================================
-- Migration: Reconcile playoff_series RLS policies
-- =============================================================================
-- The playoff bracket writer in league-builder is owner/admin-only. Make the
-- playoff_series table policy state explicit so environments do not drift into
-- missing or inconsistent write access.

ALTER TABLE IF EXISTS public.playoff_series ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'playoff_series'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.playoff_series',
      existing_policy.policyname
    );
  END LOOP;
END $$;

CREATE POLICY "League owners/admins can view playoff series"
  ON public.playoff_series
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = playoff_series.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = playoff_series.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  );

CREATE POLICY "League owners/admins can create playoff series"
  ON public.playoff_series
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = playoff_series.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = playoff_series.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  );

CREATE POLICY "League owners/admins can update playoff series"
  ON public.playoff_series
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = playoff_series.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = playoff_series.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = playoff_series.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = playoff_series.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  );

CREATE POLICY "League owners/admins can delete playoff series"
  ON public.playoff_series
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = playoff_series.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = playoff_series.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  );

CREATE POLICY "Service role has full access to playoff series"
  ON public.playoff_series
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playoff_series TO authenticated, service_role;
