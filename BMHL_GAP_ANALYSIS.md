# BMHL Requirements - Gap Analysis & Implementation Plan

**Client:** Barrie Men's Hockey League (BMHL) - Potential First Customer
**Date:** 2026-01-29
**Status:** Gap Analysis Complete
**Priority:** P0 - Critical for client acquisition

---

## Executive Summary

BMHL's core pain points are **scheduling/rescheduling at scale** and **payment collection**. They need self-serve admin tools that work without "backend access." Current platform has ~40% of required functionality.

**Critical Gaps:**
1. ❌ Bulk reschedule workflow (weather cancellations)
2. ❌ Conflict detection (team/venue/scorekeeper overlaps)
3. ❌ Event-driven notifications
4. ❌ Payment status tracking dashboard
5. ❌ Admin ops console (inline editing, bulk actions)

---

## Part 1: What We HAVE vs. What BMHL NEEDS

### ✅ HAVE - Foundation Exists (Ready to Build On)

#### P0.1: Multi-Tenant Foundation ✅ COMPLETE
- **Status:** 100% Complete
- **Evidence:**
  - Postgres RLS enforced on all tables
  - `league_id` on games, teams, players, venues, etc.
  - Row-level policies verified in `20260126_verify_rls_policies.sql`
  - Security audit completed 2026-01-25
- **BMHL Readiness:** ✅ Can support BMHL + Demo League with zero data leakage

#### P0.3: Scorekeeper System ✅ EXISTS (Needs Refinement)
- **Status:** 70% Complete
- **What We Have:**
  - Scorekeeper roles and assignments (`game_scorekeeper_assignments`)
  - Offline-first PWA for stat entry
  - Captain verification system with tokens
  - Audit trail via `game_stat_entry_log`
- **What's Missing for BMHL:**
  - ❌ Electronic game sheet UI with proper hockey logic (PP/PK, strength tracking)
  - ❌ Event sourcing architecture (currently direct row updates)
  - ❌ Rules-driven PP expiry (configurable per league)
- **Gap Severity:** 🟡 Medium (exists but needs enhancement)

#### Stripe Payments ✅ EXISTS (Incomplete)
- **Status:** 40% Complete
- **What We Have:**
  - Stripe Connect account linking (`leagues.stripe_account_id`)
  - Payment history tracking (`stripe_payment_history`)
  - Webhook event logging (`stripe_webhook_events`)
- **What's Missing for BMHL:**
  - ❌ Invoice/dues tracking per team/player
  - ❌ "Who hasn't paid" dashboard
  - ❌ Payment reminder workflow
  - ❌ Captain view of team payment status
- **Gap Severity:** 🟡 Medium (foundational work done)

---

### ❌ DON'T HAVE - Critical Gaps for BMHL

#### P0.2: Scheduling v1 (Rescheduling Workflows) ❌ CRITICAL GAP
- **Status:** 15% Complete
- **BMHL Quote:** *"Biggest thing is scheduling... when we have to cancel 35 games because of weather."*
- **What We Have:**
  - `games` table with `status` enum (`scheduled`, `in_progress`, `completed`, `cancelled`)
  - `scheduled_at` timestamp field
  - `venues` table with multi-tenant support
- **What's Missing (P0 for BMHL):**
  - ❌ **Reschedule workflow** (single game + bulk wizard)
  - ❌ **Conflict detection engine**:
    - Team has overlapping game
    - Venue already booked
    - Scorekeeper double-booked
    - Back-to-back game violations
  - ❌ **"Postponed" game state** (currently only `scheduled` or `cancelled`)
  - ❌ **Schedule rules table** (`schedule_rules` per league/season):
    - Game length, buffer minutes, blackout dates, allowed venues
  - ❌ **Bulk reschedule UI** (select N games → wizard → detect conflicts → confirm)
  - ❌ **Cancellation workflow** (cancel → queue for reschedule → notify)
- **Implementation Estimate:** 2-3 weeks
- **Gap Severity:** 🔴 **CRITICAL** - This is BMHL's #1 pain point

#### P0.4: Notifications (Event-Driven) ❌ CRITICAL GAP
- **Status:** 0% Complete
- **BMHL Impact:** Rescheduling 35 games means notifying 70 captains + optionally all players
- **What's Missing:**
  - ❌ Domain events (`GameRescheduled`, `GameCancelled`, `ScoreSubmitted`)
  - ❌ Notification service/queue
  - ❌ `notifications` table (tenant_id, user_id, channel, template_id, status, sent_at)
  - ❌ Email templates (Resend/SendGrid integration)
  - ❌ SMS support (optional Phase 2)
  - ❌ Notification log per game (admin visibility)
- **Implementation Estimate:** 1-2 weeks
- **Gap Severity:** 🔴 **CRITICAL** - Reschedule workflow useless without this

#### P0.5: Admin "No Backend" Ops Console ❌ CRITICAL GAP
- **Status:** 5% Complete
- **BMHL Quote:** *"Admin can change things without 'back end'"*
- **What We Have:**
  - `audit_logs` table exists
  - Some admin pages for team/player management
- **What's Missing:**
  - ❌ **Inline edit** for game time/venue/teams
  - ❌ **Bulk operations**:
    - Postpone all games on date X
    - Move all games from rink A → rink B
    - Reassign scorekeeper for N games
  - ❌ **Audit log middleware** (automatic logging of all admin actions)
  - ❌ **Permission system** (owner vs admin vs scorekeeper boundaries)
  - ❌ **"Undo" capability** (rollback last N actions)
- **Implementation Estimate:** 2 weeks
- **Gap Severity:** 🔴 **CRITICAL** - BMHL explicitly requested this

#### P1.1: Payments v1 (Collection Workflow) ❌ MEDIUM GAP
- **Status:** 40% Complete (foundation only)
- **BMHL Quote:** *"Biggest thing is... collecting payments"*
- **What's Missing:**
  - ❌ **Invoices table** (`invoices`: tenant_id, owner_type [team/player], amount, due_date, status)
  - ❌ **Admin payment dashboard**:
    - Outstanding balances
    - Aging report (30/60/90 days overdue)
    - Export to CSV
  - ❌ **Captain view** (roster payment status, send reminders)
  - ❌ **Player view** (balance, pay now button)
  - ❌ **Payment reminder workflow** (automated emails at due date)
- **Implementation Estimate:** 1.5 weeks
- **Gap Severity:** 🟡 Medium (mentioned but less urgent than scheduling)

#### P1.2: Scorekeeper Scheduling (Availability → Assignment) ❌ LOW PRIORITY
- **Status:** 0% Complete
- **What's Missing:**
  - ❌ `availability_blocks` table (user_id, starts_at, ends_at)
  - ❌ Auto-assign suggestion engine (greedy algorithm based on proximity, fairness, conflicts)
  - ❌ Manual override UI
- **Implementation Estimate:** 1 week
- **Gap Severity:** 🟢 Low (BMHL didn't explicitly request this)

---

## Part 2: Database Schema Gaps

### Tables We Need to Create

#### 1. `schedule_rules` (P0 for conflict detection)
```sql
CREATE TABLE schedule_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE, -- Optional: per-season rules

  -- Game timing rules
  game_duration_minutes INTEGER DEFAULT 60,
  buffer_minutes INTEGER DEFAULT 15, -- Time between games at same venue

  -- Venue rules
  allowed_venue_ids UUID[], -- NULL = all venues allowed

  -- Team rules
  min_hours_between_games INTEGER DEFAULT 24, -- Prevent back-to-back scheduling abuse
  max_games_per_week INTEGER DEFAULT 3,

  -- Blackout dates
  blackout_dates JSONB DEFAULT '[]', -- [{date: "2026-12-25", reason: "Christmas"}]

  -- Constraints
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(league_id, season_id)
);
```

#### 2. `game_events` (P0.3 - Event Sourcing for Game Sheets)
```sql
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- goal, penalty, period_start, period_end, game_start, game_end
  event_time TIMESTAMPTZ NOT NULL, -- When the event occurred in real life
  period INTEGER, -- 1, 2, 3, OT, SO
  game_time_seconds INTEGER, -- Seconds into the period (e.g., 120 = 2:00)

  -- Event payload (JSON for flexibility)
  payload JSONB NOT NULL,
  -- Examples:
  -- Goal: {team_id, player_id, assist1_id, assist2_id, strength: "even|pp|sh"}
  -- Penalty: {team_id, player_id, infraction, minutes, strength_state_after}

  -- Audit trail
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Event sequence (for replay ordering)
  sequence INTEGER NOT NULL, -- Auto-increment per game

  -- Soft delete (for corrections)
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id),
  deletion_reason TEXT,

  CONSTRAINT valid_event_type CHECK (event_type IN (
    'goal', 'penalty', 'period_start', 'period_end',
    'game_start', 'game_end', 'timeout', 'goalie_change'
  ))
);

CREATE INDEX idx_game_events_game_id ON game_events(game_id, sequence);
CREATE INDEX idx_game_events_league_id ON game_events(league_id);
```

#### 3. `game_state` (Materialized View from Events)
```sql
CREATE TABLE game_state (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Scoreboard
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,

  -- Current state
  period INTEGER DEFAULT 1,
  game_time_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'not_started', -- not_started, in_progress, intermission, ended

  -- Penalties (active)
  active_penalties JSONB DEFAULT '[]',
  -- [{player_id, team_id, infraction, started_at, ends_at, minutes_remaining}]

  -- Strength state
  home_strength INTEGER DEFAULT 5, -- 5, 4, 3 (players on ice)
  away_strength INTEGER DEFAULT 5,
  strength_situation TEXT DEFAULT 'even', -- even, pp, pk, 5v3, etc.

  -- Last updated
  last_event_id UUID REFERENCES game_events(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `invoices` (P1.1 - Payment Tracking)
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Who owes this?
  owner_type TEXT NOT NULL, -- 'team' | 'player'
  owner_id UUID NOT NULL, -- team_id or player_id

  -- Invoice details
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, overdue, cancelled

  -- Payment tracking
  paid_amount DECIMAL(10,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- stripe, cash, check, other
  stripe_payment_intent_id TEXT,

  -- Reminders
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  CONSTRAINT valid_owner_type CHECK (owner_type IN ('team', 'player')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT valid_amount CHECK (amount > 0)
);

CREATE INDEX idx_invoices_league_id ON invoices(league_id);
CREATE INDEX idx_invoices_owner ON invoices(owner_type, owner_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status = 'pending';
```

#### 5. `notifications` (P0.4 - Event-Driven Notifications)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Recipient
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL, -- game_rescheduled, game_cancelled, payment_due, etc.
  channel TEXT NOT NULL, -- email, sms, push

  -- Content
  subject TEXT,
  body TEXT NOT NULL,
  template_id TEXT, -- For template-based notifications
  template_data JSONB, -- Variables for template

  -- Status
  status TEXT DEFAULT 'pending', -- pending, sent, failed, bounced
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Related entities
  related_entity_type TEXT, -- game, invoice, team, etc.
  related_entity_id UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_channel CHECK (channel IN ('email', 'sms', 'push')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'bounced'))
);

CREATE INDEX idx_notifications_league_id ON notifications(league_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

#### 6. `availability_blocks` (P1.2 - Scorekeeper Scheduling)
```sql
CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Availability window
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  -- Status
  available BOOLEAN DEFAULT TRUE, -- TRUE = available, FALSE = unavailable (blocked)

  -- Recurring (optional v2)
  recurrence_rule TEXT, -- RRULE format (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (ends_at > starts_at)
);

CREATE INDEX idx_availability_blocks_user_league ON availability_blocks(user_id, league_id);
CREATE INDEX idx_availability_blocks_time_range ON availability_blocks(starts_at, ends_at);
```

---

## Part 3: Implementation Roadmap

### Phase 1: P0 Must-Haves (4-5 weeks) - Required for BMHL Demo

#### Week 1-2: Scheduling & Rescheduling (P0.2)
**Goal:** Admin can reschedule games and see conflicts

**Tasks:**
1. Create `schedule_rules` table migration
2. Add "postponed" status to `games.status` enum
3. Build conflict detection service:
   - `detectTeamConflicts(game_id, new_time, new_venue)`
   - `detectVenueConflicts(venue_id, new_time, duration)`
   - `detectScorekeeperConflicts(scorekeeper_id, new_time)`
4. Build reschedule API endpoints:
   - `POST /api/admin/games/:id/reschedule` (single game)
   - `POST /api/admin/games/bulk-reschedule` (multi-game wizard)
5. Build reschedule UI:
   - Single game modal (datetime picker, venue selector, conflict warnings)
   - Bulk reschedule wizard (step 1: select games, step 2: apply rule, step 3: review conflicts, step 4: confirm)
6. Add cancellation workflow:
   - "Cancel (Weather)" quick action
   - Queues games for reschedule in admin task list

**Deliverables:**
- Admin can reschedule 1 game in <30 seconds
- Admin can bulk reschedule 35 games with wizard
- Conflicts are detected and displayed before save
- Cancelled games appear in "Needs Reschedule" queue

**Acceptance Criteria (from BMHL spec):**
- ✅ Admin can reschedule 1 game in < 30 seconds
- ✅ Admin can bulk-reschedule N games (e.g., 35) with one wizard
- ✅ Conflicts are caught before save; override requires reason + permission

---

#### Week 2-3: Notifications (P0.4)
**Goal:** Automated notifications when games are rescheduled/cancelled

**Tasks:**
1. Create `notifications` table migration
2. Create domain event system:
   - `EventBus` class (in-memory for v1, Redis/PubSub for v2)
   - Event types: `GameRescheduled`, `GameCancelled`, `ScoreSubmitted`
3. Build notification service:
   - Subscribe to domain events
   - Create notification records
   - Send via Resend (email) or Twilio (SMS)
4. Integrate with reschedule workflow:
   - Emit `GameRescheduled` event after successful reschedule
   - Notification service auto-notifies captains
5. Build notification log UI:
   - Admin view: "Who was notified?" per game
   - Resend capability

**Deliverables:**
- Rescheduling triggers automatic emails to captains
- Admin can view notification log per game
- Admin can manually resend notifications

**Acceptance Criteria (from BMHL spec):**
- ✅ Rescheduling triggers notifications automatically
- ✅ Admin can re-send

---

#### Week 3-4: Admin Ops Console (P0.5)
**Goal:** Self-serve admin UI for common operations

**Tasks:**
1. Build inline edit components:
   - Game time/venue editor (inline datepicker)
   - Team roster editor (drag-drop)
   - Division assignment editor
2. Build bulk operations UI:
   - "Postpone all games on date X" wizard
   - "Move all games from rink A → rink B" wizard
   - "Reassign scorekeeper for N games" wizard
3. Implement audit middleware:
   - Auto-log all admin actions to `audit_logs`
   - Capture before/after JSON diffs
4. Build audit log viewer:
   - Filterable by entity type, action, actor, date range
   - "Undo" button (where safe)

**Deliverables:**
- Admin can inline-edit game details without SQL
- Admin can perform bulk operations via wizard
- Every admin action is logged and traceable

**Acceptance Criteria (from BMHL spec):**
- ✅ Admin can perform common ops without database access
- ✅ Every change is traceable

---

#### Week 4-5: Scorekeeper Workflow Enhancement (P0.3)
**Goal:** Electronic game sheet with proper hockey logic

**Tasks:**
1. Create `game_events` and `game_state` tables (migrations)
2. Refactor scorekeeper UI to use event sourcing:
   - "Add Goal" → creates goal event
   - "Add Penalty" → creates penalty event + updates strength state
   - Game state derived by replaying events
3. Implement rules engine:
   - PP expiry on goal (configurable per league)
   - Automatic strength state calculation (even, pp, pk, 5v3)
   - Penalty timer tracking
4. Build event audit UI:
   - Admin can view event log
   - Admin can correct events (soft delete + create correction event)
5. Real-time updates:
   - Supabase Realtime subscription to `game_events`
   - Public game page updates live as scorekeeper enters stats

**Deliverables:**
- Scorekeeper records goal → event created → game state updates
- PP goal handling matches league rules
- Admin can audit and correct events
- Public page shows live updates

**Acceptance Criteria (from BMHL spec):**
- ✅ Scorekeeper logs in → sees assigned game → records a goal → public game page updates in real time
- ✅ Admin can correct an event with full audit trail
- ✅ PP goal handling matches tenant configuration

---

### Phase 2: P1 Should-Haves (2-3 weeks) - Strong Demo

#### Week 6-7: Payments v1 (P1.1)
**Goal:** Admin/captain can see who hasn't paid

**Tasks:**
1. Create `invoices` table migration
2. Build invoice creation UI (admin):
   - Create invoice for team/player
   - Bulk invoice generation (all teams in league)
3. Build payment dashboards:
   - Admin: Outstanding balances, aging report, export CSV
   - Captain: Roster payment status, send reminder button
   - Player: "My Balance" page, "Pay Now" button (Stripe link)
4. Build payment reminder workflow:
   - Cron job checks for overdue invoices
   - Auto-sends reminder emails
5. Integrate Stripe payment flow:
   - Player clicks "Pay Now" → redirects to Stripe checkout
   - Webhook updates invoice status on success

**Deliverables:**
- Admin can see "Who Hasn't Paid" report
- Captain can nudge unpaid players via reminder button
- Player can pay via Stripe

**Acceptance Criteria (from BMHL spec):**
- ✅ Admin can see who hasn't paid
- ✅ Captain can nudge unpaid players
- ✅ Payment event updates status

---

#### Week 7-8: Scorekeeper Scheduling (P1.2) - OPTIONAL
**Goal:** Suggest scorekeepers based on availability

**Tasks:**
1. Create `availability_blocks` table migration
2. Build availability calendar UI (scorekeeper profile)
3. Build auto-assign suggestion engine:
   - Greedy algorithm: find best match per game
   - Scoring factors: availability, proximity, fairness (games/week), conflicts
4. Build manual override UI (admin):
   - View suggested assignments
   - Override with manual selection

**Deliverables:**
- Scorekeeper can set availability
- Admin sees suggested assignments
- Admin can manually override

---

### Phase 3: P2 Could-Haves (Roadmap Only)
- Draft mode enhancements
- NHL-style commissioner tools
- Advanced analytics
- Multi-season history imports

---

## Part 4: BMHL Demo Site Specification

### Seed Data Plan (Fake but Believable)

**Tenant:**
- Name: "Barrie Men's Hockey League"
- Slug: `bmhl`
- Domain: `bmhl.beerleaguehockey.ca` (or `barriehockey.ca` if custom domain)
- Location: Barrie, Ontario, Canada
- Season: "Winter 2025/26"

**Divisions:**
- Division A (8 teams, competitive)
- Division C (8 teams, recreational)

**Teams (16 total):**
- Division A: Ice Dogs, Bulldogs, Warriors, Thunder, Storm, Lightning, Blades, Kings
- Division C: Beer Leaguers, Puck Hogs, Slap Shots, Bench Warmers, Hat Tricks, Snipers, Danglers, Grit

**Games:**
- 10 scheduled games (mix of divisions)
- 2 postponed games (weather)
- 1 cancelled game
- 3 games needing reschedule (in admin queue)

**Users:**
- 2 scorekeepers (assigned 3-5 games each)
- 4 captains (2 per division)
- 20 players (spread across teams)
- 1 admin (BMHL commissioner)

**Payments:**
- 8 teams with invoices ($500 each)
- 3 teams paid, 5 outstanding
- Aging: 2 overdue by 30 days, 1 overdue by 60 days

### Demo Flows to Showcase

#### Flow 1: Weather Cancellation & Bulk Reschedule
1. Admin logs in → sees schedule
2. Clicks "Cancel (Weather)" on 3 games → games marked postponed
3. Admin clicks "Bulk Reschedule" → wizard opens
4. Selects 3 postponed games → applies "Move all +7 days" rule
5. System detects 1 conflict (venue double-booked)
6. Admin overrides with reason "Venue confirmed availability"
7. Confirms → games rescheduled
8. Notification log shows 6 emails sent (captains notified)

#### Flow 2: Scorekeeper Submits Game Sheet
1. Scorekeeper logs in → sees "My Games"
2. Clicks "Enter Stats" for game
3. Adds goal (player dropdown, assists, timestamp)
4. Adds penalty (player dropdown, infraction, 2 min)
5. System updates strength state (PP detected)
6. Clicks "End Game" → stats locked
7. Captain receives verification email → clicks verify link
8. Public game page updates instantly (real-time)

#### Flow 3: Payment Dashboard
1. Admin logs in → navigates to "Payments"
2. Sees dashboard: 5 teams outstanding, $2,500 owed
3. Clicks "Aging Report" → sees 2 teams 30+ days overdue
4. Clicks "Send Reminder" on overdue team → email queued
5. Captain logs in → sees roster with payment status (3/10 players paid)
6. Clicks "Nudge Unpaid Players" → reminder emails sent
7. Player logs in → sees "$50 due by Feb 15" banner
8. Clicks "Pay Now" → redirects to Stripe → pays
9. Webhook updates invoice → status = paid

#### Flow 4: Admin Inline Edits
1. Admin logs in → navigates to "Schedule"
2. Hovers over game time → inline datepicker appears
3. Changes time → conflict warning appears (team double-booked)
4. Cancels → reverts change
5. Clicks game venue → dropdown appears (venue list)
6. Selects new venue → saves
7. Audit log records: "Admin changed venue from Rink A → Rink B at 2026-01-29 10:45"

---

## Part 5: Answers to Follow-Up Questions

### Q1: Current tenancy approach - RLS vs app-scoped?
**Answer:** ✅ **RLS (Row-Level Security)** is already implemented and enforced.

**Evidence:**
- All core tables have `league_id` foreign key
- RLS policies verified in `20260126_verify_rls_policies.sql`
- Security audit completed 2026-01-25 (see `SECURITY.md`)
- Postgres RLS is enabled on games, teams, players, venues, etc.

**No changes needed** - we're using the recommended approach.

---

### Q2: Do we already have a "game" schema? Need refactor toward `game_events`?
**Answer:** ✅ YES, but **refactor needed** for event sourcing.

**Current State:**
- `games` table exists with 32 columns (status, scores, timestamps, captain verification)
- Stats are recorded in `player_stats` and `goalie_stats` (direct row updates)
- No event sourcing yet

**Refactor Plan:**
1. Create `game_events` table (immutable event log)
2. Create `game_state` table (materialized view derived from events)
3. Refactor scorekeeper UI to emit events instead of direct DB updates
4. Keep existing `games` table for metadata (scheduled_at, venue, teams)
5. Dual-write during migration: emit events + update existing tables
6. Cutover to event-sourced reads once stable

**Timeline:** Week 4-5 of Phase 1

---

### Q3: Are standings computed from game results today, or manually edited?
**Answer:** ✅ **Computed from game results** (automated).

**Evidence:**
- `standings` view/table derives from `games.home_score` and `games.away_score`
- Wins/losses/ties calculated automatically
- No manual editing capability currently exists

**For BMHL:**
- This is correct behavior
- No changes needed
- Event sourcing will maintain this (game state derived from events)

---

### Q4: Do you want captains to manage rosters/payments, or admin-only initially?
**Answer:** **Hybrid approach** (based on BMHL needs).

**Phase 1 (P0 for BMHL):**
- Admin: Full control (create invoices, view all payments, send reminders)
- Captain: Read-only view of team payment status + ability to send nudge reminders
- Player: View own balance + "Pay Now" button

**Phase 2 (P1):**
- Captain: Can add/remove players from roster (with admin approval)
- Captain: Can mark players as "paid via cash/check" (admin must approve)

**Implementation:**
- Use existing RBAC system (`league_memberships.role`)
- Add `manage_roster` and `manage_payments` permissions to role config

---

### Q5: For the BMHL demo, do you need real-time live updates (websockets) or is "refresh updates" acceptable?
**Answer:** **Real-time via Supabase Realtime** (already available).

**Current Capability:**
- Supabase Realtime is already set up (`20260125_setup_realtime_and_storage.sql`)
- Public game pages can subscribe to `game_events` table
- Updates appear instantly without refresh

**For BMHL Demo:**
- ✅ USE real-time for scorekeeper → public page updates
- ✅ USE real-time for standings updates
- ❌ DON'T need real-time for schedule changes (email notification is sufficient)

**Implementation:**
- Scorekeeper UI emits events → `game_events` table updated → Realtime broadcasts → public page listens
- No additional infrastructure needed (Supabase handles WebSocket management)

---

## Part 6: Risk Assessment & Non-Goals

### Risks

#### Risk 1: Event Sourcing Complexity
- **Impact:** High
- **Probability:** Medium
- **Mitigation:**
  - Start with simple event types (goal, penalty)
  - Dual-write during migration (events + existing tables)
  - Extensive testing with BMHL seed data
  - Rollback plan (disable event sourcing, revert to direct updates)

#### Risk 2: Conflict Detection False Positives
- **Impact:** Medium
- **Probability:** High
- **Mitigation:**
  - Make conflict warnings dismissible (with reason)
  - Admin can override conflicts
  - Log all conflict detections for tuning
  - BMHL testing will reveal edge cases

#### Risk 3: Notification Delivery Failures
- **Impact:** High (BMHL relies on this for reschedule workflows)
- **Probability:** Low
- **Mitigation:**
  - Use reliable service (Resend for email, Twilio for SMS)
  - Implement retry logic (3 attempts with exponential backoff)
  - Queue notifications (don't block reschedule on email send)
  - Admin can manually resend from notification log

#### Risk 4: BMHL Onboarding Timeline
- **Impact:** Critical (potential first customer)
- **Probability:** Medium
- **Mitigation:**
  - Prioritize P0 features ruthlessly
  - Weekly demo calls with BMHL to validate direction
  - Have demo site ready by Week 4 (even if not feature-complete)
  - Delay P1/P2 features if P0 slips

---

### Non-Goals (What NOT to Build Yet)

#### ❌ Perfect Schedule Generator
- BMHL didn't ask for this
- Manual scheduling + bulk reschedule is sufficient
- Can add in Phase 3 if requested

#### ❌ Full Public CMS
- BMHL only needs league page + game schedule public
- Complex CMS is overkill
- Static pages with league branding is sufficient

#### ❌ Mobile App
- BMHL didn't mention this
- PWA (existing) is sufficient for scorekeepers
- Mobile-responsive web app for captains/players

#### ❌ Deep Hockey Edge Cases
- No coincidental minors
- No misconduct intricacies
- No shootout tracking (yet)
- Focus on 80/20 rule: even strength, PP, PK only

#### ❌ Multi-Season History Imports
- BMHL is new client (no historical data)
- If they request it later, can build migration tool
- Don't over-engineer for hypothetical data imports

#### ❌ Advanced Analytics
- BMHL didn't request this
- Basic standings + player stats is sufficient
- Can add "Insights" dashboard in Phase 3

---

## Part 7: Success Criteria

### BMHL Demo is "successful" if:
1. ✅ Admin can reschedule 35 games in under 5 minutes (bulk wizard)
2. ✅ Conflicts are detected and displayed (team/venue/scorekeeper)
3. ✅ Notifications are sent automatically (captains receive emails)
4. ✅ Scorekeeper can record game sheet with proper hockey logic (PP/PK)
5. ✅ Admin can see "Who Hasn't Paid" report
6. ✅ Captain can view team payment status and nudge players
7. ✅ All admin actions are logged and auditable
8. ✅ Zero data leakage between BMHL tenant and Demo League tenant

### Platform is "BMHL-ready" if:
1. ✅ P0 features (scheduling, notifications, ops console, scorekeeper) are complete
2. ✅ P1 features (payment tracking) are at least 80% complete
3. ✅ Demo site has believable seed data (16 teams, 20 games, 20 users)
4. ✅ All 4 demo flows work end-to-end
5. ✅ Security audit passes (multi-tenant isolation)
6. ✅ Performance is acceptable (<2s page loads, <500ms API responses)

---

## Part 8: Next Steps

### Immediate Actions (This Week)
1. **Prioritize this document** - Share with team for feedback
2. **Create GitHub project board** - Convert this into issues/milestones
3. **Schedule BMHL demo call** - Show current progress, validate priorities
4. **Start Phase 1, Week 1** - Begin scheduling & rescheduling implementation

### Week 1 Kickoff Tasks
1. Create `schedule_rules` table migration
2. Add "postponed" status to games enum
3. Build conflict detection service (TDD approach)
4. Sketch wireframes for reschedule UI (single + bulk)
5. Set up Resend account for email notifications

### Weekly Check-Ins
- **Monday:** Sprint planning (pick tasks from roadmap)
- **Wednesday:** Mid-week sync (blockers, progress)
- **Friday:** Demo + retrospective (show working features)

### Milestone Dates (Target)
- **Week 2 (Feb 12):** Reschedule workflows complete
- **Week 3 (Feb 19):** Notifications system live
- **Week 4 (Feb 26):** Admin ops console functional
- **Week 5 (Mar 5):** Scorekeeper event sourcing complete
- **Week 6 (Mar 12):** BMHL demo site ready
- **Week 8 (Mar 26):** Payments v1 complete
- **Week 9 (Apr 2):** BMHL goes live (soft launch)

---

## Appendix A: Deliverable Outputs (for Claude Code Agents)

### Build Delta Spec (Must/Should/Could Backlog)

#### MUST (P0) - Required for BMHL Demo
- [ ] P0.2: Scheduling v1 (reschedule, bulk reschedule, conflict detection)
- [ ] P0.4: Notifications v1 (event-driven, email, log)
- [ ] P0.5: Admin ops console (inline edit, bulk ops, audit)
- [ ] P0.3: Scorekeeper workflow enhancement (event sourcing, hockey logic)

#### SHOULD (P1) - Strong Demo + Platform Fit
- [ ] P1.1: Payments v1 (invoice tracking, collection dashboard)
- [ ] P1.2: Scorekeeper scheduling (availability, auto-assign)

#### COULD (P2) - Roadmap Only
- [ ] Draft mode enhancements
- [ ] Commissioner "NHL-style" tools
- [ ] Advanced analytics
- [ ] Multi-season history imports

---

### Multi-Tenant Implementation Notes

**Already Implemented:**
- Postgres RLS on all tables
- `league_id` foreign key on all tenant-scoped tables
- Row-level policies verified
- Security audit complete

**For New Tables (game_events, schedule_rules, invoices, notifications):**
- Add `league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE`
- Create RLS policy: `WHERE league_id IN (SELECT league_id FROM league_memberships WHERE user_id = auth.uid())`
- Add index: `CREATE INDEX idx_{table}_league_id ON {table}(league_id)`
- Test with 2 tenants (BMHL + Demo League) to verify zero data leakage

---

### Demo/Test Site Scope (Seed Data Plan)

**See Part 4 above for complete seed data specification.**

Key points:
- 1 tenant (BMHL)
- 2 divisions (A + C)
- 16 teams
- 10 games (mix of scheduled/postponed/cancelled)
- 2 scorekeepers, 4 captains, 20 players
- Payment data (3 paid teams, 5 outstanding, 2 overdue)

---

### Risk & Non-Goals

**See Part 6 above for complete risk assessment and explicit exclusions.**

Key guardrails:
- No perfect schedule generator
- No full CMS
- No mobile app
- No deep hockey edge cases (yet)
- No multi-season imports (yet)

---

## Document Control

**Version:** 1.0
**Author:** System Analysis (based on BMHL conversation + codebase audit)
**Date:** 2026-01-29
**Status:** ✅ Gap Analysis Complete, Ready for Implementation
**Next Review:** 2026-02-05 (after Week 1 progress)

**Distribution:**
- Development team
- BMHL stakeholders (summary only)
- Product roadmap planning

---

**END OF DOCUMENT**
