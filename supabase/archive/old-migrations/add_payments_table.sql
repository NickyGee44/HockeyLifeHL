-- ============================================
-- PAYMENTS TABLE
-- ============================================

CREATE TYPE payment_method AS ENUM ('cash', 'e_transfer', 'stripe', 'check', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'refunded', 'failed');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'completed',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  stripe_payment_intent_id TEXT, -- For Stripe payments
  entered_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Who entered this payment
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_player ON payments(player_id);
CREATE INDEX idx_payments_season ON payments(season_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
-- Owners can see all payments
CREATE POLICY "Owners can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Owners can insert payments
CREATE POLICY "Owners can insert payments"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Owners can update payments
CREATE POLICY "Owners can update payments"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Owners can delete payments
CREATE POLICY "Owners can delete payments"
  ON payments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Players can view their own payments
CREATE POLICY "Players can view own payments"
  ON payments FOR SELECT
  USING (player_id = auth.uid());
