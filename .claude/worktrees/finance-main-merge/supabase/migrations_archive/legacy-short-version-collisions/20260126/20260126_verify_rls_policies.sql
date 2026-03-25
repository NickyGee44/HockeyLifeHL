-- ==============================================================================
-- VERIFY RLS POLICIES ON ALL LEAGUE-SCOPED TABLES
-- ==============================================================================
-- Purpose: Audit all tables with league_id to ensure RLS is enabled
-- Agent: Agent 1 - Database Schema & Multi-Tenancy
-- Date: January 26, 2026
-- ==============================================================================

-- ==============================================================================
-- QUERY 1: Find all tables with league_id column
-- ==============================================================================

DO $$
DECLARE
  table_rec RECORD;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  total_tables INTEGER := 0;
  tables_with_rls INTEGER := 0;
  tables_without_rls INTEGER := 0;
  tables_without_policies INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS POLICY VERIFICATION REPORT';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Checking all tables with league_id column...';
  RAISE NOTICE '';

  -- Loop through all tables that have a league_id column
  FOR table_rec IN
    SELECT
      t.table_schema,
      t.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON c.table_schema = t.table_schema
      AND c.table_name = t.table_name
    WHERE c.column_name = 'league_id'
      AND t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    total_tables := total_tables + 1;

    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_rec.table_name
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    -- Count policies on this table
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = table_rec.table_name;

    -- Report findings
    IF rls_enabled THEN
      tables_with_rls := tables_with_rls + 1;
      IF policy_count > 0 THEN
        RAISE NOTICE '✅ % - RLS enabled with % policies', table_rec.table_name, policy_count;
      ELSE
        tables_without_policies := tables_without_policies + 1;
        RAISE WARNING '⚠️  % - RLS enabled but NO policies defined!', table_rec.table_name;
      END IF;
    ELSE
      tables_without_rls := tables_without_rls + 1;
      RAISE WARNING '❌ % - RLS NOT enabled (SECURITY RISK!)', table_rec.table_name;
    END IF;
  END LOOP;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total tables with league_id: %', total_tables;
  RAISE NOTICE 'Tables with RLS enabled: %', tables_with_rls;
  RAISE NOTICE 'Tables WITHOUT RLS: %', tables_without_rls;
  RAISE NOTICE 'Tables with RLS but no policies: %', tables_without_policies;
  RAISE NOTICE '';

  IF tables_without_rls > 0 THEN
    RAISE WARNING '⚠️  ACTION REQUIRED: % tables do not have RLS enabled!', tables_without_rls;
  END IF;

  IF tables_without_policies > 0 THEN
    RAISE WARNING '⚠️  ACTION REQUIRED: % tables have RLS enabled but no policies!', tables_without_policies;
  END IF;

  IF tables_without_rls = 0 AND tables_without_policies = 0 THEN
    RAISE NOTICE '✅ All league-scoped tables are properly secured with RLS!';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- QUERY 2: List all RLS policies by table
-- ==============================================================================

DO $$
DECLARE
  policy_rec RECORD;
  current_table TEXT := '';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS POLICIES BY TABLE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Loop through all policies on tables with league_id
  FOR policy_rec IN
    SELECT
      p.tablename,
      p.policyname,
      p.permissive,
      p.roles,
      p.cmd,
      p.qual,
      p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename IN (
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        WHERE c.column_name = 'league_id'
          AND c.table_schema = 'public'
      )
    ORDER BY p.tablename, p.policyname
  LOOP
    -- Print table header when we encounter a new table
    IF current_table != policy_rec.tablename THEN
      current_table := policy_rec.tablename;
      RAISE NOTICE '';
      RAISE NOTICE '📋 Table: %', current_table;
      RAISE NOTICE '  Policies:';
    END IF;

    -- Print policy details
    RAISE NOTICE '    • % (%) - Roles: %',
      policy_rec.policyname,
      policy_rec.cmd,
      array_to_string(policy_rec.roles, ', ');
  END LOOP;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- QUERY 3: Find tables without league_id that might need it
-- ==============================================================================

DO $$
DECLARE
  table_rec RECORD;
  suspicious_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TABLES WITHOUT league_id (Potential Issues)';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'These tables might need league_id for multi-tenancy:';
  RAISE NOTICE '';

  -- Look for tables that don't have league_id but have relationships to league-scoped tables
  FOR table_rec IN
    SELECT DISTINCT
      t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = t.table_name
          AND c.column_name = 'league_id'
      )
      -- Exclude known platform-level tables
      AND t.table_name NOT IN (
        'profiles',
        'leagues',
        'league_memberships',
        'migrations',
        'schema_migrations'
      )
      -- Look for tables that reference league-scoped tables
      AND EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = t.table_name
          AND tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name IN (
            SELECT DISTINCT c.table_name
            FROM information_schema.columns c
            WHERE c.column_name = 'league_id'
              AND c.table_schema = 'public'
          )
      )
    ORDER BY t.table_name
  LOOP
    suspicious_count := suspicious_count + 1;
    RAISE NOTICE '⚠️  %', table_rec.table_name;
  END LOOP;

  IF suspicious_count = 0 THEN
    RAISE NOTICE '✅ No suspicious tables found - multi-tenancy appears complete!';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'Found % tables that might need league_id column', suspicious_count;
  END IF;

  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- QUERY 4: Verify core league-scoped tables have proper RLS
-- ==============================================================================

DO $$
DECLARE
  core_tables TEXT[] := ARRAY[
    'teams',
    'seasons',
    'games',
    'player_stats',
    'goalie_stats',
    'game_stats',
    'articles',
    'drafts',
    'draft_picks',
    'payments',
    'divisions',
    'venues',
    'team_rosters',
    'suspensions',
    'trades',
    'player_goalie_matchups',
    'game_scorekeeper_assignments',
    'league_scorekeepers'
  ];
  table_name TEXT;
  rls_enabled BOOLEAN;
  has_league_id BOOLEAN;
  policy_count INTEGER;
  issues_found INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'CORE TABLE VERIFICATION';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Checking critical league-scoped tables:';
  RAISE NOTICE '';

  FOREACH table_name IN ARRAY core_tables
  LOOP
    -- Check if table exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND information_schema.tables.table_name = table_name
    ) THEN
      RAISE NOTICE '⚠️  % - Table does not exist', table_name;
      issues_found := issues_found + 1;
      CONTINUE;
    END IF;

    -- Check if it has league_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND information_schema.columns.table_name = table_name
        AND column_name = 'league_id'
    ) INTO has_league_id;

    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_name
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = table_name;

    -- Report
    IF NOT has_league_id THEN
      RAISE WARNING '❌ % - Missing league_id column!', table_name;
      issues_found := issues_found + 1;
    ELSIF NOT rls_enabled THEN
      RAISE WARNING '❌ % - RLS not enabled!', table_name;
      issues_found := issues_found + 1;
    ELSIF policy_count = 0 THEN
      RAISE WARNING '⚠️  % - RLS enabled but no policies!', table_name;
      issues_found := issues_found + 1;
    ELSE
      RAISE NOTICE '✅ % - Properly secured (% policies)', table_name, policy_count;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  IF issues_found = 0 THEN
    RAISE NOTICE '✅ All core tables are properly secured!';
  ELSE
    RAISE WARNING '⚠️  Found % issues in core tables', issues_found;
  END IF;
  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ RLS VERIFICATION COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the output above for any security issues.';
  RAISE NOTICE 'Tables without RLS or policies need immediate attention!';
  RAISE NOTICE '';
END $$;
