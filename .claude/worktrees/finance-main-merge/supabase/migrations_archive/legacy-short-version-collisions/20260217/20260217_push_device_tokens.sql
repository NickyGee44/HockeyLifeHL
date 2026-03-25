-- Push device tokens for mobile app notifications
-- Stores APNs (iOS) and FCM (Android) tokens registered by the mobile app

CREATE TABLE IF NOT EXISTS push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, device_token)
);

-- RLS: users can only manage their own device tokens
ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON push_device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON push_device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON push_device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON push_device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient lookups when sending push notifications
CREATE INDEX idx_push_device_tokens_user_active
  ON push_device_tokens (user_id, is_active)
  WHERE is_active = true;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_device_tokens_updated_at
  BEFORE UPDATE ON push_device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_device_tokens_updated_at();
