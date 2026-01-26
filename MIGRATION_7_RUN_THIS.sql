-- ==============================================================================
-- MIGRATION 7 - FINAL VERSION - COPY AND RUN THIS IN SUPABASE SQL EDITOR
-- ==============================================================================
-- Instructions:
-- 1. Select ALL text in this file (Ctrl+A)
-- 2. Copy (Ctrl+C)
-- 3. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new
-- 4. Paste (Ctrl+V)
-- 5. Click "Run" or press Ctrl+Enter
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
-- STEP 2: Handle Duplicate Season Names
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  season_record RECORD;
  new_name TEXT;
  suffix_num INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Checking for duplicate season names...';

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
    new_name := season_record.name || ' (' || suffix_num || ')';

    WHILE EXISTS (
      SELECT 1 FROM seasons
      WHERE name = new_name AND league_id = legacy_league_id
    ) LOOP
      suffix_num := suffix_num + 1;
      new_name := season_record.name || ' (' || suffix_num || ')';
    END LOOP;

    UPDATE seasons SET name = new_name WHERE id = season_record.id;
    RAISE NOTICE '  ⚠️ Renamed duplicate season: "%" → "%"', season_record.name, new_name;
  END LOOP;

  RAISE NOTICE '✅ Duplicate season names handled';
END $$;

-- ==============================================================================
-- STEP 3: Handle Duplicate Team Names
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  team_record RECORD;
  new_name TEXT;
  suffix_num INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Checking for duplicate team names...';

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
    new_name := team_record.name || ' (' || suffix_num || ')';

    WHILE EXISTS (
      SELECT 1 FROM teams
      WHERE name = new_name AND league_id = legacy_league_id
    ) LOOP
      suffix_num := suffix_num + 1;
      new_name := team_record.name || ' (' || suffix_num || ')';
    END LOOP;

    UPDATE teams SET name = new_name WHERE id = team_record.id;
    RAISE NOTICE '  ⚠️ Renamed duplicate team: "%" → "%"', team_record.name, new_name;
  END LOOP;

  RAISE NOTICE '✅ Duplicate team names handled';
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
  RAISE NOTICE '📝 Updating league_id for records with NULL league_id...';

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
-- STEP 5: Set league_id to NOT NULL (Idempotent)
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Setting league_id to NOT NULL...';

  -- Only add NOT NULL if it's not already set
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
  RAISE NOTICE '👤 Creating admin memberships...';

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
    RAISE NOTICE '✅ Created % admin memberships', membership_count;
  ELSE
    RAISE NOTICE '✅ Admin memberships already exist';
  END IF;
END $$;

-- ==============================================================================
-- FINAL SUMMARY
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ MIGRATION 7 COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run Migration 8: 20260125_create_league_helper_functions.sql';
  RAISE NOTICE '  2. Run verification: supabase/verification/00_quick_verification.sql';
  RAISE NOTICE '';
END $$;
