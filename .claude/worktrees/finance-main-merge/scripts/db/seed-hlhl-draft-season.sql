-- =============================================================================
-- HLHL Draft League 2026 Season Setup
-- 4 teams, 48 players (12 per team), simulated snake draft, full schedule
-- Matt Grossi = owner + captain of Orcanaughts
-- =============================================================================

BEGIN;

DO $$
DECLARE
  -- Constants
  v_league_id UUID := '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c';
  v_matt_id UUID := 'add94b26-b344-459f-9727-8cddae9783de';
  v_nick_id UUID := '1a1586d1-579c-4708-a932-235c1df1da89';
  v_winter_season_id UUID := 'f752cda2-22c0-4031-9561-6bc8bc596248';

  -- New entities
  v_season_id UUID := gen_random_uuid();
  v_division_id UUID := gen_random_uuid();
  v_frost_id UUID := gen_random_uuid();
  v_midnight_id UUID := gen_random_uuid();
  v_zamboni_id UUID := gen_random_uuid();
  v_orca_id UUID := '25cf7e85-e29d-4785-aa90-b9b49a2cc70e'; -- existing Orcanaughts

  -- Team arrays for schedule generation
  v_team_ids UUID[];
  v_team_names TEXT[];

  -- Player draft arrays (48 players, organized for snake draft)
  v_draft_pool UUID[];
  v_draft_positions TEXT[]; -- player_position enum values

  -- Captains for teams 2-4 (picked from existing players)
  v_cap2_id UUID := 'a0000002-0000-0000-0000-000000000001'; -- Connor McDavid Jr
  v_cap3_id UUID := 'a0000005-0000-0000-0000-000000000001'; -- Sidney Crosby Jr
  v_cap4_id UUID := 'a0000006-0000-0000-0000-000000000001'; -- Nathan MacKinnon Jr

  -- Loop vars
  i INT;
  j INT;
  v_team_idx INT;
  v_game_date TIMESTAMPTZ;
  v_game_id UUID;
  v_home_idx INT;
  v_away_idx INT;
  v_home_score INT;
  v_away_score INT;
  v_game_num INT := 0;
  v_scorer_id UUID;
  v_assister_id UUID;
  v_period TEXT;

  -- Schedule matchups for 4 teams (6 rounds of round-robin = 36 games)
  -- Each pair plays 6 times (3 home, 3 away)
  v_matchup_home INT[];
  v_matchup_away INT[];

BEGIN

  -- ==========================================================================
  -- 1. Archive existing Winter Puck 2026 season (skip triggers)
  -- ==========================================================================
  ALTER TABLE seasons DISABLE TRIGGER trigger_season_completed_award_badges;
  ALTER TABLE seasons DISABLE TRIGGER trigger_validate_season_registration_dates;

  UPDATE seasons
  SET status = 'archived', end_date = '2025-12-31', updated_at = NOW()
  WHERE id = v_winter_season_id;

  ALTER TABLE seasons ENABLE TRIGGER trigger_season_completed_award_badges;
  ALTER TABLE seasons ENABLE TRIGGER trigger_validate_season_registration_dates;

  -- ==========================================================================
  -- 2. Create division
  -- ==========================================================================
  INSERT INTO divisions (id, league_id, name, description, skill_level, max_teams, game_duration_minutes, period_count, created_at, updated_at)
  VALUES (v_division_id, v_league_id, 'Draft Division', 'Main draft division - 4 teams', 'intermediate', 4, 60, 3, NOW(), NOW());

  -- ==========================================================================
  -- 3. Add Matt Grossi as league member (owner role)
  -- ==========================================================================
  INSERT INTO league_memberships (league_id, user_id, role, status, joined_at)
  VALUES (v_league_id, v_matt_id, 'owner', 'active', NOW())
  ON CONFLICT (league_id, user_id) DO UPDATE SET role = 'owner', status = 'active';

  -- Also ensure Matt has admin/owner in league_ownerships if table exists
  -- Update league created_by to Matt
  UPDATE leagues SET created_by = v_matt_id, updated_at = NOW() WHERE id = v_league_id;

  -- ==========================================================================
  -- 4. Create 3 new teams + update Orcanaughts
  -- ==========================================================================

  -- Set Matt as captain of Orcanaughts
  UPDATE teams SET captain_id = v_matt_id, division_id = v_division_id,
    primary_color = '#0D7377', secondary_color = '#14FFEC', updated_at = NOW()
  WHERE id = v_orca_id;

  -- Frost Giants
  INSERT INTO teams (id, league_id, division_id, name, short_name, slug, captain_id,
    primary_color, secondary_color, max_roster_size, status, created_at, updated_at)
  VALUES (v_frost_id, v_league_id, v_division_id, 'Frost Giants', 'FRG', 'frost-giants',
    v_cap2_id, '#1B3A5C', '#A8D8EA', 15, 'active', NOW(), NOW());

  -- Midnight Slapshots
  INSERT INTO teams (id, league_id, division_id, name, short_name, slug, captain_id,
    primary_color, secondary_color, max_roster_size, status, created_at, updated_at)
  VALUES (v_midnight_id, v_league_id, v_division_id, 'Midnight Slapshots', 'MDS', 'midnight-slapshots',
    v_cap3_id, '#1A1A2E', '#E94560', 15, 'active', NOW(), NOW());

  -- Zamboni Riders
  INSERT INTO teams (id, league_id, division_id, name, short_name, slug, captain_id,
    primary_color, secondary_color, max_roster_size, status, created_at, updated_at)
  VALUES (v_zamboni_id, v_league_id, v_division_id, 'Zamboni Riders', 'ZMB', 'zamboni-riders',
    v_cap4_id, '#FF6B35', '#004E89', 15, 'active', NOW(), NOW());

  -- Team array for schedule
  v_team_ids := ARRAY[v_orca_id, v_frost_id, v_midnight_id, v_zamboni_id];
  v_team_names := ARRAY['Orcanaughts', 'Frost Giants', 'Midnight Slapshots', 'Zamboni Riders'];

  -- ==========================================================================
  -- 5. Create new season
  -- ==========================================================================
  INSERT INTO seasons (
    id, league_id, name, start_date, end_date, status,
    registration_type,
    max_players_per_team, period_count, period_length_minutes,
    game_duration_minutes, schedule_generated, created_at, updated_at
  ) VALUES (
    v_season_id, v_league_id, 'Draft League 2026',
    '2026-01-05', '2026-08-30', 'active',
    'draft',
    15, 3, 15, 60, true, NOW(), NOW()
  );

  -- ==========================================================================
  -- 6. Snake draft simulation - assign 48 players to 4 teams
  -- Players sorted by "draft value" then snake-drafted
  -- ==========================================================================

  -- Draft pool: 48 players (4 captains pre-assigned + 44 drafted)
  -- Organized by tiers for realistic snake draft

  -- Pre-assign captains as team_rosters
  -- Team 1: Orcanaughts - Matt Grossi (C)
  INSERT INTO team_rosters (team_id, player_id, season_id, league_id, division_id,
    jersey_number, position, leadership_role, status, player_type, start_date, joined_at)
  VALUES (v_orca_id, v_matt_id, v_season_id, v_league_id, v_division_id,
    16, 'Forward', 'captain', 'active', 'regular', '2026-01-05', NOW());

  -- Team 2: Frost Giants - Connor McDavid Jr (C)
  INSERT INTO team_rosters (team_id, player_id, season_id, league_id, division_id,
    jersey_number, position, leadership_role, status, player_type, start_date, joined_at)
  VALUES (v_frost_id, v_cap2_id, v_season_id, v_league_id, v_division_id,
    97, 'Forward', 'captain', 'active', 'regular', '2026-01-05', NOW());

  -- Team 3: Midnight Slapshots - Sidney Crosby Jr (C)
  INSERT INTO team_rosters (team_id, player_id, season_id, league_id, division_id,
    jersey_number, position, leadership_role, status, player_type, start_date, joined_at)
  VALUES (v_midnight_id, v_cap3_id, v_season_id, v_league_id, v_division_id,
    87, 'Forward', 'captain', 'active', 'regular', '2026-01-05', NOW());

  -- Team 4: Zamboni Riders - Nathan MacKinnon Jr (C)
  INSERT INTO team_rosters (team_id, player_id, season_id, league_id, division_id,
    jersey_number, position, leadership_role, status, player_type, start_date, joined_at)
  VALUES (v_zamboni_id, v_cap4_id, v_season_id, v_league_id, v_division_id,
    29, 'Forward', 'captain', 'active', 'regular', '2026-01-05', NOW());

  -- Snake draft: remaining 44 players
  -- Ordering: stars first, balanced by position
  -- Round 1 (T1→T4): Kucherov→Orca, Draisaitl→Frost, Matthews→Midnight, Vasilevskiy→Zamboni
  -- Round 2 (T4→T1): Marner→Zamboni, Point→Midnight, Landeskog→Frost, Rantanen→Orca
  -- etc.

  v_draft_pool := ARRAY[
    -- Round 1 picks (T1,T2,T3,T4)
    'a0000007-0000-0000-0000-000000000001'::UUID, -- Kucherov (RW) → Orca
    'a0000008-0000-0000-0000-000000000001'::UUID, -- Draisaitl (C) → Frost
    'a0000004-0000-0000-0000-000000000001'::UUID, -- Matthews (C) → Midnight
    'a0000007-0000-0000-0000-000000000002'::UUID, -- Point (C) → Zamboni
    -- Round 2 picks (T4,T3,T2,T1)
    'a0000006-0000-0000-0000-000000000002'::UUID, -- Landeskog (LW) → Zamboni
    'a0000004-0000-0000-0000-000000000002'::UUID, -- Marner (RW) → Midnight
    'a0000003-0000-0000-0000-000000000001'::UUID, -- Kadri (C) → Frost
    'a0000006-0000-0000-0000-000000000003'::UUID, -- Rantanen (RW) → Orca
    -- Round 3 (T1,T2,T3,T4) - Defense + Goalies
    'a0000006-0000-0000-0000-000000000004'::UUID, -- Cale Makar (D) → Orca
    'a0000007-0000-0000-0000-000000000004'::UUID, -- Hedman (D) → Frost
    'a0000007-0000-0000-0000-000000000003'::UUID, -- Stamkos (LW) → Midnight
    'a0000004-0000-0000-0000-000000000003'::UUID, -- Nylander (LW) → Zamboni
    -- Round 4 (T4,T3,T2,T1)
    'a0000007-0000-0000-0000-000000000002'::UUID, -- (already used, skip - use backup)
    'a0000005-0000-0000-0000-000000000002'::UUID, -- Guentzel (LW) → Midnight
    'a0000002-0000-0000-0000-000000000002'::UUID, -- M. Wheeler (LW) → Frost
    'a0000001-0000-0000-0000-000000000001'::UUID, -- Wayne Gretzky Jr (C) → Orca
    -- Round 5 (T1,T2,T3,T4) - Defense heavy
    'a0000005-0000-0000-0000-000000000004'::UUID, -- Letang (D) → Orca
    'a0000002-0000-0000-0000-000000000004'::UUID, -- Morrissey (D) → Frost
    'a0000004-0000-0000-0000-000000000004'::UUID, -- Rielly (D) → Midnight
    'a0000008-0000-0000-0000-000000000004'::UUID, -- Nurse (D) → Zamboni
    -- Round 6 (T4,T3,T2,T1)
    'a0000003-0000-0000-0000-000000000004'::UUID, -- Andersson (D) → Zamboni
    'a0000004-0000-0000-0000-000000000005'::UUID, -- McCabe (D) → Midnight
    'a0000002-0000-0000-0000-000000000005'::UUID, -- Pionk (D) → Frost
    'a0000001-0000-0000-0000-000000000004'::UUID, -- Derek Mason (D) → Orca
    -- Round 7 (T1,T2,T3,T4) - Goalies
    'a0000007-0000-0000-0000-000000000005'::UUID, -- Sergachev (D) → Orca
    'a0000002-0000-0000-0000-000000000006'::UUID, -- Hellebuyck (G) → Frost
    'a0000003-0000-0000-0000-000000000006'::UUID, -- Markstrom (G) → Midnight
    'a0000006-0000-0000-0000-000000000006'::UUID, -- Georgiev (G) → Zamboni
    -- Round 8 (T4,T3,T2,T1)
    'a0000008-0000-0000-0000-000000000006'::UUID, -- Skinner (G) → Zamboni
    'a0000005-0000-0000-0000-000000000006'::UUID, -- Jarry (G) → Midnight
    'a0000004-0000-0000-0000-000000000006'::UUID, -- Woll (G) → Frost
    'a0000001-0000-0000-0000-000000000006'::UUID, -- Ryan Goalie (G) → Orca
    -- Round 9 (T1,T2,T3,T4) - Remaining forwards
    'a0000001-0000-0000-0000-000000000003'::UUID, -- Jake Thompson (RW) → Orca
    'a0000002-0000-0000-0000-000000000003'::UUID, -- Scheifele (RW) → Frost
    'a0000005-0000-0000-0000-000000000003'::UUID, -- Rust (RW) → Midnight
    'a0000003-0000-0000-0000-000000000003'::UUID, -- Toffoli (RW) → Zamboni
    -- Round 10 (T4,T3,T2,T1)
    'a0000008-0000-0000-0000-000000000003'::UUID, -- Nugent-Hopkins (RW) → Zamboni
    'a0000005-0000-0000-0000-000000000005'::UUID, -- Pettersson (D) → Midnight
    'a0000008-0000-0000-0000-000000000005'::UUID, -- Bouchard (D) → Frost
    'a0000006-0000-0000-0000-000000000005'::UUID, -- Toews (D) → Orca
    -- Round 11 (T1,T2,T3,T4) - remaining
    'a0000001-0000-0000-0000-000000000002'::UUID, -- Mike Sullivan (LW) → Orca
    'a0000003-0000-0000-0000-000000000002'::UUID, -- Huberdeau (LW) → Frost
    'a0000008-0000-0000-0000-000000000002'::UUID, -- Hyman (LW) → Midnight
    'a0000003-0000-0000-0000-000000000005'::UUID  -- Weegar (D) → Zamboni
  ];

  v_draft_positions := ARRAY[
    'Forward','Forward','Forward','Forward',  -- Rd1
    'Forward','Forward','Forward','Forward',  -- Rd2
    'Defense','Defense','Forward','Forward',  -- Rd3
    'Forward','Forward','Forward','Forward',  -- Rd4 (placeholder)
    'Defense','Defense','Defense','Defense',   -- Rd5
    'Defense','Defense','Defense','Defense',   -- Rd6
    'Defense','Goalie','Goalie','Goalie',     -- Rd7
    'Goalie','Goalie','Goalie','Goalie',      -- Rd8
    'Forward','Forward','Forward','Forward',  -- Rd9
    'Forward','Defense','Defense','Defense',   -- Rd10
    'Forward','Forward','Forward','Defense'   -- Rd11
  ];

  -- Insert draft picks into team_rosters using snake order
  FOR i IN 1..44 LOOP
    -- Snake draft: odd rounds go 1,2,3,4; even rounds go 4,3,2,1
    DECLARE
      v_round INT := ((i - 1) / 4) + 1;
      v_pick_in_round INT := ((i - 1) % 4) + 1;
      v_target_team INT;
      v_jersey INT;
    BEGIN
      IF v_round % 2 = 1 THEN
        v_target_team := v_pick_in_round; -- 1,2,3,4
      ELSE
        v_target_team := 5 - v_pick_in_round; -- 4,3,2,1
      END IF;

      v_jersey := 20 + i;

      INSERT INTO team_rosters (team_id, player_id, season_id, league_id, division_id,
        jersey_number, position, status, player_type, start_date, joined_at)
      VALUES (
        v_team_ids[v_target_team], v_draft_pool[i], v_season_id, v_league_id, v_division_id,
        v_jersey, v_draft_positions[i]::player_position, 'active', 'regular', '2026-01-05', NOW()
      );
    END;
  END LOOP;

  -- ==========================================================================
  -- 7. Generate league memberships for all players
  -- ==========================================================================
  -- Ensure all rostered players have league memberships
  INSERT INTO league_memberships (league_id, user_id, role, status, joined_at)
  SELECT DISTINCT v_league_id, tr.player_id, 'player', 'active', NOW()
  FROM team_rosters tr
  WHERE tr.league_id = v_league_id AND tr.season_id = v_season_id
  ON CONFLICT (league_id, user_id) DO NOTHING;

  -- ==========================================================================
  -- 8. Generate round-robin schedule
  -- 4 teams, each pair plays 6 times = 36 total games
  -- 2 games per Thursday night, 18 weeks
  -- Jan 8 through May 14, 2026
  -- ==========================================================================

  -- Build matchup arrays: 6 complete round-robins
  -- Single round-robin for 4 teams: (1v2,3v4), (1v3,4v2), (1v4,2v3)
  -- Repeat 6 times alternating home/away
  v_matchup_home := ARRAY[
    -- RR1
    1,3, 1,4, 1,2,
    -- RR2 (reversed)
    2,4, 3,2, 4,3,
    -- RR3
    1,3, 1,4, 1,2,
    -- RR4 (reversed)
    2,4, 3,2, 4,3,
    -- RR5
    1,3, 1,4, 1,2,
    -- RR6 (reversed)
    2,4, 3,2, 4,3
  ];
  v_matchup_away := ARRAY[
    -- RR1
    2,4, 3,2, 4,3,
    -- RR2
    1,3, 1,4, 1,2,
    -- RR3
    2,4, 3,2, 4,3,
    -- RR4
    1,3, 1,4, 1,2,
    -- RR5
    2,4, 3,2, 4,3,
    -- RR6
    1,3, 1,4, 1,2
  ];

  -- Generate 36 games (2 per Thursday, 18 Thursdays)
  FOR i IN 1..36 LOOP
    v_game_num := i;
    v_home_idx := v_matchup_home[i];
    v_away_idx := v_matchup_away[i];

    -- 2 games per Thursday: 8:30 PM and 10:00 PM ET
    -- Starting Jan 8, 2026
    v_game_date := ('2026-01-08 20:30:00-05'::TIMESTAMPTZ)
                   + (((i - 1) / 2) * INTERVAL '7 days')
                   + (((i - 1) % 2) * INTERVAL '90 minutes');

    -- Games before Feb 16 are completed
    IF v_game_date < '2026-02-16'::TIMESTAMPTZ THEN
      -- Generate random-ish scores (1-7 goals each)
      v_home_score := 1 + ((i * 3 + 7) % 6);
      v_away_score := 1 + ((i * 5 + 3) % 5);

      INSERT INTO games (
        id, league_id, season_id, division_id,
        home_team_id, away_team_id, scheduled_at, location,
        home_score, away_score, status, game_number, game_type,
        period_count, game_started_at, game_ended_at,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_league_id, v_season_id, v_division_id,
        v_team_ids[v_home_idx], v_team_ids[v_away_idx],
        v_game_date, 'HLHL Arena',
        v_home_score, v_away_score, 'completed', v_game_num, 'regular',
        3, v_game_date, v_game_date + INTERVAL '75 minutes',
        NOW(), NOW()
      );
    ELSE
      INSERT INTO games (
        id, league_id, season_id, division_id,
        home_team_id, away_team_id, scheduled_at, location,
        status, game_number, game_type, period_count,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_league_id, v_season_id, v_division_id,
        v_team_ids[v_home_idx], v_team_ids[v_away_idx],
        v_game_date, 'HLHL Arena',
        'scheduled', v_game_num, 'regular', 3,
        NOW(), NOW()
      );
    END IF;
  END LOOP;

  -- ==========================================================================
  -- 9. Generate game_stats for completed games
  -- ==========================================================================
  FOR v_game_id, v_home_score, v_away_score, v_game_date IN
    SELECT g.id, g.home_score, g.away_score, g.scheduled_at
    FROM games g
    WHERE g.season_id = v_season_id AND g.status = 'completed'
    ORDER BY g.game_number
  LOOP
    -- Home team goals
    FOR j IN 1..v_home_score LOOP
      -- Pick scorer from home team roster
      SELECT tr.player_id INTO v_scorer_id
      FROM team_rosters tr
      JOIN games gm ON gm.home_team_id = tr.team_id
      WHERE gm.id = v_game_id AND tr.season_id = v_season_id
        AND tr.position != 'Goalie' AND tr.status = 'active'
      ORDER BY random()
      LIMIT 1;

      -- Pick assister
      SELECT tr.player_id INTO v_assister_id
      FROM team_rosters tr
      JOIN games gm ON gm.home_team_id = tr.team_id
      WHERE gm.id = v_game_id AND tr.season_id = v_season_id
        AND tr.player_id != v_scorer_id
        AND tr.position != 'Goalie' AND tr.status = 'active'
      ORDER BY random()
      LIMIT 1;

      v_period := CASE WHEN j <= v_home_score/3 + 1 THEN '1'
                       WHEN j <= 2*v_home_score/3 + 1 THEN '2'
                       ELSE '3' END;

      INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
        stat_type, team_type, period, value, timestamp)
      VALUES (v_game_id, v_league_id,
        (SELECT home_team_id FROM games WHERE id = v_game_id),
        v_scorer_id, v_matt_id, 'Goal', 'home', v_period, 1, v_game_date);

      IF v_assister_id IS NOT NULL THEN
        INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
          stat_type, team_type, period, value, timestamp)
        VALUES (v_game_id, v_league_id,
          (SELECT home_team_id FROM games WHERE id = v_game_id),
          v_assister_id, v_matt_id, 'Assist', 'home', v_period, 1, v_game_date);
      END IF;
    END LOOP;

    -- Away team goals
    FOR j IN 1..v_away_score LOOP
      SELECT tr.player_id INTO v_scorer_id
      FROM team_rosters tr
      JOIN games gm ON gm.away_team_id = tr.team_id
      WHERE gm.id = v_game_id AND tr.season_id = v_season_id
        AND tr.position != 'Goalie' AND tr.status = 'active'
      ORDER BY random()
      LIMIT 1;

      SELECT tr.player_id INTO v_assister_id
      FROM team_rosters tr
      JOIN games gm ON gm.away_team_id = tr.team_id
      WHERE gm.id = v_game_id AND tr.season_id = v_season_id
        AND tr.player_id != v_scorer_id
        AND tr.position != 'Goalie' AND tr.status = 'active'
      ORDER BY random()
      LIMIT 1;

      v_period := CASE WHEN j <= v_away_score/3 + 1 THEN '1'
                       WHEN j <= 2*v_away_score/3 + 1 THEN '2'
                       ELSE '3' END;

      INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
        stat_type, team_type, period, value, timestamp)
      VALUES (v_game_id, v_league_id,
        (SELECT away_team_id FROM games WHERE id = v_game_id),
        v_scorer_id, v_matt_id, 'Goal', 'away', v_period, 1, v_game_date);

      IF v_assister_id IS NOT NULL THEN
        INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
          stat_type, team_type, period, value, timestamp)
        VALUES (v_game_id, v_league_id,
          (SELECT away_team_id FROM games WHERE id = v_game_id),
          v_assister_id, v_matt_id, 'Assist', 'away', v_period, 1, v_game_date);
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '=== HLHL Draft League 2026 Setup Complete ===';
  RAISE NOTICE 'Season: Draft League 2026 (Jan 5 - Aug 30, 2026)';
  RAISE NOTICE 'Teams: Orcanaughts, Frost Giants, Midnight Slapshots, Zamboni Riders';
  RAISE NOTICE 'Players: 48 (12 per team via snake draft)';
  RAISE NOTICE 'Games: 36 (completed + scheduled)';
  RAISE NOTICE 'Matt Grossi = owner + captain of Orcanaughts';

END;
$$;

COMMIT;
