-- Auto-update playoff series when a linked game is completed
-- Fires after game status transitions to 'completed' on any game with a playoff_series_id

CREATE OR REPLACE FUNCTION auto_update_playoff_series_on_game_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series        playoff_series%ROWTYPE;
  v_format        TEXT;
  v_wins_needed   INT;
  v_winner_is_high BOOL;
  v_new_high_wins INT;
  v_new_low_wins  INT;
  v_winner_id     UUID;
  v_new_status    TEXT;
  v_next_round    INT;
  v_next_series_no INT;
  v_is_high_slot  BOOL;
BEGIN
  -- Only act when transitioning to 'completed' with a linked series
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  IF NEW.playoff_series_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Scores must be defined (avoid processing games with NULL scores)
  IF NEW.home_score IS NULL OR NEW.away_score IS NULL OR NEW.home_score = NEW.away_score THEN
    RETURN NEW;
  END IF;

  -- Fetch series
  SELECT * INTO v_series FROM playoff_series WHERE id = NEW.playoff_series_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF v_series.status = 'completed' THEN RETURN NEW; END IF;

  -- Determine wins needed from playoff format
  SELECT playoff_format INTO v_format FROM seasons WHERE id = NEW.season_id;
  v_wins_needed := CASE v_format
    WHEN 'best_of_5' THEN 3
    WHEN 'best_of_3' THEN 2
    ELSE 1
  END;

  -- In schedulePlayoffGame, high_seed = home team
  v_winner_is_high := (NEW.home_score > NEW.away_score);

  v_new_high_wins := v_series.high_seed_wins + CASE WHEN v_winner_is_high THEN 1 ELSE 0 END;
  v_new_low_wins  := v_series.low_seed_wins  + CASE WHEN NOT v_winner_is_high THEN 1 ELSE 0 END;

  -- Determine if series is complete
  IF v_new_high_wins >= v_wins_needed THEN
    v_winner_id  := v_series.high_seed_id;
    v_new_status := 'completed';
  ELSIF v_new_low_wins >= v_wins_needed THEN
    v_winner_id  := v_series.low_seed_id;
    v_new_status := 'completed';
  ELSE
    v_winner_id  := NULL;
    v_new_status := 'in_progress';
  END IF;

  -- Update the series
  UPDATE playoff_series
  SET
    high_seed_wins = v_new_high_wins,
    low_seed_wins  = v_new_low_wins,
    winner_id      = v_winner_id,
    status         = v_new_status
  WHERE id = NEW.playoff_series_id;

  -- If series is complete, advance winner to next round
  IF v_winner_id IS NOT NULL THEN
    v_next_round     := v_series.round_number + 1;
    v_next_series_no := CEIL(v_series.series_number / 2.0)::INT;
    v_is_high_slot   := (v_series.series_number % 2 = 1);

    IF v_is_high_slot THEN
      UPDATE playoff_series
      SET high_seed_id = v_winner_id
      WHERE season_id = NEW.season_id
        AND round_number = v_next_round
        AND series_number = v_next_series_no;
    ELSE
      UPDATE playoff_series
      SET low_seed_id = v_winner_id
      WHERE season_id = NEW.season_id
        AND round_number = v_next_round
        AND series_number = v_next_series_no;
    END IF;

    -- If no next round exists, this was the championship
    IF NOT EXISTS (
      SELECT 1 FROM playoff_series
      WHERE season_id = NEW.season_id AND round_number = v_next_round
    ) THEN
      UPDATE seasons
      SET champion_team_id = v_winner_id, status = 'completed'
      WHERE id = NEW.season_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_playoff_series_update ON games;
CREATE TRIGGER trg_playoff_series_update
  AFTER UPDATE OF status ON games
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_playoff_series_on_game_complete();
