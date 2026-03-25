-- =============================================================================
-- Team Billing: fee_collection_model + team_invoices + team_invoice_payments
-- =============================================================================
-- Adds team-based billing support so leagues can invoice teams instead of
-- (or in addition to) individual player payments.
-- =============================================================================

-- 1. Create enum for fee collection model
DO $$ BEGIN
  CREATE TYPE fee_collection_model AS ENUM ('individual', 'team', 'hybrid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add fee_collection_model column to seasons
ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS fee_collection_model fee_collection_model NOT NULL DEFAULT 'individual';

-- 3. Create team_invoices table
CREATE TABLE IF NOT EXISTS team_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
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
  paid_by uuid REFERENCES profiles(id),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, season_id)
);

-- 4. Create team_invoice_payments table
CREATE TABLE IF NOT EXISTS team_invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_invoice_id uuid NOT NULL REFERENCES team_invoices(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  payment_method text NOT NULL DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe', 'e_transfer', 'cash', 'check', 'other')),
  stripe_payment_intent_id text,
  reference_number text,
  recorded_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_team_invoices_league_season
  ON team_invoices(league_id, season_id);
CREATE INDEX IF NOT EXISTS idx_team_invoices_team
  ON team_invoices(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invoices_status
  ON team_invoices(status);
CREATE INDEX IF NOT EXISTS idx_team_invoice_payments_invoice
  ON team_invoice_payments(team_invoice_id);

-- 6. Updated_at trigger for team_invoices
CREATE OR REPLACE FUNCTION update_team_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_invoices_updated_at ON team_invoices;
CREATE TRIGGER team_invoices_updated_at
  BEFORE UPDATE ON team_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_team_invoices_updated_at();

-- 7. Enable RLS
ALTER TABLE team_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invoice_payments ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for team_invoices
-- League owner/admin can see all invoices for their league
CREATE POLICY "League admins can view team invoices"
  ON team_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_invoices.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- Team captains can see their team's invoice
CREATE POLICY "Team captains can view own team invoice"
  ON team_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_rosters tr
      WHERE tr.team_id = team_invoices.team_id
        AND tr.player_id = auth.uid()
        AND tr.leadership_role = 'captain'
    )
  );

-- League owner/admin can create invoices
CREATE POLICY "League admins can create team invoices"
  ON team_invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_invoices.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- League owner/admin can update invoices
CREATE POLICY "League admins can update team invoices"
  ON team_invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_invoices.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- League owner/admin can delete invoices
CREATE POLICY "League admins can delete team invoices"
  ON team_invoices FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = team_invoices.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

-- 9. RLS policies for team_invoice_payments
-- Viewable by league admins and team captains (through invoice)
CREATE POLICY "League admins can view team invoice payments"
  ON team_invoice_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_invoices ti
      JOIN league_memberships lm ON lm.league_id = ti.league_id
      WHERE ti.id = team_invoice_payments.team_invoice_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "Team captains can view own team payments"
  ON team_invoice_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_invoices ti
      JOIN team_rosters tr ON tr.team_id = ti.team_id
      WHERE ti.id = team_invoice_payments.team_invoice_id
        AND tr.player_id = auth.uid()
        AND tr.leadership_role = 'captain'
    )
  );

-- Only league admins can record payments
CREATE POLICY "League admins can record team payments"
  ON team_invoice_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_invoices ti
      JOIN league_memberships lm ON lm.league_id = ti.league_id
      WHERE ti.id = team_invoice_payments.team_invoice_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('league_admin', 'commissioner')
        AND lm.status = 'active'
    )
  );
