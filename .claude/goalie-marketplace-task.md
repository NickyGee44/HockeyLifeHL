# Task: Goalie Marketplace — Sub Request System

## Context
This is a Next.js 14+ monorepo (Turborepo) with:
- `apps/league-builder` — Admin dashboard for league owners (Next.js, App Router, i18n)
- `apps/league-sites` — Public-facing league websites (Next.js, App Router)
- `packages/database` — Supabase types & client
- `packages/ui` — Shared UI components
- Database: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- Payments: Stripe (already integrated for league subscriptions)

## Goal
Build a goalie sub request system where team captains can request substitute goalies from a league-wide pool, and goalies can accept first-come-first-serve via email.

## What to Build

### 1. Database Migration (`supabase/migrations/`)
Create a new migration file with timestamp prefix (e.g., `20260224_goalie_marketplace.sql`):

```sql
-- Goalie Pool: league-wide database of available sub goalies
CREATE TABLE goalie_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  skill_level skill_level_enum DEFAULT 'intermediate',
  availability JSONB DEFAULT '{}', -- { weekdayEvenings: true, weekendMornings: true, etc }
  has_full_gear BOOLEAN DEFAULT true,
  rate_per_game DECIMAL(8,2) DEFAULT 0, -- 0 = free
  preferred_arenas TEXT[], -- array of arena names
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted', 'pending')),
  verification_token UUID DEFAULT uuid_generate_v4(), -- for magic link profile management
  registered_via TEXT DEFAULT 'manual' CHECK (registered_via IN ('manual', 'self_registration', 'import')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (league_id, email)
);

-- Goalie Requests: captain requests a sub goalie for a game
CREATE TABLE goalie_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  skill_level_needed skill_level_enum DEFAULT 'intermediate',
  compensation TEXT, -- "free", "$20", "beer after", etc
  notes TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled', 'expired')),
  filled_by UUID REFERENCES goalie_pool(id),
  filled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- auto-set to 1 hour before game time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id, team_id) -- one request per team per game
);

-- Goalie Ratings: private captain ratings of sub goalies
CREATE TABLE goalie_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goalie_id UUID NOT NULL REFERENCES goalie_pool(id) ON DELETE CASCADE,
  rated_by UUID NOT NULL REFERENCES profiles(id),
  game_id UUID REFERENCES games(id),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}', -- ['on_time', 'skilled', 'great_attitude', 'late', 'no_show']
  private_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (goalie_id, rated_by, game_id)
);

-- Goalie Request Notifications: track who was notified
CREATE TABLE goalie_request_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES goalie_requests(id) ON DELETE CASCADE,
  goalie_id UUID NOT NULL REFERENCES goalie_pool(id) ON DELETE CASCADE,
  accept_token UUID DEFAULT uuid_generate_v4(), -- one-click accept from email
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'accepted', 'declined', 'expired')),
  UNIQUE (request_id, goalie_id)
);

-- RLS Policies
ALTER TABLE goalie_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE goalie_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE goalie_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE goalie_request_notifications ENABLE ROW LEVEL SECURITY;

-- Goalie pool: league members can read, league owners can write
CREATE POLICY "League members can view goalie pool" ON goalie_pool
  FOR SELECT USING (
    league_id IN (SELECT league_id FROM team_members WHERE user_id = auth.uid())
    OR league_id IN (SELECT id FROM leagues WHERE owner_id = auth.uid())
  );

CREATE POLICY "League owners manage goalie pool" ON goalie_pool
  FOR ALL USING (
    league_id IN (SELECT id FROM leagues WHERE owner_id = auth.uid())
  );

-- Goalie requests: team captains can create, league members can view
CREATE POLICY "Team captains manage requests" ON goalie_requests
  FOR ALL USING (
    requested_by = auth.uid()
    OR league_id IN (SELECT id FROM leagues WHERE owner_id = auth.uid())
  );

CREATE POLICY "League members view requests" ON goalie_requests
  FOR SELECT USING (
    league_id IN (SELECT league_id FROM team_members WHERE user_id = auth.uid())
  );

-- Goalie ratings: only captains can see (PRIVATE)
CREATE POLICY "Captains view ratings" ON goalie_ratings
  FOR SELECT USING (
    rated_by = auth.uid()
    OR league_id IN (SELECT id FROM leagues WHERE owner_id = auth.uid())
    OR league_id IN (
      SELECT tm.league_id FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('captain', 'assistant_captain')
    )
  );

CREATE POLICY "Captains create ratings" ON goalie_ratings
  FOR INSERT WITH CHECK (rated_by = auth.uid());

-- Indexes
CREATE INDEX idx_goalie_pool_league ON goalie_pool(league_id);
CREATE INDEX idx_goalie_pool_status ON goalie_pool(league_id, status);
CREATE INDEX idx_goalie_requests_game ON goalie_requests(game_id);
CREATE INDEX idx_goalie_requests_status ON goalie_requests(league_id, status);
CREATE INDEX idx_goalie_ratings_goalie ON goalie_ratings(goalie_id);
CREATE INDEX idx_goalie_notifications_token ON goalie_request_notifications(accept_token);
```

### 2. Server Actions (`apps/league-builder/src/lib/actions/goalie-marketplace.ts`)
Create server actions for:
- `getGoaliePool(leagueId)` — list all goalies in pool
- `addGoalieToPool(leagueId, goalieData)` — manual add
- `updateGoalie(goalieId, updates)` — edit goalie
- `removeGoalie(goalieId)` — remove/blacklist
- `createGoalieRequest(gameId, teamId, requestData)` — captain creates request
- `cancelGoalieRequest(requestId)` — captain cancels
- `getGoalieRequests(leagueId, filters)` — list requests
- `getGoalieRatings(goalieId)` — get ratings for a goalie (captains only)
- `rateGoalie(goalieId, gameId, ratingData)` — captain rates a goalie
- `acceptGoalieRequest(acceptToken)` — goalie accepts via token (NO AUTH needed)

### 3. League Builder UI Components

#### Goalie Pool Management (`apps/league-builder/src/components/goalie-marketplace/`)
- `GoaliePoolTable.tsx` — Table of all goalies with status, skill, rating avg, actions
- `AddGoalieModal.tsx` — Form to manually add a goalie
- `GoalieDetailPanel.tsx` — Expanded view with ratings history (visible to captains)
- `GoalieImportCSV.tsx` — CSV import for bulk adding goalies

#### Goalie Request Flow
- `RequestGoalieButton.tsx` — Button on game detail page for captains
- `GoalieRequestForm.tsx` — Skill level, compensation, notes form
- `GoalieRequestStatus.tsx` — Shows request status (open/filled/expired)
- `RateGoaliePrompt.tsx` — Post-game rating dialog (stars + tags + note)

#### League Settings Page Addition
Add a "Goalie Pool" tab/section to the existing league settings page that links to goalie pool management.

### 4. League Sites (Public) Components

#### Goalie Self-Registration (`apps/league-sites/`)
- Add route: `apps/league-sites/src/app/[leagueSlug]/goalies/register/page.tsx`
- `GoalieRegistrationForm.tsx` — Simple form (name, email, phone, skill, availability, gear, rate, arenas)
- No auth required — uses verification token for future profile management
- Confirmation page after submission

#### Registration Button
- Add a "🥅 Register as a Sub Goalie" button/link to:
  - League site navigation (in header/nav component)
  - League site homepage
  - League site footer

#### Goalie Accept Page
- Add route: `apps/league-sites/src/app/[leagueSlug]/goalies/accept/[token]/page.tsx`
- Token-based (from email link) — no login needed
- Shows game details, team info
- "Accept" button → marks request as filled if still open
- "Already filled" message if someone beat them to it

### 5. Email Templates (use existing email infrastructure)
Check `apps/league-builder/src/lib/notifications/` for the existing email pattern and create:
- Goalie request notification email (to goalies)
- Request filled confirmation (to captain)
- Request filled confirmation (to goalie)
- Post-game rating prompt (to captain, sent morning after game)

## IMPORTANT NOTES
- Check existing table names in `packages/database/src/types.ts` before creating migration — make sure table names don't conflict
- Check `team_members` table structure — verify it has `role` and `league_id` columns for RLS policies. Adapt if needed.
- Use existing Supabase client pattern from `apps/league-builder/src/lib/supabase/server.ts`
- Follow existing i18n pattern — add en.json and fr.json message keys
- Follow existing component patterns (check other components for styling conventions)
- Do NOT modify existing tables or migrations
- Run `pnpm type-check` after changes to verify TypeScript compiles

## When done
Run: `openclaw system event --text "Goalie Marketplace implementation complete — migration, actions, UI components, public registration" --mode now`
