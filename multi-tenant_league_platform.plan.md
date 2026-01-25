# 🏒 Multi-Tenant League Platform Implementation Plan

**Date:** January 2026
**Goal:** Transform HockeyLifeHL from a single-league platform into a multi-tenant SaaS platform supporting unlimited independent hockey leagues

---

## 📋 EXECUTIVE SUMMARY

This plan outlines the complete transformation of HockeyLifeHL into a multi-tenant platform where:
- Multiple independent hockey leagues can operate simultaneously
- Each league has its own teams, players, seasons, games, and branding
- **Leagues can have 10+ divisions with hierarchical organization (A, B1, B2, C1, etc.)**
- **Support for 75+ teams across multiple divisions per league**
- **Advanced venue management with multiple ice rinks and time slots**
- **AI-powered schedule generation with complex rule constraints**
- **Mid-season division restructuring and team movement**
- Users can belong to multiple leagues with different roles
- League owners manage their own subscriptions and settings
- Data isolation ensures leagues cannot see each other's data

### Why Multi-Tenant?

**Business Benefits:**
- **Scalability:** Support unlimited leagues on the same platform
- **Revenue:** Recurring subscription revenue from each league
- **Network Effects:** More leagues = more users = more value
- **Brand Recognition:** Become the go-to platform for recreational hockey leagues

**Technical Benefits:**
- **Single Codebase:** One application serves all leagues
- **Centralized Updates:** Deploy features to all leagues at once
- **Shared Infrastructure:** Cost-effective scaling
- **Data Isolation:** RLS ensures security between leagues

---

## 🎯 CORE REQUIREMENTS

### 1. Multi-Division Architecture
- Support 10+ divisions per league (A, B1, B2, C1, C2, C3, D1, D2, REC, DRAFT)
- Hierarchical tier system with ordering
- Division-specific scheduling preferences
- Teams can be moved between divisions mid-season
- Divisional and interdivisional game tracking
- Division-aware standings and playoffs

### 2. Advanced Venue & Scheduling
- Multiple venues (ice rinks) per league
- Multi-surface facilities (Rink 1, Rink 2, etc.)
- Granular time slot management (day, time, duration)
- Division restrictions per time slot
- Visual venue calendar management
- Location details and mapping integration

### 3. AI-Powered Schedule Generation
- Constraint Satisfaction Problem (CSP) algorithm
- Support for complex scheduling rules:
  - Division time constraints ("B Div plays Tues/Thurs 9-11pm")
  - Venue restrictions by division
  - Team blackout dates
  - Minimum rest periods
  - Maximum games per week
  - Home/away balance
- Hard vs soft constraint satisfaction
- Schedule optimization for 500+ games
- Impact analysis and conflict detection

### 4. Division Restructuring
- Mid-season team movement between divisions
- Impact analysis (standings, schedule, affected games)
- Automatic schedule regeneration
- Audit trail for all changes
- Notifications to affected teams
- Preserve completed games, regenerate future games

### 5. League Isolation
- Each league operates independently
- Teams, seasons, games are scoped to a league
- Users can join multiple leagues
- Data is completely isolated via RLS

### 6. Multi-Tenant Routing
- **Subdomain-based routing:** `winter-warriors.hockeylifehl.app`
- League detection from subdomain/domain
- Optional custom domain support
- Fallback to path-based routing: `/leagues/winter-warriors`

### 7. League Branding
- Custom logos, colors, taglines
- League-specific email templates
- Personalized landing pages
- White-label option (Enterprise tier)

### 8. Subscription Management
- Tiered pricing (Free, Basic, Pro, Enterprise)
- Stripe subscription per league
- Usage limits enforcement
- Trial period support

### 9. User League Memberships
- Users can join multiple leagues
- Different roles per league (Owner in one, Player in another)
- League switcher in UI
- Invitation system for new members

### 10. Data Migration
- Migrate existing HockeyLifeHL data to first league
- Zero downtime migration
- Backwards compatibility during transition

---

## 🏗️ ARCHITECTURE DESIGN

### Multi-Tenancy Pattern: **Shared Database, Isolated Data**

**Architecture Choice:**
- **Single Database:** All leagues share the same PostgreSQL database
- **Data Isolation:** `league_id` column on all tenant-scoped tables
- **Row-Level Security:** Supabase RLS enforces data isolation
- **Shared Tables:** Global tables (profiles, league_memberships)
- **Tenant Tables:** League-specific tables (teams, seasons, games)

**Why This Pattern?**
- ✅ Cost-effective (one database)
- ✅ Easy to maintain and update
- ✅ Strong isolation via RLS
- ✅ Cross-league queries possible (for admins)
- ✅ Simpler backup/restore

**Alternatives Considered:**
- ❌ Database-per-tenant: Too expensive, complex to manage
- ❌ Schema-per-tenant: Connection pooling issues, migration complexity

---

## 📊 DATABASE SCHEMA CHANGES

### New Tables

#### 1. `divisions` Table (League Organization)

```sql
CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Division Info
  name TEXT NOT NULL, -- "A", "B1", "B2", "C1", "REC", "DRAFT"
  full_name TEXT, -- "Division A", "B1 Division"
  tier TEXT, -- "A", "B", "C", "D", "REC", "DRAFT" (for hierarchical grouping)
  tier_order INTEGER, -- 1 for A, 2 for B1, 3 for B2, etc. (for sorting)

  -- Division Rules
  skill_level TEXT, -- "Advanced", "Intermediate", "Beginner", "Recreational"
  min_age INTEGER,
  max_age INTEGER,
  description TEXT,

  -- Scheduling Preferences
  preferred_days JSONB DEFAULT '[]', -- ["Tuesday", "Thursday"]
  preferred_times JSONB DEFAULT '[]', -- [{"start": "21:00", "end": "23:00"}]
  blackout_dates JSONB DEFAULT '[]', -- ["2025-12-25", "2025-01-01"]

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

  -- Metadata
  color TEXT DEFAULT '#E31837', -- For UI differentiation
  icon TEXT, -- Optional icon/emoji

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_id, name),
  UNIQUE(league_id, tier_order)
);

-- Indexes
CREATE INDEX idx_divisions_league_id ON divisions(league_id);
CREATE INDEX idx_divisions_tier_order ON divisions(league_id, tier_order);
CREATE INDEX idx_divisions_status ON divisions(league_id, status);

COMMENT ON TABLE divisions IS 'Divisions/tiers within a league (A, B1, B2, C1, etc.)';
COMMENT ON COLUMN divisions.tier_order IS 'Defines division hierarchy - lower numbers are higher skill';
```

---

#### 2. `venues` Table (Ice Rinks & Facilities)

```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Venue Info
  name TEXT NOT NULL, -- "Sunnybrook Arena", "Canlan Ice Sports"
  short_name TEXT, -- "Sunnybrook", "Canlan"

  -- Location
  address TEXT,
  city TEXT,
  province_state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Canada',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Facilities
  num_ice_surfaces INTEGER DEFAULT 1, -- Multiple rinks at one location
  surface_names JSONB DEFAULT '[]', -- ["Rink 1", "Rink 2", "Main Pad"]
  locker_rooms INTEGER,
  parking_capacity INTEGER,
  accessibility_features JSONB DEFAULT '[]', -- ["Wheelchair accessible", "Elevator"]

  -- Contact
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  website_url TEXT,

  -- Amenities
  pro_shop BOOLEAN DEFAULT FALSE,
  concession BOOLEAN DEFAULT FALSE,
  viewing_area BOOLEAN DEFAULT TRUE,
  wifi BOOLEAN DEFAULT FALSE,

  -- Notes
  notes TEXT,
  directions TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_venues_league_id ON venues(league_id);
CREATE INDEX idx_venues_status ON venues(league_id, status);

COMMENT ON TABLE venues IS 'Ice rinks and facilities where games are played';
```

---

#### 3. `venue_time_slots` Table (Available Ice Times)

```sql
CREATE TABLE venue_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Time Slot Info
  surface_name TEXT, -- "Rink 1", "Main Pad" (which surface if multi-pad)
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Availability Window
  effective_from DATE, -- When this slot becomes available
  effective_until DATE, -- When this slot expires (null = indefinite)

  -- Restrictions
  division_ids JSONB DEFAULT '[]', -- Only these divisions can use this slot (empty = any)
  max_games_per_slot INTEGER DEFAULT 1, -- Some slots can have multiple games

  -- Cost (optional)
  cost_per_hour DECIMAL(10, 2),

  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked', 'maintenance')),

  -- Priority (for AI scheduling)
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_venue_time_slots_venue ON venue_time_slots(venue_id);
CREATE INDEX idx_venue_time_slots_league ON venue_time_slots(league_id);
CREATE INDEX idx_venue_time_slots_day ON venue_time_slots(day_of_week);
CREATE INDEX idx_venue_time_slots_status ON venue_time_slots(status);

COMMENT ON TABLE venue_time_slots IS 'Available ice time slots for each venue';
COMMENT ON COLUMN venue_time_slots.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
```

---

#### 4. `scheduling_rules` Table (Advanced Scheduling Constraints)

```sql
CREATE TABLE scheduling_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Rule Info
  name TEXT NOT NULL, -- "B Division Tuesday Rule", "No Early Morning Games"
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'division_time_constraint',
    'team_blackout',
    'venue_restriction',
    'rivalry_game',
    'minimum_rest_days',
    'max_games_per_week',
    'balanced_home_away',
    'custom'
  )),

  -- Rule Scope
  applies_to_divisions JSONB DEFAULT '[]', -- Division IDs this rule applies to
  applies_to_teams JSONB DEFAULT '[]', -- Team IDs (for team-specific rules)
  applies_to_venues JSONB DEFAULT '[]', -- Venue IDs

  -- Rule Configuration
  rule_config JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- Division time constraint: {"days": [2], "start_time": "21:00", "end_time": "23:00"}
  -- Minimum rest: {"min_days": 2}
  -- Max games per week: {"max_games": 2}
  -- Rivalry game: {"team_pairs": [["team1_id", "team2_id"]], "min_games": 2}

  -- Priority & Enforcement
  priority INTEGER DEFAULT 5, -- 1=must enforce, 10=nice to have
  is_hard_constraint BOOLEAN DEFAULT TRUE, -- True = must satisfy, False = optimize for

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scheduling_rules_league ON scheduling_rules(league_id);
CREATE INDEX idx_scheduling_rules_type ON scheduling_rules(rule_type);
CREATE INDEX idx_scheduling_rules_status ON scheduling_rules(league_id, status);

COMMENT ON TABLE scheduling_rules IS 'Advanced scheduling rules and constraints for AI schedule generation';
COMMENT ON COLUMN scheduling_rules.is_hard_constraint IS 'If true, schedule generation must satisfy this rule. If false, AI will optimize for it but can violate if needed.';
```

---

#### 5. `division_restructuring_log` Table (Audit Trail for Division Changes)

```sql
CREATE TABLE division_restructuring_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,

  -- Change Details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'team_moved',
    'division_created',
    'division_deleted',
    'division_renamed',
    'schedule_regenerated'
  )),

  -- Affected Entities
  team_id UUID REFERENCES teams(id),
  from_division_id UUID REFERENCES divisions(id),
  to_division_id UUID REFERENCES divisions(id),

  -- Context
  reason TEXT, -- "Team performing below division level"
  notes TEXT,
  affected_games_count INTEGER, -- How many games were affected

  -- Who made the change
  performed_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_division_restructuring_league ON division_restructuring_log(league_id);
CREATE INDEX idx_division_restructuring_season ON division_restructuring_log(season_id);
CREATE INDEX idx_division_restructuring_team ON division_restructuring_log(team_id);

COMMENT ON TABLE division_restructuring_log IS 'Audit trail for division changes and team movements';
```

---

#### 6. `leagues` Table (Core Multi-Tenancy)

```sql
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- URL-friendly: "winter-warriors"
  subdomain TEXT UNIQUE, -- "winter-warriors" for winter-warriors.hockeylifehl.app
  custom_domain TEXT UNIQUE, -- Optional: "winterwarriorshockey.com"

  -- Branding
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#E31837',
  secondary_color TEXT DEFAULT '#FFFFFF',
  tagline TEXT DEFAULT 'For Fun, For Beers, For Glory',

  -- Settings
  timezone TEXT DEFAULT 'America/Toronto',
  currency TEXT DEFAULT 'CAD',
  default_games_per_cycle INTEGER DEFAULT 13,

  -- Contact & Social
  owner_id UUID REFERENCES profiles(id),
  contact_email TEXT,
  website_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,

  -- Subscription
  subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'free', 'basic', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'suspended')),
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Usage Limits (based on tier)
  max_seasons INTEGER,
  max_players INTEGER,
  max_teams INTEGER,
  features JSONB DEFAULT '{}', -- {"ai_articles": true, "custom_domain": false}

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  archived_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leagues_slug ON leagues(slug);
CREATE INDEX idx_leagues_subdomain ON leagues(subdomain);
CREATE INDEX idx_leagues_custom_domain ON leagues(custom_domain);
CREATE INDEX idx_leagues_owner ON leagues(owner_id);
CREATE INDEX idx_leagues_status ON leagues(status);
```

#### 2. `league_memberships` Table (User-League Relationships)

```sql
CREATE TABLE league_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role in this specific league
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'captain', 'player')),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive', 'banned')),
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Custom fields per league

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_id, user_id)
);

-- Indexes
CREATE INDEX idx_league_memberships_league ON league_memberships(league_id);
CREATE INDEX idx_league_memberships_user ON league_memberships(user_id);
CREATE INDEX idx_league_memberships_status ON league_memberships(league_id, status);
```

#### 3. `league_invitations` Table (Invite System)

```sql
CREATE TABLE league_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Invitee
  email TEXT NOT NULL,
  invited_user_id UUID REFERENCES profiles(id), -- If user exists

  -- Invitation Details
  role TEXT NOT NULL CHECK (role IN ('admin', 'captain', 'player')),
  invited_by UUID NOT NULL REFERENCES profiles(id),

  -- Token & Expiry
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  accepted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_league_invitations_token ON league_invitations(token);
CREATE INDEX idx_league_invitations_email ON league_invitations(email);
CREATE INDEX idx_league_invitations_league ON league_invitations(league_id);
```

#### 4. `league_settings` Table (Custom Settings per League)

```sql
CREATE TABLE league_settings (
  league_id UUID PRIMARY KEY REFERENCES leagues(id) ON DELETE CASCADE,

  -- Email Settings
  email_from_name TEXT,
  email_reply_to TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password_encrypted TEXT,

  -- Payment Settings
  stripe_account_id TEXT, -- For Stripe Connect (league-specific payments)
  payment_enabled BOOLEAN DEFAULT FALSE,
  default_season_fee DECIMAL(10,2),

  -- Feature Flags
  enable_ai_articles BOOLEAN DEFAULT FALSE,
  enable_draft_system BOOLEAN DEFAULT TRUE,
  enable_payments BOOLEAN DEFAULT FALSE,
  enable_suspensions BOOLEAN DEFAULT TRUE,
  enable_public_stats BOOLEAN DEFAULT TRUE,

  -- Custom Settings (JSONB for flexibility)
  custom_settings JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Modify Existing Tables (Add `league_id` and Division Support)

#### Tables That Need `league_id` and Division References:

```sql
-- Teams (add league_id AND division_id)
ALTER TABLE teams ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;
ALTER TABLE teams ADD COLUMN tier_level TEXT; -- "A", "B", "C" for quick filtering
CREATE INDEX idx_teams_league_id ON teams(league_id);
CREATE INDEX idx_teams_division_id ON teams(division_id);
CREATE INDEX idx_teams_league_division ON teams(league_id, division_id);

-- Seasons
ALTER TABLE seasons ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_seasons_league_id ON seasons(league_id);

-- Games (add league_id, venue reference, and division context)
ALTER TABLE games ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
ALTER TABLE games ADD COLUMN venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;
ALTER TABLE games ADD COLUMN surface_name TEXT; -- Which rink/surface at the venue
ALTER TABLE games ADD COLUMN division_id UUID REFERENCES divisions(id) ON DELETE SET NULL; -- For divisional games
ALTER TABLE games ADD COLUMN is_interdivisional BOOLEAN DEFAULT FALSE; -- Cross-division game
CREATE INDEX idx_games_league_id ON games(league_id);
CREATE INDEX idx_games_venue_id ON games(venue_id);
CREATE INDEX idx_games_division_id ON games(division_id);

-- Team Rosters
ALTER TABLE team_rosters ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_team_rosters_league_id ON team_rosters(league_id);

-- Player Stats
ALTER TABLE player_stats ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_player_stats_league_id ON player_stats(league_id);

-- Goalie Stats
ALTER TABLE goalie_stats ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_goalie_stats_league_id ON goalie_stats(league_id);

-- Articles
ALTER TABLE articles ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_articles_league_id ON articles(league_id);

-- Drafts
ALTER TABLE drafts ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_drafts_league_id ON drafts(league_id);

-- Draft Picks
ALTER TABLE draft_picks ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_draft_picks_league_id ON draft_picks(league_id);

-- Draft Order
ALTER TABLE draft_order ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_draft_order_league_id ON draft_order(league_id);

-- Player Ratings
ALTER TABLE player_ratings ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_player_ratings_league_id ON player_ratings(league_id);

-- Suspensions
ALTER TABLE suspensions ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_suspensions_league_id ON suspensions(league_id);

-- Season Opt-Ins
ALTER TABLE season_opt_ins ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_season_opt_ins_league_id ON season_opt_ins(league_id);

-- Player Availability
ALTER TABLE player_availability ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_player_availability_league_id ON player_availability(league_id);

-- Team Messages
ALTER TABLE team_messages ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_team_messages_league_id ON team_messages(league_id);

-- Stat Disputes
ALTER TABLE stat_disputes ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_stat_disputes_league_id ON stat_disputes(league_id);

-- Payments
ALTER TABLE payments ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_payments_league_id ON payments(league_id);

-- Email Drafts
ALTER TABLE email_drafts ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_email_drafts_league_id ON email_drafts(league_id);
```

---

### Row-Level Security (RLS) Policies

**Core Principle:** Users can only access data from leagues they're members of.

```sql
-- Example: Teams table RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Allow users to view teams from leagues they're members of
CREATE POLICY "Users can view teams from their leagues"
  ON teams FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Allow league owners/admins to manage teams
CREATE POLICY "League owners/admins can manage teams"
  ON teams FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Repeat similar policies for all league-scoped tables
```

**RLS Policies Needed For Each Table:**
1. SELECT: Members can view
2. INSERT: Owners/admins can create
3. UPDATE: Owners/admins can modify
4. DELETE: Owners can delete

---

## 🎯 ADVANCED MULTI-DIVISION ARCHITECTURE

### Division Hierarchy System

**Design Philosophy:**
- Support 10+ divisions per league (A, B1, B2, C1, C2, C3, D1, D2, REC, DRAFT)
- Hierarchical tier system (A > B > C > D > REC > DRAFT)
- Flexible division naming and reorganization
- Mid-season team movement between divisions
- Division-specific scheduling rules

**Division Tier Ordering:**
```typescript
// Division hierarchy configuration
const DIVISION_TIERS = {
  A: { order: 1, skillLevel: 'Elite' },
  B1: { order: 2, skillLevel: 'Advanced' },
  B2: { order: 3, skillLevel: 'Advanced' },
  C1: { order: 4, skillLevel: 'Intermediate' },
  C2: { order: 5, skillLevel: 'Intermediate' },
  C3: { order: 6, skillLevel: 'Intermediate' },
  D1: { order: 7, skillLevel: 'Beginner' },
  D2: { order: 8, skillLevel: 'Beginner' },
  REC: { order: 9, skillLevel: 'Recreational' },
  DRAFT: { order: 10, skillLevel: 'Draft Pool' },
};
```

### Venue & Ice Time Management

**Multi-Venue Support:**
- Leagues can have 1-20+ ice rinks
- Each venue can have multiple surfaces (Pad 1, Pad 2, etc.)
- Each surface has its own availability calendar
- Location details for mapping/directions

**Time Slot Matrix:**
```
Example: Sunnybrook Arena
- Rink 1:
  - Monday: 21:00-23:00 (B Division only)
  - Tuesday: 21:00-23:00 (B Division only)
  - Wednesday: 19:00-21:00 (Any division)
  - Thursday: 21:00-23:00 (C Division preferred)

- Rink 2:
  - Monday: 18:00-20:00 (A Division only)
  - Friday: 22:00-00:00 (D Division, REC)
```

### Advanced Scheduling Rules

**Rule Types:**

1. **Division Time Constraints**
   - "B Division only plays Tuesdays/Thursdays 9-11pm"
   - "A Division has priority for prime time slots"
   - "REC Division plays weekends only"

2. **Team-Specific Rules**
   - Team blackout dates (vacations, conflicts)
   - Preferred home venue
   - Maximum travel distance
   - Minimum rest days between games

3. **Venue Restrictions**
   - Certain divisions can only use certain venues
   - Surface-specific requirements
   - Maintenance blackout periods

4. **Competitive Balance**
   - Minimum games against division rivals
   - Maximum games per week
   - Balanced home/away split
   - Ensure teams play each other at least once

5. **Rivalry & Special Games**
   - Force specific matchups (rivalries)
   - Guarantee division championship games
   - Playoff seeding considerations

**Example Rules Configuration:**
```typescript
const exampleRules = [
  {
    name: "B Division Tuesday/Thursday Rule",
    type: "division_time_constraint",
    applies_to_divisions: ["b1_id", "b2_id"],
    config: {
      days: [2, 4], // Tuesday, Thursday
      start_time: "21:00",
      end_time: "23:00",
      venues: ["sunnybrook_id", "canlan_id"]
    },
    is_hard_constraint: true,
    priority: 1
  },
  {
    name: "Minimum 2 Days Rest",
    type: "minimum_rest_days",
    applies_to_divisions: ["all"],
    config: {
      min_days: 2
    },
    is_hard_constraint: true,
    priority: 1
  },
  {
    name: "A Division Prime Time Priority",
    type: "venue_restriction",
    applies_to_divisions: ["a_id"],
    config: {
      preferred_times: ["18:00-20:00", "19:00-21:00"],
      priority: 1
    },
    is_hard_constraint: false,
    priority: 3
  }
];
```

### AI-Powered Schedule Generation

**Algorithm Approach:**
- **Constraint Satisfaction Problem (CSP)** with optimization
- **Two-Phase Generation:**
  1. Phase 1: Satisfy all hard constraints
  2. Phase 2: Optimize for soft constraints

**Input to AI:**
```json
{
  "divisions": [
    {"id": "a_id", "name": "A", "teams": 8, "tier_order": 1},
    {"id": "b1_id", "name": "B1", "teams": 10, "tier_order": 2},
    // ... 8 more divisions
  ],
  "venues": [
    {
      "id": "sunnybrook_id",
      "name": "Sunnybrook Arena",
      "time_slots": [
        {"day": 2, "start": "21:00", "end": "23:00", "surface": "Rink 1"},
        // ... 50+ more slots
      ]
    }
  ],
  "rules": [
    // All scheduling rules
  ],
  "constraints": {
    "games_per_team": 13,
    "season_start": "2025-09-01",
    "season_end": "2026-03-31",
    "min_games_vs_division_teams": 8, // 8 games within division
    "max_games_vs_interdivisional": 5 // 5 cross-division games
  }
}
```

**AI Output:**
```json
{
  "schedule": [
    {
      "game_id": "g1",
      "home_team": "team1",
      "away_team": "team2",
      "venue": "sunnybrook_id",
      "surface": "Rink 1",
      "date": "2025-09-08",
      "time": "21:00",
      "division": "b1_id",
      "is_interdivisional": false
    },
    // ... 487+ games
  ],
  "stats": {
    "total_games": 487,
    "divisional_games": 390,
    "interdivisional_games": 97,
    "constraints_satisfied": 45,
    "constraints_violated": 0,
    "optimization_score": 0.94
  },
  "warnings": [
    "Team 42 has 3 back-to-back weekends (unavoidable)"
  ]
}
```

### Division Restructuring System

**Mid-Season Team Movement:**

**Use Cases:**
- Team too strong for current division → Move up
- Team struggling badly → Move down for better competition
- Team request for competitive balance
- League expansion/contraction

**Workflow:**
1. Admin identifies team for movement
2. System shows impact analysis:
   - Games already played in current division
   - Games scheduled against new division opponents
   - Standings impact
   - Schedule regeneration requirements

3. Admin confirms movement
4. System handles:
   - Update team's division_id
   - Log the change (audit trail)
   - Optionally regenerate remaining schedule
   - Update standings calculations
   - Notify affected teams

**Impact Analysis Example:**
```typescript
{
  "team": "Thunder",
  "current_division": "B2",
  "proposed_division": "B1",
  "analysis": {
    "games_played_b2": 6,
    "games_remaining_b2": 7,
    "standings_impact": {
      "current_rank": 1, // 1st in B2
      "projected_rank_b1": 8 // Projected 8th in B1
    },
    "schedule_impact": {
      "games_to_cancel": 7,
      "games_to_create": 7,
      "affected_teams": ["Team A", "Team B", ...]
    },
    "recommendations": "Move team at end of cycle (2 weeks) to minimize disruption"
  }
}
```

---

## 🔄 ROUTING ARCHITECTURE

### Subdomain-Based Routing (Primary Method)

**Domain Structure:**
- `hockeylifehl.app` → Platform landing page
- `winter-warriors.hockeylifehl.app` → Winter Warriors League
- `beer-league.hockeylifehl.app` → Beer League Hockey
- `www.winterwarriorshockey.com` → Custom domain (Enterprise)

**Next.js Middleware Implementation:**

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Extract subdomain
  const subdomain = getSubdomain(hostname);

  if (!subdomain || subdomain === 'www') {
    // Main platform site
    return NextResponse.next();
  }

  // League-specific subdomain
  // Look up league by subdomain
  const league = await getLeagueBySubdomain(subdomain);

  if (!league) {
    // League not found, redirect to 404
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // Set league context in headers
  const response = NextResponse.next();
  response.headers.set('x-league-id', league.id);
  response.headers.set('x-league-slug', league.slug);

  return response;
}

function getSubdomain(hostname: string): string | null {
  // hockeylifehl.app → null
  // winter-warriors.hockeylifehl.app → winter-warriors
  // localhost:3000 → null (dev mode)

  const parts = hostname.split('.');
  if (parts.length < 3) return null;
  return parts[0];
}
```

**League Context Provider:**

```typescript
// src/contexts/LeagueContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface League {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  tagline: string;
}

interface LeagueContextType {
  currentLeague: League | null;
  setCurrentLeague: (league: League) => void;
  userLeagues: League[];
  isLoading: boolean;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [currentLeague, setCurrentLeague] = useState<League | null>(null);
  const [userLeagues, setUserLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Detect league from subdomain/path
    // Load user's leagues
    // Set current league
    loadLeagueContext();
  }, []);

  return (
    <LeagueContext.Provider value={{ currentLeague, setCurrentLeague, userLeagues, isLoading }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeague must be used within LeagueProvider');
  }
  return context;
}
```

---

## 💰 SUBSCRIPTION TIERS & PRICING

### Tier Structure

| Feature | Trial | Free | Basic | Pro | Enterprise |
|---------|-------|------|-------|-----|------------|
| **Price** | $0 | $0 | $49/mo | $149/mo | Custom |
| **Duration** | 30 days | Forever | Monthly | Monthly | Annual |
| **Seasons** | 1 | 2 | Unlimited | Unlimited | Unlimited |
| **Players** | 50 | 100 | 300 | Unlimited | Unlimited |
| **Teams** | 6 | 8 | 30 | Unlimited | Unlimited |
| **Divisions** | 1 | 2 | 5 | Unlimited | Unlimited |
| **Venues** | 1 | 2 | 5 | Unlimited | Unlimited |
| **Scheduling Rules** | 5 | 10 | 25 | Unlimited | Unlimited |
| **AI Articles** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Custom Branding** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Payment Collection** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Email Notifications** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Draft System** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Stats & Standings** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Mobile PWA** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Custom Domain** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **White Label** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Dedicated Support** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **SLA** | ❌ | ❌ | ❌ | ❌ | ✅ |

### Usage Limits Enforcement

```typescript
// src/lib/leagues/limits.ts
export async function checkLeagueLimit(
  leagueId: string,
  resource: 'seasons' | 'players' | 'teams'
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const league = await getLeague(leagueId);

  const limits = {
    trial: { seasons: 1, players: 50, teams: 6 },
    free: { seasons: 2, players: 100, teams: 8 },
    basic: { seasons: 999, players: 300, teams: 16 },
    pro: { seasons: 999, players: 999999, teams: 999 },
    enterprise: { seasons: 999999, players: 999999, teams: 999999 },
  };

  const limit = limits[league.subscription_tier][resource];
  const current = await getResourceCount(leagueId, resource);

  return {
    allowed: current < limit,
    limit,
    current,
  };
}
```

---

## 🛠️ IMPLEMENTATION TASKS

### PHASE 0: Division & Venue Infrastructure (Week 1-3)

#### Task 0.1: Create Division System Tables
**Description:** Create `divisions`, `venues`, `venue_time_slots`, `scheduling_rules`, `division_restructuring_log` tables

**Success Criteria:**
- All division/venue tables created with proper constraints
- Indexes created for performance
- Foreign key relationships established
- Sample division hierarchy created

**Migration File:** `supabase/migrations/000_create_division_venue_tables.sql`

---

#### Task 0.2: Create Venue Management System
**Description:** Build admin UI for managing venues and ice times

**Files:**
- `src/app/(dashboard)/admin/venues/page.tsx` (NEW)
- `src/app/(dashboard)/admin/venues/[venueId]/time-slots/page.tsx` (NEW)
- `src/lib/venues/actions.ts` (NEW)
- `src/components/venues/VenueForm.tsx` (NEW)
- `src/components/venues/TimeSlotCalendar.tsx` (NEW)

**Features:**
- Add/edit/delete venues
- Manage multiple ice surfaces per venue
- Configure time slots with day/time/duration
- Set division restrictions per time slot
- Bulk import time slots (CSV/Excel)
- Visual calendar view of availability
- Google Maps integration for venue locations

**Success Criteria:**
- Admin can create venues with full details
- Time slot calendar displays correctly
- Division restrictions are enforced
- Bulk import works for 100+ time slots

---

#### Task 0.3: Create Division Management System
**Description:** Build admin UI for managing league divisions

**Files:**
- `src/app/(dashboard)/admin/divisions/page.tsx` (NEW)
- `src/lib/divisions/actions.ts` (NEW)
- `src/components/divisions/DivisionHierarchy.tsx` (NEW)
- `src/components/divisions/DivisionForm.tsx` (NEW)

**Features:**
- Create/edit/delete divisions
- Define division hierarchy (tier ordering)
- Set division colors/icons for UI
- Configure division-specific preferences
- Drag-and-drop to reorder divisions
- Preview standings by division

**Success Criteria:**
- Admin can create 10+ divisions
- Hierarchy is visually clear
- Divisions can be reordered
- Teams can be assigned to divisions

---

#### Task 0.4: Create Scheduling Rules Engine
**Description:** Build flexible rule system for scheduling constraints

**Files:**
- `src/app/(dashboard)/admin/scheduling-rules/page.tsx` (NEW)
- `src/lib/scheduling/rules-engine.ts` (NEW)
- `src/lib/scheduling/rule-validator.ts` (NEW)
- `src/components/scheduling/RuleBuilder.tsx` (NEW)

**Features:**
- Visual rule builder (no-code interface)
- Pre-built rule templates
- Rule priority management
- Hard vs soft constraint toggle
- Rule conflict detection
- Test rule against existing schedule

**Rule Templates:**
- "Division X plays only on days Y at times Z"
- "Minimum N days between games for all teams"
- "Maximum M games per week"
- "Team blackout dates"
- "Venue restrictions by division"
- "Home/away balance"

**Success Criteria:**
- Admin can create 20+ rules
- Rule conflicts are detected
- Rules are persisted correctly
- Rule engine validates schedules

---

#### Task 0.5: Build AI Schedule Generator (Core Algorithm)
**Description:** Implement advanced constraint-satisfaction algorithm

**Files:**
- `src/lib/scheduling/ai-generator.ts` (NEW)
- `src/lib/scheduling/constraint-solver.ts` (NEW)
- `src/lib/scheduling/optimizer.ts` (NEW)

**Algorithm Phases:**

**Phase 1: Constraint Collection**
```typescript
async function collectConstraints(leagueId: string) {
  // Gather all inputs:
  // - Divisions & teams
  // - Venues & time slots
  // - Scheduling rules
  // - Season parameters

  return {
    divisions: [...],
    venues: [...],
    rules: [...],
    metadata: {...}
  };
}
```

**Phase 2: Hard Constraint Satisfaction**
```typescript
async function satisfyHardConstraints(constraints) {
  // Use CSP algorithm to satisfy all hard constraints:
  // - Division time requirements
  // - Venue availability
  // - Team blackouts
  // - Minimum rest periods

  // Returns: Partial schedule or error if unsatisfiable
}
```

**Phase 3: Soft Constraint Optimization**
```typescript
async function optimizeSchedule(partialSchedule, softConstraints) {
  // Optimize for:
  // - Home/away balance
  // - Minimize back-to-back games
  // - Maximize prime time usage for top divisions
  // - Travel distance minimization

  // Use genetic algorithm or simulated annealing
}
```

**Phase 4: Schedule Output**
```typescript
async function generateFinalSchedule(optimizedSchedule) {
  // Format output
  // Calculate statistics
  // Validate completeness
  // Return games to insert
}
```

**Success Criteria:**
- Generates schedule for 75 teams across 10 divisions
- Satisfies all hard constraints
- Optimizes soft constraints (>80% satisfaction)
- Completes in <30 seconds for 500 games
- Handles edge cases gracefully

---

### PHASE 1: Database Migration (Week 4-5)

#### Task 1.1: Create Multi-Tenant Tables
**Description:** Create `leagues`, `league_memberships`, `league_invitations`, `league_settings` tables

**Success Criteria:**
- All new tables created with proper constraints
- Indexes created for performance
- RLS policies defined

**Migration File:** `supabase/migrations/001_add_multi_tenant_tables.sql`

```sql
-- See "New Tables" section above
```

---

#### Task 1.2: Add league_id to Existing Tables
**Description:** Add `league_id` column to all tenant-scoped tables

**Success Criteria:**
- `league_id` added to 20+ tables
- Foreign key constraints added
- Indexes created
- NOT NULL constraint deferred until migration complete

**Migration File:** `supabase/migrations/002_add_league_id_columns.sql`

```sql
-- See "Modify Existing Tables" section above
```

---

#### Task 1.3: Migrate Existing Data
**Description:** Create default "HockeyLifeHL" league and assign all existing data to it

**Success Criteria:**
- Default league created with existing branding
- All existing data assigned to default league
- All existing users added to league_memberships
- Owner role assigned to current owner

**Migration File:** `supabase/migrations/003_migrate_existing_data.sql`

```sql
-- Create default league
INSERT INTO leagues (
  id,
  name,
  slug,
  subdomain,
  tagline,
  owner_id,
  subscription_tier,
  subscription_status
) VALUES (
  'default-league-uuid', -- Fixed UUID for consistency
  'HockeyLifeHL',
  'hockeylifehl',
  'hockeylifehl',
  'For Fun, For Beers, For Glory',
  (SELECT id FROM profiles WHERE role = 'owner' LIMIT 1),
  'enterprise', -- Grandfather in as enterprise
  'active'
);

-- Assign all existing data to default league
UPDATE teams SET league_id = 'default-league-uuid';
UPDATE seasons SET league_id = 'default-league-uuid';
UPDATE games SET league_id = 'default-league-uuid';
-- ... etc for all tables

-- Create league memberships for all existing users
INSERT INTO league_memberships (league_id, user_id, role, status)
SELECT
  'default-league-uuid',
  id,
  role,
  'active'
FROM profiles;

-- Make league_id NOT NULL after migration
ALTER TABLE teams ALTER COLUMN league_id SET NOT NULL;
-- ... etc for all tables
```

---

#### Task 1.4: Update RLS Policies
**Description:** Update all RLS policies to enforce league-based data isolation

**Success Criteria:**
- All tables have league-scoped RLS policies
- Users can only see data from their leagues
- Owners/admins can manage their league's data
- Super admin can see all leagues (optional)

**Migration File:** `supabase/migrations/004_update_rls_policies.sql`

```sql
-- Drop existing RLS policies
DROP POLICY IF EXISTS ... -- all existing policies

-- Create new league-scoped policies
-- See "Row-Level Security" section above
```

---

### PHASE 2: Division Restructuring & Team Management (Week 6-7)

#### Task 2.1: Team Movement System
**Description:** Allow admins to move teams between divisions mid-season

**Files:**
- `src/app/(dashboard)/admin/teams/[teamId]/move-division/page.tsx` (NEW)
- `src/lib/divisions/team-movement.ts` (NEW)
- `src/components/divisions/TeamMovementWizard.tsx` (NEW)
- `src/components/divisions/MovementImpactAnalysis.tsx` (NEW)

**Features:**
- **Impact Analysis Dashboard:**
  - Current division standings
  - Games played/remaining in current division
  - Projected standings in new division
  - Schedule conflicts
  - Affected teams/games

- **Movement Options:**
  - Immediate move (reschedule remaining games)
  - End-of-cycle move (wait for natural break)
  - Conditional move (if team wins/loses next N games)

- **Schedule Regeneration:**
  - Identify games to cancel
  - Generate replacement games in new division
  - Notify affected teams
  - Update standings calculations

**Workflow:**
```
1. Admin selects team → "Move Division"
2. System shows impact analysis
3. Admin selects target division
4. System calculates schedule changes
5. Admin reviews and confirms
6. System executes:
   - Updates team.division_id
   - Logs to division_restructuring_log
   - Cancels old games
   - Creates new games
   - Sends notifications
7. Success confirmation
```

**Success Criteria:**
- Impact analysis is accurate
- Schedule regeneration maintains balance
- Audit log captures all changes
- No data loss during movement
- Affected teams are notified

---

#### Task 2.2: Division-Aware Standings
**Description:** Update standings to support divisional views

**Files:**
- `src/lib/stats/divisional-standings.ts` (NEW)
- `src/app/(public)/standings/page.tsx` (MODIFY)
- `src/components/standings/DivisionTabs.tsx` (NEW)
- `src/components/standings/DivisionalStandingsTable.tsx` (NEW)

**Features:**
- Tab-based division navigation
- League-wide standings (all divisions)
- Per-division standings
- Cross-division comparison
- Playoff qualification indicators
- Division leaders highlighted

**Success Criteria:**
- Standings calculate correctly per division
- Division tabs work smoothly
- Playoff qualification logic is accurate
- Performance is good with 75 teams

---

#### Task 2.3: Division-Aware Schedule Display
**Description:** Update schedule views to filter by division

**Files:**
- `src/app/(public)/schedule/page.tsx` (MODIFY)
- `src/components/schedule/DivisionFilter.tsx` (NEW)
- `src/components/schedule/VenueFilter.tsx` (NEW)

**Features:**
- Filter by division
- Filter by venue
- Filter by date range
- Show interdivisional games
- Venue/location on each game

**Success Criteria:**
- Filters work correctly
- Performance with 500+ games
- Mobile-responsive

---

### PHASE 3: Application Core Updates (Week 8-9)

#### Task 3.1: Create League Context & Provider
**Description:** Implement league context for React components

**Files:**
- `src/contexts/LeagueContext.tsx` (NEW)
- `src/app/layout.tsx` (MODIFY - add provider)
- `src/hooks/useLeague.ts` (NEW)

**Success Criteria:**
- League context available throughout app
- Current league accessible via hook
- League loaded from subdomain/header
- User's leagues list available

---

#### Task 3.2: Update Middleware for Subdomain Routing
**Description:** Detect league from subdomain and set context

**Files:**
- `src/middleware.ts` (MODIFY)
- `src/lib/leagues/detection.ts` (NEW)

**Success Criteria:**
- Subdomain extracted from hostname
- League looked up by subdomain
- League ID set in request headers
- 404 if league not found
- Redirects to main site if no subdomain

---

#### Task 3.3: Update All Database Queries
**Description:** Add league_id and division_id filters to all queries

**Files:**
- `src/lib/teams/actions.ts` (MODIFY)
- `src/lib/seasons/actions.ts` (MODIFY)
- `src/lib/games/actions.ts` (MODIFY)
- `src/lib/stats/queries.ts` (MODIFY)
- ... all other query files

**Example:**
```typescript
// Before
const teams = await supabase
  .from('teams')
  .select('*');

// After
const { currentLeague } = useLeague();
const teams = await supabase
  .from('teams')
  .select(`
    *,
    division:divisions(id, name, tier_order)
  `)
  .eq('league_id', currentLeague.id)
  .order('division.tier_order', { ascending: true });
```

**Success Criteria:**
- All queries filtered by league_id
- Division joins included where relevant
- No cross-league data leakage
- Tests pass with multiple leagues and divisions

---

#### Task 3.4: Update Server Actions for League Context
**Description:** Pass league context to server actions

**Files:**
- All files in `src/lib/*/actions.ts`

**Pattern:**
```typescript
'use server';

import { getLeagueFromRequest } from '@/lib/leagues/server';

export async function createTeam(data: TeamData) {
  const league = await getLeagueFromRequest();

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ ...data, league_id: league.id });

  return team;
}
```

---

#### Task 3.5: Create League Server Utilities
**Description:** Helper functions for league operations

**Files:**
- `src/lib/leagues/server.ts` (NEW)
- `src/lib/leagues/client.ts` (NEW)

**Functions:**
```typescript
// Server-side
export async function getLeagueFromRequest(): Promise<League>
export async function getLeagueById(id: string): Promise<League>
export async function getLeagueBySlug(slug: string): Promise<League>
export async function getLeagueBySubdomain(subdomain: string): Promise<League>

// Client-side
export function useCurrentLeague(): League
export function useUserLeagues(): League[]
export function useSwitchLeague(): (leagueId: string) => void
```

---

### PHASE 4: AI Schedule Generation UI (Week 10-11)

#### Task 4.1: Schedule Generation Wizard
**Description:** Multi-step wizard for generating league schedules

**Files:**
- `src/app/(dashboard)/admin/seasons/[seasonId]/generate-schedule/page.tsx` (NEW)
- `src/components/scheduling/ScheduleGenerationWizard.tsx` (NEW)
- `src/lib/scheduling/generation-actions.ts` (NEW)

**Wizard Steps:**

**Step 1: Division Configuration**
- Select which divisions to include
- Set games per team per division
- Configure interdivisional play percentage

**Step 2: Venue & Time Selection**
- Select venues to use
- Review time slot availability
- Assign division priorities to time slots

**Step 3: Rules Configuration**
- Review active scheduling rules
- Enable/disable specific rules
- Set rule priorities

**Step 4: Schedule Preferences**
- Season start/end dates
- Blackout dates (holidays, etc.)
- Home/away balance preferences
- Maximum games per week

**Step 5: Generate & Preview**
- Click "Generate Schedule" (shows loading animation)
- AI generates schedule (30-60 seconds)
- Preview schedule statistics:
  - Total games
  - Games per division
  - Constraint satisfaction score
  - Warnings/conflicts

**Step 6: Review & Adjust**
- Interactive calendar view
- Filter by division/venue/date
- Manually adjust specific games
- Re-run optimization on subset

**Step 7: Confirm & Publish**
- Final confirmation
- Insert games into database
- Send notifications to teams
- Lock schedule (or keep draft)

**Success Criteria:**
- Wizard is intuitive and guided
- Loading states are clear
- Preview is comprehensive
- Manual adjustments work
- Schedule publishes correctly

---

#### Task 4.2: Schedule Validation & Conflict Detection
**Description:** Real-time validation during schedule generation

**Files:**
- `src/lib/scheduling/validator.ts` (NEW)
- `src/components/scheduling/ConflictReport.tsx` (NEW)

**Validation Checks:**
- ✅ All teams have required number of games
- ✅ No team plays more than max games per week
- ✅ Minimum rest days between games
- ✅ All hard constraints satisfied
- ✅ Home/away balance within threshold
- ⚠️ Soft constraints satisfaction percentage
- ❌ Conflicts detected (with explanations)

**Conflict Examples:**
```
❌ Division B1 Rule Violation:
   Team "Thunder" scheduled on Monday 21:00
   but B1 division only plays Tuesday/Thursday
   → Suggested fix: Move to Tuesday 21:00

⚠️ Optimization Warning:
   Team "Sharks" has 3 games in 7 days (max is 2)
   → Consider spreading games over more weeks

✅ All 487 games scheduled successfully
   Hard constraints: 45/45 satisfied
   Soft constraints: 38/42 satisfied (90%)
```

---

#### Task 4.3: Schedule Regeneration & Adjustments
**Description:** Allow admins to regenerate schedule or adjust specific games

**Files:**
- `src/app/(dashboard)/admin/seasons/[seasonId]/schedule/page.tsx` (MODIFY)
- `src/lib/scheduling/regeneration.ts` (NEW)

**Features:**
- **Partial Regeneration:**
  - Regenerate specific division's games only
  - Regenerate games after a certain date
  - Keep completed games, regenerate future

- **Manual Adjustments:**
  - Click on game to edit
  - Change venue/time
  - Swap home/away teams
  - System validates change against rules

- **Bulk Operations:**
  - Move all Division X games to different venue
  - Shift all games forward/backward by N days
  - Regenerate specific week

**Success Criteria:**
- Partial regeneration works correctly
- Manual adjustments are validated
- Bulk operations maintain integrity
- Change history is logged

---

#### Task 4.4: Schedule Templates & Presets
**Description:** Save and reuse schedule configurations

**Files:**
- `src/lib/scheduling/templates.ts` (NEW)
- `src/components/scheduling/TemplateManager.tsx` (NEW)

**Template Types:**

**1. Season Template:**
- Division configuration
- Games per team
- Season dates
- Venue assignments

**2. Rule Template:**
- Pre-configured rule sets
- "Standard League Rules"
- "Advanced Competitive Rules"
- "Recreational League Rules"

**3. Venue Template:**
- Common venue/time combinations
- "Tuesday Night Hockey"
- "Weekend Warrior Schedule"

**Features:**
- Save current configuration as template
- Load template for new season
- Share templates between leagues (admin)
- Template marketplace (future)

---

### PHASE 5: League Management UI (Week 12-13)

#### Task 5.1: League Creation Flow
**Description:** Allow users to create new leagues

**Files:**
- `src/app/(platform)/create-league/page.tsx` (NEW)
- `src/lib/leagues/actions.ts` (NEW)
- `src/components/leagues/CreateLeagueForm.tsx` (NEW)

**Flow:**
1. User clicks "Create League"
2. Form: Name, Slug, Subdomain
3. Check subdomain availability
4. Select subscription tier
5. Create league + membership
6. Redirect to league setup

**Success Criteria:**
- League created in database
- User added as owner
- Subdomain unique and valid
- Default settings initialized

---

#### Task 5.2: League Settings Page
**Description:** League owner can manage settings

**Files:**
- `src/app/(dashboard)/admin/league-settings/page.tsx` (NEW)
- `src/lib/leagues/settings-actions.ts` (NEW)
- `src/components/leagues/LeagueSettingsForm.tsx` (NEW)

**Settings Sections:**
1. **General:** Name, tagline, timezone
2. **Branding:** Logo, colors, banner
3. **Features:** Enable/disable features
4. **Subscription:** Current tier, upgrade
5. **Members:** Invite, manage roles
6. **Danger Zone:** Archive/delete league

---

#### Task 5.3: League Switcher Component
**Description:** Dropdown to switch between leagues

**Files:**
- `src/components/layout/LeagueSwitcher.tsx` (NEW)
- `src/components/layout/Header.tsx` (MODIFY)

**Features:**
- Shows current league with logo
- Lists all user's leagues
- Click to switch
- "Create League" option
- Visual indicator of current league

---

#### Task 5.4: League Invitation System
**Description:** Invite users to join league

**Files:**
- `src/app/(dashboard)/admin/members/page.tsx` (NEW)
- `src/lib/leagues/invitations.ts` (NEW)
- `src/app/invite/[token]/page.tsx` (NEW)

**Flow:**
1. Owner invites user by email
2. Email sent with invitation link
3. User clicks link
4. If user exists: auto-join league
5. If new user: signup then join
6. Redirect to league dashboard

---

#### Task 5.5: League Member Management
**Description:** Manage league members and roles

**Files:**
- `src/app/(dashboard)/admin/members/page.tsx` (EXISTING from Task 3.4)
- `src/lib/leagues/members.ts` (NEW)

**Features:**
- List all league members
- Change roles (captain → player, etc.)
- Remove members
- Resend invitations
- Ban/unban members

---

#### Task 5.6: League Landing Page
**Description:** Public-facing page for each league

**Files:**
- `src/app/(league)/page.tsx` (NEW)
- `src/app/(league)/layout.tsx` (NEW)

**Content:**
- League name, logo, tagline
- Current season standings
- Upcoming games
- Recent news/articles
- "Join League" CTA

---

### PHASE 6: Subscription System (Week 14-15)

#### Task 6.1: Stripe Products & Prices Setup
**Description:** Create Stripe products for each tier

**Stripe Dashboard:**
1. Create products: Basic, Pro, Enterprise
2. Create prices: Monthly/Annual
3. Note product/price IDs

**Environment Variables:**
```env
STRIPE_BASIC_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_xxx
```

---

#### Task 6.2: Subscription Checkout Flow
**Description:** Allow league owners to subscribe

**Files:**
- `src/app/(dashboard)/admin/subscription/page.tsx` (NEW)
- `src/app/api/subscriptions/create-checkout/route.ts` (NEW)
- `src/lib/subscriptions/actions.ts` (NEW)

**Flow:**
1. Owner selects tier
2. Redirect to Stripe Checkout
3. Stripe handles payment
4. Webhook updates league subscription
5. Redirect back to dashboard

---

#### Task 6.3: Stripe Webhook Handler
**Description:** Handle subscription events

**Files:**
- `src/app/api/webhooks/stripe/route.ts` (MODIFY)

**Events:**
- `checkout.session.completed` → Activate subscription
- `invoice.paid` → Renew subscription
- `invoice.payment_failed` → Mark past_due
- `customer.subscription.deleted` → Cancel subscription

**Success Criteria:**
- Subscription status updated in real-time
- League features enabled/disabled based on tier
- Email notifications sent

---

#### Task 6.4: Usage Limits Enforcement
**Description:** Enforce tier limits throughout app

**Files:**
- `src/lib/leagues/limits.ts` (NEW)
- All creation actions (teams, seasons, players)

**Pattern:**
```typescript
export async function createTeam(data: TeamData) {
  const limit = await checkLeagueLimit(leagueId, 'teams');

  if (!limit.allowed) {
    throw new Error(`Team limit reached (${limit.current}/${limit.limit}). Upgrade to add more teams.`);
  }

  // Create team...
}
```

**Success Criteria:**
- Limits checked before creation
- User-friendly error messages
- Upgrade prompts shown

---

#### Task 6.5: Subscription Management UI
**Description:** View and manage subscription

**Files:**
- `src/app/(dashboard)/admin/subscription/page.tsx` (EXISTING)
- `src/components/subscription/SubscriptionCard.tsx` (NEW)

**Features:**
- Current tier display
- Usage stats (players, teams, seasons)
- Upgrade/downgrade options
- Billing history
- Cancel subscription

---

### PHASE 7: Platform Pages (Week 16)

#### Task 7.1: Platform Landing Page
**Description:** Main hockeylifehl.app homepage

**Files:**
- `src/app/(platform)/page.tsx` (NEW)
- `src/app/(platform)/layout.tsx` (NEW)

**Content:**
- Hero: "The Ultimate Hockey League Management Platform"
- Features showcase
- Pricing table
- Testimonials
- "Create Your League" CTA

---

#### Task 7.2: Pricing Page
**Description:** Detailed pricing comparison

**Files:**
- `src/app/(platform)/pricing/page.tsx` (NEW)

**Content:**
- Tier comparison table
- FAQ about billing
- "Start Free Trial" CTA

---

#### Task 7.3: League Directory (Optional)
**Description:** Public directory of leagues

**Files:**
- `src/app/(platform)/leagues/page.tsx` (NEW)

**Content:**
- List of public leagues
- Search/filter
- Click to view league

---

#### Task 7.4: Documentation
**Description:** Help docs for league owners

**Files:**
- `src/app/(platform)/docs/page.tsx` (NEW)
- Multiple doc pages

**Topics:**
- Getting started
- Managing teams
- Running drafts
- Collecting payments
- Troubleshooting

---

### PHASE 8: Testing & Polish (Week 17-18)

#### Task 8.1: Multi-League Testing
**Description:** Create test leagues and verify isolation

**Test Cases:**
1. Create 3 test leagues
2. Verify data isolation (League A can't see League B)
3. Test user in multiple leagues
4. Test league switcher
5. Test RLS policies

---

#### Task 8.2: Migration Testing
**Description:** Test migration with production data

**Steps:**
1. Create production snapshot
2. Run migrations on test database
3. Verify data integrity
4. Test existing functionality
5. Document rollback plan

---

#### Task 8.3: Performance Testing
**Description:** Ensure performance with multiple leagues

**Metrics:**
- Query performance with league_id filters
- Index effectiveness
- Page load times
- Database connection pooling

---

#### Task 8.4: Security Audit
**Description:** Verify no data leakage

**Checks:**
- RLS policies complete
- All queries filtered
- No hardcoded league IDs
- Cross-league references prevented

---

### PHASE 9: Deployment (Week 19)

#### Task 9.1: Subdomain DNS Setup
**Description:** Configure wildcard subdomain

**Vercel:**
1. Add domain `hockeylifehl.app`
2. Add wildcard `*.hockeylifehl.app`
3. Configure DNS: `CNAME *.hockeylifehl.app → cname.vercel-dns.com`

---

#### Task 9.2: Environment Variables
**Description:** Set production environment variables

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
RESEND_API_KEY=...

# New
STRIPE_BASIC_MONTHLY_PRICE_ID=...
STRIPE_PRO_MONTHLY_PRICE_ID=...
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=...
NEXT_PUBLIC_PLATFORM_DOMAIN=hockeylifehl.app
```

---

#### Task 9.3: Database Migration (Production)
**Description:** Run migrations on production database

**Steps:**
1. Backup production database
2. Enable maintenance mode
3. Run migrations 001-004
4. Verify default league created
5. Test existing functionality
6. Disable maintenance mode

**Estimated Downtime:** 5-10 minutes

---

#### Task 9.4: Rollout Plan
**Description:** Gradual rollout to users

**Phases:**
1. **Beta (Week 1):** Invite 5 test leagues
2. **Limited (Week 2-3):** Invite 20 leagues
3. **Public (Week 4+):** Open to all

---

## 📋 COMPLETE MIGRATION CHECKLIST

### Pre-Migration
- [ ] Backup production database
- [ ] Test migrations on staging
- [ ] Document rollback procedure
- [ ] Notify users of maintenance window
- [ ] Prepare support documentation

### Migration Day
- [ ] Enable maintenance mode
- [ ] Run migration 001: Create new tables
- [ ] Run migration 002: Add league_id columns
- [ ] Run migration 003: Migrate existing data
- [ ] Run migration 004: Update RLS policies
- [ ] Verify default league created
- [ ] Verify all existing data assigned
- [ ] Test existing functionality
- [ ] Disable maintenance mode

### Post-Migration
- [ ] Monitor error logs
- [ ] Test multi-league creation
- [ ] Verify data isolation
- [ ] Check performance metrics
- [ ] Gather user feedback

---

## 🎯 SUCCESS METRICS

### Technical Metrics
- ✅ 100% data isolation (no cross-league queries)
- ✅ <100ms query performance with league_id filter
- ✅ Zero downtime migration
- ✅ All RLS policies enforced

### Business Metrics
- 🎯 10 leagues created in first month
- 🎯 50% conversion from trial to paid
- 🎯 $1,000 MRR by month 3
- 🎯 95% user satisfaction

---

## 🚨 RISKS & MITIGATION

### Risk 1: Data Migration Failure
**Impact:** High
**Probability:** Low
**Mitigation:**
- Extensive testing on staging
- Database backup before migration
- Rollback plan documented
- Maintenance window scheduled

### Risk 2: Performance Degradation
**Impact:** Medium
**Probability:** Medium
**Mitigation:**
- Add indexes on league_id
- Monitor query performance
- Optimize RLS policies
- Use connection pooling

### Risk 3: User Confusion
**Impact:** Medium
**Probability:** High
**Mitigation:**
- Clear documentation
- Email announcement
- In-app onboarding
- Support chat available

### Risk 4: RLS Policy Gaps
**Impact:** High
**Probability:** Low
**Mitigation:**
- Security audit before launch
- Automated RLS tests
- Manual testing with multiple leagues
- Bug bounty program

---

## 💡 FUTURE ENHANCEMENTS

### Phase 8 (Post-Launch)
- League analytics dashboard
- Cross-league tournaments
- League templates (quick setup)
- Mobile apps (iOS/Android)
- Public API for integrations
- Zapier/Make.com integrations
- Advanced reporting
- League messaging/forums
- Merchandise integration
- Stripe Connect for league payments

---

## 📞 SUPPORT & DOCUMENTATION

### For League Owners
- Getting Started Guide
- Video tutorials
- FAQ
- Email support
- Feature requests

### For Developers
- API documentation
- Migration guides
- Troubleshooting
- Architecture diagrams

---

## 🎉 LAUNCH PLAN

### Week 1: Soft Launch
- Create 5 beta leagues
- Gather feedback
- Fix critical bugs

### Week 2-3: Limited Release
- Invite 20 leagues
- Monitor performance
- Iterate on UX

### Week 4+: Public Launch
- Marketing campaign
- Social media announcement
- Press release
- Open signups

---

---

## 🎯 DIVISION SYSTEM SUMMARY

### Key Features Added

**1. Multi-Division Support (10+ Divisions)**
- Hierarchical division structure (A, B1, B2, C1, C2, C3, D1, D2, REC, DRAFT)
- Tier ordering for skill-based organization
- Division-specific colors, icons, and branding
- Support for 75+ teams across multiple divisions

**2. Advanced Venue Management**
- Multiple venues (ice rinks) per league
- Multi-surface facilities (Rink 1, Rink 2, etc.)
- Location details with mapping integration
- Venue amenities and accessibility features

**3. Granular Time Slot Control**
- Weekly recurring time slots per venue/surface
- Day-of-week and time-of-day specificity
- Division restrictions per time slot
- Effective date ranges for seasonal availability
- Priority ranking for AI optimization

**4. Flexible Scheduling Rules Engine**
- 8 rule types (division time constraints, team blackouts, venue restrictions, etc.)
- Hard vs soft constraints
- Priority-based rule system
- Visual rule builder for non-technical admins
- Rule conflict detection

**5. AI-Powered Schedule Generation**
- Constraint Satisfaction Problem (CSP) algorithm
- Two-phase generation (hard constraints → optimization)
- Handles complex multi-division scheduling
- Respects all venue, time, and division rules
- Generates 500+ game schedules in <30 seconds
- Provides optimization score and warnings

**6. Division Restructuring System**
- Mid-season team movement between divisions
- Impact analysis before changes
- Automatic schedule regeneration
- Audit trail for all division changes
- Notifications to affected teams

**7. Enhanced Standings & Reporting**
- Division-specific standings
- League-wide standings with division breakdown
- Interdivisional game tracking
- Playoff qualification by division
- Division leader boards

### Technical Specifications

**New Database Tables:** 5
- `divisions` (league organization)
- `venues` (ice rink facilities)
- `venue_time_slots` (available ice times)
- `scheduling_rules` (constraints & preferences)
- `division_restructuring_log` (audit trail)

**Modified Tables:** 2
- `teams` → Added `division_id`, `tier_level`
- `games` → Added `venue_id`, `surface_name`, `division_id`, `is_interdivisional`

**New Indexes:** 15+
- Optimized for division filtering
- Venue and time slot lookups
- League + division composite indexes

**New API Endpoints:** 20+
- Division CRUD operations
- Venue management
- Time slot configuration
- Scheduling rule management
- AI schedule generation
- Team movement/restructuring

### Use Case: 75-Team Multi-Division League

**Example Configuration:**

**Divisions:**
- A Division: 8 teams (Elite)
- B1 Division: 10 teams (Advanced Upper)
- B2 Division: 10 teams (Advanced Lower)
- C1 Division: 9 teams (Intermediate Upper)
- C2 Division: 9 teams (Intermediate Mid)
- C3 Division: 9 teams (Intermediate Lower)
- D1 Division: 8 teams (Beginner Upper)
- D2 Division: 8 teams (Beginner Lower)
- REC Division: 4 teams (Recreational)

**Total: 75 teams across 9 divisions**

**Venues:**
- Sunnybrook Arena (2 rinks)
- Canlan Ice Sports North (3 rinks)
- Canlan Ice Sports East (2 rinks)
- Scotiabank Pond (1 rink)

**Total: 8 ice surfaces**

**Schedule Configuration:**
- Games per team: 13 regular season
- Divisional games: 8 (within division)
- Interdivisional games: 5 (cross-division)
- Total games: (75 teams × 13 games) / 2 = **487 games**

**Scheduling Rules:**
- B Divisions only play Tuesday/Thursday 9-11pm
- A Division gets prime time priority (6-8pm)
- C/D Divisions play Monday/Wednesday 9-11pm
- REC Division plays weekends only
- Minimum 2 days rest between games
- Maximum 2 games per week per team
- Home/away balance within 60/40 split

**AI Schedule Output:**
- Total games generated: 487
- Hard constraints satisfied: 100% (52/52)
- Soft constraints satisfied: 92% (46/50)
- Generation time: 24 seconds
- Warnings: 3 (unavoidable back-to-back weekends for 2 teams)

### Migration Path from Current System

**Phase 1: Add Division Support (Non-Breaking)**
1. Add new tables (divisions, venues, etc.)
2. Create default "Main Division" for existing league
3. Assign all existing teams to default division
4. Keep existing schedule generator working

**Phase 2: Enable Multi-Division (Opt-In)**
1. League admins can create additional divisions
2. Move teams to new divisions
3. New schedule generator available (AI-powered)
4. Old generator still works for simple leagues

**Phase 3: Full Cutover**
1. All new leagues use division system
2. Existing leagues migrated to default division
3. Old schedule generator deprecated
4. Division system becomes core feature

### Competitive Advantages

**vs Generic League Management:**
- ✅ Support for 75+ teams (most max out at 20)
- ✅ Complex division hierarchies (most have 1-2 divisions max)
- ✅ Advanced scheduling rules (most have basic round-robin)
- ✅ AI-powered schedule generation (most are manual)
- ✅ Mid-season restructuring (unheard of in competitors)

**vs LeagueApps/TeamSnap/SportsEngine:**
- ✅ More flexible division system
- ✅ Better venue/time slot management
- ✅ Smarter AI scheduling
- ✅ Hockey-specific features (captain verification, etc.)
- ✅ Lower cost for large leagues

**Target Market Expansion:**
- Small leagues (6-12 teams) → Already supported
- Medium leagues (12-30 teams) → Already supported
- **Large leagues (30-75+ teams)** → NOW SUPPORTED ✅
- Multi-location leagues → NOW SUPPORTED ✅
- Professional/Semi-pro leagues → Viable with Enterprise tier

---

**END OF PLAN**

*Last Updated: January 2026*
*Status: Updated with Multi-Division Architecture*
*Estimated Timeline: 19 weeks (5 months)*
*New Phases: 9 (was 7)*
*New Tasks: 35+ (was 25)*
*Additional Scope: Division System, Venue Management, AI Scheduling, Team Restructuring*
*Estimated Cost: Development time only (no infrastructure changes needed)*
*Recommended Team: 2-3 developers + 1 designer*
