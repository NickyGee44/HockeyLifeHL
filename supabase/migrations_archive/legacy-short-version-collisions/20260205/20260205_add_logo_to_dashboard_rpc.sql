-- ==============================================================================
-- ADD LOGO AND BRANDING TO DASHBOARD RPC
-- ==============================================================================
-- Description: Add logo_url and primary_color to dashboard league data
-- Purpose: Enable logo display in league listings and dashboard
-- Date: February 5, 2026
-- ==============================================================================

-- Update the RPC function to include logo_url and primary_color
CREATE OR REPLACE FUNCTION get_user_dashboard_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSON;
  v_total_organizations INTEGER;
  v_total_leagues INTEGER;
  v_total_teams INTEGER;
  v_total_players INTEGER;
BEGIN
  -- Security: Verify the user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN NULL;
  END IF;

  -- Build dashboard data with proper authorization
  WITH user_organizations AS (
    -- Organizations where user is the owner
    SELECT
      o.id,
      o.name,
      o.slug,
      o.subscription_tier,
      o.subscription_status,
      o.trial_ends_at,
      o.created_at
    FROM public.organizations o
    WHERE o.owner_user_id = p_user_id

    UNION

    -- Organizations where user is an active member (not owner)
    SELECT
      o.id,
      o.name,
      o.slug,
      o.subscription_tier,
      o.subscription_status,
      o.trial_ends_at,
      o.created_at
    FROM public.organization_members om
    INNER JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = p_user_id
      AND om.status = 'active'
      AND o.owner_user_id != p_user_id
  ),

  org_leagues AS (
    -- Get all active leagues for user's organizations
    -- Include logo_url and primary_color for branding
    SELECT
      l.id,
      l.name,
      l.slug,
      l.status,
      l.created_at,
      l.organization_id,
      l.logo_url,
      l.primary_color
    FROM public.leagues l
    INNER JOIN user_organizations uo ON uo.id = l.organization_id
    WHERE l.status = 'active'
  ),

  league_teams AS (
    -- Get all teams for the user's leagues
    SELECT
      t.id,
      t.name,
      t.league_id
    FROM public.teams t
    INNER JOIN org_leagues ol ON ol.id = t.league_id
  ),

  team_player_counts AS (
    -- Count unique active players per team
    SELECT
      lt.league_id,
      COUNT(DISTINCT tr.player_id) as player_count
    FROM league_teams lt
    LEFT JOIN public.team_rosters tr ON tr.team_id = lt.id
    GROUP BY lt.league_id
  ),

  league_stats AS (
    -- Aggregate team and player counts per league
    -- Include logo_url and primary_color
    SELECT
      ol.id,
      ol.name,
      ol.slug,
      ol.status,
      ol.created_at,
      ol.organization_id,
      ol.logo_url,
      ol.primary_color,
      COUNT(DISTINCT lt.id) as team_count,
      COALESCE(MAX(tpc.player_count), 0) as player_count
    FROM org_leagues ol
    LEFT JOIN league_teams lt ON lt.league_id = ol.id
    LEFT JOIN team_player_counts tpc ON tpc.league_id = ol.id
    GROUP BY ol.id, ol.name, ol.slug, ol.status, ol.created_at, ol.organization_id, ol.logo_url, ol.primary_color
  ),

  org_with_leagues AS (
    -- Combine organizations with their league data
    -- Include logo_url and primary_color in JSON
    SELECT
      uo.id,
      uo.name,
      uo.slug,
      uo.subscription_tier,
      uo.subscription_status,
      uo.trial_ends_at,
      uo.created_at,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', ls.id,
              'name', ls.name,
              'slug', ls.slug,
              'status', ls.status,
              'created_at', ls.created_at,
              'team_count', ls.team_count,
              'player_count', ls.player_count,
              'logo_url', ls.logo_url,
              'primary_color', ls.primary_color
            )
            ORDER BY ls.created_at DESC
          )
          FROM league_stats ls
          WHERE ls.organization_id = uo.id
        ),
        '[]'::json
      ) as leagues,
      (
        SELECT COUNT(*)::INTEGER
        FROM league_stats ls
        WHERE ls.organization_id = uo.id
      ) as league_count
    FROM user_organizations uo
    ORDER BY uo.created_at DESC
  ),

  totals AS (
    -- Calculate overall totals
    SELECT
      COUNT(DISTINCT uo.id)::INTEGER as total_organizations,
      COUNT(DISTINCT ls.id)::INTEGER as total_leagues,
      COUNT(DISTINCT lt.id)::INTEGER as total_teams,
      COUNT(DISTINCT tr.player_id)::INTEGER as total_players
    FROM user_organizations uo
    LEFT JOIN league_stats ls ON ls.organization_id = uo.id
    LEFT JOIN league_teams lt ON lt.league_id = ls.id
    LEFT JOIN public.team_rosters tr ON tr.team_id = lt.id
  )

  SELECT json_build_object(
    'organizations', COALESCE((SELECT json_agg(row_to_json(owl.*)) FROM org_with_leagues owl), '[]'::json),
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

-- Update comment
COMMENT ON FUNCTION get_user_dashboard_data(UUID) IS
  'Securely fetches dashboard data for a user with proper authorization checks. ' ||
  'Uses SECURITY DEFINER with explicit permission validation. ' ||
  'Returns JSON with organizations, leagues (including logo_url, primary_color), teams, and player counts. ' ||
  'Updated Feb 5, 2026 to include branding data.';

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Dashboard RPC updated to include logo_url and primary_color';
END $$;
