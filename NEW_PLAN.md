# Hockey SaaS Platform - New Architecture Plan

**Date:** 2026-01-29
**Status:** Planning Phase
**Architecture:** Two-Platform Approach

---

## Table of Contents

1. [Vision & Strategy](#vision--strategy)
2. [Architecture Overview](#architecture-overview)
3. [Platform 1: League Builder (SaaS Dashboard)](#platform-1-league-builder-saas-dashboard)
4. [Platform 2: League Websites (Custom Domains)](#platform-2-league-websites-custom-domains)
5. [Build Order & Phases](#build-order--phases)
6. [Technical Architecture](#technical-architecture)
7. [Data Model](#data-model)
8. [Authentication & Authorization](#authentication--authorization)
9. [Deployment Strategy](#deployment-strategy)
10. [Migration Path](#migration-path)

---

## Vision & Strategy

### Core Concept
Build a **two-platform SaaS** similar to Shopify's model:
- **Platform 1**: Admin dashboard where league owners manage their leagues
- **Platform 2**: Custom-domain websites where players/captains interact

### Key Differentiator
**Complete separation of concerns:**
- League owners never mix with players in the same interface
- Each league gets a professional custom-domain website
- Players only see their league, never the SaaS platform
- Clean, focused experiences for each user type

### Business Model
- **SaaS Subscription**: League owners pay monthly/annually
- **Tiered Pricing**: Based on features, player count, storage
- **Custom Domains**: Included or add-on
- **White-Label Option**: Remove HockeyLife branding (premium tier)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│         PLATFORM 1: League Builder (SaaS)           │
│                                                     │
│  URL: admin.hockeylife.com or app.hockeylife.com   │
│  Users: League Owners, Employees                   │
│  Purpose: Manage leagues, configure, deploy        │
└─────────────────────────────────────────────────────┘
                        │
                        │ Provisions/Manages
                        ↓
┌─────────────────────────────────────────────────────┐
│      PLATFORM 2: League Websites (Custom Domains)   │
│                                                     │
│  URLs: bmhl.com, torontohockey.com, etc.           │
│  Users: Players, Captains, Public                  │
│  Purpose: League website, registration, stats      │
└─────────────────────────────────────────────────────┘
```

### Why Two Platforms?

**Current Issue (Single Multi-Tenant App):**
- League owners log in alongside players
- Confusing navigation (admin vs player sections)
- Branding challenges (who's app is this?)
- Difficult to white-label
- Players see "HockeyLife" everywhere

**New Approach (Two Platforms):**
- **Clear separation**: Owners use SaaS dashboard, players use league website
- **Better branding**: League website is fully branded for that league
- **White-label ready**: Remove SaaS branding from league sites
- **Focused UX**: Each platform optimized for its users
- **Scalability**: Can scale platforms independently

---

## Platform 1: League Builder (SaaS Dashboard)

### Overview
**Purpose:** Control panel for league owners to create, manage, and deploy their hockey leagues

**URL Examples:**
- `admin.hockeylife.com`
- `app.hockeylife.com`
- `dashboard.hockeylife.com`

**Users:**
- League Owners (primary)
- League Employees (staff members)
- HockeyLife Support Staff (super admin)

### Core Features

#### 1. League Creation & Setup
- **Create New League** wizard
  - League name, location, sport type
  - Season structure (divisions, teams)
  - Registration type (draft, open, invite-only)
  - Branding (logo, colors, domain)

#### 2. League Configuration
- **Branding**
  - Upload logo
  - Set primary/secondary colors
  - Custom domain setup
  - Email templates customization
  - Footer/header customization

- **Settings**
  - League rules (game duration, stats tracked)
  - Registration settings
  - Payment settings (Stripe Connect)
  - Notification preferences
  - Privacy settings

#### 3. Content Management
- **Manage Teams**
  - Create/edit teams
  - Assign captains
  - Set rosters
  - Team branding

- **Manage Players**
  - View all registrations
  - Approve/reject players
  - Assign to teams
  - Import/export

- **Manage Schedule**
  - Create games
  - Reschedule with conflict detection
  - Bulk operations
  - Venue management

- **Manage Content**
  - News articles
  - Announcements
  - League documents
  - Sponsor management

#### 4. Analytics & Reporting
- **Dashboard**
  - Registration metrics
  - Revenue tracking
  - Player engagement
  - Website traffic

- **Reports**
  - Financial reports
  - Player demographics
  - Game statistics
  - Attendance tracking

#### 5. Deployment & Domains
- **Website Deployment**
  - One-click deploy league website
  - Preview before publishing
  - Rollback capability
  - A/B testing

- **Custom Domain Management**
  - Connect custom domain
  - SSL certificate automation
  - DNS configuration guide
  - Subdomain support

#### 6. Billing & Subscriptions
- **Subscription Management**
  - View current plan
  - Upgrade/downgrade
  - Payment history
  - Invoice downloads

- **League Payments**
  - Connected Stripe account
  - Transaction history
  - Payout schedule
  - Fee breakdown

### Tech Stack (Platform 1)

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- Recharts for analytics

**Backend:**
- Next.js API Routes
- Supabase (PostgreSQL)
- Row Level Security (league_id isolation)
- Server Actions

**Deployment:**
- Vercel
- Edge Functions for domain routing

**Third-Party:**
- Stripe Connect (payments)
- Resend (email)
- Cloudflare (custom domain management)
- AWS S3 (file storage)

---

## Platform 2: League Websites (Custom Domains)

### Overview
**Purpose:** Public-facing website for each individual hockey league

**URL Examples:**
- `bmhl.com` (Beer Men's Hockey League)
- `torontohockey.com` (Toronto Adult Hockey)
- `summerleague.ca` (Summer Hockey League)

**Users:**
- Players (registered league members)
- Captains (team leaders)
- Public Visitors (prospective players)
- Scorekeepers (stat entry)

### Core Features

#### 1. Public Pages (No Login Required)
- **Homepage**
  - League branding
  - Hero section with key info
  - Upcoming games
  - Recent news
  - Call-to-action (Register Now)

- **About League**
  - League history
  - Rules and regulations
  - Contact information
  - FAQ

- **Schedule**
  - Public game schedule
  - Venue information
  - Live scores (if in progress)

- **Standings**
  - Team rankings
  - Division standings
  - Player leaderboards (top scorers, etc.)

- **Teams**
  - Team directory
  - Team pages (rosters, stats)
  - Team logos and colors

- **Register**
  - Registration form
  - Payment processing
  - Waitlist management

#### 2. Player Portal (Login Required)
- **Dashboard**
  - My team
  - My stats
  - Upcoming games
  - Notifications

- **Profile**
  - Edit profile info
  - Upload photo
  - Contact preferences
  - Payment history

- **Team Page**
  - Team roster
  - Team schedule
  - Team stats
  - Team chat/messaging

- **Stats**
  - Personal stats
  - Game-by-game breakdown
  - Career stats
  - Achievements/badges

#### 3. Captain Portal (Login Required)
- **Team Management**
  - Edit roster
  - Invite players
  - Set lineups
  - Confirm game participation

- **Communication**
  - Send team messages
  - Email team
  - Game reminders

- **Stats Review**
  - Verify game stats
  - Submit corrections

#### 4. Scorekeeper Interface (Login Required)
- **Game Sheet**
  - Record goals, assists, penalties
  - Track time-on-ice
  - Goalie stats
  - Offline capability (PWA)

- **Submit Stats**
  - Final score submission
  - Captain verification
  - Automatic stat calculations

### Tech Stack (Platform 2)

**Frontend:**
- Next.js 15 (App Router) - Each league gets its own instance
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- League-specific theming

**Backend:**
- Next.js API Routes
- Supabase (shared database, isolated by league_id)
- Row Level Security
- Server Actions

**Deployment:**
- Vercel (separate deployment per league)
- OR Edge-based multi-tenant routing
- Custom domain configuration

**Third-Party:**
- Stripe (payment processing for registrations)
- Resend (notifications)
- Cloudflare (CDN, domain management)

---

## Build Order & Phases

### Phase 1: League Builder MVP (Weeks 1-6)
**Goal:** Allow league owners to create and configure their first league

**Deliverables:**
1. **Authentication** (Week 1)
   - Owner signup/login
   - Organization creation
   - Invite employees

2. **League Creation** (Week 2)
   - Create league wizard
   - Basic settings (name, location, dates)
   - League branding upload

3. **Content Management** (Week 3-4)
   - Team creation
   - Player management
   - Schedule builder
   - News/announcements

4. **Deployment System** (Week 5-6)
   - Generate league website
   - Custom domain connection
   - Preview/publish workflow
   - SSL automation

**Milestone:** League owner can create a league and deploy a basic website

---

### Phase 2: League Website Template (Weeks 7-10)
**Goal:** Build the player-facing league website template

**Deliverables:**
1. **Public Pages** (Week 7)
   - Homepage template
   - Schedule page
   - Standings page
   - Teams page

2. **Player Authentication** (Week 8)
   - Player signup/login
   - Profile management
   - Password reset

3. **Player Dashboard** (Week 9)
   - Personal dashboard
   - My team page
   - My stats page

4. **Registration Flow** (Week 10)
   - Public registration form
   - Payment integration (Stripe)
   - Email confirmations

**Milestone:** Players can register and view their league website

---

### Phase 3: Advanced Features (Weeks 11-16)
**Goal:** Add advanced capabilities to both platforms

**League Builder:**
- Analytics dashboard
- Bulk operations
- Custom email templates
- Subscription billing
- Multi-league management

**League Websites:**
- Captain portal
- Scorekeeper interface
- Team messaging
- News comments
- Photo galleries

**Milestone:** Feature parity with current multi-tenant app

---

### Phase 4: White-Label & Scale (Weeks 17-20)
**Goal:** Support white-label deployments and scale operations

**Features:**
- Remove HockeyLife branding (premium tier)
- Custom email domains
- API for third-party integrations
- Advanced theming options
- League website marketplace (themes/plugins)

**Milestone:** Ready for enterprise customers

---

## Technical Architecture

### Database Strategy

**Approach:** Shared database with strict isolation

```sql
-- All league website data stays in shared database
-- Isolated by league_id with RLS
-- League Builder has elevated access to manage all leagues

-- Example: Games table
CREATE TABLE games (
  id UUID PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES leagues(id),
  -- ... other fields
);

-- RLS Policy for League Websites
CREATE POLICY league_isolation ON games
  FOR SELECT
  USING (league_id = current_league_id());

-- RLS Policy for League Builder (owners)
CREATE POLICY owner_access ON games
  FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_ownerships
      WHERE user_id = auth.uid()
    )
  );
```

### Key Tables

```sql
-- Platform 1 (League Builder) specific tables
organizations        -- League owner companies
league_ownerships    -- Who owns which leagues
subscriptions        -- Billing for league owners
deployments          -- Track website deploys
custom_domains       -- Domain configurations

-- Shared tables (accessed by both platforms)
leagues              -- League metadata
teams                -- Teams in leagues
players              -- Player accounts
games                -- Game schedule
stats                -- Game statistics
profiles             -- User profiles

-- Platform 2 (League Websites) specific tables
registrations        -- Player registration submissions
notifications        -- Player notifications
team_messages        -- Team communication
```

### Multi-Tenancy Pattern

**League Websites (Platform 2):**
```typescript
// Middleware detects custom domain and sets league context
// Example: bmhl.com → league_id = "bmhl-uuid"

// All queries automatically filtered by league_id via RLS
const games = await supabase
  .from('games')
  .select('*')
  // RLS automatically adds: WHERE league_id = current_league_id()
```

**League Builder (Platform 1):**
```typescript
// League owner logs in, selects which league to manage
// Dashboard shows all their leagues

// Can switch between leagues
const userLeagues = await supabase
  .from('league_ownerships')
  .select('league_id, leagues(*)')
  .eq('user_id', userId)

// Admin operations for specific league
const teams = await supabase
  .from('teams')
  .select('*')
  .eq('league_id', selectedLeagueId)
```

---

## Authentication & Authorization

### Platform 1: League Builder
**Users:** League Owners, Employees

**Auth Flow:**
1. User signs up at `admin.hockeylife.com`
2. Creates organization
3. Creates first league (or joins existing)
4. Can invite employees to organization
5. Can manage multiple leagues

**Permissions:**
- `owner`: Full access to organization and all leagues
- `admin`: Full access to specific league
- `editor`: Can edit content, not settings
- `viewer`: Read-only access

**Implementation:**
```typescript
// Supabase Auth
// Table: user_roles
{
  user_id: UUID,
  organization_id: UUID,
  role: 'owner' | 'admin' | 'editor' | 'viewer',
  league_id: UUID (optional - if role is league-specific)
}

// RLS Policy
CREATE POLICY league_builder_access
  ON leagues FOR ALL
  USING (
    id IN (
      SELECT league_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
```

---

### Platform 2: League Websites
**Users:** Players, Captains, Public

**Auth Flow:**
1. Player visits league website (e.g., `bmhl.com`)
2. Registers or logs in
3. Account is scoped to that league only
4. Cannot access other leagues

**Permissions:**
- `player`: Access own profile, team info, stats
- `captain`: Manage team roster, messaging
- `scorekeeper`: Enter game stats

**Implementation:**
```typescript
// Separate auth context per league website
// Players create accounts on league website, not SaaS platform
// Cookie scoped to league domain

// Table: player_accounts
{
  id: UUID,
  league_id: UUID,
  email: STRING,
  role: 'player' | 'captain' | 'scorekeeper'
}

// RLS Policy
CREATE POLICY player_access
  ON profiles FOR SELECT
  USING (
    league_id = current_league_id()
    AND (
      id = auth.uid()
      OR is_public = true
    )
  );
```

---

## Deployment Strategy

### Option 1: Separate Deployments (Recommended)

**Approach:** Each league website is a separate Vercel deployment

**Pros:**
- True isolation between leagues
- Independent scaling
- Custom domains easy to configure
- No routing overhead
- Can use different Next.js versions per league

**Cons:**
- More complex deployment automation
- Higher infrastructure cost (pay per deployment)
- Code duplication (each league runs same codebase)

**Implementation:**
```typescript
// When league owner deploys their website:
1. Create new Vercel project via API
2. Deploy Next.js app with league-specific env vars
3. Configure custom domain
4. Set up SSL certificate
5. Enable auto-deploy from template repo
```

**Cost:** ~$20/month per league (Vercel Pro)

---

### Option 2: Edge-Based Multi-Tenant (Alternative)

**Approach:** Single Next.js app, routing based on domain

**Pros:**
- Lower infrastructure cost
- Single deployment to manage
- Easier to update all leagues at once
- Shared caching and optimization

**Cons:**
- More complex routing logic
- All leagues on same version
- Potential security concerns (shared runtime)
- Harder to white-label completely

**Implementation:**
```typescript
// Middleware detects domain and sets league context
// middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')

  // Lookup league by domain
  const league = await getLeagueByDomain(hostname)

  if (!league) {
    return NextResponse.redirect('/404')
  }

  // Set league context for all downstream requests
  request.headers.set('x-league-id', league.id)

  return NextResponse.next()
}
```

**Cost:** Single Vercel Pro deployment (~$20/month total)

---

### Recommendation: Hybrid Approach

**Strategy:** Start with Option 2 (Edge Multi-Tenant), migrate high-value leagues to Option 1 (Separate Deployments)

**Rationale:**
- **Early Stage**: Most leagues are small, use shared deployment
- **Growth Stage**: Large leagues (1000+ players) get dedicated deployment
- **Enterprise**: White-label customers get fully isolated deployment

**Pricing Tiers:**
- **Starter** ($99/mo): Shared deployment, up to 100 players
- **Pro** ($299/mo): Shared deployment, up to 500 players
- **Business** ($799/mo): Dedicated deployment, unlimited players
- **Enterprise** (Custom): Isolated deployment, white-label, SLA

---

## Data Model

### Core Entities

```typescript
// Platform 1: League Builder

Organization {
  id: UUID
  name: string
  owner_user_id: UUID
  subscription_tier: 'starter' | 'pro' | 'business' | 'enterprise'
  stripe_customer_id: string
  created_at: timestamp
}

LeagueOwnership {
  id: UUID
  organization_id: UUID
  league_id: UUID
  user_id: UUID
  role: 'owner' | 'admin' | 'editor' | 'viewer'
}

Deployment {
  id: UUID
  league_id: UUID
  status: 'pending' | 'deploying' | 'success' | 'failed'
  vercel_deployment_id: string
  custom_domain: string
  deployed_at: timestamp
  deployed_by: UUID
}

CustomDomain {
  id: UUID
  league_id: UUID
  domain: string
  verification_status: 'pending' | 'verified' | 'failed'
  ssl_status: 'pending' | 'active' | 'failed'
  dns_records: json
}

// Platform 2: League Websites

League {
  id: UUID
  organization_id: UUID
  name: string
  slug: string
  logo_url: string
  primary_color: string
  custom_domain: string
  settings: json
  is_published: boolean
}

PlayerAccount {
  id: UUID
  league_id: UUID
  email: string
  password_hash: string
  role: 'player' | 'captain' | 'scorekeeper'
  profile_id: UUID -> profiles(id)
}

Profile {
  id: UUID
  league_id: UUID
  full_name: string
  jersey_number: int
  position: string
  photo_url: string
  is_public: boolean
}

// Shared

Team {
  id: UUID
  league_id: UUID
  name: string
  logo_url: string
  captain_id: UUID -> profiles(id)
}

Game {
  id: UUID
  league_id: UUID
  home_team_id: UUID
  away_team_id: UUID
  scheduled_at: timestamp
  status: 'scheduled' | 'in_progress' | 'completed'
}
```

---

## Migration Path

### From Current Multi-Tenant to Two-Platform

**Current State:**
- Single Next.js app with multi-tenant architecture
- League owners and players share same auth system
- Single domain with subdomain routing

**Target State:**
- Platform 1: League Builder (admin.hockeylife.com)
- Platform 2: League Websites (custom domains)
- Separate auth systems

**Migration Steps:**

#### Step 1: Extract League Builder (Weeks 1-2)
1. Create new Next.js app for Platform 1
2. Copy admin pages to new app
3. Update auth to support league owners
4. Connect to existing Supabase database
5. Deploy to `admin.hockeylife.com`

#### Step 2: Build Website Template (Weeks 3-6)
1. Create new Next.js app for Platform 2 (template)
2. Copy public/player pages
3. Implement custom domain routing
4. Separate player auth system
5. Test with existing BMHL data

#### Step 3: Data Migration (Week 7)
1. Add `organization_id` to leagues table
2. Create `league_ownerships` table
3. Migrate existing users:
   - Admins → League Builder users
   - Players → League Website users
4. Update RLS policies

#### Step 4: Deploy BMHL (Week 8)
1. Deploy BMHL as first league website
2. Set up `bmhl.com` custom domain
3. Migrate BMHL admin to League Builder
4. Test end-to-end workflow

#### Step 5: Gradual Rollout (Weeks 9-12)
1. Migrate one league per week
2. Run both systems in parallel
3. Gather feedback
4. Fix issues
5. Improve migration tooling

#### Step 6: Sunset Old System (Week 13+)
1. All leagues migrated
2. Redirect old URLs to new platform
3. Archive old codebase
4. Celebrate! 🎉

---

## Success Criteria

### Platform 1: League Builder
- [ ] League owner can create a league in < 10 minutes
- [ ] League website deploys in < 2 minutes
- [ ] Custom domain connects in < 24 hours (DNS propagation)
- [ ] Dashboard loads in < 1 second
- [ ] 99.9% uptime SLA

### Platform 2: League Websites
- [ ] Homepage loads in < 500ms
- [ ] Player can register in < 3 minutes
- [ ] Mobile-responsive (100% pages)
- [ ] Accessible (WCAG AA compliant)
- [ ] SEO optimized (Lighthouse score > 90)

### Business Metrics
- [ ] 10 leagues onboarded in first 3 months
- [ ] 90% league owner satisfaction
- [ ] < 5% churn rate
- [ ] $50k MRR by month 6

---

## Risk Analysis

### Technical Risks

**Risk:** Custom domain setup too complex for users
**Mitigation:**
- Provide DNS configuration wizard
- Auto-verify DNS records
- Offer white-glove setup service (premium)

**Risk:** Deployment failures for league websites
**Mitigation:**
- Automated rollback on failure
- Preview deployments before going live
- Health checks and monitoring

**Risk:** Database scaling issues with many leagues
**Mitigation:**
- Connection pooling (Supabase Pooler)
- Read replicas for high-traffic leagues
- Caching layer (Redis)

### Business Risks

**Risk:** Existing leagues reluctant to migrate
**Mitigation:**
- Run both systems in parallel during transition
- Offer migration assistance
- Grandfather pricing for existing customers

**Risk:** Competition from established platforms
**Mitigation:**
- Focus on superior UX
- White-label capability
- Better pricing
- Faster feature development

---

## Next Steps (Immediate)

### Week 1: Planning & Setup
- [ ] Finalize architecture decisions
- [ ] Set up new repositories (league-builder, league-website-template)
- [ ] Design database schema changes
- [ ] Create wireframes for League Builder

### Week 2: Foundation
- [ ] Set up Platform 1 (League Builder) project
- [ ] Implement authentication for league owners
- [ ] Build organization creation flow
- [ ] Set up CI/CD pipeline

### Week 3: League Creation
- [ ] Build "Create League" wizard
- [ ] Implement league branding upload
- [ ] Connect to database
- [ ] Test end-to-end league creation

---

**Document Version:** 1.0
**Last Updated:** 2026-01-29
**Status:** Planning - Ready for Implementation
**Next Review:** After Phase 1 (Week 6)
