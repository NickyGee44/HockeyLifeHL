# 🚀 Multi-Tenant Implementation - Agent Architecture
## HockeyLifeHL → Multi-League SaaS Platform

**Date:** January 25, 2026
**Goal:** Transform single-tenant app into multi-tenant SaaS with 4 parallel agent teams
**Duration:** 21 weeks (5 months)
**Agents:** 4 specialized teams working in parallel

---

## 🎯 CORE DECISIONS

### User Choices
1. ✅ **Full multi-tenant system** with divisions, venues, AI scheduling
2. ✅ **Scorekeeper system** - Leagues choose captain-entered OR scorekeeper-entered stats
3. ✅ **Flexible payments** - League owners set up own Stripe OR manual tracking + export
4. ✅ **PWA/Mobile optimized** - iPad, iPhone, laptop, all responsive
5. ✅ **League branding** - Custom colors, logos, domains per league
6. ✅ **HockeyLifeHL** becomes first tenant (migrate existing data)

### External Service Strategy
- **Stripe:** League owners set up their own Stripe Connect accounts (guided)
- **Email:** League owners use shared Resend (free tier) OR set up own SMTP (optional)
- **Custom Domains:** League owners configure DNS (guided walkthrough)
- **Storage:** Shared Supabase storage with league-based folders

---

## 🤖 AGENT ARCHITECTURE

### 4 Specialized Agents Working in Parallel

```
┌─────────────────────────────────────────────────────────────┐
│                    CENTRAL COORDINATION                      │
│           MULTI_TENANT_PROGRESS_TRACKER.md                   │
│  (All agents report progress, blockers, completed tasks)     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼───────┐  ┌───────▼────────┐  ┌──────────┐
│  AGENT 1       │  │  AGENT 2     │  │  AGENT 3       │  │ AGENT 4  │
│  Database &    │  │  Backend API │  │  UI/UX &       │  │ Score-   │
│  Infrastructure│  │  & Business  │  │  Frontend      │  │ keeper   │
│                │  │  Logic       │  │                │  │ System   │
└────────────────┘  └──────────────┘  └────────────────┘  └──────────┘
```

---

## 📋 AGENT 1: DATABASE & INFRASTRUCTURE SPECIALIST

### Primary Responsibilities
- Design and implement multi-tenant database schema
- Create all database migrations
- Set up Row Level Security (RLS) policies
- Configure Supabase project settings
- Implement data isolation between leagues
- Create database functions and triggers

### Key Deliverables

#### Phase 0-1: Core Multi-Tenant Schema (Weeks 1-5)

**New Tables to Create:**
1. ✅ `leagues` - Core tenant table
2. ✅ `league_memberships` - User-league relationships with roles
3. ✅ `league_settings` - Custom settings per league
4. ✅ `league_subscriptions` - Stripe subscription tracking
5. ✅ `divisions` - League divisions (A, B1, B2, etc.)
6. ✅ `venues` - Ice rinks with multiple surfaces
7. ✅ `time_slots` - Scheduling availability
8. ✅ `league_invitations` - Invite users to leagues

**Tables to Modify (Add league_id):**
1. ✅ `teams` - Add league_id, division_id
2. ✅ `seasons` - Add league_id
3. ✅ `games` - Add league_id, venue_id, division_id
4. ✅ `team_rosters` - Add league_id
5. ✅ `payments` - Add league_id
6. ✅ `suspensions` - Add league_id
7. ✅ `drafts` - Add league_id
8. ✅ `articles` - Add league_id
9. ✅ `game_stats` - Add league_id
10. ✅ ALL existing tables need league_id foreign key

**RLS Policies to Create:**
- Users can only see data for leagues they're members of
- League admins can manage their league data
- Platform admins (owners) can see all leagues
- Scorekeepers can only see assigned games

**Database Functions:**
1. ✅ `get_user_leagues(user_id)` - Get all leagues user belongs to
2. ✅ `get_user_role_in_league(user_id, league_id)` - Get role
3. ✅ `create_league_with_owner(league_data, owner_id)` - Atomic league creation
4. ✅ `migrate_existing_data_to_league()` - Migrate HockeyLifeHL to League #1

#### Migration Files to Create:

```sql
-- Week 1-2: Foundation
20260126_create_leagues_table.sql
20260126_create_league_memberships.sql
20260126_create_league_settings.sql
20260126_create_divisions_table.sql
20260126_create_venues_table.sql
20260126_create_time_slots_table.sql

-- Week 3: Add league_id to existing tables
20260127_add_league_id_to_teams.sql
20260127_add_league_id_to_seasons.sql
20260127_add_league_id_to_games.sql
20260127_add_league_id_to_rosters.sql
20260127_add_league_id_to_payments.sql
20260127_add_league_id_to_all_tables.sql

-- Week 4: RLS Policies
20260128_create_rls_policies_leagues.sql
20260128_create_rls_policies_teams.sql
20260128_create_rls_policies_games.sql
20260128_create_rls_policies_all_tables.sql

-- Week 5: Data Migration
20260129_migrate_hockeylifehl_to_league_1.sql
20260129_create_database_functions.sql
```

### Dependencies from Other Agents

**Needs from Agent 2 (Backend):**
- Confirmation of data access patterns
- Server action requirements

**Needs from Agent 3 (UI/UX):**
- Data structure requirements for frontend
- Filter/search requirements

**Needs from Agent 4 (Scorekeeper):**
- Scorekeeper table requirements confirmed

### Blockers & Risks

**Potential Blockers:**
- Migration of existing HockeyLifeHL data must be tested carefully
- RLS policies can be complex - need thorough testing
- Performance impact of league_id on all queries

**Mitigation:**
- Create staging migration first
- Test RLS with multiple test users
- Add indexes on all league_id columns

### Success Criteria

- [ ] All 30+ tables have proper league_id foreign keys
- [ ] RLS policies enforce complete data isolation
- [ ] Existing HockeyLifeHL data migrated to League #1
- [ ] Database functions work correctly
- [ ] No data leaks between leagues (tested)
- [ ] Performance acceptable (<100ms queries)

---

## 📋 AGENT 2: BACKEND API & BUSINESS LOGIC SPECIALIST

### Primary Responsibilities
- Build all server actions for multi-tenant features
- Create API routes for external integrations
- Implement authentication flows (league-aware)
- Integrate Stripe Connect for league payments
- Build email system with league branding
- Create audit logging for all actions

### Key Deliverables

#### Phase 2-4: Core Backend Features (Weeks 6-12)

**Authentication & Authorization:**
1. ✅ League-aware authentication middleware
2. ✅ Role checking per league (admin, captain, player, scorekeeper)
3. ✅ Multi-league user support (switch between leagues)
4. ✅ League invitation system
5. ✅ SSO preparation (future: Google, Microsoft)

**League Management Server Actions:**
```typescript
// src/lib/leagues/actions.ts
createLeague(name, owner_id, plan)
updateLeagueSettings(league_id, settings)
deleteLeague(league_id)
addUserToLeague(league_id, user_id, role)
removeUserFromLeague(league_id, user_id)
switchActiveLeague(league_id) // User switches context
getUserLeagues(user_id)
```

**Division Management:**
```typescript
// src/lib/divisions/actions.ts
createDivision(league_id, name, tier)
updateDivision(division_id, settings)
moveDivision(division_id, new_order)
deleteEmptyDivision(division_id)
```

**Venue & Scheduling:**
```typescript
// src/lib/venues/actions.ts
createVenue(league_id, name, address, surfaces)
updateVenue(venue_id, data)
createTimeSlot(venue_id, day, time, divisions)
getAvailableSlots(league_id, filters)
```

**Stripe Connect Integration:**
```typescript
// src/lib/payments/stripe-connect.ts
createStripeConnectAccount(league_id) // For league owners
getStripeConnectOnboardingLink(league_id)
webhookHandler(stripe_event) // Process Connect events
recordLeaguePayment(league_id, amount, player_id)
```

**Email System with League Branding:**
```typescript
// src/lib/email/league-branded-emails.ts
sendLeagueBrandedEmail(league_id, template, recipients)
getLeagueEmailSettings(league_id)
testLeagueEmailConfig(league_id)
```

**API Routes to Create:**
```typescript
// League management
GET  /api/leagues - Get user's leagues
POST /api/leagues - Create new league
GET  /api/leagues/[id] - Get league details
PUT  /api/leagues/[id] - Update league
DELETE /api/leagues/[id] - Delete league

// League invitations
POST /api/leagues/[id]/invite - Invite user to league
GET  /api/invitations/[token] - Accept invitation

// Stripe Connect
POST /api/leagues/[id]/stripe/connect - Create Connect account
GET  /api/leagues/[id]/stripe/onboarding - Get onboarding link
POST /api/webhooks/stripe/connect - Handle Connect webhooks

// Division management
GET  /api/leagues/[id]/divisions - List divisions
POST /api/leagues/[id]/divisions - Create division
PUT  /api/divisions/[id] - Update division
POST /api/divisions/[id]/move-team - Move team between divisions

// Venue management
GET  /api/leagues/[id]/venues - List venues
POST /api/leagues/[id]/venues - Create venue
PUT  /api/venues/[id] - Update venue
```

### Dependencies from Other Agents

**Needs from Agent 1 (Database):**
- Database schema completed
- RLS policies in place
- Database functions available

**Needs from Agent 3 (UI/UX):**
- UI requirements for API responses
- Error handling patterns

**Needs from Agent 4 (Scorekeeper):**
- Scorekeeper assignment logic
- Stat entry validation rules

### Blockers & Risks

**Potential Blockers:**
- Stripe Connect setup is complex
- Email branding requires template system
- Multi-league context switching in session

**Mitigation:**
- Use Stripe Connect Express accounts (simpler)
- Build template system early
- Store active_league_id in session/cookie

### Success Criteria

- [ ] All server actions properly scoped to league_id
- [ ] Stripe Connect onboarding flow works
- [ ] Email branding applies league colors/logo
- [ ] Audit logging captures all admin actions
- [ ] Rate limiting works per-league
- [ ] API routes return league-specific data only

---

## 📋 AGENT 3: UI/UX & FRONTEND SPECIALIST

### Primary Responsibilities
- Design SaaS marketing website (hockeylifehl.app)
- Build league signup and onboarding flows
- Create league management dashboards
- Implement league branding customization UI
- Build responsive/mobile-first interfaces
- Create PWA for mobile installation
- Design league switcher component

### Key Deliverables

#### Phase 3-8: Complete Frontend (Weeks 8-18)

**1. SaaS Marketing Website (Public Pages)**

**Route:** `hockeylifehl.app` (root domain)

Pages to Create:
```
/ (homepage)
  - Hero: "Manage Your Hockey League Online"
  - Features: Scheduling, Stats, Payments, Drafts
  - Pricing tiers: Free, Basic ($49/mo), Pro ($99/mo), Enterprise
  - Testimonials from league admins
  - CTA: "Start Your Free Trial"

/features
  - Detailed feature breakdown
  - Interactive demos
  - Comparison table (vs spreadsheets, vs competitors)

/pricing
  - Tiered pricing cards
  - Feature comparison matrix
  - FAQ about billing

/for-leagues
  - Landing page for league administrators
  - Case studies
  - Setup guides

/for-scorekeepers
  - Landing page for scorekeepers
  - iPad demo video
  - How to get hired

/login
  - Login with league subdomain detection
  - OR "Choose your league" dropdown
  - Redirect to league subdomain after login

/signup
  - League signup wizard (multi-step)
  - Email verification
  - League setup (name, logo, colors)
  - Plan selection
  - Stripe Connect onboarding
  - First division/team creation

/contact
  - Contact form for enterprise inquiries

/docs
  - Documentation hub
  - League admin guides
  - Scorekeeper tutorials
  - API docs (future)
```

**Design System:**
- Modern, professional SaaS aesthetic
- Blue/ice color scheme (customizable per league)
- Responsive Tailwind components
- Shadcn/ui components
- Framer Motion animations

**2. League Signup Flow (Multi-Step Wizard)**

**Route:** `/signup`

```
Step 1: League Information
├─ League Name
├─ League Short Name (for subdomain)
├─ Sport (Hockey, Ball Hockey, etc.)
├─ Season Type (Fall, Winter, Spring, Summer)
└─ [Next]

Step 2: Administrator Account
├─ Your Name
├─ Email
├─ Password
├─ Phone (optional)
└─ [Next]

Step 3: League Branding
├─ Upload Logo (drag & drop)
├─ Primary Color (color picker)
├─ Secondary Color (color picker)
├─ Tagline (optional)
└─ Preview panel →
└─ [Next]

Step 4: Choose Your Plan
├─ ○ Free (1 division, 8 teams, basic features)
├─ ○ Basic ($49/mo - 3 divisions, 20 teams, stats)
├─ ● Pro ($99/mo - 10 divisions, 75 teams, everything)
├─ ○ Enterprise (custom pricing, white label)
└─ [Next]

Step 5: Game Entry Method
├─ ○ Captain-Entered (Teams enter own stats)
├─ ● Scorekeeper-Entered (Hire scorekeepers)
├─ ○ Both (Flexible per game)
└─ [Next]

Step 6: Payment Setup (Optional)
├─ ○ Set up Stripe Connect now (collect team fees)
├─ ● Skip for now (manual tracking)
└─ [Next]

Step 7: First Division
├─ Division Name (e.g., "A Division")
├─ Division Tier (A, B, C, Rec)
├─ Estimated Teams (12)
└─ [Create League]

✅ Success!
   Your league is ready at:
   winter-warriors.hockeylifehl.app

   [Go to Dashboard] [Invite Teams] [Add More Divisions]
```

**3. League Dashboard (Admin Interface)**

**Route:** `[league-subdomain].hockeylifehl.app/admin`

```
┌─────────────────────────────────────────────────────────┐
│  🏒 Winter Warriors Hockey League                       │
│  [League Switcher ▼] [Profile] [Settings] [Help]       │
├─────────────────────────────────────────────────────────┤
│  Sidebar:                        Main Content:          │
│  ├─ 📊 Overview                 ┌──────────────────┐   │
│  ├─ 📅 Schedule                 │ Quick Stats      │   │
│  ├─ 👥 Teams                    │ 12 Teams         │   │
│  ├─ 🏟️  Divisions                │ 45 Games         │   │
│  ├─ 🎯 Venues                   │ 8 Scorekeepers   │   │
│  ├─ 👤 Players                  │ $12,450 Revenue  │   │
│  ├─ 🎲 Draft                    └──────────────────┘   │
│  ├─ 💰 Payments                                        │
│  ├─ 📊 Stats                    Recent Activity:        │
│  ├─ ⚠️  Suspensions             • Team registered      │
│  ├─ 👨‍💼 Scorekeepers             • Game scheduled       │
│  ├─ 📧 Email                    • Payment received     │
│  ├─ ⚙️  Settings                                        │
│  └─ 🎨 Branding                                        │
└─────────────────────────────────────────────────────────┘
```

**4. League Branding Settings**

**Route:** `/admin/branding`

```
┌─────────────────────────────────────────────────────────┐
│  League Branding                                        │
├─────────────────────────────────────────────────────────┤
│  Logo:                          Preview:                │
│  [Upload New Logo]              ┌──────────────────┐   │
│  Current: [🏒 logo.png]        │  🏒 Winter       │   │
│                                 │  Warriors League │   │
│  Colors:                        │  ──────────────  │   │
│  Primary: [🎨 #1E3A8A] Blue    │  [Game Schedule] │   │
│  Secondary: [🎨 #F59E0B] Gold  │  [View Stats]    │   │
│                                 │  [Sign Up]       │   │
│  Tagline:                       └──────────────────┘   │
│  [Where Champions Are Made___]                         │
│                                                         │
│  Custom Domain (Pro/Enterprise):                       │
│  [ ] Enable Custom Domain                              │
│  Domain: [www.winterwarriors.com____]                  │
│  Status: ⚠️  DNS not configured                        │
│  [Setup Instructions]                                  │
│                                                         │
│  Email Branding:                                       │
│  From Name: [Winter Warriors League_____]              │
│  Reply-To: [admin@winterwarriors.com___]               │
│                                                         │
│  [Save Changes]                                        │
└─────────────────────────────────────────────────────────┘
```

**5. League Switcher Component**

For users in multiple leagues:

```
┌─────────────────────────────────┐
│  🏒 Winter Warriors  ▼          │  ← Click to expand
└─────────────────────────────────┘

Expanded:
┌─────────────────────────────────┐
│  Your Leagues:                  │
│  ✓ 🏒 Winter Warriors (Admin)   │
│    🏒 Summer League (Player)    │
│    🏒 Fall Draft League (Capt)  │
│  ────────────────────────────   │
│  + Create New League            │
│  🌐 Browse All Leagues          │
└─────────────────────────────────┘
```

**6. Mobile PWA Features**

Progressive Web App Configuration:

```javascript
// public/manifest.json
{
  "name": "HockeyLife - League Management",
  "short_name": "HockeyLife",
  "theme_color": "#1E3A8A", // Dynamically set per league
  "background_color": "#ffffff",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Service Worker for Offline Support:
- Cache league data
- Offline stat entry (sync when online)
- Push notifications for game reminders

**7. Responsive Breakpoints**

All interfaces optimized for:
- 📱 Mobile (320px-768px) - iPhone, Android
- 📱 Tablet (768px-1024px) - iPad portrait/landscape
- 💻 Desktop (1024px+) - Laptop, desktop monitors

**8. Components to Build**

Reusable UI Components:
```
src/components/
├── league/
│   ├── LeagueSwitcher.tsx
│   ├── LeagueLogo.tsx
│   ├── LeagueColorScheme.tsx
│   └── LeagueBrandedButton.tsx
├── signup/
│   ├── SignupWizard.tsx
│   ├── StepIndicator.tsx
│   ├── PlanSelector.tsx
│   └── BrandingCustomizer.tsx
├── admin/
│   ├── AdminSidebar.tsx
│   ├── QuickStats.tsx
│   ├── ActivityFeed.tsx
│   └── SettingsPanel.tsx
└── marketing/
    ├── Hero.tsx
    ├── FeatureGrid.tsx
    ├── PricingCard.tsx
    ├── Testimonial.tsx
    └── FAQ.tsx
```

### Dependencies from Other Agents

**Needs from Agent 1 (Database):**
- League data structure finalized
- Query performance acceptable

**Needs from Agent 2 (Backend):**
- Server actions for league management
- API routes for signup flow
- Stripe Connect integration complete

**Needs from Agent 4 (Scorekeeper):**
- Scorekeeper assignment UI requirements

### Blockers & Risks

**Potential Blockers:**
- Subdomain routing on Vercel
- Custom domain DNS configuration
- PWA manifest per league (dynamic)

**Mitigation:**
- Test subdomain routing early
- Create DNS setup guide
- Generate manifest.json dynamically

### Success Criteria

- [ ] Marketing website looks professional
- [ ] Signup flow is intuitive (<5 min to create league)
- [ ] League branding applies throughout app
- [ ] Mobile responsive on all pages
- [ ] PWA installable on iOS/Android
- [ ] League switcher works seamlessly
- [ ] Custom domains configurable

---

## 📋 AGENT 4: SCOREKEEPER SYSTEM SPECIALIST

### Primary Responsibilities
- Build complete scorekeeper management system
- Create mobile-optimized stat entry interface
- Implement payment tracking for scorekeepers
- Build assignment workflows
- Create iPad-optimized UI
- Implement offline/sync capabilities

### Key Deliverables

#### Phase 2.5: Scorekeeper System (Weeks 7-9)

**Database Extensions (coordinate with Agent 1):**

Tables to Create:
```sql
league_scorekeepers
game_scorekeeper_assignments
game_stat_entry_log
scorekeeper_payments
```

**Server Actions:**

```typescript
// src/lib/scorekeepers/actions.ts
addScorekeeperToLeague(league_id, user_id, hourly_rate)
removeScorekeeperFromLeague(league_id, user_id)
assignScorekeeperToGame(game_id, scorekeeper_id)
unassignScorekeeperFromGame(game_id)
getScorekeeperAssignments(scorekeeper_id, date_range)
checkInToGame(game_id) // Scorekeeper arrives at rink
startGameStatEntry(game_id)
completeGameStatEntry(game_id)
calculateScorekeeperPayment(assignment_id)
approveScorekeeperPayment(assignment_id)
exportScorekeeperPayments(league_id, date_range)
```

**Scorekeeper Dashboard:**

**Route:** `/scorekeeper/dashboard`

```
┌─────────────────────────────────────────────────────────┐
│  🏒 Scorekeeper Dashboard                               │
│  Hi, Sarah Thompson                                     │
├─────────────────────────────────────────────────────────┤
│  📅 Today's Games (3)                                   │
│                                                         │
│  ⏰ 6:00 PM - Rink A, Surface 1                        │
│  🔵 Blue Devils vs Red Hawks                           │
│  Division A | Game #145                                │
│  Status: Not Started                                   │
│  [CHECK IN] [VIEW GAME] [NAVIGATE]                     │
│  ────────────────────────────────────────────────────  │
│  ⏰ 8:00 PM - Rink B, Surface 2                        │
│  🟢 Green Machines vs Stars                            │
│  Division B | Game #146                                │
│  Status: Upcoming                                      │
│  [VIEW GAME]                                           │
│  ────────────────────────────────────────────────────  │
│  ⏰ 9:30 PM - Rink A, Surface 1                        │
│  🟡 Thunder vs Lightning                               │
│  Division C | Game #147                                │
│  Status: Upcoming                                      │
│  [VIEW GAME]                                           │
├─────────────────────────────────────────────────────────┤
│  📊 This Week                                           │
│  Games Worked: 8                                       │
│  Hours: 18.5                                           │
│  Earnings (Pending): $555.00                           │
│                                                         │
│  💰 Payment Status                                      │
│  Approved: $450 (6 games)                              │
│  Pending Approval: $105 (2 games)                      │
│  Paid This Month: $1,890                               │
│  [VIEW PAYMENT HISTORY]                                │
├─────────────────────────────────────────────────────────┤
│  📅 Upcoming This Week                                  │
│  Mon Jan 27 - 2 games                                  │
│  Wed Jan 29 - 3 games                                  │
│  Fri Jan 31 - 2 games                                  │
│  [VIEW FULL SCHEDULE]                                  │
└─────────────────────────────────────────────────────────┘

Bottom Nav (Mobile):
[🏠 Today] [📅 Schedule] [💰 Payments] [👤 Profile]
```

**Live Stat Entry Interface (iPad Optimized):**

**Route:** `/scorekeeper/game/[id]/live`

**Layout (Landscape iPad - 1024x768):**

```
┌─────────────────────────────────────────────────────────────────┐
│  Period 2 | 12:35 remaining                  [END PERIOD]       │
│  🔵 Blue Devils  3  -  2  Red Hawks 🔴                          │
├─────────────────────────────────────────────────────────────────┤
│  Quick Entry:                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   🥅     │ │   🅰️     │ │   ⚠️     │ │   🧤     │          │
│  │  GOAL    │ │ ASSIST   │ │ PENALTY  │ │  GOALIE  │          │
│  │  (120px) │ │ (120px)  │ │ (120px)  │ │  SAVE    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  Enter Jersey #:                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  #17                                              [×]     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Player Suggestions (Tap to Select):                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🔵 #17 - Mike Johnson - Forward - Blue Devils           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🔴 #71 - Sarah Lee - Forward - Red Hawks                │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Recent Entries (Last 5):                          [UNDO LAST]  │
│  ⏱️  12:45 | 🥅 GOAL | #17 Mike Johnson (Blue Devils)          │
│           Assisted by: #8 Alex Brown                           │
│  ⏱️  13:20 | ⚠️  PENALTY | #23 Tom Smith (Red Hawks)           │
│           2 min - Hooking                                      │
│  ⏱️  14:05 | 🅰️ ASSIST | #8 Alex Brown (Blue Devils)           │
│  ⏱️  15:10 | 🥅 GOAL | #11 Jessica Martinez (Red Hawks)        │
│  ⏱️  16:30 | 🧤 SAVE | #1 David Park (Blue Devils)             │
├─────────────────────────────────────────────────────────────────┤
│  [GAME NOTES] [ROSTERS] [PERIOD SUMMARY] [SYNC STATUS: ✓]     │
└─────────────────────────────────────────────────────────────────┘
```

**Mobile Features:**
- **Touch Optimized:** All buttons minimum 60px height
- **Haptic Feedback:** Vibration on stat entry
- **Auto-Save:** Saves every entry immediately to Supabase
- **Offline Mode:** Queue entries if no internet, sync when reconnected
- **Voice Input:** Optional voice commands ("Goal number 17")
- **Landscape Lock:** Prevent rotation during game
- **Keep Awake:** Screen stays on during game
- **Quick Corrections:** Swipe left on recent entry to delete

**iPad Pro Features:**
- **Split View:** Roster on left, stat entry on right
- **Apple Pencil:** Write jersey numbers with pencil
- **Keyboard Shortcuts:**
  - `G` - Goal
  - `A` - Assist
  - `P` - Penalty
  - `Cmd+Z` - Undo
  - `Enter` - Confirm

**Admin Scorekeeper Management:**

**Route:** `/admin/scorekeepers`

```
┌─────────────────────────────────────────────────────────┐
│  Scorekeeper Management                                 │
│  [+ Add Scorekeeper] [Import List] [Export Payments]   │
├─────────────────────────────────────────────────────────┤
│  Active Scorekeepers (8):                               │
│                                                         │
│  👤 Sarah Thompson                                      │
│     Email: sarah@email.com                             │
│     Hourly Rate: $30/hr                                │
│     Games This Month: 12                               │
│     Status: Active                                     │
│     [Edit] [View Schedule] [Payments]                  │
│  ────────────────────────────────────────────────────  │
│  👤 Mike Rodriguez                                      │
│     Email: mike@email.com                              │
│     Hourly Rate: $35/hr                                │
│     Games This Month: 8                                │
│     Status: Active                                     │
│     [Edit] [View Schedule] [Payments]                  │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Payment Summary This Month:                           │
│  Total Games: 45                                       │
│  Total Hours: 112.5                                    │
│  Total Owed: $3,375                                    │
│  Status: 35 Approved, 10 Pending Review               │
│  [Review Pending] [Export to CSV]                     │
└─────────────────────────────────────────────────────────┘
```

**Payment Review Interface:**

**Route:** `/admin/scorekeepers/payments`

```
┌─────────────────────────────────────────────────────────┐
│  Scorekeeper Payment Review                             │
│  Showing: Pending Approval (10 games)                  │
├─────────────────────────────────────────────────────────┤
│  ☐ Game #145 - Blue Devils vs Red Hawks                │
│     Scorekeeper: Sarah Thompson                        │
│     Date: Jan 27, 2026 | Duration: 2.5 hours           │
│     Rate: $30/hr | Amount: $75.00                      │
│     Status: Completed & Verified                       │
│     [VIEW GAME STATS] [APPROVE] [NOTES]                │
│  ────────────────────────────────────────────────────  │
│  ☐ Game #146 - Green Machines vs Stars                 │
│     Scorekeeper: Mike Rodriguez                        │
│     Date: Jan 27, 2026 | Duration: 2.0 hours           │
│     Rate: $35/hr | Amount: $70.00                      │
│     Status: Completed & Verified                       │
│     [VIEW GAME STATS] [APPROVE] [NOTES]                │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Selected: 2 games | Total: $145.00                    │
│  [APPROVE SELECTED] [APPROVE ALL] [EXPORT CSV]         │
└─────────────────────────────────────────────────────────┘
```

**CSV Export Format:**

```csv
Scorekeeper,Email,Game_ID,Date,Start_Time,End_Time,Duration_Hours,Hourly_Rate,Amount,Status
Sarah Thompson,sarah@email.com,145,2026-01-27,18:00,20:30,2.5,30,75.00,Approved
Mike Rodriguez,mike@email.com,146,2026-01-27,20:00,22:00,2.0,35,70.00,Approved
```

### Dependencies from Other Agents

**Needs from Agent 1 (Database):**
- Scorekeeper tables created
- RLS policies for scorekeeper data

**Needs from Agent 2 (Backend):**
- Server actions for scorekeeper operations
- Real-time Supabase subscriptions

**Needs from Agent 3 (UI/UX):**
- Design system components
- Mobile UI patterns

### Blockers & Risks

**Potential Blockers:**
- Offline sync complexity
- Real-time updates on slow connections
- Payment calculation accuracy

**Mitigation:**
- Use Supabase real-time subscriptions
- Implement queue system for offline entries
- Thorough payment calculation testing

### Success Criteria

- [ ] Scorekeeper can enter stats on iPad smoothly
- [ ] Offline mode works (enters stats without wifi)
- [ ] Payment calculations are accurate
- [ ] Admin can approve payments easily
- [ ] Export to CSV works for payroll
- [ ] No data loss during sync
- [ ] Interface is intuitive (< 5 min training)

---

## 📊 CENTRAL PROGRESS TRACKER

All agents report to: **MULTI_TENANT_PROGRESS_TRACKER.md**

### Tracker Structure

```markdown
# Multi-Tenant Progress Tracker

Last Updated: [Date] [Time]

## Overall Progress: X% Complete

### Agent 1: Database & Infrastructure
Status: ⏳ In Progress | ✅ Complete | ❌ Blocked
Progress: 45% (12/27 tasks)

Recent Updates:
- ✅ Created leagues table migration
- ✅ Created league_memberships table
- ⏳ Working on RLS policies for games table
- ❌ BLOCKED: Need clarification on division tier ordering

Next Tasks:
- [ ] Complete RLS policies for all tables
- [ ] Test data migration script
- [ ] Create database functions

Blockers:
- Waiting on Agent 3: Data requirements for league switcher

### Agent 2: Backend API & Business Logic
Status: ⏳ In Progress
Progress: 35% (8/23 tasks)

Recent Updates:
- ✅ Created league management server actions
- ✅ Implemented league-aware auth middleware
- ⏳ Working on Stripe Connect integration

Next Tasks:
- [ ] Complete Stripe Connect webhooks
- [ ] Build email branding system
- [ ] Create division management actions

Blockers:
- None

### Agent 3: UI/UX & Frontend
Status: ⏳ In Progress
Progress: 28% (7/25 tasks)

Recent Updates:
- ✅ Designed marketing homepage
- ✅ Built signup wizard (steps 1-3)
- ⏳ Working on league branding customizer

Next Tasks:
- [ ] Complete signup wizard (steps 4-7)
- [ ] Build league switcher component
- [ ] Create admin dashboard layout

Blockers:
- Waiting on Agent 2: Server actions for signup flow

### Agent 4: Scorekeeper System
Status: ⏳ In Progress
Progress: 40% (6/15 tasks)

Recent Updates:
- ✅ Designed scorekeeper dashboard
- ✅ Created live stat entry wireframes
- ⏳ Building iPad-optimized interface

Next Tasks:
- [ ] Implement offline sync
- [ ] Build payment review interface
- [ ] Create CSV export

Blockers:
- Waiting on Agent 1: Scorekeeper tables created

## Cross-Agent Dependencies

- Agent 2 → Agent 1: Need database functions completed
- Agent 3 → Agent 2: Need signup server actions
- Agent 4 → Agent 1: Need scorekeeper tables
- Agent 3 → Agent 1: Need query performance data

## Critical Path Items

1. Database migrations (Agent 1) - BLOCKING ALL
2. Auth middleware (Agent 2) - BLOCKING Agent 3, 4
3. Signup flow (Agent 3) - CRITICAL for launch
4. Scorekeeper tables (Agent 1) - BLOCKING Agent 4

## Risks & Mitigation

- RLS complexity → Extensive testing planned
- Stripe Connect setup → Using Express accounts (simpler)
- Subdomain routing → Testing on Vercel staging
```

---

## 👤 USER MANUAL TASKS

### What YOU Need to Do (Can't Be Automated)

#### 1. Supabase Configuration

**Create New Supabase Project (or use existing):**

```bash
1. Go to: https://supabase.com/dashboard
2. Click "New Project"
3. Name: "HockeyLife Multi-Tenant"
4. Database Password: [Generate strong password]
5. Region: Choose closest to users
6. Click "Create Project"

Wait 2-3 minutes for provisioning...
```

**Enable Realtime:**

```sql
-- In Supabase SQL Editor, run:
ALTER PUBLICATION supabase_realtime ADD TABLE game_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_scorekeeper_assignments;
```

**Set Up Storage Buckets:**

```javascript
// Create buckets via Supabase Dashboard → Storage
- league-logos (public)
- team-logos (public)
- player-avatars (public)
- league-assets (public)

// Set RLS policies on each bucket
- Allow league admins to upload to their league folder
- Allow public read access
```

**Environment Variables:**

```bash
# Update .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DO NOT commit .env.local to git!
```

#### 2. Resend Email Configuration

**Set Up Resend:**

```bash
1. Go to: https://resend.com/signup
2. Verify your domain (hockeylifehl.app)
3. Add DNS records to your domain:
   - TXT record for verification
   - MX records for email receiving
4. Get API key from dashboard
5. Add to .env.local:

RESEND_API_KEY=re_xxxxxxxxxxxx
```

**Email Templates to Create:**

```javascript
// Create in Resend dashboard or via code
- league-invitation.html
- scorekeeper-assignment.html
- game-reminder.html
- payment-notification.html
- welcome-to-league.html
```

#### 3. Stripe Connect Platform Setup

**Become a Stripe Connect Platform:**

```bash
1. Go to: https://dashboard.stripe.com/settings/connect
2. Enable "Platforms and marketplaces"
3. Choose: Express accounts (recommended)
4. Fill out platform profile:
   - Business name: HockeyLife
   - Website: hockeylifehl.app
   - Support email: support@hockeylifehl.app
5. Get Stripe keys:

STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

**Create Webhook Endpoint:**

```bash
1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: https://hockeylifehl.app/api/webhooks/stripe/connect
3. Select events:
   - account.updated
   - account.application.authorized
   - account.application.deauthorized
   - payment_intent.succeeded
   - payment_intent.failed
4. Copy webhook secret to .env.local
```

#### 4. Domain & DNS Setup

**Configure Root Domain:**

```bash
# DNS records for hockeylifehl.app
A     @       76.76.21.21 (Vercel IP)
CNAME www     cname.vercel-dns.com

# Verification
TXT   @       "vercel-verification=xxxxxxxxxx"
```

**Configure Wildcard Subdomain (for league subdomains):**

```bash
# DNS record for *.hockeylifehl.app
CNAME *       cname.vercel-dns.com

# This allows:
# winter-warriors.hockeylifehl.app
# summer-league.hockeylifehl.app
# fall-draft.hockeylifehl.app
```

**Vercel Project Settings:**

```bash
1. Go to Vercel project → Settings → Domains
2. Add domain: hockeylifehl.app
3. Add wildcard: *.hockeylifehl.app
4. Verify DNS propagation
5. Enable automatic HTTPS
```

#### 5. Vercel Environment Variables

**Add to Vercel Dashboard:**

```bash
# Go to: Vercel Project → Settings → Environment Variables

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Resend
RESEND_API_KEY=re_xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# OpenAI (for AI features)
OPENAI_API_KEY=sk-xxx

# App Config
NEXT_PUBLIC_APP_URL=https://hockeylifehl.app
NODE_ENV=production

# Make sure to set for:
# ✓ Production
# ✓ Preview
# ✓ Development
```

#### 6. Set Up Monitoring (Optional but Recommended)

**Error Tracking with Sentry:**

```bash
1. Sign up: https://sentry.io
2. Create project: "HockeyLife Multi-Tenant"
3. Get DSN
4. Add to .env.local:

NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

**Analytics (Optional):**

```bash
# Vercel Analytics (built-in)
npm install @vercel/analytics
# Already included in Next.js

# OR Plausible (privacy-friendly)
# Add script tag to layout.tsx
```

#### 7. League Owner Guides to Create

**Guide 1: Stripe Connect Setup**

```markdown
# How to Set Up Stripe for Your League

1. In your league admin dashboard, go to Settings → Payments
2. Click "Connect Stripe Account"
3. You'll be redirected to Stripe
4. Fill out business information:
   - Business type: Individual or Company
   - Personal details
   - Bank account for payouts
5. Submit for review (usually approved in 24 hours)
6. Once approved, you can start accepting payments!

Fees: Stripe charges 2.9% + 30¢ per transaction
HockeyLife platform fee: 2% of transaction
```

**Guide 2: Custom Domain Setup**

```markdown
# How to Use Your Own Domain

Prerequisites: Pro or Enterprise plan

1. Purchase domain (GoDaddy, Namecheap, etc.)
2. In your league admin dashboard, go to Settings → Branding
3. Enter your custom domain (e.g., winterwarriors.com)
4. Copy the DNS records shown
5. Add to your domain registrar's DNS settings:

   CNAME  www   cname.vercel-dns.com
   CNAME  @     cname.vercel-dns.com

6. Wait 24-48 hours for DNS propagation
7. Your league will be accessible at your custom domain!
```

**Guide 3: Inviting Users**

```markdown
# How to Invite People to Your League

As Team Captain:
1. Go to Teams → Your Team
2. Click "Invite Players"
3. Enter email addresses (comma-separated)
4. Select role: Player
5. Click "Send Invitations"

As League Admin:
1. Go to Settings → Members
2. Click "Invite Member"
3. Enter email
4. Select role: Admin, Captain, Player, or Scorekeeper
5. Click "Send Invitation"

Invitees will receive email with link to join.
```

#### 8. Migration of Existing HockeyLifeHL Data

**Before Going Multi-Tenant:**

```bash
# Backup current data
1. Go to Supabase → Database → Backups
2. Create manual backup
3. Download backup file
4. Store safely (this is your rollback point)

# Test migration on staging
1. Create staging Supabase project
2. Import backup
3. Run migration: 20260129_migrate_hockeylifehl_to_league_1.sql
4. Test thoroughly
5. Verify all data migrated correctly

# Production migration
1. Schedule maintenance window (late night/weekend)
2. Put site in maintenance mode
3. Run migration script
4. Verify migration
5. Update environment variables
6. Deploy new multi-tenant code
7. Test thoroughly
8. Remove maintenance mode

# Rollback plan (if needed)
1. Restore from backup
2. Deploy old code
3. Investigate issues
4. Fix and retry
```

---

## 🚀 EXECUTION PLAN

### Week-by-Week Breakdown

**Weeks 1-2: Foundation (All Agents)**
- Agent 1: Create core tables (leagues, divisions, venues)
- Agent 2: Set up project structure, auth middleware
- Agent 3: Design marketing site mockups
- Agent 4: Design scorekeeper wireframes
- **YOU**: Set up Supabase, Resend, Stripe accounts

**Weeks 3-5: Database Migration (Agent 1 Focus)**
- Agent 1: Add league_id to all tables, RLS policies
- Agent 2: League management server actions
- Agent 3: Build signup wizard
- Agent 4: Create scorekeeper dashboard
- **YOU**: Configure DNS, Vercel settings

**Weeks 6-9: Core Features (All Agents)**
- Agent 1: Data migration script, database functions
- Agent 2: Stripe Connect integration, email system
- Agent 3: Admin dashboard, league switcher
- Agent 4: Live stat entry interface
- **YOU**: Test Stripe Connect flow, write guides

**Weeks 10-15: Advanced Features**
- Agent 1: Performance optimization, indexes
- Agent 2: AI scheduling, subscription management
- Agent 3: Mobile PWA, responsive design
- Agent 4: Payment tracking, offline sync
- **YOU**: Create league owner documentation

**Weeks 16-18: Testing & Polish**
- All Agents: Bug fixes, testing, refinements
- **YOU**: Final testing, UAT with real users

**Weeks 19-21: Deployment**
- All Agents: Production deployment, monitoring
- **YOU**: Migrate HockeyLifeHL data, launch!

---

## 📞 COMMUNICATION PROTOCOL

### Daily Standup (Async via Progress Tracker)

Each agent updates tracker with:
1. **Yesterday:** What was completed
2. **Today:** What will be worked on
3. **Blockers:** Any dependencies or issues

### Weekly Review

Every Friday, all agents review:
1. Progress against timeline
2. Critical path items
3. Cross-dependencies
4. Risk mitigation

### Escalation Path

**Level 1 - Agent Blocker:**
- Agent posts in progress tracker
- Other agents respond within 4 hours

**Level 2 - Critical Blocker:**
- Multiple agents blocked
- User intervention needed
- Decision required

**Level 3 - Emergency:**
- Production issue
- Data loss risk
- Security vulnerability

---

## ✅ READY TO START?

### Pre-Flight Checklist

Before agents begin, complete:

**User Tasks:**
- [ ] Create Supabase project
- [ ] Set up Resend account
- [ ] Enable Stripe Connect
- [ ] Configure domain DNS
- [ ] Set Vercel environment variables
- [ ] Back up existing database
- [ ] Review and approve agent plan

**Agent 1 Ready:**
- [ ] Database schema designed
- [ ] Migration files planned
- [ ] RLS policy strategy defined

**Agent 2 Ready:**
- [ ] Server action architecture defined
- [ ] API route structure planned
- [ ] Stripe integration researched

**Agent 3 Ready:**
- [ ] Design system chosen
- [ ] Component library selected
- [ ] Responsive breakpoints defined

**Agent 4 Ready:**
- [ ] Scorekeeper workflows documented
- [ ] iPad UI mocks created
- [ ] Payment calculation logic defined

---

## 🎯 SUCCESS CRITERIA

Project is complete when:

1. **Database:**
   - ✅ All tables have league_id
   - ✅ RLS policies enforce tenant isolation
   - ✅ Existing data migrated to League #1

2. **Backend:**
   - ✅ All APIs league-aware
   - ✅ Stripe Connect working
   - ✅ Email branding functional

3. **Frontend:**
   - ✅ Signup flow complete
   - ✅ Admin dashboard functional
   - ✅ Mobile responsive
   - ✅ PWA installable

4. **Scorekeeper:**
   - ✅ Stat entry works on iPad
   - ✅ Payment tracking accurate
   - ✅ Offline mode functional

5. **Launch:**
   - ✅ 3 test leagues created
   - ✅ Real scorekeepers tested system
   - ✅ Stripe payments processed
   - ✅ No data leaks between leagues
   - ✅ Documentation complete

---

## 🚀 LET'S GO!

All agents are ready to execute in parallel.

**To begin:**
1. Complete user pre-flight checklist
2. Create MULTI_TENANT_PROGRESS_TRACKER.md
3. Launch all 4 agents simultaneously
4. Monitor progress tracker daily

**Estimated completion:** 21 weeks from start

**Are you ready to start?** Let me know and I'll help you:
1. Set up Supabase configuration
2. Create progress tracker
3. Launch Agent 1 (Database) to begin
