-- ==============================================================================
-- MIGRATION 7 - ULTIMATE FIX - Handles ALL Duplicate Scenarios
-- ==============================================================================
-- This version handles:
-- 1. Multiple NULL records with the same name (rename all but one)
-- 2. NULL records conflicting with already-migrated records
-- ==============================================================================

SET search_path TO public;

-- ==============================================================================
-- STEP 1: Create League #1
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  league_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM leagues WHERE id = legacy_league_id) INTO league_exists;

  IF NOT league_exists THEN
    INSERT INTO leagues (
      id, name, slug, status, subscription_tier, subscription_status,
      contact_email, logo_url, primary_color, secondary_color, payment_mode,
      settings, created_at, updated_at
    ) VALUES (
      legacy_league_id,
      'HockeyLifeHL (Original)',
      'hockeylifehl-original',
      'active',
      'pro',
      'active',
      'admin@hockeylifehl.com',
      NULL,
      '#1E40AF',
      '#3B82F6',
      'manual',
      '{"statEntryMode": "captain", "allowPlayerRegistration": true, "requireApproval": true, "emailNotifications": true, "allowTrades": false, "scorekeeperPayRate": 25.00}'::jsonb,
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ Created League #1: HockeyLifeHL (Original)';
  ELSE
    RAISE NOTICE '✅ League #1 already exists (skipping)';
  END IF;
END $$;

-- ==============================================================================
-- STEP 2A: Handle Duplicates WITHIN NULL Seasons
-- (Multiple NULL records with same name)
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  season_name TEXT;
  season_record RECORD;
  keep_id UUID;
  suffix_num INTEGER;
  new_name TEXT;
  rename_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Step 2A: Handling duplicate names WITHIN NULL records...';

  -- For each name that appears multiple times in NULL records
  FOR season_name IN
    SELECT s.name
    FROM seasons s
    WHERE s.league_id IS NULL
    GROUP BY s.name
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the oldest one (first created), rename the rest
    SELECT id INTO keep_id
    FROM seasons
    WHERE name = season_name AND league_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    suffix_num := 2;

    -- Rename all other NULL records with this name
    FOR season_record IN
      SELECT id, name
      FROM seasons
      WHERE name = season_name
        AND league_id IS NULL
        AND id != keep_id
      ORDER BY created_at
    LOOP
      new_name := season_name || ' (Duplicate ' || suffix_num || ')';

      -- Make sure this new name doesn't already exist
      WHILE EXISTS (
        SELECT 1 FROM seasons
        WHERE name = new_name
      ) LOOP
        suffix_num := suffix_num + 1;
        new_name := season_name || ' (Duplicate ' || suffix_num || ')';
      END LOOP;

      UPDATE seasons SET name = new_name WHERE id = season_record.id;
      RAISE NOTICE '  ⚠️ Renamed NULL duplicate: "%" (id: %) → "%"', season_name, season_record.id, new_name;

      rename_count := rename_count + 1;
      suffix_num := suffix_num + 1;
    END LOOP;
  END LOOP;

  IF rename_count = 0 THEN
    RAISE NOTICE '  ✅ No duplicate names found within NULL records';
  ELSE
    RAISE NOTICE '  ✅ Renamed % duplicate NULL season records', rename_count;
  END IF;
END $$;

-- ==============================================================================
-- STEP 2B: Handle Conflicts Between NULL and Already-Migrated Seasons
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  season_record RECORD;
  new_name TEXT;
  suffix_num INTEGER;
  rename_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Step 2B: Handling conflicts with already-migrated seasons...';

  -- Find NULL records whose names conflict with already-migrated records
  FOR season_record IN
    SELECT s1.id, s1.name
    FROM seasons s1
    WHERE s1.league_id IS NULL
      AND EXISTS (
        SELECT 1 FROM seasons s2
        WHERE s2.name = s1.name
          AND s2.league_id = legacy_league_id
          AND s2.id != s1.id
      )
  LOOP
    suffix_num := 2;
    new_name := season_record.name || ' (2)';

    -- Find a unique name
    WHILE EXISTS (
      SELECT 1 FROM seasons
      WHERE name = new_name AND league_id = legacy_league_id
    ) OR EXISTS (
      SELECT 1 FROM seasons
      WHERE name = new_name AND league_id IS NULL
    ) LOOP
      suffix_num := suffix_num + 1;
      new_name := season_record.name || ' (' || suffix_num || ')';
    END LOOP;

    UPDATE seasons SET name = new_name WHERE id = season_record.id;
    RAISE NOTICE '  ⚠️ Renamed conflicting season: "%" (id: %) → "%"', season_record.name, season_record.id, new_name;
    rename_count := rename_count + 1;
  END LOOP;

  IF rename_count = 0 THEN
    RAISE NOTICE '  ✅ No conflicts with already-migrated seasons';
  ELSE
    RAISE NOTICE '  ✅ Renamed % conflicting season records', rename_count;
  END IF;
END $$;

-- ==============================================================================
-- STEP 3A: Handle Duplicates WITHIN NULL Teams
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  team_name TEXT;
  team_record RECORD;
  keep_id UUID;
  suffix_num INTEGER;
  new_name TEXT;
  rename_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Step 3A: Handling duplicate names WITHIN NULL teams...';

  FOR team_name IN
    SELECT t.name
    FROM teams t
    WHERE t.league_id IS NULL
    GROUP BY t.name
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM teams
    WHERE name = team_name AND league_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    suffix_num := 2;

    FOR team_record IN
      SELECT id, name
      FROM teams
      WHERE name = team_name
        AND league_id IS NULL
        AND id != keep_id
      ORDER BY created_at
    LOOP
      new_name := team_name || ' (Duplicate ' || suffix_num || ')';

      WHILE EXISTS (SELECT 1 FROM teams WHERE name = new_name) LOOP
        suffix_num := suffix_num + 1;
        new_name := team_name || ' (Duplicate ' || suffix_num || ')';
      END LOOP;

      UPDATE teams SET name = new_name WHERE id = team_record.id;
      RAISE NOTICE '  ⚠️ Renamed NULL duplicate: "%" (id: %) → "%"', team_name, team_record.id, new_name;

      rename_count := rename_count + 1;
      suffix_num := suffix_num + 1;
    END LOOP;
  END LOOP;

  IF rename_count = 0 THEN
    RAISE NOTICE '  ✅ No duplicate names found within NULL teams';
  ELSE
    RAISE NOTICE '  ✅ Renamed % duplicate NULL team records', rename_count;
  END IF;
END $$;

-- ==============================================================================
-- STEP 3B: Handle Conflicts Between NULL and Already-Migrated Teams
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  team_record RECORD;
  new_name TEXT;
  suffix_num INTEGER;
  rename_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Step 3B: Handling conflicts with already-migrated teams...';

  FOR team_record IN
    SELECT t1.id, t1.name
    FROM teams t1
    WHERE t1.league_id IS NULL
      AND EXISTS (
        SELECT 1 FROM teams t2
        WHERE t2.name = t1.name
          AND t2.league_id = legacy_league_id
          AND t2.id != t1.id
      )
  LOOP
    suffix_num := 2;
    new_name := team_record.name || ' (2)';

    WHILE EXISTS (
      SELECT 1 FROM teams
      WHERE name = new_name AND (league_id = legacy_league_id OR league_id IS NULL)
    ) LOOP
      suffix_num := suffix_num + 1;
      new_name := team_record.name || ' (' || suffix_num || ')';
    END LOOP;

    UPDATE teams SET name = new_name WHERE id = team_record.id;
    RAISE NOTICE '  ⚠️ Renamed conflicting team: "%" (id: %) → "%"', team_record.name, team_record.id, new_name;
    rename_count := rename_count + 1;
  END LOOP;

  IF rename_count = 0 THEN
    RAISE NOTICE '  ✅ No conflicts with already-migrated teams';
  ELSE
    RAISE NOTICE '  ✅ Renamed % conflicting team records', rename_count;
  END IF;
END $$;

-- ==============================================================================
-- STEP 4: Update league_id for All Tables
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  rows_updated INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📝 Step 4: Updating league_id for records with NULL league_id...';

  UPDATE teams SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % teams', rows_updated;

  UPDATE team_rosters SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % team_rosters', rows_updated;

  UPDATE seasons SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % seasons', rows_updated;

  UPDATE games SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % games', rows_updated;

  UPDATE player_stats SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % player_stats', rows_updated;

  UPDATE goalie_stats SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % goalie_stats', rows_updated;

  UPDATE drafts SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % drafts', rows_updated;

  UPDATE draft_picks SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % draft_picks', rows_updated;

  UPDATE draft_order SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % draft_order', rows_updated;

  UPDATE player_ratings SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % player_ratings', rows_updated;

  UPDATE payments SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % payments', rows_updated;

  UPDATE suspensions SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % suspensions', rows_updated;

  UPDATE articles SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % articles', rows_updated;

  UPDATE trades SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % trades', rows_updated;

  UPDATE trade_players SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % trade_players', rows_updated;

  UPDATE player_goalie_matchups SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % player_goalie_matchups', rows_updated;

  UPDATE season_highlights SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % season_highlights', rows_updated;

  UPDATE email_drafts SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % email_drafts', rows_updated;

  RAISE NOTICE '';
  RAISE NOTICE '✅ All league_id fields updated';
END $$;

-- ==============================================================================
-- STEP 5: Set league_id to NOT NULL
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Step 5: Setting league_id to NOT NULL...';

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE teams ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ teams.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ teams.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'team_rosters' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE team_rosters ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ team_rosters.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ team_rosters.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'seasons' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE seasons ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ seasons.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ seasons.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE games ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ games.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ games.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'player_stats' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE player_stats ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ player_stats.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ player_stats.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'goalie_stats' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE goalie_stats ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ goalie_stats.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ goalie_stats.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'drafts' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE drafts ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ drafts.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ drafts.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'draft_picks' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE draft_picks ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ draft_picks.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ draft_picks.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'draft_order' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE draft_order ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ draft_order.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ draft_order.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'player_ratings' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE player_ratings ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ player_ratings.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ player_ratings.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE payments ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ payments.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ payments.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'suspensions' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE suspensions ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ suspensions.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ suspensions.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE articles ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ articles.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ articles.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE trades ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ trades.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ trades.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'trade_players' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE trade_players ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ trade_players.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ trade_players.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'player_goalie_matchups' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE player_goalie_matchups ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ player_goalie_matchups.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ player_goalie_matchups.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'season_highlights' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE season_highlights ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ season_highlights.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ season_highlights.league_id already NOT NULL'; END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_name = 'email_drafts' AND column_name = 'league_id' AND is_nullable = 'NO';
  IF NOT FOUND THEN ALTER TABLE email_drafts ALTER COLUMN league_id SET NOT NULL; RAISE NOTICE '  ✅ email_drafts.league_id SET NOT NULL'; ELSE RAISE NOTICE '  ✅ email_drafts.league_id already NOT NULL'; END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ All league_id columns are now NOT NULL';
END $$;

-- ==============================================================================
-- STEP 6: Create Admin Memberships
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  admin_user_id UUID;
  membership_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '👤 Step 6: Creating admin memberships...';

  FOR admin_user_id IN SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_id = legacy_league_id AND user_id = admin_user_id
    ) THEN
      INSERT INTO league_memberships (league_id, user_id, role, status, joined_at)
      VALUES (legacy_league_id, admin_user_id, 'owner', 'active', NOW());
      membership_count := membership_count + 1;
    END IF;
  END LOOP;

  IF membership_count > 0 THEN
    RAISE NOTICE '  ✅ Created % admin memberships', membership_count;
  ELSE
    RAISE NOTICE '  ✅ Admin memberships already exist';
  END IF;
END $$;

-- ==============================================================================
-- FINAL SUMMARY
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ MIGRATION 7 COMPLETE (ULTIMATE FIX)';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run Migration 8: 20260125_create_league_helper_functions.sql';
  RAISE NOTICE '  2. Run verification: supabase/verification/00_quick_verification.sql';
  RAISE NOTICE '';
END $$;
