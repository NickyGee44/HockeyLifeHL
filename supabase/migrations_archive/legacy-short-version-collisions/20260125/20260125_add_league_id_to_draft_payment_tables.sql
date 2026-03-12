-- ==============================================================================
-- MULTI-TENANT MIGRATION: Add league_id to Draft, Payment, and Admin Tables
-- ==============================================================================
-- Description: Adds league_id to drafts, draft_picks, player_ratings, payments, suspensions
-- Priority: MEDIUM - Required for complete multi-tenant isolation
-- Author: Agent 1 - Database & Infrastructure
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: drafts (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_drafts_league_id ON drafts(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_drafts_league_season
ON drafts(league_id, season_id);

-- ==============================================================================
-- TABLE: draft_picks (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE draft_picks
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_draft_picks_league_id ON draft_picks(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_draft_picks_league_draft
ON draft_picks(league_id, draft_id);

CREATE INDEX IF NOT EXISTS idx_draft_picks_league_player
ON draft_picks(league_id, player_id);

-- ==============================================================================
-- TABLE: draft_order (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE draft_order
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_draft_order_league_id ON draft_order(league_id);

-- Composite index
CREATE INDEX IF NOT EXISTS idx_draft_order_league_draft
ON draft_order(league_id, draft_id);

-- ==============================================================================
-- TABLE: player_ratings (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE player_ratings
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_player_ratings_league_id ON player_ratings(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_player_ratings_league_player
ON player_ratings(league_id, player_id);

CREATE INDEX IF NOT EXISTS idx_player_ratings_league_season
ON player_ratings(league_id, season_id);

-- ==============================================================================
-- TABLE: payments (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_league_id ON payments(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_payments_league_player
ON payments(league_id, player_id);

CREATE INDEX IF NOT EXISTS idx_payments_league_season
ON payments(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_payments_league_status
ON payments(league_id, status);

-- ==============================================================================
-- TABLE: suspensions (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE suspensions
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_suspensions_league_id ON suspensions(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_suspensions_league_player
ON suspensions(league_id, player_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on tables
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspensions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES: drafts
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view drafts in their leagues" ON drafts;
DROP POLICY IF EXISTS "League admins can manage drafts" ON drafts;
DROP POLICY IF EXISTS "Service role has full access to drafts" ON drafts;

CREATE POLICY "Users can view drafts in their leagues"
  ON drafts FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage drafts"
  ON drafts FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to drafts"
  ON drafts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: draft_picks
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view draft picks in their leagues" ON draft_picks;
DROP POLICY IF EXISTS "League admins can manage draft picks" ON draft_picks;
DROP POLICY IF EXISTS "Service role has full access to draft picks" ON draft_picks;

CREATE POLICY "Users can view draft picks in their leagues"
  ON draft_picks FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage draft picks"
  ON draft_picks FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to draft picks"
  ON draft_picks FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: draft_order
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view draft order in their leagues" ON draft_order;
DROP POLICY IF EXISTS "League admins can manage draft order" ON draft_order;
DROP POLICY IF EXISTS "Service role has full access to draft order" ON draft_order;

CREATE POLICY "Users can view draft order in their leagues"
  ON draft_order FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage draft order"
  ON draft_order FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to draft order"
  ON draft_order FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: player_ratings
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view player ratings in their leagues" ON player_ratings;
DROP POLICY IF EXISTS "League admins can manage player ratings" ON player_ratings;
DROP POLICY IF EXISTS "Service role has full access to player ratings" ON player_ratings;

CREATE POLICY "Users can view player ratings in their leagues"
  ON player_ratings FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage player ratings"
  ON player_ratings FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to player ratings"
  ON player_ratings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: payments
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view payments in their leagues" ON payments;
DROP POLICY IF EXISTS "Players can view their own payments" ON payments;
DROP POLICY IF EXISTS "League admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Service role has full access to payments" ON payments;

-- League members can view payments in their leagues
CREATE POLICY "Users can view payments in their leagues"
  ON payments FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Players can view their own payments even across leagues
CREATE POLICY "Players can view their own payments"
  ON payments FOR SELECT
  USING (player_id = auth.uid());

-- League owners/admins can manage payments
CREATE POLICY "League admins can manage payments"
  ON payments FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to payments"
  ON payments FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: suspensions
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view suspensions in their leagues" ON suspensions;
DROP POLICY IF EXISTS "League admins can manage suspensions" ON suspensions;
DROP POLICY IF EXISTS "Service role has full access to suspensions" ON suspensions;

CREATE POLICY "Users can view suspensions in their leagues"
  ON suspensions FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage suspensions"
  ON suspensions FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to suspensions"
  ON suspensions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- IMPORTANT NOTES
-- ==============================================================================
--
-- After running this migration, you MUST:
-- 1. Run the data migration script to set league_id for existing records
-- 2. Add NOT NULL constraints after data is migrated
-- 3. Update all server actions to filter by league_id
-- 4. Test RLS policies thoroughly
--
-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
