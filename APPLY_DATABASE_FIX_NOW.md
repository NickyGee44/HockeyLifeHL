# 🚨 URGENT: Apply Complete Database Fix

**Date**: January 28, 2026
**Status**: CRITICAL - Apply Immediately
**Time Required**: 2 minutes

---

## The Problem

You're experiencing TWO database issues:

1. **Missing columns in leagues table**: `sport`, `subdomain`, `owner_id`, `accent_color`
   - Error: `column "sport" of relation "leagues" does not exist`
   - Blocks: League signup functionality

2. **Broken authentication trigger**: `handle_new_user()` uses non-existent `user_id` column
   - Error: `column "user_id" of relation "profiles" does not exist`
   - Blocks: ALL user registration and login

---

## The Solution (2 Steps)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**

### Step 2: Apply the Complete Fix

1. Open the file: `COMPLETE_DATABASE_FIX.sql`
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **"RUN"** (or press Ctrl+Enter)

### Expected Output:

You should see:
```
✓ Part 1 complete: Missing leagues columns added
✓ Part 2 complete: Auth trigger fixed
✓ Part 3 complete: Orphaned users fixed

==============================================
   COMPLETE DATABASE FIX - FINAL STATUS
==============================================

📋 LEAGUES TABLE COLUMNS:
  sport: ✓ EXISTS
  subdomain: ✓ EXISTS
  owner_id: ✓ EXISTS
  accent_color: ✓ EXISTS

🔐 AUTHENTICATION:
  handle_new_user() trigger: ✓ ACTIVE
  Orphaned users: 0 (should be 0)

✅ ALL FIXES APPLIED SUCCESSFULLY!

🎉 Your database is now ready:
   • User registration will work
   • User login will work
   • League signup will work

👉 Go test your app now!
```

---

## What Gets Fixed

### Leagues Table:
- ✅ Adds `sport` column (default: 'hockey')
- ✅ Adds `subdomain` column for custom subdomains
- ✅ Adds `owner_id` column to track league owner
- ✅ Adds `accent_color` column for branding
- ✅ Adds proper constraints and indexes

### Authentication:
- ✅ Fixes `handle_new_user()` trigger to use correct column (`id` not `user_id`)
- ✅ Recreates trigger on `auth.users` table
- ✅ Adds RLS policy for service role
- ✅ Fixes any orphaned users (auth accounts without profiles)

---

## Testing After Fix

### Test 1: Registration
1. Go to your registration page
2. Create a new test account
3. Should succeed without errors

### Test 2: Login
1. Go to your login page
2. Use existing credentials
3. Should successfully log in

### Test 3: League Signup (if applicable)
1. Try creating a new league
2. Should work without "sport column" error

---

## Troubleshooting

### If you see "permission denied" errors:
- Make sure you're running this in the **Supabase SQL Editor**
- You may need to be logged in as a database admin

### If you see "already exists" warnings:
- This is NORMAL - the script checks before adding
- As long as you see the final "✅ ALL FIXES APPLIED" message, you're good

### If trigger still missing:
Run this verification query:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```
Should return 1 row showing the trigger exists.

---

## Alternative: Apply Individual Fixes

If you prefer to apply fixes one at a time:

1. **For missing columns only**: Use `QUICK_FIX_MISSING_COLUMNS.sql`
2. **For auth trigger only**: Use `CRITICAL_AUTH_FIX.sql`

But **RECOMMENDED**: Use `COMPLETE_DATABASE_FIX.sql` to fix everything at once.

---

## Files Reference

- **`COMPLETE_DATABASE_FIX.sql`** ← **USE THIS ONE** (fixes everything)
- `QUICK_FIX_MISSING_COLUMNS.sql` (partial fix - columns only)
- `CRITICAL_AUTH_FIX.sql` (partial fix - auth only)
- `APPLY_DATABASE_FIX_NOW.md` (this file - instructions)

---

## After Applying Fix

Your application will be production-ready:
- ✅ User registration works
- ✅ User login works
- ✅ League signup works
- ✅ All database columns exist
- ✅ Authentication trigger functional

**Next**: Test your app and deploy! 🚀

---

**Questions?** The fix is safe, idempotent (can run multiple times), and includes verification checks.
