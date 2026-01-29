# Production Login Issue - Diagnosis & Fix Guide

## Problem Summary

**Symptom:** On production (beerleaguehockey.ca), after logging in:
- Dashboard shows "Unset" profile parameters
- "Sign In" button still visible in header
- User appears not logged in, even though they are

**Root Cause:** Environment variables are missing or misconfigured on Vercel, causing Supabase auth to fail.

## Diagnosis Results

### ✅ What's Working
1. **Database:** All migrations applied successfully
2. **User Account:** Email confirmed, profile exists
3. **Local Development:** Auth works perfectly on localhost
4. **Build:** No compilation errors

### ❌ What's NOT Working
1. **Production Auth:** Session not being saved/read on Vercel deployment
2. **Likely Cause:** Missing environment variables on Vercel

## How Auth Detection Works

1. User logs in → Supabase sets session cookies
2. `useAuth()` hook calls `supabase.auth.getSession()` → reads from localStorage/cookies
3. Header component shows user menu if `user` exists, otherwise shows "Sign In" button

**If you see "Sign In" when logged in = session cookies aren't being saved/read**

## Fix Steps

### Step 1: Verify Environment Variables on Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Required Variables:**

**IMPORTANT:** Get these values from your `.env.local` file. DO NOT commit real secrets to Git.

```bash
# Supabase (CRITICAL for auth to work)
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# App URLs (IMPORTANT: Use production URL)
NEXT_PUBLIC_APP_URL=https://beerleaguehockey.ca
NEXT_PUBLIC_SITE_URL=https://beerleaguehockey.ca

# Email
RESEND_API_KEY=<your-resend-api-key>

# Stripe (if using payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
```

**Where to find these values:**
1. Copy from your local `.env.local` file
2. Or retrieve from:
   - Supabase: Dashboard → Settings → API
   - Resend: Dashboard → API Keys
   - Stripe: Dashboard → Developers → API keys

**CRITICAL:** Make sure these are set for **Production** environment in Vercel!

### Step 2: Verify Supabase Redirect URLs

Go to Supabase Dashboard → Authentication → URL Configuration

**Add these redirect URLs:**
```
https://beerleaguehockey.ca/auth/callback
https://beerleaguehockey.ca/auth/callback?next=/discover
https://beerleaguehockey.ca/auth/callback?next=/dashboard
```

### Step 3: Check Cookie Settings

The middleware sets cookies with these settings (already correct in code):
```typescript
{
  httpOnly: true,           // ✅ XSS protection
  sameSite: 'lax',          // ✅ Works across subdomains
  secure: true,             // ✅ HTTPS only (production)
  maxAge: 60 * 60 * 24 * 14 // ✅ 14 days
}
```

**Make sure your domain is on HTTPS** (beerleaguehockey.ca should already be HTTPS via Vercel)

### Step 4: Redeploy

After setting environment variables:

1. Go to Vercel Dashboard → Deployments
2. Click the three dots (•••) on latest deployment
3. Click "Redeploy"
4. ✅ **Check "Use existing Build Cache"** is UNCHECKED (force fresh build)

### Step 5: Test

1. Open beerleaguehockey.ca in an **incognito window** (fresh session)
2. Click "Sign In"
3. Log in with your credentials
4. You should see:
   - ✅ Your avatar in the top right (not "Sign In" button)
   - ✅ Profile data populated correctly
   - ✅ Dashboard shows your league membership

## Debugging Commands

If issues persist after deploying, run these locally to verify database state:

```bash
# Check your user account
node scripts/check-user-profile.mjs grossi16n@hotmail.com

# List all users
node scripts/list-all-users.mjs

# Manually confirm email (if needed)
node scripts/confirm-user-email.mjs grossi16n@hotmail.com
```

## Common Issues & Fixes

### Issue: "Configuration error" message
**Cause:** Supabase client can't initialize (missing env vars)
**Fix:** Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel

### Issue: Redirects to /login immediately after sign in
**Cause:** Session not being saved
**Fix:**
1. Check cookie settings (secure flag requires HTTPS)
2. Verify redirect URLs in Supabase
3. Check browser console for cookie errors

### Issue: Email confirmation link doesn't work
**Cause:** Redirect URL mismatch
**Fix:** Update `NEXT_PUBLIC_SITE_URL` to match your production domain

## Current Account Status

**Your Account (grossi16n@hotmail.com):**
- ✅ Email confirmed
- ✅ Profile exists (Nick Grossi, #44, D)
- ✅ League membership (HockeyLifeHL Original)
- ✅ Last sign-in: 2026-01-29

**The account is fully functional. The issue is purely frontend session detection on production.**

## Next Steps

1. Add environment variables to Vercel ← START HERE
2. Redeploy with fresh build
3. Test in incognito window
4. If still not working, check browser console for errors and share them

The fix should take less than 5 minutes once you add the environment variables!
