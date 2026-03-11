-- =============================================================================
-- Fix Team Billing Schema
-- =============================================================================
-- Repairs environments where the original team billing migration drifted or was
-- only partially applied. This migration is idempotent and safe to run on
-- environments that already have the schema.
-- =============================================================================

DO $$
BEGIN
  CREATE TYPE public.fee_collection_model AS ENUM ('individual', 'team', 'hybrid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS fee_collection_model public.fee_collection_model
  NOT NULL DEFAULT 'individual';

CREATE TABLE IF NOT EXISTS public.team_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  total_players integer NOT NULL DEFAULT 0,
  fee_per_player_cents integer NOT NULL DEFAULT 0,
  total_amount_cents integer NOT NULL DEFAULT 0,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'waived')),
  payment_deadline timestamptz,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  paid_by uuid REFERENCES public.profiles(id),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS total_players integer NOT NULL DEFAULT 0;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS fee_per_player_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS total_amount_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS amount_paid_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'CAD';
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS payment_deadline timestamptz;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.team_invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_invoice_id uuid NOT NULL REFERENCES public.team_invoices(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  payment_method text NOT NULL DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe', 'e_transfer', 'cash', 'check', 'other')),
  stripe_payment_intent_id text,
  reference_number text,
  recorded_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_invoice_payments
  ADD COLUMN IF NOT EXISTS team_invoice_id uuid REFERENCES public.team_invoices(id) ON DELETE CASCADE;
ALTER TABLE public.team_invoice_payments
  ADD COLUMN IF NOT EXISTS amount_cents integer;
ALTER TABLE public.team_invoice_payments
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'stripe';
ALTER TABLE public.team_invoice_payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.team_invoice_payments
  ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE public.team_invoice_payments
  ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.team_invoice_payments
  ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.team_invoice_payments
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_invoices_status_check'
      AND conrelid = 'public.team_invoices'::regclass
  ) THEN
    ALTER TABLE public.team_invoices
      ADD CONSTRAINT team_invoices_status_check
      CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'waived'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_invoice_payments_amount_cents_check'
      AND conrelid = 'public.team_invoice_payments'::regclass
  ) THEN
    ALTER TABLE public.team_invoice_payments
      ADD CONSTRAINT team_invoice_payments_amount_cents_check
      CHECK (amount_cents > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_invoice_payments_payment_method_check'
      AND conrelid = 'public.team_invoice_payments'::regclass
  ) THEN
    ALTER TABLE public.team_invoice_payments
      ADD CONSTRAINT team_invoice_payments_payment_method_check
      CHECK (payment_method IN ('stripe', 'e_transfer', 'cash', 'check', 'other'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invoices_team_season_unique
  ON public.team_invoices(team_id, season_id);
CREATE INDEX IF NOT EXISTS idx_team_invoices_league_season
  ON public.team_invoices(league_id, season_id);
CREATE INDEX IF NOT EXISTS idx_team_invoices_team
  ON public.team_invoices(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invoices_status
  ON public.team_invoices(status);
CREATE INDEX IF NOT EXISTS idx_team_invoice_payments_invoice
  ON public.team_invoice_payments(team_invoice_id);

CREATE OR REPLACE FUNCTION public.update_team_invoices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_invoices_updated_at ON public.team_invoices;
CREATE TRIGGER team_invoices_updated_at
  BEFORE UPDATE ON public.team_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_invoices_updated_at();

ALTER TABLE public.team_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League admins can view team invoices" ON public.team_invoices;
DROP POLICY IF EXISTS "Team captains can view own team invoice" ON public.team_invoices;
DROP POLICY IF EXISTS "League admins can create team invoices" ON public.team_invoices;
DROP POLICY IF EXISTS "League admins can update team invoices" ON public.team_invoices;
DROP POLICY IF EXISTS "League admins can delete team invoices" ON public.team_invoices;
DROP POLICY IF EXISTS "League owners/admins can view team invoices" ON public.team_invoices;
DROP POLICY IF EXISTS "Team leaders can view team invoices" ON public.team_invoices;
DROP POLICY IF EXISTS "League owners/admins can create team invoices" ON public.team_invoices;
DROP POLICY IF EXISTS "League owners/admins can update team invoices" ON public.team_invoices;
DROP POLICY IF EXISTS "League owners/admins can delete team invoices" ON public.team_invoices;

DROP POLICY IF EXISTS "League admins can view team invoice payments" ON public.team_invoice_payments;
DROP POLICY IF EXISTS "Team captains can view own team payments" ON public.team_invoice_payments;
DROP POLICY IF EXISTS "League admins can record team payments" ON public.team_invoice_payments;
DROP POLICY IF EXISTS "League owners/admins can view team invoice payments" ON public.team_invoice_payments;
DROP POLICY IF EXISTS "Team leaders can view team invoice payments" ON public.team_invoice_payments;
DROP POLICY IF EXISTS "League owners/admins can record team payments" ON public.team_invoice_payments;

CREATE POLICY "League owners/admins can view team invoices"
  ON public.team_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = team_invoices.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = team_invoices.league_id
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

CREATE POLICY "Team leaders can view team invoices"
  ON public.team_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_rosters tr
      WHERE tr.team_id = team_invoices.team_id
        AND tr.player_id = auth.uid()
        AND tr.status = 'active'
        AND tr.leadership_role IN ('captain', 'alternate_captain')
    )
  );

CREATE POLICY "League owners/admins can create team invoices"
  ON public.team_invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = team_invoices.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = team_invoices.league_id
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

CREATE POLICY "League owners/admins can update team invoices"
  ON public.team_invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = team_invoices.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = team_invoices.league_id
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
      WHERE l.id = team_invoices.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = team_invoices.league_id
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

CREATE POLICY "League owners/admins can delete team invoices"
  ON public.team_invoices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = team_invoices.league_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = team_invoices.league_id
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

CREATE POLICY "League owners/admins can view team invoice payments"
  ON public.team_invoice_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_invoices ti
      JOIN public.leagues l ON l.id = ti.league_id
      WHERE ti.id = team_invoice_payments.team_invoice_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_invoices ti
      JOIN public.league_memberships lm ON lm.league_id = ti.league_id
      WHERE ti.id = team_invoice_payments.team_invoice_id
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

CREATE POLICY "Team leaders can view team invoice payments"
  ON public.team_invoice_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_invoices ti
      JOIN public.team_rosters tr ON tr.team_id = ti.team_id
      WHERE ti.id = team_invoice_payments.team_invoice_id
        AND tr.player_id = auth.uid()
        AND tr.status = 'active'
        AND tr.leadership_role IN ('captain', 'alternate_captain')
    )
  );

CREATE POLICY "League owners/admins can record team payments"
  ON public.team_invoice_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.team_invoices ti
      JOIN public.leagues l ON l.id = ti.league_id
      WHERE ti.id = team_invoice_payments.team_invoice_id
        AND (l.created_by = auth.uid() OR l.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_invoices ti
      JOIN public.league_memberships lm ON lm.league_id = ti.league_id
      WHERE ti.id = team_invoice_payments.team_invoice_id
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invoices TO authenticated, service_role;
GRANT SELECT, INSERT ON public.team_invoice_payments TO authenticated, service_role;
