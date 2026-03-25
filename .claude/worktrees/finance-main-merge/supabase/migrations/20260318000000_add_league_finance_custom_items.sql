-- =============================================================================
-- League finance custom items
-- =============================================================================
-- Manual finance entries that league owners/admins can track alongside
-- registration collections, team invoice payments, and referee payroll.
-- These rows also store QuickBooks-ready debit/credit account mappings so the
-- app can export journal-entry CSV files without losing owner-entered context.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.league_finance_custom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  impact_type text NOT NULL
    CHECK (impact_type IN ('income', 'expense', 'neutral')),
  title text NOT NULL,
  description text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'CAD',
  debit_account_name text NOT NULL,
  credit_account_name text NOT NULL,
  quickbooks_name text,
  quickbooks_class text,
  quickbooks_location text,
  reference_number text,
  notes text,
  include_in_quickbooks_export boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_finance_custom_items_league
  ON public.league_finance_custom_items(league_id);

CREATE INDEX IF NOT EXISTS idx_league_finance_custom_items_league_season
  ON public.league_finance_custom_items(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_league_finance_custom_items_entry_date
  ON public.league_finance_custom_items(entry_date DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_league_finance_custom_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_finance_custom_items_updated_at
  ON public.league_finance_custom_items;

CREATE TRIGGER league_finance_custom_items_updated_at
  BEFORE UPDATE ON public.league_finance_custom_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_league_finance_custom_items_updated_at();

ALTER TABLE public.league_finance_custom_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League owners/admins can view finance custom items"
  ON public.league_finance_custom_items;
DROP POLICY IF EXISTS "League owners/admins can manage finance custom items"
  ON public.league_finance_custom_items;
DROP POLICY IF EXISTS "Platform admins can view finance custom items"
  ON public.league_finance_custom_items;
DROP POLICY IF EXISTS "Platform admins can manage finance custom items"
  ON public.league_finance_custom_items;

CREATE POLICY "League owners/admins can view finance custom items"
  ON public.league_finance_custom_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_finance_custom_items.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_finance_custom_items.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "League owners/admins can manage finance custom items"
  ON public.league_finance_custom_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_finance_custom_items.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_finance_custom_items.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = league_finance_custom_items.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = league_finance_custom_items.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Platform admins can view finance custom items"
  ON public.league_finance_custom_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = true
    )
  );

CREATE POLICY "Platform admins can manage finance custom items"
  ON public.league_finance_custom_items
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

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.league_finance_custom_items
  TO authenticated, service_role;
