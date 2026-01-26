# Supabase CLI Setup Guide

**Purpose:** Enable Realtime, create storage buckets, and backup database using Supabase CLI
**Platform:** Windows (PowerShell)
**Time:** 10 minutes

---

## Prerequisites

Install Supabase CLI:

```powershell
# Using npm (recommended)
npm install -g supabase

# OR using scoop (if you have it)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Verify installation:

```powershell
supabase --version
```

---

## Step 1: Login to Supabase

```powershell
supabase login
```

**What happens:**
- Opens browser window
- You'll see: "Supabase CLI Login"
- Click **"Authorize"** button
- Browser shows: "You can now close this window"
- Return to terminal

---

## Step 2: Link to Your Project

```powershell
supabase link --project-ref ntplczcmhvfkijjxavdl
```

**Prompt:** "Enter your database password (or leave blank to skip):"
**Answer:** Press Enter (skip) - we'll use service role key instead

**What this does:**
- Links CLI to your Supabase project
- Creates `.supabase/` folder in your project

---

## Step 3: Enable Realtime on Tables

Run this SQL in Supabase SQL Editor: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new

```sql
-- Enable Realtime for games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Enable Realtime for player_stats table
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;

-- Enable Realtime for goalie_stats table
ALTER PUBLICATION supabase_realtime ADD TABLE goalie_stats;
```

Click **Run** button.

**Expected result:** "Success. No rows returned"

**Verify:**
Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/database/publications

You should see `supabase_realtime` publication with these tables listed.

---

## Step 4: Create Storage Buckets

### Option A: Using Supabase Dashboard (Easier)

1. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/storage/buckets
2. Click **"New bucket"** for each:

#### Bucket 1: league-logos
- Name: `league-logos`
- Public: ✅ Yes
- File size limit: `2 MB` (2097152 bytes)
- Allowed MIME types: `image/png,image/jpeg,image/svg+xml,image/webp`

#### Bucket 2: team-logos
- Name: `team-logos`
- Public: ✅ Yes
- File size limit: `2 MB` (2097152 bytes)
- Allowed MIME types: `image/png,image/jpeg,image/svg+xml,image/webp`

#### Bucket 3: player-avatars
- Name: `player-avatars`
- Public: ✅ Yes
- File size limit: `1 MB` (1048576 bytes)
- Allowed MIME types: `image/png,image/jpeg,image/webp`

### Option B: Using SQL (Alternative)

Run in SQL Editor:

```sql
-- Create league-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'league-logos',
  'league-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create team-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-logos',
  'team-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create player-avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-avatars',
  'player-avatars',
  true,
  1048576,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set RLS policies for buckets (allow authenticated users to upload)
CREATE POLICY "Authenticated users can upload league logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'league-logos');

CREATE POLICY "Anyone can view league logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'league-logos');

CREATE POLICY "Authenticated users can upload team logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'team-logos');

CREATE POLICY "Anyone can view team logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'team-logos');

CREATE POLICY "Authenticated users can upload player avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'player-avatars');

CREATE POLICY "Anyone can view player avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'player-avatars');
```

**Verify:**
Go to Storage → Buckets and confirm all 3 buckets exist.

---

## Step 5: Create Database Backup

### Option A: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/database/backups
2. Click **"Create a new backup"**
3. Name: `pre-multi-tenant-backup-2026-01-25`
4. Click **"Create backup"**
5. Wait for completion (2-5 minutes)
6. Click **"Download"** to save locally

### Option B: Using Supabase CLI

```powershell
# Create backup
supabase db dump --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.ntplczcmhvfkijjxavdl.supabase.co:5432/postgres" -f backup-$(Get-Date -Format "yyyyMMdd-HHmmss").sql
```

**Note:** Replace `[YOUR-PASSWORD]` with your database password from Supabase Settings → Database → Connection string

**Verify:**
You should have a `.sql` file in your project directory.

---

## ✅ Verification Checklist

- [ ] Supabase CLI installed and logged in
- [ ] Project linked (ntplczcmhvfkijjxavdl)
- [ ] Realtime enabled on: games, player_stats, goalie_stats
- [ ] Storage buckets created: league-logos, team-logos, player-avatars
- [ ] Database backup created and downloaded

---

## 🆘 Troubleshooting

### Issue: "supabase: command not found"
**Solution:**
```powershell
# Reinstall using npm
npm install -g supabase

# Or add to PATH manually
$env:Path += ";C:\Users\YourUsername\AppData\Roaming\npm"
```

### Issue: "Failed to link project"
**Solution:** Ensure you're logged in first:
```powershell
supabase logout
supabase login
```

### Issue: "Permission denied when creating buckets"
**Solution:** Use the Supabase Dashboard method instead of CLI.

### Issue: "Table does not exist" when enabling Realtime
**Solution:** The tables might not be created yet. Run the core migrations first, then enable Realtime.

---

## Next Steps

After completing this setup:

1. **Test Resend Email** - See next section
2. **Configure Stripe Connect** - See STRIPE_CONNECT_SETUP.md
3. **Run Database Migrations** - See SETUP_INSTRUCTIONS.md

---
