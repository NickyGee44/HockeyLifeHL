-- Create trades system to track manual player movements between teams
-- This allows admins to manually reassign players and maintain trade history

-- Main trades table to track trade transactions
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  executed_by UUID NOT NULL REFERENCES profiles(id),
  executed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('manual', 'player_swap')),
  notes TEXT,
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trade players table to track individual player movements in each trade
CREATE TABLE IF NOT EXISTS trade_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_team_id UUID NOT NULL REFERENCES teams(id),
  to_team_id UUID NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CHECK (from_team_id != to_team_id) -- Can't trade to same team
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_season ON trades(season_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed_by ON trades(executed_by);
CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_players_trade ON trade_players(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_players_player ON trade_players(player_id);
CREATE INDEX IF NOT EXISTS idx_trade_players_from_team ON trade_players(from_team_id);
CREATE INDEX IF NOT EXISTS idx_trade_players_to_team ON trade_players(to_team_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_trades_updated_at();

-- Enable Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_players ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view trade history
CREATE POLICY "Trade history is viewable by everyone"
  ON trades FOR SELECT
  USING (true);

CREATE POLICY "Trade players are viewable by everyone"
  ON trade_players FOR SELECT
  USING (true);

-- Policy: Only owners can execute trades
CREATE POLICY "Only owners can create trades"
  ON trades FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can update trades"
  ON trades FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can add trade players"
  ON trade_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE trades IS 'Tracks manual player trades and reassignments between teams';
COMMENT ON TABLE trade_players IS 'Individual player movements within each trade transaction';
COMMENT ON COLUMN trades.trade_type IS 'Type of trade: manual (single player move) or player_swap (exchange between teams)';
COMMENT ON COLUMN trades.reverted_at IS 'Timestamp when trade was undone (within 24 hour window)';
COMMENT ON COLUMN trades.reverted_by IS 'Admin who reverted the trade';
