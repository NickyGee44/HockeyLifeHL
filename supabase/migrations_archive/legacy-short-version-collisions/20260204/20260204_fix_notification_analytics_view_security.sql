-- =============================================================================
-- Migration: fix_notification_analytics_view_security
-- Date: 2026-02-04
-- Purpose: Create secure RPC function for notification analytics
--
-- Security Issue:
-- - If notification_analytics VIEW exists, it could bypass RLS
-- - Views with GRANT to anon/authenticated bypass underlying table RLS
-- - This creates unauthorized access to notification metrics
--
-- Solution:
-- - Revoke any existing permissions on notification_analytics view
-- - Create SECURITY DEFINER function with proper access control
-- - Function enforces: user must be league admin/owner
-- - Function uses SET search_path = public to prevent injection
--
-- Breaking Change:
-- - Any code using .from('notification_analytics') must migrate to
--   .rpc('get_notification_analytics', { p_league_id, p_start_date, p_end_date })
--
-- References:
-- - RLS_SECURITY_FIXES_2026-02-04.md (Issue #2)
-- - Supabase Docs: https://supabase.com/docs/guides/database/database-linter
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Revoke permissions if view exists (idempotent)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Check if view exists and revoke permissions
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public'
    AND viewname = 'notification_analytics'
  ) THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON public.notification_analytics FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON public.notification_analytics FROM authenticated';
    RAISE NOTICE 'Revoked permissions on existing notification_analytics view';
  ELSE
    RAISE NOTICE 'notification_analytics view does not exist - skipping revoke';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 2: Create secure RPC function for notification analytics
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_notification_analytics(
  p_league_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  league_id UUID,
  type TEXT,
  channel TEXT,
  status TEXT,
  count BIGINT,
  sent_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_league_admin BOOLEAN;
  v_is_platform_owner BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is platform owner (has access to all leagues)
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_user_id
    AND role = 'owner'
  ) INTO v_is_platform_owner;

  -- If specific league requested, verify user has admin access
  IF p_league_id IS NOT NULL AND NOT v_is_platform_owner THEN
    SELECT EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = p_league_id
      AND lm.user_id = v_user_id
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
    ) INTO v_is_league_admin;

    IF NOT v_is_league_admin THEN
      RAISE EXCEPTION 'Access denied: You must be a league admin or owner to view notification analytics';
    END IF;
  END IF;

  -- Return aggregated notification analytics
  RETURN QUERY
  SELECT
    n.league_id,
    n.type,
    n.channel,
    n.status,
    COUNT(*)::BIGINT as count,
    DATE(COALESCE(n.sent_at, n.created_at)) as sent_date
  FROM notifications n
  WHERE
    -- Filter by league if specified
    (p_league_id IS NULL OR n.league_id = p_league_id)
    -- Filter by date range if specified
    AND (p_start_date IS NULL OR COALESCE(n.sent_at, n.created_at) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(n.sent_at, n.created_at) <= p_end_date)
    -- If not platform owner and no specific league, only show user's leagues
    AND (
      v_is_platform_owner
      OR p_league_id IS NOT NULL
      OR n.league_id IN (
        SELECT lm.league_id
        FROM league_memberships lm
        WHERE lm.user_id = v_user_id
        AND lm.role IN ('owner', 'admin')
        AND lm.status = 'active'
      )
    )
  GROUP BY
    n.league_id,
    n.type,
    n.channel,
    n.status,
    DATE(COALESCE(n.sent_at, n.created_at))
  ORDER BY
    sent_date DESC,
    n.league_id,
    n.type;
END;
$$;

-- ---------------------------------------------------------------------------
-- Step 3: Grant execute permissions
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.get_notification_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ---------------------------------------------------------------------------
-- Step 4: Add function comments
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.get_notification_analytics IS
'Secure function to query notification analytics with proper access control.
Users must be league admins/owners to view analytics for their leagues.
Platform owners can view all league analytics.

Usage:
  -- Get analytics for a specific league
  SELECT * FROM get_notification_analytics(''league-id'', ''2026-01-01'', ''2026-02-01'');

  -- Get analytics for all accessible leagues
  SELECT * FROM get_notification_analytics(NULL, NULL, NULL);

  -- Get analytics with date filtering
  SELECT * FROM get_notification_analytics(
    ''league-id'',
    NOW() - INTERVAL ''30 days'',
    NOW()
  );

Returns:
  - league_id: UUID of the league
  - type: Notification type (game_reminder, roster_change, etc.)
  - channel: Delivery channel (email, sms, push)
  - status: Delivery status (sent, failed, pending, bounced)
  - count: Number of notifications
  - sent_date: Date notifications were sent

Security:
  - SECURITY DEFINER with search_path = public
  - Enforces league admin/owner access control
  - Platform owners have access to all leagues';
