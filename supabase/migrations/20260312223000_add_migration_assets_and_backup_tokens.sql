-- =============================================================================
-- Migration Assets + League Backup Tokens
-- =============================================================================
-- Purpose:
-- 1. Let league owners upload real migration source files (including SQL dumps)
--    to the migration center and track normalization metadata.
-- 2. Let league owners create scoped backup API tokens so they can export league
--    data into their own systems.
-- =============================================================================

ALTER TABLE public.league_migration_requests
  ADD COLUMN IF NOT EXISTS uploaded_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS normalization_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.league_migration_requests.uploaded_assets IS
  'Uploaded migration source files and analysis metadata for this request.';

COMMENT ON COLUMN public.league_migration_requests.normalization_profile IS
  'Normalization summary derived from uploaded assets, source links, and scope.';

CREATE TABLE IF NOT EXISTS public.league_backup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT league_backup_tokens_label_check CHECK (char_length(btrim(label)) > 0)
);

COMMENT ON TABLE public.league_backup_tokens IS
  'League-scoped API tokens used to export normalized league backup data.';

CREATE INDEX IF NOT EXISTS idx_league_backup_tokens_league_id
  ON public.league_backup_tokens(league_id);

CREATE INDEX IF NOT EXISTS idx_league_backup_tokens_active
  ON public.league_backup_tokens(league_id, revoked_at, expires_at);

DROP TRIGGER IF EXISTS league_backup_tokens_updated_at
  ON public.league_backup_tokens;
CREATE TRIGGER league_backup_tokens_updated_at
  BEFORE UPDATE ON public.league_backup_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.league_backup_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League owners can view backup tokens" ON public.league_backup_tokens;
CREATE POLICY "League owners can view backup tokens"
  ON public.league_backup_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.id = league_backup_tokens.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_backup_tokens.league_id
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

DROP POLICY IF EXISTS "League owners can create backup tokens" ON public.league_backup_tokens;
CREATE POLICY "League owners can create backup tokens"
  ON public.league_backup_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.leagues l
        LEFT JOIN public.organizations o ON o.id = l.organization_id
        WHERE l.id = league_backup_tokens.league_id
          AND (
            l.owner_id = auth.uid()
            OR l.created_by = auth.uid()
            OR o.owner_user_id = auth.uid()
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.league_memberships lm
        WHERE lm.league_id = league_backup_tokens.league_id
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

DROP POLICY IF EXISTS "League owners can update backup tokens" ON public.league_backup_tokens;
CREATE POLICY "League owners can update backup tokens"
  ON public.league_backup_tokens
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.id = league_backup_tokens.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_backup_tokens.league_id
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
      WHERE l.id = league_backup_tokens.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_backup_tokens.league_id
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
  'league-migration-assets',
  'league-migration-assets',
  false,
  52428800,
  ARRAY[
    'application/sql',
    'application/json',
    'application/xml',
    'application/zip',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'text/tab-separated-values',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;
