-- ==============================================================================
-- MULTI-TENANT MIGRATION: Add league_id to Feature Tables
-- ==============================================================================
-- Description: Adds league_id to articles, trades, player_goalie_matchups, season_highlights, email_drafts
-- Priority: MEDIUM - Required for complete multi-tenant feature isolation
-- Author: Agent 1 - Database & Infrastructure
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- TABLE: articles (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_articles_league_id ON articles(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_articles_league_published
ON articles(league_id, published, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_league_season
ON articles(league_id, season_id);

-- ==============================================================================
-- TABLE: trades (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trades_league_id ON trades(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_trades_league_season
ON trades(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_trades_league_executed
ON trades(league_id, executed_at DESC);

-- ==============================================================================
-- TABLE: trade_players (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE trade_players
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trade_players_league_id ON trade_players(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_trade_players_league_trade
ON trade_players(league_id, trade_id);

CREATE INDEX IF NOT EXISTS idx_trade_players_league_player
ON trade_players(league_id, player_id);

-- ==============================================================================
-- TABLE: player_goalie_matchups (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE player_goalie_matchups
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_player_goalie_matchups_league_id ON player_goalie_matchups(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_player_goalie_matchups_league_player
ON player_goalie_matchups(league_id, player_id);

CREATE INDEX IF NOT EXISTS idx_player_goalie_matchups_league_goalie
ON player_goalie_matchups(league_id, goalie_id);

CREATE INDEX IF NOT EXISTS idx_player_goalie_matchups_league_season
ON player_goalie_matchups(league_id, season_id);

-- ==============================================================================
-- TABLE: season_highlights (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE season_highlights
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_season_highlights_league_id ON season_highlights(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_season_highlights_league_season
ON season_highlights(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_season_highlights_league_order
ON season_highlights(league_id, display_order);

-- ==============================================================================
-- TABLE: email_drafts (Add Multi-Tenant Support)
-- ==============================================================================

-- Add league_id column
ALTER TABLE email_drafts
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_email_drafts_league_id ON email_drafts(league_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_email_drafts_league_created
ON email_drafts(league_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_drafts_league_type
ON email_drafts(league_id, type);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on tables
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_goalie_matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES: articles
-- ==============================================================================

DROP POLICY IF EXISTS "Anyone can view published articles" ON articles;
DROP POLICY IF EXISTS "Users can view articles in their leagues" ON articles;
DROP POLICY IF EXISTS "League admins can manage articles" ON articles;
DROP POLICY IF EXISTS "Service role has full access to articles" ON articles;

-- Anyone can view published articles (for public viewing)
CREATE POLICY "Anyone can view published articles"
  ON articles FOR SELECT
  USING (published = true);

-- League members can view all articles (including drafts) in their leagues
CREATE POLICY "Users can view articles in their leagues"
  ON articles FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- League owners/admins can manage articles
CREATE POLICY "League admins can manage articles"
  ON articles FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to articles"
  ON articles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: trades
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view trades in their leagues" ON trades;
DROP POLICY IF EXISTS "League admins can manage trades" ON trades;
DROP POLICY IF EXISTS "Service role has full access to trades" ON trades;

CREATE POLICY "Users can view trades in their leagues"
  ON trades FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage trades"
  ON trades FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to trades"
  ON trades FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: trade_players
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view trade players in their leagues" ON trade_players;
DROP POLICY IF EXISTS "League admins can manage trade players" ON trade_players;
DROP POLICY IF EXISTS "Service role has full access to trade players" ON trade_players;

CREATE POLICY "Users can view trade players in their leagues"
  ON trade_players FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage trade players"
  ON trade_players FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to trade players"
  ON trade_players FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: player_goalie_matchups
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view matchups in their leagues" ON player_goalie_matchups;
DROP POLICY IF EXISTS "League admins can manage matchups" ON player_goalie_matchups;
DROP POLICY IF EXISTS "Service role has full access to matchups" ON player_goalie_matchups;

CREATE POLICY "Users can view matchups in their leagues"
  ON player_goalie_matchups FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage matchups"
  ON player_goalie_matchups FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to matchups"
  ON player_goalie_matchups FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: season_highlights
-- ==============================================================================

DROP POLICY IF EXISTS "Anyone can view season highlights" ON season_highlights;
DROP POLICY IF EXISTS "Users can view highlights in their leagues" ON season_highlights;
DROP POLICY IF EXISTS "League admins can manage highlights" ON season_highlights;
DROP POLICY IF EXISTS "Service role has full access to highlights" ON season_highlights;

-- Anyone can view season highlights (for public league history page)
CREATE POLICY "Anyone can view season highlights"
  ON season_highlights FOR SELECT
  USING (true);

-- League owners/admins can manage highlights
CREATE POLICY "League admins can manage highlights"
  ON season_highlights FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to highlights"
  ON season_highlights FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- RLS POLICIES: email_drafts
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view email drafts in their leagues" ON email_drafts;
DROP POLICY IF EXISTS "League admins can manage email drafts" ON email_drafts;
DROP POLICY IF EXISTS "Service role has full access to email drafts" ON email_drafts;

CREATE POLICY "Users can view email drafts in their leagues"
  ON email_drafts FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage email drafts"
  ON email_drafts FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role has full access to email drafts"
  ON email_drafts FOR ALL
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
