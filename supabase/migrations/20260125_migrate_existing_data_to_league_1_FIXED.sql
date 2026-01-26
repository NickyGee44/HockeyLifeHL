-- ==============================================================================
-- DATA MIGRATION: Migrate Existing HockeyLifeHL Data to League #1 (FIXED)
-- ==============================================================================
-- Description: Creates League #1 and assigns all existing data to it
-- Priority: CRITICAL - Must run AFTER all league_id columns are added
-- Author: Agent 1 - Database & Infrastructure
-- Date: January 25, 2026
-- FIXED: Handles partial migrations - only updates NULL league_id values
-- ==============================================================================

-- ==============================================================================
-- STEP 1: Create League #1 (HockeyLifeHL Original)
-- ==============================================================================

DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID; -- Consistent UUID for League #1
  league_exists BOOLEAN;
BEGIN
  -- Check if League #1 already exists
  SELECT EXISTS (
    SELECT 1 FROM leagues WHERE id = legacy_league_id
  ) INTO league_exists;

  -- Only create if it doesn't exist
  IF NOT league_exists THEN
    INSERT INTO leagues (
      id,
      name,
      slug,
      description,
      subscription_tier,
      subscription_status,
      status,
      settings,
      created_at
    ) VALUES (
      legacy_league_id,
      'HockeyLifeHL (Original)',
      'hockeylifehl-original',
      'The original HockeyLifeHL league migrated to multi-tenant platform',
      'pro', -- Give them pro tier for being the first league
      'active',
      'active',
      '{
        "statEntryMode": "captain",
        "allowPlayerRegistration": true,
        "requireApproval": true,
        "emailNotifications": true,
        "allowTrades": false,
        "scorekeeperPayRate": 25.00
      }'::jsonb,
      NOW()
    );

    RAISE NOTICE '✅ Created League #1: HockeyLifeHL (Original)';
  ELSE
    RAISE NOTICE '✅ League #1 already exists, skipping creation';
  END IF;
END $$;

-- ==============================================================================
-- STEP 2: Update all existing records to belong to League #1
-- ==============================================================================
-- FIXED: Only update records where league_id IS NULL
-- This prevents duplicate key violations if migration was partially run before
-- ==============================================================================

DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
  updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting data migration to League #1...';
  RAISE NOTICE 'Only updating records with NULL league_id...';

  -- Core tables (highest priority)
  UPDATE teams SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % teams (skipped records already in League #1)', updated_count;

  UPDATE seasons SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % seasons (skipped records already in League #1)', updated_count;

  UPDATE team_rosters SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % team_rosters (skipped records already in League #1)', updated_count;

  -- Games and stats tables
  UPDATE games SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % games (skipped records already in League #1)', updated_count;

  UPDATE player_stats SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % player_stats (skipped records already in League #1)', updated_count;

  UPDATE goalie_stats SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % goalie_stats (skipped records already in League #1)', updated_count;

  -- Draft and payment tables
  UPDATE drafts SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % drafts (skipped records already in League #1)', updated_count;

  UPDATE draft_picks SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % draft_picks (skipped records already in League #1)', updated_count;

  UPDATE draft_order SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % draft_order (skipped records already in League #1)', updated_count;

  UPDATE player_ratings SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % player_ratings (skipped records already in League #1)', updated_count;

  UPDATE payments SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % payments (skipped records already in League #1)', updated_count;

  UPDATE suspensions SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % suspensions (skipped records already in League #1)', updated_count;

  -- Feature tables
  UPDATE articles SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % articles (skipped records already in League #1)', updated_count;

  UPDATE trades SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % trades (skipped records already in League #1)', updated_count;

  UPDATE trade_players SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % trade_players (skipped records already in League #1)', updated_count;

  UPDATE player_goalie_matchups SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % player_goalie_matchups (skipped records already in League #1)', updated_count;

  UPDATE season_highlights SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % season_highlights (skipped records already in League #1)', updated_count;

  UPDATE email_drafts SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % email_drafts (skipped records already in League #1)', updated_count;

  RAISE NOTICE '✅ Data migration complete!';
END $$;

-- ==============================================================================
-- STEP 3: Add NOT NULL constraints (now that all data has league_id)
-- ==============================================================================

-- Core tables
DO $$
BEGIN
  -- Only add constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE teams ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set teams.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ teams.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE seasons ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set seasons.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ seasons.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_rosters' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE team_rosters ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set team_rosters.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ team_rosters.league_id already NOT NULL';
  END IF;
END $$;

-- Games and stats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE games ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set games.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ games.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_stats' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE player_stats ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set player_stats.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ player_stats.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goalie_stats' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE goalie_stats ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set goalie_stats.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ goalie_stats.league_id already NOT NULL';
  END IF;
END $$;

-- Draft and payment tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drafts' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE drafts ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set drafts.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ drafts.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_picks' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE draft_picks ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set draft_picks.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ draft_picks.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_order' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE draft_order ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set draft_order.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ draft_order.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_ratings' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE player_ratings ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set player_ratings.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ player_ratings.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE payments ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set payments.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ payments.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suspensions' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE suspensions ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set suspensions.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ suspensions.league_id already NOT NULL';
  END IF;
END $$;

-- Feature tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE articles ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set articles.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ articles.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE trades ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set trades.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ trades.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trade_players' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE trade_players ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set trade_players.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ trade_players.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_goalie_matchups' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE player_goalie_matchups ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set player_goalie_matchups.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ player_goalie_matchups.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'season_highlights' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE season_highlights ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set season_highlights.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ season_highlights.league_id already NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_drafts' AND column_name = 'league_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE email_drafts ALTER COLUMN league_id SET NOT NULL;
    RAISE NOTICE '✅ Set email_drafts.league_id to NOT NULL';
  ELSE
    RAISE NOTICE '✅ email_drafts.league_id already NOT NULL';
  END IF;
END $$;

-- ==============================================================================
-- STEP 4: Create league memberships for existing admins
-- ==============================================================================

DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
  admin_user_id UUID;
  membership_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'Creating league memberships for existing admins...';

  -- Find all users with 'admin' role in profiles table
  FOR admin_user_id IN
    SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    -- Check if membership already exists
    SELECT EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_id = legacy_league_id AND user_id = admin_user_id
    ) INTO membership_exists;

    -- Only create if it doesn't exist
    IF NOT membership_exists THEN
      INSERT INTO league_memberships (
        league_id,
        user_id,
        role,
        status,
        joined_at
      ) VALUES (
        legacy_league_id,
        admin_user_id,
        'owner', -- Make existing admins owners of League #1
        'active',
        NOW()
      );

      RAISE NOTICE '✅ Created league membership for admin: %', admin_user_id;
    ELSE
      RAISE NOTICE '✅ Membership already exists for admin: %', admin_user_id;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ League memberships created!';
END $$;

-- ==============================================================================
-- STEP 5: Verification Queries
-- ==============================================================================

-- Verify League #1 was created
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
  league_name TEXT;
BEGIN
  SELECT name INTO league_name FROM leagues WHERE id = legacy_league_id;
  RAISE NOTICE '✅ Verified League #1: %', league_name;
END $$;

-- Count records migrated to League #1
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
  record_count INTEGER;
BEGIN
  RAISE NOTICE 'Record counts for League #1:';

  SELECT COUNT(*) INTO record_count FROM teams WHERE league_id = legacy_league_id;
  RAISE NOTICE '  ✅ Teams: %', record_count;

  SELECT COUNT(*) INTO record_count FROM seasons WHERE league_id = legacy_league_id;
  RAISE NOTICE '  ✅ Seasons: %', record_count;

  SELECT COUNT(*) INTO record_count FROM games WHERE league_id = legacy_league_id;
  RAISE NOTICE '  ✅ Games: %', record_count;

  SELECT COUNT(*) INTO record_count FROM player_stats WHERE league_id = legacy_league_id;
  RAISE NOTICE '  ✅ Player Stats: %', record_count;

  SELECT COUNT(*) INTO record_count FROM goalie_stats WHERE league_id = legacy_league_id;
  RAISE NOTICE '  ✅ Goalie Stats: %', record_count;

  SELECT COUNT(*) INTO record_count FROM league_memberships WHERE league_id = legacy_league_id;
  RAISE NOTICE '  ✅ League Memberships: %', record_count;
END $$;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- All existing HockeyLifeHL data is now associated with League #1!
-- The platform is now ready for multi-tenant operation.
-- ==============================================================================
