-- Migration: Create 60 demo players for Metro Beer League Hockey
-- Prerequisites: Demo league with slug='demo' must exist with 6 teams

-- This migration:
-- 1. Creates 60 auth users with profiles
-- 2. Links them to teams via team_rosters
-- 3. Creates one special demo-player@hockeylifehl.com account

DO $$
DECLARE
  v_league_id uuid;
  v_season_id uuid;
  v_team_ids uuid[];
  v_team_names text[];
  v_player_auth_id uuid;
  v_demo_player_auth_id uuid;
  v_team_index int;
  v_positions text[] := ARRAY['C', 'LW', 'RW', 'D', 'D', 'D', 'G', 'C', 'RW', 'LW'];
  v_first_names text[] := ARRAY[
    'Connor', 'Auston', 'Nathan', 'Leon', 'Alex', 'Brad', 'Patrick', 'Sidney',
    'Brayden', 'Jack', 'Mikko', 'Mika', 'Artemi', 'Kirill', 'Johnny', 'Mark',
    'Claude', 'Filip', 'Sebastian', 'Elias', 'Matthew', 'Mitch', 'Jake', 'Kyle',
    'Aleksander', 'Ryan', 'Steven', 'Brent', 'Nico', 'Timo', 'Tyler', 'Jordan',
    'Roope', 'Jason', 'Patrice', 'Nick', 'Vladimir', 'Evgeni', 'Erik', 'William',
    'Pavel', 'Andrei', 'Roman', 'Nikita', 'Valeri', 'Dylan', 'Quinn', 'Bo',
    'Sam', 'Matt', 'Dustin', 'Jonathan', 'Max', 'Gabriel', 'Jesper', 'Adam',
    'Tomas', 'Martin', 'Anze', 'Michael'
  ];
  v_last_names text[] := ARRAY[
    'McDavid', 'Matthews', 'MacKinnon', 'Draisaitl', 'Ovechkin', 'Marchand', 'Kane', 'Crosby',
    'Point', 'Hughes', 'Rantanen', 'Zibanejad', 'Panarin', 'Kaprizov', 'Gaudreau', 'Stone',
    'Giroux', 'Forsberg', 'Aho', 'Pettersson', 'Tkachuk', 'Marner', 'Guentzel', 'Connor',
    'Barkov', 'OReilly', 'Stamkos', 'Burns', 'Hischier', 'Meier', 'Seguin', 'Eichel',
    'Hintz', 'Robertson', 'Bergeron', 'Suzuki', 'Tarasenko', 'Malkin', 'Karlsson', 'Nylander',
    'Buchnevich', 'Svechnikov', 'Josi', 'Kucherov', 'Nichushkin', 'Larkin', 'Hughes', 'Horvat',
    'Reinhart', 'Barzal', 'Brown', 'Toews', 'Pacioretty', 'Landeskog', 'Bratt', 'Fox',
    'Hertl', 'Necas', 'Kopitar', 'Bunting'
  ];
  v_player_counter int := 1;
BEGIN
  -- Get the demo league
  SELECT id INTO v_league_id
  FROM leagues
  WHERE slug = 'demo'
  LIMIT 1;

  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'Demo league with slug=demo not found. Please create it first.';
  END IF;

  -- Get the current/latest season for this league
  SELECT id INTO v_season_id
  FROM seasons
  WHERE league_id = v_league_id
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'No season found for demo league. Please create a season first.';
  END IF;

  -- Get all teams for this league (expecting 6 teams)
  SELECT array_agg(id ORDER BY name), array_agg(name ORDER BY name)
  INTO v_team_ids, v_team_names
  FROM teams
  WHERE league_id = v_league_id;

  IF array_length(v_team_ids, 1) < 6 THEN
    RAISE EXCEPTION 'Demo league needs at least 6 teams. Found only %', array_length(v_team_ids, 1);
  END IF;

  RAISE NOTICE 'Creating demo players for league: % (%), season: %', v_league_id, v_team_names, v_season_id;

  -- Create the special demo player account first
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo-player@hockeylifehl.com',
    crypt('DemoPlayer123!', gen_salt('bf')), -- Bcrypt hash
    now(),
    now(),
    now(),
    '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Player"}'
  )
  RETURNING id INTO v_demo_player_auth_id;

  -- Create profile for demo player (assigned to first team)
  INSERT INTO profiles (
    id,
    email,
    full_name,
    jersey_number,
    position,
    role,
    shot_hand,
    skill_level,
    created_at,
    updated_at
  ) VALUES (
    v_demo_player_auth_id,
    'demo-player@hockeylifehl.com',
    'Demo Player',
    77,
    'C',
    'player',
    'right',
    'intermediate',
    now(),
    now()
  );

  -- Add demo player to first team roster
  INSERT INTO team_rosters (
    team_id,
    player_id,
    season_id,
    league_id,
    jersey_number,
    position,
    status,
    is_goalie,
    start_date
  ) VALUES (
    v_team_ids[1],
    v_demo_player_auth_id,
    v_season_id,
    v_league_id,
    77,
    'C',
    'active',
    false,
    CURRENT_DATE
  );

  RAISE NOTICE 'Created demo player account: demo-player@hockeylifehl.com (Team: %)', v_team_names[1];

  -- Create 59 more players (9 more for team 1, 10 for teams 2-6)
  FOR i IN 1..59 LOOP
    -- Determine which team (team 1 gets 9 more, teams 2-6 get 10 each)
    IF i <= 9 THEN
      v_team_index := 1;
    ELSIF i <= 19 THEN
      v_team_index := 2;
    ELSIF i <= 29 THEN
      v_team_index := 3;
    ELSIF i <= 39 THEN
      v_team_index := 4;
    ELSIF i <= 49 THEN
      v_team_index := 5;
    ELSE
      v_team_index := 6;
    END IF;

    -- Create auth user
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'demo.player.' || i || '@hockeylifehl.com',
      crypt('DemoPass123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}',
      format('{"full_name":"%s %s"}', v_first_names[i], v_last_names[i])
    )
    RETURNING id INTO v_player_auth_id;

    -- Create profile
    INSERT INTO profiles (
      id,
      email,
      full_name,
      jersey_number,
      position,
      role,
      shot_hand,
      skill_level,
      created_at,
      updated_at
    ) VALUES (
      v_player_auth_id,
      'demo.player.' || i || '@hockeylifehl.com',
      v_first_names[i] || ' ' || v_last_names[i],
      (i % 98) + 1, -- Jersey numbers 1-99
      v_positions[(i % 10) + 1],
      'player',
      CASE WHEN i % 2 = 0 THEN 'right' ELSE 'left' END,
      CASE
        WHEN i % 3 = 0 THEN 'beginner'
        WHEN i % 3 = 1 THEN 'intermediate'
        ELSE 'advanced'
      END,
      now(),
      now()
    );

    -- Add to team roster
    INSERT INTO team_rosters (
      team_id,
      player_id,
      season_id,
      league_id,
      jersey_number,
      position,
      status,
      is_goalie,
      start_date
    ) VALUES (
      v_team_ids[v_team_index],
      v_player_auth_id,
      v_season_id,
      v_league_id,
      (i % 98) + 1,
      v_positions[(i % 10) + 1]::position,
      'active',
      v_positions[(i % 10) + 1] = 'G',
      CURRENT_DATE
    );

    v_player_counter := v_player_counter + 1;
  END LOOP;

  RAISE NOTICE 'Successfully created % demo players across % teams', v_player_counter, array_length(v_team_ids, 1);

END $$;

-- Verify the results
SELECT
  t.name as team_name,
  COUNT(tr.id) as player_count
FROM teams t
LEFT JOIN team_rosters tr ON tr.team_id = t.id
WHERE t.league_id = (SELECT id FROM leagues WHERE slug = 'demo')
GROUP BY t.name
ORDER BY t.name;
