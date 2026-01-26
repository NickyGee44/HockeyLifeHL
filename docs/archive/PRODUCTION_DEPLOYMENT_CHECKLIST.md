# 🚀 Production Deployment Checklist - HockeyLifeHL

**Goal:** Successfully deploy HockeyLifeHL to production
**Timeline:** 3-5 days
**Date:** January 2026

---

## 📋 **PRE-DEPLOYMENT (Day 1-2)**

### **✅ Task 1: Database Setup & Verification**

**Step 1.1: Run Database Verification**
- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy contents of `DATABASE_VERIFICATION.sql`
- [ ] Execute script
- [ ] Review results - note any ❌ MISSING tables

**Step 1.2: Apply Migrations (if needed)**
- [ ] If tables are missing, copy `APPLY_MIGRATIONS.sql`
- [ ] Execute in SQL Editor
- [ ] Verify all tables show ✅ EXISTS
- [ ] Take screenshot of successful migration

**Expected Result:**
```
✅ payments - EXISTS
✅ email_drafts - EXISTS
✅ payment_method enum - EXISTS
✅ payment_status enum - EXISTS
```

---

### **✅ Task 2: Environment Variables Audit**

**Step 2.1: Review Current Variables**

Check `.env.local` has all required variables:

```env
# Core (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# AI (Required)
OPENAI_API_KEY=sk-xxx...

# Email (Required)
RESEND_API_KEY=re_xxx...

# Site URL (Required for Production)
NEXT_PUBLIC_SITE_URL=http://localhost:3002  # UPDATE FOR PRODUCTION

# Stripe (Required if using payments)
STRIPE_SECRET_KEY=sk_test_xxx...  # GET FROM LEAGUE OWNER
STRIPE_WEBHOOK_SECRET=whsec_xxx...  # GET FROM LEAGUE OWNER
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx...  # GET FROM LEAGUE OWNER
```

**Step 2.2: Create .env.example**
- [ ] Copy `.env.local` to `.env.example`
- [ ] Replace all actual values with placeholders:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
  # ... etc
  ```
- [ ] Commit `.env.example` to Git (safe to share)
- [ ] Ensure `.env.local` is in `.gitignore` (secret - never commit!)

---

### **✅ Task 3: Code Audit**

**Step 3.1: Build Test**
```bash
cd HockeyLifeHL
npm run build
```

- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No missing dependencies

**Step 3.2: Check for Hardcoded Values**
```bash
# Search for localhost references
grep -r "localhost:3002" src/
grep -r "127.0.0.1" src/

# Search for hardcoded URLs
grep -r "http://localhost" src/
```

- [ ] Replace any hardcoded URLs with `process.env.NEXT_PUBLIC_SITE_URL`
- [ ] No secrets in code

**Step 3.3: Security Audit**
```bash
npm audit
npm audit fix
```

- [ ] No critical vulnerabilities
- [ ] All dependencies up to date

---

### **✅ Task 4: Testing (Critical)**

**Step 4.1: Auth Testing**
- [ ] Register new account
- [ ] Verify email confirmation works
- [ ] Login successfully
- [ ] Navigate between pages (Dashboard → Stats → Teams → Admin)
- [ ] Close browser, reopen
- [ ] **Verify still logged in** ✅
- [ ] Test on mobile browser
- [ ] **Verify mobile login persists** ✅

**Step 4.2: Owner Role Testing**
- [ ] Create team
- [ ] Create season
- [ ] Create game
- [ ] Add players to roster
- [ ] Start draft (if applicable)
- [ ] Complete draft
- [ ] Enter game stats
- [ ] Verify both captains
- [ ] View standings (verify calculations)
- [ ] Generate AI article
- [ ] Publish article

**Step 4.3: Captain Role Testing**
- [ ] Login as captain
- [ ] View team roster
- [ ] Enter game stats
- [ ] Verify opponent stats
- [ ] Send team message

**Step 4.4: Player Role Testing**
- [ ] Login as player
- [ ] View personal stats
- [ ] View team page
- [ ] View schedule
- [ ] Check in to game
- [ ] Opt into season

**Step 4.5: Payment Testing (if using Stripe)**
- [ ] Get test Stripe keys from league owner
- [ ] Add to `.env.local`
- [ ] Navigate to Admin → Payments
- [ ] Add manual payment (cash) - should work
- [ ] Test Stripe checkout with test card (4242...)
- [ ] Verify payment appears in both:
  - Platform database
  - Stripe Dashboard
- [ ] Check webhook logs

**Step 4.6: Email Testing**
- [ ] Verify Resend API key is set
- [ ] Navigate to Admin → Emails
- [ ] Generate test email with AI
- [ ] Send to your email
- [ ] Verify email received
- [ ] Check formatting looks good
- [ ] Click links in email (verify they work)

---

## 🌐 **DEPLOYMENT SETUP (Day 2-3)**

### **✅ Task 5: Choose Hosting Platform**

**Recommended: Vercel**
- ✅ Free tier available
- ✅ Automatic SSL
- ✅ Easy GitHub integration
- ✅ Great Next.js support
- ✅ Environment variables UI

**Alternatives:**
- Netlify
- AWS Amplify
- Railway
- Render

**Action:**
- [ ] Create account on chosen platform
- [ ] Note account email/username

---

### **✅ Task 6: Domain Setup**

**Step 6.1: Purchase Domain (if needed)**
- [ ] Choose domain provider (GoDaddy, Namecheap, Google Domains)
- [ ] Purchase domain (e.g., `hockeylifehl.com`)
- [ ] Note domain name: _______________
- [ ] Note registrar: _______________

**Step 6.2: Domain Recommendations**
- `hockeylifehl.com` (main brand)
- `hockeylife.ca` (Canadian)
- `[your-league-name].com`

**Cost:** ~$10-20/year

---

### **✅ Task 7: Vercel Deployment**

**Step 7.1: Connect GitHub**
- [ ] Push code to GitHub (if not already)
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Click "Add New Project"
- [ ] Import Git Repository
- [ ] Select `HockeyLifeHL` repository
- [ ] Click "Deploy"

**Step 7.2: Configure Build Settings**
- Framework Preset: **Next.js**
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

- [ ] Verify settings
- [ ] Click "Deploy"
- [ ] Wait for first deployment (~2-5 minutes)

**Step 7.3: Add Environment Variables**
- [ ] In Vercel, go to Project → Settings → Environment Variables
- [ ] Add ALL variables from `.env.local`:

**Required Variables:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL (set to https://your-domain.com)
```

**Optional (if using Stripe):**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

- [ ] Click "Save" for each variable
- [ ] Set Environment to: **Production**

**Step 7.4: Redeploy**
- [ ] After adding variables, redeploy
- [ ] Go to Deployments tab
- [ ] Click "..." on latest → Redeploy

---

### **✅ Task 8: Custom Domain Configuration**

**Step 8.1: Add Domain to Vercel**
- [ ] In Vercel, go to Project → Settings → Domains
- [ ] Click "Add Domain"
- [ ] Enter your domain (e.g., `hockeylifehl.com`)
- [ ] Click "Add"

**Step 8.2: Configure DNS**

Vercel will provide DNS records. Add them to your domain registrar:

**Example (varies by registrar):**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

- [ ] Login to domain registrar
- [ ] Navigate to DNS settings
- [ ] Add A record
- [ ] Add CNAME record
- [ ] Save changes
- [ ] Wait for DNS propagation (5 min - 24 hours, usually ~30 min)

**Step 8.3: Verify Domain**
- [ ] In Vercel, check domain status
- [ ] Should show "Valid Configuration" (may take time)
- [ ] SSL certificate auto-generated (may take 5-10 min)
- [ ] Test: Visit `https://your-domain.com`
- [ ] Should load your app! 🎉

---

### **✅ Task 9: Supabase Production Configuration**

**Step 9.1: Update Supabase URL Allowlist**
- [ ] Open Supabase Dashboard
- [ ] Go to Authentication → URL Configuration
- [ ] Add production domain to Site URL:
  ```
  https://hockeylifehl.com
  ```
- [ ] Add to Redirect URLs:
  ```
  https://hockeylifehl.com/**
  https://hockeylifehl.com/auth/callback
  ```
- [ ] Save changes

**Step 9.2: Test Auth Redirects**
- [ ] Register on production site
- [ ] Check email confirmation link
- [ ] Verify redirects to production domain (not localhost)

---

### **✅ Task 10: Stripe Production Webhooks** (if using)

**Step 10.1: Create Production Webhook**
- [ ] Login to Stripe Dashboard
- [ ] Go to Developers → Webhooks
- [ ] Click "Add Endpoint"
- [ ] Enter URL:
  ```
  https://hockeylifehl.com/api/webhooks/stripe
  ```
- [ ] Select events:
  - checkout.session.completed
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - charge.refunded
- [ ] Click "Add Endpoint"
- [ ] Copy **Signing Secret** (whsec_...)

**Step 10.2: Update Environment Variable**
- [ ] In Vercel, update `STRIPE_WEBHOOK_SECRET` with new production secret
- [ ] Redeploy

**Step 10.3: Switch to Live Keys** (when ready for real payments)
- [ ] Get live Stripe keys from league owner (pk_live_, sk_live_)
- [ ] Update Vercel environment variables:
  - `STRIPE_SECRET_KEY=sk_live_...`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
- [ ] Redeploy
- [ ] Test with real card (small amount first!)

---

## ✅ **POST-DEPLOYMENT TESTING (Day 3-4)**

### **✅ Task 11: Production Smoke Tests**

**Step 11.1: Basic Functionality**
- [ ] Visit production URL
- [ ] Homepage loads correctly
- [ ] No console errors (F12 → Console)
- [ ] Styles load correctly
- [ ] Images/logos display
- [ ] Mobile view responsive

**Step 11.2: Auth Flow**
- [ ] Register new account
- [ ] Receive confirmation email
- [ ] Confirm email
- [ ] Login successfully
- [ ] Navigate around app
- [ ] Logout
- [ ] Login again
- [ ] **Session persists after browser close**

**Step 11.3: Full User Journey**

**As Owner:**
- [ ] Create team
- [ ] Create season
- [ ] Create game
- [ ] Add players
- [ ] Generate AI article
- [ ] Send email

**As Captain:**
- [ ] View team
- [ ] Enter stats
- [ ] Verify stats

**As Player:**
- [ ] View stats
- [ ] Check in to game
- [ ] View schedule

**Step 11.4: Payment Flow** (if using Stripe)
- [ ] Test manual payment entry (works)
- [ ] Test Stripe payment (test card if using test keys)
- [ ] Verify webhook received
- [ ] Check payment appears in database

---

### **✅ Task 12: Performance Check**

**Step 12.1: Load Time**
- [ ] Use PageSpeed Insights: [pagespeed.web.dev](https://pagespeed.web.dev)
- [ ] Enter production URL
- [ ] Check score (aim for 70+)
- [ ] Review recommendations

**Step 12.2: Mobile Performance**
- [ ] Test on real mobile device
- [ ] Check load time
- [ ] Test navigation
- [ ] Verify touch targets work
- [ ] Test landscape/portrait

---

### **✅ Task 13: Monitoring Setup** (Recommended)

**Step 13.1: Error Monitoring (Sentry)**
- [ ] Create account: [sentry.io](https://sentry.io)
- [ ] Create new project (Next.js)
- [ ] Install: `npm install @sentry/nextjs`
- [ ] Run: `npx @sentry/wizard -i nextjs`
- [ ] Add `SENTRY_DSN` to Vercel env vars
- [ ] Redeploy
- [ ] Test: Trigger error, check Sentry dashboard

**Step 13.2: Analytics (Vercel Analytics)**
- [ ] In Vercel, go to Analytics tab
- [ ] Click "Enable"
- [ ] Install: `npm install @vercel/analytics`
- [ ] Add to layout.tsx:
  ```tsx
  import { Analytics } from '@vercel/analytics/react';
  // ... in return:
  <Analytics />
  ```
- [ ] Commit and push
- [ ] Verify analytics tracking

---

## 🎉 **LAUNCH DAY (Day 4-5)**

### **✅ Task 14: Final Pre-Launch**

**Step 14.1: Final Checklist**
- [ ] All environment variables set
- [ ] Domain working with SSL
- [ ] Auth working (signup, login, persist)
- [ ] Database connected
- [ ] Emails sending
- [ ] Payments working (if applicable)
- [ ] No console errors
- [ ] Mobile tested
- [ ] Performance acceptable

**Step 14.2: Create Admin Account**
- [ ] Register with your real email
- [ ] Confirm email
- [ ] In Supabase, set role to 'owner':
  ```sql
  UPDATE profiles
  SET role = 'owner'
  WHERE email = 'your-admin-email@example.com';
  ```
- [ ] Logout and login
- [ ] Verify access to Admin dashboard

**Step 14.3: Backup**
- [ ] Supabase Dashboard → Settings → Database
- [ ] Create manual backup
- [ ] Download backup (for safety)

---

### **✅ Task 15: Go Live!**

**Step 15.1: Announce to Users**
- [ ] Send email to league members
- [ ] Post on social media
- [ ] Share URL: https://hockeylifehl.com

**Example Email:**
```
Subject: 🏒 HockeyLifeHL is Now Live!

Hi everyone,

I'm excited to announce that our new league management platform is now live!

Visit: https://hockeylifehl.com

What you can do:
- Register your account
- View stats and standings
- Check your schedule
- Pay season fees (optional)
- Get game notifications

Create your account today and start exploring!

See you on the ice! 🍁🏒

[Your Name]
League Commissioner
```

**Step 15.2: Monitor**
- [ ] Watch Vercel deployments for errors
- [ ] Check Sentry for any bugs
- [ ] Monitor Supabase logs
- [ ] Check Stripe dashboard (if applicable)
- [ ] Respond to user questions/issues

---

## 📊 **POST-LAUNCH (Week 1)**

### **✅ Task 16: User Onboarding**

**Day 1:**
- [ ] Help first 3-5 users register
- [ ] Walk through key features
- [ ] Document common questions

**Day 2-3:**
- [ ] Onboard team captains
- [ ] Show how to enter stats
- [ ] Demo draft system (if applicable)

**Day 4-7:**
- [ ] Monitor usage
- [ ] Gather feedback
- [ ] Fix any bugs
- [ ] Document feature requests

---

### **✅ Task 17: Documentation**

**For Users:**
- [ ] Create "Getting Started" guide
- [ ] FAQ page
- [ ] Video tutorial (optional)

**For Yourself:**
- [ ] Document admin procedures
- [ ] Backup schedule
- [ ] Emergency contacts
- [ ] Update runbook

---

### **✅ Task 18: Ongoing Maintenance**

**Daily (Week 1):**
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Respond to user issues

**Weekly:**
- [ ] Review analytics
- [ ] Check backups
- [ ] Update dependencies (if needed)

**Monthly:**
- [ ] Review Stripe payouts (if applicable)
- [ ] Database cleanup
- [ ] Performance optimization

---

## 🚨 **ROLLBACK PLAN**

If critical issues occur after launch:

**Step 1: Assess Impact**
- How many users affected?
- Is data at risk?
- Can it be fixed quickly?

**Step 2: Decide**
- **Minor bug:** Fix forward, deploy patch
- **Major bug:** Rollback to previous version

**Step 3: Rollback (if needed)**
```bash
# In Vercel dashboard
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → Promote to Production
4. Takes ~1 minute
```

**Step 4: Communicate**
- Email users about issue
- Provide timeline for fix
- Apologize for inconvenience

---

## ✅ **SUCCESS CRITERIA**

Launch is successful when:

- [ ] ✅ Site accessible at production domain
- [ ] ✅ SSL/HTTPS working
- [ ] ✅ Users can register and login
- [ ] ✅ Sessions persist across navigation
- [ ] ✅ All core features working
- [ ] ✅ Mobile experience good
- [ ] ✅ Emails sending
- [ ] ✅ Payments processing (if applicable)
- [ ] ✅ No critical errors in logs
- [ ] ✅ At least 5 active users

---

## 📞 **SUPPORT CONTACTS**

**Hosting (Vercel):**
- Dashboard: [vercel.com](https://vercel.com)
- Support: support@vercel.com

**Database (Supabase):**
- Dashboard: [supabase.com](https://supabase.com)
- Docs: [supabase.com/docs](https://supabase.com/docs)

**Payments (Stripe):**
- Dashboard: [stripe.com](https://stripe.com)
- Support: support@stripe.com

**Email (Resend):**
- Dashboard: [resend.com](https://resend.com)
- Docs: [resend.com/docs](https://resend.com/docs)

---

## 🎊 **YOU'RE LIVE!**

Congratulations! Your league management platform is now in production.

**What's Next:**
1. Gather user feedback
2. Fix any bugs
3. Add requested features
4. Consider enhancements:
   - Week management system
   - More automation
   - Multi-tenancy (other leagues)

**Remember:**
- Monitor regularly
- Back up database
- Keep dependencies updated
- Listen to users

**You did it! 🏒🎉**

---

**END OF CHECKLIST**

*Last Updated: January 2026*
*Estimated Time: 3-5 days to complete*
