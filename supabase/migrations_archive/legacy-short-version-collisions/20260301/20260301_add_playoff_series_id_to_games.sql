-- Link individual game records to their playoff series for scorekeeper PWA support
ALTER TABLE games ADD COLUMN IF NOT EXISTS playoff_series_id UUID REFERENCES playoff_series(id) ON DELETE SET NULL;

COMMENT ON COLUMN games.playoff_series_id IS
  'Links a game to its playoff series. Set when a playoff game is scheduled from the bracket UI. NULL for regular season games.';

CREATE INDEX IF NOT EXISTS idx_games_playoff_series_id ON games(playoff_series_id) WHERE playoff_series_id IS NOT NULL;
