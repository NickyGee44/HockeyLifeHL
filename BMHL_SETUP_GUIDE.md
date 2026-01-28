# Barrie Mens Hockey League (BMHL) Setup Guide

**Date**: January 28, 2026
**Status**: Ready to Deploy
**Purpose**: First customer/test league setup

---

## 🎯 Quick Summary

You're setting up **Barrie Mens Hockey League (BMHL)** as your first potential customer. Everything is ready to go!

---

## ✅ What's Already Done

1. ✅ **Logo Uploaded**: `public/bmhl-logo.png` (158KB)
2. ✅ **Setup Script Created**: `supabase/seeds/setup_bmhl_league.sql`
3. ✅ **League ID Reserved**: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
4. ✅ **Slug Configured**: `bmhl`
5. ✅ **Subdomain Ready**: `bmhl.yourdomain.com`

---

## 🚀 Setup Instructions

### Step 1: Update Admin Email

Edit `supabase/seeds/setup_bmhl_league.sql` line 64:

```sql
WHERE email = 'your-email@example.com' -- CHANGE THIS TO ACTUAL ADMIN EMAIL
```

Replace with:
- Your email (if you're managing it for them)
- Their league admin's email
- Or leave it and add them later through the platform admin panel

### Step 2: Run the Setup Script

**Option A: Via Supabase Dashboard**
```sql
-- Copy and paste the entire contents of:
-- supabase/seeds/setup_bmhl_league.sql
-- into the Supabase SQL Editor and run it
```

**Option B: Via CLI** (if you have Supabase CLI set up)
```bash
supabase db execute < supabase/seeds/setup_bmhl_league.sql
```

### Step 3: Verify the League

After running the script, check that:
- ✅ League appears in the database
- ✅ Logo is accessible at `/bmhl-logo.png`
- ✅ Admin user has owner role

### Step 4: Access the League

**Local Development:**
```
http://localhost:3000/bmhl
```

**Production:**
```
https://yourdomain.com/bmhl
or
https://bmhl.yourdomain.com (if subdomain routing configured)
```

---

## 🎨 League Configuration

### Default Settings

| Setting | Value |
|---------|-------|
| **Name** | Barrie Mens Hockey League |
| **Slug** | `bmhl` |
| **Subdomain** | `bmhl` |
| **Location** | Barrie, Ontario |
| **Timezone** | America/Toronto |
| **Theme** | Dark mode |
| **Colors** | Dark blue (#0B1220), Gold accent (#D4AF37) |
| **Public** | Yes (discoverable) |
| **Signup** | Yes (join requests enabled) |

### What They Get

✅ **Custom Branding**: Logo, colors, theme
✅ **Public League Page**: `/bmhl` landing page
✅ **Player Registration**: Join request system
✅ **Stats Tracking**: Live game stats
✅ **Draft System**: Team draft functionality
✅ **Payment Processing**: Stripe integration ready
✅ **Email Notifications**: AI-generated emails
✅ **Mobile Responsive**: Works on all devices

---

## 📋 Post-Setup Checklist

### For You (As Platform Admin)

- [ ] Run the setup SQL script
- [ ] Verify league appears in admin panel (`/admin/leagues`)
- [ ] Test accessing `/bmhl` route
- [ ] Add custom domain if they have one
- [ ] Grant owner access to their admin

### For BMHL Admin (Once They Login)

- [ ] Complete league onboarding wizard
- [ ] Customize branding (Settings > Branding)
- [ ] Add league rules/description (Settings > General)
- [ ] Create first season
- [ ] Set up teams
- [ ] Configure payment settings (if needed)
- [ ] Invite players

---

## 🎯 Creating Test Data (Optional)

If you want to demo the platform with sample data:

### 1. Create a Season

```sql
INSERT INTO seasons (
  league_id,
  name,
  season_year,
  start_date,
  end_date,
  status
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
  'Winter 2026',
  2026,
  '2026-02-01',
  '2026-04-30',
  'registration'
);
```

### 2. Create Teams

```sql
-- Get the season ID first
SELECT id FROM seasons WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;

-- Create teams (repeat for each team)
INSERT INTO teams (
  league_id,
  season_id,
  name,
  primary_color,
  secondary_color
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
  '[season-id-from-above]'::UUID,
  'Barrie Bulldogs',
  '#FF6B35',
  '#004E89'
);
```

### 3. Add Sample Players

Use the UI to invite players or add them via SQL:

```sql
-- First, players need to register on the platform
-- Then you can add them to teams via the admin panel
```

---

## 🔧 Customization Options

### Custom Domain

If BMHL wants their own domain (e.g., `barriehockey.com`):

1. Go to `/admin/leagues/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/domain`
2. Enter their domain
3. Follow DNS verification steps
4. Once verified, their league will be accessible at their custom domain

### Branding

Update colors, logo, banner via:
- UI: `/bmhl/settings/branding` (as owner)
- SQL: Update `leagues` table directly

### Features

Enable/disable features via:
- UI: `/bmhl/settings/features` (as owner)
- Database: Update `leagues` table columns

---

## 🎬 Demo Script for BMHL

When showing them the platform:

1. **Landing Page** (`/bmhl`)
   - "Here's your custom branded homepage with your logo"
   - "Players can request to join directly from here"

2. **League Info** (`/bmhl/about`, `/bmhl/rules`)
   - "You can customize all content pages"
   - "Add your league rules, history, contact info"

3. **Stats & Standings** (`/bmhl/standings`, `/bmhl/stats`)
   - "Real-time game stats and leaderboards"
   - "Player profiles with complete stats history"

4. **Admin Dashboard** (`/bmhl/admin`)
   - "Manage teams, players, games"
   - "Track payments, send emails"
   - "Schedule games, enter stats"

5. **Player Experience** (`/bmhl/dashboard`)
   - "Players see their team, schedule, stats"
   - "Mobile-friendly for on-the-go access"
   - "Email notifications for games and updates"

---

## 💡 Pricing Considerations

Since this is your first customer, consider:

- **Pilot Pricing**: Offer discounted first season
- **Free Trial**: Let them test for 30 days
- **Setup Fee**: Charge for custom setup/configuration
- **Monthly/Annual**: Recurring subscription model

**Suggested Tiers:**
- **Basic**: $99/month - 1 league, 100 players, basic features
- **Pro**: $199/month - Multiple leagues, unlimited players, all features
- **Enterprise**: Custom - White label, custom domain, priority support

---

## 🐛 Troubleshooting

### League Not Showing Up
- Check SQL script ran successfully
- Verify league ID in database: `SELECT * FROM leagues WHERE slug = 'bmhl'`
- Check RLS policies allow access

### Logo Not Loading
- Verify file exists: `ls -la public/bmhl-logo.png`
- Check path in database: `SELECT logo FROM leagues WHERE slug = 'bmhl'`
- Clear browser cache

### Admin Can't Access
- Verify league membership: `SELECT * FROM league_memberships WHERE league_id = 'bbbb...'`
- Check role is 'owner'
- Check status is 'active'

### Subdomain Not Working
- Verify middleware configuration
- Check environment variable: `NEXT_PUBLIC_SITE_URL`
- May need Vercel/hosting configuration for subdomains

---

## 📞 Next Steps with BMHL

1. **Schedule Demo Call**
   - Walk them through the platform
   - Show key features
   - Answer questions

2. **Get Their Feedback**
   - What features do they need?
   - Any missing functionality?
   - Pricing expectations?

3. **Customize for Them**
   - Add any specific features they need
   - Configure to their workflow
   - Train their admin

4. **Launch Plan**
   - Set go-live date
   - Migration plan (if from existing system)
   - Communication plan to players

---

## 🎉 Success Criteria

BMHL setup is successful when:

✅ League accessible at `/bmhl`
✅ Logo displays correctly
✅ Admin can login and access dashboard
✅ Can create seasons and teams
✅ Can add players
✅ Can schedule and track games
✅ Emails send successfully
✅ Players can register and join

---

**Good luck with your first customer!** 🏒

*"For Fun, For Beers, For Glory!"* 🍁🏒🍺
