-- Add email sending domain columns to leagues table
-- Allows leagues to send emails from their own domain via Resend

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS email_sending_domain TEXT,
  ADD COLUMN IF NOT EXISTS email_sending_domain_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_sending_domain_resend_id TEXT,
  ADD COLUMN IF NOT EXISTS email_from_name TEXT;

-- Index for lookups during send
CREATE INDEX IF NOT EXISTS idx_leagues_email_sending_domain
  ON leagues(email_sending_domain)
  WHERE email_sending_domain IS NOT NULL;

COMMENT ON COLUMN leagues.email_sending_domain IS 'Custom domain for sending league emails (e.g., barriemenshockey.com)';
COMMENT ON COLUMN leagues.email_sending_domain_verified IS 'Whether the custom sending domain has been verified via Resend DNS checks';
COMMENT ON COLUMN leagues.email_sending_domain_resend_id IS 'Resend API domain ID — required for verify/delete operations';
COMMENT ON COLUMN leagues.email_from_name IS 'Display name for the From header (e.g., Barrie Mens Hockey)';
