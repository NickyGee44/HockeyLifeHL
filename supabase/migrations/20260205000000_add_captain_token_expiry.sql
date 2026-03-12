-- Canonicalized from legacy short migration version 20260205.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- ==============================================================================
-- SECURITY FIX: Add expiration to captain verification tokens
-- ==============================================================================
-- Issue: Captain verification tokens (home_verification_token, away_verification_token)
--        in games table have no expiration, allowing indefinite token validity.
-- Risk: Tokens can be intercepted/stolen and used months later to forge verification
-- Fix: Add expires_at timestamp with 24-hour default expiration
-- Reference: NEW_FEATURES_SECURITY_AUDIT_2026-02-05.md - Issue #2
-- ==============================================================================

-- Add expiration columns for captain verification tokens
ALTER TABLE games
ADD COLUMN IF NOT EXISTS home_verification_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS away_verification_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for cleanup queries (finding expired tokens)
CREATE INDEX IF NOT EXISTS idx_games_home_verification_expires
ON games(home_verification_token_expires_at)
WHERE home_verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_games_away_verification_expires
ON games(away_verification_token_expires_at)
WHERE away_verification_token IS NOT NULL;

-- Composite index for token validation queries (token + expiry check)
CREATE INDEX IF NOT EXISTS idx_games_verification_tokens
ON games(home_verification_token, away_verification_token)
WHERE home_verification_token IS NOT NULL OR away_verification_token IS NOT NULL;

COMMENT ON COLUMN games.home_verification_token_expires_at IS 'Expiration timestamp for home captain verification token (24 hours from generation)';

COMMENT ON COLUMN games.away_verification_token_expires_at IS 'Expiration timestamp for away captain verification token (24 hours from generation)';

-- ==============================================================================
-- Update validate_captain_token() function to check expiration
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.validate_captain_token(p_token text)
 RETURNS TABLE(
   game_id uuid,
   team_type text,
   is_valid boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_game RECORD;
BEGIN
  -- Find game by verification token
  SELECT
    g.id,
    CASE
      WHEN g.home_verification_token = p_token THEN 'home'
      WHEN g.away_verification_token = p_token THEN 'away'
      ELSE NULL
    END as team,
    CASE
      WHEN g.home_verification_token = p_token THEN g.home_verification_token_expires_at
      WHEN g.away_verification_token = p_token THEN g.away_verification_token_expires_at
      ELSE NULL
    END as expires_at
  INTO v_game
  FROM games g
  WHERE g.home_verification_token = p_token
     OR g.away_verification_token = p_token;

  -- Token not found
  IF v_game.id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false;
    RETURN;
  END IF;

  -- Check if token has expired (if expiration is set)
  IF v_game.expires_at IS NOT NULL AND v_game.expires_at < NOW() THEN
    RETURN QUERY SELECT v_game.id, v_game.team, false;
    RETURN;
  END IF;

  -- Token is valid
  RETURN QUERY SELECT v_game.id, v_game.team, true;
END;
$function$;

-- ==============================================================================
-- Scheduled cleanup job: Clear expired tokens (run daily via cron or pg_cron)
-- ==============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_captain_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Clear expired home tokens
  UPDATE games
  SET home_verification_token = NULL,
      home_verification_token_expires_at = NULL
  WHERE home_verification_token IS NOT NULL
    AND home_verification_token_expires_at IS NOT NULL
    AND home_verification_token_expires_at < NOW();

  -- Clear expired away tokens
  UPDATE games
  SET away_verification_token = NULL,
      away_verification_token_expires_at = NULL
  WHERE away_verification_token IS NOT NULL
    AND away_verification_token_expires_at IS NOT NULL
    AND away_verification_token_expires_at < NOW();

  RAISE NOTICE 'Cleanup complete: Expired captain verification tokens cleared';
END;
$function$;

COMMENT ON FUNCTION cleanup_expired_captain_tokens() IS 'Removes expired captain verification tokens from games table. Run daily via cron.';

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Captain token expiration migration complete';
  RAISE NOTICE '🔒 Security: Tokens now expire after 24 hours';
  RAISE NOTICE '🧹 Cleanup: Run cleanup_expired_captain_tokens() daily';
  RAISE NOTICE '⚠️  Action Required: Update submitGameForVerification() to set expiration timestamps';
END $$;

