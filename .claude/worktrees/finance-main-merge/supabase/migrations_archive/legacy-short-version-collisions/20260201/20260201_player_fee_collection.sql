-- =============================================================================
-- Player Fee Collection System
-- =============================================================================
--
-- This migration creates tables and functions for collecting player fees
-- through Stripe Checkout with Connect support for leagues.
--
-- Features:
-- - Season fee configuration with payment plans (full, 2-pay, 3-pay)
-- - Player payment tracking with installments
-- - Transaction history with idempotency
-- - Comprehensive audit logging
-- - Webhook event deduplication
-- =============================================================================

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

-- Payment plan types
CREATE TYPE payment_plan_type AS ENUM ('full', 'two_pay', 'three_pay');

-- Payment status
CREATE TYPE player_payment_status AS ENUM (
  'pending',
  'processing',
  'paid',
  'partially_paid',
  'overdue',
  'refunded',
  'partially_refunded',
  'cancelled',
  'failed'
);

-- Transaction types
CREATE TYPE payment_transaction_type AS ENUM (
  'payment',
  'refund',
  'installment',
  'late_fee',
  'adjustment'
);

-- =============================================================================
-- 2. ADD stripe_customer_id TO PROFILES (IF NOT EXISTS)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
    CREATE UNIQUE INDEX idx_profiles_stripe_customer_id
      ON profiles(stripe_customer_id)
      WHERE stripe_customer_id IS NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- 3. SEASON FEES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS season_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'cad')),

  -- Payment plan options
  allow_full_payment BOOLEAN NOT NULL DEFAULT true,
  allow_two_pay BOOLEAN NOT NULL DEFAULT false,
  allow_three_pay BOOLEAN NOT NULL DEFAULT false,

  -- Deadlines
  payment_deadline DATE,
  early_bird_deadline DATE,

  -- Pricing adjustments
  early_bird_discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (early_bird_discount_cents >= 0),
  late_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (late_fee_cents >= 0),
  installment_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (installment_fee_cents >= 0),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_season_fee_name UNIQUE (league_id, season_id, name),
  CONSTRAINT valid_early_bird CHECK (
    early_bird_deadline IS NULL OR
    payment_deadline IS NULL OR
    early_bird_deadline <= payment_deadline
  )
);

-- Indexes for season_fees
CREATE INDEX idx_season_fees_league ON season_fees(league_id);
CREATE INDEX idx_season_fees_season ON season_fees(season_id);
CREATE INDEX idx_season_fees_active ON season_fees(league_id, is_active) WHERE is_active = true;

-- =============================================================================
-- 4. PLAYER PAYMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS player_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id),
  season_fee_id UUID NOT NULL REFERENCES season_fees(id),
  team_id UUID REFERENCES teams(id),
  league_id UUID NOT NULL REFERENCES leagues(id),
  season_id UUID NOT NULL REFERENCES seasons(id),

  -- Payment plan
  payment_plan payment_plan_type NOT NULL DEFAULT 'full',

  -- Amounts (all in cents)
  base_amount_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  late_fee_cents INTEGER NOT NULL DEFAULT 0,
  installment_fee_cents INTEGER NOT NULL DEFAULT 0,
  -- Computed column for total
  total_amount_cents INTEGER GENERATED ALWAYS AS (
    base_amount_cents - discount_cents + late_fee_cents + installment_fee_cents
  ) STORED,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Status
  status player_payment_status NOT NULL DEFAULT 'pending',

  -- Stripe references
  stripe_customer_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_subscription_id TEXT,

  -- Installment tracking
  total_installments INTEGER NOT NULL DEFAULT 1 CHECK (total_installments BETWEEN 1 AND 3),
  current_installment INTEGER NOT NULL DEFAULT 0 CHECK (current_installment >= 0),
  next_payment_date DATE,

  -- Reminder tracking
  reminder_sent_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,

  -- Notes and metadata
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_player_fee UNIQUE (player_id, season_fee_id),
  CONSTRAINT valid_installments CHECK (current_installment <= total_installments),
  CONSTRAINT valid_paid_amount CHECK (amount_paid_cents <= total_amount_cents)
);

-- Indexes for player_payments
CREATE INDEX idx_player_payments_player ON player_payments(player_id);
CREATE INDEX idx_player_payments_league ON player_payments(league_id);
CREATE INDEX idx_player_payments_season ON player_payments(season_id);
CREATE INDEX idx_player_payments_status ON player_payments(status);
CREATE INDEX idx_player_payments_league_status ON player_payments(league_id, status);
CREATE INDEX idx_player_payments_stripe_customer ON player_payments(stripe_customer_id);
CREATE INDEX idx_player_payments_next_payment ON player_payments(next_payment_date)
  WHERE next_payment_date IS NOT NULL AND status IN ('pending', 'partially_paid');

-- =============================================================================
-- 5. PAYMENT TRANSACTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_payment_id UUID NOT NULL REFERENCES player_payments(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type payment_transaction_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  application_fee_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,
  stripe_checkout_session_id TEXT,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),

  -- Installment tracking
  installment_number INTEGER,

  -- Details
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Idempotency
  idempotency_key TEXT UNIQUE
);

-- Indexes for payment_transactions
CREATE INDEX idx_payment_transactions_payment ON payment_transactions(player_payment_id);
CREATE INDEX idx_payment_transactions_stripe_pi ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created ON payment_transactions(created_at);

-- =============================================================================
-- 6. PLAYER PAYMENT AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS player_payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_payment_id UUID REFERENCES player_payments(id) ON DELETE SET NULL,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE, -- For webhook deduplication
  payload JSONB NOT NULL DEFAULT '{}',

  -- User who triggered (null for webhooks)
  created_by UUID REFERENCES auth.users(id),

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit log
CREATE INDEX idx_payment_audit_log_payment ON player_payment_audit_log(player_payment_id);
CREATE INDEX idx_payment_audit_log_league ON player_payment_audit_log(league_id);
CREATE INDEX idx_payment_audit_log_event_type ON player_payment_audit_log(event_type);
CREATE INDEX idx_payment_audit_log_stripe_event ON player_payment_audit_log(stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;
CREATE INDEX idx_payment_audit_log_created ON player_payment_audit_log(created_at);

-- =============================================================================
-- 7. WEBHOOK EVENT TRACKING TABLE (For deduplication)
-- =============================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY, -- Stripe event ID
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'skipped', 'failed'))
);

-- Index for cleanup
CREATE INDEX idx_stripe_webhook_events_processed ON stripe_webhook_events(processed_at);

-- =============================================================================
-- 8. UPDATED_AT TRIGGERS
-- =============================================================================

-- Function for updated_at
CREATE OR REPLACE FUNCTION update_payment_tables_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS season_fees_updated_at ON season_fees;
CREATE TRIGGER season_fees_updated_at
  BEFORE UPDATE ON season_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_tables_updated_at();

DROP TRIGGER IF EXISTS player_payments_updated_at ON player_payments;
CREATE TRIGGER player_payments_updated_at
  BEFORE UPDATE ON player_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_tables_updated_at();

-- =============================================================================
-- 9. PAYMENT SUMMARY FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_payment_summary(
  p_league_id UUID,
  p_season_id UUID
)
RETURNS TABLE (
  total_expected_cents BIGINT,
  total_collected_cents BIGINT,
  total_outstanding_cents BIGINT,
  players_paid_full BIGINT,
  players_partial BIGINT,
  players_pending BIGINT,
  players_overdue BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(pp.total_amount_cents), 0)::BIGINT AS total_expected_cents,
    COALESCE(SUM(pp.amount_paid_cents), 0)::BIGINT AS total_collected_cents,
    COALESCE(SUM(pp.total_amount_cents - pp.amount_paid_cents), 0)::BIGINT AS total_outstanding_cents,
    COUNT(*) FILTER (WHERE pp.status = 'paid')::BIGINT AS players_paid_full,
    COUNT(*) FILTER (WHERE pp.status = 'partially_paid')::BIGINT AS players_partial,
    COUNT(*) FILTER (WHERE pp.status = 'pending')::BIGINT AS players_pending,
    COUNT(*) FILTER (WHERE pp.status = 'overdue')::BIGINT AS players_overdue
  FROM player_payments pp
  WHERE pp.league_id = p_league_id
    AND pp.season_id = p_season_id
    AND pp.status NOT IN ('cancelled', 'refunded');
END;
$$;

-- =============================================================================
-- 10. ATOMIC PAYMENT UPDATE FUNCTION (Fixes race condition)
-- =============================================================================

CREATE OR REPLACE FUNCTION update_payment_amount_atomic(
  p_payment_id UUID,
  p_amount_to_add INTEGER,
  p_installment_increment INTEGER DEFAULT 1
)
RETURNS player_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment player_payments;
  v_new_amount INTEGER;
  v_new_installment INTEGER;
  v_is_fully_paid BOOLEAN;
  v_next_payment_date DATE;
BEGIN
  -- Atomic update with row lock
  UPDATE player_payments
  SET
    amount_paid_cents = amount_paid_cents + p_amount_to_add,
    current_installment = current_installment + p_installment_increment,
    status = CASE
      WHEN amount_paid_cents + p_amount_to_add >= total_amount_cents THEN 'paid'::player_payment_status
      WHEN amount_paid_cents + p_amount_to_add > 0 THEN 'partially_paid'::player_payment_status
      ELSE status
    END,
    paid_at = CASE
      WHEN amount_paid_cents + p_amount_to_add >= total_amount_cents THEN now()
      ELSE paid_at
    END,
    next_payment_date = CASE
      WHEN amount_paid_cents + p_amount_to_add >= total_amount_cents THEN NULL
      WHEN total_installments > current_installment + p_installment_increment
        THEN (CURRENT_DATE + INTERVAL '1 month')::DATE
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$;

-- =============================================================================
-- 11. CHECK WEBHOOK EVENT PROCESSED FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION is_webhook_event_processed(p_event_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM stripe_webhook_events WHERE id = p_event_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    -- Mark as processed
    INSERT INTO stripe_webhook_events (id, event_type, status)
    VALUES (p_event_id, 'unknown', 'processed')
    ON CONFLICT (id) DO NOTHING;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- =============================================================================
-- 12. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE season_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_payment_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- SEASON FEES policies
CREATE POLICY "League admins can manage season fees"
  ON season_fees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = season_fees.league_id
      AND lm.user_id = auth.uid()
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
    )
  );

CREATE POLICY "Players can view active season fees in their leagues"
  ON season_fees
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = season_fees.league_id
      AND lm.user_id = auth.uid()
      AND lm.status = 'active'
    )
  );

-- PLAYER PAYMENTS policies
CREATE POLICY "Players can view own payments"
  ON player_payments
  FOR SELECT
  USING (player_id = auth.uid());

CREATE POLICY "Players can create own payments"
  ON player_payments
  FOR INSERT
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "League admins can view all payments in their leagues"
  ON player_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = player_payments.league_id
      AND lm.user_id = auth.uid()
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
    )
  );

CREATE POLICY "League admins can update payments in their leagues"
  ON player_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = player_payments.league_id
      AND lm.user_id = auth.uid()
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
    )
  );

-- PAYMENT TRANSACTIONS policies
CREATE POLICY "Players can view own transactions"
  ON payment_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_payments pp
      WHERE pp.id = payment_transactions.player_payment_id
      AND pp.player_id = auth.uid()
    )
  );

CREATE POLICY "League admins can view transactions in their leagues"
  ON payment_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_payments pp
      JOIN league_memberships lm ON lm.league_id = pp.league_id
      WHERE pp.id = payment_transactions.player_payment_id
      AND lm.user_id = auth.uid()
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
    )
  );

-- AUDIT LOG policies (read-only for admins)
CREATE POLICY "League admins can view audit log"
  ON player_payment_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = player_payment_audit_log.league_id
      AND lm.user_id = auth.uid()
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
    )
  );

-- WEBHOOK EVENTS - no direct access (service role only)
CREATE POLICY "No direct access to webhook events"
  ON stripe_webhook_events
  FOR ALL
  USING (false);

-- =============================================================================
-- 13. CLEANUP OLD WEBHOOK EVENTS (MAINTENANCE)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM stripe_webhook_events
  WHERE processed_at < now() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- =============================================================================
-- 14. COMMENTS
-- =============================================================================

COMMENT ON TABLE season_fees IS 'Fee configurations for league seasons';
COMMENT ON TABLE player_payments IS 'Player payment records for season fees';
COMMENT ON TABLE payment_transactions IS 'Individual payment and refund transactions';
COMMENT ON TABLE player_payment_audit_log IS 'Audit trail for payment operations';
COMMENT ON TABLE stripe_webhook_events IS 'Webhook event deduplication tracking';

COMMENT ON FUNCTION get_payment_summary IS 'Get aggregated payment statistics for a league season';
COMMENT ON FUNCTION update_payment_amount_atomic IS 'Atomically update payment amounts to prevent race conditions';
COMMENT ON FUNCTION is_webhook_event_processed IS 'Check and mark webhook event as processed (idempotent)';
COMMENT ON FUNCTION cleanup_old_webhook_events IS 'Clean up webhook events older than 30 days';
