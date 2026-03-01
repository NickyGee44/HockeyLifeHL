-- ==============================================================================
-- DASHBOARD: ADD managed_leagues + FIX ORGANIZATION ACCESS
-- ==============================================================================
-- Problem: Platform admins / dev accounts were added to organization_members
-- rows for leagues they help manage but don't own. This caused their dashboard
-- to show those orgs' leagues as if they were their own, mixing ownership context.
--
-- Fix:
-- 1. Remove the dev account (nick@bridg3.io) from organization_members for
--    HockeyLifeHL Organization — he already has league_memberships owner access.
-- 2. Update get_user_dashboard_data to add a `managed_leagues` top-level key:
--    leagues where the user has an explicit league_memberships row (admin/owner)
--    but the league's org is NOT one of their own orgs.
-- ==============================================================================

-- Step 1: Data cleanup — remove dev account from HockeyLifeHL Organization's
-- organization_members. He retains access via league_memberships (role = owner).
DELETE FROM public.organization_members
WHERE user_id  = 'd850924d-887e-4ee5-8ede-4e95ac96fb7a'   -- nick@bridg3.io
  AND organization_id = '8175c890-c004-4286-afda-48172967cd9d'; -- HockeyLifeHL Org

-- Step 2: Update RPC function to include managed_leagues
CREATE OR REPLACE FUNCTION get_user_dashboard_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Security: Verify the user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN NULL;
  END IF;

  WITH user_organizations AS (
    -- Organizations where user is the owner
    SELECT
      o.id, o.name, o.slug,
      o.subscription_tier, o.subscription_status,
      o.trial_ends_at, o.created_at
    FROM public.organizations o
    WHERE o.owner_user_id = p_user_id

    UNION

    -- Organizations where user is an active member (not owner)
    SELECT
      o.id, o.name, o.slug,
      o.subscription_tier, o.subscription_status,
      o.trial_ends_at, o.created_at
    FROM public.organization_members om
    INNER JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = p_user_id
      AND om.status = 'active'
      AND o.owner_user_id != p_user_id
  ),

  org_leagues AS (
    -- All active leagues owned by user's orgs
    SELECT
      l.id, l.name, l.slug, l.status, l.created_at,
      l.organization_id, l.logo_url, l.primary_color
    FROM public.leagues l
    INNER JOIN user_organizations uo ON uo.id = l.organization_id
    WHERE l.status = 'active'
  ),

  -- NEW: leagues user is explicitly an admin/owner of via league_memberships
  -- but that league does NOT belong to one of their orgs (no duplicate)
  managed_league_rows AS (
    SELECT
      l.id, l.name, l.slug, l.status, l.created_at,
      l.organization_id, l.logo_url, l.primary_color,
      lm.role as member_role
    FROM public.league_memberships lm
    INNER JOIN public.leagues l ON l.id = lm.league_id
    WHERE lm.user_id = p_user_id
      AND lm.status = 'active'
      AND lm.role IN ('owner', 'admin', 'commissioner')
      AND l.status = 'active'
      AND l.organization_id NOT IN (SELECT id FROM user_organizations)
  ),

  league_teams AS (
    SELECT t.id, t.name, t.league_id
    FROM public.teams t
    INNER JOIN org_leagues ol ON ol.id = t.league_id
  ),

  managed_teams AS (
    SELECT t.id, t.name, t.league_id
    FROM public.teams t
    INNER JOIN managed_league_rows ml ON ml.id = t.league_id
  ),

  team_player_counts AS (
    SELECT lt.league_id, COUNT(DISTINCT tr.player_id) as player_count
    FROM league_teams lt
    LEFT JOIN public.team_rosters tr ON tr.team_id = lt.id
    GROUP BY lt.league_id
  ),

  managed_player_counts AS (
    SELECT mt.league_id, COUNT(DISTINCT tr.player_id) as player_count
    FROM managed_teams mt
    LEFT JOIN public.team_rosters tr ON tr.team_id = mt.id
    GROUP BY mt.league_id
  ),

  league_stats AS (
    SELECT
      ol.id, ol.name, ol.slug, ol.status, ol.created_at,
      ol.organization_id, ol.logo_url, ol.primary_color,
      COUNT(DISTINCT lt.id) as team_count,
      COALESCE(MAX(tpc.player_count), 0) as player_count
    FROM org_leagues ol
    LEFT JOIN league_teams lt ON lt.league_id = ol.id
    LEFT JOIN team_player_counts tpc ON tpc.league_id = ol.id
    GROUP BY ol.id, ol.name, ol.slug, ol.status, ol.created_at,
             ol.organization_id, ol.logo_url, ol.primary_color
  ),

  managed_stats AS (
    SELECT
      ml.id, ml.name, ml.slug, ml.status, ml.created_at,
      ml.organization_id, ml.logo_url, ml.primary_color, ml.member_role,
      COUNT(DISTINCT mt.id) as team_count,
      COALESCE(MAX(mpc.player_count), 0) as player_count
    FROM managed_league_rows ml
    LEFT JOIN managed_teams mt ON mt.league_id = ml.id
    LEFT JOIN managed_player_counts mpc ON mpc.league_id = ml.id
    GROUP BY ml.id, ml.name, ml.slug, ml.status, ml.created_at,
             ml.organization_id, ml.logo_url, ml.primary_color, ml.member_role
  ),

  org_with_leagues AS (
    SELECT
      uo.id, uo.name, uo.slug,
      uo.subscription_tier, uo.subscription_status,
      uo.trial_ends_at, uo.created_at,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', ls.id, 'name', ls.name, 'slug', ls.slug,
              'status', ls.status, 'created_at', ls.created_at,
              'team_count', ls.team_count, 'player_count', ls.player_count,
              'logo_url', ls.logo_url, 'primary_color', ls.primary_color
            )
            ORDER BY ls.created_at DESC
          )
          FROM league_stats ls
          WHERE ls.organization_id = uo.id
        ),
        '[]'::json
      ) as leagues,
      (SELECT COUNT(*)::INTEGER FROM league_stats ls WHERE ls.organization_id = uo.id) as league_count
    FROM user_organizations uo
    ORDER BY uo.created_at DESC
  ),

  totals AS (
    SELECT
      (SELECT COUNT(DISTINCT id)::INTEGER FROM user_organizations) AS total_organizations,
      (
        (SELECT COUNT(DISTINCT id) FROM league_stats) +
        (SELECT COUNT(DISTINCT id) FROM managed_stats)
      )::INTEGER AS total_leagues,
      (
        (SELECT COUNT(DISTINCT id) FROM league_teams) +
        (SELECT COUNT(DISTINCT id) FROM managed_teams)
      )::INTEGER AS total_teams,
      (
        SELECT COUNT(DISTINCT tr.player_id)
        FROM league_teams lt
        LEFT JOIN public.team_rosters tr ON tr.team_id = lt.id
      )::INTEGER AS total_players
  )

  SELECT json_build_object(
    'organizations', COALESCE((SELECT json_agg(row_to_json(owl.*)) FROM org_with_leagues owl), '[]'::json),
    'managed_leagues', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', ms.id, 'name', ms.name, 'slug', ms.slug,
            'status', ms.status, 'created_at', ms.created_at,
            'team_count', ms.team_count, 'player_count', ms.player_count,
            'logo_url', ms.logo_url, 'primary_color', ms.primary_color,
            'member_role', ms.member_role
          )
          ORDER BY ms.name
        )
        FROM managed_stats ms
      ),
      '[]'::json
    ),
    'totals', (
      SELECT json_build_object(
        'total_organizations', t.total_organizations,
        'total_leagues', t.total_leagues,
        'total_teams', t.total_teams,
        'total_players', t.total_players
      )
      FROM totals t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_dashboard_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_dashboard_data(UUID) TO service_role;

COMMENT ON FUNCTION get_user_dashboard_data(UUID) IS
  'Securely fetches dashboard data. Returns orgs (owned/member-of) + managed_leagues '
  '(leagues where user has league_memberships admin/owner but is not an org member). '
  'Updated 2026-03-01 to separate org-owned leagues from externally managed leagues.';

DO $$
BEGIN
  RAISE NOTICE '✅ dashboard RPC updated — managed_leagues path added';
  RAISE NOTICE '🧹 Removed dev account from HockeyLifeHL org_members (uses league_memberships instead)';
END $$;
