-- User Consents Table for GDPR/CCPA Compliance
-- Tracks user consent for Terms of Service, Privacy Policy, Marketing, Analytics, etc.

CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'terms_v1',
    'privacy_v1',
    'marketing_emails',
    'analytics_tracking',
    'phone_contact',
    'location_data'
  )),
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_consents_user ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type, granted);
CREATE INDEX idx_user_consents_user_type ON user_consents(user_id, consent_type);

-- RLS Policies
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view their own consents"
  ON user_consents
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own consents
CREATE POLICY "Users can create their own consents"
  ON user_consents
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own consents (for withdrawal)
CREATE POLICY "Users can update their own consents"
  ON user_consents
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can manage all consents
CREATE POLICY "Service role can manage all consents"
  ON user_consents
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to check if user has granted a specific consent
CREATE OR REPLACE FUNCTION has_user_consent(
  p_user_id UUID,
  p_consent_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_consents
    WHERE user_id = p_user_id
      AND consent_type = p_consent_type
      AND granted = TRUE
      AND withdrawn_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to withdraw consent
CREATE OR REPLACE FUNCTION withdraw_consent(
  p_user_id UUID,
  p_consent_type TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_consents
  SET
    granted = FALSE,
    withdrawn_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND consent_type = p_consent_type
    AND granted = TRUE
    AND withdrawn_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE user_consents IS 'GDPR/CCPA compliance: tracks user consent for data processing, marketing, analytics, etc.';
COMMENT ON COLUMN user_consents.consent_type IS 'Type of consent: terms_v1, privacy_v1, marketing_emails, analytics_tracking, phone_contact, location_data';
COMMENT ON COLUMN user_consents.granted IS 'Whether consent was granted (true) or withdrawn (false)';
COMMENT ON COLUMN user_consents.withdrawn_at IS 'Timestamp when consent was withdrawn';
COMMENT ON COLUMN user_consents.ip_address IS 'IP address at time of consent (legal proof)';
COMMENT ON COLUMN user_consents.user_agent IS 'User agent at time of consent (legal proof)';
