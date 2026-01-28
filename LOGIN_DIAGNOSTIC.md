# Login Diagnostic Steps

## Quick Fix Applied

I've fixed the most likely issue: **The login page's useEffect was running on every `searchParams` change**, which could cause race conditions and interfere with the login flow.

**Change made:**
- Changed dependency from `[searchParams]` to `[]`
- Now only runs once on mount instead of repeatedly

---

## How to Test the Fix

1. **Clear your browser data:**
   ```
   - Clear cookies for beerleaguehockey.ca and localhost
   - Clear localStorage
   - Close all browser tabs
   - Open a fresh incognito/private window
   ```

2. **Try logging in:**
   - Go to the login page
   - Open browser DevTools (F12)
   - Go to Console tab
   - Enter valid credentials
   - Click "Sign In"

3. **Watch the console output:**
   You should see logs like:
   ```
   [LoginPage] Component mounted
   [LoginPage] No active session
   [LoginPage] Button clicked
   [LoginPage] Form onSubmit fired
   [Login] Form submitted
   [Login] Attempting sign in...
   [Login] User signed in successfully: <user-id>
   [Login] Waiting for cookies to be set...
   [Login] Redirecting to: /dashboard
   ```

4. **If it still fails, check for errors:**
   - Look for red error messages in console
   - Check the Network tab for failed requests
   - Check Application > Cookies for auth cookies
   - Check Application > Local Storage for session data

---

## Additional Diagnostics

### Check 1: Verify Supabase Connection

Open browser console on the login page and run:
```javascript
const supabase = window.Cypress?.env ? null :
  await import('@/lib/supabase/client').then(m => m.createClient());

const { data, error } = await supabase.auth.getSession();
console.log('Session:', data);
console.log('Error:', error);
```

Expected: `Session: null` or `Session: { user: {...} }` if already logged in

---

### Check 2: Test Login Manually

In browser console on login page:
```javascript
const { createClient } = await import('@/lib/supabase/client');
const supabase = createClient();

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'your-email@example.com',
  password: 'your-password'
});

console.log('Login result:', { data, error });
```

Expected: `data.user` should be populated, `error` should be null

---

### Check 3: Verify Cookies

After login attempt:
1. Open DevTools > Application tab
2. Click "Cookies" in left sidebar
3. Look for cookies with names starting with `sb-` or `hockeylifehl-auth-token`
4. Check that cookies exist and have values

---

### Check 4: Verify Environment Variables

In terminal, run:
```bash
cat .env.local | grep SUPABASE
```

Expected output:
```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Both should be present and have values.

---

## Common Issues and Solutions

### Issue: "Missing Supabase environment variables" error

**Solution:**
- Check `.env.local` file exists
- Restart dev server: `npm run dev`
- Clear Next.js cache: `rm -rf .next`

---

### Issue: Login succeeds but immediately redirects back to login

**Cause:** Session not persisting between client and server

**Solution:**
1. Check that cookies are being set (see Check 3 above)
2. Verify middleware is reading session correctly
3. Try disabling browser extensions that block cookies
4. Check if you're on HTTPS in production (cookies with `secure: true` only work on HTTPS)

---

### Issue: "Invalid login credentials" error with correct credentials

**Possible causes:**
1. User doesn't exist in Supabase
2. Email not confirmed (check Supabase Dashboard > Authentication > Users)
3. User account disabled

**Solution:**
- Go to Supabase Dashboard
- Check Authentication > Users
- Find the user by email
- Check "Email Confirmed" column
- Check "User Status" column

---

### Issue: Login works on localhost but not on deployed site

**Causes:**
1. Environment variables not set in deployment platform
2. Cookie domain mismatch
3. CORS issues

**Solution:**
1. Verify environment variables in Vercel/hosting platform
2. Check that `NEXT_PUBLIC_SITE_URL` is set correctly
3. Verify Supabase site URL configuration allows your domain

---

## Deep Dive: If Quick Fix Didn't Work

If the login still doesn't work after the fix, the issue is likely:

### Hypothesis 1: Session Storage Mismatch

**Problem:** Client uses localStorage, server expects httpOnly cookies

**How to test:**
1. After successful login, check both:
   - localStorage (DevTools > Application > Local Storage)
   - Cookies (DevTools > Application > Cookies)
2. You should see session data in localStorage
3. You may or may not see auth cookies (depends on configuration)

**If localStorage has session but cookies don't:**
This confirms the mismatch. The middleware is looking for cookies that don't exist.

**Solution:**
Switch to server-side login (see LOGIN_AUDIT_REPORT.md Fix #1)

---

### Hypothesis 2: Middleware Interference

**Problem:** Complex domain routing in middleware is interfering with auth

**How to test:**
1. Temporarily simplify middleware to only handle auth, no domain routing
2. Test login
3. If it works, the issue is in domain routing logic

**Solution:**
Debug middleware domain routing (see LOGIN_AUDIT_REPORT.md Issue #4)

---

### Hypothesis 3: Supabase Configuration Issue

**Problem:** Supabase project settings are incorrect

**How to check:**
1. Go to Supabase Dashboard
2. Settings > Authentication
3. Check:
   - "Enable email confirmations" - Set to disabled for testing
   - "Site URL" - Should match your deployment URL
   - "Redirect URLs" - Should include all your domains

**Solution:**
Update Supabase authentication settings

---

## Emergency Fallback: Bypass Client-Side Check

If you need to login immediately and can't wait for a proper fix:

**Temporary workaround** (NOT recommended for production):

Edit `src/app/(auth)/login/page.tsx`:
```typescript
// Comment out the entire useEffect (lines 47-65)
/*
useEffect(() => {
  ...
}, []);
*/
```

This disables the "already authenticated" check entirely, allowing you to always access the login page.

**WARNING:** This is a bandaid. You still need to fix the underlying session persistence issue.

---

## Next Steps

1. **Try the quick fix** (already applied)
2. **Run diagnostic checks above**
3. **Report back with:**
   - Console logs during login attempt
   - Cookie/localStorage contents
   - Any error messages
4. **If still broken:** We'll implement Fix #1 from the audit report (switch to server action)

---

**Created:** 2026-01-28
**Status:** Quick fix applied, awaiting test results
