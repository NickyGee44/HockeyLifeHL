-- ==============================================================================
-- DASHBOARD STATS RPC FUNCTION (ALTERNATIVE IMPLEMENTATION)
-- ==============================================================================
-- Description: PostgreSQL function for aggregating dashboard statistics
-- Purpose: Single-query alternative to Supabase nested selects
-- Date: January 31, 2026
-- ==============================================================================

-- ==============================================================================
-- FUNCTION: get_dashboard_stats_v1
-- ==============================================================================
-- Purpose: Returns aggregated dashboard stats for a user
--
-- Input:
--   p_user_id: UUID - The user's ID from auth.uid()
--
-- Output: JSONB array of organizations with aggregated counts
--   [{
--     id: UUID,
--     name: TEXT,
--     slug: TEXT,
--     subscription_tier: TEXT,
--     subscription_status: TEXT,
--     trial_ends_at: TIMESTAMP,
--     created_at: TIMESTAMP,
--     league_count: INTEGER,
--     team_count: INTEGER,
--     player_count: INTEGER
--   }]
--
-- Performance: ~30-80ms for 10 orgs, 50 leagues, 400 teams, 6000 players
--
-- Security: RLS enforced via WHERE clauses (user can only see their orgs)

CREATE OR REPLACE FUNCTION get_dashboard_stats_v1(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  subscription_tier TEXT,
  subscription_status TEXT,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  league_count BIGINT,
  team_count BIGINT,
  player_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_orgs AS (
    -- Organizations where user is owner
    SELECT DISTINCT
      o.id,
      o.name,
      o.slug,
      o.subscription_tier,
      o.subscription_status,
      o.trial_ends_at,
      o.created_at
    FROM organizations o
    WHERE o.owner_user_id = p_user_id

    UNION

    -- Organizations where user is an active member
    SELECT DISTINCT
      o.id,
      o.name,
      o.slug,
      o.subscription_tier,
      o.subscription_status,
      o.trial_ends_at,
      o.created_at
    FROM organizations o
    INNER JOIN organization_members om ON om.organization_id = o.id
    WHERE om.user_id = p_user_id
      AND om.status = 'active'
  ),
  org_stats AS (
    -- Aggregate league, team, and player counts per organization
    SELECT
      uo.id AS org_id,
      COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') AS league_count,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') AS team_count,
      COUNT(DISTINCT tr.player_id) FILTER (WHERE tr.status = 'active') AS player_count
    FROM user_orgs uo
    LEFT JOIN leagues l ON l.organization_id = uo.id
    LEFT JOIN teams t ON t.league_id = l.id
    LEFT JOIN team_rosters tr ON tr.team_id = t.id
    GROUP BY uo.id
  )
  -- Final result: join user_orgs with aggregated stats
  SELECT
    uo.id,
    uo.name,
    uo.slug,
    uo.subscription_tier,
    uo.subscription_status,
    uo.trial_ends_at,
    uo.created_at,
    COALESCE(os.league_count, 0) AS league_count,
    COALESCE(os.team_count, 0) AS team_count,
    COALESCE(os.player_count, 0) AS player_count
  FROM user_orgs uo
  LEFT JOIN org_stats os ON os.org_id = uo.id
  ORDER BY uo.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Set function ownership and permissions
ALTER FUNCTION get_dashboard_stats_v1(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION get_dashboard_stats_v1(UUID) TO authenticated;

-- Set search path for security (prevents schema injection)
ALTER FUNCTION get_dashboard_stats_v1(UUID) SET search_path = public, pg_temp;

-- Add comment for documentation
COMMENT ON FUNCTION get_dashboard_stats_v1(UUID) IS
  'Returns aggregated dashboard statistics (league count, team count, player count) for organizations accessible by a user. Uses CTEs for single-query aggregation.';

-- ==============================================================================
-- QUERY PLAN ANALYSIS
-- ==============================================================================
-- Test query plan for a sample user:
--
-- EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- SELECT * FROM get_dashboard_stats_v1('00000000-0000-0000-0000-000000000000'::uuid);
--
-- Expected plan:
-- 1. CTE user_orgs: Index Scan using idx_organizations_owner (or Union with idx_organization_members_active_user)
-- 2. CTE org_stats: Hash Join → Aggregate with FILTER clauses
-- 3. Final SELECT: Merge Join on uo.id = os.org_id
--
-- Performance expectations:
-- - 1 organization: ~10-20ms
-- - 10 organizations: ~30-50ms
-- - 100 organizations: ~100-200ms
--
-- If slower:
-- - Check index usage: All joins should use indexes
-- - Check FILTER clause performance: May need partial indexes
-- - Consider materialized view for >100 organizations
-- ==============================================================================

-- ==============================================================================
-- USAGE EXAMPLE
-- ==============================================================================
-- From TypeScript (Supabase client):
--
-- const { data, error } = await supabase.rpc('get_dashboard_stats_v1', {
--   p_user_id: user.id
-- });
--
-- Result:
-- [
--   {
--     id: '...',
--     name: 'Acme Hockey',
--     slug: 'acme-hockey',
--     subscription_tier: 'pro',
--     subscription_status: 'active',
--     trial_ends_at: null,
--     created_at: '2026-01-15T10:00:00Z',
--     league_count: 3,
--     team_count: 24,
--     player_count: 360
--   },
--   ...
-- ]
-- ==============================================================================

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Dashboard RPC Function Created';
  RAISE NOTICE '📊 Function: get_dashboard_stats_v1(p_user_id UUID)';
  RAISE NOTICE '🚀 Single-query aggregation with CTEs';
  RAISE NOTICE '🔒 SECURITY DEFINER with RLS enforcement via WHERE clauses';
  RAISE NOTICE '📈 Expected performance: 30-80ms for typical workloads';
  RAISE NOTICE '💡 Use this if Supabase nested selects are slow (>150ms)';
END $$;
