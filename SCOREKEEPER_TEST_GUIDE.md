# 🏒 Scorekeeper Testing Guide

## Quick Start: Test Scorekeeper Account Setup

Follow these steps to create a test scorekeeper account and test the scoring functionality.

---

## Step 1: Set Up Test Data in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `ntplczcmhvfkijjxavdl`
3. Go to **SQL Editor**
4. Copy and paste the contents of `setup_test_scorekeeper.sql`
5. Click **Run**

This creates:
- ✅ Test league: "Test Hockey League"
- ✅ Two test teams: "Test Home Team" and "Test Away Team"
- ✅ Test season: "Test Season 2026"
- ✅ Test game ready for scoring

---

## Step 2: Create Your Test Account

### Option A: Quick Manual Account Creation (Recommended)

1. **Open Supabase SQL Editor** and run:

```sql
-- Create test user in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'scorekeeper@test.com',
  crypt('Test123!', gen_salt('bf')), -- Password: Test123!
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Scorekeeper"}',
  'authenticated',
  'authenticated'
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Create profile for the user (use the ID from above)
-- Replace 'USER_ID_HERE' with the UUID returned above
INSERT INTO profiles (
  id,
  email,
  full_name,
  role
) VALUES (
  'USER_ID_HERE', -- Replace with the UUID from above
  'scorekeeper@test.com',
  'Test Scorekeeper',
  'scorekeeper'
) ON CONFLICT (id) DO UPDATE SET
  role = 'scorekeeper';

-- Add user to test league
INSERT INTO league_members (
  league_id,
  user_id,
  role
) VALUES (
  'test-league-001',
  'USER_ID_HERE', -- Replace with the UUID from above
  'scorekeeper'
) ON CONFLICT DO NOTHING;

-- Assign as scorekeeper to test game
INSERT INTO game_scorekeeper_assignments (
  game_id,
  scorekeeper_id,
  assigned_by
) VALUES (
  'game-test-001',
  'USER_ID_HERE', -- Replace with the UUID from above
  'USER_ID_HERE'  -- Replace with the UUID from above
) ON CONFLICT DO NOTHING;
```

### Option B: Use Signup Flow

1. Navigate to: http://localhost:3000/signup/league
2. **Skip** the full signup - we just need an account
3. Or go directly to: http://localhost:3000/login
4. Create account with:
   - **Email**: `scorekeeper@test.com`
   - **Password**: `Test123!`
   - **Name**: `Test Scorekeeper`

Then run this SQL to upgrade to scorekeeper:

```sql
-- Make the user a scorekeeper
UPDATE profiles
SET role = 'scorekeeper'
WHERE email = 'scorekeeper@test.com';

-- Add to test league
INSERT INTO league_members (league_id, user_id, role)
SELECT 'test-league-001', id, 'scorekeeper'
FROM profiles
WHERE email = 'scorekeeper@test.com'
ON CONFLICT DO NOTHING;

-- Assign to test game
INSERT INTO game_scorekeeper_assignments (game_id, scorekeeper_id, assigned_by)
SELECT 'game-test-001', id, id
FROM profiles
WHERE email = 'scorekeeper@test.com'
ON CONFLICT DO NOTHING;
```

---

## Step 3: Log In and Test

1. **Navigate to**: http://localhost:3000/login

2. **Log in with**:
   - Email: `scorekeeper@test.com`
   - Password: `Test123!`

3. **Access the scorekeeper dashboard**:
   - After login, go to: http://localhost:3000/test-hockey/scorekeeper
   - Or navigate via the menu

4. **Test the scoring interface**:
   - You should see "Test Home Team vs Test Away Team"
   - Click to start entering stats
   - Test adding goals, assists, penalties, etc.

---

## Alternative: Use Existing Data

If you already have a league and game set up, you can simply:

1. **Log in with any existing account**
2. **Find your user ID** in Supabase (profiles table)
3. **Run this SQL** to make yourself a scorekeeper:

```sql
-- Replace 'your-email@example.com' with your actual email
-- Replace 'your-league-id' with your actual league ID
-- Replace 'your-game-id' with an actual game ID

UPDATE profiles
SET role = 'scorekeeper'
WHERE email = 'your-email@example.com';

INSERT INTO league_members (league_id, user_id, role)
SELECT 'your-league-id', id, 'scorekeeper'
FROM profiles
WHERE email = 'your-email@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO game_scorekeeper_assignments (game_id, scorekeeper_id, assigned_by)
SELECT 'your-game-id', id, id
FROM profiles
WHERE email = 'your-email@example.com'
ON CONFLICT DO NOTHING;
```

---

## Troubleshooting

### Can't see scorekeeper dashboard?
- Check that your `role` is set to `'scorekeeper'` in the `profiles` table
- Check that you're a member of the league in `league_members`
- Check that you're assigned to the game in `game_scorekeeper_assignments`

### No games showing up?
- Run the test data setup SQL again
- Check that the game exists in the `games` table
- Check that the game status is `'scheduled'` or `'in_progress'`

### Login not working?
- Make sure you created the user in `auth.users` table
- Check that `email_confirmed_at` is set to NOW()
- Verify the password was encrypted with bcrypt

---

## Quick Test Credentials Summary

**For fastest testing, use these credentials after running the setup SQL:**

- **URL**: http://localhost:3000/login
- **Email**: `scorekeeper@test.com`
- **Password**: `Test123!`
- **League**: Test Hockey League (`/test-hockey`)
- **Scorekeeper URL**: http://localhost:3000/test-hockey/scorekeeper

---

## What to Test

Once logged in as a scorekeeper, test these features:

1. **View assigned games**
   - [ ] Can see list of games assigned to you
   - [ ] Can see game details (teams, date, time)

2. **Enter game stats**
   - [ ] Can start entering stats for a game
   - [ ] Can add goals (player, time, period)
   - [ ] Can add assists
   - [ ] Can add penalties
   - [ ] Can record shots on goal
   - [ ] Can save stats

3. **Edit and update**
   - [ ] Can edit previously entered stats
   - [ ] Can delete incorrect entries
   - [ ] Changes save correctly

4. **Submit for verification**
   - [ ] Can mark game as complete
   - [ ] Stats are submitted to captain for verification

---

**Need help?** Check the UNFINISHED_WORK_AUDIT.md for known issues with the captain verification system.
