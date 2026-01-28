# Login Issue - Root Cause Found

## 🎯 Root Cause

**Session Storage Mismatch Between Client and Server**

### What's Happening:
1. **Client-side login (`login/page.tsx`)**:
   - Uses `supabase.auth.signInWithPassword()`
   - Stores session in **localStorage**
   - Returns success: `Auth state changed: SIGNED_IN`

2. **Server-side middleware (`middleware.ts`)**:
   - Checks `await supabase.auth.getUser()`
   - Looks for session in **httpOnly cookies**
   - Finds NOTHING (cookies not set)
   - Redirects back to login: `/login?redirect=%2Fdashboard`

### Evidence:
```
Console: Auth state changed: SIGNED_IN ✅
Browser: Redirects to /login?redirect=%2Fdashboard ❌
```

---

## 🔧 The Solution

The Supabase SSR package should automatically sync localStorage → cookies, but it's not working.

### Why Cookies Aren't Being Set:

The client-side Supabase client (`src/lib/supabase/client.ts`) is configured to use localStorage only:

```typescript
storage: typeof window !== 'undefined' ? window.localStorage : undefined,
```

But the middleware expects httpOnly cookies to be set by the server-side client.

### The Mismatch:

- **Client (`client.ts`)**: Uses `@supabase/ssr` createBrowserClient → stores in localStorage
- **Middleware (`middleware.ts`)**: Uses `@supabase/ssr` createServerClient → reads from cookies
- **Problem**: No synchronization between the two!

---

## ✅ **Fix Required**

We need to use Supabase's cookie-based auth instead of localStorage-based auth.

### Option 1: Use Server Actions for Login (RECOMMENDED)

Instead of client-side `signInWithPassword`, use the server action that's already written in `src/lib/auth/actions.ts`.

**File:** `src/app/(auth)/login/page.tsx`

Change from:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

To:
```typescript
const result = await signIn(formData);
// Server action handles cookies properly
```

### Option 2: Manually Sync Session to Cookies

After client-side login, explicitly set the session in cookies using a server action.

---

## 🧪 **Testing The Issue**

Run this in browser console after "successful" login:

```javascript
// Check localStorage
console.log('LocalStorage:', localStorage.getItem('hockeylifehl-auth-token'));

// Check cookies
console.log('Cookies:', document.cookie);
```

**Expected:**
- localStorage: Has session token ✅
- Cookies: EMPTY or no auth cookies ❌

This confirms the mismatch.

---

## 📊 **Why Profile Fetch Hangs**

Secondary issue: Profile fetch starts but never completes because Fast Refresh keeps interrupting.

But even if profile loaded successfully, you'd still be redirected to login due to the cookie issue.

---

**Next Step: Implement Option 1 (use server action for login)**
