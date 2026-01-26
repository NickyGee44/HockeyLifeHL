# Multi-Tenant Setup Instructions

**Date:** January 25, 2026
**Project:** HockeyLifeHL → Multi-League SaaS Platform
**Supabase Project:** ntplczcmhvfkijjxavdl.supabase.co

---

## ✅ Pre-Flight Checklist

- [x] Supabase Pro account
- [x] Resend account with API key
- [x] Stripe account
- [x] Vercel account
- [ ] **Complete steps below** (30-45 minutes)

---

## Step 1: Backup Existing Database

**CRITICAL: Do this first before any changes**

### Option A: Supabase Dashboard Backup (Recommended)

1. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl
2. Click **Database** in left sidebar
3. Click **Backups** tab
4. Click **Create a new backup** button
5. Name it: `pre-multi-tenant-backup-2026-01-25`
6. Wait for backup to complete (2-5 minutes)
7. **Download the backup file** to your local machine

### Option B: CLI Backup

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ntplczcmhvfkijjxavdl

# Create database dump
supabase db dump -f backup-$(date +%Y%m%d).sql
```

**Verify:** You should have a backup file saved locally.

---

## Step 2: Enable Supabase Realtime

**Required for:** Live game stat updates, scorekeeper real-time sync

1. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/database/tables
2. For each table below, click the table → **Enable Realtime**

**Tables to enable Realtime on:**
- `games` (for live score updates)
- `game_stats` (for live stat entry)
- `goalie_stats` (for live goalie stats)

**How to enable:**
- Click table name
- Click ⚙️ icon (settings)
- Scroll to **Realtime** section
- Toggle **Enable Realtime** to ON
- Click **Save**

**Verify:** Check that Realtime icon appears next to these tables.

---

## Step 3: Create Storage Buckets

**Required for:** League logos, team logos, player avatars

1. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/storage/buckets
2. Click **New bucket** for each bucket below

### Bucket 1: league-logos

- **Name:** `league-logos`
- **Public:** Yes ✓
- **Allowed MIME types:** `image/png, image/jpeg, image/svg+xml, image/webp`
- **Max file size:** 2 MB
- Click **Create bucket**

### Bucket 2: team-logos

- **Name:** `team-logos`
- **Public:** Yes ✓
- **Allowed MIME types:** `image/png, image/jpeg, image/svg+xml, image/webp`
- **Max file size:** 2 MB
- Click **Create bucket**

### Bucket 3: player-avatars

- **Name:** `player-avatars`
- **Public:** Yes ✓
- **Allowed MIME types:** `image/png, image/jpeg, image/webp`
- **Max file size:** 1 MB
- Click **Create bucket**

**Verify:** You should see 3 new buckets in Storage.

---

## Step 4: Verify Supabase Environment Variables

Your current `.env.local` already has these configured:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ntplczcmhvfkijjxavdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (configured ✓)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (configured ✓)
```

**No action needed** - these are already correct.

---

## Step 5: Verify Resend Configuration

Your current `.env.local` has:

```bash
RESEND_API_KEY=re_LpKc5LRd_NGDZHSn9StkbSZVffbfAKEYk
```

### Test Resend Setup

1. Go to: https://resend.com/domains
2. Verify `hockeylifehl.app` domain is added and verified (green checkmark)
3. If not verified:
   - Click **Add Domain**
   - Enter: `hockeylifehl.app`
   - Add the DNS records shown to your domain registrar
   - Wait for verification (5-30 minutes)

**Verify:** Domain shows as "Verified" in Resend dashboard.

---

## Step 6: Configure Stripe Connect

**CRITICAL:** Multi-tenant requires Stripe Connect for league payments.

### Enable Platform Mode

1. Go to: https://dashboard.stripe.com/settings/applications
2. If you see "Get started with Connect":
   - Click **Get started**
   - Choose **Platform or marketplace**
   - Choose **Express accounts** (simpler onboarding)
   - Complete the setup wizard
3. If already enabled, verify:
   - Platform or marketplace mode is ON
   - Express accounts are enabled

### Get Stripe Keys

1. Go to: https://dashboard.stripe.com/test/apikeys (Test mode first)
2. Copy these keys to `.env.local`:

```bash
# Test mode keys (for development)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

3. Later, for production, get from: https://dashboard.stripe.com/apikeys

```bash
# Live mode keys (for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### Set Up Webhook Endpoint

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. Endpoint URL: `https://hockeylifehl.app/api/webhooks/stripe`
   - (Note: Use your Vercel preview URL for testing: `https://your-app.vercel.app/api/webhooks/stripe`)
4. Events to listen for:
   - `account.updated`
   - `account.application.deauthorized`
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_...`)
7. Add to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Verify:** Webhook endpoint shows as active in Stripe dashboard.

---

## Step 7: Configure DNS for Subdomains

**Required for:** League-specific URLs (e.g., `winter-warriors.hockeylifehl.app`)

### Add Wildcard CNAME Record

1. Go to your domain registrar's DNS settings (where you bought `hockeylifehl.app`)
2. Add a new **CNAME record**:

| Type  | Name | Value              | TTL  |
|-------|------|--------------------|------|
| CNAME | *    | cname.vercel-dns.com | 3600 |

**Explanation:**
- `*` = wildcard, matches any subdomain
- Points all subdomains to Vercel

3. Save the DNS record
4. Wait for propagation (5-30 minutes)

**Verify:** After propagation, run:

```bash
nslookup test.hockeylifehl.app
```

Should show Vercel's IP addresses.

---

## Step 8: Configure Vercel Environment Variables

**Required for:** Production deployment with all credentials

1. Go to: https://vercel.com/your-team/hockeylifehl/settings/environment-variables
2. Add each variable below for **Production, Preview, Development**

### Environment Variables to Add:

```bash
# Supabase (already in .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://ntplczcmhvfkijjxavdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (your anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (your service role key)

# Resend (already in .env.local)
RESEND_API_KEY=re_LpKc5LRd_NGDZHSn9StkbSZVffbfAKEYk

# Stripe (get from Step 6)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (already in .env.local)
OPENAI_API_KEY=sk-proj-N-FjCwlC... (your OpenAI key)

# App Configuration
NEXT_PUBLIC_APP_URL=https://hockeylifehl.app
NODE_ENV=production
```

3. Click **Save** after adding each variable

**Verify:** All variables show in Vercel dashboard with green checkmarks.

---

## Step 9: Configure Vercel Domains

**Required for:** Wildcard subdomain routing

1. Go to: https://vercel.com/your-team/hockeylifehl/settings/domains
2. Click **Add Domain**
3. Add primary domain:
   - Enter: `hockeylifehl.app`
   - Click **Add**
   - Vercel will show DNS records to add (if not already done)
4. Add wildcard domain:
   - Click **Add Domain** again
   - Enter: `*.hockeylifehl.app`
   - Click **Add**
   - This enables subdomain routing

**Verify:** Both domains show as "Valid Configuration" in Vercel.

---

## Step 10: Update Local Environment File

Update your `.env.local` with Stripe keys from Step 6:

```bash
# Add these lines (replace with your actual keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Remove these incorrect lines** (these appear to be mislabeled):
```bash
# DELETE THESE:
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

Supabase doesn't use "publishable key" or "secret key" - those are Stripe terms.

---

## ✅ Setup Verification Checklist

Before starting development, verify:

- [ ] Database backup created and downloaded
- [ ] Realtime enabled on: games, game_stats, goalie_stats
- [ ] Storage buckets created: league-logos, team-logos, player-avatars
- [ ] Resend domain verified: hockeylifehl.app
- [ ] Stripe Connect enabled (Platform mode, Express accounts)
- [ ] Stripe webhook endpoint created and secret saved
- [ ] DNS wildcard CNAME added: *.hockeylifehl.app
- [ ] Vercel environment variables configured (all 9 variables)
- [ ] Vercel domains configured: hockeylifehl.app and *.hockeylifehl.app
- [ ] Local .env.local updated with Stripe keys

---

## 🚀 Ready to Start Development

Once all checkboxes above are complete, you're ready to begin multi-tenant development!

**Next step:** Run the database migrations to create multi-tenant tables.

**Estimated setup time:** 30-45 minutes

---

## 🆘 Troubleshooting

### Issue: Realtime not available
**Solution:** Verify you're on Supabase Pro plan. Realtime requires Pro.

### Issue: Storage bucket creation fails
**Solution:** Check you haven't exceeded bucket limits. Pro plan allows unlimited buckets.

### Issue: DNS not propagating
**Solution:** Wait up to 48 hours for global DNS propagation. Use `nslookup` to check.

### Issue: Vercel domain not verifying
**Solution:** Ensure DNS records match exactly what Vercel shows. Use nameservers from Vercel if using custom domain.

### Issue: Stripe webhook failing
**Solution:** Verify endpoint URL is accessible publicly. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

**Questions?** Check MULTI_TENANT_AGENT_PLAN.md for full implementation details.
