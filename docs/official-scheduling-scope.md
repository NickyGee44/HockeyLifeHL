# Feature: Official & Scorekeeper Scheduling System

> Technical scope for referee/official scheduling, availability management, and self-service portal — modeled after the existing scorekeeper system.

---

## Current State Summary

**What exists today:**

| Capability | Scorekeeper | Referee/Official |
|---|---|---|
| League-level roster | `league_scorekeepers` table | `league_staff` table (name-based, no FK to profiles) |
| Game assignment | `game_scorekeeper_assignments` table (FK → profiles) | `game_officials` table (name string, no FK → profiles) |
| Self-service portal | Full token-based portal at `/scorekeeper/` | None |
| Availability tracking | `scorekeeper_availability` table | None |
| Swap requests | `scorekeeper_swap_requests` table | None |
| Payment tracking | `payment_status`, `payment_amount` on assignments | None |
| Auto-assignment | `autoAssignScorekeepers()` in scorekeeper-management.ts | None |
| Session/auth | `scorekeeper_sessions` table, token-based cookies | None |
| Admin UI | Full management in league-builder | Basic list + assign modal (`apps/league-builder/src/components/referees/`) |

**Key gap:** Referees are stored as name strings on `game_officials` with no link to user profiles, no portal access, no availability, and no self-service. The scorekeeper system is the gold-standard pattern to replicate.

---

## 1. Database Schema Changes

### 1a. New Table: `league_referees`

Mirrors `league_scorekeepers` (`packages/database/src/types.ts:4689`). Links referees to user profiles instead of being name-only strings.

```sql
CREATE TABLE league_referees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id     UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  referee_id    UUID REFERENCES profiles(id),          -- nullable for unregistered refs
  display_name  TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'active',         -- active | inactive
  hired_date    DATE,
  game_fee      NUMERIC(10,2),                          -- per-game flat fee (beer league standard)
  game_fee_cents INTEGER NOT NULL DEFAULT 0,
  certification TEXT,                                    -- e.g., "Hockey Canada Level 3"
  can_referee   BOOLEAN NOT NULL DEFAULT TRUE,
  can_linesman  BOOLEAN NOT NULL DEFAULT TRUE,
  max_games_per_week INTEGER,
  preferred_days INTEGER[],                              -- 0=Sun..6=Sat
  total_assignments  INTEGER NOT NULL DEFAULT 0,
  completed_assignments INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, referee_id),
  UNIQUE(league_id, email)
);

-- RLS: league owners/admins can manage; referees can read own row
ALTER TABLE league_referees ENABLE ROW LEVEL SECURITY;
```

### 1b. New Table: `referee_availability`

Mirrors `scorekeeper_availability` (`packages/database/src/types.ts:8541`).

```sql
CREATE TABLE referee_availability (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_id        UUID NOT NULL REFERENCES league_referees(id) ON DELETE CASCADE,
  league_id         UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  day_of_week       INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  availability_type TEXT NOT NULL DEFAULT 'available',  -- available | unavailable | preferred
  is_recurring      BOOLEAN NOT NULL DEFAULT TRUE,
  specific_date     DATE,                                -- for one-off overrides
  notes             TEXT,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE referee_availability ENABLE ROW LEVEL SECURITY;
```

### 1c. New Table: `referee_sessions`

Mirrors `scorekeeper_sessions` (`packages/database/src/types.ts:8684`). Token-based portal access.

```sql
CREATE TABLE referee_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token                 TEXT NOT NULL UNIQUE,
  session_type          TEXT NOT NULL DEFAULT 'multi',   -- single | multi
  league_id             UUID NOT NULL REFERENCES leagues(id),
  league_referee_id     UUID REFERENCES league_referees(id),
  referee_id            UUID REFERENCES profiles(id),
  game_id               UUID REFERENCES games(id),       -- for single-game sessions
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES profiles(id),
  expires_at            TIMESTAMPTZ NOT NULL,
  deactivated_at        TIMESTAMPTZ,
  deactivated_by        UUID REFERENCES profiles(id),
  deactivation_reason   TEXT,
  access_count          INTEGER NOT NULL DEFAULT 0,
  last_accessed_at      TIMESTAMPTZ,
  device_info           JSONB
);

ALTER TABLE referee_sessions ENABLE ROW LEVEL SECURITY;
```

### 1d. New Table: `referee_swap_requests`

Mirrors `scorekeeper_swap_requests` (`packages/database/src/types.ts:8780`).

```sql
CREATE TABLE referee_swap_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id                  UUID NOT NULL REFERENCES games(id),
  requesting_referee_id    UUID NOT NULL REFERENCES league_referees(id),
  accepting_referee_id     UUID REFERENCES league_referees(id),
  status                   TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected | cancelled
  reason                   TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at              TIMESTAMPTZ,
  resolved_by              UUID REFERENCES profiles(id)
);

ALTER TABLE referee_swap_requests ENABLE ROW LEVEL SECURITY;
```

### 1e. Modify Existing Table: `game_officials`

Current schema (`packages/database/src/types.ts:2668`) stores `name` as a plain string. Add FK to `league_referees` for structured tracking while keeping `name` for backwards compatibility.

```sql
ALTER TABLE game_officials
  ADD COLUMN league_referee_id UUID REFERENCES league_referees(id),
  ADD COLUMN assignment_status TEXT NOT NULL DEFAULT 'confirmed',  -- confirmed | pending | declined
  ADD COLUMN payment_status    TEXT DEFAULT 'pending',             -- pending | paid
  ADD COLUMN payment_amount    NUMERIC(10,2),
  ADD COLUMN paid_at           TIMESTAMPTZ,
  ADD COLUMN assigned_by       UUID REFERENCES profiles(id),
  ADD COLUMN confirmed_at      TIMESTAMPTZ,
  ADD COLUMN checked_in_at     TIMESTAMPTZ,
  ADD COLUMN notes             TEXT;
```

### 1f. Role Additions

No new database enum needed. The system uses:
- `league_referees` table membership → "is a referee for this league"
- `league_memberships.role` stays as-is (owner/admin/member)
- `referee_sessions` token → portal access (same pattern as `scorekeeper_sessions`)

This avoids polluting the `league_memberships` role enum — referees are a separate workforce pool, not league members (same design decision made for scorekeepers via `league_scorekeepers`).

---

## 2. Referee Portal (League Sites)

### 2a. Routing Structure

Mirror the scorekeeper routing at `apps/league-sites/src/app/[leagueSlug]/scorekeeper/`.

```
apps/league-sites/src/app/[leagueSlug]/referee/
  ├── page.tsx              # Entry: token check → route or show TokenEntryPage
  ├── layout.tsx            # Minimal layout (no site header/footer)
  ├── dashboard/
  │   └── page.tsx          # Multi-game dashboard
  ├── schedule/
  │   └── page.tsx          # Full season schedule with availability overlay
  └── availability/
      └── page.tsx          # Set recurring + one-off availability
```

### 2b. Authentication Flow

Reuse the exact scorekeeper session pattern from `apps/league-sites/src/lib/actions/scorekeeper.ts`:

1. **Token entry** → 16-char alphanumeric token (same `crypto.randomBytes()` generation)
2. **Validation** → rate limiting, IP tracking, token lookup in `referee_sessions`
3. **Cookie** → `ref_session` (httpOnly, secure, sameSite=lax) — separate from `sk_session`
4. **Session check** → `getRefereeSession()` on every server component render

Extract shared token infrastructure into `apps/league-sites/src/lib/actions/shared-session.ts` to avoid duplicating rate-limiting and token validation logic.

### 2c. Referee Dashboard

**What the referee sees:**

| Section | Data Source | Notes |
|---|---|---|
| Upcoming assignments | `game_officials` WHERE `league_referee_id` = self, game status = scheduled | Shows date, time, location, teams, role (referee vs linesman) |
| Completed games | Same query, status = completed | Last 10 games |
| My availability | `referee_availability` for current referee | Editable weekly grid |
| Swap requests | `referee_swap_requests` (outgoing + incoming) | Same UX as scorekeeper swaps |
| Season stats | Computed: total games, games this month, earnings | Summary cards at top |
| Game fee info | `league_referees.game_fee` | Show per-game rate |

### 2d. Differences from Scorekeeper Flow

| Aspect | Scorekeeper | Referee |
|---|---|---|
| Primary action | Score a live game (timer, goals, penalties) | View assignment, confirm, check in |
| Game-day interaction | Full scoring interface (`ScoringInterface.tsx`) | Check-in button + basic game notes |
| Multiple roles per game | 1 scorekeeper per game | 1-3 officials per game (referee + linesmen) |
| Role field | N/A (always scorekeeper) | `game_officials.role` — "referee" or "linesman" |
| Availability UI | Simple day-of-week toggles | Day-of-week + time windows (refs work specific time slots) |
| Payment model | Hourly rate | Per-game flat fee |
| Post-game action | Verify stats, upload scoresheet | Confirm game completed (optional incident report) |

### 2e. Components

New components at `apps/league-sites/src/components/referee/`:

```
referee/
  ├── TokenEntryPage.tsx           # Reuse pattern from scorekeeper/TokenEntryPage.tsx
  ├── RefereeDashboardView.tsx     # Upcoming games, stats, swaps
  ├── RefereeScheduleView.tsx     # Season view with availability overlay
  ├── AvailabilityEditor.tsx       # Weekly grid + one-off date overrides
  ├── SwapRequestModal.tsx         # Request game swap (mirror scorekeeper version)
  ├── GameCheckIn.tsx              # Simple check-in for assigned game
  └── IncidentReportForm.tsx       # Post-game incident notes (optional)
```

---

## 3. Admin Scheduling Dashboard (League Builder)

### 3a. Existing Admin UI

Currently at `apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/settings/referees/page.tsx` with components in `apps/league-builder/src/components/referees/`. This handles basic CRUD for `league_staff` records and name-based assignment via `game_officials`.

### 3b. Enhanced Admin Pages

**Referee Management** (upgrade existing page):
- Migrate from `league_staff` to `league_referees` table
- Add availability view per referee (read from `referee_availability`)
- Show assignment history and stats
- Send/revoke portal tokens
- Track payment status

**Game Assignment View** (new or enhanced):

Location: `apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/schedule/` (alongside existing schedule views)

| Feature | Implementation |
|---|---|
| Assign refs to games | Modal with referee list filtered by availability + role (ref vs linesman) |
| Bulk assign | `bulkAssignRefereeToGames()` already exists in `apps/league-builder/src/lib/actions/referee-management.ts` — enhance to use `league_referees` |
| Auto-assign | New `autoAssignReferees(leagueId, options)` mirroring `autoAssignScorekeepers()` — respects availability, max games/week, preferred days |
| Availability conflicts | Visual indicator when assigning a ref who is unavailable |
| Unassigned games alert | Badge/filter showing games missing required officials |

**Unified Officials Column on Schedule:**

Add an "Officials" column to the existing schedule table at `apps/league-builder/src/components/schedule/` showing assigned referee(s) + scorekeeper per game. One glance to see coverage gaps.

### 3c. Notification Triggers

| Event | Channel | Recipient |
|---|---|---|
| New assignment | Email | Referee |
| Assignment removed | Email | Referee |
| Swap request received | Email | Target referee |
| Swap approved/rejected | Email | Requesting referee |
| Game rescheduled | Email | All assigned officials |
| Unassigned games (48hr warning) | Email + dashboard alert | League admin |
| Referee checked in | Dashboard update | League admin |

Email delivery: use existing email infrastructure (Resend or similar) already used for scorekeeper token emails in `apps/league-builder/src/lib/actions/scorekeeper-admin.ts`.

---

## 4. Implementation Phases

### Phase 1 — MVP (Close BMHL Deal)

Goal: Give BMHL a working referee scheduling system that's visibly better than spreadsheets.

| # | Task | Est. Days | Notes |
|---|---|---|---|
| 1 | **Migration: `league_referees` table** | 0.5 | Schema + RLS policies. Use `/migrate` skill. |
| 2 | **Migration: `referee_availability` table** | 0.5 | Schema + RLS. |
| 3 | **Migration: `referee_sessions` table** | 0.5 | Schema + RLS. |
| 4 | **Migration: ALTER `game_officials`** | 0.5 | Add `league_referee_id` FK + new columns. Backfill existing name-only records where possible. |
| 5 | **Server actions: `referee-management.ts` upgrade** | 1 | Refactor existing `apps/league-builder/src/lib/actions/referee-management.ts` to use `league_referees` instead of `league_staff`. CRUD + assignment + token generation. |
| 6 | **Admin UI: Referee roster management** | 1 | Upgrade `apps/league-builder/src/components/referees/` — add/edit/deactivate referees, send portal tokens, view availability. |
| 7 | **Admin UI: Assign refs to games** | 1 | Enhance `assign-referee-modal.tsx` to show availability, filter by role, link to `league_referees`. |
| 8 | **Referee portal: Token entry + session** | 1 | `apps/league-sites/src/app/[leagueSlug]/referee/page.tsx` — extract shared session logic from scorekeeper. |
| 9 | **Referee portal: Dashboard** | 1.5 | Upcoming assignments, completed games, basic stats. |
| 10 | **Referee portal: Availability editor** | 1 | Weekly grid with recurring slots. |
| 11 | **Sync types + integration test** | 0.5 | `/sync-types`, verify FK relationships, test RLS policies. |
| 12 | **Email notifications: assignment + token** | 0.5 | Reuse scorekeeper email patterns. |
| | **Phase 1 Total** | **~9 days** | |

**Phase 1 delivers:** Admin can manage a referee roster, assign refs to games with availability awareness, refs get a portal to see their schedule and set availability.

### Phase 2 — Full Feature

| # | Task | Est. Days | Notes |
|---|---|---|---|
| 13 | **Auto-assign algorithm** | 2 | `autoAssignReferees()` — constraint solver respecting availability, max games/week, role (ref vs linesman), fair distribution. Mirror `autoAssignScorekeepers()`. |
| 14 | **Swap requests** | 2 | `referee_swap_requests` table + portal UI + admin approval flow. Mirror scorekeeper swap system. |
| 15 | **Payment tracking** | 1.5 | Per-game fee tracking, payment status on assignments, admin payment dashboard. |
| 16 | **Unified schedule view** | 1.5 | Combined officials column on admin schedule — refs + scorekeeper per game, coverage gap alerts. |
| 17 | **Game check-in** | 1 | Referee checks in on game day via portal — admin sees real-time coverage. |
| 18 | **Incident reports** | 1 | Post-game incident/ejection notes from referee portal, stored on `game_officials`. |
| 19 | **48hr unassigned alerts** | 0.5 | Cron/webhook that emails admin about games missing officials within 48 hours. |
| 20 | **Mobile-responsive polish** | 1 | Referee portal is phone-first (refs check schedules on mobile). |
| 21 | **Scorekeeper scheduling parity** | 1 | Backport any new scheduling UX improvements (availability grid, auto-assign) to scorekeeper system. |
| | **Phase 2 Total** | **~11.5 days** | |

**Phase 2 delivers:** Auto-scheduling, swap workflow, payments, check-in, and a unified admin view of all game officials.

---

## 5. Sales Pitch Paragraph

> BeerLeagueHockey.ca is building a complete **Official Scheduling System** that eliminates the spreadsheet chaos of managing referees and scorekeepers. League administrators get a single dashboard to manage their referee roster, set per-game fees, and assign officials to games — with automatic conflict detection based on each ref's availability. Referees get their own secure portal where they can view upcoming assignments, update their availability week-by-week, request game swaps with other refs, and check in on game day. The system auto-assigns referees to unassigned games based on availability, preferred days, and workload limits — and alerts admins 48 hours before any game that's still missing coverage. It's the same battle-tested architecture behind our scorekeeper system (which BMHL is already using), extended to handle the unique needs of officials: multiple refs per game, referee vs. linesman roles, per-game flat fees, and incident reporting. No more texting refs individually, no more last-minute scrambles — just a clean system that keeps your games staffed.

---

## Appendix: Key File References

| Area | Path |
|---|---|
| Database types (source of truth) | `packages/database/src/types.ts` |
| Scorekeeper portal (pattern to mirror) | `apps/league-sites/src/app/[leagueSlug]/scorekeeper/` |
| Scorekeeper session logic | `apps/league-sites/src/lib/actions/scorekeeper.ts` |
| Scorekeeper dashboard actions | `apps/league-sites/src/lib/actions/scorekeeper-dashboard.ts` |
| Scorekeeper swap actions | `apps/league-sites/src/lib/actions/scorekeeper-swaps.ts` |
| Scorekeeper admin (token gen, assignment) | `apps/league-builder/src/lib/actions/scorekeeper-admin.ts` |
| Scorekeeper management (CRUD, auto-assign) | `apps/league-builder/src/lib/actions/scorekeeper-management.ts` |
| Scorekeeper components (19 files) | `apps/league-sites/src/components/scorekeeper/` |
| Existing referee management | `apps/league-builder/src/lib/actions/referee-management.ts` |
| Existing referee admin page | `apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/settings/referees/page.tsx` |
| Existing referee components | `apps/league-builder/src/components/referees/` |
| Permission checks | `apps/league-builder/src/lib/actions/permissions.ts` |
| Captain dashboard (role-routing pattern) | `apps/league-sites/src/app/[leagueSlug]/captain/page.tsx` |
| Player profile hook (role checks) | `apps/league-sites/src/hooks/usePlayerProfile.ts` |
| Schedule generation | `apps/league-builder/src/lib/schedule/actions.ts` |
| Game queries | `packages/data/src/queries/games.ts` |

---

## BMHL-Specific Requests (Post-Close)

### Theme Color Control (Per-League)
- **Request:** Rob wants BMHL's league site to use their brand blue as the dark mode primary color instead of default black/white
- **Scope:** Per-league theme config — primary color, dark mode accent, logo
- **Likely implementation:** Add `theme_primary_color`, `theme_dark_color` columns to `leagues` table (or a `league_themes` table). CSS variables injected at the layout level per leagueSlug.
- **Priority:** Nice-to-have for onboarding, not a blocker
- **Logged:** 2026-03-09

### Theme Implementation Notes
- **Approach:** CSS custom properties (vars) injected server-side in `apps/league-sites/src/app/[leagueSlug]/layout.tsx` based on league config
- **Why not Tailwind dynamic classes:** Tailwind JIT can't handle runtime dynamic class names — CSS vars are the correct bridge
- **Pattern:** `style={{ '--color-primary': league.theme_primary, '--color-dark': league.theme_dark }}` on root element
- **Default fallback:** If no theme set, existing black/white defaults apply — zero regression for other leagues
- **Constraint:** Tailwind theme tokens in `tailwind.config.ts` need to reference CSS vars, not hardcoded values — requires one audit pass before this feature ships
