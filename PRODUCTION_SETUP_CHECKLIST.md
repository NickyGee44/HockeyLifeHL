# Production Setup Checklist for pilot.beerleaguehockey.ca

## Quick Setup (5 Steps)

### ✅ Step 1: Configure DNS (5 min)

**Add to your DNS provider** (GoDaddy, Cloudflare, Namecheap, etc.):

```
Type: CNAME
Name: *
Value: beerleaguehockey.ca
TTL: 300
```

This creates a wildcard subdomain that handles `pilot.beerleaguehockey.ca` and any future league subdomains.

**Alternative (pilot only):**
```
Type: CNAME
Name: pilot
Value: beerleaguehockey.ca
TTL: 300
```

### ✅ Step 2: Add Domain to Vercel (2 min)

1. Go to your project on Vercel
2. Settings → Domains
3. Click "Add Domain"
4. Enter: `pilot.beerleaguehockey.ca`
5. Or for all leagues: `*.beerleaguehockey.ca`
6. Click "Add"

Vercel will automatically:
- Provision SSL certificate
- Configure routing
- Handle middleware rewrites

**Wait 5-30 minutes for DNS propagation and SSL provisioning.**

### ✅ Step 3: Verify Database (2 min)

Check if pilot league exists in **production Supabase**:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:

```sql
SELECT name, subdomain, primary_color
FROM leagues
WHERE subdomain = 'pilot';
```

**If it returns nothing**, insert the pilot league:

```sql
INSERT INTO leagues (
  name, slug, subdomain,
  logo_url, primary_color, secondary_color, accent_color,
  tagline, is_public, status
) VALUES (
  'HockeyLifeHL', 'pilot', 'pilot',
  '/logo.png', '#E31837', '#0066CC', '#FFD700',
  'Where Beer League Legends Are Made', true, 'active'
)
ON CONFLICT (slug) DO NOTHING;
```

### ✅ Step 4: Deploy (1 min)

If you made code changes:

```bash
git add .
git commit -m "Configure production subdomain"
git push origin main
```

Vercel will auto-deploy. Or manually trigger:

```bash
vercel --prod
```

### ✅ Step 5: Test (2 min)

Visit these URLs and verify:

**Main Platform:**
- URL: https://beerleaguehockey.ca
- Should show: "Beer League Hockey" branding
- Colors: Blue (#1F4FD8) and red (#D72638)

**Pilot League:**
- URL: https://pilot.beerleaguehockey.ca
- Should show: "HockeyLifeHL" branding
- Colors: Red (#E31837), blue (#0066CC), gold (#FFD700)

**Demo Page:**
- URL: https://beerleaguehockey.ca/pilot
- Should show: HockeyLifeHL landing/showcase page

---

## Troubleshooting

### "This site can't be reached" or DNS error

**Cause:** DNS not propagated yet

**Fix:**
- Wait 5-60 minutes
- Check DNS: https://dnschecker.org (search for pilot.beerleaguehockey.ca)
- Flush DNS cache: `ipconfig /flushdns` (Windows)

### "League not found" page

**Cause:** Database missing pilot league

**Fix:**
- Run the INSERT query from Step 3
- Verify with: `SELECT * FROM leagues WHERE subdomain = 'pilot'`
- Check environment variables are set in Vercel

### SSL Certificate Error

**Cause:** Certificate not provisioned yet

**Fix:**
- Wait 10-20 minutes after adding domain to Vercel
- In Vercel: Domains → Click on pilot domain → "Renew Certificate"
- Vercel provisions SSL automatically for all domains

### Pilot subdomain shows BLH branding (wrong branding)

**Cause:** Middleware not detecting subdomain

**Fix:**
1. Check `src/proxy.ts` includes `beerleaguehockey.ca` in patterns
2. Redeploy: `git push origin main`
3. Check browser DevTools → Network → Response Headers for `x-league-subdomain`

### Images not loading on pilot site

**Cause:** Logo URL is relative path

**Fix:**
- Upload logo to Supabase Storage or CDN
- Update database:
  ```sql
  UPDATE leagues
  SET logo_url = 'https://your-storage-url/logo.png'
  WHERE subdomain = 'pilot';
  ```

---

## Verification Commands

### Check DNS Resolution
```bash
nslookup pilot.beerleaguehockey.ca
# Should return your server IP or Vercel IP
```

### Check HTTPS
```bash
curl -I https://pilot.beerleaguehockey.ca
# Should return: HTTP/2 200 (not SSL error)
```

### Check Database
```sql
-- In Supabase SQL Editor
SELECT subdomain, name FROM leagues WHERE subdomain = 'pilot';
-- Should return: pilot | HockeyLifeHL
```

---

## Platform-Specific Instructions

### Using Vercel (Recommended)
✅ Automatic SSL
✅ Wildcard support included
✅ Edge functions work automatically
✅ No additional config needed

**Just add the domain in Vercel dashboard!**

### Using Netlify
1. Site Settings → Domain Management
2. Add custom domain: `pilot.beerleaguehockey.ca`
3. Or wildcard: `*.beerleaguehockey.ca`
4. SSL auto-provisioned

### Using Railway
1. Project → Settings → Domains
2. Add: `pilot.beerleaguehockey.ca`
3. Wildcard requires Pro plan

### Self-Hosted (VPS)
See full guide: `docs/PRODUCTION_SUBDOMAIN_SETUP.md`

---

## Environment Variables Required

Make sure these are set in **Vercel → Settings → Environment Variables**:

```bash
NEXT_PUBLIC_SITE_URL=https://beerleaguehockey.ca
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Success Criteria

When everything works:

- ✅ `beerleaguehockey.ca` shows BLH branding
- ✅ `pilot.beerleaguehockey.ca` shows HockeyLifeHL branding
- ✅ HTTPS works (green lock icon)
- ✅ Navigation works on both sites
- ✅ Dark mode toggle works
- ✅ Database queries work (if you have data)
- ✅ Authentication works on both domains
- ✅ Mobile responsive on both sites

---

## What Happens Behind the Scenes

1. User visits `pilot.beerleaguehockey.ca`
2. DNS routes to your Vercel/server
3. Next.js middleware (`src/proxy.ts`) detects subdomain: "pilot"
4. Sets header: `x-league-subdomain: pilot`
5. Rewrites URL to `/league/*` (internal)
6. `/league/layout.tsx` reads header
7. Queries database for league with subdomain = "pilot"
8. Loads HockeyLifeHL branding from database
9. Renders page with league branding
10. Browser shows: `pilot.beerleaguehockey.ca` (unchanged)

---

## Timeline

- **DNS Configuration:** 5 minutes
- **DNS Propagation:** 5-60 minutes
- **SSL Provisioning:** 5-20 minutes
- **Total:** ~30-90 minutes

---

## Next Steps After Setup

1. ✅ Test all pages on pilot subdomain
2. ✅ Add league content (teams, schedule, etc.)
3. ✅ Configure email for pilot domain
4. ✅ Set up analytics for both domains
5. ✅ Add more leagues with different subdomains
6. ✅ Consider custom domain for HockeyLifeHL

---

## Need Help?

**Check these resources:**
- Full guide: `docs/PRODUCTION_SUBDOMAIN_SETUP.md`
- Architecture: `docs/BRANDING_SEPARATION.md`
- Local testing: `docs/SUBDOMAIN_SETUP.md`

**Common Issues:**
1. DNS not propagated → Wait longer
2. League not found → Check database
3. SSL error → Wait for Vercel to provision
4. Wrong branding → Check middleware deployed

**Still stuck?**
- Check Vercel deployment logs
- Check Supabase database logs
- Review browser DevTools console
- Check middleware code in `src/proxy.ts`
