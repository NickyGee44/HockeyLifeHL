-- ============================================
-- Audit Log Retention Policy
-- GDPR Article 5(1)(e): Storage Limitation
--
-- Retention periods:
-- - Operational logs: 90 days
-- - Security logs: 1 year
-- - Legal hold: 7 years (manual flag)
-- ============================================

-- 1. Add retention category to audit_logs table
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'operational'
  CHECK (retention_category IN ('operational', 'security', 'legal_hold'));

COMMENT ON COLUMN audit_logs.retention_category IS 'Retention category: operational (90d), security (1y), legal_hold (7y)';

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention
ON audit_logs(created_at, retention_category);

-- 2. Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS jsonb AS $$
DECLARE
  v_operational_deleted INTEGER;
  v_security_deleted INTEGER;
  v_total_deleted INTEGER;
BEGIN
  -- Delete operational logs older than 90 days
  DELETE FROM audit_logs
  WHERE retention_category = 'operational'
    AND created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_operational_deleted = ROW_COUNT;

  -- Delete security logs older than 1 year
  DELETE FROM audit_logs
  WHERE retention_category = 'security'
    AND created_at < NOW() - INTERVAL '1 year';

  GET DIAGNOSTICS v_security_deleted = ROW_COUNT;

  v_total_deleted := v_operational_deleted + v_security_deleted;

  RETURN jsonb_build_object(
    'success', true,
    'operational_deleted', v_operational_deleted,
    'security_deleted', v_security_deleted,
    'total_deleted', v_total_deleted,
    'cleanup_timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_audit_logs IS 'GDPR compliance: Deletes audit logs older than retention period';

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_audit_logs TO service_role;

-- 3. Helper function to flag logs for legal hold
CREATE OR REPLACE FUNCTION flag_audit_logs_legal_hold(
  p_user_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE audit_logs
  SET retention_category = 'legal_hold'
  WHERE
    (p_user_id IS NULL OR user_id = p_user_id) AND
    (p_resource_type IS NULL OR resource_type = p_resource_type) AND
    (p_action IS NULL OR action = p_action) AND
    (p_from_date IS NULL OR created_at >= p_from_date) AND
    (p_to_date IS NULL OR created_at <= p_to_date) AND
    retention_category != 'legal_hold';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION flag_audit_logs_legal_hold IS 'Flag audit logs for legal hold (7-year retention). Used for fraud investigations, lawsuits, etc.';

GRANT EXECUTE ON FUNCTION flag_audit_logs_legal_hold TO service_role;

-- 4. Helper function to mark security-related logs
CREATE OR REPLACE FUNCTION flag_security_logs()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Mark authentication failures, permission violations, etc. as security logs
  UPDATE audit_logs
  SET retention_category = 'security'
  WHERE retention_category = 'operational'
    AND (
      action IN ('login_failed', 'permission_denied', 'unauthorized_access', 'suspicious_activity') OR
      resource_type = 'auth' OR
      details ? 'security_event'
    );

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION flag_security_logs IS 'Auto-categorize security-related audit logs for 1-year retention';

GRANT EXECUTE ON FUNCTION flag_security_logs TO service_role;

-- 5. Backfill existing logs (mark all as operational for now)
-- This is a one-time operation
UPDATE audit_logs
SET retention_category = 'operational'
WHERE retention_category IS NULL;

-- Auto-categorize existing security logs
SELECT flag_security_logs();

-- ============================================
-- 6. Create Edge Function schedule placeholder
-- ============================================
-- Note: This needs to be configured in Supabase Dashboard or via cron job
-- Schedule: Daily at 3 AM (after session cleanup at 2 AM)
-- Function to call: cleanup_audit_logs()

COMMENT ON FUNCTION cleanup_audit_logs IS 'Schedule this to run daily at 3 AM via Supabase Cron or Edge Function';
