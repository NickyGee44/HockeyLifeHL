-- Migration: auto-advance season from 'active' to 'playoffs' when every
-- regular-season game in that season reaches 'completed' status.
--
-- This complements the manual "Switch to Playoffs" button and the existing
-- generatePlayoffBracket() action (which already sets status directly).
--
-- The trigger fires AFTER a game status changes to 'completed'. It:
--   1. Ignores non-regular game types (playoff, exhibition)
--   2. Ignores seasons that are not currently 'active'
--   3. Counts all non-cancelled/non-postponed regular games and compares to
--      completed games — if equal, advances the season to 'playoffs'

CREATE OR REPLACE FUNCTION auto_advance_season_to_playoffs()
RETURNS TRIGGER AS $$
DECLARE
  v_season_status text;
  v_total_regular  int;
  v_completed_regular int;
BEGIN
  -- Only react when a game transitions to 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Only act on regular-season game types (NULL treated as regular)
  IF NEW.game_type IS NOT NULL AND NEW.game_type != 'regular' THEN
    RETURN NEW;
  END IF;

  -- Bail early if season isn't in 'active' state
  SELECT status INTO v_season_status
  FROM seasons
  WHERE id = NEW.season_id;

  IF v_season_status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  -- Count schedulable and completed regular season games
  SELECT
    COUNT(*) FILTER (WHERE (game_type IS NULL OR game_type = 'regular')
                      AND status NOT IN ('cancelled', 'postponed')),
    COUNT(*) FILTER (WHERE (game_type IS NULL OR game_type = 'regular')
                      AND status = 'completed')
  INTO v_total_regular, v_completed_regular
  FROM games
  WHERE season_id = NEW.season_id;

  -- Advance only when there are games and all are done
  IF v_total_regular > 0 AND v_total_regular = v_completed_regular THEN
    UPDATE seasons
    SET status     = 'playoffs',
        updated_at = NOW()
    WHERE id     = NEW.season_id
      AND status = 'active'; -- re-check avoids race conditions
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if re-running this migration
DROP TRIGGER IF EXISTS trigger_auto_advance_season_to_playoffs ON games;

CREATE TRIGGER trigger_auto_advance_season_to_playoffs
  AFTER UPDATE OF status ON games
  FOR EACH ROW
  EXECUTE FUNCTION auto_advance_season_to_playoffs();
