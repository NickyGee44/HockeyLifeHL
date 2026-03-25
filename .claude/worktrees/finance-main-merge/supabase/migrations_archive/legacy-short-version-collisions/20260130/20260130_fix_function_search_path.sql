-- High-Severity Security Fix: Add search_path protection to vulnerable functions
-- These functions are vulnerable to search path hijacking attacks
-- Severity: HIGH - Could lead to privilege escalation

-- =============================================================================
-- Add SET search_path = '' to all vulnerable functions
-- =============================================================================

-- 1. update_session_last_active (no arguments)
ALTER FUNCTION update_session_last_active() SET search_path = '';

-- 2. cleanup_expired_sessions (no arguments)
ALTER FUNCTION cleanup_expired_sessions() SET search_path = '';

-- 3. get_user_draft_league (user_uuid uuid)
ALTER FUNCTION get_user_draft_league(user_uuid uuid) SET search_path = '';

-- 4. cleanup_old_draft_leagues (no arguments)
ALTER FUNCTION cleanup_old_draft_leagues() SET search_path = '';

-- 5. get_league_by_hostname (hostname text)
ALTER FUNCTION get_league_by_hostname(hostname text) SET search_path = '';

-- 6. update_league_join_requests_updated_at (no arguments)
ALTER FUNCTION update_league_join_requests_updated_at() SET search_path = '';

-- 7. auto_set_league_join_request_review_info (no arguments)
ALTER FUNCTION auto_set_league_join_request_review_info() SET search_path = '';

-- 8. auto_add_user_to_league_on_approval (no arguments)
ALTER FUNCTION auto_add_user_to_league_on_approval() SET search_path = '';

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
  func_count INTEGER;
BEGIN
  -- Count functions that still have mutable search_path
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'update_session_last_active',
      'cleanup_expired_sessions',
      'get_user_draft_league',
      'cleanup_old_draft_leagues',
      'get_league_by_hostname',
      'update_league_join_requests_updated_at',
      'auto_set_league_join_request_review_info',
      'auto_add_user_to_league_on_approval'
    )
    AND NOT (
      SELECT pg_get_functiondef(p.oid) LIKE '%SET search_path%'
    );

  IF func_count > 0 THEN
    RAISE WARNING 'Some functions still have mutable search_path: %', func_count;
  ELSE
    RAISE NOTICE 'All functions successfully protected with SET search_path';
  END IF;
END $$;
