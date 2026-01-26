# Setup Commands - Quick Reference

**Run these commands in order to complete the setup.**

---

## Step 1: Install Dependencies

```powershell
# Install new dependencies (tsx for testing)
npm install
```

---

## Step 2: Install Supabase CLI

```powershell
# Install Supabase CLI globally
npm install -g supabase

# Verify installation
supabase --version
```

---

## Step 3: Login and Link Supabase Project

```powershell
# Login to Supabase (opens browser)
supabase login

# Link to your project
supabase link --project-ref ntplczcmhvfkijjxavdl
```

**When prompted for database password:** Press Enter (skip)

---

## Step 4: Enable Realtime on Tables

Go to Supabase SQL Editor and run this:

**URL:** https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new

**SQL to run:**

```sql
-- Enable Realtime for games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Enable Realtime for player_stats table
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;

-- Enable Realtime for goalie_stats table
ALTER PUBLICATION supabase_realtime ADD TABLE goalie_stats;
```

Click **Run**.

**Expected:** "Success. No rows returned"

---

## Step 5: Create Storage Buckets

Go to Supabase Storage and create 3 buckets:

**URL:** https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/storage/buckets

Click "New bucket" for each:

### Bucket 1: league-logos
- Name: `league-logos`
- Public: ✅ Yes
- File size limit: `2097152` (2 MB)
- Allowed MIME types: `image/png,image/jpeg,image/svg+xml,image/webp`

### Bucket 2: team-logos
- Name: `team-logos`
- Public: ✅ Yes
- File size limit: `2097152` (2 MB)
- Allowed MIME types: `image/png,image/jpeg,image/svg+xml,image/webp`

### Bucket 3: player-avatars
- Name: `player-avatars`
- Public: ✅ Yes
- File size limit: `1048576` (1 MB)
- Allowed MIME types: `image/png,image/jpeg,image/webp`

---

## Step 6: Create Database Backup

Go to Supabase Backups:

**URL:** https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/database/backups

1. Click **"Create a new backup"**
2. Name: `pre-multi-tenant-backup-2026-01-25`
3. Click **"Create backup"**
4. Wait 2-5 minutes
5. Click **"Download"** to save locally

---

## Step 7: Test Resend Email

```powershell
# Run Resend test
npm run test:resend
```

**Expected output:**
```
✅ API key is valid
✅ Domain verified: hockeylifehl.app
✅ Test email sent successfully!
```

**If domain not verified:**
1. Go to: https://resend.com/domains
2. Add `hockeylifehl.app` if not there
3. Add DNS records shown to your domain registrar
4. Wait 5-30 minutes
5. Run test again

---

## Step 8: Configure Stripe Connect

**See detailed guide:** `STRIPE_CONNECT_SETUP.md`

**Quick summary:**

1. **Enable Connect:**
   - Go to: https://dashboard.stripe.com/connect/accounts/overview
   - Click "Get started with Connect"
   - Choose: **Platform or marketplace**
   - Choose: **Express accounts**
   - Fill in application details
   - Click "Activate Connect"

2. **Get TEST keys:**
   - Switch to **TEST mode** (toggle in top right)
   - Go to: https://dashboard.stripe.com/test/apikeys
   - Copy **Publishable key** (pk_test_...)
   - Copy **Secret key** (sk_test_...)

3. **Set up webhook (using Stripe CLI for local dev):**
   ```powershell
   # Install Stripe CLI
   scoop install stripe
   # OR download from: https://github.com/stripe/stripe-cli/releases

   # Login
   stripe login

   # Forward webhooks to local dev
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   **Copy the `whsec_...` value shown**

4. **Add to .env.local:**
   ```bash
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

---

## Step 9: Verify .env.local Configuration

Your `.env.local` should have:

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://ntplczcmhvfkijjxavdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Resend (already configured)
# WARNING: NEVER commit real API keys to git! Use placeholders in docs.
RESEND_API_KEY=re_xxxxxxxxxxxxx

# OpenAI (already configured)
# WARNING: NEVER commit real API keys to git! Use placeholders in docs.
OPENAI_API_KEY=sk-proj-xxxxx...

# Stripe (ADD THESE FROM STEP 8)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Remove these incorrect lines:**
```bash
# DELETE THESE (these were mislabeled - Supabase doesn't have these)
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

---

## Step 10: Configure DNS Wildcard (Optional for Now)

**Can do later, but if you want to do it now:**

Go to your domain registrar (where you bought hockeylifehl.app):

Add CNAME record:
- Type: `CNAME`
- Name: `*`
- Value: `cname.vercel-dns.com`
- TTL: `3600`

**Why:** Enables subdomain routing (winter-warriors.hockeylifehl.app)

---

## Step 11: Run Database Migrations

Go to Supabase SQL Editor:

**URL:** https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new

**Run migrations in this order:**

### Migration 1: Core Multi-Tenant Tables

Copy contents of: `supabase/migrations/20260125_create_core_multi_tenant_tables.sql`

Paste into SQL Editor → Click **Run**

**Expected:** "Success. No rows returned"

### Migration 2: Add league_id to Core Tables

Copy contents of: `supabase/migrations/20260125_add_league_id_to_core_tables.sql`

Paste into SQL Editor → Click **Run**

### Migration 3: Add league_id to Games and Stats

Copy contents of: `supabase/migrations/20260125_add_league_id_to_games_and_stats.sql`

Paste into SQL Editor → Click **Run**

### Migration 4: Add league_id to Draft/Payment Tables

Copy contents of: `supabase/migrations/20260125_add_league_id_to_draft_payment_tables.sql`

Paste into SQL Editor → Click **Run**

### Migration 5: Add league_id to Feature Tables

Copy contents of: `supabase/migrations/20260125_add_league_id_to_feature_tables.sql`

Paste into SQL Editor → Click **Run**

### Migration 6: Create Scorekeeper Tables

Copy contents of: `supabase/migrations/20260125_create_scorekeeper_tables.sql`

Paste into SQL Editor → Click **Run**

### Migration 7: Migrate Existing Data to League #1

Copy contents of: `supabase/migrations/20260125_migrate_existing_data_to_league_1.sql`

Paste into SQL Editor → Click **Run**

**This creates League #1 with ID:** `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`

### Migration 8: Create Helper Functions

Copy contents of: `supabase/migrations/20260125_create_league_helper_functions.sql`

Paste into SQL Editor → Click **Run**

---

## Step 12: Verify Migrations

Run this SQL to verify everything worked:

```sql
-- Check that league #1 was created
SELECT id, name, slug FROM leagues WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Should return 1 row: HockeyLifeHL (Original)

-- Check that all tables have league_id column
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'league_id'
ORDER BY table_name;

-- Should return ~20 rows showing all tables with league_id

-- Check that existing data was migrated
SELECT COUNT(*) FROM teams WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT COUNT(*) FROM players WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Should return counts of your existing teams and players
```

---

## Step 13: Update Vercel Environment Variables (Production)

Go to Vercel:

**URL:** https://vercel.com/your-team/hockeylifehl/settings/environment-variables

Add these for **Production, Preview, Development:**

```
NEXT_PUBLIC_SUPABASE_URL=https://ntplczcmhvfkijjxavdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (your anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (your service role key)
# WARNING: NEVER commit real API keys to git! Get from your Resend dashboard.
RESEND_API_KEY=re_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (use pk_live_ for production later)
STRIPE_SECRET_KEY=sk_test_... (use sk_live_ for production later)
STRIPE_WEBHOOK_SECRET=whsec_... (from production webhook, not local)
# WARNING: NEVER commit real API keys to git! Get from your OpenAI dashboard.
OPENAI_API_KEY=sk-proj-xxxxx...
NEXT_PUBLIC_APP_URL=https://hockeylifehl.app
NODE_ENV=production
```

---

## ✅ Setup Complete Checklist

- [ ] Dependencies installed
- [ ] Supabase CLI installed and linked
- [ ] Realtime enabled on: games, player_stats, goalie_stats
- [ ] Storage buckets created: league-logos, team-logos, player-avatars
- [ ] Database backup created and downloaded
- [ ] Resend test passed (domain verified)
- [ ] Stripe Connect enabled (Platform mode, Express accounts)
- [ ] Stripe TEST keys added to .env.local
- [ ] Stripe webhook set up (Stripe CLI running)
- [ ] All 8 database migrations run successfully
- [ ] Migration verification passed
- [ ] Vercel environment variables configured
- [ ] DNS wildcard configured (optional for now)

---

## 🚀 Ready to Start Development!

Once all checkboxes are complete, you're ready to launch the agents!

Let me know and I'll launch all 4 agents in parallel to begin building the multi-tenant platform.

---

## 🆘 Quick Troubleshooting

**Resend test fails:**
- Domain not verified → Add DNS records at https://resend.com/domains

**Stripe webhook fails:**
- Ensure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Migration fails:**
- Check you're using service role key, not anon key
- Run migrations in order (1-8)
- Check Supabase logs for error details

**More help:**
- `SUPABASE_CLI_SETUP.md` - Detailed Supabase instructions
- `STRIPE_CONNECT_SETUP.md` - Detailed Stripe instructions
- `SETUP_INSTRUCTIONS.md` - Full setup guide
