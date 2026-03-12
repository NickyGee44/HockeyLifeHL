-- Create the standard update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Stripe Connect Payments tracking table
-- Tracks all payments processed through Stripe Connect for leagues
CREATE TABLE IF NOT EXISTS stripe_connect_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_charge_id TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  application_fee_cents INTEGER NOT NULL CHECK (application_fee_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  customer_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'))
);

-- Indexes for efficient queries
CREATE INDEX idx_stripe_connect_payments_league ON stripe_connect_payments(league_id);
CREATE INDEX idx_stripe_connect_payments_status ON stripe_connect_payments(status);
CREATE INDEX idx_stripe_connect_payments_created ON stripe_connect_payments(created_at DESC);
CREATE INDEX idx_stripe_connect_payments_intent ON stripe_connect_payments(stripe_payment_intent_id);

-- Enable RLS for tenant isolation
ALTER TABLE stripe_connect_payments ENABLE ROW LEVEL SECURITY;

-- League admins can view their payments
CREATE POLICY "League admins can view payments"
  ON stripe_connect_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = stripe_connect_payments.league_id
      AND lm.user_id = auth.uid()
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_stripe_connect_payments_updated_at
  BEFORE UPDATE ON stripe_connect_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stripe Connect Audit Log
-- Records all financial operations for compliance and debugging
CREATE TABLE IF NOT EXISTS stripe_connect_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for audit log queries
CREATE INDEX idx_stripe_connect_audit_league ON stripe_connect_audit_log(league_id);
CREATE INDEX idx_stripe_connect_audit_event_type ON stripe_connect_audit_log(event_type);
CREATE INDEX idx_stripe_connect_audit_stripe_event ON stripe_connect_audit_log(stripe_event_id) WHERE stripe_event_id IS NOT NULL;
CREATE INDEX idx_stripe_connect_audit_created ON stripe_connect_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE stripe_connect_audit_log ENABLE ROW LEVEL SECURITY;

-- League admins can view audit log
CREATE POLICY "League admins can view audit log"
  ON stripe_connect_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = stripe_connect_audit_log.league_id
      AND lm.user_id = auth.uid()
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
    )
  );

-- Comments for documentation
COMMENT ON TABLE stripe_connect_payments IS 'Tracks payments processed through Stripe Connect for league transactions';
COMMENT ON TABLE stripe_connect_audit_log IS 'Audit trail for all Stripe Connect financial operations';
COMMENT ON COLUMN stripe_connect_payments.application_fee_cents IS 'Platform fee (5%) collected on each transaction';
COMMENT ON COLUMN stripe_connect_payments.status IS 'Payment status: pending, succeeded, failed, refunded, partially_refunded';
