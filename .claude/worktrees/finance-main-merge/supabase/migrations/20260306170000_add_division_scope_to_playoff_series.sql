-- Scope playoff brackets by division when leagues use division-based playoffs.
-- This lets a single season store multiple official brackets at once.

ALTER TABLE playoff_series
  ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;

COMMENT ON COLUMN playoff_series.division_id IS
  'Optional division scope for division-specific playoff brackets. NULL means one league-wide bracket.';

ALTER TABLE playoff_series
  DROP CONSTRAINT IF EXISTS playoff_series_season_id_round_number_series_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_playoff_series_scope_unique
  ON playoff_series (
    season_id,
    COALESCE(division_id, '00000000-0000-0000-0000-000000000000'::uuid),
    round_number,
    series_number
  );

CREATE INDEX IF NOT EXISTS idx_playoff_series_division
  ON playoff_series(division_id)
  WHERE division_id IS NOT NULL;

CREATE OR REPLACE FUNCTION complete_playoff_season_if_ready(p_season_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incomplete_exists BOOLEAN;
  v_champion_team_id UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM playoff_series
    WHERE season_id = p_season_id
      AND status <> 'completed'
  )
  INTO v_incomplete_exists;

  IF v_incomplete_exists THEN
    RETURN;
  END IF;

  WITH scoped_finals AS (
    SELECT
      COALESCE(division_id, '00000000-0000-0000-0000-000000000000'::uuid) AS scope_key,
      MAX(round_number) AS final_round
    FROM playoff_series
    WHERE season_id = p_season_id
    GROUP BY 1
  ),
  winners AS (
    SELECT
      sf.scope_key,
      ps.winner_id
    FROM scoped_finals sf
    JOIN playoff_series ps
      ON ps.season_id = p_season_id
     AND COALESCE(ps.division_id, '00000000-0000-0000-0000-000000000000'::uuid) = sf.scope_key
     AND ps.round_number = sf.final_round
  )
  SELECT
    CASE
      WHEN COUNT(*) = 1 THEN MAX(winner_id)
      ELSE NULL
    END
  INTO v_champion_team_id
  FROM winners;

  UPDATE seasons
  SET
    champion_team_id = v_champion_team_id,
    status = 'completed'
  WHERE id = p_season_id;
END;
$$;

CREATE OR REPLACE FUNCTION auto_update_playoff_series_on_game_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series         playoff_series%ROWTYPE;
  v_format         TEXT;
  v_wins_needed    INT;
  v_winner_is_high BOOLEAN;
  v_new_high_wins  INT;
  v_new_low_wins   INT;
  v_winner_id      UUID;
  v_new_status     TEXT;
  v_next_round     INT;
  v_next_series_no INT;
  v_is_high_slot   BOOLEAN;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.playoff_series_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.home_score IS NULL OR NEW.away_score IS NULL OR NEW.home_score = NEW.away_score THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO v_series
  FROM playoff_series
  WHERE id = NEW.playoff_series_id;

  IF NOT FOUND OR v_series.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT playoff_format
  INTO v_format
  FROM seasons
  WHERE id = NEW.season_id;

  v_wins_needed := CASE v_format
    WHEN 'best_of_5' THEN 3
    WHEN 'best_of_3' THEN 2
    ELSE 1
  END;

  v_winner_is_high := (NEW.home_score > NEW.away_score);
  v_new_high_wins := v_series.high_seed_wins + CASE WHEN v_winner_is_high THEN 1 ELSE 0 END;
  v_new_low_wins := v_series.low_seed_wins + CASE WHEN NOT v_winner_is_high THEN 1 ELSE 0 END;

  IF v_new_high_wins >= v_wins_needed THEN
    v_winner_id := v_series.high_seed_id;
    v_new_status := 'completed';
  ELSIF v_new_low_wins >= v_wins_needed THEN
    v_winner_id := v_series.low_seed_id;
    v_new_status := 'completed';
  ELSE
    v_winner_id := NULL;
    v_new_status := 'in_progress';
  END IF;

  UPDATE playoff_series
  SET
    high_seed_wins = v_new_high_wins,
    low_seed_wins = v_new_low_wins,
    winner_id = v_winner_id,
    status = v_new_status
  WHERE id = NEW.playoff_series_id;

  IF v_winner_id IS NOT NULL THEN
    v_next_round := v_series.round_number + 1;
    v_next_series_no := CEIL(v_series.series_number / 2.0)::INT;
    v_is_high_slot := (v_series.series_number % 2 = 1);

    IF v_is_high_slot THEN
      UPDATE playoff_series
      SET high_seed_id = v_winner_id
      WHERE season_id = NEW.season_id
        AND round_number = v_next_round
        AND series_number = v_next_series_no
        AND division_id IS NOT DISTINCT FROM v_series.division_id;
    ELSE
      UPDATE playoff_series
      SET low_seed_id = v_winner_id
      WHERE season_id = NEW.season_id
        AND round_number = v_next_round
        AND series_number = v_next_series_no
        AND division_id IS NOT DISTINCT FROM v_series.division_id;
    END IF;

    PERFORM complete_playoff_season_if_ready(NEW.season_id);
  END IF;

  RETURN NEW;
END;
$$;
