# 🔍 Complete Button & Link Audit - HockeyLifeHL

**Date:** January 2026  
**Scope:** All buttons, links, and navigation items across the entire application

---

## ❌ BROKEN/MISSING ROUTES

### Player Dashboard Sidebar (`/dashboard` routes)
- ❌ **`/dashboard/team`** - "My Team" link → **404 ERROR**
- ❌ **`/dashboard/stats`** - "My Stats" link → **404 ERROR**
- ❌ **`/dashboard/schedule`** - "Schedule" link → **404 ERROR**
- ✅ `/dashboard` - Overview (exists but has placeholder data)
- ✅ `/dashboard/profile` - Profile Settings (works)

### Captain Dashboard Sidebar (`/captain` routes)
- ❌ **`/captain/team`** - "Team Management" link → **404 ERROR**
- ✅ `/captain` - Captain Dashboard (works)
- ✅ `/captain/stats` - Enter Stats (works)
- ✅ `/captain/draft` - Draft Board (works)

### Footer Links (Public Pages)
- ❌ **`/rules`** - "League Rules" link → **404 ERROR**
- ❌ **`/about`** - "About Us" link → **404 ERROR**
- ❌ **`/contact`** - "Contact" link → **404 ERROR**
- ❌ **`/privacy`** - "Privacy Policy" link → **404 ERROR**
- ❌ **`/terms`** - "Terms of Service" link → **404 ERROR**
- ✅ `/standings` - Works
- ✅ `/schedule` - Works
- ✅ `/stats` - Works
- ✅ `/teams` - Works
- ✅ `/news` - Works

---

## 🔴 NON-FUNCTIONAL BUTTONS

### Captain Dashboard (`/captain`)
1. **"Verify Stats" Button** (Line 269-272)
   - **Location:** `/captain` page, "Captain Actions" section
   - **Issue:** Button has NO onClick handler
   - **Current Code:**
     ```tsx
     <Button className="h-auto py-4 flex-col gap-2" variant="outline">
       <span className="text-2xl">✓</span>
       <span>Verify Stats</span>
     </Button>
     ```
   - **Expected Behavior:** Should navigate to `/captain/stats` or open verification modal
   - **Fix Required:** Add `asChild` with `Link` or `onClick` handler

### Admin Dashboard (`/admin`)
1. **"Start Draft" Button** (if it exists)
   - **Location:** Admin dashboard quick actions
   - **Issue:** Need to verify if this button exists and if it has functionality
   - **Status:** Need to check admin/draft page

---

## ⚠️ PLACEHOLDER DATA (Buttons/Links Work But Show Fake Data)

### Admin Dashboard (`/admin`)
- ❌ **"Total Players"** card shows hardcoded "48"
- ❌ **"Games Played"** card shows hardcoded "10"
- ❌ **"Total Goals"** card shows hardcoded "127"
- ❌ **"Active Suspensions"** card shows hardcoded "2"
- ❌ **"Pending Stat Verifications"** section shows hardcoded example games
- ✅ **Quick Action buttons** all work (link to correct pages)

### Player Dashboard (`/dashboard`)
- ❌ **"Your Goals"** card shows hardcoded "0"
- ❌ **"Your Assists"** card shows hardcoded "0"
- ❌ **"Games Played"** card shows hardcoded "0"
- ❌ **"Your Rating"** card shows hardcoded "-"
- ❌ **"Next Game"** section shows placeholder message
- ❌ **"Recent Activity"** section shows placeholder message
- ✅ **Profile Info** section shows real data

---

## ✅ WORKING BUTTONS & LINKS

### Header Navigation (Public)
- ✅ All public nav links work (`/standings`, `/schedule`, `/stats`, `/teams`, `/news`)
- ✅ Dashboard button (when authenticated)
- ✅ Captain button (when captain)
- ✅ Admin button (when owner, hidden but works)
- ✅ User dropdown menu (all links work)
- ✅ Sign In / Join League buttons

### Admin Dashboard (`/admin`)
- ✅ "Manage Seasons" → `/admin/seasons`
- ✅ "Manage Teams" → `/admin/teams`
- ✅ "Manage Players" → `/admin/players`
- ✅ "Payments" → `/admin/payments`

### Admin Sidebar Navigation
- ✅ All 8 admin nav items work:
  - League Dashboard → `/admin`
  - Manage Teams → `/admin/teams`
  - Manage Players → `/admin/players`
  - Manage Games → `/admin/games`
  - Seasons → `/admin/seasons`
  - Suspensions → `/admin/suspensions`
  - Articles → `/admin/articles`
  - Payments → `/admin/payments`

### Captain Dashboard (`/captain`)
- ✅ "Enter Game Stats" → `/captain/stats`
- ✅ "View Full Roster" → `/teams/[teamId]`
- ✅ Captain sidebar navigation all works

### Player Dashboard Sidebar
- ✅ "Overview" → `/dashboard`
- ✅ "Profile" → `/dashboard/profile`
- ❌ "My Team" → `/dashboard/team` (MISSING)
- ❌ "My Stats" → `/dashboard/stats` (MISSING)
- ❌ "Schedule" → `/dashboard/schedule` (MISSING)

### Dashboard Switcher (Sidebar)
- ✅ "League Admin" link (when owner, not on admin pages)
- ✅ "Captain Dashboard" link (when captain/owner, not on captain pages)
- ✅ "Player Dashboard" link (when not on dashboard pages)

---

## 📋 SUMMARY OF ISSUES

### Critical (Broken Links - 404 Errors)
1. ❌ `/dashboard/team` - Missing page
2. ❌ `/dashboard/stats` - Missing page
3. ❌ `/dashboard/schedule` - Missing page
4. ❌ `/captain/team` - Missing page
5. ❌ `/rules` - Missing page (footer)
6. ❌ `/about` - Missing page (footer)
7. ❌ `/contact` - Missing page (footer)
8. ❌ `/privacy` - Missing page (footer)
9. ❌ `/terms` - Missing page (footer)

**Total: 9 missing pages**

### High Priority (Non-Functional Buttons)
1. ❌ "Verify Stats" button on `/captain` - No onClick handler

**Total: 1 non-functional button**

### Medium Priority (Placeholder Data)
1. ❌ Admin dashboard stats (4 cards + pending verifications)
2. ❌ Player dashboard stats (4 cards + next game + activity)

**Total: 2 dashboards with placeholder data**

---

## 🎯 ACTION ITEMS

### Phase 1: Fix Broken Links (Critical)
1. **Create Missing Dashboard Pages:**
   - `/dashboard/team` - Show player's current team, roster, team stats
   - `/dashboard/stats` - Show player's detailed stats, game-by-game breakdown
   - `/dashboard/schedule` - Show player's team's upcoming games

2. **Create Missing Captain Page:**
   - `/captain/team` - Team management for captains (roster, assignments)

3. **Create Missing Footer Pages:**
   - `/rules` - League rules and regulations
   - `/about` - About the league
   - `/contact` - Contact information
   - `/privacy` - Privacy policy
   - `/terms` - Terms of service

### Phase 2: Fix Non-Functional Buttons
1. **Fix "Verify Stats" Button:**
   - Add `asChild` with `Link` to `/captain/stats`
   - OR add `onClick` handler to open verification modal
   - Recommended: Link to `/captain/stats` (simpler)

### Phase 3: Replace Placeholder Data
1. **Admin Dashboard:**
   - Fetch real player count from database
   - Fetch real games played count
   - Calculate real total goals
   - Fetch real active suspensions count
   - Fetch real pending verifications from database

2. **Player Dashboard:**
   - Fetch real player stats (goals, assists, games played)
   - Fetch real player rating
   - Fetch real next game
   - Build real activity feed

---

## 📊 COMPLETION STATUS

**Total Links/Buttons Audited:** ~50+
**Working:** ~40
**Broken (404):** 9
**Non-Functional:** 1
**Placeholder Data:** 2 dashboards

**Overall Functionality:** ~80% working

---

## 🔧 QUICK FIXES NEEDED

### Immediate (Can Fix Now)
1. Fix "Verify Stats" button - Add Link wrapper
2. Create 4 missing dashboard pages
3. Create 5 missing footer pages (can be simple placeholders initially)

### Short Term (This Week)
4. Replace all placeholder data with real queries
5. Add loading states
6. Add error handling

---

**END OF BUTTON & LINK AUDIT**
