-- ============================================
-- Critical Fixes for Season Simulation Issues
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add game cancellation/rescheduling fields
ALTER TABLE games
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_rescheduled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN games.cancelled_at IS 'When the game was cancelled';
COMMENT ON COLUMN games.cancellation_reason IS 'Reason for cancellation (weather, etc.)';
COMMENT ON COLUMN games.rescheduled_at IS 'New scheduled time if game was rescheduled';
COMMENT ON COLUMN games.original_scheduled_at IS 'Original scheduled time before rescheduling';
COMMENT ON COLUMN games.is_rescheduled IS 'Whether this game was rescheduled from original time';

-- 2. Add stat dispute system
CREATE TABLE IF NOT EXISTS stat_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  disputed_by_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  disputed_stat_type TEXT NOT NULL CHECK (disputed_stat_type IN ('player_goal', 'player_assist', 'goalie_save', 'goalie_ga', 'score')),
  disputed_stat_id UUID, -- References player_stats.id or goalie_stats.id (nullable for score disputes)
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Owner who resolved
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stat_disputes_game ON stat_disputes(game_id);
CREATE INDEX IF NOT EXISTS idx_stat_disputes_status ON stat_disputes(status);

-- 3. Add stat change audit trail
CREATE TABLE IF NOT EXISTS stat_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  stat_type TEXT NOT NULL CHECK (stat_type IN ('player_stats', 'goalie_stats', 'game_score')),
  stat_id UUID, -- References player_stats.id, goalie_stats.id, or NULL for game score
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  change_reason TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stat_changes_game ON stat_changes(game_id);
CREATE INDEX IF NOT EXISTS idx_stat_changes_stat ON stat_changes(stat_type, stat_id);

-- 4. Add owner override tracking for stat verification
ALTER TABLE games
ADD COLUMN IF NOT EXISTS home_verified_by_owner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS away_verified_by_owner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS home_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS away_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN games.home_verified_by_owner IS 'Whether home team stats were verified by owner override';
COMMENT ON COLUMN games.away_verified_by_owner IS 'Whether away team stats were verified by owner override';
COMMENT ON COLUMN games.home_verified_at IS 'When home team stats were verified';
COMMENT ON COLUMN games.away_verified_at IS 'When away team stats were verified';

-- 5. Add team messages/communication system
CREATE TABLE IF NOT EXISTS team_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'game_reminder', 'payment_reminder', 'roster_update', 'announcement')),
  subject TEXT,
  message TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_messages_team ON team_messages(team_id, season_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_type ON team_messages(message_type);

-- 6. Add player availability tracking
CREATE TABLE IF NOT EXISTS player_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'maybe', 'injured')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, game_id) -- One availability record per player per game
);

CREATE INDEX IF NOT EXISTS idx_player_availability_game ON player_availability(game_id);
CREATE INDEX IF NOT EXISTS idx_player_availability_player ON player_availability(player_id, season_id);

-- 7. Add payment visibility for captains (add team_id to payments if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_team ON payments(team_id, season_id);
  END IF;
END $$;

-- Verify all changes
SELECT 
  'games' as table_name,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'games'
  AND column_name IN ('cancelled_at', 'rescheduled_at', 'home_verified_by_owner', 'away_verified_by_owner')
UNION ALL
SELECT 
  'stat_disputes' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'stat_disputes'
UNION ALL
SELECT 
  'team_messages' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'team_messages'
UNION ALL
SELECT 
  'player_availability' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'player_availability'
ORDER BY table_name, column_name;
