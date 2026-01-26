# Multi-Instance Architecture - Quick Start Guide

## 🚀 Step 1: Apply Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Open: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
2. Copy contents from: `apply_multi_instance_fixed.sql`
3. Paste and click **RUN**
4. Verify success message: "✅ Multi-instance architecture applied successfully!"

**Option B: Command Line**
```bash
psql "YOUR_DATABASE_URL" < apply_multi_instance_fixed.sql
```

---

## 🌐 Step 2: Configure Hosts File (For Local Testing)

**Windows:** Edit `C:\Windows\System32\drivers\etc\hosts` as Administrator

**Mac/Linux:** Edit `/etc/hosts` with sudo

Add these lines:
```
127.0.0.1 pilot.beerleaguehockey.local
127.0.0.1 alpha.beerleaguehockey.local
127.0.0.1 beta.beerleaguehockey.local
127.0.0.1 gamma.local
```

Save and close.

---

## 🧪 Step 3: Create Test Data (Optional)

```bash
cd HockeyLifeHL
npm run test:data:create
```

This creates 3 test leagues (Alpha, Beta, Gamma) with sample data.

---

## 🏃 Step 4: Start Development Server

```bash
cd HockeyLifeHL
npm run dev
```

---

## ✅ Step 5: Test the Multi-Instance Routing

### Test 1: Platform Site (BLH Branding)
```
URL: http://localhost:3000
Expected: Beer League Hockey marketing page with blue/red branding
```

### Test 2: Pilot League (HockeyLifeHL Branding)
```
URL: http://pilot.beerleaguehockey.local:3000
Expected: HockeyLifeHL demo league with red/blue/gold branding
```

### Test 3: Test Leagues (Custom Branding)
```
URL: http://alpha.beerleaguehockey.local:3000
Expected: Alpha league with custom colors
```

---

## 🔍 Verification Checklist

- [ ] Database migration applied successfully
- [ ] Hosts file configured
- [ ] Development server running
- [ ] Platform site loads (localhost:3000)
- [ ] Pilot subdomain loads (pilot.beerleaguehockey.local:3000)
- [ ] Branding switches correctly between instances
- [ ] No console errors in browser DevTools

---

## 📊 What to Look For

### Platform Site (localhost:3000)
✅ BLH logo and branding (#1F4FD8 blue, #D72638 red)
✅ Marketing content visible
✅ "Sign In" and "Demo League" links

### Pilot League (pilot.beerleaguehockey.local:3000)
✅ HockeyLifeHL logo
✅ Canada red (#E31837), blue (#0066CC), gold (#FFD700) colors
✅ League navigation (Schedule, Standings, Stats, Teams)
✅ Only pilot league data visible

---

## 🐛 Troubleshooting

### Issue: Subdomain not loading
**Solution:**
1. Verify hosts file entry
2. Restart browser to clear DNS cache
3. Try in incognito/private window

### Issue: Wrong branding showing
**Solution:**
1. Check browser DevTools Network tab
2. Look for `x-league-hostname` header in requests
3. Clear browser cache
4. Check database has pilot league with correct branding

### Issue: 404 errors
**Solution:**
1. Verify middleware.ts exists in project root
2. Check Next.js build completed successfully
3. Restart dev server

---

## 📚 Documentation

For detailed information, see:

- **Database:** `docs/database/AGENT_1_COMPLETION_SUMMARY.md`
- **Backend:** `docs/backend/MIDDLEWARE_TESTING.md`
- **Frontend:** `docs/frontend/COMPONENT_UPDATE_LOG.md`
- **Testing:** `docs/testing/MULTI_INSTANCE_TEST_SUITE.md`
- **Progress:** `AGENT_PROGRESS.md`

---

## 🎯 Next Steps After Verification

1. **Run Full Test Suite**
   - Follow: `docs/testing/MULTI_INSTANCE_TEST_SUITE.md`
   - Execute all 50+ test cases

2. **Production Deployment**
   - Configure DNS for `pilot.beerleaguehockey.ca`
   - Install SSL certificates
   - Deploy to hosting platform
   - Monitor performance metrics

3. **League Onboarding**
   - Create new leagues via admin panel
   - Configure custom domains
   - Verify DNS and SSL
   - Test branding customization

---

## 🆘 Need Help?

- Review error logs in terminal
- Check browser console for JavaScript errors
- Review Supabase logs for database errors
- Consult documentation in `docs/` directory

---

**Multi-Instance Architecture Version:** 1.0.0
**Last Updated:** January 26, 2026
**Status:** Production Ready ✅
