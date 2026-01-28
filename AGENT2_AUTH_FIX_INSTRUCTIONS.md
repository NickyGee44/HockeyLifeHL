# 🚨 CRITICAL FIX: Registration & Login Not Working

**Date**: January 28, 2026
**Agent**: Agent 2
**Priority**: CRITICAL
**Status**: Fix ready, needs database application

---

## Problem Identified

Authentication is completely broken due to a database trigger error:

```
ERROR: column "user_id" of relation "profiles" does not exist
```

**Root Cause**:
- The `handle_new_user()` trigger function is trying to insert into a `user_id` column
- The `profiles` table uses `id` as the primary key (NOT `user_id`)
- This prevents ALL user registration and breaks login

**Supabase Auth Logs Show**:
- Registration: `500: Database error saving new user`
- Login: `400: Invalid login credentials`

---

## Solution

The fix has been created in: `CRITICAL_AUTH_FIX.sql`

### Option 1: Apply via Supabase SQL Editor (RECOMMENDED - FASTEST)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl
2. Navigate to **SQL Editor** (left sidebar)
3. Create a new query
4. Copy the contents of `CRITICAL_AUTH_FIX.sql`
5. Paste and click **RUN**
6. Verify you see: "Registration and login should now work!"

### Option 2: Apply via Command Line (if CLI configured)

```bash
cd /d/B3/dev/HockeyLeague/HockeyLifeHL
supabase db execute < CRITICAL_AUTH_FIX.sql
```

---

## What The Fix Does

1. **Drops and recreates `handle_new_user()` function**
   - Changes `user_id` column reference to `id`
   - Adds proper error handling
   - Uses `ON CONFLICT` for idempotency

2. **Recreates the trigger** on `auth.users` table
   - Ensures it's properly attached

3. **Adds RLS policy** for service role
   - Allows trigger to insert profiles

4. **Fixes orphaned users**
   - Creates profiles for any existing auth users without profiles

5. **Verifies the fix**
   - Checks trigger exists
   - Reports any remaining orphaned users
   - Confirms registration should work

---

## Testing After Fix

### Test Registration
1. Go to: https://beerleaguehockey.ca/register (or your registration page)
2. Create a new account with a test email
3. Should succeed and create profile automatically

### Test Login
1. Go to: https://beerleaguehockey.ca/login
2. Use existing credentials
3. Should successfully log in

---

## Technical Details

### Before (Broken):
```sql
-- Old trigger tried to use non-existent column
INSERT INTO profiles (user_id, email, full_name) -- ❌ user_id doesn't exist
VALUES (NEW.id, NEW.email, ...)
```

### After (Fixed):
```sql
-- New trigger uses correct column
INSERT INTO profiles (id, email, full_name) -- ✅ id is the primary key
VALUES (NEW.id, NEW.email, ...)
ON CONFLICT (id) DO UPDATE ...
```

### Profiles Table Schema:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),  -- ← This is the user ID!
  email TEXT,
  full_name TEXT,
  -- NOT: user_id column
  ...
);
```

---

## Files Created

1. **`CRITICAL_AUTH_FIX.sql`** - Immediate fix to apply now
2. **`supabase/migrations/20260128_fix_handle_new_user_trigger.sql`** - Proper migration for future
3. **`AGENT2_AUTH_FIX_INSTRUCTIONS.md`** - This file (instructions)

---

## Migration Status

A proper migration file has been created:
- `supabase/migrations/20260128_fix_handle_new_user_trigger.sql`

This will be included in future database deployments, but for immediate fix, use `CRITICAL_AUTH_FIX.sql` in SQL Editor.

---

## Verification

After applying the fix, verify in Supabase SQL Editor:

```sql
-- Check trigger exists
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check for orphaned users (should be 0)
SELECT COUNT(*)
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Check profiles table schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;
```

---

## Next Steps After Fix

1. ✅ Apply CRITICAL_AUTH_FIX.sql
2. ✅ Test registration with new account
3. ✅ Test login with existing account
4. ✅ Verify no errors in Supabase auth logs
5. ✅ Update todo list and mark as complete

---

**URGENT**: This is blocking ALL user onboarding. Apply fix immediately!
