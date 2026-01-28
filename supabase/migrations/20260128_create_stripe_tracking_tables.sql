-- Stripe Subscription and Payment Tracking Tables
-- Stores subscription data and payment history for analytics and monitoring

-- Subscriptions Table
-- Tracks all league subscriptions with full Stripe metadata
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL,
  stripe_customer_id TEXT,

  -- Subscription details
  status TEXT NOT NULL, -- active, past_due, canceled, unpaid, etc.
  price_id TEXT,
  product_id TEXT,
  quantity INTEGER DEFAULT 1,

  -- Billing cycle
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Trial information
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,

  -- Pause information
  pause_collection_behavior TEXT,
  pause_collection_resumes_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one subscription per account at a time
  CONSTRAINT unique_active_subscription_per_account
    UNIQUE NULLS NOT DISTINCT (stripe_account_id, ended_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_league_id ON stripe_subscriptions(league_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_account_id ON stripe_subscriptions(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_stripe_id ON stripe_subscriptions(stripe_subscription_id);

-- Payment History Table
-- Tracks all successful and failed payments for analytics
CREATE TABLE IF NOT EXISTS stripe_payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES stripe_subscriptions(id) ON DELETE SET NULL,

  -- Stripe IDs
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_account_id TEXT NOT NULL,
  stripe_customer_id TEXT,

  -- Payment details
  amount_paid INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- paid, failed, pending, etc.
  billing_reason TEXT, -- subscription_create, subscription_cycle, etc.

  -- Payment method
  payment_method_type TEXT, -- card, bank_account, etc.
  payment_method_last4 TEXT,
  payment_method_brand TEXT, -- visa, mastercard, etc.

  -- Failure information (if applicable)
  failure_code TEXT,
  failure_message TEXT,

  -- Invoice details
  invoice_pdf_url TEXT,
  invoice_hosted_url TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for payment history
CREATE INDEX IF NOT EXISTS idx_payment_history_league_id ON stripe_payment_history(league_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON stripe_payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_account_id ON stripe_payment_history(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON stripe_payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON stripe_payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_invoice_id ON stripe_payment_history(stripe_invoice_id);

-- Stripe Events Log Table
-- Tracks all webhook events for debugging and audit purposes
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,

  -- Account/Customer context
  stripe_account_id TEXT,
  stripe_customer_id TEXT,

  -- Event data
  event_data JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_created_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_account_id ON stripe_webhook_events(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON stripe_webhook_events(created_at DESC);

-- Row Level Security
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "League owners can view their subscriptions"
  ON stripe_subscriptions FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for payment history
CREATE POLICY "League owners can view their payment history"
  ON stripe_payment_history FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for webhook events (admin only via service role)
-- No SELECT policy - only accessible via service role

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stripe_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_stripe_subscriptions_updated_at
  BEFORE UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_subscription_timestamp();

-- Comments for documentation
COMMENT ON TABLE stripe_subscriptions IS 'Tracks league subscription data from Stripe for analytics and billing management';
COMMENT ON TABLE stripe_payment_history IS 'Records all payment transactions (successful and failed) for financial tracking and reporting';
COMMENT ON TABLE stripe_webhook_events IS 'Audit log of all Stripe webhook events received for debugging and compliance';
COMMENT ON COLUMN stripe_subscriptions.status IS 'Stripe subscription status: active, past_due, canceled, unpaid, incomplete, incomplete_expired, trialing, paused';
COMMENT ON COLUMN stripe_payment_history.amount_paid IS 'Amount in cents (e.g., 2999 = $29.99)';
COMMENT ON COLUMN stripe_webhook_events.processed IS 'Whether the webhook event was successfully processed';
