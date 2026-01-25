-- ==============================================================================
-- MULTI-TENANT CORE TABLES MIGRATION
-- ==============================================================================
-- Description: Creates the foundational tables for multi-tenant architecture
-- Tables: leagues, league_memberships, divisions, venues
-- Author: Multi-Tenant Agent 1 - Database & Infrastructure
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: leagues
-- ==============================================================================
-- Purpose: Core table for each hockey league in the platform
-- Each league is an independent tenant with their own data isolation

CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- For subdomain routing (e.g., "winter-warriors")
  description TEXT,

  -- Contact Information
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- Location
  city TEXT,
  state_province TEXT,
  country TEXT DEFAULT 'USA',
  timezone TEXT DEFAULT 'America/New_York',

  -- Branding & Customization
  logo_url TEXT, -- Storage bucket: league-logos
  primary_color TEXT DEFAULT '#1E40AF', -- Hex color for league branding
  secondary_color TEXT DEFAULT '#3B82F6',
  custom_domain TEXT, -- Optional custom domain (e.g., winterwarriors.com)

  -- Settings
  settings JSONB DEFAULT '{
    "statEntryMode": "captain",
    "allowPlayerRegistration": true,
    "requireApproval": true,
    "emailNotifications": true,
    "allowTrades": false,
    "scorekeeperPayRate": 25.00
  }'::jsonb,

  -- Subscription & Billing (for future use)
  subscription_tier TEXT DEFAULT 'free', -- free, basic, pro, enterprise
  subscription_status TEXT DEFAULT 'active', -- active, cancelled, suspended
  trial_ends_at TIMESTAMP WITH TIME ZONE,

  -- Stripe Connect
  stripe_account_id TEXT, -- Stripe Connect account ID for this league
  stripe_account_status TEXT, -- incomplete, pending, active, rejected
  payment_mode TEXT DEFAULT 'manual', -- manual, stripe_connect

  -- Status
  status TEXT DEFAULT 'active', -- active, suspended, archived

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_slug CHECK (slug ~* '^[a-z0-9-]+$'), -- Only lowercase, numbers, hyphens
  CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'archived')),
  CONSTRAINT valid_payment_mode CHECK (payment_mode IN ('manual', 'stripe_connect'))
);

-- Indexes for performance
CREATE INDEX idx_leagues_slug ON leagues(slug);
CREATE INDEX idx_leagues_status ON leagues(status);
CREATE INDEX idx_leagues_created_by ON leagues(created_by);
CREATE INDEX idx_leagues_stripe_account_id ON leagues(stripe_account_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_leagues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_leagues_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION update_leagues_updated_at();

-- ==============================================================================
-- TABLE: league_memberships
-- ==============================================================================
-- Purpose: Tracks which users belong to which leagues and their roles
-- A user can be a member of multiple leagues with different roles

CREATE TABLE IF NOT EXISTS league_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role in the league
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, scorekeeper, member, player

  -- Status
  status TEXT DEFAULT 'active', -- active, suspended, left

  -- Metadata
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  UNIQUE(league_id, user_id), -- User can only have one membership per league
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'scorekeeper', 'member', 'player')),
  CONSTRAINT valid_membership_status CHECK (status IN ('active', 'suspended', 'left'))
);

-- Indexes
CREATE INDEX idx_league_memberships_league_id ON league_memberships(league_id);
CREATE INDEX idx_league_memberships_user_id ON league_memberships(user_id);
CREATE INDEX idx_league_memberships_role ON league_memberships(role);
CREATE INDEX idx_league_memberships_status ON league_memberships(status);

-- Composite index for common queries
CREATE INDEX idx_league_memberships_league_user ON league_memberships(league_id, user_id);

-- ==============================================================================
-- TABLE: divisions (Updated for Multi-Tenant)
-- ==============================================================================
-- Purpose: Hockey divisions within a league
-- Note: This may already exist, so we use CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Division Information
  name TEXT NOT NULL,
  description TEXT,
  skill_level TEXT, -- A, B, C, Beginner, Intermediate, Advanced, etc.

  -- Settings
  max_teams INTEGER,
  game_duration_minutes INTEGER DEFAULT 60,
  period_count INTEGER DEFAULT 3,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_id, name) -- Division names must be unique within a league
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_divisions_league_id ON divisions(league_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_divisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_divisions_updated_at ON divisions;
CREATE TRIGGER trigger_divisions_updated_at
  BEFORE UPDATE ON divisions
  FOR EACH ROW
  EXECUTE FUNCTION update_divisions_updated_at();

-- ==============================================================================
-- TABLE: venues (Updated for Multi-Tenant)
-- ==============================================================================
-- Purpose: Ice rinks and venues where games are played

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Venue Information
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',

  -- Contact
  phone TEXT,
  website TEXT,

  -- Facilities
  number_of_rinks INTEGER DEFAULT 1,
  parking_info TEXT,
  amenities TEXT[], -- ['wifi', 'concessions', 'pro_shop', 'locker_rooms']

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_id, name) -- Venue names must be unique within a league
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venues_league_id ON venues(league_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_venues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_venues_updated_at ON venues;
CREATE TRIGGER trigger_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_venues_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES: leagues
-- ==============================================================================

-- Anyone can view active leagues (for browsing/signup)
CREATE POLICY "Anyone can view active leagues"
  ON leagues FOR SELECT
  USING (status = 'active');

-- League owners can update their own league
CREATE POLICY "League owners can update their league"
  ON leagues FOR UPDATE
  USING (
    id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Authenticated users can create leagues
CREATE POLICY "Authenticated users can create leagues"
  ON leagues FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Service role can do anything (for migrations and admin tasks)
CREATE POLICY "Service role has full access to leagues"
  ON leagues FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: league_memberships
-- ==============================================================================

-- Users can view memberships for leagues they belong to
CREATE POLICY "Users can view memberships in their leagues"
  ON league_memberships FOR SELECT
  USING (
    user_id = auth.uid() OR
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins can insert memberships (invite users)
CREATE POLICY "League owners/admins can create memberships"
  ON league_memberships FOR INSERT
  WITH CHECK (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- League owners/admins can update memberships
CREATE POLICY "League owners/admins can update memberships"
  ON league_memberships FOR UPDATE
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Users can delete their own membership (leave league)
CREATE POLICY "Users can leave leagues"
  ON league_memberships FOR DELETE
  USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role has full access to memberships"
  ON league_memberships FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: divisions
-- ==============================================================================

-- Users can view divisions in their leagues
CREATE POLICY "Users can view divisions in their leagues"
  ON divisions FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins can manage divisions
CREATE POLICY "League owners/admins can manage divisions"
  ON divisions FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to divisions"
  ON divisions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: venues
-- ==============================================================================

-- Users can view venues in their leagues
CREATE POLICY "Users can view venues in their leagues"
  ON venues FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins can manage venues
CREATE POLICY "League owners/admins can manage venues"
  ON venues FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role has full access to venues"
  ON venues FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Function to get user's active league IDs
CREATE OR REPLACE FUNCTION get_user_league_ids(user_uuid UUID)
RETURNS TABLE(league_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT lm.league_id
  FROM league_memberships lm
  WHERE lm.user_id = user_uuid AND lm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is league owner
CREATE OR REPLACE FUNCTION is_league_owner(user_uuid UUID, check_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM league_memberships
    WHERE user_id = user_uuid
      AND league_id = check_league_id
      AND role = 'owner'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is league admin (owner or admin)
CREATE OR REPLACE FUNCTION is_league_admin(user_uuid UUID, check_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM league_memberships
    WHERE user_id = user_uuid
      AND league_id = check_league_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- SEED DATA: Create League #1 (HockeyLifeHL Migration Target)
-- ==============================================================================
-- Purpose: Create the first league to migrate existing HockeyLifeHL data into
-- This will be run manually after migration, not automatically

-- NOTE: Uncomment and run this manually when ready to migrate HockeyLifeHL data
--
-- INSERT INTO leagues (
--   id,
--   name,
--   slug,
--   description,
--   subscription_tier,
--   status,
--   settings
-- ) VALUES (
--   'hl-legacy-001', -- Hardcoded UUID for migration consistency
--   'HockeyLifeHL (Original)',
--   'hockeylifehl',
--   'The original HockeyLifeHL league migrated to multi-tenant platform',
--   'pro', -- Give them pro tier for being first
--   'active',
--   '{
--     "statEntryMode": "captain",
--     "allowPlayerRegistration": true,
--     "requireApproval": true,
--     "emailNotifications": true,
--     "allowTrades": false
--   }'::jsonb
-- );

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- Next Steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify tables created successfully
-- 3. Test RLS policies with test users
-- 4. Run the next migration to add league_id to existing tables
-- ==============================================================================
