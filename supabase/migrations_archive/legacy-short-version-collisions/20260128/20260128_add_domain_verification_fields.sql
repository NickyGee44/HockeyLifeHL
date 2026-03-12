-- Add domain verification fields to leagues table
-- This enables custom domain ownership verification via DNS TXT records

-- Add verification token column
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS domain_verification_token TEXT;

-- Add verification status column
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_leagues_custom_domain
  ON leagues(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Add index for verified domains
CREATE INDEX IF NOT EXISTS idx_leagues_verified_domains
  ON leagues(custom_domain, custom_domain_verified)
  WHERE custom_domain_verified = TRUE;

-- Add comments
COMMENT ON COLUMN leagues.domain_verification_token IS 'Token used to verify custom domain ownership via DNS TXT record';
COMMENT ON COLUMN leagues.custom_domain_verified IS 'Whether the custom domain has been verified via DNS TXT record';

-- Note: To verify a domain, the league must add a TXT record:
-- hockeylife-verify=<domain_verification_token>
