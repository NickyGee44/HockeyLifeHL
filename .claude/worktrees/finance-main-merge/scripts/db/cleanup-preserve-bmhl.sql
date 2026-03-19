-- One-time environment cleanup script
-- Purpose:
-- 1) Preserve BMHL data as the canonical production template league.
-- 2) Preserve HockeyLifeHL legacy path for future re-implementation.
-- 3) Remove non-kept league data across league-scoped tables.
-- 4) Ensure grossi16n@hotmail.com remains platform admin with owner access.
--
-- Run with service-role credentials in a controlled environment.
-- Review and take a database backup before executing.

BEGIN;

DO $$
DECLARE
  bmhl_league_id UUID;
  hockeylife_league_id UUID;
  admin_user_id UUID;
  keep_league_ids UUID[];
  table_row RECORD;
  delete_sql TEXT;
BEGIN
  -- Required keep league: BMHL
  SELECT id
  INTO bmhl_league_id
  FROM public.leagues
  WHERE lower(slug) = 'bmhl'
  LIMIT 1;

  IF bmhl_league_id IS NULL THEN
    RAISE EXCEPTION 'BMHL league not found (expected slug: bmhl). Aborting cleanup.';
  END IF;

  -- Optional keep league: HockeyLifeHL legacy lane
  SELECT id
  INTO hockeylife_league_id
  FROM public.leagues
  WHERE lower(slug) IN ('hockeylifehl', 'hockeylifehl-original', 'pilot')
  ORDER BY created_at ASC
  LIMIT 1;

  -- Required admin account
  SELECT id
  INTO admin_user_id
  FROM public.profiles
  WHERE lower(email) = 'grossi16n@hotmail.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile for grossi16n@hotmail.com not found. Aborting cleanup.';
  END IF;

  keep_league_ids := ARRAY[bmhl_league_id];
  IF hockeylife_league_id IS NOT NULL THEN
    keep_league_ids := keep_league_ids || hockeylife_league_id;
  END IF;

  -- Data repair: backfill BMHL game division_id where missing.
  -- This helps division filtering on league-sites when historical games were imported without game.division_id.
  UPDATE public.games g
  SET division_id = COALESCE(ht.division_id, at.division_id)
  FROM public.teams ht,
       public.teams at
  WHERE g.home_team_id = ht.id
    AND g.away_team_id = at.id
    AND g.league_id = bmhl_league_id
    AND g.division_id IS NULL
    AND (ht.division_id IS NOT NULL OR at.division_id IS NOT NULL)
    AND (ht.division_id IS NULL OR at.division_id IS NULL OR ht.division_id = at.division_id);

  -- Keep this user as platform admin.
  UPDATE public.profiles
  SET is_platform_admin = TRUE
  WHERE id = admin_user_id;

  -- Delete non-kept rows from every table that has league_id, except leagues itself.
  FOR table_row IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'league_id'
      AND c.table_name NOT IN ('leagues')
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name
  LOOP
    delete_sql := format(
      'DELETE FROM %I.%I WHERE league_id IS NOT NULL AND league_id <> ALL ($1)',
      table_row.table_schema,
      table_row.table_name
    );
    EXECUTE delete_sql USING keep_league_ids;
  END LOOP;

  -- Remove non-kept leagues.
  DELETE FROM public.leagues
  WHERE id <> ALL(keep_league_ids);

  -- Remove memberships outside kept leagues.
  DELETE FROM public.league_memberships
  WHERE league_id <> ALL(keep_league_ids);

  -- Ensure admin has owner access on every remaining active league.
  UPDATE public.league_memberships
  SET role = 'owner', status = 'active'
  WHERE user_id = admin_user_id
    AND league_id IN (SELECT id FROM public.leagues WHERE status = 'active');

  INSERT INTO public.league_memberships (league_id, user_id, role, status, joined_at)
  SELECT l.id, admin_user_id, 'owner', 'active', NOW()
  FROM public.leagues l
  WHERE l.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = l.id
        AND lm.user_id = admin_user_id
    );

  -- Clean up dangling organization records after league cleanup.
  DELETE FROM public.organization_members om
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = om.organization_id
  );

  DELETE FROM public.organizations o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.leagues l WHERE l.organization_id = o.id
  );

  RAISE NOTICE 'Cleanup complete. Kept league ids: %', keep_league_ids;
  RAISE NOTICE 'Platform admin ensured for: grossi16n@hotmail.com';
  RAISE NOTICE 'Legacy table public.legacy_players is preserved by design.';
END $$;

COMMIT;

-- Post-run sanity checks:
-- SELECT id, name, slug, status FROM public.leagues ORDER BY name;
-- SELECT email, is_platform_admin FROM public.profiles WHERE lower(email) = 'grossi16n@hotmail.com';
-- SELECT league_id, role, status FROM public.league_memberships lm
-- JOIN public.profiles p ON p.id = lm.user_id
-- WHERE lower(p.email) = 'grossi16n@hotmail.com'
-- ORDER BY league_id;
