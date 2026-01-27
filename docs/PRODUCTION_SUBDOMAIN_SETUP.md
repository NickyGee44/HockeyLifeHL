# Production Subdomain Setup Guide

## Setting Up pilot.beerleaguehockey.ca

This guide walks through setting up the pilot league subdomain in production.

## Prerequisites

- Domain: `beerleaguehockey.ca` owned and configured
- Hosting platform (Vercel, Netlify, Railway, etc.) with Next.js deployed
- Supabase production database configured
- SSL certificate support (automatic with most platforms)

---

## Step 1: DNS Configuration

### Option A: Wildcard Subdomain (Recommended)

Add a **wildcard CNAME record** to handle all subdomains:

**DNS Records:**
```
Type    Name    Value                           TTL
------  ------  -----------------------------   -----
A       @       [your-server-ip]                300
CNAME   *       beerleaguehockey.ca             300
```

This will route:
- `pilot.beerleaguehockey.ca` → Your server
- `anyleague.beerleaguehockey.ca` → Your server (for future leagues)

**Where to add:**
- Your domain registrar's DNS management (GoDaddy, Namecheap, Cloudflare, etc.)
- Or your hosting provider's DNS management

### Option B: Specific Subdomain Only

If you only want to add `pilot` subdomain:

**DNS Records:**
```
Type    Name    Value                           TTL
------  ------  -----------------------------   -----
A       @       [your-server-ip]                300
CNAME   pilot   beerleaguehockey.ca             300
```

---

## Step 2: Platform-Specific Configuration

### Vercel (Recommended)

1. **Add Domain in Vercel Dashboard**
   - Go to Project Settings → Domains
   - Add `pilot.beerleaguehockey.ca`
   - Vercel will show you DNS records to add

2. **Configure Wildcard Domain (for all leagues)**
   - Add `*.beerleaguehockey.ca`
   - Vercel will automatically provision SSL for all subdomains

3. **Environment Variables**
   ```bash
   NEXT_PUBLIC_SITE_URL=https://beerleaguehockey.ca
   NEXT_PUBLIC_APP_URL=https://beerleaguehockey.ca
   ```

4. **Verify Deployment**
   ```bash
   # Vercel will automatically detect middleware and handle rewrites
   # No additional configuration needed
   ```

**Vercel DNS Configuration:**
```
Name: *
Type: CNAME
Value: cname.vercel-dns.com
```

### Netlify

1. **Add Domain**
   - Site Settings → Domain Management
   - Add `pilot.beerleaguehockey.ca`
   - Or add `*.beerleaguehockey.ca` for wildcard

2. **Configure DNS**
   ```
   Name: *
   Type: CNAME
   Value: [your-site].netlify.app
   ```

3. **Enable Wildcard SSL**
   - Netlify automatically provisions SSL for wildcards
   - Wait 24 hours for DNS propagation

### Railway

1. **Custom Domain**
   - Project Settings → Domains
   - Add `pilot.beerleaguehockey.ca`

2. **DNS Configuration**
   ```
   Name: pilot
   Type: CNAME
   Value: [your-project].railway.app
   ```

3. **Wildcard Support**
   - Railway supports wildcards with Pro plan
   - Add `*.beerleaguehockey.ca` as custom domain

### Self-Hosted (VPS, AWS, etc.)

1. **DNS Configuration**
   ```
   Name: *
   Type: A
   Value: [your-server-ip]
   ```

2. **SSL Certificate**
   ```bash
   # Using Certbot with wildcard
   sudo certbot certonly --manual \
     --preferred-challenges=dns \
     --email you@email.com \
     --agree-tos \
     -d beerleaguehockey.ca \
     -d *.beerleaguehockey.ca

   # Follow prompts to add DNS TXT record for verification
   ```

3. **Nginx Configuration**
   ```nginx
   # /etc/nginx/sites-available/beerleaguehockey

   server {
       listen 443 ssl http2;
       server_name beerleaguehockey.ca *.beerleaguehockey.ca;

       ssl_certificate /etc/letsencrypt/live/beerleaguehockey.ca/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/beerleaguehockey.ca/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name beerleaguehockey.ca *.beerleaguehockey.ca;
       return 301 https://$host$request_uri;
   }
   ```

4. **PM2 Configuration** (if using PM2)
   ```bash
   # Start Next.js app
   pm2 start npm --name "beerleaguehockey" -- start
   pm2 save
   pm2 startup
   ```

---

## Step 3: Database Configuration

### Verify Pilot League Exists

Run this query in your **production Supabase database**:

```sql
-- Check if pilot league exists
SELECT
  id,
  name,
  slug,
  subdomain,
  primary_color,
  secondary_color,
  accent_color,
  status
FROM leagues
WHERE subdomain = 'pilot';
```

### Create Pilot League (if missing)

If the query returns nothing, insert the pilot league:

```sql
INSERT INTO leagues (
  id,
  name,
  slug,
  subdomain,
  description,
  tagline,

  -- Branding
  logo_url,
  primary_color,
  secondary_color,
  accent_color,

  -- Location
  city,
  state_province,
  country,
  timezone,

  -- Visibility
  is_public,

  -- Subscription
  subscription_tier,
  subscription_status,

  -- Status
  status
) VALUES (
  gen_random_uuid(),
  'HockeyLifeHL',
  'pilot',
  'pilot',
  'The ultimate men''s recreational hockey league. Experience the thrill of competitive hockey in a fun, organized environment.',
  'Where Beer League Legends Are Made',

  -- Branding (HockeyLifeHL brand colors)
  '/logo.png',
  '#E31837', -- Canada Red
  '#0066CC', -- Blue
  '#FFD700', -- Gold

  -- Location
  'Toronto',
  'Ontario',
  'Canada',
  'America/Toronto',

  -- Visibility
  true,

  -- Subscription (Pro tier for pilot)
  'pro',
  'active',

  -- Status
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  subdomain = EXCLUDED.subdomain,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  tagline = EXCLUDED.tagline;
```

### Verify Domain Lookup Function

Check that the domain lookup function works:

```sql
-- Test subdomain lookup
SELECT * FROM get_league_from_hostname('pilot.beerleaguehockey.ca');

-- Should return the pilot league record
```

---

## Step 4: Environment Variables

Ensure your production environment has these variables:

```bash
# Site URLs
NEXT_PUBLIC_SITE_URL=https://beerleaguehockey.ca
NEXT_PUBLIC_APP_URL=https://beerleaguehockey.ca

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Analytics, etc.
```

**Add these in your hosting platform:**
- **Vercel:** Project Settings → Environment Variables
- **Netlify:** Site Settings → Build & Deploy → Environment
- **Railway:** Project → Variables

---

## Step 5: Code Verification

### Check Middleware Configuration

Verify `src/proxy.ts` includes your production domain:

```typescript
const PLATFORM_DOMAINS = [
  'beerleaguehockey.ca',
  'www.beerleaguehockey.ca',
  'localhost',
  'localhost:3000',
  '127.0.0.1',
  '127.0.0.1:3000',
];
```

### Check Subdomain Pattern Matching

Verify subdomain patterns include production domain:

```typescript
function isSubdomain(hostname: string): boolean {
  const hostnameWithoutPort = hostname.split(':')[0].toLowerCase();

  const subdomainPatterns = [
    /^[a-z0-9-]+\.beerleaguehockey\.ca$/, // ✅ Production
    /^[a-z0-9-]+\.localhost$/,            // Local dev
    /^[a-z0-9-]+\.127\.0\.0\.1$/,         // Local dev
  ];

  if (hostnameWithoutPort.startsWith('www.')) {
    return false;
  }

  return subdomainPatterns.some(pattern => pattern.test(hostnameWithoutPort));
}
```

---

## Step 6: Deploy and Test

### Deploy to Production

```bash
# If using Vercel
vercel --prod

# If using Git-based deployment (push to main)
git add .
git commit -m "Configure production subdomain"
git push origin main
```

### Test Deployment

1. **Main Platform**
   ```
   Visit: https://beerleaguehockey.ca
   Expected: BLH branding, platform header
   ```

2. **Pilot Subdomain**
   ```
   Visit: https://pilot.beerleaguehockey.ca
   Expected: HockeyLifeHL branding, league header
   ```

3. **Demo Page**
   ```
   Visit: https://beerleaguehockey.ca/pilot
   Expected: HockeyLifeHL showcase/landing page
   ```

### Debugging

If subdomain doesn't work:

1. **Check DNS Propagation**
   ```bash
   # Check if DNS is resolving
   nslookup pilot.beerleaguehockey.ca

   # Or use online tool
   # https://dnschecker.org
   ```

2. **Check SSL Certificate**
   ```bash
   # Verify SSL is working
   curl -I https://pilot.beerleaguehockey.ca

   # Should return 200 or 301/302 (not SSL error)
   ```

3. **Check Middleware Logs**
   - Vercel: Functions → Edge Logs
   - Check for rewrite logs showing `/league/*` paths

4. **Check Database Connection**
   ```bash
   # Verify environment variables are set
   echo $NEXT_PUBLIC_SUPABASE_URL
   ```

5. **Check Browser Console**
   - Open DevTools → Network tab
   - Look for 404s or CORS errors
   - Check Response headers for `x-league-subdomain`

---

## Step 7: SSL Certificate (Automatic)

Most modern hosting platforms automatically provision SSL certificates:

### Vercel
- ✅ Automatic SSL for all domains
- ✅ Wildcard SSL included
- ✅ Auto-renewal

### Netlify
- ✅ Automatic SSL with Let's Encrypt
- ✅ Wildcard supported
- ✅ Auto-renewal

### Cloudflare (if using as DNS/CDN)
```
1. Enable "Full (Strict)" SSL mode
2. Enable "Always Use HTTPS"
3. Wildcard SSL included with Cloudflare
```

---

## Step 8: Verify Everything Works

### Checklist

- [ ] DNS records added and propagated (wait 5-60 minutes)
- [ ] SSL certificate active (https:// works)
- [ ] Main site works: `https://beerleaguehockey.ca` shows BLH
- [ ] Pilot site works: `https://pilot.beerleaguehockey.ca` shows HockeyLifeHL
- [ ] Pilot league exists in production database
- [ ] Headers are correct:
  - Main site: Shows "Beer League Hockey"
  - Pilot site: Shows "HockeyLifeHL"
- [ ] Navigation works on both sites
- [ ] Dark mode toggle works
- [ ] Database queries work (standings, stats, etc.)
- [ ] Authentication works on both domains
- [ ] Mobile view works on both sites

---

## Troubleshooting

### Issue: "League not found" on pilot subdomain

**Cause:** Database doesn't have pilot league or subdomain not set

**Fix:**
```sql
-- Check leagues table
SELECT * FROM leagues WHERE subdomain = 'pilot';

-- If missing, run the INSERT query from Step 3
```

### Issue: DNS not resolving

**Cause:** DNS propagation takes time

**Fix:**
- Wait 5-60 minutes for DNS propagation
- Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
- Check propagation: https://dnschecker.org

### Issue: SSL certificate error

**Cause:** Platform hasn't provisioned cert yet

**Fix:**
- Wait 10-20 minutes after adding domain
- Vercel/Netlify: Check domain settings, click "Renew certificate"
- If self-hosted: Re-run certbot command

### Issue: Subdomain shows main site branding

**Cause:** Middleware not detecting subdomain

**Fix:**
1. Check middleware is deployed (check vercel.json or next.config.js)
2. Verify subdomain pattern matches production domain
3. Check browser Network tab for `x-league-subdomain` header

### Issue: Images not loading

**Cause:** Image paths are relative

**Fix:**
- Upload images to Supabase Storage or public CDN
- Update logo_url in database to full URL: `https://yourstorage.com/logo.png`

---

## Quick Reference

**Production URLs:**
- Main: https://beerleaguehockey.ca (BLH)
- Pilot: https://pilot.beerleaguehockey.ca (HockeyLifeHL)
- Demo: https://beerleaguehockey.ca/pilot (HockeyLifeHL)

**DNS Records:**
```
Type    Name    Value
A       @       [server-ip or vercel]
CNAME   *       beerleaguehockey.ca
```

**Database Check:**
```sql
SELECT subdomain FROM leagues WHERE subdomain = 'pilot';
```

**Test Command:**
```bash
curl -I https://pilot.beerleaguehockey.ca
```

---

## Next Steps

After setup:
1. Monitor analytics for both domains
2. Test all functionality on pilot site
3. Add more leagues with different subdomains
4. Configure custom domains for leagues (optional)
5. Set up monitoring/alerting

## Support

If you run into issues:
1. Check Vercel/Netlify deployment logs
2. Check Supabase database logs
3. Check browser DevTools console
4. Review middleware code in `src/proxy.ts`
