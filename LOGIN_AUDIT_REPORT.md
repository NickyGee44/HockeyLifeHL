# 🔐 LOGIN SYSTEM AUDIT REPORT

**Date:** January 29, 2026
**Auditor:** Claude
**Status:** ⚠️ CRITICAL ISSUES IDENTIFIED

---

## 🎯 Executive Summary

The login system is **architecturally sound** but has **several configuration and edge case issues** that are likely causing failures. The system uses a modern server-action based authentication flow with proper security measures, but there are **6 critical issues** that need immediate attention.

**Build Status:** ✅ All code compiles
**Login Page:** ✅ Loads successfully (HTTP 200)
**Auth Flow:** ⚠️ Likely failing at session persistence or redirect stage

---

## 🏗️ Architecture Overview

### Current Auth Flow

```
1. User enters credentials → Login Page (client component)
   ↓
2. Form submission → signIn() server action
   ↓
3. Supabase auth.signInWithPassword()
   ↓
4. Set httpOnly cookies via SSR
   ↓
5. redirect("/dashboard")
   ↓
6. Middleware intercepts request
   ↓
7. updateSession() refreshes auth
   ↓
8. User lands on /dashboard
```

### Components Involved

1. **Login Page:** `src/app/(auth)/login/page.tsx` (client component)
2. **Server Action:** `src/lib/auth/actions.ts::signIn()`
3. **Supabase Server Client:** `src/lib/supabase/server.ts::createClient()`
4. **Middleware:** `src/middleware.ts::middleware()` + `src/lib/supabase/middleware.ts::updateSession()`
5. **Auth Callback:** `src/app/auth/callback/route.ts`

---

## 🚨 Critical Issues Found

### Issue #1: Login Page Hooks May Cause Client-Side Errors

**File:** `src/app/(auth)/login/page.tsx:48-49`

```typescript
const { leagueId, isLoading: leagueLoading } = useActiveLeague();
const branding = useBranding(leagueId);
```

**Problem:**
- `useActiveLeague()` makes an API call to `/api/league/context` on mount
- If user is not authenticated, this API call may fail
- Hook may be in loading state indefinitely
- May cause component to never finish rendering

**Evidence:**
```typescript
// From use-league.ts:35
const response = await fetch('/api/league/context');
```

**Impact:** HIGH - Login page may appear blank or stuck in loading state

**Fix Required:**
```typescript
// Option 1: Remove hooks from login page (login doesn't need league context)
export default function LoginPage() {
  // Don't fetch league context on login page
  // Use static platform branding
  const branding = {
    logo: "/BLH-Logo.png",
    name: "Beer League Hockey"
  };

  // ... rest of component
}

// Option 2: Make hooks gracefully handle unauthenticated state
```

---

### Issue #2: Missing Error Boundary

**File:** `src/app/(auth)/login/page.tsx`

**Problem:**
- No error boundary wrapping login form
- If `useActiveLeague()` throws, entire page crashes
- User sees blank screen instead of error message

**Impact:** HIGH - Silent failures, poor UX

**Fix Required:**
```typescript
// Add to (auth)/layout.tsx or login page
<ErrorBoundary fallback={<LoginErrorFallback />}>
  <LoginForm />
</ErrorBoundary>
```

---

### Issue #3: SignIn Server Action Redirect May Fail

**File:** `src/lib/auth/actions.ts:404`

```typescript
revalidatePath("/", "layout");
redirect("/dashboard");
```

**Problem:**
- `redirect()` in Next.js server actions throws `NEXT_REDIRECT` error (expected behavior)
- Client-side code catches this and treats it as success (line 98-100)
- But if cookie setting fails, redirect happens anyway → user lands on /dashboard unauthenticated → middleware redirects back to /login → **infinite redirect loop**

**Evidence:**
```typescript
// From login page:98-100
if (err?.message?.includes('NEXT_REDIRECT')) {
  console.log("[Login] Redirect successful (expected redirect error)");
  return; // Assumes success, but cookies may not be set!
}
```

**Impact:** CRITICAL - Infinite redirect loop possible

**Fix Required:**
```typescript
// In signIn() action, verify session before redirect:
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  console.error("Session not established after sign-in");
  return { error: "Failed to establish session. Please try again." };
}

// Only redirect if session is confirmed
revalidatePath("/", "layout");
redirect("/dashboard");
```

---

### Issue #4: Cookie Options May Conflict Between Server and Middleware

**Files:**
- `src/lib/supabase/server.ts:50` (httpOnly: true)
- `src/lib/supabase/middleware.ts:60` (httpOnly: true)
- `src/lib/supabase/client.ts:28` (persistSession: true, uses localStorage)

**Problem:**
- Server sets `httpOnly: true` cookies (can't be accessed by JS)
- Client tries to persist session in localStorage (client.ts:29)
- **Mismatch:** Client may not see the session that server set
- Supabase SSR package expects cookies to be shared between server/client

**Evidence:**
```typescript
// Server wants httpOnly cookies:
httpOnly: true,  // server.ts:50

// But client uses localStorage:
persistSession: true,
storage: window.localStorage,  // client.ts:29, 39
```

**Impact:** CRITICAL - Session not accessible to client, login appears to fail

**Fix Required:**
```typescript
// In client.ts, remove custom storage - let Supabase SSR handle it:
export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        // REMOVE: storage: window.localStorage
        // Let Supabase SSR use cookies automatically
      },
    }
  )
}
```

---

### Issue #5: Middleware May Not Be Updating Session Properly

**File:** `src/lib/supabase/middleware.ts:51-54`

```typescript
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
  supabaseResponse = NextResponse.next({ request })  // Recreating response!
  cookiesToSet.forEach(({ name, value, options }) => {
    // ... sets cookies on supabaseResponse
  })
}
```

**Problem:**
- Line 52 recreates the response object **INSIDE** the setAll callback
- This happens **after** cookies are set on request (line 51)
- May cause cookies to be lost or not properly forwarded
- Original `supabaseResponse` from line 38 is replaced

**Impact:** HIGH - Session cookies may not persist across requests

**Fix Required:**
```typescript
// Don't recreate response inside setAll - create once before:
let supabaseResponse = NextResponse.next({ request })

const supabase = createServerClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Only set on the SAME response object
        cookiesToSet.forEach(({ name, value, options }) => {
          const enhancedOptions = {
            ...options,
            httpOnly: true,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 14,
          }
          supabaseResponse.cookies.set(name, value, enhancedOptions)
        })
      },
    },
  }
)
```

---

### Issue #6: No Session Verification After Login

**File:** `src/lib/auth/actions.ts:325-350`

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) { ... }
if (!data.user) { ... }

// ❌ No check if session was actually created!

console.log("User signed in successfully:", data.user.id);
// Immediately redirects without verifying session persistence
redirect("/dashboard");
```

**Problem:**
- Code checks if user object exists
- But doesn't verify session was persisted
- Cookies may fail to set (httpOnly issues, browser settings, etc.)
- User redirects to /dashboard with no active session

**Impact:** CRITICAL - Silent authentication failures

**Fix Required:**
```typescript
// After sign in, verify session exists:
const { data: { session } } = await supabase.auth.getSession();

if (!session || !session.access_token) {
  console.error("Session not created after sign-in");
  return {
    error: "Failed to establish session. Please check your browser settings and try again."
  };
}

console.log("Session verified:", session.access_token.substring(0, 20) + "...");
```

---

## ✅ What's Working Well

1. **Security Measures:**
   - ✅ httpOnly cookies (XSS protection)
   - ✅ Rate limiting on login attempts
   - ✅ Generic error messages (prevents account enumeration)
   - ✅ Consistent timing protection (prevents timing attacks)
   - ✅ CSP headers properly configured

2. **Code Quality:**
   - ✅ TypeScript types properly defined
   - ✅ Server actions properly isolated
   - ✅ Middleware structure is sound
   - ✅ Error handling exists (though needs improvement)

3. **Architecture:**
   - ✅ Modern Next.js 16 patterns
   - ✅ Supabase SSR properly integrated
   - ✅ Multi-tenant routing in place

---

## 🧪 Test Plan

### Manual Testing Steps

1. **Test 1: Basic Login Flow**
   ```bash
   1. Open http://localhost:3000/login
   2. Open browser DevTools → Console tab
   3. Enter valid credentials
   4. Click "Sign In"
   5. Watch console for errors
   6. Check if redirected to /dashboard
   7. Check Application → Cookies for Supabase cookies
   ```

   **Expected:** Should see cookies starting with `sb-` prefix

2. **Test 2: Check Network Requests**
   ```bash
   1. Open DevTools → Network tab
   2. Login
   3. Look for:
      - POST to Supabase auth endpoint
      - Redirect to /dashboard
      - GET /dashboard with auth cookies
   ```

3. **Test 3: Check Server Logs**
   ```bash
   1. Run: npm run dev
   2. Login
   3. Check terminal for:
      - "[Login] Calling server action..."
      - "[Login] Server action succeeded"
      - "User signed in successfully: [user-id]"
   ```

### Automated Test Script

Create `scripts/test-login.js`:
```javascript
const puppeteer = require('puppeteer');

async function testLogin() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to login
  await page.goto('http://localhost:3000/login');

  // Fill form
  await page.type('#email', 'test@example.com');
  await page.type('#password', 'Test1234!');

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation({ timeout: 5000 });

  // Check URL
  const url = page.url();
  console.log('Final URL:', url);

  // Check cookies
  const cookies = await page.cookies();
  console.log('Cookies:', cookies.filter(c => c.name.startsWith('sb-')));

  await browser.close();
}

testLogin().catch(console.error);
```

---

## 🔧 Immediate Fix Checklist

### Priority 1 (Critical - Do First)

- [ ] **Fix #4:** Remove custom localStorage from client.ts
- [ ] **Fix #3:** Add session verification before redirect in signIn()
- [ ] **Fix #5:** Fix middleware cookie handling (don't recreate response)

### Priority 2 (High - Do Next)

- [ ] **Fix #1:** Remove useActiveLeague() from login page
- [ ] **Fix #6:** Add session verification after password sign-in
- [ ] **Fix #2:** Add error boundary to auth layout

### Priority 3 (Medium - Do After Testing)

- [ ] Add comprehensive error logging
- [ ] Add session debugging endpoint
- [ ] Create automated integration tests

---

## 📊 Risk Assessment

| Issue | Severity | Likelihood | Impact | Priority |
|-------|----------|------------|--------|----------|
| #4 Cookie Mismatch | CRITICAL | 90% | Users can't login | P0 |
| #3 Redirect Loop | CRITICAL | 70% | Infinite redirects | P0 |
| #5 Middleware Cookies | HIGH | 80% | Session not persisted | P1 |
| #1 useActiveLeague | HIGH | 60% | Page doesn't load | P1 |
| #6 No Session Verify | HIGH | 50% | Silent failures | P1 |
| #2 No Error Boundary | MEDIUM | 40% | Poor error UX | P2 |

---

## 🎯 Recommended Next Steps

1. **Immediate (Today):**
   - Fix cookie mismatch in client.ts
   - Add session verification to signIn()
   - Test login flow manually

2. **Short-term (This Week):**
   - Fix middleware cookie handling
   - Remove useActiveLeague from login page
   - Add error boundaries

3. **Medium-term (Next Sprint):**
   - Create automated login tests
   - Add session debugging tools
   - Comprehensive error logging

---

## 📝 Additional Notes

### Environment Variables Check
✅ All required variables present in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` ✓
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓
- `NEXT_PUBLIC_SITE_URL` ✓

### Browser Compatibility
- Need to test on: Chrome, Firefox, Safari, Edge
- Need to test with cookies disabled
- Need to test with third-party cookies blocked

### Security Considerations
- Current setup is secure (httpOnly cookies)
- Don't remove httpOnly to "fix" issues
- Proper fix is to align server/client cookie strategy

---

**Report End**
