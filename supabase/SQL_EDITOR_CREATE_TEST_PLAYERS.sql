-- ============================================
-- Create Test Players (Manual Method)
-- Run this in Supabase SQL Editor
-- ============================================
-- 
-- NOTE: This script creates profiles only.
-- You still need to create auth users via:
-- 1. Supabase Dashboard → Authentication → Users → Add User
-- 2. Or use the create-test-players.ts script (recommended)
--
-- This SQL method is for manual creation or if you
-- want to create profiles for existing auth users.
-- ============================================

-- First, let's create a function to generate test player profiles
-- This assumes auth users already exist with matching IDs

-- Generate 91 test player profiles
-- You'll need to create auth users first, then run this to create profiles

DO $$
DECLARE
  first_names TEXT[] := ARRAY[
    'Alex', 'Brad', 'Chris', 'David', 'Eric', 'Frank', 'Greg', 'Henry', 'Ian', 'Jack',
    'Kevin', 'Liam', 'Mike', 'Nick', 'Owen', 'Paul', 'Quinn', 'Ryan', 'Sam', 'Tom',
    'Adam', 'Blake', 'Cameron', 'Drew', 'Evan', 'Finn', 'Gabe', 'Hugo', 'Ivan', 'Jake',
    'Kyle', 'Luke', 'Max', 'Noah', 'Oscar', 'Pete', 'Quinn', 'Rex', 'Seth', 'Troy',
    'Vince', 'Wade', 'Xavier', 'Yuki', 'Zach', 'Ben', 'Cole', 'Dane', 'Eli', 'Gus',
    'Hank', 'Ike', 'Jax', 'Kai', 'Leo', 'Moe', 'Ned', 'Ollie', 'Pat', 'Ray',
    'Sean', 'Tad', 'Uri', 'Vic', 'Wes', 'Xavi', 'Yan', 'Zane', 'Ace', 'Bo',
    'Cal', 'Dan', 'Eli', 'Fox', 'Guy', 'Hal', 'Ira', 'Jay', 'Ken', 'Lou',
    'Mac', 'Ned', 'Otis', 'Pax', 'Quin', 'Rob', 'Sol', 'Ted', 'Udo', 'Van',
    'Walt', 'Xan', 'Yor', 'Zed'
  ];
  
  last_names TEXT[] := ARRAY[
    'Johnson', 'Smith', 'Wilson', 'Brown', 'Davis', 'Miller', 'Taylor', 'White', 'Moore', 'Anderson',
    'Lee', 'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Green',
    'Garcia', 'Lopez', 'Perez', 'Sanchez', 'Torres', 'Ramirez', 'Flores', 'Rivera', 'Gomez', 'Diaz',
    'Morales', 'Ortiz', 'Vargas', 'Castro', 'Ruiz', 'Mendoza', 'Herrera', 'Jimenez', 'Moreno', 'Castillo',
    'Romero', 'Salazar', 'Martinez', 'Rodriguez', 'Gonzalez', 'Williams', 'Jones', 'Thomas', 'Jackson', 'Martin',
    'Thompson', 'Robinson', 'Mitchell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris',
    'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson',
    'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks',
    'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins',
    'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster'
  ];
  
  i INTEGER;
  first_name TEXT;
  last_name TEXT;
  full_name TEXT;
  email TEXT;
  user_id UUID;
BEGIN
  -- Create 91 test players
  FOR i IN 1..91 LOOP
    first_name := first_names[((i - 1) % array_length(first_names, 1)) + 1];
    last_name := last_names[((i - 1) / array_length(first_names, 1) + 1) % array_length(last_names, 1) + 1];
    full_name := first_name || ' ' || last_name;
    email := 'player' || i || '@hockeylifehl.test';
    
    -- Try to find existing auth user with this email
    -- If auth user exists, use their ID; otherwise generate a UUID
    -- NOTE: You should create auth users first via Supabase Dashboard or Admin API
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = email
    LIMIT 1;
    
    -- If no auth user found, we can't create a profile (profiles require auth.users.id)
    -- So we'll skip and log a message
    IF user_id IS NULL THEN
      RAISE NOTICE 'Skipping % - no auth user found. Create auth user first.', email;
      CONTINUE;
    END IF;
    
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
      -- Insert profile
      INSERT INTO profiles (id, email, full_name, role, jersey_number, position)
      VALUES (
        user_id,
        email,
        full_name,
        'player',
        ((i - 1) % 99) + 1, -- Jersey number 1-99
        CASE 
          WHEN (i - 1) % 5 = 0 THEN 'G'  -- Goalie
          WHEN (i - 1) % 5 = 1 THEN 'C'    -- Center
          WHEN (i - 1) % 5 = 2 THEN 'LW'  -- Left Wing
          WHEN (i - 1) % 5 = 3 THEN 'RW'  -- Right Wing
          ELSE 'D'                        -- Defense
        END
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = 'player',
        jersey_number = EXCLUDED.jersey_number,
        position = EXCLUDED.position;
      
      RAISE NOTICE 'Created profile for % (%)', full_name, email;
    ELSE
      RAISE NOTICE 'Profile already exists for % (%)', full_name, email;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Test player profile creation complete!';
END $$;

-- Verify created profiles
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'player' THEN 1 END) as player_count,
  COUNT(CASE WHEN position = 'G' THEN 1 END) as goalie_count
FROM profiles
WHERE email LIKE 'player%@hockeylifehl.test';

-- Show sample of created players
SELECT 
  id,
  email,
  full_name,
  jersey_number,
  position,
  role
FROM profiles
WHERE email LIKE 'player%@hockeylifehl.test'
ORDER BY email
LIMIT 10;
