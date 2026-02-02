-- Remove city and province fields from profiles
-- GDPR/CCPA Compliance: These fields collect location data without clear necessity
-- Data minimization principle: Only collect data that is essential

-- Option 1: Drop the columns entirely (RECOMMENDED)
-- Uncomment if you want to permanently remove these fields
-- ALTER TABLE profiles DROP COLUMN IF EXISTS city;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS province;

-- Option 2: Keep the columns but make them nullable and document consent requirement
-- This approach allows future use if consent mechanism is implemented

COMMENT ON COLUMN profiles.city IS 'DEPRECATED: Location data - requires explicit location_data consent to collect. Do not collect without user consent.';
COMMENT ON COLUMN profiles.province IS 'DEPRECATED: Location data - requires explicit location_data consent to collect. Do not collect without user consent.';

-- Add check to ensure city/province are only set if user has consented
CREATE OR REPLACE FUNCTION check_location_consent()
RETURNS TRIGGER AS $$
BEGIN
  -- If city or province is being set, verify user has location_data consent
  IF (NEW.city IS NOT NULL OR NEW.province IS NOT NULL) THEN
    -- Check if user has granted location_data consent
    IF NOT EXISTS (
      SELECT 1 FROM user_consents
      WHERE user_id = NEW.id
        AND consent_type = 'location_data'
        AND granted = TRUE
        AND withdrawn_at IS NULL
    ) THEN
      -- Clear location data if no consent
      NEW.city := NULL;
      NEW.province := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce consent before storing location data
DROP TRIGGER IF EXISTS enforce_location_consent ON profiles;
CREATE TRIGGER enforce_location_consent
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_location_consent();

-- Migration: Clear existing city/province data for users without consent
-- This is a one-time cleanup
UPDATE profiles
SET
  city = NULL,
  province = NULL
WHERE id NOT IN (
  SELECT user_id
  FROM user_consents
  WHERE consent_type = 'location_data'
    AND granted = TRUE
    AND withdrawn_at IS NULL
);

COMMENT ON FUNCTION check_location_consent() IS 'GDPR compliance: Ensures city/province are only stored if user has granted location_data consent';
