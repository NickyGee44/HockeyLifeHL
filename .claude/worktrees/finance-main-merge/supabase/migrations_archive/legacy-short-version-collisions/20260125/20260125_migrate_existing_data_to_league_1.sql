-- ==============================================================================
-- DATA MIGRATION: Migrate Existing HockeyLifeHL Data to League #1
-- ==============================================================================
-- Description: Creates League #1 and assigns all existing data to it
-- Priority: CRITICAL - Must run AFTER all league_id columns are added
-- Author: Agent 1 - Database & Infrastructure
-- Date: January 25, 2026
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

    RAISE NOTICE 'Created League #1: HockeyLifeHL (Original)';
  ELSE
    RAISE NOTICE 'League #1 already exists, skipping creation';
  END IF;
END $$;

-- ==============================================================================
-- STEP 2: Update all existing records to belong to League #1
-- ==============================================================================

DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
  updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting data migration to League #1...';

  -- Core tables (highest priority)
  UPDATE teams SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % teams', updated_count;

  UPDATE seasons SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % seasons', updated_count;

  UPDATE team_rosters SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % team_rosters', updated_count;

  -- Games and stats tables
  UPDATE games SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % games', updated_count;

  UPDATE player_stats SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % player_stats', updated_count;

  UPDATE goalie_stats SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % goalie_stats', updated_count;

  -- Draft and payment tables
  UPDATE drafts SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % drafts', updated_count;

  UPDATE draft_picks SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % draft_picks', updated_count;

  UPDATE draft_order SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % draft_order', updated_count;

  UPDATE player_ratings SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % player_ratings', updated_count;

  UPDATE payments SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % payments', updated_count;

  UPDATE suspensions SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % suspensions', updated_count;

  -- Feature tables
  UPDATE articles SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % articles', updated_count;

  UPDATE trades SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % trades', updated_count;

  UPDATE trade_players SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % trade_players', updated_count;

  UPDATE player_goalie_matchups SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % player_goalie_matchups', updated_count;

  UPDATE season_highlights SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % season_highlights', updated_count;

  UPDATE email_drafts SET league_id = legacy_league_id WHERE league_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % email_drafts', updated_count;

  RAISE NOTICE 'Data migration complete!';
END $$;

-- ==============================================================================
-- STEP 3: Add NOT NULL constraints (now that all data has league_id)
-- ==============================================================================

-- Core tables
ALTER TABLE teams ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE seasons ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE team_rosters ALTER COLUMN league_id SET NOT NULL;

-- Games and stats
ALTER TABLE games ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE player_stats ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE goalie_stats ALTER COLUMN league_id SET NOT NULL;

-- Draft and payment tables
ALTER TABLE drafts ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE draft_picks ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE draft_order ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE player_ratings ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE suspensions ALTER COLUMN league_id SET NOT NULL;

-- Feature tables
ALTER TABLE articles ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE trades ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE trade_players ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE player_goalie_matchups ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE season_highlights ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE email_drafts ALTER COLUMN league_id SET NOT NULL;

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

      RAISE NOTICE 'Created league membership for admin: %', admin_user_id;
    ELSE
      RAISE NOTICE 'Membership already exists for admin: %', admin_user_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'League memberships created!';
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
  RAISE NOTICE 'Verified League #1: %', league_name;
END $$;

-- Count records migrated to League #1
DO $$
DECLARE
  legacy_league_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
  record_count INTEGER;
BEGIN
  RAISE NOTICE 'Record counts for League #1:';

  SELECT COUNT(*) INTO record_count FROM teams WHERE league_id = legacy_league_id;
  RAISE NOTICE '  Teams: %', record_count;

  SELECT COUNT(*) INTO record_count FROM seasons WHERE league_id = legacy_league_id;
  RAISE NOTICE '  Seasons: %', record_count;

  SELECT COUNT(*) INTO record_count FROM games WHERE league_id = legacy_league_id;
  RAISE NOTICE '  Games: %', record_count;

  SELECT COUNT(*) INTO record_count FROM player_stats WHERE league_id = legacy_league_id;
  RAISE NOTICE '  Player Stats: %', record_count;

  SELECT COUNT(*) INTO record_count FROM goalie_stats WHERE league_id = legacy_league_id;
  RAISE NOTICE '  Goalie Stats: %', record_count;

  SELECT COUNT(*) INTO record_count FROM league_memberships WHERE league_id = legacy_league_id;
  RAISE NOTICE '  League Memberships: %', record_count;
END $$;

-- ==============================================================================
-- IMPORTANT NOTES
-- ==============================================================================
--
-- After running this migration:
-- 1. Verify all existing data now has league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
-- 2. Verify existing admins are now owners of League #1
-- 3. Test that RLS policies work correctly
-- 4. Update server actions to filter by league_id
-- 5. Test multi-tenant functionality by creating a second league
--
-- League #1 UUID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- League #1 Slug: hockeylifehl-original
--
-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- All existing HockeyLifeHL data is now associated with League #1!
-- The platform is now ready for multi-tenant operation.
-- ==============================================================================
