-- Canonicalized from legacy short migration version 20260131.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- ============================================
-- GDPR Article 17 Compliance: Account Deletion
-- Migration: 20260131_account_deletion_gdpr.sql
--
-- Implements "Right to Erasure" with:
-- - 30-day grace period (soft delete)
-- - Audit log anonymization (not deletion)
-- - Payment history retention (7 years, anonymized)
-- - Cascade deletion of all user data
-- - Stripe customer deletion
-- - Email notifications
-- ============================================

-- ============================================
-- 1. Add soft delete columns to profiles
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deletion_ip_address TEXT,
ADD COLUMN IF NOT EXISTS deletion_user_agent TEXT;

-- Partial index for efficient cleanup queries (only index rows pending deletion)
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled
ON profiles(deletion_scheduled_for)
WHERE deletion_scheduled_for IS NOT NULL
  AND deleted_at IS NULL;

-- Index for finding deleted accounts (for audit queries)
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
ON profiles(deleted_at)
WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN profiles.deletion_requested_at IS 'Timestamp when user requested account deletion';

COMMENT ON COLUMN profiles.deletion_scheduled_for IS 'Timestamp when account will be permanently deleted (30 days after request)';

COMMENT ON COLUMN profiles.deleted_at IS 'Timestamp when account was permanently deleted';

COMMENT ON COLUMN profiles.deletion_reason IS 'Optional reason provided by user for deletion';

COMMENT ON COLUMN profiles.deletion_ip_address IS 'IP address from which deletion was requested (audit trail)';

COMMENT ON COLUMN profiles.deletion_user_agent IS 'User agent from which deletion was requested (audit trail)';

-- ============================================
-- 2. Account Deletion Log Table
-- ============================================

-- Tracks the full lifecycle of deletion requests for compliance
CREATE TABLE IF NOT EXISTS account_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Do NOT cascade delete this
  profile_email TEXT NOT NULL, -- Denormalized for post-deletion reference

  -- Lifecycle tracking
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  deletion_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,

  -- Processing status
  status TEXT NOT NULL CHECK (status IN ('pending', 'cancelled', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Notification tracking
  initial_notification_sent BOOLEAN DEFAULT FALSE,
  reminder_7day_sent BOOLEAN DEFAULT FALSE,
  completion_notification_sent BOOLEAN DEFAULT FALSE,

  -- Stripe cleanup tracking
  stripe_customer_id TEXT,
  stripe_deleted BOOLEAN DEFAULT FALSE,
  stripe_deletion_attempted_at TIMESTAMPTZ,
  stripe_deletion_error TEXT,

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT deletion_scheduled_future CHECK (scheduled_for > requested_at)
);

CREATE INDEX IF NOT EXISTS idx_deletion_log_user_id ON account_deletion_log(user_id);

CREATE INDEX IF NOT EXISTS idx_deletion_log_status ON account_deletion_log(status);

CREATE INDEX IF NOT EXISTS idx_deletion_log_scheduled ON account_deletion_log(scheduled_for)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_deletion_log_completed ON account_deletion_log(completed_at DESC)
WHERE status = 'completed';

COMMENT ON TABLE account_deletion_log IS 'GDPR Article 17 compliance: tracks all account deletion requests and their lifecycle';

-- RLS for deletion log
ALTER TABLE account_deletion_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests (while account still exists)
CREATE POLICY "Users can view own deletion log"
  ON account_deletion_log FOR SELECT
  USING (user_id = auth.uid());

-- Only service role can modify
CREATE POLICY "Service role can manage deletion log"
  ON account_deletion_log FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 3. Anonymization Functions
-- ============================================

-- Anonymize audit logs: replace user_id with special marker, hash PII
CREATE OR REPLACE FUNCTION anonymize_audit_logs(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
  v_anon_marker UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  UPDATE audit_logs
  SET
    user_id = v_anon_marker,
    details = CASE
      WHEN details IS NOT NULL THEN
        jsonb_set(
          details,
          '{_anonymized}',
          'true'::jsonb
        )
      ELSE '{"_anonymized": true}'::jsonb
    END,
    ip_address = NULL,
    user_agent = NULL
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Anonymize payment history: keep amounts/dates, remove PII
CREATE OR REPLACE FUNCTION anonymize_payment_history(p_user_id UUID, p_stripe_customer_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Only anonymize if we have a stripe customer ID
  IF p_stripe_customer_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Find payment records associated with this customer
  UPDATE stripe_payment_history
  SET
    stripe_customer_id = 'deleted_customer_' || encode(gen_random_bytes(8), 'hex'),
    metadata = CASE
      WHEN metadata IS NOT NULL THEN
        metadata || jsonb_build_object('_anonymized', true, '_anonymized_at', NOW())
      ELSE jsonb_build_object('_anonymized', true, '_anonymized_at', NOW())
    END
  WHERE stripe_customer_id = p_stripe_customer_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete user sessions (all active sessions invalidated)
CREATE OR REPLACE FUNCTION delete_user_sessions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete all sessions for this user (FK cascade will handle this)
  DELETE FROM user_sessions WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Master Deletion Function
-- ============================================

CREATE OR REPLACE FUNCTION execute_account_deletion(p_user_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_audit_logs_anonymized INTEGER;
  v_payment_history_anonymized INTEGER;
  v_sessions_deleted INTEGER;
  v_stripe_customer_id TEXT;
  v_org_count INTEGER;
  v_email TEXT;
BEGIN
  -- Get user email and stripe info before deletion
  SELECT email,
    (SELECT stripe_customer_id FROM organizations WHERE owner_user_id = p_user_id LIMIT 1)
  INTO v_email, v_stripe_customer_id
  FROM profiles
  WHERE id = p_user_id;

  -- Check for organization ownership
  SELECT COUNT(*) INTO v_org_count
  FROM organizations
  WHERE owner_user_id = p_user_id;

  -- If user owns organizations, they must be transferred first
  IF v_org_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete account: user owns % organizations. Transfer ownership first.', v_org_count
      USING HINT = 'Transfer organization ownership before deleting account';
  END IF;

  -- 1. Anonymize audit logs (do NOT delete - legal requirement)
  v_audit_logs_anonymized := anonymize_audit_logs(p_user_id);

  -- 2. Anonymize payment history (do NOT delete - 7 year tax retention)
  IF v_stripe_customer_id IS NOT NULL THEN
    v_payment_history_anonymized := anonymize_payment_history(p_user_id, v_stripe_customer_id);
  ELSE
    v_payment_history_anonymized := 0;
  END IF;

  -- 3. Delete user sessions (invalidate all active sessions)
  v_sessions_deleted := delete_user_sessions(p_user_id);

  -- 4. Cascade deletions via FK constraints:
  --    - user_consents (CASCADE)
  --    - league_memberships (CASCADE)
  --    - team_rosters (CASCADE)
  --    - player_stats (CASCADE)
  --    - goalie_stats (CASCADE)
  --    - All other tables with FK to profiles(id) ON DELETE CASCADE

  -- 5. Anonymize profile (keep for historical stat integrity)
  UPDATE profiles
  SET
    deleted_at = NOW(),
    email = 'deleted_' || encode(gen_random_bytes(16), 'hex') || '@deleted.local',
    full_name = 'Deleted User',
    phone = NULL,
    city = NULL,
    province = NULL,
    avatar_url = NULL,
    -- Keep jersey_number, position for historical stats (not PII)
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 6. Delete from auth.users (Supabase Auth)
  -- This will cascade to profiles if not already handled
  DELETE FROM auth.users WHERE id = p_user_id;

  -- 7. Update deletion log
  UPDATE account_deletion_log
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'processing';

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_email,
    'audit_logs_anonymized', v_audit_logs_anonymized,
    'payment_history_anonymized', v_payment_history_anonymized,
    'sessions_deleted', v_sessions_deleted,
    'deleted_at', NOW()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Log error to deletion log
  UPDATE account_deletion_log
  SET
    status = 'failed',
    error_message = SQLERRM,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'processing';

  -- Re-raise exception
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION execute_account_deletion IS 'GDPR Article 17: Permanently deletes user account and anonymizes retained records';

-- ============================================
-- 5. Triggers & Automation
-- ============================================

-- Auto-update deletion log timestamp
CREATE OR REPLACE FUNCTION update_deletion_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deletion_log_updated_at
  BEFORE UPDATE ON account_deletion_log
  FOR EACH ROW EXECUTE FUNCTION update_deletion_log_timestamp();

-- ============================================
-- 6. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION execute_account_deletion TO service_role;

GRANT EXECUTE ON FUNCTION anonymize_audit_logs TO service_role;

GRANT EXECUTE ON FUNCTION anonymize_payment_history TO service_role;

GRANT EXECUTE ON FUNCTION delete_user_sessions TO service_role;

-- ============================================
-- 7. Migration complete
-- ============================================

COMMENT ON SCHEMA public IS 'GDPR Article 17 account deletion implemented: 2026-01-31';

