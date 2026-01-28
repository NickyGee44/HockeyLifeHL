# 🏒 Simple Scorekeeper Setup (3 Steps)

## Step 1: Create Test Data (1 minute)

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Open the file: **`setup_test_data_only.sql`**
5. Copy all the SQL and paste it into the editor
6. Click **RUN**

✅ This creates:
- Test league: "Test Hockey League"
- Two teams: "Red Wings" vs "Blue Jets"
- A test game ready for scoring

---

## Step 2: Create Your Account (1 minute)

1. Go to: **http://localhost:3000/login**
2. Click **"Sign up"** or **"Create account"**
3. Use any email/password you want, for example:
   - Email: `test@example.com`
   - Password: `Test123!`
4. Complete the signup

---

## Step 3: Make Yourself a Scorekeeper (30 seconds)

1. Go back to **Supabase SQL Editor**
2. Open the file: **`setup_user_as_scorekeeper.sql`**
3. **IMPORTANT**: Replace `'YOUR_EMAIL_HERE'` with your actual email (4 places)
4. Copy all the SQL and paste it into the editor
5. Click **RUN**

Example:
```sql
-- Change this:
WHERE email = 'YOUR_EMAIL_HERE'

-- To this (using your actual email):
WHERE email = 'test@example.com'
```

---

## Step 4: Test It! 🎮

1. Go to: **http://localhost:3000/test-hockey/scorekeeper**
2. You should see the game: **"Red Wings vs Blue Jets"**
3. Click to enter stats and test the scorekeeper interface!

---

## Quick Reference

**League URL**: http://localhost:3000/test-hockey
**Scorekeeper Dashboard**: http://localhost:3000/test-hockey/scorekeeper
**Game**: Red Wings vs Blue Jets (scheduled for today)

---

## Troubleshooting

**"No games found"**
- Make sure you ran `setup_test_data_only.sql` first
- Check that the game exists: Go to Supabase → Table Editor → `games`

**"Access denied"**
- Make sure you replaced `YOUR_EMAIL_HERE` with your actual email in step 3
- Check your role: Go to Supabase → Table Editor → `profiles` → find your row → check `role` column should be `'scorekeeper'`

**"Not assigned to this game"**
- Check `game_scorekeeper_assignments` table
- Make sure your user_id is in the `scorekeeper_id` column for game `'game-test-001'`

---

## Files to Use

1. **`setup_test_data_only.sql`** ← Run this FIRST
2. **`setup_user_as_scorekeeper.sql`** ← Run this SECOND (after signup, edit your email first!)

That's it! 🎉
