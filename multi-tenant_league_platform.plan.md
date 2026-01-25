# 🏒 Multi-Tenant League Platform Implementation Plan

**Date:** January 2026
**Goal:** Transform HockeyLifeHL from a single-league platform into a multi-tenant SaaS platform supporting unlimited independent hockey leagues

---

## 📋 EXECUTIVE SUMMARY

This plan outlines the complete transformation of HockeyLifeHL into a multi-tenant platform where:
- Multiple independent hockey leagues can operate simultaneously
- Each league has its own teams, players, seasons, games, and branding
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

### 1. League Isolation
- Each league operates independently
- Teams, seasons, games are scoped to a league
- Users can join multiple leagues
- Data is completely isolated via RLS

### 2. Multi-Tenant Routing
- **Subdomain-based routing:** `winter-warriors.hockeylifehl.app`
- League detection from subdomain/domain
- Optional custom domain support
- Fallback to path-based routing: `/leagues/winter-warriors`

### 3. League Branding
- Custom logos, colors, taglines
- League-specific email templates
- Personalized landing pages
- White-label option (Enterprise tier)

### 4. Subscription Management
- Tiered pricing (Free, Basic, Pro, Enterprise)
- Stripe subscription per league
- Usage limits enforcement
- Trial period support

### 5. User League Memberships
- Users can join multiple leagues
- Different roles per league (Owner in one, Player in another)
- League switcher in UI
- Invitation system for new members

### 6. Data Migration
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

#### 1. `leagues` Table (Core Multi-Tenancy)

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

### Modify Existing Tables (Add `league_id`)

#### Tables That Need `league_id`:

```sql
-- Teams
ALTER TABLE teams ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_teams_league_id ON teams(league_id);

-- Seasons
ALTER TABLE seasons ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_seasons_league_id ON seasons(league_id);

-- Games
ALTER TABLE games ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX idx_games_league_id ON games(league_id);

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
| **Price** | $0 | $0 | $29/mo | $99/mo | Custom |
| **Duration** | 30 days | Forever | Monthly | Monthly | Annual |
| **Seasons** | 1 | 2 | Unlimited | Unlimited | Unlimited |
| **Players** | 50 | 100 | 300 | Unlimited | Unlimited |
| **Teams** | 6 | 8 | 16 | Unlimited | Unlimited |
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

### PHASE 1: Database Migration (Week 1-2)

#### Task 1.1: Create New Tables
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

### PHASE 2: Application Core Updates (Week 3-4)

#### Task 2.1: Create League Context & Provider
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

#### Task 2.2: Update Middleware for Subdomain Routing
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

#### Task 2.3: Update All Database Queries
**Description:** Add league_id filter to all queries

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
  .select('*')
  .eq('league_id', currentLeague.id);
```

**Success Criteria:**
- All queries filtered by league_id
- No cross-league data leakage
- Tests pass with multiple leagues

---

#### Task 2.4: Update Server Actions for League Context
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

#### Task 2.5: Create League Server Utilities
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

### PHASE 3: League Management UI (Week 5-6)

#### Task 3.1: League Creation Flow
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

#### Task 3.2: League Settings Page
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

#### Task 3.3: League Switcher Component
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

#### Task 3.4: League Invitation System
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

#### Task 3.5: League Member Management
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

#### Task 3.6: League Landing Page
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

### PHASE 4: Subscription System (Week 7-8)

#### Task 4.1: Stripe Products & Prices Setup
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

#### Task 4.2: Subscription Checkout Flow
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

#### Task 4.3: Stripe Webhook Handler
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

#### Task 4.4: Usage Limits Enforcement
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

#### Task 4.5: Subscription Management UI
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

### PHASE 5: Platform Pages (Week 9)

#### Task 5.1: Platform Landing Page
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

#### Task 5.2: Pricing Page
**Description:** Detailed pricing comparison

**Files:**
- `src/app/(platform)/pricing/page.tsx` (NEW)

**Content:**
- Tier comparison table
- FAQ about billing
- "Start Free Trial" CTA

---

#### Task 5.3: League Directory (Optional)
**Description:** Public directory of leagues

**Files:**
- `src/app/(platform)/leagues/page.tsx` (NEW)

**Content:**
- List of public leagues
- Search/filter
- Click to view league

---

#### Task 5.4: Documentation
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

### PHASE 6: Testing & Polish (Week 10-11)

#### Task 6.1: Multi-League Testing
**Description:** Create test leagues and verify isolation

**Test Cases:**
1. Create 3 test leagues
2. Verify data isolation (League A can't see League B)
3. Test user in multiple leagues
4. Test league switcher
5. Test RLS policies

---

#### Task 6.2: Migration Testing
**Description:** Test migration with production data

**Steps:**
1. Create production snapshot
2. Run migrations on test database
3. Verify data integrity
4. Test existing functionality
5. Document rollback plan

---

#### Task 6.3: Performance Testing
**Description:** Ensure performance with multiple leagues

**Metrics:**
- Query performance with league_id filters
- Index effectiveness
- Page load times
- Database connection pooling

---

#### Task 6.4: Security Audit
**Description:** Verify no data leakage

**Checks:**
- RLS policies complete
- All queries filtered
- No hardcoded league IDs
- Cross-league references prevented

---

### PHASE 7: Deployment (Week 12)

#### Task 7.1: Subdomain DNS Setup
**Description:** Configure wildcard subdomain

**Vercel:**
1. Add domain `hockeylifehl.app`
2. Add wildcard `*.hockeylifehl.app`
3. Configure DNS: `CNAME *.hockeylifehl.app → cname.vercel-dns.com`

---

#### Task 7.2: Environment Variables
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

#### Task 7.3: Database Migration (Production)
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

#### Task 7.4: Rollout Plan
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

**END OF PLAN**

*Last Updated: January 2026*
*Status: Ready for Implementation*
*Estimated Timeline: 12 weeks*
*Estimated Cost: Development time only (no infrastructure changes needed)*
