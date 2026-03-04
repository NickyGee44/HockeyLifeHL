-- =============================================================================
-- Migration: Protect is_platform_admin from self-escalation
--
-- Problem: The "Users can update own profile" RLS policy has no WITH CHECK
-- clause restricting column writes. Any authenticated user can run:
--   UPDATE profiles SET is_platform_admin = true WHERE id = auth.uid()
-- and silently grant themselves platform admin access.
--
-- Fix 1: BEFORE UPDATE trigger blocks any change to is_platform_admin
--         when request comes from a user context (auth.uid() IS NOT NULL).
--         Service role (auth.uid() IS NULL) can still set the flag.
--
-- Fix 2: Recreate the UPDATE policy with an explicit WITH CHECK that
--         additionally prevents is_platform_admin from being toggled by users.
--         Both defences must fail for escalation to succeed.
-- =============================================================================

-- ============================================================
-- Fix 1: Trigger guard (primary defence)
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_platform_admin_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- auth.uid() is NULL when the request comes through the service role.
  -- Only block changes from authenticated user sessions.
  IF auth.uid() IS NOT NULL AND NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    RAISE EXCEPTION 'is_platform_admin cannot be modified by users'
      USING ERRCODE = '42501';  -- insufficient_privilege
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_platform_admin_escalation ON public.profiles;

CREATE TRIGGER guard_platform_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_platform_admin_self_escalation();

-- ============================================================
-- Fix 2: Tighten the RLS UPDATE policy (secondary defence)
-- ============================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-elevation: is_platform_admin must not change via user context
    AND is_platform_admin = (
      SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()
    )
  );
