# 🎯 Scorekeeper System Design
## Multi-Tenant Hockey League Platform

**Date:** January 25, 2026
**Purpose:** Enable hired scorekeepers to enter game stats live using iPad/laptop at the rink

---

## 🎯 CORE REQUIREMENTS

### User Story
> "As a league scorekeeper, I need to log in on my iPad at the rink, see which games I'm assigned to tonight, and enter player stats live during the game so teams have accurate real-time stats."

### Key Features
1. ✅ New `scorekeeper` user role with limited permissions
2. ✅ Game assignment system (scorekeeper assigned to specific games)
3. ✅ Mobile-optimized stat entry interface for iPad/laptop
4. ✅ Live game stats (real-time updates)
5. ✅ Multi-league support (scorekeepers can work for multiple leagues)
6. ✅ Payment tracking (games worked, hourly rate)
7. ✅ Offline support (enter stats without internet, sync later)
8. ✅ Quick player search (jersey number + autocomplete)

---

## 📊 DATABASE SCHEMA

### 1. Add `scorekeeper` Role to Profiles

```sql
-- Update role enum to include scorekeeper
ALTER TYPE user_role ADD VALUE 'scorekeeper';

-- Profiles table already supports this via role column
-- No schema change needed, just use 'scorekeeper' role
```

### 2. Create `league_scorekeepers` Table (Multi-Tenant)

```sql
CREATE TABLE league_scorekeepers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- League & Scorekeeper
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  scorekeeper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Employment Details
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  hourly_rate DECIMAL(10,2), -- Payment rate per hour
  notes TEXT, -- Special instructions, availability notes

  -- Access Control
  can_edit_games BOOLEAN DEFAULT TRUE, -- Can modify game stats
  can_verify_games BOOLEAN DEFAULT FALSE, -- Can mark games as verified

  -- Timestamps
  hired_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(league_id, scorekeeper_id)
);

CREATE INDEX idx_league_scorekeepers_league ON league_scorekeepers(league_id);
CREATE INDEX idx_league_scorekeepers_user ON league_scorekeepers(scorekeeper_id);

-- RLS Policies
ALTER TABLE league_scorekeepers ENABLE ROW LEVEL SECURITY;

-- Scorekeepers can view their own league assignments
CREATE POLICY "Scorekeepers can view own assignments"
  ON league_scorekeepers FOR SELECT
  USING (scorekeeper_id = auth.uid());

-- League admins can manage scorekeepers
CREATE POLICY "League admins manage scorekeepers"
  ON league_scorekeepers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_memberships.league_id = league_scorekeepers.league_id
      AND league_memberships.user_id = auth.uid()
      AND league_memberships.role = 'admin'
    )
  );
```

### 3. Create `game_scorekeeper_assignments` Table

```sql
CREATE TABLE game_scorekeeper_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game & Scorekeeper
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  scorekeeper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE, -- For RLS

  -- Assignment Details
  assigned_by UUID NOT NULL REFERENCES profiles(id), -- Who assigned this scorekeeper
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Game Work Tracking
  checked_in_at TIMESTAMPTZ, -- When scorekeeper arrived at rink
  started_at TIMESTAMPTZ, -- When stat entry began
  completed_at TIMESTAMPTZ, -- When stat entry finished
  duration_minutes INTEGER, -- Calculated: completed_at - started_at

  -- Payment Tracking
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid')),
  payment_amount DECIMAL(10,2), -- Calculated based on duration and hourly rate
  paid_at TIMESTAMPTZ,

  -- Notes
  notes TEXT, -- Special notes about this game assignment

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(game_id, scorekeeper_id) -- One scorekeeper per game (can change if needed)
);

CREATE INDEX idx_game_scorekeeper_game ON game_scorekeeper_assignments(game_id);
CREATE INDEX idx_game_scorekeeper_scorekeeper ON game_scorekeeper_assignments(scorekeeper_id);
CREATE INDEX idx_game_scorekeeper_league ON game_scorekeeper_assignments(league_id);
CREATE INDEX idx_game_scorekeeper_payment ON game_scorekeeper_assignments(payment_status);

-- RLS Policies
ALTER TABLE game_scorekeeper_assignments ENABLE ROW LEVEL SECURITY;

-- Scorekeepers can view their own game assignments
CREATE POLICY "Scorekeepers view own assignments"
  ON game_scorekeeper_assignments FOR SELECT
  USING (scorekeeper_id = auth.uid());

-- Scorekeepers can update their own assignments (check-in, start, complete)
CREATE POLICY "Scorekeepers update own assignments"
  ON game_scorekeeper_assignments FOR UPDATE
  USING (scorekeeper_id = auth.uid())
  WITH CHECK (scorekeeper_id = auth.uid());

-- League admins can manage all assignments
CREATE POLICY "League admins manage assignments"
  ON game_scorekeeper_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_memberships.league_id = game_scorekeeper_assignments.league_id
      AND league_memberships.user_id = auth.uid()
      AND league_memberships.role = 'admin'
    )
  );
```

### 4. Update `games` Table

```sql
-- Add scorekeeper-related fields to games table
ALTER TABLE games ADD COLUMN scorekeeper_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN scorekeeper_verified_at TIMESTAMPTZ;
ALTER TABLE games ADD COLUMN scorekeeper_verified_by UUID REFERENCES profiles(id);
ALTER TABLE games ADD COLUMN scorekeeper_notes TEXT; -- Notes from scorekeeper

CREATE INDEX idx_games_scorekeeper_verified ON games(scorekeeper_verified);
```

### 5. Create `game_stat_entry_log` Table (Audit Trail)

```sql
CREATE TABLE game_stat_entry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Who entered the stat
  entered_by UUID NOT NULL REFERENCES profiles(id),
  entered_by_role TEXT NOT NULL, -- 'scorekeeper', 'captain', 'admin'

  -- What changed
  stat_type TEXT NOT NULL, -- 'goal', 'assist', 'penalty', etc.
  action TEXT NOT NULL, -- 'add', 'remove', 'edit'
  previous_value JSONB, -- Previous stat value
  new_value JSONB, -- New stat value

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_stat_log_game ON game_stat_entry_log(game_id);
CREATE INDEX idx_game_stat_log_entered_by ON game_stat_entry_log(entered_by);
```

---

## 🔐 ACCESS CONTROL & PERMISSIONS

### Scorekeeper Permissions

**CAN:**
- ✅ View assigned games (past and upcoming)
- ✅ Enter/edit stats for assigned games during game time
- ✅ Mark themselves as checked-in/started/completed
- ✅ View rosters for teams in assigned games
- ✅ Add game notes
- ✅ Verify game stats (if permission granted)

**CANNOT:**
- ❌ View games they're not assigned to
- ❌ Edit games after verification deadline (league configurable)
- ❌ Access team management, payments, or admin features
- ❌ View other scorekeepers' assignments
- ❌ Delete games or players
- ❌ Access league settings

### Multi-League Support

Scorekeepers can:
- Work for multiple leagues simultaneously
- Have different hourly rates per league
- See all assigned games across all leagues in one dashboard
- Switch between leagues easily

---

## 📱 SCOREKEEPER UI/UX DESIGN

### 1. Scorekeeper Dashboard (Mobile-Optimized)

**Route:** `/scorekeeper/dashboard`

**Layout:**
```
┌─────────────────────────────────┐
│  🏒 HockeyLife Scorekeeper      │
│  Hi, Sarah Thompson             │
├─────────────────────────────────┤
│  📅 Today's Games (3)           │
│                                 │
│  ⏰ 6:00 PM - Ice Rink A        │
│  🔵 Blue Devils vs Red Hawks    │
│  Division A | Game #145         │
│  [CHECK IN] [VIEW GAME]         │
│                                 │
│  ⏰ 8:00 PM - Ice Rink B        │
│  🟢 Green Machines vs Stars     │
│  Division B | Game #146         │
│  [VIEW GAME]                    │
│                                 │
│  ⏰ 9:30 PM - Ice Rink A        │
│  🟡 Thunder vs Lightning        │
│  Division C | Game #147         │
│  [VIEW GAME]                    │
├─────────────────────────────────┤
│  📊 This Week (12 games)        │
│  💰 Payment Status: $450 pending│
├─────────────────────────────────┤
│  [Upcoming] [History] [Profile] │
└─────────────────────────────────┘
```

### 2. Live Game Stat Entry Interface

**Route:** `/scorekeeper/game/[gameId]`

**Key Features:**
- **Big Touch Targets:** Easy to tap on iPad
- **Jersey Number Quick Entry:** Type jersey # → autocomplete player
- **One-Tap Stat Recording:** Goal, Assist, Penalty with single tap
- **Live Score Display:** Real-time score updates
- **Undo Last Entry:** Quick mistake correction
- **Timer/Period Indicator:** Current period and time remaining

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Period 2 | 12:35 remaining                     │
│  🔵 Blue Devils 3  -  2 Red Hawks 🔴           │
├─────────────────────────────────────────────────┤
│  [Period 1] [Period 2 ●] [Period 3] [OT]      │
├─────────────────────────────────────────────────┤
│  Quick Entry:                                   │
│  ┌──────────────┐  ┌──────────────┐           │
│  │   🥅 GOAL    │  │  🅰️ ASSIST  │           │
│  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐  ┌──────────────┐           │
│  │  ⚠️ PENALTY  │  │  🧤 GOALIE   │           │
│  └──────────────┘  └──────────────┘           │
├─────────────────────────────────────────────────┤
│  Enter Jersey #:                                │
│  ┌─────────────────────────────────────────┐  │
│  │  #17 ↓                                   │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Suggestions:                                   │
│  [#17 - Mike Johnson (Blue Devils)]           │
│  [#71 - Sarah Lee (Red Hawks)]                │
├─────────────────────────────────────────────────┤
│  Recent Entries:                                │
│  12:45 - #17 Mike Johnson - GOAL (Assisted by #8)│
│  13:20 - #23 Tom Smith - PENALTY (2 min, Hooking)│
│  14:05 - #8 Alex Brown - ASSIST                │
│                                 [UNDO LAST]     │
├─────────────────────────────────────────────────┤
│  [GAME NOTES] [ROSTERS] [END PERIOD]           │
└─────────────────────────────────────────────────┘
```

### 3. Mobile-First Design Principles

**iPad Optimization:**
- Large button sizes (minimum 60px height)
- High contrast colors for rink lighting conditions
- Landscape mode primary (portrait supported)
- Offline-capable (service worker caching)
- Auto-save every 5 seconds
- Haptic feedback on stat entry

**Fast Workflow:**
1. Type jersey number
2. Select player from autocomplete
3. Tap stat type (Goal/Assist/Penalty)
4. Entry recorded instantly
5. Auto-switch to next player

**Keyboard Shortcuts (for laptop users):**
- `G` - Goal
- `A` - Assist
- `P` - Penalty
- `Ctrl+Z` - Undo last
- `Enter` - Confirm entry

---

## 🔄 WORKFLOWS

### Workflow 1: League Admin Hires Scorekeeper

1. **Admin adds scorekeeper to league:**
   - Navigate to League Settings → Scorekeepers
   - Click "Add Scorekeeper"
   - Enter email (invite if not registered)
   - Set hourly rate ($25-50/hour typical)
   - Set permissions (can verify games?)
   - Click "Add Scorekeeper"

2. **Scorekeeper receives email invitation:**
   - Email: "You've been added as a scorekeeper for Winter Warriors League"
   - Link to accept and set up profile
   - Can set availability preferences

3. **Admin assigns scorekeeper to games:**
   - Navigate to Schedule
   - Click on game → "Assign Scorekeeper"
   - Select scorekeeper from list
   - Optionally add notes ("Please verify goalies carefully")
   - Click "Assign"

4. **Scorekeeper receives notification:**
   - Email: "You've been assigned to Game #145 on Jan 30 at 6:00 PM"
   - Calendar invite (optional)
   - Game details and location

### Workflow 2: Scorekeeper Enters Stats Live

1. **Before the game:**
   - Scorekeeper arrives at rink
   - Opens app on iPad
   - Clicks "Check In" on game assignment
   - Reviews team rosters
   - Verifies goalies are in lineup

2. **During the game:**
   - Clicks "Start Game" when puck drops
   - Timer starts tracking work duration
   - Enters stats live as they happen:
     - Goal: Type jersey #17 → Select "Mike Johnson" → Tap "Goal" → Select assist #8
     - Penalty: Type jersey #23 → Select "Tom Smith" → Tap "Penalty" → Select type/duration
   - Stats auto-save to database
   - Teams/fans can see live updates

3. **End of period:**
   - Clicks "End Period 1"
   - Reviews period stats
   - Makes any corrections
   - Clicks "Start Period 2" when ready

4. **After the game:**
   - Clicks "End Game"
   - Reviews final stats
   - Adds any game notes
   - Clicks "Submit & Verify" (if has verification permission)
   - OR clicks "Submit for Review" (admin verifies later)
   - Duration automatically calculated for payment

### Workflow 3: Payment Processing

1. **League admin reviews completed games:**
   - Navigate to Scorekeepers → Payments
   - See list of completed games pending approval
   - Review game duration and stats quality
   - Click "Approve Payment" for each game
   - Bulk approve option available

2. **System calculates payment:**
   - Duration: 2.5 hours
   - Hourly Rate: $30/hour
   - Total: $75
   - Status: Approved

3. **Admin processes payment:**
   - Export payment report (CSV)
   - Process via payroll/Stripe/manual
   - Mark as "Paid" in system
   - Scorekeeper receives confirmation

---

## 🚀 IMPLEMENTATION PHASES

### Phase 0.5: Scorekeeper System (Insert into multi-tenant plan)

**When:** Between Phase 2 (Division Restructuring) and Phase 3 (Application Core)

**Duration:** 1-2 weeks

**Tasks:**

#### Week 1: Backend & Database
- [ ] Create database migrations:
  - `league_scorekeepers` table
  - `game_scorekeeper_assignments` table
  - `game_stat_entry_log` table
  - Update `games` table with scorekeeper fields
  - Add `scorekeeper` to user_role enum
- [ ] Add RLS policies for scorekeeper data
- [ ] Create API routes:
  - `POST /api/scorekeepers/assign` - Assign scorekeeper to game
  - `GET /api/scorekeepers/assignments` - Get scorekeeper's games
  - `POST /api/scorekeepers/check-in` - Check in to game
  - `POST /api/scorekeepers/game/[id]/stats` - Enter live stats
  - `GET /api/scorekeepers/payments` - Get payment summary
- [ ] Create server actions:
  - `addScorekeeperToLeague()`
  - `assignScorekeeperToGame()`
  - `recordGameStat()` - With audit logging
  - `getScorekeeperAssignments()`

#### Week 2: Frontend UI
- [ ] Create scorekeeper dashboard:
  - `/scorekeeper/dashboard` - Main dashboard
  - `/scorekeeper/game/[id]` - Live stat entry interface
  - `/scorekeeper/schedule` - Upcoming games calendar
  - `/scorekeeper/payments` - Payment history
- [ ] Build mobile-optimized stat entry form:
  - Jersey number autocomplete
  - Big touch targets for iPad
  - Offline support with service worker
  - Real-time updates with Supabase subscriptions
- [ ] Create admin scorekeeper management:
  - `/admin/scorekeepers` - Manage league scorekeepers
  - `/admin/schedule` - Assign scorekeepers to games
  - `/admin/scorekeepers/payments` - Review and approve payments
- [ ] Add scorekeeper selection to game creation/edit
- [ ] Mobile testing on iPad

---

## 📊 ALTERNATIVE: Simplified Scorekeeper (MVP)

If you want to start simpler and add this later:

### Quick Win Version (1-2 days)

1. **Add scorekeeper role to existing system:**
   - Just use existing `role` field on profiles
   - Add "scorekeeper" as a role option
   - Give scorekeepers access to game stat entry

2. **Simple assignment:**
   - Add `assigned_scorekeeper_id` to `games` table
   - Admin selects scorekeeper when creating/editing game
   - Scorekeeper sees "My Assigned Games" list

3. **Use existing stat entry UI:**
   - Scorekeepers use same interface as captains
   - Filter games list to show only assigned games
   - No special mobile UI (phase 2 improvement)

**Trade-offs:**
- ❌ No payment tracking
- ❌ No check-in workflow
- ❌ No mobile-optimized interface
- ❌ No multi-league scorekeeper support
- ✅ Gets you 80% of functionality in 10% of time
- ✅ Can enhance later

---

## 🤔 QUESTIONS FOR YOU

Before implementing the scorekeeper system:

1. **Scope:**
   - Full scorekeeper system with payment tracking?
   - OR simplified MVP (just role + assignments)?

2. **Payment:**
   - Do you need in-app payment tracking?
   - OR just export to CSV for external payroll?

3. **Timeline:**
   - Add to multi-tenant plan now?
   - OR build for single-tenant first to test?

4. **Mobile:**
   - Need iPad optimization immediately?
   - OR can start with responsive web?

5. **Multi-League:**
   - Do scorekeepers work for multiple leagues?
   - OR typically work for just one league?

---

## 💡 MY RECOMMENDATION

### For Multi-Tenant: Full Scorekeeper System

If you're building multi-tenant, implement the **full scorekeeper system** because:

1. **Critical for Real Leagues:** Most leagues hire scorekeepers
2. **Competitive Advantage:** Most hockey platforms don't have this
3. **Revenue Opportunity:** Can charge leagues for scorekeeper management
4. **Multi-League Value:** Scorekeepers working multiple leagues is common
5. **Better UX:** Mobile-optimized interface is essential for rink use

### Implementation Order

**If doing multi-tenant:**
1. Build core multi-tenant (Phases 0-2)
2. **Add scorekeeper system (Phase 2.5 - Week 7-8)**
3. Continue with Phase 3+ (Application Core)

**If staying single-tenant for now:**
1. Build simplified scorekeeper MVP (2 days)
2. Test with real users
3. Enhance later with full system

---

## 🚀 Ready to Build This?

I can help you:

**Option A:** Add full scorekeeper system to multi-tenant plan
**Option B:** Build simplified MVP for single-tenant first
**Option C:** Design more detailed mockups before deciding

What would you like to do?
