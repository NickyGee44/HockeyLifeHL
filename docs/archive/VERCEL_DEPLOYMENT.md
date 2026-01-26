# 🚀 Vercel Deployment - Quick Guide

**Status:** Code pushed to GitHub ✅
**Deployment URL:** https://hockey-life-hl.vercel.app
**Timeline:** 5-10 minutes to complete

---

## ✅ **WHAT JUST HAPPENED**

Your code has been pushed to GitHub! Vercel should automatically detect this and start deploying.

**Check Deployment Status:**
1. Go to [vercel.com](https://vercel.com)
2. Login
3. Find "HockeyLifeHL" project
4. Check "Deployments" tab
5. Should see a deployment in progress (yellow spinner)

---

## 🔧 **STEP 1: ADD ENVIRONMENT VARIABLES**

The deployment will likely **fail** or **not work correctly** because environment variables aren't set yet.

### **Go to Vercel Dashboard:**

1. Navigate to your project: **HockeyLifeHL**
2. Click **Settings** tab
3. Click **Environment Variables** in sidebar

---

### **Add These Variables:**

Copy from your local `.env.local` file and add to Vercel:

#### **Required - Supabase (From your .env.local):**
```
NEXT_PUBLIC_SUPABASE_URL
Value: https://[your-project-id].supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJ... (your anon key)

SUPABASE_SERVICE_ROLE_KEY
Value: eyJ... (your service role key)
```

#### **Required - AI (From your .env.local):**
```
OPENAI_API_KEY
Value: sk-... (your OpenAI key)
```

#### **Required - Email (From your .env.local):**
```
RESEND_API_KEY
Value: re_... (your Resend key)
```

#### **Required - Site URL (NEW!):**
```
NEXT_PUBLIC_SITE_URL
Value: https://hockey-life-hl.vercel.app
```

#### **Optional - Stripe (Use test keys for now):**
```
STRIPE_SECRET_KEY
Value: sk_test_51... (test key - get from stripe.com/test)

STRIPE_WEBHOOK_SECRET
Value: whsec_... (skip for now, set up later)

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
Value: pk_test_51... (test key - get from stripe.com/test)
```

---

### **For Each Variable:**

1. Click **Add New**
2. Enter **Name** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter **Value** (paste from your .env.local)
4. Select Environment: **Production** ✅, **Preview** ✅, **Development** ✅
5. Click **Save**

**Repeat for all variables above**

---

## 🔄 **STEP 2: REDEPLOY**

After adding all variables:

1. Go to **Deployments** tab
2. Find the most recent deployment
3. Click the **three dots (⋯)** on the right
4. Click **Redeploy**
5. Confirm **Redeploy**

**Wait:** 2-5 minutes for deployment to complete

---

## ✅ **STEP 3: VERIFY DEPLOYMENT**

### **Check Build Status:**

1. In Deployments tab
2. Wait for status to change from 🟡 Building → 🟢 Ready
3. If 🔴 Failed, click on it to see error logs

### **Visit Your Site:**

1. Once deployment shows 🟢 Ready
2. Click **Visit** button
3. Or go to: **https://hockey-life-hl.vercel.app**

**Should see:**
- ✅ HockeyLifeHL homepage loads
- ✅ Proper styling
- ✅ No console errors (F12)

---

## 🧪 **STEP 4: TEST CRITICAL FEATURES**

### **Test 1: Homepage**
- [ ] Visit https://hockey-life-hl.vercel.app
- [ ] Page loads correctly
- [ ] Logo displays
- [ ] Navigation works

### **Test 2: Authentication**
- [ ] Click "Register" or "Sign Up"
- [ ] Create new account
- [ ] Check email for confirmation
- [ ] Confirm email (link should redirect to vercel.app, NOT localhost)
- [ ] Login successfully
- [ ] Navigate to Dashboard

**⚠️ If email links redirect to localhost:**
- Go to Supabase Dashboard
- Authentication → URL Configuration
- Update Site URL to: `https://hockey-life-hl.vercel.app`
- Update Redirect URLs to: `https://hockey-life-hl.vercel.app/**`

### **Test 3: Session Persistence**
- [ ] Login
- [ ] Navigate: Dashboard → Stats → Teams
- [ ] Close browser completely
- [ ] Reopen browser
- [ ] Go to https://hockey-life-hl.vercel.app
- [ ] **Should still be logged in!** ✅

### **Test 4: Mobile**
- [ ] Open on phone: https://hockey-life-hl.vercel.app
- [ ] Login
- [ ] Navigate around
- [ ] Switch apps, come back
- [ ] **Should stay logged in!** ✅

---

## 🗄️ **STEP 5: APPLY DATABASE MIGRATIONS**

Your production Supabase likely needs the payments and email_drafts tables.

### **Run Migrations:**

1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy entire contents of `DATABASE_VERIFICATION.sql`
4. Paste and Execute
5. Check results - look for ❌ MISSING

**If tables missing:**
1. Copy entire contents of `APPLY_MIGRATIONS.sql`
2. Paste in SQL Editor
3. Execute
4. Verify all tables show ✅ EXISTS

---

## 🎯 **STEP 6: CREATE ADMIN ACCOUNT**

1. On Vercel deployment, register with your email
2. Confirm email
3. Login
4. Go to Supabase Dashboard → SQL Editor
5. Run this:
```sql
UPDATE profiles
SET role = 'owner'
WHERE email = 'your-email@example.com';
```
6. Logout and login
7. Navigate to `/admin`
8. **Should see Admin Dashboard!** ✅

---

## 🧪 **STEP 7: FULL FEATURE TEST**

Now test everything on the live site:

### **As Owner:**
- [ ] Create a test team
- [ ] Create a test season
- [ ] Create a test game
- [ ] Add players to roster
- [ ] Navigate to Admin → Emails
- [ ] Generate test email
- [ ] Send to yourself
- [ ] Check email received

### **As Player/Captain:**
- [ ] Create another account
- [ ] Set as captain in database
- [ ] Login as captain
- [ ] Test captain features
- [ ] Test stat entry

---

## 🚨 **TROUBLESHOOTING**

### **Problem: Build Failed**

**Check:**
1. Vercel → Deployments → Click failed deployment
2. Read error log
3. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Module not found

**Fix:**
- Add missing env vars
- Check error message
- Redeploy

---

### **Problem: Site Loads but Features Don't Work**

**Check:**
1. Browser console (F12)
2. Look for errors
3. Common issues:
   - Missing Supabase env vars → API calls fail
   - Wrong SITE_URL → redirects broken
   - Missing database tables → queries fail

**Fix:**
- Add missing env vars
- Update SITE_URL in Supabase
- Run database migrations

---

### **Problem: Email Confirmation Links Go to Localhost**

**Fix:**
1. Supabase Dashboard
2. Authentication → URL Configuration
3. Site URL: `https://hockey-life-hl.vercel.app`
4. Redirect URLs: `https://hockey-life-hl.vercel.app/**`
5. Save
6. Try registering new account

---

### **Problem: "Configuration Error" on Page Load**

**Likely:** Missing Supabase environment variables

**Fix:**
1. Vercel → Settings → Environment Variables
2. Verify all three Supabase vars are set:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
3. Redeploy

---

## ✅ **SUCCESS CRITERIA**

Deployment is successful when:

- [ ] ✅ Site loads at https://hockey-life-hl.vercel.app
- [ ] ✅ Can register new account
- [ ] ✅ Email confirmation works (redirects to vercel.app)
- [ ] ✅ Can login successfully
- [ ] ✅ Session persists across pages
- [ ] ✅ Session persists after browser close
- [ ] ✅ Admin dashboard accessible (after setting owner role)
- [ ] ✅ Can create teams/seasons/games
- [ ] ✅ Stats pages load correctly
- [ ] ✅ Mobile works well
- [ ] ✅ No console errors

---

## 📊 **MONITORING**

### **Check These Regularly:**

**Vercel Dashboard:**
- Deployments tab - ensure successful
- Analytics tab - see traffic
- Logs tab - check for errors

**Supabase Dashboard:**
- Table Editor - verify data
- Database - check connections
- Auth - monitor user signups

**Email (Resend):**
- Dashboard - verify emails sending
- Logs - check delivery status

---

## 🎉 **NEXT STEPS AFTER SUCCESSFUL DEPLOYMENT**

1. **Share Test URL:**
   - Send https://hockey-life-hl.vercel.app to a few test users
   - Get feedback
   - Fix any bugs

2. **Optional: Custom Domain**
   - Purchase domain (e.g., hockeylifehl.com)
   - Add to Vercel (Settings → Domains)
   - Update DNS records
   - Update SITE_URL everywhere

3. **Set Up Stripe (When Ready for Real Payments):**
   - Get live Stripe keys from league owner
   - Update Vercel env vars
   - Set up webhook endpoint
   - Test with real card (small amount)

4. **Monitor First Week:**
   - Watch for errors
   - Gather user feedback
   - Fix bugs quickly
   - Document issues

---

## 🔐 **STRIPE TEST KEYS (FOR NOW)**

Since you mentioned using fake Stripe for now, here's how to get test keys:

1. Go to [stripe.com](https://stripe.com)
2. Create free account (or login)
3. Toggle to **Test Mode** (switch in top right)
4. Developers → API Keys
5. Copy test keys:
   ```
   Publishable key: pk_test_...
   Secret key: sk_test_...
   ```

6. Add to Vercel env vars
7. Redeploy

**Test Card:** 4242 4242 4242 4242 (any expiry, any CVC)

**When league signs on:**
- They provide their live keys
- You swap test → live
- Redeploy
- Real payments work!

---

## 🎊 **YOU'RE DEPLOYING!**

Your code is pushed, Vercel is building. Follow this guide step-by-step and you'll have a live test site in ~10 minutes!

**Current Status:**
- ✅ Code pushed to GitHub
- 🟡 Vercel deploying (check vercel.com)
- ⏳ Waiting for you to add env vars
- ⏳ Redeploy after env vars
- ⏳ Test the site!

**Next:** Add environment variables in Vercel and redeploy!

---

**END OF GUIDE**

*Good luck! You're minutes away from a live deployment! 🚀*
