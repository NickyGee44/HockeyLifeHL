# Creating Test Players Guide

There are two methods to create test players for the HockeyLifeHL demo:

## Method 1: Automated Script (Recommended) ⭐

This uses Supabase Admin API to create both auth users and profiles automatically.

### Prerequisites
1. Set up environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Install dependencies (if not already):
```bash
npm install @supabase/supabase-js
```

### Run the Script
```bash
npx tsx scripts/create-test-players.ts
```

### What It Does
- Creates 91 auth users (player1@hockeylifehl.test through player91@hockeylifehl.test)
- Creates corresponding profiles
- Auto-confirms emails (no email verification needed)
- Sets default passwords: `TestPlayer{N}!` (where N is 1-91)

### Player Credentials
- **Email Pattern**: `player{N}@hockeylifehl.test`
- **Password Pattern**: `TestPlayer{N}!`
- **Example**: 
  - Email: `player1@hockeylifehl.test`
  - Password: `TestPlayer1!`

### After Running
1. Go to `/admin` dashboard
2. Click "Generate Test Data"
3. Players will be assigned to teams automatically

---

## Method 2: Manual SQL + Supabase Dashboard

If you prefer manual control or can't use Admin API:

### Step 1: Create Auth Users via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Create users with:
   - Email: `player1@hockeylifehl.test`, `player2@hockeylifehl.test`, etc.
   - Password: `TestPlayer1!`, `TestPlayer2!`, etc.
   - Auto-confirm: ✅ (check this)

**Note**: This is tedious for 91 users. Consider using the script instead.

### Step 2: Run SQL Script

1. Go to Supabase SQL Editor
2. Copy and paste `supabase/SQL_EDITOR_CREATE_TEST_PLAYERS.sql`
3. Run the script
4. It will create profiles for any existing auth users

---

## Method 3: Bulk Create via Supabase Dashboard (Alternative)

Supabase Dashboard → Authentication → Users → "Import users from CSV"

Create a CSV file with:
```csv
email,password,email_confirm
player1@hockeylifehl.test,TestPlayer1!,true
player2@hockeylifehl.test,TestPlayer2!,true
...
player91@hockeylifehl.test,TestPlayer91!,true
```

Then import and run the SQL script to create profiles.

---

## Verification

After creating players, verify:

```sql
-- Check player count
SELECT COUNT(*) FROM profiles WHERE role = 'player';

-- Should show 91 players (or however many you created)
SELECT 
  email,
  full_name,
  jersey_number,
  position
FROM profiles
WHERE email LIKE 'player%@hockeylifehl.test'
ORDER BY email
LIMIT 10;
```

---

## Troubleshooting

### "Missing SUPABASE_SERVICE_ROLE_KEY"
- Get your service role key from: Supabase Dashboard → Settings → API
- Add to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

### "Not enough players" error in test data generator
- Make sure you created at least 13 players (minimum)
- Ideally create all 91 for full demo
- Check with: `SELECT COUNT(*) FROM profiles WHERE role = 'player';`

### Players can't log in
- Verify auth users were created (Supabase Dashboard → Authentication → Users)
- Check that emails are confirmed
- Try resetting password if needed

### Profiles not created
- Check if auth users exist first
- Run the SQL script to create profiles for existing auth users
- Verify trigger `handle_new_user` exists (should auto-create profiles)

---

## Quick Start (Recommended Flow)

1. **Run the script**: `npx tsx scripts/create-test-players.ts`
2. **Wait for completion** (2-3 minutes for 91 players)
3. **Go to `/admin`** dashboard
4. **Click "Generate Test Data"**
5. **Demo the site!**

---

**Files:**
- `scripts/create-test-players.ts` - Automated script (recommended)
- `supabase/SQL_EDITOR_CREATE_TEST_PLAYERS.sql` - SQL script for manual method
