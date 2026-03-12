-- Create webhook_events table for idempotency tracking
-- This prevents duplicate processing of Stripe webhook events

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by event ID
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);

-- Index for cleanup queries (optional - for removing old events)
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Add comment
COMMENT ON TABLE webhook_events IS 'Tracks processed Stripe webhook events to prevent duplicate processing';
COMMENT ON COLUMN webhook_events.stripe_event_id IS 'Unique event ID from Stripe (evt_xxx)';
COMMENT ON COLUMN webhook_events.event_type IS 'Type of webhook event (e.g., payment_intent.succeeded)';
COMMENT ON COLUMN webhook_events.processed_at IS 'When we successfully processed this event';
