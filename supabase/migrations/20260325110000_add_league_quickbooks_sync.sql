-- =============================================================================
-- QuickBooks Online journal sync
-- =============================================================================
-- Stores per-league QuickBooks Online connections, mapping config, preview/sync
-- runs, and synced journal-entry history.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.league_quickbooks_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL UNIQUE REFERENCES public.leagues(id) ON DELETE CASCADE,
  realm_id text NOT NULL,
  company_name text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_type text,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disconnected', 'error')),
  connected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_quickbooks_connections_realm
  ON public.league_quickbooks_connections(realm_id);

CREATE TABLE IF NOT EXISTS public.league_quickbooks_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL UNIQUE REFERENCES public.leagues(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.league_quickbooks_connections(id) ON DELETE CASCADE,
  mapping_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_quickbooks_mappings_connection
  ON public.league_quickbooks_mappings(connection_id);

CREATE TABLE IF NOT EXISTS public.league_quickbooks_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.league_quickbooks_connections(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'preview'
    CHECK (status IN ('preview', 'syncing', 'success', 'partial', 'failed', 'cancelled')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  already_synced_count integer NOT NULL DEFAULT 0,
  changed_count integer NOT NULL DEFAULT 0,
  synced_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_quickbooks_sync_runs_league
  ON public.league_quickbooks_sync_runs(league_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_league_quickbooks_sync_runs_connection
  ON public.league_quickbooks_sync_runs(connection_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.league_quickbooks_sync_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid NOT NULL REFERENCES public.league_quickbooks_sync_runs(id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.league_quickbooks_connections(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  source_hash text NOT NULL,
  journal_no text NOT NULL,
  journal_date date NOT NULL,
  description text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  line_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'already_synced', 'changed', 'error', 'syncing', 'success', 'failed')),
  qbo_journal_entry_id text,
  payload_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_snapshot jsonb,
  error_text text,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_quickbooks_sync_entries_run
  ON public.league_quickbooks_sync_entries(sync_run_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_league_quickbooks_sync_entries_source
  ON public.league_quickbooks_sync_entries(connection_id, source_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_league_quickbooks_sync_entries_hash
  ON public.league_quickbooks_sync_entries(connection_id, source_hash, status);

ALTER TABLE public.league_quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_quickbooks_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_quickbooks_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_quickbooks_sync_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League members can view quickbooks connections"
  ON public.league_quickbooks_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_connections.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_connections.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_connections.league_id
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

CREATE POLICY "League owners can manage quickbooks connections"
  ON public.league_quickbooks_connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_connections.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_connections.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_connections.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_connections.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_connections.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_connections.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role = 'owner'
    )
  );

CREATE POLICY "Platform admins can manage quickbooks connections"
  ON public.league_quickbooks_connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  );

CREATE POLICY "League members can view quickbooks mappings"
  ON public.league_quickbooks_mappings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_mappings.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_mappings.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_mappings.league_id
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

CREATE POLICY "League owners can manage quickbooks mappings"
  ON public.league_quickbooks_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_mappings.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_mappings.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_mappings.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_mappings.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_mappings.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_mappings.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role = 'owner'
    )
  );

CREATE POLICY "Platform admins can manage quickbooks mappings"
  ON public.league_quickbooks_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  );

CREATE POLICY "League members can view quickbooks sync runs"
  ON public.league_quickbooks_sync_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_sync_runs.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_sync_runs.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_sync_runs.league_id
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

CREATE POLICY "League owners can manage quickbooks sync runs"
  ON public.league_quickbooks_sync_runs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_sync_runs.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_sync_runs.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_sync_runs.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_sync_runs.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_sync_runs.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_sync_runs.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role = 'owner'
    )
  );

CREATE POLICY "Platform admins can manage quickbooks sync runs"
  ON public.league_quickbooks_sync_runs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  );

CREATE POLICY "League members can view quickbooks sync entries"
  ON public.league_quickbooks_sync_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_sync_entries.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_sync_entries.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_sync_entries.league_id
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

CREATE POLICY "League owners can manage quickbooks sync entries"
  ON public.league_quickbooks_sync_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_sync_entries.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_sync_entries.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_sync_entries.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_quickbooks_sync_entries.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.leagues l ON l.organization_id = o.id
      WHERE l.id = league_quickbooks_sync_entries.league_id
        AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_quickbooks_sync_entries.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role = 'owner'
    )
  );

CREATE POLICY "Platform admins can manage quickbooks sync entries"
  ON public.league_quickbooks_sync_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  );

GRANT SELECT
  ON public.league_quickbooks_connections,
     public.league_quickbooks_mappings,
     public.league_quickbooks_sync_runs,
     public.league_quickbooks_sync_entries
  TO authenticated;

GRANT ALL
  ON public.league_quickbooks_connections,
     public.league_quickbooks_mappings,
     public.league_quickbooks_sync_runs,
     public.league_quickbooks_sync_entries
  TO service_role;
