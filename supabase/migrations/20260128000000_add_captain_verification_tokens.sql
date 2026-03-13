-- Canonicalized from legacy short migration version 20260128.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- Captain Verification Token System
-- Adds email-based verification tokens for captains to verify game stats

-- Add verification token fields to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS home_verification_token TEXT,
ADD COLUMN IF NOT EXISTS away_verification_token TEXT,
ADD COLUMN IF NOT EXISTS home_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS away_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stats_locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stats_unlocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unlock_reason TEXT,
ADD COLUMN IF NOT EXISTS unlocked_by UUID REFERENCES auth.users(id);

-- Add contested stats fields (for when captains disagree with stats)
ALTER TABLE games
ADD COLUMN IF NOT EXISTS home_contested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS away_contested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS home_contested_reason TEXT,
ADD COLUMN IF NOT EXISTS away_contested_reason TEXT,
ADD COLUMN IF NOT EXISTS home_contested_stats JSONB,
ADD COLUMN IF NOT EXISTS away_contested_stats JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_home_verification_token ON games(home_verification_token);

CREATE INDEX IF NOT EXISTS idx_games_away_verification_token ON games(away_verification_token);

CREATE INDEX IF NOT EXISTS idx_games_stats_locked_at ON games(stats_locked_at);

CREATE INDEX IF NOT EXISTS idx_games_stats_submitted_at ON games(stats_submitted_at);

-- Add locked field to game_stats if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_stats' AND column_name = 'locked'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN locked BOOLEAN DEFAULT false;
  END IF;
END$$;

-- Function to generate secure verification tokens
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TEXT AS $$
BEGIN
  -- Generate a random 32-character token
  RETURN encode(gen_random_bytes(24), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to automatically lock stats when both captains verify
CREATE OR REPLACE FUNCTION check_and_lock_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if both captains have verified
  IF NEW.home_verified_at IS NOT NULL AND
     NEW.away_verified_at IS NOT NULL AND
     NEW.stats_locked_at IS NULL THEN
    -- Lock the stats
    NEW.stats_locked_at = NOW();

    -- Lock all individual game stats
    UPDATE game_stats
    SET locked = true
    WHERE game_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-lock stats when both captains verify
DROP TRIGGER IF EXISTS auto_lock_stats_on_verification ON games;

CREATE TRIGGER auto_lock_stats_on_verification
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION check_and_lock_stats();

-- Function to unlock stats (admin only)
CREATE OR REPLACE FUNCTION unlock_game_stats(
  p_game_id UUID,
  p_reason TEXT,
  p_unlocked_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Unlock the game
  UPDATE games
  SET
    stats_locked_at = NULL,
    stats_unlocked_at = NOW(),
    unlock_reason = p_reason,
    unlocked_by = p_unlocked_by,
    home_verified_at = NULL,
    away_verified_at = NULL,
    home_captain_verified = false,
    away_captain_verified = false
  WHERE id = p_game_id;

  -- Unlock all individual stats
  UPDATE game_stats
  SET locked = false
  WHERE game_id = p_game_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_verification_token() TO authenticated;

GRANT EXECUTE ON FUNCTION unlock_game_stats(UUID, TEXT, UUID) TO authenticated;

-- Comments for documentation
COMMENT ON COLUMN games.home_verification_token IS 'Unique token sent to home team captain for email-based stat verification';

COMMENT ON COLUMN games.away_verification_token IS 'Unique token sent to away team captain for email-based stat verification';

COMMENT ON COLUMN games.home_verified_at IS 'Timestamp when home team captain verified the stats';

COMMENT ON COLUMN games.away_verified_at IS 'Timestamp when away team captain verified the stats';

COMMENT ON COLUMN games.stats_locked_at IS 'Timestamp when stats were locked (both captains verified)';

COMMENT ON COLUMN games.stats_unlocked_at IS 'Timestamp when stats were unlocked by admin for corrections';

COMMENT ON COLUMN games.unlock_reason IS 'Reason provided by admin for unlocking stats';

COMMENT ON COLUMN games.home_contested_at IS 'Timestamp when home captain contested the stats';

COMMENT ON COLUMN games.home_contested_reason IS 'Reason provided by home captain for contesting';

COMMENT ON COLUMN games.home_contested_stats IS 'Array of stat IDs being contested by home captain';

COMMENT ON COLUMN game_stats.locked IS 'Whether this individual stat is locked from editing (set when game stats are verified)';

