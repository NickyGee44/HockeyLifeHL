# 🚀 Multi-Tenant Quick Start Guide

**Start Date:** January 25, 2026
**Current Phase:** Pre-Development Setup
**Estimated Time:** 30-45 minutes

---

## 📋 What You Need To Do Now

### Step 1: Complete Setup Checklist (30-45 min)

Open and follow **SETUP_INSTRUCTIONS.md** step by step:

1. **Backup Database** (5 min) - CRITICAL: Do this first
2. **Enable Supabase Realtime** (5 min) - For live game stats
3. **Create Storage Buckets** (5 min) - For logos and avatars
4. **Verify Resend** (2 min) - Email domain verification
5. **Configure Stripe Connect** (10 min) - Payment platform setup
6. **Configure DNS** (5 min) - Wildcard subdomain setup
7. **Vercel Environment Variables** (5 min) - Production credentials
8. **Vercel Domains** (2 min) - Wildcard domain routing
9. **Update .env.local** (1 min) - Add Stripe keys locally

**Checklist file:** `SETUP_INSTRUCTIONS.md`

---

### Step 2: Add Stripe Keys to .env.local

After completing Step 6 in SETUP_INSTRUCTIONS.md, add these lines to `.env.local`:

```bash
# Copy these from .env.local.ADD_THESE after getting keys from Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Reference file:** `.env.local.ADD_THESE`

---

### Step 3: Run Database Migration (2 min)

Once setup is complete, run the first migration:

1. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new
2. Copy the entire contents of: `supabase/migrations/20260125_create_core_multi_tenant_tables.sql`
3. Paste into SQL Editor
4. Click **Run** button
5. Verify success: "Success. No rows returned"

**This creates:**
- `leagues` table (core tenant table)
- `league_memberships` table (user-league relationships)
- `divisions` table (updated with league_id)
- `venues` table (updated with league_id)
- All RLS policies for data isolation
- Helper functions for league permissions

---

### Step 4: Verify Migration Success

Run this query in Supabase SQL Editor:

```sql
-- Check that tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('leagues', 'league_memberships', 'divisions', 'venues')
ORDER BY table_name;
```

**Expected result:** 4 rows showing all tables exist

---

### Step 5: Ready to Start Development

Once all above steps are complete, notify me and I'll:

1. Launch **Agent 1** (Database) to begin adding league_id to existing tables
2. Launch **Agent 2** (Backend) to build league-aware auth middleware
3. Launch **Agent 3** (Frontend) to start building marketing site
4. Launch **Agent 4** (Scorekeeper) to design scorekeeper system

All agents will work in parallel and report progress to `MULTI_TENANT_PROGRESS_TRACKER.md`

---

## 📁 Important Files Reference

| File | Purpose |
|------|---------|
| `SETUP_INSTRUCTIONS.md` | Detailed setup steps (start here) |
| `.env.local.ADD_THESE` | Stripe keys to add to .env.local |
| `MULTI_TENANT_AGENT_PLAN.md` | Full 21-week implementation plan |
| `MULTI_TENANT_PROGRESS_TRACKER.md` | Agent progress and coordination |
| `SCOREKEEPER_SYSTEM_DESIGN.md` | Scorekeeper feature design |
| `supabase/migrations/20260125_create_core_multi_tenant_tables.sql` | First migration to run |

---

## ✅ Quick Verification Checklist

Before starting development, ensure:

- [ ] Database backup created and downloaded
- [ ] Supabase Realtime enabled on: games, game_stats, goalie_stats
- [ ] Storage buckets created: league-logos, team-logos, player-avatars
- [ ] Resend domain verified: hockeylifehl.app
- [ ] Stripe Connect enabled (Platform mode, Express accounts)
- [ ] Stripe webhook endpoint created
- [ ] DNS wildcard CNAME added: *.hockeylifehl.app
- [ ] Vercel environment variables configured (9 variables)
- [ ] Vercel domains configured: hockeylifehl.app and *.hockeylifehl.app
- [ ] Local .env.local updated with Stripe keys
- [ ] Core multi-tenant tables migration run successfully

---

## 🆘 Need Help?

**Common Issues:**
- DNS not propagating → Wait up to 48 hours, use `nslookup test.hockeylifehl.app`
- Stripe webhook failing → Use Stripe CLI for local testing
- Realtime not available → Verify Supabase Pro plan

**Documentation:**
- All issues/troubleshooting: See `SETUP_INSTRUCTIONS.md` → Troubleshooting section
- Full implementation plan: See `MULTI_TENANT_AGENT_PLAN.md`
- Agent progress: See `MULTI_TENANT_PROGRESS_TRACKER.md`

---

## 🏒 Timeline Overview

| Week | Phase | What's Happening |
|------|-------|------------------|
| 0 (Now) | Setup | Complete setup checklist |
| 1-2 | Foundation | Core tables, RLS policies, basic CRUD |
| 3-5 | Migration | Add league_id to all tables, migrate data |
| 6-9 | Core Features | Stripe Connect, email branding, scorekeepers |
| 10-15 | Advanced | AI scheduling, subscriptions, PWA |
| 16-21 | Polish & Launch | Testing, documentation, go-live |

**Total Duration:** 21 weeks (~5 months)
**Target Launch:** June 21, 2026

---

## 📞 Next Steps

1. **You do:** Complete setup checklist in `SETUP_INSTRUCTIONS.md` (30-45 min)
2. **You do:** Run first migration in Supabase SQL Editor (2 min)
3. **You notify:** Let me know when complete
4. **I do:** Launch 4 parallel agents to begin development

---

**Let's build this! 🏒**
