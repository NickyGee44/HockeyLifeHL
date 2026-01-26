# Security Hardening Report - January 27, 2026

## Executive Summary

This report documents critical security vulnerabilities identified by the Supabase Database Linter and the fixes applied to remediate them. The migration file `20260127_security_hardening.sql` addresses all identified issues.

**Most Critical Path to Compromise (Pre-Fix):**
An attacker with any authenticated session could bypass RLS policies via SECURITY DEFINER views to access all league data, including potentially sensitive business information across all tenants in this multi-tenant application.

**Overall Security Posture (Post-Fix):** Significantly improved. All critical and high-priority issues resolved.

---

## High-Risk Findings (CRITICAL - ERROR Level)

### 1. Security Definer Views Bypass RLS

**Vulnerability:** Two views (`public_leagues`, `league_branding`) were using SECURITY DEFINER, which causes queries against these views to execute with the privileges of the view owner (typically `postgres`) rather than the calling user. This completely bypasses Row Level Security policies.

**Affected Objects:**
- `public.public_leagues`
- `public.league_branding`

**Exploit Narrative:**
1. Attacker creates an account (or compromises any authenticated user)
2. Attacker queries `SELECT * FROM league_branding` via PostgREST API
3. Query executes as `postgres` owner, bypassing all RLS policies
4. Attacker receives ALL league data, including inactive leagues, private branding configurations, custom CSS (potential for stored XSS vectors), and custom domain configurations

**Business Impact:**
- Complete tenant isolation failure in a multi-tenant SaaS
- Exposure of business-sensitive league configurations
- Potential exposure of custom domain configurations (subdomain takeover vectors)
- Compliance failures (data isolation requirements)

**Fix Applied:**
```sql
-- Recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public_leagues CASCADE;
DROP VIEW IF EXISTS league_branding CASCADE;

CREATE VIEW public_leagues AS ... ;
CREATE VIEW league_branding AS ... ;

-- Explicitly enforce SECURITY INVOKER
ALTER VIEW public_leagues SET (security_invoker = on);
ALTER VIEW league_branding SET (security_invoker = on);
```

**Tradeoffs:** None. This is strictly a security improvement with no performance or functionality impact.

---

### 2. RLS Disabled on webhook_events Table

**Vulnerability:** The `webhook_events` table had RLS disabled, exposing Stripe webhook event IDs and processing metadata to any authenticated user.

**Affected Objects:**
- `public.webhook_events`

**Exploit Narrative:**
1. Attacker with authenticated session queries `SELECT * FROM webhook_events`
2. Attacker obtains list of all Stripe event IDs processed by the system
3. This reveals:
   - Payment activity patterns (timing, volume)
   - Event types processed (business intelligence)
   - Potential for replay attacks if idempotency checks are weak

**Business Impact:**
- Information disclosure of payment processing activity
- Potential compliance violations (PCI-DSS principle of least privilege)
- Reconnaissance data for targeted attacks

**Fix Applied:**
```sql
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to webhook events"
  ON webhook_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

**Tradeoffs:** None. Webhook events should only be accessed by backend services, never by client applications.

---

## High-Risk Findings (HIGH - WARN Level)

### 3. Function Search Path Mutable

**Vulnerability:** 47 functions were defined without an explicit `search_path`, making them vulnerable to search path hijacking attacks.

**Attack Vector:**
A privileged attacker (or compromised admin) with `CREATE` privileges could:
1. Create a malicious function or table in a schema that appears earlier in the search_path
2. When the legitimate function is called, it references the malicious object instead
3. Code executes in the context of the function owner (often `postgres` for SECURITY DEFINER functions)

**Affected Functions (47 total):**
- `update_trades_updated_at`
- `update_player_goalie_matchups_updated_at`
- `get_active_league_sponsors`
- `update_season_highlights_updated_at`
- `get_active_platform_sponsors`
- `update_sponsors_updated_at`
- `is_season_registration_open`
- `calculate_season_stats`
- `get_open_registration_seasons`
- `is_team_roster_full`
- `validate_season_registration_dates`
- `search_nearby_leagues`
- `search_leagues_by_keyword`
- `get_leagues_by_location`
- `handle_team_join_request_review`
- `auto_add_player_to_roster`
- `validate_team_join_request_league_id`
- `get_team_pending_requests`
- `get_player_request_status`
- `update_leagues_updated_at`
- `update_divisions_updated_at`
- `update_venues_updated_at`
- `get_user_league_ids`
- `is_league_owner`
- `is_league_admin`
- `update_league_scorekeepers_updated_at`
- `update_game_scorekeeper_assignments_updated_at`
- `is_league_scorekeeper`
- `get_scorekeeper_assigned_games`
- `get_league_teams`
- `get_league_seasons`
- `user_has_league_access`
- `get_user_league_role`
- `get_player_season_stats`
- `get_goalie_season_stats`
- `get_team_standings`
- `get_upcoming_games`
- `get_recent_games`
- `get_unpaid_fees`
- `get_scorekeeper_payments`
- `is_league_slug_available`
- `get_league_by_slug`
- `validate_game_stats_league_id`
- `set_player_approval_approved_by`
- `is_player_approved`
- `get_player_approval_status`
- `get_league_by_hostname`

**Business Impact:**
- Privilege escalation to database owner
- Arbitrary code execution in database context
- Complete database compromise in worst case

**Fix Applied:**
All functions recreated with `SET search_path = ''`:
```sql
CREATE OR REPLACE FUNCTION function_name(...)
RETURNS ... AS $$
  -- function body using fully-qualified table names (public.table_name)
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
```

**Tradeoffs:**
- **Code Verbosity:** Functions must use fully-qualified names (`public.table_name` instead of just `table_name`)
- **Maintenance:** Developers must remember to always qualify table names in new functions
- **No Performance Impact:** search_path resolution is negligible

---

### 4. Materialized Views Exposed via API

**Vulnerability:** Two materialized views were accessible via the PostgREST API, potentially exposing pre-aggregated statistical data.

**Affected Objects:**
- `public.player_season_stats_mv`
- `public.goalie_season_stats_mv`

**Exploit Narrative:**
1. Attacker discovers materialized view names (common naming patterns, error messages)
2. Queries `SELECT * FROM player_season_stats_mv` via API
3. Receives aggregated stats for ALL players across ALL leagues
4. Bypasses intended access controls on underlying tables

**Business Impact:**
- Cross-tenant data leakage (player statistics)
- Competitive intelligence exposure between leagues
- Privacy concerns for player statistical data

**Fix Applied:**
```sql
REVOKE ALL ON public.player_season_stats_mv FROM anon;
REVOKE ALL ON public.player_season_stats_mv FROM authenticated;
GRANT SELECT ON public.player_season_stats_mv TO service_role;
-- Same for goalie_season_stats_mv
```

**Tradeoffs:**
- **API Access Removed:** Client applications cannot directly query these views
- **Backend Required:** Stats must be fetched via server-side code using service_role
- **No Functionality Loss:** The dedicated RPC functions (`get_player_season_stats`, `get_goalie_season_stats`) provide the same data with proper access controls

---

## Medium-Risk Findings

### 5. Leaked Password Protection Disabled

**Vulnerability:** Supabase's leaked password protection feature is disabled in auth configuration.

**Risk:** Users can set passwords that have appeared in known data breaches, making credential stuffing attacks more likely to succeed.

**Fix:** This requires manual configuration in the Supabase Dashboard:
1. Navigate to Authentication > Settings
2. Enable "Leaked password protection"

**Tradeoffs:**
- **User Experience:** Some users may need to choose different passwords
- **External Dependency:** Requires API call to breach database on password set
- **Recommended:** The security benefit far outweighs the UX cost

---

## Recommended Additional Fixes

### Strategic Improvements (Not Implemented - Require Architecture Discussion)

1. **Audit Logging Enhancement:**
   - Add database-level audit logging for all SECURITY DEFINER function calls
   - Log failed RLS policy checks for security monitoring

2. **Service Role Token Rotation:**
   - Implement regular rotation of service_role JWT
   - Add IP allowlisting for service_role token usage

3. **Function Ownership Review:**
   - Audit which user owns SECURITY DEFINER functions
   - Consider creating a dedicated function owner role with minimal privileges

4. **Content Security Policy:**
   - Review `custom_css` column usage for XSS vectors
   - Implement CSP headers or CSS sanitization

---

## Open Questions & Assumptions

1. **Assumption:** The `player_stats` and `goalie_stats` tables exist and have appropriate RLS policies. Unable to verify from provided migrations.

2. **Assumption:** The `team_rosters` and `team_standings` tables have proper league_id foreign keys and RLS policies.

3. **Question:** Is there a reason some functions use SECURITY DEFINER vs SECURITY INVOKER? The current implementation uses DEFINER for most helper functions, which may be overly permissive.

4. **Question:** What is the intended access pattern for materialized views? If direct API access is needed, RLS should be implemented on the base tables, not the views.

---

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/20260127_security_hardening.sql` | New | Complete security fixes migration |
| `docs/SECURITY_HARDENING_20260127.md` | New | This documentation |

---

## Verification Steps

After applying the migration, verify fixes with these queries:

```sql
-- 1. Verify views use SECURITY INVOKER
SELECT viewname,
       pg_get_viewdef(viewname::regclass) as definition
FROM pg_views
WHERE viewname IN ('public_leagues', 'league_branding');

-- 2. Verify RLS on webhook_events
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'webhook_events';

-- 3. Count functions with search_path
SELECT proname, proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proconfig IS NOT NULL;

-- 4. Verify materialized view permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('player_season_stats_mv', 'goalie_season_stats_mv');
```

---

## Compliance Notes

These fixes address requirements from:
- **OWASP Top 10 2021:** A01 Broken Access Control, A04 Insecure Design
- **CWE-284:** Improper Access Control
- **CWE-426:** Untrusted Search Path
- **SOC 2:** CC6.1 (Logical Access), CC6.3 (Role-Based Access)

---

## Conclusion

All critical and high-priority security issues have been addressed. The migration should be applied to all environments (development, staging, production) and verified using the provided queries.

The leaked password protection setting must be enabled manually in the Supabase Dashboard as it cannot be configured via SQL migrations.
