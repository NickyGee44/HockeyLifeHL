# Login Process Audit Report

**Date:** 2026-01-28
**Issue:** Login not working on main site or pilot site
**Status:** CRITICAL - Authentication completely broken

---

## Executive Summary

The login process has multiple layers that could be failing:
1. Client-side authentication (login page)
2. Session persistence (cookies/localStorage)
3. Middleware session validation
4. Server-side session management

---

## Identified Issues

### 🔴 CRITICAL ISSUE #1: Conflicting Session Check in Login Page

**File:** `src/app/(auth)/login/page.tsx` (Lines 47-64)

**Problem:**
The login page has a `useEffect` that checks for existing sessions and redirects authenticated users. This runs on EVERY render and depends on `searchParams`, which can cause:
- Excessive auth checks
- Potential race conditions during login
- Interference with the login flow

**Code:**
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      window.location.replace(redirectPath);
    }
  };

  checkAuth();
}, [searchParams]); // ⚠️ Runs every time searchParams changes
```

**Impact:** HIGH - Could prevent successful login or cause redirect loops

---

### 🔴 CRITICAL ISSUE #2: Dual Authentication Methods

**Files:**
- `src/app/(auth)/login/page.tsx` (Client-side auth)
- `src/lib/auth/actions.ts` (Server action auth)

**Problem:**
There are TWO different ways to sign in:

1. **Client-side** (Currently used in login page):
   - Uses `supabase.auth.signInWithPassword()` directly in browser
   - Sets session in localStorage
   - Uses `window.location.replace()` for redirect

2. **Server action** (Not currently used):
   - Has server-side `signIn()` function
   - Uses server cookies
   - Uses Next.js `redirect()`

**Issue:** The login page uses client-side auth, but the server expects HttpOnly cookies to be set. There may be a mismatch in how sessions are being managed.

**Code Comparison:**

*Client-side (login page):*
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
// ... then window.location.replace(redirectPath)
```

*Server action (not used):*
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
// ... then redirect("/dashboard")
```

**Impact:** CRITICAL - Session may not be persisted correctly

---

### 🟡 MODERATE ISSUE #3: Cookie Configuration

**File:** `src/lib/supabase/middleware.ts` (Lines 56-68)

**Problem:**
The middleware sets enhanced cookie options with `httpOnly: true`, which means JavaScript cannot access the cookies. However, the client-side Supabase client uses `localStorage` for session management (see `src/lib/supabase/client.ts` line 29).

**Code:**
```typescript
// middleware.ts - Sets httpOnly cookies
const enhancedOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 14,
}
```

```typescript
// client.ts - Uses localStorage
storage: typeof window !== 'undefined' ? window.localStorage : undefined,
```

**Issue:** There's a potential mismatch between client-side session storage (localStorage) and server-side session storage (httpOnly cookies).

**Impact:** MODERATE - Session may not sync properly between client and server

---

### 🟡 MODERATE ISSUE #4: Multi-Tenant Complexity

**File:** `src/middleware.ts`

**Problem:**
The middleware has complex domain routing logic that handles:
- Platform domains (beerleaguehockey.ca)
- Subdomains (pilot.beerleaguehockey.ca)
- Custom domains
- Admin subdomain

**Issue:** The middleware calls `updateSession()` multiple times in different branches, and there's complex rewriting logic that could interfere with auth cookies being set properly.

**Impact:** MODERATE - Auth cookies may not be set on all domain variations

---

### 🟢 MINOR ISSUE #5: 500ms Delay After Login

**File:** `src/app/(auth)/login/page.tsx` (Line 121)

**Code:**
```typescript
// Small delay to ensure cookies are set
console.log("[Login] Waiting for cookies to be set...");
await new Promise(resolve => setTimeout(resolve, 500));
```

**Problem:** This is a workaround for a deeper issue - if cookies need 500ms to be set, something is wrong with the auth flow.

**Impact:** LOW - But indicates underlying timing issues

---

## Root Cause Analysis

Based on the code review, the most likely root cause is:

**Session Storage Mismatch:**
- Client-side Supabase client stores session in `localStorage`
- Server-side expects session in `httpOnly` cookies
- Middleware may not be properly syncing between the two

**Flow breakdown:**
1. User enters credentials and clicks "Sign In"
2. Client calls `supabase.auth.signInWithPassword()` ← Session stored in localStorage
3. Login waits 500ms for "cookies to be set" ← But client doesn't set httpOnly cookies
4. Client redirects to `/dashboard` using `window.location.replace()`
5. Middleware intercepts the request to `/dashboard`
6. Middleware calls `supabase.auth.getUser()` ← Looking for session in cookies
7. **FAILURE:** Middleware doesn't find session in cookies (only in localStorage)
8. Middleware redirects back to `/login`
9. **LOOP:** Login page's useEffect detects session in localStorage and tries to redirect again

---

## Recommended Fixes

### Fix #1: Use Server Action for Login (RECOMMENDED)

**Change the login page to use the server action instead of client-side auth.**

This ensures proper cookie management and session synchronization.

**Steps:**
1. Import `signIn` server action in login page
2. Call the server action instead of client-side `signInWithPassword`
3. Remove the 500ms delay workaround
4. Let the server action handle the redirect

**Benefits:**
- Proper httpOnly cookie management
- Server-side session validation
- No localStorage/cookie mismatch
- Simpler flow

---

### Fix #2: Remove Redundant Session Check (REQUIRED)

**Remove or fix the useEffect that checks for existing sessions.**

**Current code:**
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      window.location.replace(redirectPath);
    }
  };

  checkAuth();
}, [searchParams]);
```

**Should be:**
```typescript
// Remove entirely - middleware already handles this
```

OR at minimum:
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      window.location.replace(redirectPath);
    }
  };

  checkAuth();
}, []); // ✅ Only run once on mount, not on every searchParams change
```

---

### Fix #3: Simplify Session Management

**Choose ONE session storage method:**

**Option A:** Use httpOnly cookies everywhere (RECOMMENDED)
- Client should NOT use localStorage
- All auth flows use server actions
- Middleware handles session refresh

**Option B:** Use localStorage + cookies (current setup, needs sync)
- Client uses localStorage
- Server reads from localStorage via special cookie
- Middleware syncs localStorage to cookies

---

## Testing Checklist

After implementing fixes, test:

- [ ] Login on main domain (beerleaguehockey.ca)
- [ ] Login on pilot subdomain (pilot.beerleaguehockey.ca)
- [ ] Login on localhost
- [ ] Session persists after refresh
- [ ] Protected routes accessible after login
- [ ] Logout clears session properly
- [ ] No infinite redirect loops
- [ ] Browser console shows no errors
- [ ] Network tab shows cookies being set
- [ ] localStorage shows session (if using localStorage method)

---

## Next Steps

1. **Immediate:** Remove the useEffect session check dependency on searchParams
2. **High Priority:** Switch to server action for login
3. **Medium Priority:** Audit all domain routing in middleware
4. **Low Priority:** Remove 500ms delay workaround

---

## Questions to Answer

1. **Should we use client-side or server-side auth?**
   - Current: Client-side with localStorage
   - Recommended: Server-side with httpOnly cookies

2. **How should multi-tenant domain routing affect auth?**
   - Need to ensure cookies work on all domain variations

3. **What's the intended session lifetime?**
   - Current: 14 days (in middleware)
   - Need to verify this matches Supabase settings

---

**END OF AUDIT**
