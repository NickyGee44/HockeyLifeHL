# 🔧 Auth Timeout Troubleshooting Guide

**Issue:** Auth timing out, not recognizing sign in
**Most Likely Cause:** Missing Supabase environment variables in Vercel

---

## 🚨 **IMMEDIATE FIX: Set Environment Variables**

### **Step 1: Open Vercel Dashboard**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your **HockeyLifeHL** project
3. Click **Settings** tab
4. Click **Environment Variables** in sidebar

---

### **Step 2: Add These Variables (From Your Local .env.local)**

**CRITICAL - Supabase (Required for Auth):**

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://[your-project-id].supabase.co
Environments: ✓ Production ✓ Preview ✓ Development
```

```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJ... (your anon key - starts with eyJ)
Environments: ✓ Production ✓ Preview ✓ Development
```

```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJ... (your service role key - starts with eyJ)
Environments: ✓ Production ✓ Preview ✓ Development
```

**IMPORTANT - Site URL:**

```
Name: NEXT_PUBLIC_SITE_URL
Value: https://hockey-life-hl.vercel.app
Environments: ✓ Production ✓ Preview ✓ Development
```

**Required for Features:**

```
Name: OPENAI_API_KEY
Value: sk-... (your OpenAI key)
Environments: ✓ Production ✓ Preview ✓ Development
```

```
Name: RESEND_API_KEY
Value: re_... (your Resend key)
Environments: ✓ Production ✓ Preview ✓ Development
```

**Optional (Stripe - can skip for now):**

```
Name: STRIPE_SECRET_KEY
Value: sk_test_... (test key)
Environments: ✓ Production ✓ Preview ✓ Development
```

---

### **Step 3: Redeploy**

After adding ALL variables:

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes for deployment to complete

---

## 🔍 **HOW TO FIND YOUR SUPABASE KEYS**

If you don't have your `.env.local` file handy:

1. Go to [supabase.com](https://supabase.com)
2. Login and select your project
3. Click **Settings** (gear icon)
4. Click **API** in sidebar
5. Copy these values:

**Project URL:**
```
URL: https://xxxxx.supabase.co
→ Use for: NEXT_PUBLIC_SUPABASE_URL
```

**API Keys:**
```
anon public: eyJhbGciOiJ...
→ Use for: NEXT_PUBLIC_SUPABASE_ANON_KEY

service_role: eyJhbGciOiJ... (click "Reveal" to see)
→ Use for: SUPABASE_SERVICE_ROLE_KEY
```

---

## 🧪 **VERIFY IT'S WORKING**

### **After Redeploy:**

1. **Clear browser cache** or open **Incognito window**
2. Visit: https://hockey-life-hl.vercel.app
3. **Open browser console** (F12 → Console tab)
4. Check for errors:
   - ❌ "Missing Supabase environment variables" → Env vars not set
   - ❌ "Failed to create Supabase client" → Env vars incorrect
   - ❌ Network errors to supabase.co → Check Supabase project status
   - ✅ No errors → Should work!

5. Try to login
6. Should work now!

---

## 🐛 **DEBUGGING CHECKLIST**

### **Problem: "Configuration Error" Message**

**Cause:** Missing or incorrect Supabase environment variables

**Fix:**
1. Verify all 3 Supabase env vars are set in Vercel
2. Check values match your local `.env.local` exactly
3. Ensure no extra spaces or quotes
4. Redeploy

---

### **Problem: Login Just Spins Forever**

**Cause:** Network request to Supabase is failing

**Fix:**
1. Open browser console (F12)
2. Go to **Network** tab
3. Try to login
4. Look for failed requests to `*.supabase.co`
5. Check error details
6. Common issues:
   - Wrong Supabase URL
   - Wrong anon key
   - Supabase project paused/deleted

---

### **Problem: "Auth Timeout" Error**

**Cause:** Supabase client can't connect

**Fix:**
1. Check Supabase Dashboard → Project is active
2. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
4. Check browser console for CORS errors
5. Redeploy after fixing env vars

---

### **Problem: Login Works But Dashboard Says "Not Authenticated"**

**Cause:** Session not persisting

**Fix:**
1. Check browser console for cookie errors
2. Make sure using **https://** not http://
3. Check Supabase Dashboard:
   - Authentication → URL Configuration
   - Site URL: `https://hockey-life-hl.vercel.app`
   - Redirect URLs: `https://hockey-life-hl.vercel.app/**`

---

## 🔐 **SUPABASE CONFIGURATION**

### **Update Supabase URLs** (Important!)

1. Supabase Dashboard → **Authentication** → **URL Configuration**

2. Set **Site URL:**
   ```
   https://hockey-life-hl.vercel.app
   ```

3. Set **Redirect URLs:**
   ```
   https://hockey-life-hl.vercel.app/**
   https://hockey-life-hl.vercel.app/auth/callback
   ```

4. Click **Save**

**Why this matters:**
- Email confirmation links redirect correctly
- OAuth redirects work (if you add social login later)
- Prevents CORS issues

---

## 📊 **VERIFICATION STEPS**

### **1. Check Environment Variables Are Set**

In Vercel → Settings → Environment Variables:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] `NEXT_PUBLIC_SITE_URL` is set
- [ ] `OPENAI_API_KEY` is set
- [ ] `RESEND_API_KEY` is set

All should show ✓ for all 3 environments.

---

### **2. Check Deployment Logs**

In Vercel → Deployments → Click latest deployment:

**Look for:**
- ✅ Build succeeded
- ✅ No environment variable warnings
- ❌ "Missing Supabase environment variables" → Not set correctly

---

### **3. Test in Browser Console**

Visit https://hockey-life-hl.vercel.app

**Open Console (F12) and run:**

```javascript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

**Should show:** Your Supabase URL, NOT `undefined`

**If shows `undefined`:**
- Environment variables not set
- Or set incorrectly
- Or didn't redeploy after setting them

---

### **4. Test Supabase Connection**

**In browser console:**

```javascript
// This will fail if env vars not set
try {
  const response = await fetch('https://[your-project-id].supabase.co/rest/v1/', {
    headers: {
      'apikey': 'your-anon-key',
      'Authorization': 'Bearer your-anon-key'
    }
  });
  console.log('Supabase reachable:', response.ok);
} catch (err) {
  console.error('Supabase unreachable:', err);
}
```

**Replace:**
- `[your-project-id]` with your actual project ID
- `your-anon-key` with your actual anon key

**Should see:** `Supabase reachable: true`

---

## 🆘 **STILL NOT WORKING?**

### **Option 1: Double-Check Local Works**

Test locally to confirm it's a deployment issue:

```bash
cd HockeyLifeHL
npm run dev
```

Visit http://localhost:3002 and try to login.

**If local works but Vercel doesn't:**
- Definitely an environment variable issue
- Compare `.env.local` with Vercel settings

**If local doesn't work either:**
- Supabase project issue
- Check Supabase Dashboard for errors

---

### **Option 2: Check Supabase Project Status**

1. Supabase Dashboard → Project
2. Check for paused/suspended status
3. Check billing (free tier has limits)
4. Check API logs for errors

---

### **Option 3: Fresh Deployment**

Sometimes Vercel cache causes issues:

1. Vercel → Settings → General
2. Scroll to **Danger Zone**
3. Click **Clear Build Cache**
4. Go to Deployments → Redeploy

---

## 📋 **QUICK CHECKLIST**

Before asking for more help, verify:

- [ ] All 6 required environment variables are set in Vercel
- [ ] All env vars selected for Production, Preview, Development
- [ ] Redeployed after adding env vars
- [ ] Waited 2-3 minutes for deployment to complete
- [ ] Deployment shows 🟢 Ready (not 🔴 Failed)
- [ ] Cleared browser cache or using Incognito
- [ ] Supabase project is active (not paused)
- [ ] Supabase Site URL updated to vercel.app domain
- [ ] No console errors about "Missing Supabase"

---

## 🎯 **EXPECTED RESULT AFTER FIX**

Once env vars are set and redeployed:

1. ✅ Visit https://hockey-life-hl.vercel.app
2. ✅ No console errors about configuration
3. ✅ Click "Sign In"
4. ✅ Enter email/password
5. ✅ Submit
6. ✅ Redirects to /dashboard
7. ✅ Shows your profile in header
8. ✅ Dashboard recognizes you

---

## 💡 **COMMON MISTAKES**

1. **Added env vars but didn't redeploy** → Must redeploy!
2. **Copied env vars with extra spaces** → Trim whitespace
3. **Copied env vars with quotes** → Remove quotes
4. **Used wrong Supabase project** → Double-check project
5. **Forgot to check all 3 environments** → Must select all
6. **Tested immediately** → Wait 2-3 min for deployment

---

## ✅ **SUCCESS INDICATORS**

You'll know it's working when:

- ✅ Homepage loads without console errors
- ✅ Login button works
- ✅ After login, header shows profile
- ✅ Dashboard shows your data
- ✅ Can navigate without issues
- ✅ Logout works
- ✅ Login again works

---

**NEXT STEP: Go to Vercel → Add environment variables → Redeploy**

Then try again in 3 minutes!
