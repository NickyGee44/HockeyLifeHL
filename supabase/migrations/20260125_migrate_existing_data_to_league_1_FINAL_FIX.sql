-- ==============================================================================
-- Migration 7: Migrate Existing Data to League #1 - FINAL FIX
-- ==============================================================================
-- Purpose: Assign all existing data to League #1 (HockeyLifeHL Original)
-- Handles: Partial migrations, duplicate names, idempotency
-- Date: January 25, 2026
-- ==============================================================================

-- Set search path
SET search_path TO public;

-- ==============================================================================
-- STEP 1: Create League #1 (Idempotent)
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  league_exists BOOLEAN;
BEGIN
  -- Check if League #1 already exists
  SELECT EXISTS (
    SELECT 1 FROM leagues WHERE id = legacy_league_id
  ) INTO league_exists;

  IF NOT league_exists THEN
    -- Create League #1
    INSERT INTO leagues (
      id,
      name,
      slug,
      status,
      subscription_tier,
      league_type,
      contact_email,
      logo_url,
      primary_color,
      secondary_color,
      settings,
      created_at,
      updated_at
    ) VALUES (
      legacy_league_id,
      'HockeyLifeHL (Original)',
      'hockeylifehl-original',
      'active',
      'professional',
      'recreational',
      'admin@hockeylifehl.com',
      NULL,
      '#1E40AF',
      '#3B82F6',
      '{"statEntryMode": "captain", "allowSelfSignup": false, "scorekeeperPaymentEnabled": true}'::jsonb,
      NOW(),
      NOW()
    );

    RAISE NOTICE '✅ Created League #1: HockeyLifeHL (Original)';
  ELSE
    RAISE NOTICE '✅ League #1 already exists (skipping creation)';
  END IF;
END $$;

-- ==============================================================================
-- STEP 2: Handle Duplicate Names - Seasons
-- ==============================================================================
-- Find seasons with NULL league_id that have names conflicting with already-migrated seasons
-- Rename them before updating league_id
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  season_record RECORD;
  new_name TEXT;
  suffix_num INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Checking for duplicate season names...';

  -- Loop through seasons with NULL league_id
  FOR season_record IN
    SELECT s1.id, s1.name
    FROM seasons s1
    WHERE s1.league_id IS NULL
      AND EXISTS (
        -- Check if this name already exists with the target league_id
        SELECT 1 FROM seasons s2
        WHERE s2.name = s1.name
          AND s2.league_id = legacy_league_id
          AND s2.id != s1.id
      )
  LOOP
    -- Generate unique name by appending suffix
    suffix_num := 2;
    new_name := season_record.name || ' (' || suffix_num || ')';

    -- Keep incrementing suffix until we find a unique name
    WHILE EXISTS (
      SELECT 1 FROM seasons
      WHERE name = new_name AND league_id = legacy_league_id
    ) LOOP
      suffix_num := suffix_num + 1;
      new_name := season_record.name || ' (' || suffix_num || ')';
    END LOOP;

    -- Rename the duplicate
    UPDATE seasons
    SET name = new_name
    WHERE id = season_record.id;

    RAISE NOTICE '  ⚠️ Renamed duplicate season: "%" → "%"', season_record.name, new_name;
  END LOOP;

  RAISE NOTICE '✅ Duplicate season names handled';
END $$;

-- ==============================================================================
-- STEP 3: Handle Duplicate Names - Teams
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

    UPDATE teams
    SET name = new_name
    WHERE id = team_record.id;

    RAISE NOTICE '  ⚠️ Renamed duplicate team: "%" → "%"', team_record.name, new_name;
  END LOOP;

  RAISE NOTICE '✅ Duplicate team names handled';
END $$;

-- ==============================================================================
-- STEP 4: Update league_id for All Tables (Only NULL Records)
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  rows_updated INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📝 Updating league_id for records with NULL league_id...';

  -- Teams
  UPDATE teams SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % teams', rows_updated;

  -- Team Rosters
  UPDATE team_rosters SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % team_rosters', rows_updated;

  -- Seasons
  UPDATE seasons SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % seasons', rows_updated;

  -- Games
  UPDATE games SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % games', rows_updated;

  -- Player Stats
  UPDATE player_stats SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % player_stats', rows_updated;

  -- Goalie Stats
  UPDATE goalie_stats SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % goalie_stats', rows_updated;

  -- Drafts
  UPDATE drafts SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % drafts', rows_updated;

  -- Draft Picks
  UPDATE draft_picks SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % draft_picks', rows_updated;

  -- Draft Order
  UPDATE draft_order SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % draft_order', rows_updated;

  -- Player Ratings
  UPDATE player_ratings SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % player_ratings', rows_updated;

  -- Payments
  UPDATE payments SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % payments', rows_updated;

  -- Suspensions
  UPDATE suspensions SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % suspensions', rows_updated;

  -- Articles
  UPDATE articles SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % articles', rows_updated;

  -- Trades
  UPDATE trades SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % trades', rows_updated;

  -- Trade Players
  UPDATE trade_players SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % trade_players', rows_updated;

  -- Player Goalie Matchups
  UPDATE player_goalie_matchups SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % player_goalie_matchups', rows_updated;

  -- Season Highlights
  UPDATE season_highlights SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % season_highlights', rows_updated;

  -- Email Drafts
  UPDATE email_drafts SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✅ Updated % email_drafts', rows_updated;

  RAISE NOTICE '';
  RAISE NOTICE '✅ All league_id fields updated for NULL records';
END $$;

-- ==============================================================================
-- STEP 5: Set league_id to NOT NULL (Idempotent)
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Setting league_id to NOT NULL on all tables...';

  -- Teams
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE teams ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ teams.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ teams.league_id already NOT NULL (skipping)';
  END IF;

  -- Team Rosters
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_rosters' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE team_rosters ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ team_rosters.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ team_rosters.league_id already NOT NULL (skipping)';
  END IF;

  -- Seasons
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE seasons ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ seasons.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ seasons.league_id already NOT NULL (skipping)';
  END IF;

  -- Games
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE games ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ games.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ games.league_id already NOT NULL (skipping)';
  END IF;

  -- Player Stats
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_stats' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE player_stats ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ player_stats.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ player_stats.league_id already NOT NULL (skipping)';
  END IF;

  -- Goalie Stats
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goalie_stats' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE goalie_stats ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ goalie_stats.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ goalie_stats.league_id already NOT NULL (skipping)';
  END IF;

  -- Drafts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drafts' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE drafts ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ drafts.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ drafts.league_id already NOT NULL (skipping)';
  END IF;

  -- Draft Picks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_picks' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE draft_picks ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ draft_picks.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ draft_picks.league_id already NOT NULL (skipping)';
  END IF;

  -- Draft Order
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_order' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE draft_order ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ draft_order.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ draft_order.league_id already NOT NULL (skipping)';
  END IF;

  -- Player Ratings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_ratings' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE player_ratings ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ player_ratings.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ player_ratings.league_id already NOT NULL (skipping)';
  END IF;

  -- Payments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE payments ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ payments.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ payments.league_id already NOT NULL (skipping)';
  END IF;

  -- Suspensions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suspensions' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE suspensions ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ suspensions.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ suspensions.league_id already NOT NULL (skipping)';
  END IF;

  -- Articles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE articles ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ articles.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ articles.league_id already NOT NULL (skipping)';
  END IF;

  -- Trades
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE trades ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ trades.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ trades.league_id already NOT NULL (skipping)';
  END IF;

  -- Trade Players
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trade_players' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE trade_players ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ trade_players.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ trade_players.league_id already NOT NULL (skipping)';
  END IF;

  -- Player Goalie Matchups
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_goalie_matchups' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE player_goalie_matchups ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ player_goalie_matchups.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ player_goalie_matchups.league_id already NOT NULL (skipping)';
  END IF;

  -- Season Highlights
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'season_highlights' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE season_highlights ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ season_highlights.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ season_highlights.league_id already NOT NULL (skipping)';
  END IF;

  -- Email Drafts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_drafts' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE email_drafts ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '  ✅ email_drafts.league_id SET NOT NULL';
  ELSE
    RAISE NOTICE '  ✅ email_drafts.league_id already NOT NULL (skipping)';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ All league_id columns are now NOT NULL';
END $$;

-- ==============================================================================
-- STEP 6: Create Admin Memberships (Idempotent)
-- ==============================================================================
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  admin_user_id UUID;
  membership_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '👤 Creating admin memberships for League #1...';

  -- Get all admin users from profiles table
  FOR admin_user_id IN
    SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    -- Only insert if membership doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_id = legacy_league_id
        AND user_id = admin_user_id
    ) THEN
      INSERT INTO league_memberships (
        league_id,
        user_id,
        role,
        status,
        joined_at
      ) VALUES (
        legacy_league_id,
        admin_user_id,
        'owner',
        'active',
        NOW()
      );
      membership_count := membership_count + 1;
    END IF;
  END LOOP;

  IF membership_count > 0 THEN
    RAISE NOTICE '✅ Created % admin memberships for League #1', membership_count;
  ELSE
    RAISE NOTICE '✅ Admin memberships already exist (skipping)';
  END IF;
END $$;

-- ==============================================================================
-- FINAL SUMMARY
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ MIGRATION 7 COMPLETE (FINAL FIX)';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All existing data has been migrated to League #1';
  RAISE NOTICE 'Duplicate names were automatically renamed';
  RAISE NOTICE 'All league_id columns are now NOT NULL';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Step: Run Migration 8 (Helper Functions)';
  RAISE NOTICE 'File: 20260125_create_league_helper_functions.sql';
  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- END OF MIGRATION 7 (FINAL FIX)
-- ==============================================================================
