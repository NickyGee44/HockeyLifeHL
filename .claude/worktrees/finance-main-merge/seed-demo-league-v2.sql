-- =============================================================================
-- GTA Beer League Demo Seed Script v2
-- 8 teams, 96 players (12 per team), 1 division, 1 season, 20 games
-- =============================================================================
-- INSERTION ORDER (respects foreign keys):
--   1. auth.users (owner + 8 captains + 88 players = 97 total)
--   2. profiles (same 97)
--   3. organizations
--   4. leagues + league_ownerships
--   5. divisions
--   6. seasons
--   7. venues
--   8. teams (references division, league, captain profile)
--   9. team_rosters (SKIP is_goalie — generated column)
--  10. league_memberships
--  11. season_fees
--  12. player_payments (SKIP total_amount_cents — generated column)
--  13. games
--  14. game_stats
--
-- DOES NOT INSERT: team_invoices (table does not exist)
-- =============================================================================

BEGIN;

DO $$
DECLARE
  ns UUID := '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; -- DNS namespace

  -- Core entity IDs
  v_owner_id UUID;
  v_org_id UUID;
  v_league_id UUID;
  v_division_id UUID;
  v_season_id UUID;
  v_venue_id UUID;
  v_fee_id UUID;

  -- Arrays
  v_team_ids UUID[8];
  v_captain_ids UUID[8];
  v_player_ids UUID[88];
  v_game_ids UUID[20];

  -- Loop / helper vars
  i INT;
  j INT;
  t INT;
  k INT;
  g INT;
  p_idx INT;
  v_position TEXT;
  v_shot TEXT;
  v_jersey INT;
  v_home INT;
  v_away INT;
  v_game_date TIMESTAMP;
  v_home_score INT;
  v_away_score INT;
  v_period TEXT;
  v_scorer_id UUID;
  v_assister_id UUID;

  -- Team data
  v_team_names TEXT[] := ARRAY[
    'Maple Mashers', 'Ice Bandits', 'Polar Pounders', 'Frozen Assets',
    'Puck Dynasty', 'Bar Down Beauties', 'Sauce Bosses', 'Net Crashers'
  ];
  v_team_shorts TEXT[] := ARRAY[
    'MSH', 'ICB', 'POL', 'FRZ', 'PDY', 'BDB', 'SBS', 'NCR'
  ];
  v_team_primaries TEXT[] := ARRAY[
    '#1E3A5F', '#8B0000', '#006994', '#2F4F4F',
    '#4B0082', '#DAA520', '#228B22', '#FF4500'
  ];
  v_team_secondaries TEXT[] := ARRAY[
    '#C0C0C0', '#FFD700', '#FFFFFF', '#87CEEB',
    '#FFD700', '#000000', '#FFD700', '#000000'
  ];

  -- Player name pools (96 each)
  v_first_names TEXT[] := ARRAY[
    'Mike','Dave','Chris','Matt','Ryan','Steve','Dan','Josh',
    'Kevin','Brian','Mark','Jeff','Tom','Rob','Nick','Scott',
    'Adam','Tyler','Kyle','Eric','Sean','Jason','Brad','Pat',
    'Jim','John','Greg','Derek','Craig','Drew','Cory','Jesse',
    'Trevor','Chad','Dustin','Travis','Justin','Jamie','Pete','Andy',
    'Liam','Noah','Owen','Ethan','Cole','Luke','Max','Sam',
    'Ben','Alex','Jake','Zach','Wes','Blake','Shane','Cam',
    'Nathan','Riley','Hunter','Logan','Carter','Mason','Brody','Nate',
    'Brock','Dean','Gavin','Ivan','Keith','Leo','Marco','Neil',
    'Oscar','Quinn','Ray','Sid','Trent','Vince','Wade','Yuri',
    'Art','Bo','Cal','Doug','Ed','Frank','Gord','Hank',
    'Ian','Jack','Kurt','Larry','Mitch','Norm','Phil','Rick'
  ];
  v_last_names TEXT[] := ARRAY[
    'Smith','Johnson','Brown','Wilson','Taylor','Anderson','Thomas','Moore',
    'Martin','Lee','White','Clark','Hall','Young','Walker','King',
    'Wright','Scott','Green','Baker','Adams','Nelson','Hill','Campbell',
    'Mitchell','Roberts','Carter','Phillips','Evans','Turner','Torres','Parker',
    'Collins','Edwards','Stewart','Flores','Morris','Nguyen','Murphy','Rivera',
    'Cook','Rogers','Morgan','Peterson','Cooper','Reed','Bailey','Bell',
    'Gomez','Kelly','Howard','Ward','Cox','Diaz','Richardson','Wood',
    'Watson','Brooks','Bennett','Gray','James','Reyes','Cruz','Hughes',
    'Price','Myers','Long','Foster','Sanders','Ross','Morales','Powell',
    'Sullivan','Russell','Ortiz','Jenkins','Gutierrez','Perry','Butler','Barnes',
    'Fisher','Henderson','Coleman','Simmons','Patterson','Jordan','Reynolds','Hamilton',
    'Graham','Kim','Gonzalez','Alexander','Ramos','Wallace','Griffin','West'
  ];

  -- Game matchups (home_idx, away_idx) — 20 games, 4 per week
  v_home_teams INT[] := ARRAY[1,3,5,7, 1,2,5,6, 1,2,5,6, 1,2,3,4, 1,2,3,4];
  v_away_teams INT[] := ARRAY[2,4,6,8, 3,4,7,8, 4,3,8,7, 5,6,7,8, 6,7,8,5];

  -- Shot hands
  v_shots TEXT[] := ARRAY['Left','Right'];

BEGIN

  -- ==========================================================================
  -- Generate deterministic UUIDs
  -- ==========================================================================
  v_owner_id    := uuid_generate_v5(ns, 'demo-owner');
  v_org_id      := uuid_generate_v5(ns, 'demo-org');
  v_league_id   := uuid_generate_v5(ns, 'demo-league');
  v_division_id := uuid_generate_v5(ns, 'demo-division');
  v_season_id   := uuid_generate_v5(ns, 'demo-season');
  v_venue_id    := uuid_generate_v5(ns, 'demo-venue');
  v_fee_id      := uuid_generate_v5(ns, 'demo-fee');

  FOR i IN 1..8 LOOP
    v_team_ids[i]    := uuid_generate_v5(ns, 'demo-team-' || i);
    v_captain_ids[i] := uuid_generate_v5(ns, 'demo-captain-' || i);
  END LOOP;
  FOR i IN 1..88 LOOP
    v_player_ids[i] := uuid_generate_v5(ns, 'demo-player-' || i);
  END LOOP;
  FOR i IN 1..20 LOOP
    v_game_ids[i] := uuid_generate_v5(ns, 'demo-game-' || i);
  END LOOP;

  -- ==========================================================================
  -- Cleanup existing demo data (idempotent re-runs)
  -- ==========================================================================
  DELETE FROM game_stats WHERE league_id = v_league_id;
  DELETE FROM games WHERE league_id = v_league_id;
  DELETE FROM player_payments WHERE league_id = v_league_id;
  DELETE FROM season_fees WHERE league_id = v_league_id;
  DELETE FROM league_memberships WHERE league_id = v_league_id;
  DELETE FROM team_rosters WHERE league_id = v_league_id;
  DELETE FROM teams WHERE league_id = v_league_id;
  DELETE FROM venues WHERE league_id = v_league_id;
  DELETE FROM seasons WHERE league_id = v_league_id;
  DELETE FROM divisions WHERE league_id = v_league_id;
  DELETE FROM league_ownerships WHERE league_id = v_league_id;
  DELETE FROM leagues WHERE id = v_league_id;
  DELETE FROM organizations WHERE id = v_org_id;
  DELETE FROM profiles WHERE id = v_owner_id;
  DELETE FROM auth.users WHERE id = v_owner_id;
  FOR i IN 1..8 LOOP
    DELETE FROM profiles WHERE id = v_captain_ids[i];
    DELETE FROM auth.users WHERE id = v_captain_ids[i];
  END LOOP;
  FOR i IN 1..88 LOOP
    DELETE FROM profiles WHERE id = v_player_ids[i];
    DELETE FROM auth.users WHERE id = v_player_ids[i];
  END LOOP;

  -- ==========================================================================
  -- 1. auth.users — owner
  -- ==========================================================================
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_user_meta_data, confirmation_token, recovery_token
  ) VALUES (
    v_owner_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo-owner@gtabeerleague.ca',
    crypt('DemoPass123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"full_name":"Demo League Owner"}'::jsonb,
    '', ''
  );

  -- ==========================================================================
  -- 2. auth.users — 8 captains
  -- ==========================================================================
  FOR i IN 1..8 LOOP
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_user_meta_data, confirmation_token, recovery_token
    ) VALUES (
      v_captain_ids[i],
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'demo-captain-' || i || '@gtabeerleague.ca',
      crypt('DemoPass123!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      ('{"full_name":"' || v_first_names[i] || ' ' || v_last_names[i] || '"}')::jsonb,
      '', ''
    );
  END LOOP;

  -- ==========================================================================
  -- 3. auth.users — 88 regular players
  -- ==========================================================================
  FOR i IN 1..88 LOOP
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_user_meta_data, confirmation_token, recovery_token
    ) VALUES (
      v_player_ids[i],
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'demo-player-' || i || '@gtabeerleague.ca',
      crypt('DemoPass123!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      ('{"full_name":"' || v_first_names[((i + 7) % 96) + 1] || ' ' || v_last_names[((i + 7) % 96) + 1] || '"}')::jsonb,
      '', ''
    );
  END LOOP;

  -- ==========================================================================
  -- 4. profiles — owner
  -- ==========================================================================
  INSERT INTO profiles (id, email, full_name, role, city, province, created_at, updated_at)
  VALUES (
    v_owner_id, 'demo-owner@gtabeerleague.ca', 'Demo League Owner',
    'owner', 'Toronto', 'Ontario', NOW(), NOW()
  );

  -- ==========================================================================
  -- 5. profiles — 8 captains
  -- ==========================================================================
  FOR i IN 1..8 LOOP
    INSERT INTO profiles (
      id, email, full_name, role, position, shot_hand, skill_level,
      jersey_number, city, province, created_at, updated_at
    ) VALUES (
      v_captain_ids[i],
      'demo-captain-' || i || '@gtabeerleague.ca',
      v_first_names[i] || ' ' || v_last_names[i],
      'captain', 'Forward', v_shots[((i - 1) % 2) + 1], 'advanced',
      10 + i, 'Toronto', 'Ontario', NOW(), NOW()
    );
  END LOOP;

  -- ==========================================================================
  -- 6. profiles — 88 regular players
  -- ==========================================================================
  FOR i IN 1..88 LOOP
    t := ((i - 1) / 11) + 1;    -- team 1..8
    j := ((i - 1) % 11) + 1;    -- slot 1..11

    IF j <= 6 THEN v_position := 'Forward';
    ELSIF j <= 9 THEN v_position := 'Defense';
    ELSIF j = 10 THEN v_position := 'Goalie';
    ELSE v_position := 'Forward';
    END IF;

    v_jersey := (t * 10) + j + 20;

    INSERT INTO profiles (
      id, email, full_name, role, position, shot_hand, skill_level,
      jersey_number, city, province, created_at, updated_at
    ) VALUES (
      v_player_ids[i],
      'demo-player-' || i || '@gtabeerleague.ca',
      v_first_names[((i + 7) % 96) + 1] || ' ' || v_last_names[((i + 7) % 96) + 1],
      'player', v_position, v_shots[((i - 1) % 2) + 1],
      CASE WHEN j <= 3 THEN 'advanced' WHEN j <= 7 THEN 'intermediate' ELSE 'beginner' END,
      v_jersey, 'Toronto', 'Ontario', NOW(), NOW()
    );
  END LOOP;

  -- ==========================================================================
  -- 7. organization
  -- ==========================================================================
  INSERT INTO organizations (id, name, slug, owner_user_id, created_at, updated_at)
  VALUES (v_org_id, 'GTA Beer League Hockey', 'gta-beer-league', v_owner_id, NOW(), NOW());

  -- ==========================================================================
  -- 8. league
  -- ==========================================================================
  INSERT INTO leagues (
    id, name, slug, owner_id, created_by, organization_id,
    city, state_province, country, sport, status, is_public,
    primary_color, secondary_color, accent_color,
    description, tagline, contact_email, created_at, updated_at
  ) VALUES (
    v_league_id, 'GTA Beer League', 'gta-beer-league',
    v_owner_id, v_owner_id, v_org_id,
    'Toronto', 'Ontario', 'Canada', 'hockey', 'active', true,
    '#1E3A5F', '#C0C0C0', '#DAA520',
    'The Greater Toronto Area''s premier recreational hockey league. All skill levels welcome.',
    'Where legends are made, one beer at a time',
    'demo-owner@gtabeerleague.ca', NOW(), NOW()
  );

  -- ==========================================================================
  -- 9. league_ownerships
  -- ==========================================================================
  INSERT INTO league_ownerships (league_id, organization_id, user_id, role, created_at, updated_at)
  VALUES (v_league_id, v_org_id, v_owner_id, 'owner', NOW(), NOW());

  -- ==========================================================================
  -- 10. division
  -- ==========================================================================
  INSERT INTO divisions (
    id, league_id, name, description, skill_level,
    max_teams, game_duration_minutes, period_count, created_at, updated_at
  ) VALUES (
    v_division_id, v_league_id, 'Division 1', 'Main competitive division',
    'intermediate', 10, 60, 3, NOW(), NOW()
  );

  -- ==========================================================================
  -- 11. season
  -- ==========================================================================
  INSERT INTO seasons (
    id, league_id, name, start_date, end_date, status,
    registration_type, fee_collection_model,
    max_players_per_team, period_count, period_length_minutes,
    game_duration_minutes, schedule_generated, created_at, updated_at
  ) VALUES (
    v_season_id, v_league_id, 'Winter 2026',
    '2026-01-15', '2026-04-30', 'active',
    'open_registration', 'individual',
    15, 3, 15, 60, true, NOW(), NOW()
  );

  -- ==========================================================================
  -- 12. venue
  -- ==========================================================================
  INSERT INTO venues (
    id, league_id, name, address, city, state_province,
    country, postal_code, number_of_rinks, created_at, updated_at
  ) VALUES (
    v_venue_id, v_league_id, 'Canlan Ice Sports - Scarborough',
    '50 Clipper Rd', 'Scarborough', 'Ontario', 'Canada', 'M1R 3M3',
    4, NOW(), NOW()
  );

  -- ==========================================================================
  -- 13. teams (8)
  -- ==========================================================================
  FOR i IN 1..8 LOOP
    INSERT INTO teams (
      id, league_id, division_id, name, short_name, slug,
      captain_id, primary_color, secondary_color,
      max_roster_size, status, created_at, updated_at
    ) VALUES (
      v_team_ids[i], v_league_id, v_division_id,
      v_team_names[i], v_team_shorts[i],
      lower(replace(v_team_names[i], ' ', '-')),
      v_captain_ids[i], v_team_primaries[i], v_team_secondaries[i],
      15, 'active', NOW(), NOW()
    );
  END LOOP;

  -- ==========================================================================
  -- 14. team_rosters — captains
  --     NOTE: is_goalie is GENERATED ALWAYS — never insert it
  -- ==========================================================================
  FOR i IN 1..8 LOOP
    INSERT INTO team_rosters (
      team_id, player_id, season_id, league_id, division_id,
      jersey_number, position, leadership_role, status, player_type,
      start_date, joined_at
    ) VALUES (
      v_team_ids[i], v_captain_ids[i], v_season_id, v_league_id, v_division_id,
      10 + i, 'Forward', 'captain', 'active', 'full_time',
      '2026-01-15', NOW()
    );
  END LOOP;

  -- ==========================================================================
  -- 15. team_rosters — 88 regular players
  --     NOTE: is_goalie is GENERATED ALWAYS — never insert it
  -- ==========================================================================
  FOR i IN 1..88 LOOP
    t := ((i - 1) / 11) + 1;
    j := ((i - 1) % 11) + 1;

    IF j <= 6 THEN v_position := 'Forward';
    ELSIF j <= 9 THEN v_position := 'Defense';
    ELSIF j = 10 THEN v_position := 'Goalie';
    ELSE v_position := 'Forward';
    END IF;

    v_jersey := (t * 10) + j + 20;

    INSERT INTO team_rosters (
      team_id, player_id, season_id, league_id, division_id,
      jersey_number, position, status, player_type,
      start_date, joined_at
    ) VALUES (
      v_team_ids[t], v_player_ids[i], v_season_id, v_league_id, v_division_id,
      v_jersey, v_position, 'active', 'full_time',
      '2026-01-15', NOW()
    );
  END LOOP;

  -- ==========================================================================
  -- 16. league_memberships — owner + captains + players
  -- ==========================================================================
  INSERT INTO league_memberships (league_id, user_id, role, status, joined_at)
  VALUES (v_league_id, v_owner_id, 'owner', 'active', NOW());

  FOR i IN 1..8 LOOP
    INSERT INTO league_memberships (league_id, user_id, role, status, joined_at)
    VALUES (v_league_id, v_captain_ids[i], 'captain', 'active', NOW());
  END LOOP;

  FOR i IN 1..88 LOOP
    INSERT INTO league_memberships (league_id, user_id, role, status, joined_at)
    VALUES (v_league_id, v_player_ids[i], 'player', 'active', NOW());
  END LOOP;

  -- ==========================================================================
  -- 17. season_fees
  -- ==========================================================================
  INSERT INTO season_fees (
    id, league_id, season_id, name, amount_cents, currency,
    description, is_active, allow_full_payment, allow_two_pay, allow_three_pay,
    early_bird_deadline, early_bird_discount_cents, late_fee_cents,
    payment_deadline, created_at, updated_at
  ) VALUES (
    v_fee_id, v_league_id, v_season_id,
    'Winter 2026 Registration Fee', 35000, 'cad',
    'Full season registration — 20 regular season games',
    true, true, true, false,
    '2026-01-01', 2500, 5000, '2026-02-15',
    NOW(), NOW()
  );

  -- ==========================================================================
  -- 18. player_payments — captains (all paid)
  --     NOTE: total_amount_cents is GENERATED ALWAYS — never insert it
  -- ==========================================================================
  FOR i IN 1..8 LOOP
    INSERT INTO player_payments (
      league_id, season_id, season_fee_id, player_id, team_id,
      base_amount_cents, discount_cents, late_fee_cents, installment_fee_cents,
      amount_paid_cents, payment_plan, status, paid_at,
      created_at, updated_at
    ) VALUES (
      v_league_id, v_season_id, v_fee_id, v_captain_ids[i], v_team_ids[i],
      35000, 2500, 0, 0,
      32500, 'full', 'paid', NOW() - INTERVAL '30 days',
      NOW() - INTERVAL '45 days', NOW()
    );
  END LOOP;

  -- ==========================================================================
  -- 19. player_payments — 88 regular players (mixed statuses)
  --     NOTE: total_amount_cents is GENERATED ALWAYS — never insert it
  -- ==========================================================================
  FOR i IN 1..88 LOOP
    t := ((i - 1) / 11) + 1;

    INSERT INTO player_payments (
      league_id, season_id, season_fee_id, player_id, team_id,
      base_amount_cents, discount_cents, late_fee_cents, installment_fee_cents,
      amount_paid_cents, payment_plan, status, paid_at,
      created_at, updated_at
    ) VALUES (
      v_league_id, v_season_id, v_fee_id, v_player_ids[i], v_team_ids[t],
      35000,
      CASE WHEN i <= 44 THEN 2500 ELSE 0 END,
      CASE WHEN i > 80 THEN 5000 ELSE 0 END,
      0,
      CASE
        WHEN i <= 66 THEN 35000 - (CASE WHEN i <= 44 THEN 2500 ELSE 0 END)
        WHEN i <= 77 THEN 17500
        ELSE 0
      END,
      'full',
      CASE
        WHEN i <= 66 THEN 'paid'::player_payment_status
        WHEN i <= 77 THEN 'partially_paid'::player_payment_status
        ELSE 'pending'::player_payment_status
      END,
      CASE WHEN i <= 66 THEN NOW() - INTERVAL '20 days' ELSE NULL END,
      NOW() - INTERVAL '45 days', NOW()
    );
  END LOOP;

  -- ==========================================================================
  -- 20. games (20 total — first 12 completed, last 8 scheduled)
  -- ==========================================================================
  FOR i IN 1..20 LOOP
    v_home := v_home_teams[i];
    v_away := v_away_teams[i];
    -- 4 games per week, starting Jan 22, Thursday nights at 9 PM
    v_game_date := '2026-01-22 21:00:00'::TIMESTAMP
                   + (((i - 1) / 4) * INTERVAL '7 days')
                   + (((i - 1) % 4) * INTERVAL '75 minutes');

    IF i <= 12 THEN
      v_home_score := (i % 5) + 1;
      v_away_score := ((i + 2) % 4) + 1;
    ELSE
      v_home_score := NULL;
      v_away_score := NULL;
    END IF;

    INSERT INTO games (
      id, league_id, season_id, division_id,
      home_team_id, away_team_id, scheduled_at, location,
      home_score, away_score, status, game_number, game_type,
      period_count, created_at, updated_at
    ) VALUES (
      v_game_ids[i], v_league_id, v_season_id, v_division_id,
      v_team_ids[v_home], v_team_ids[v_away],
      v_game_date, 'Canlan Ice Sports - Scarborough',
      v_home_score, v_away_score,
      CASE WHEN i <= 12 THEN 'completed' ELSE 'scheduled' END,
      i, 'regular', 3, NOW(), NOW()
    );
  END LOOP;

  -- ==========================================================================
  -- 21. game_stats — goals & assists for completed games (first 12)
  -- ==========================================================================
  FOR g IN 1..12 LOOP
    v_home := v_home_teams[g];
    v_away := v_away_teams[g];
    v_home_score := (g % 5) + 1;
    v_away_score := ((g + 2) % 4) + 1;

    -- Home team goals
    FOR k IN 1..v_home_score LOOP
      -- Pick scorer from home team's regular players
      p_idx := ((v_home - 1) * 11) + ((k - 1) % 11) + 1;
      v_scorer_id := v_player_ids[p_idx];
      -- Assister: next player on same team
      v_assister_id := v_player_ids[((v_home - 1) * 11) + (k % 11) + 1];

      v_period := CASE
        WHEN k = 1 THEN '1'
        WHEN k = v_home_score THEN '3'
        ELSE '2'
      END;

      -- Goal stat
      INSERT INTO game_stats (
        game_id, league_id, team_id, player_id, entered_by,
        stat_type, team_type, period, value, timestamp
      ) VALUES (
        v_game_ids[g], v_league_id, v_team_ids[v_home], v_scorer_id, v_owner_id,
        'goal', 'home', v_period, 1, NOW()
      );

      -- Assist stat
      INSERT INTO game_stats (
        game_id, league_id, team_id, player_id, entered_by,
        stat_type, team_type, period, value, timestamp
      ) VALUES (
        v_game_ids[g], v_league_id, v_team_ids[v_home], v_assister_id, v_owner_id,
        'assist', 'home', v_period, 1, NOW()
      );
    END LOOP;

    -- Away team goals
    FOR k IN 1..v_away_score LOOP
      p_idx := ((v_away - 1) * 11) + ((k - 1) % 11) + 1;
      v_scorer_id := v_player_ids[p_idx];
      v_assister_id := v_player_ids[((v_away - 1) * 11) + (k % 11) + 1];

      v_period := CASE
        WHEN k = 1 THEN '1'
        WHEN k = v_away_score THEN '3'
        ELSE '2'
      END;

      -- Goal stat
      INSERT INTO game_stats (
        game_id, league_id, team_id, player_id, entered_by,
        stat_type, team_type, period, value, timestamp
      ) VALUES (
        v_game_ids[g], v_league_id, v_team_ids[v_away], v_scorer_id, v_owner_id,
        'goal', 'away', v_period, 1, NOW()
      );

      -- Assist stat
      INSERT INTO game_stats (
        game_id, league_id, team_id, player_id, entered_by,
        stat_type, team_type, period, value, timestamp
      ) VALUES (
        v_game_ids[g], v_league_id, v_team_ids[v_away], v_assister_id, v_owner_id,
        'assist', 'away', v_period, 1, NOW()
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE '=== Demo seed complete ===';
  RAISE NOTICE '  97 auth users (1 owner + 8 captains + 88 players)';
  RAISE NOTICE '  97 profiles';
  RAISE NOTICE '  1 organization, 1 league, 1 division, 1 season, 1 venue';
  RAISE NOTICE '  8 teams with 12 players each (96 roster entries)';
  RAISE NOTICE '  96 player payments';
  RAISE NOTICE '  20 games (12 completed with stats, 8 scheduled)';

END;
$$;

COMMIT;
