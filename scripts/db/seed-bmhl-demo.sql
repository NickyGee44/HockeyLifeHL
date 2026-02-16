-- =============================================================================
-- BMHL Demo Data Seed
-- Builds on existing BMHL league (bbbbbbbb-...) with 8 divisions, 25 teams
-- Adds: venues, players, rosters, games, payments, scorekeepers, game stats
--
-- Prerequisites: Run setup_bmhl_league_WORKING.sql first (league + divisions + teams)
--
-- NOTE: Production BMHL uses different UUIDs:
--   League: b0000000-0000-0000-0000-000000000002
--   Season: b0000000-0000-0000-0000-000000000003
-- This script uses bbbbbbbb-... / cccccccc-... for the setup_bmhl_league_WORKING.sql IDs.
-- For production, the game stats and payments were seeded directly (see session logs).
--
-- Focus divisions for demo: Division A (3 teams) and Division B (3 teams)
-- =============================================================================

BEGIN;

DO $$
DECLARE
  -- BMHL constants
  v_league_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_season_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  -- Division IDs (looked up)
  v_div_a_id UUID;
  v_div_b_id UUID;

  -- Team IDs (looked up)
  v_teams_a UUID[];  -- Division A: Bandits, Kraken, Steelheads
  v_teams_b UUID[];  -- Division B: No Stars, Brewers, Dickens
  v_all_demo_teams UUID[];

  -- Venues
  v_venue1_id UUID := gen_random_uuid();
  v_venue2_id UUID := gen_random_uuid();
  v_venue3_id UUID := gen_random_uuid();

  -- Season fee
  v_fee_id UUID := gen_random_uuid();

  -- Scorekeeper profiles
  v_sk1_id UUID := gen_random_uuid();
  v_sk2_id UUID := gen_random_uuid();

  -- Player generation
  v_player_id UUID;
  v_roster_id UUID;
  v_team_id UUID;
  v_div_id UUID;
  v_jersey INT;
  v_position TEXT;
  v_first_names TEXT[] := ARRAY[
    'Mike','Dave','Steve','Chris','Ryan','Matt','Dan','Tom','Jeff','Mark',
    'Jason','Kevin','Brian','Tyler','Scott','Brad','Justin','James','Nick','Adam',
    'Rob','Pete','Kyle','Alex','Eric','Jake','Joe','Sean','Pat','Trevor',
    'Luke','Cody','Derek','Craig','Doug','Shane','Tony','Wade','Brent','Ian',
    'Andrew','Grant','Corey','Travis','Paul','Greg','Barry','Keith','Jay','Todd',
    'Liam','Nate','Zach','Cole','Drew','Blake','Chase','Owen','Sam','Jesse',
    'Mitch','Gavin','Riley','Evan','Ben','Colton','Hunter','Bryce','Connor','Dylan',
    'Carter','Mason','Logan','Wyatt','Ethan','Caleb','Noah','Jack','Max','Leo'
  ];
  v_last_names TEXT[] := ARRAY[
    'Johnson','Smith','Brown','Wilson','Anderson','Taylor','Thomas','Moore','Martin','Thompson',
    'White','Harris','Clark','Lewis','Walker','Hall','Young','Allen','King','Wright',
    'Scott','Green','Baker','Adams','Nelson','Hill','Campbell','Mitchell','Roberts','Carter',
    'Phillips','Evans','Turner','Torres','Parker','Collins','Edwards','Stewart','Morris','Murphy',
    'Cook','Rogers','Morgan','Peterson','Cooper','Reed','Bailey','Bell','Howard','Ward',
    'Sullivan','Ross','Price','Bennett','Wood','Brooks','Gray','Watson','Sanders','Kelly',
    'Murray','Burns','Reid','Fraser','Marshall','Shaw','Hunt','Graham','Lawson','Dixon',
    'Mills','Stone','Fox','Webb','Walsh','Burke','Hayes','Lynch','Barrett','Dunn'
  ];

  -- Loop vars
  i INT;
  j INT;
  v_game_id UUID;
  v_game_date TIMESTAMPTZ;
  v_home_idx INT;
  v_away_idx INT;
  v_home_score INT;
  v_away_score INT;
  v_game_num INT := 0;
  v_status TEXT;
  v_scorer_id UUID;
  v_assister_id UUID;
  v_period TEXT;
  v_player_idx INT := 0;

BEGIN

  -- ==========================================================================
  -- 1. Look up division and team IDs
  -- ==========================================================================
  SELECT id INTO v_div_a_id FROM divisions
    WHERE league_id = v_league_id AND name = 'Division A';
  SELECT id INTO v_div_b_id FROM divisions
    WHERE league_id = v_league_id AND name = 'Division B';

  IF v_div_a_id IS NULL OR v_div_b_id IS NULL THEN
    RAISE EXCEPTION 'BMHL divisions not found. Run setup_bmhl_league_WORKING.sql first.';
  END IF;

  -- Get Division A team IDs (Bandits, Kraken, Steelheads)
  SELECT ARRAY_AGG(id ORDER BY name) INTO v_teams_a
    FROM teams WHERE league_id = v_league_id AND division_id = v_div_a_id;

  -- Get Division B team IDs (Brewers, Dickens, No Stars)
  SELECT ARRAY_AGG(id ORDER BY name) INTO v_teams_b
    FROM teams WHERE league_id = v_league_id AND division_id = v_div_b_id;

  IF array_length(v_teams_a, 1) < 3 OR array_length(v_teams_b, 1) < 3 THEN
    RAISE EXCEPTION 'Expected 3 teams per division. Found A=%, B=%',
      array_length(v_teams_a, 1), array_length(v_teams_b, 1);
  END IF;

  v_all_demo_teams := v_teams_a || v_teams_b;

  RAISE NOTICE 'Div A teams: %, Div B teams: %',
    array_length(v_teams_a, 1), array_length(v_teams_b, 1);

  -- ==========================================================================
  -- 2. Create venues
  -- ==========================================================================
  INSERT INTO venues (id, league_id, name, address, city, state_province, country, postal_code, number_of_rinks, created_at)
  VALUES
    (v_venue1_id, v_league_id, 'Barrie Molson Centre', '555 Bayview Dr', 'Barrie', 'ON', 'Canada', 'L4N 8Y2', 2, NOW()),
    (v_venue2_id, v_league_id, 'East Bayfield Arena', '80 Livingstone St E', 'Barrie', 'ON', 'Canada', 'L4M 6X9', 1, NOW()),
    (v_venue3_id, v_league_id, 'Allandale Recreation Centre', '190 Bayview Dr', 'Barrie', 'ON', 'Canada', 'L4M 3B1', 1, NOW())
  ON CONFLICT DO NOTHING;

  -- ==========================================================================
  -- 3. Create scorekeeper profiles
  -- ==========================================================================
  INSERT INTO profiles (id, email, full_name, created_at, updated_at)
  VALUES
    (v_sk1_id, 'scorekeeper1.bmhl@demo.beerleaguehockey.ca', 'Dave Scorekeeper', NOW(), NOW()),
    (v_sk2_id, 'scorekeeper2.bmhl@demo.beerleaguehockey.ca', 'Mike Scorekeeper', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Add scorekeepers as league members
  INSERT INTO league_memberships (league_id, user_id, role, status, joined_at)
  VALUES
    (v_league_id, v_sk1_id, 'manager', 'active', NOW()),
    (v_league_id, v_sk2_id, 'manager', 'active', NOW())
  ON CONFLICT (league_id, user_id) DO NOTHING;

  -- ==========================================================================
  -- 4. Create player profiles and rosters (13 skaters + 2 goalies per team)
  -- ==========================================================================

  FOR i IN 1..6 LOOP
    v_team_id := v_all_demo_teams[i];
    v_div_id := CASE WHEN i <= 3 THEN v_div_a_id ELSE v_div_b_id END;

    FOR j IN 1..15 LOOP
      v_player_idx := v_player_idx + 1;
      v_player_id := gen_random_uuid();

      -- Position: 7 forwards, 6 defense, 2 goalies per team
      IF j <= 7 THEN
        v_position := 'Forward';
      ELSIF j <= 13 THEN
        v_position := 'Defense';
      ELSE
        v_position := 'Goalie';
      END IF;

      -- Jersey: team offset + player number
      v_jersey := (i - 1) * 20 + j;

      -- Create profile
      INSERT INTO profiles (id, email, full_name, position, jersey_number, created_at, updated_at)
      VALUES (
        v_player_id,
        'player' || v_player_idx || '.bmhl@demo.beerleaguehockey.ca',
        v_first_names[((v_player_idx - 1) % 80) + 1] || ' ' || v_last_names[((v_player_idx - 1) % 80) + 1],
        v_position,
        v_jersey,
        NOW(), NOW()
      ) ON CONFLICT (id) DO NOTHING;

      -- Add to league
      INSERT INTO league_memberships (league_id, user_id, role, status, joined_at)
      VALUES (v_league_id, v_player_id, 'player', 'active', NOW())
      ON CONFLICT (league_id, user_id) DO NOTHING;

      -- Add to roster
      INSERT INTO team_rosters (
        team_id, player_id, season_id, league_id, division_id,
        jersey_number, position, leadership_role, status, player_type,
        start_date, joined_at
      ) VALUES (
        v_team_id, v_player_id, v_season_id, v_league_id, v_div_id,
        v_jersey,
        v_position::player_position,
        CASE
          WHEN j = 1 THEN 'captain'
          WHEN j = 2 THEN 'alternate_captain'
          ELSE NULL
        END,
        'active', 'regular',
        '2026-02-01', NOW()
      );

      -- Set captain_id on team for j=1
      IF j = 1 THEN
        UPDATE teams SET captain_id = v_player_id, updated_at = NOW()
        WHERE id = v_team_id;
      END IF;

    END LOOP;
  END LOOP;

  RAISE NOTICE 'Created % player profiles and rosters', v_player_idx;

  -- ==========================================================================
  -- 5. Generate games for Division A and Division B
  -- 3 teams per division: each pair plays 4 times = 12 games per division
  -- Total: 24 games across both divisions
  -- Mix: 10 completed, 2 postponed, 1 cancelled, 11 scheduled
  -- ==========================================================================

  -- Division A games
  DECLARE
    v_matchups INT[][] := ARRAY[
      -- Div A: teams[1] vs teams[2], teams[1] vs teams[3], teams[2] vs teams[3] x 4
      ARRAY[1,2], ARRAY[3,1], ARRAY[2,3],  -- Week 1 (completed)
      ARRAY[2,1], ARRAY[1,3], ARRAY[3,2],  -- Week 2 (completed)
      ARRAY[1,2], ARRAY[3,1], ARRAY[2,3],  -- Week 3 (mix: 2 completed, 1 postponed)
      ARRAY[2,1], ARRAY[1,3], ARRAY[3,2]   -- Week 4 (scheduled + cancelled)
    ];
    v_venue_names TEXT[] := ARRAY['Barrie Molson Centre', 'East Bayfield Arena', 'Allandale Recreation Centre'];
    v_game_statuses TEXT[];
  BEGIN
    -- Define status for each game slot (12 games per division)
    -- Div A: 5 completed, 1 postponed, 1 cancelled, 5 scheduled
    v_game_statuses := ARRAY[
      'completed','completed','completed',   -- Week 1
      'completed','completed','completed',   -- Week 2
      'completed','postponed','completed',   -- Week 3
      'scheduled','cancelled','scheduled'    -- Week 4 (future)
    ];

    -- Division A
    FOR i IN 1..12 LOOP
      v_game_num := v_game_num + 1;
      v_home_idx := v_matchups[i][1];
      v_away_idx := v_matchups[i][2];
      v_status := v_game_statuses[i];

      -- Games on Tuesdays: Feb 3, 10, 17, 24
      v_game_date := ('2026-02-03 20:00:00-05'::TIMESTAMPTZ)
                     + (((i - 1) / 3) * INTERVAL '7 days')
                     + (((i - 1) % 3) * INTERVAL '90 minutes');

      v_game_id := gen_random_uuid();

      IF v_status = 'completed' THEN
        v_home_score := 2 + ((i * 3 + 5) % 5);
        v_away_score := 1 + ((i * 7 + 2) % 4);

        INSERT INTO games (
          id, league_id, season_id, division_id,
          home_team_id, away_team_id, scheduled_at, location,
          home_score, away_score, status, game_number, game_type,
          period_count, game_started_at, game_ended_at,
          created_at, updated_at
        ) VALUES (
          v_game_id, v_league_id, v_season_id, v_div_a_id,
          v_teams_a[v_home_idx], v_teams_a[v_away_idx],
          v_game_date, v_venue_names[((i - 1) % 3) + 1],
          v_home_score, v_away_score, 'completed', v_game_num, 'regular',
          3, v_game_date, v_game_date + INTERVAL '75 minutes',
          NOW(), NOW()
        );

        -- Generate game stats for completed games
        -- Home team goals
        FOR j IN 1..v_home_score LOOP
          SELECT tr.player_id INTO v_scorer_id
          FROM team_rosters tr
          WHERE tr.team_id = v_teams_a[v_home_idx] AND tr.season_id = v_season_id
            AND tr.position != 'Goalie' AND tr.status = 'active'
          ORDER BY random() LIMIT 1;

          SELECT tr.player_id INTO v_assister_id
          FROM team_rosters tr
          WHERE tr.team_id = v_teams_a[v_home_idx] AND tr.season_id = v_season_id
            AND tr.player_id != v_scorer_id
            AND tr.position != 'Goalie' AND tr.status = 'active'
          ORDER BY random() LIMIT 1;

          v_period := CASE WHEN j <= 2 THEN '1' WHEN j <= 4 THEN '2' ELSE '3' END;

          INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
            stat_type, team_type, period, value, timestamp)
          VALUES (v_game_id, v_league_id, v_teams_a[v_home_idx], v_scorer_id, v_sk1_id,
            'Goal', 'home', v_period, 1, v_game_date);

          IF v_assister_id IS NOT NULL THEN
            INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
              stat_type, team_type, period, value, timestamp)
            VALUES (v_game_id, v_league_id, v_teams_a[v_home_idx], v_assister_id, v_sk1_id,
              'Assist', 'home', v_period, 1, v_game_date);
          END IF;
        END LOOP;

        -- Away team goals
        FOR j IN 1..v_away_score LOOP
          SELECT tr.player_id INTO v_scorer_id
          FROM team_rosters tr
          WHERE tr.team_id = v_teams_a[v_away_idx] AND tr.season_id = v_season_id
            AND tr.position != 'Goalie' AND tr.status = 'active'
          ORDER BY random() LIMIT 1;

          SELECT tr.player_id INTO v_assister_id
          FROM team_rosters tr
          WHERE tr.team_id = v_teams_a[v_away_idx] AND tr.season_id = v_season_id
            AND tr.player_id != v_scorer_id
            AND tr.position != 'Goalie' AND tr.status = 'active'
          ORDER BY random() LIMIT 1;

          v_period := CASE WHEN j <= 2 THEN '1' WHEN j <= 4 THEN '2' ELSE '3' END;

          INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
            stat_type, team_type, period, value, timestamp)
          VALUES (v_game_id, v_league_id, v_teams_a[v_away_idx], v_scorer_id, v_sk1_id,
            'Goal', 'away', v_period, 1, v_game_date);

          IF v_assister_id IS NOT NULL THEN
            INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
              stat_type, team_type, period, value, timestamp)
            VALUES (v_game_id, v_league_id, v_teams_a[v_away_idx], v_assister_id, v_sk1_id,
              'Assist', 'away', v_period, 1, v_game_date);
          END IF;
        END LOOP;

        -- Assign scorekeeper to completed games
        INSERT INTO game_scorekeeper_assignments (
          game_id, league_id, scorekeeper_id, assigned_by,
          assigned_at, checked_in_at, started_at, completed_at,
          payment_amount, payment_status
        ) VALUES (
          v_game_id, v_league_id, v_sk1_id, v_sk1_id,
          v_game_date - INTERVAL '2 days', v_game_date - INTERVAL '15 minutes',
          v_game_date, v_game_date + INTERVAL '75 minutes',
          2500, 'paid'
        );

      ELSIF v_status = 'postponed' THEN
        INSERT INTO games (
          id, league_id, season_id, division_id,
          home_team_id, away_team_id, scheduled_at, location,
          status, game_number, game_type, period_count,
          cancellation_reason,
          created_at, updated_at
        ) VALUES (
          v_game_id, v_league_id, v_season_id, v_div_a_id,
          v_teams_a[v_home_idx], v_teams_a[v_away_idx],
          v_game_date, v_venue_names[((i - 1) % 3) + 1],
          'postponed', v_game_num, 'regular', 3,
          'Weather cancellation - unsafe ice conditions',
          NOW(), NOW()
        );

      ELSIF v_status = 'cancelled' THEN
        INSERT INTO games (
          id, league_id, season_id, division_id,
          home_team_id, away_team_id, scheduled_at, location,
          status, game_number, game_type, period_count,
          created_at, updated_at
        ) VALUES (
          v_game_id, v_league_id, v_season_id, v_div_a_id,
          v_teams_a[v_home_idx], v_teams_a[v_away_idx],
          v_game_date, v_venue_names[((i - 1) % 3) + 1],
          'cancelled', v_game_num, 'regular', 3,
          NOW(), NOW()
        );

      ELSE -- scheduled
        INSERT INTO games (
          id, league_id, season_id, division_id,
          home_team_id, away_team_id, scheduled_at, location,
          status, game_number, game_type, period_count,
          created_at, updated_at
        ) VALUES (
          v_game_id, v_league_id, v_season_id, v_div_a_id,
          v_teams_a[v_home_idx], v_teams_a[v_away_idx],
          v_game_date, v_venue_names[((i - 1) % 3) + 1],
          'scheduled', v_game_num, 'regular', 3,
          NOW(), NOW()
        );

        -- Assign scorekeeper to upcoming scheduled games
        INSERT INTO game_scorekeeper_assignments (
          game_id, league_id, scorekeeper_id, assigned_by,
          assigned_at, payment_amount, payment_status
        ) VALUES (
          v_game_id, v_league_id,
          CASE WHEN i % 2 = 0 THEN v_sk1_id ELSE v_sk2_id END,
          v_sk1_id,
          NOW(), 2500, 'pending'
        );
      END IF;
    END LOOP;

    -- Division B games (same pattern, different teams, Thursdays)
    v_game_statuses := ARRAY[
      'completed','completed','completed',   -- Week 1
      'completed','completed','postponed',   -- Week 2
      'completed','completed','scheduled',   -- Week 3
      'scheduled','scheduled','scheduled'    -- Week 4
    ];

    FOR i IN 1..12 LOOP
      v_game_num := v_game_num + 1;
      v_home_idx := v_matchups[i][1];
      v_away_idx := v_matchups[i][2];
      v_status := v_game_statuses[i];

      -- Games on Thursdays: Feb 5, 12, 19, 26
      v_game_date := ('2026-02-05 20:00:00-05'::TIMESTAMPTZ)
                     + (((i - 1) / 3) * INTERVAL '7 days')
                     + (((i - 1) % 3) * INTERVAL '90 minutes');

      v_game_id := gen_random_uuid();

      IF v_status = 'completed' THEN
        v_home_score := 3 + ((i * 2 + 1) % 4);
        v_away_score := 1 + ((i * 3 + 5) % 5);

        INSERT INTO games (
          id, league_id, season_id, division_id,
          home_team_id, away_team_id, scheduled_at, location,
          home_score, away_score, status, game_number, game_type,
          period_count, game_started_at, game_ended_at,
          created_at, updated_at
        ) VALUES (
          v_game_id, v_league_id, v_season_id, v_div_b_id,
          v_teams_b[v_home_idx], v_teams_b[v_away_idx],
          v_game_date, v_venue_names[((i - 1) % 3) + 1],
          v_home_score, v_away_score, 'completed', v_game_num, 'regular',
          3, v_game_date, v_game_date + INTERVAL '75 minutes',
          NOW(), NOW()
        );

        -- Game stats for Div B completed games
        FOR j IN 1..v_home_score LOOP
          SELECT tr.player_id INTO v_scorer_id
          FROM team_rosters tr
          WHERE tr.team_id = v_teams_b[v_home_idx] AND tr.season_id = v_season_id
            AND tr.position != 'Goalie' AND tr.status = 'active'
          ORDER BY random() LIMIT 1;

          SELECT tr.player_id INTO v_assister_id
          FROM team_rosters tr
          WHERE tr.team_id = v_teams_b[v_home_idx] AND tr.season_id = v_season_id
            AND tr.player_id != v_scorer_id AND tr.position != 'Goalie' AND tr.status = 'active'
          ORDER BY random() LIMIT 1;

          v_period := CASE WHEN j <= 2 THEN '1' WHEN j <= 4 THEN '2' ELSE '3' END;

          INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
            stat_type, team_type, period, value, timestamp)
          VALUES (v_game_id, v_league_id, v_teams_b[v_home_idx], v_scorer_id, v_sk2_id,
            'Goal', 'home', v_period, 1, v_game_date);

          IF v_assister_id IS NOT NULL THEN
            INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
              stat_type, team_type, period, value, timestamp)
            VALUES (v_game_id, v_league_id, v_teams_b[v_home_idx], v_assister_id, v_sk2_id,
              'Assist', 'home', v_period, 1, v_game_date);
          END IF;
        END LOOP;

        FOR j IN 1..v_away_score LOOP
          SELECT tr.player_id INTO v_scorer_id
          FROM team_rosters tr
          WHERE tr.team_id = v_teams_b[v_away_idx] AND tr.season_id = v_season_id
            AND tr.position != 'Goalie' AND tr.status = 'active'
          ORDER BY random() LIMIT 1;

          SELECT tr.player_id INTO v_assister_id
          FROM team_rosters tr
          WHERE tr.team_id = v_teams_b[v_away_idx] AND tr.season_id = v_season_id
            AND tr.player_id != v_scorer_id AND tr.position != 'Goalie' AND tr.status = 'active'
          ORDER BY random() LIMIT 1;

          v_period := CASE WHEN j <= 2 THEN '1' WHEN j <= 4 THEN '2' ELSE '3' END;

          INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
            stat_type, team_type, period, value, timestamp)
          VALUES (v_game_id, v_league_id, v_teams_b[v_away_idx], v_scorer_id, v_sk2_id,
            'Goal', 'away', v_period, 1, v_game_date);

          IF v_assister_id IS NOT NULL THEN
            INSERT INTO game_stats (game_id, league_id, team_id, player_id, entered_by,
              stat_type, team_type, period, value, timestamp)
            VALUES (v_game_id, v_league_id, v_teams_b[v_away_idx], v_assister_id, v_sk2_id,
              'Assist', 'away', v_period, 1, v_game_date);
          END IF;
        END LOOP;

        -- Scorekeeper assignment
        INSERT INTO game_scorekeeper_assignments (
          game_id, league_id, scorekeeper_id, assigned_by,
          assigned_at, checked_in_at, started_at, completed_at,
          payment_amount, payment_status
        ) VALUES (
          v_game_id, v_league_id, v_sk2_id, v_sk2_id,
          v_game_date - INTERVAL '2 days', v_game_date - INTERVAL '15 minutes',
          v_game_date, v_game_date + INTERVAL '75 minutes',
          2500, 'paid'
        );

      ELSIF v_status = 'postponed' THEN
        INSERT INTO games (
          id, league_id, season_id, division_id,
          home_team_id, away_team_id, scheduled_at, location,
          status, game_number, game_type, period_count,
          cancellation_reason,
          created_at, updated_at
        ) VALUES (
          v_game_id, v_league_id, v_season_id, v_div_b_id,
          v_teams_b[v_home_idx], v_teams_b[v_away_idx],
          v_game_date, v_venue_names[((i - 1) % 3) + 1],
          'postponed', v_game_num, 'regular', 3,
          'Facility closure - arena maintenance',
          NOW(), NOW()
        );

      ELSE -- scheduled
        INSERT INTO games (
          id, league_id, season_id, division_id,
          home_team_id, away_team_id, scheduled_at, location,
          status, game_number, game_type, period_count,
          created_at, updated_at
        ) VALUES (
          v_game_id, v_league_id, v_season_id, v_div_b_id,
          v_teams_b[v_home_idx], v_teams_b[v_away_idx],
          v_game_date, v_venue_names[((i - 1) % 3) + 1],
          'scheduled', v_game_num, 'regular', 3,
          NOW(), NOW()
        );

        INSERT INTO game_scorekeeper_assignments (
          game_id, league_id, scorekeeper_id, assigned_by,
          assigned_at, payment_amount, payment_status
        ) VALUES (
          v_game_id, v_league_id,
          CASE WHEN i % 2 = 0 THEN v_sk2_id ELSE v_sk1_id END,
          v_sk2_id,
          NOW(), 2500, 'pending'
        );
      END IF;
    END LOOP;

    RAISE NOTICE 'Created % games total (Div A + Div B)', v_game_num;
  END;

  -- ==========================================================================
  -- 6. Season fee + player payments
  -- ==========================================================================

  INSERT INTO season_fees (
    id, league_id, season_id, name, description,
    amount_cents, currency, is_active,
    allow_full_payment, allow_two_pay, allow_three_pay,
    installment_fee_cents, late_fee_cents,
    early_bird_discount_cents, early_bird_deadline,
    payment_deadline,
    created_at, updated_at
  ) VALUES (
    v_fee_id, v_league_id, v_season_id,
    'Winter 2026 Registration',
    'Season registration fee for BMHL Winter 2026',
    35000, 'cad', true,      -- $350 CAD
    true, true, false,        -- full or 2-pay
    500, 2500,                -- $5 installment fee, $25 late fee
    5000,                     -- $50 early bird discount
    '2026-01-25',             -- early bird deadline
    '2026-02-15',             -- payment deadline (past!)
    NOW(), NOW()
  );

  -- Create player_payments for all 90 players (6 teams x 15 players)
  -- Mix: ~40% paid, ~30% overdue, ~20% partially_paid, ~10% pending
  -- NOTE: total_amount_cents is a GENERATED column (base - discount + late + installment)
  -- NOTE: amount_paid_cents must be <= total_amount_cents (check constraint)
  DECLARE
    v_payment_player RECORD;
    v_payment_status TEXT;
    v_payment_plan TEXT;
    v_amount_paid INT;
    v_discount INT;
    v_late_fee INT;
    v_inst_fee INT;
    v_paid_at TIMESTAMPTZ;
    v_counter INT := 0;
  BEGIN
    FOR v_payment_player IN
      SELECT tr.player_id, tr.team_id, tr.jersey_number
      FROM team_rosters tr
      WHERE tr.league_id = v_league_id AND tr.season_id = v_season_id
      ORDER BY tr.team_id, tr.jersey_number
    LOOP
      v_counter := v_counter + 1;
      v_discount := 0; v_late_fee := 0; v_inst_fee := 0;

      IF v_counter % 10 <= 3 THEN
        -- 40% paid
        v_payment_status := 'paid'; v_payment_plan := 'full';
        IF v_counter % 4 = 0 THEN
          v_discount := 5000;
          v_amount_paid := 35000 - 5000; -- total after early bird discount
        ELSE
          v_amount_paid := 35000;
        END IF;
        v_paid_at := '2026-01-20'::TIMESTAMPTZ + (v_counter * INTERVAL '2 hours');
      ELSIF v_counter % 10 <= 6 THEN
        -- 30% overdue
        v_payment_status := 'overdue'; v_payment_plan := 'full';
        v_late_fee := 2500;
        v_amount_paid := 0;
        v_paid_at := NULL;
      ELSIF v_counter % 10 <= 8 THEN
        -- 20% partially paid (first installment of 2-pay)
        v_payment_status := 'partially_paid'; v_payment_plan := 'two_pay';
        v_inst_fee := 500;
        v_amount_paid := 17750; -- half of total
        v_paid_at := NULL;
      ELSE
        -- 10% pending
        v_payment_status := 'pending'; v_payment_plan := 'full';
        v_amount_paid := 0;
        v_paid_at := NULL;
      END IF;

      INSERT INTO player_payments (
        league_id, season_id, season_fee_id, player_id, team_id,
        base_amount_cents, amount_paid_cents,
        discount_cents, late_fee_cents, installment_fee_cents,
        payment_plan, status, paid_at,
        reminder_sent_count,
        last_reminder_sent_at,
        currency, created_at, updated_at
      ) VALUES (
        v_league_id, v_season_id, v_fee_id,
        v_payment_player.player_id, v_payment_player.team_id,
        35000, v_amount_paid,
        v_discount, v_late_fee, v_inst_fee,
        v_payment_plan::payment_plan_type,
        v_payment_status::player_payment_status,
        v_paid_at,
        CASE WHEN v_payment_status = 'overdue' THEN 2 ELSE 0 END,
        CASE WHEN v_payment_status = 'overdue' THEN NOW() - INTERVAL '3 days' ELSE NULL END,
        'cad', NOW(), NOW()
      );
    END LOOP;

    RAISE NOTICE 'Created % player payment records', v_counter;
  END;

  -- ==========================================================================
  -- 7. Summary
  -- ==========================================================================
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'BMHL Demo Seed Complete!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'League: Barrie Mens Hockey League (bmhl)';
  RAISE NOTICE 'Season: Winter 2026';
  RAISE NOTICE 'Demo Divisions: A (3 teams) + B (3 teams)';
  RAISE NOTICE 'Players: 90 (15 per team)';
  RAISE NOTICE 'Games: 24 (mix of completed/postponed/cancelled/scheduled)';
  RAISE NOTICE 'Scorekeepers: 2';
  RAISE NOTICE 'Captains: 6 (1 per team) + 6 alternate captains';
  RAISE NOTICE 'Payment records: 90 (~40%% paid, ~30%% overdue, ~20%% partial, ~10%% pending)';

END;
$$;

COMMIT;

-- =============================================================================
-- Verification queries
-- =============================================================================

SELECT 'BMHL Demo Summary' AS report,
  (SELECT COUNT(*) FROM teams WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') AS total_teams,
  (SELECT COUNT(*) FROM team_rosters WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    AND season_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') AS rostered_players,
  (SELECT COUNT(*) FROM games WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    AND season_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') AS total_games,
  (SELECT COUNT(*) FROM games WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    AND season_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' AND status = 'completed') AS completed_games,
  (SELECT COUNT(*) FROM games WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    AND season_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' AND status = 'postponed') AS postponed_games,
  (SELECT COUNT(*) FROM player_payments WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    AND season_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') AS payment_records;

-- Payment breakdown
SELECT status, COUNT(*) AS count,
  SUM(amount_paid_cents) / 100.0 AS total_collected,
  SUM(total_amount_cents - amount_paid_cents) / 100.0 AS total_outstanding
FROM player_payments
WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  AND season_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
GROUP BY status
ORDER BY status;

-- Top scorers
SELECT p.full_name, t.name AS team,
  COUNT(*) FILTER (WHERE gs.stat_type = 'Goal') AS goals,
  COUNT(*) FILTER (WHERE gs.stat_type = 'Assist') AS assists,
  COUNT(*) AS points
FROM game_stats gs
JOIN profiles p ON p.id = gs.player_id
JOIN teams t ON t.id = gs.team_id
WHERE gs.league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  AND gs.stat_type IN ('Goal', 'Assist')
GROUP BY p.full_name, t.name
ORDER BY points DESC
LIMIT 10;
