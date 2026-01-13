-- ============================================
-- Randomize Player Ratings and Assign Black Silhouette Avatars
-- Run this in Supabase SQL Editor
-- ============================================
-- This script will:
-- 1. Randomize player ratings for all players in the current active/draft season
-- 2. Assign black silhouette avatars to all players who don't have one

-- ============================================
-- STEP 1: Get Current Season
-- ============================================

DO $$
DECLARE
  current_season_id UUID;
  player_record RECORD;
  random_rating TEXT;
  ratings TEXT[] := ARRAY['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
  rating_weights INTEGER[] := ARRAY[2, 5, 8, 10, 15, 12, 15, 12, 8, 5, 4, 4]; -- Weighted distribution (more B and C players)
  total_weight INTEGER;
  random_num INTEGER;
  weight_sum INTEGER := 0;
  selected_rating TEXT;
  black_silhouette_svg TEXT;
BEGIN
  -- Get the most recent active/draft season
  SELECT id INTO current_season_id
  FROM seasons
  WHERE status IN ('active', 'draft', 'playoffs')
  ORDER BY created_at DESC
  LIMIT 1;

  IF current_season_id IS NULL THEN
    RAISE EXCEPTION 'No active or draft season found. Please create a season first.';
  END IF;

  RAISE NOTICE 'Found season: %', current_season_id;

  -- Black silhouette SVG as data URI (simple hockey player silhouette)
  -- Pre-URL-encoded SVG: head circle, body ellipse, legs, arms
  black_silhouette_svg := 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Ccircle cx="100" cy="70" r="30" fill="%23000"/%3E%3Cellipse cx="100" cy="140" rx="45" ry="55" fill="%23000"/%3E%3Crect x="75" y="155" width="18" height="25" fill="%23000"/%3E%3Crect x="107" y="155" width="18" height="25" fill="%23000"/%3E%3Crect x="82" y="105" width="12" height="45" fill="%23000" transform="rotate(-25 88 127.5)"/%3E%3Crect x="106" y="105" width="12" height="45" fill="%23000" transform="rotate(25 112 127.5)"/%3E%3C/svg%3E';

  -- Calculate total weight
  SELECT SUM(unnest) INTO total_weight FROM unnest(rating_weights);

  -- Loop through all players
  FOR player_record IN 
    SELECT p.id, p.avatar_url
    FROM profiles p
    WHERE p.role = 'player' OR p.role IS NULL
  LOOP
    -- ============================================
    -- Randomize Rating
    -- ============================================
    -- Generate random number based on weighted distribution
    random_num := floor(random() * total_weight)::INTEGER + 1;
    weight_sum := 0;
    selected_rating := 'C'; -- Default
    
    FOR i IN 1..array_length(ratings, 1) LOOP
      weight_sum := weight_sum + rating_weights[i];
      IF random_num <= weight_sum THEN
        selected_rating := ratings[i];
        EXIT;
      END IF;
    END LOOP;

    -- Upsert player rating for current season
    INSERT INTO player_ratings (
      player_id,
      season_id,
      rating,
      games_played,
      attendance_rate,
      points_per_game,
      calculated_at
    )
    VALUES (
      player_record.id,
      current_season_id,
      selected_rating::player_rating,
      floor(random() * 10)::INTEGER, -- Random games played 0-9
      (random() * 0.4 + 0.6)::DECIMAL(5,2), -- Random attendance 60-100%
      (random() * 2.0)::DECIMAL(5,2), -- Random PPG 0-2.0
      NOW()
    )
    ON CONFLICT (player_id, season_id) 
    DO UPDATE SET
      rating = selected_rating::player_rating,
      calculated_at = NOW();

    -- ============================================
    -- Assign Black Silhouette Avatar
    -- ============================================
    -- Only update if player doesn't have an avatar
    IF player_record.avatar_url IS NULL OR player_record.avatar_url = '' THEN
      UPDATE profiles
      SET avatar_url = black_silhouette_svg
      WHERE id = player_record.id;
    END IF;

  END LOOP;

  RAISE NOTICE 'Completed! Randomized ratings and assigned avatars for all players.';
  
  -- Show summary
  RAISE NOTICE 'Rating distribution:';
  FOR player_record IN
    SELECT rating, COUNT(*) as count
    FROM player_ratings
    WHERE season_id = current_season_id
    GROUP BY rating
    ORDER BY 
      CASE rating
        WHEN 'A+' THEN 1
        WHEN 'A' THEN 2
        WHEN 'A-' THEN 3
        WHEN 'B+' THEN 4
        WHEN 'B' THEN 5
        WHEN 'B-' THEN 6
        WHEN 'C+' THEN 7
        WHEN 'C' THEN 8
        WHEN 'C-' THEN 9
        WHEN 'D+' THEN 10
        WHEN 'D' THEN 11
        WHEN 'D-' THEN 12
      END
  LOOP
    RAISE NOTICE '  %: % players', player_record.rating, player_record.count;
  END LOOP;

END $$;

-- ============================================
-- VERIFY RESULTS
-- ============================================

SELECT 
  pr.rating,
  COUNT(*) as player_count,
  ROUND(AVG(pr.games_played), 1) as avg_games,
  ROUND(AVG(pr.attendance_rate * 100), 1) as avg_attendance_pct,
  ROUND(AVG(pr.points_per_game), 2) as avg_ppg
FROM player_ratings pr
INNER JOIN seasons s ON pr.season_id = s.id
WHERE s.status IN ('active', 'draft', 'playoffs')
GROUP BY pr.rating
ORDER BY 
  CASE pr.rating
    WHEN 'A+' THEN 1
    WHEN 'A' THEN 2
    WHEN 'A-' THEN 3
    WHEN 'B+' THEN 4
    WHEN 'B' THEN 5
    WHEN 'B-' THEN 6
    WHEN 'C+' THEN 7
    WHEN 'C' THEN 8
    WHEN 'C-' THEN 9
    WHEN 'D+' THEN 10
    WHEN 'D' THEN 11
    WHEN 'D-' THEN 12
  END;

-- Check avatar assignment
SELECT 
  COUNT(*) FILTER (WHERE avatar_url IS NOT NULL AND avatar_url != '') as players_with_avatars,
  COUNT(*) FILTER (WHERE avatar_url IS NULL OR avatar_url = '') as players_without_avatars,
  COUNT(*) as total_players
FROM profiles
WHERE role = 'player' OR role IS NULL;
