# 🚀 Run New Feature Migrations - Sponsors, Registration, Discovery

**Priority:** HIGH - Unblocks Agent 2, 3, 4 for new features
**Time Estimate:** 10 minutes
**Date:** January 26, 2026

---

## 📊 What These Migrations Add

### 1. Sponsors System
- Platform sponsors (site-wide ads for platform revenue)
- League sponsors (per-league sponsors managed by admins)
- Helper functions to get active sponsors
- Full RLS policies

### 2. Enhanced Season Registration
- Registration types: draft, open_registration, captain_invite_only
- Registration windows (opens/closes dates)
- Max players per team limits
- Team selection toggle
- Helper functions for registration status

### 3. Public League Discovery
- Location data (lat/lon for maps)
- Public visibility flag
- Search keywords
- Nearby league search (radius-based)
- Keyword search with relevance scoring
- Public leagues view for unauthenticated users

### 4. Team Join Requests
- Players can request to join teams
- Captains approve/reject requests
- Auto-adds player to roster when approved
- Full workflow tracking

---

## 🚨 IMPORTANT: Run in This Order

### Step 1: Run game_stats Migration (If Not Already Done)

**File:** `supabase/migrations/20260126_create_game_stats_table.sql`

If you haven't run this yet from earlier today:
1. Open file
2. Copy all (Ctrl+A, Ctrl+C)
3. Go to https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new
4. Paste and Run

---

### Step 2: Run player_approvals Migration (If Not Already Done)

**File:** `supabase/migrations/20260126_create_player_approvals_table.sql`

If you haven't run this yet from earlier today:
1. Open file
2. Copy all (Ctrl+A, Ctrl+C)
3. Paste in Supabase SQL Editor and Run

---

### Step 3: Run Sponsors System Migration

**File:** `supabase/migrations/20260126_create_sponsors_system.sql`

1. Open file in VS Code
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Go to Supabase SQL Editor (or new query)
4. Paste (Ctrl+V) and Click **"Run"**

**Expected Output:**
```
✅ Sponsors system created successfully
  - platform_sponsors table (site-wide sponsors)
  - league_sponsors table (per-league sponsors)
✅ Indexes created for optimal performance
✅ RLS policies enabled
✅ Helper functions created:
  - get_active_league_sponsors(league_id)
  - get_active_platform_sponsors()
```

---

### Step 4: Run Season Registration Type Migration

**File:** `supabase/migrations/20260126_add_season_registration_type.sql`

1. Open file in VS Code
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste in Supabase SQL Editor (or new query)
4. Click **"Run"**

**Expected Output:**
```
✅ Season registration type system created successfully
✅ Added columns to seasons table:
  - registration_type (enum)
  - registration_opens_at, registration_closes_at
  - max_players_per_team
  - allow_team_selection
✅ Helper functions created:
  - is_season_registration_open(season_id)
  - get_open_registration_seasons(league_id)
  - is_team_roster_full(team_id, season_id)
✅ Validation trigger added for registration dates
```

---

### Step 5: Run Leagues Discovery Enhancement

**File:** `supabase/migrations/20260126_enhance_leagues_for_discovery.sql`

1. Open file in VS Code
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste in Supabase SQL Editor (or new query)
4. Click **"Run"**

**Expected Output:**
```
✅ Leagues enhanced for public discovery
✅ Added columns:
  - is_public (visibility flag)
  - latitude, longitude (map display)
  - address, postal_code (location details)
  - search_keywords (search optimization)
  - registration_url (external registration)
✅ Indexes created for location and search
✅ View created: public_leagues
✅ Helper functions created:
  - search_nearby_leagues(lat, lon, radius_km)
  - search_leagues_by_keyword(query, limit)
  - get_leagues_by_location(city, state, country)
✅ RLS policy added for public league access
```

---

### Step 6: Run Team Join Requests Migration

**File:** `supabase/migrations/20260126_create_team_join_requests.sql`

1. Open file in VS Code
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste in Supabase SQL Editor (or new query)
4. Click **"Run"**

**Expected Output:**
```
✅ Team join requests system created successfully
✅ Table: team_join_requests
✅ Indexes created for optimal performance
✅ RLS policies enabled
✅ Triggers created:
  - Auto-set reviewed_at/reviewed_by on status change
  - Auto-add player to roster when approved
  - Validate league_id consistency
✅ Helper functions created:
  - get_team_pending_requests(team_id)
  - get_player_request_status(player_id, team_id, season_id)
```

---

## Step 7: Regenerate TypeScript Types

**In your terminal:**

```bash
cd D:\B3\dev\HockeyLeague\HockeyLifeHL

npx supabase gen types typescript --project-id ntplczcmhvfkijjxavdl --schema public > src/types/database.ts
```

**Expected:** `src/types/database.ts` updated with all new table/column types

---

## Step 8: Verify Build

```bash
npm run build
```

**Expected:** ✅ Build succeeds without errors

---

## 📊 Database Changes Summary

### New Tables (4):
1. ✅ `platform_sponsors` - Site-wide sponsors
2. ✅ `league_sponsors` - Per-league sponsors
3. ✅ `team_join_requests` - Player join requests

### Modified Tables (2):
1. ✅ `seasons` - Added 5 new columns for registration
2. ✅ `leagues` - Added 7 new columns for discovery

### New Helper Functions (10):
1. ✅ `get_active_league_sponsors(league_id)`
2. ✅ `get_active_platform_sponsors()`
3. ✅ `is_season_registration_open(season_id)`
4. ✅ `get_open_registration_seasons(league_id)`
5. ✅ `is_team_roster_full(team_id, season_id)`
6. ✅ `search_nearby_leagues(lat, lon, radius_km)`
7. ✅ `search_leagues_by_keyword(query, limit)`
8. ✅ `get_leagues_by_location(city, state, country)`
9. ✅ `get_team_pending_requests(team_id)`
10. ✅ `get_player_request_status(player_id, team_id, season_id)`

### New Views (1):
1. ✅ `public_leagues` - Public discovery view

### New Indexes (30+):
- All tables properly indexed for performance
- Location-based indexes for map queries
- Status filters for active items

---

## ✅ Verification Queries

After running all migrations, verify success:

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('platform_sponsors', 'league_sponsors', 'team_join_requests');
-- Should return 3 rows

-- Check new columns on seasons
SELECT column_name FROM information_schema.columns
WHERE table_name = 'seasons'
AND column_name IN ('registration_type', 'registration_opens_at', 'max_players_per_team');
-- Should return 3+ rows

-- Check new columns on leagues
SELECT column_name FROM information_schema.columns
WHERE table_name = 'leagues'
AND column_name IN ('is_public', 'latitude', 'longitude', 'search_keywords');
-- Should return 4+ rows

-- Check helper functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN (
  'get_active_league_sponsors',
  'search_nearby_leagues',
  'is_season_registration_open',
  'get_team_pending_requests'
);
-- Should return 4+ rows
```

---

## 🚨 If You Get Errors

### "relation already exists"
✅ **Good!** Table/column already exists - skip to next migration

### "type already exists"
✅ **Good!** Enum already created - migration will continue

### "column already exists"
✅ **Good!** Column already added - migration has IF NOT EXISTS checks

### "permission denied"
❌ Make sure you're logged into Supabase dashboard

---

## 🎯 What This Unlocks

### For Agent 2 (Backend):
- ✅ Can implement sponsor management APIs
- ✅ Can build registration flow variations
- ✅ Can create public league discovery API
- ✅ Can implement team join request workflow

### For Agent 3 (Frontend):
- ✅ Can build sponsor display components
- ✅ Can create registration type UI variations
- ✅ Can build public league discovery page
- ✅ Can create team join request UI

### For Agent 4 (Scorekeeper):
- ✅ Can display league sponsors in scorekeeper interface
- ✅ Registration types don't affect scorekeeper

---

## 📝 After Completion

Update `MULTI_TENANT_PROGRESS_TRACKER.md`:
- [x] Sponsors system tables created
- [x] Season registration types added
- [x] Leagues enhanced for public discovery
- [x] Team join requests table created
- [x] All helper functions created
- [x] TypeScript types regenerated
- [x] Build passing

---

**Total Time:** ~10 minutes to run all migrations + regenerate types 🚀

**Agent 1 Status:** All new feature database work COMPLETE after execution!
