# BMHL Schedule Management API Architecture

## Domain Invariants

### Core Truths (Non-Negotiable)
1. **Tenant Isolation**: All games MUST belong to exactly one league via `league_id`. RLS policies enforce this boundary.
2. **Schedule Integrity**: A game can only be rescheduled once at a time. Chain: `original -> rescheduled_version (rescheduled_from = original.id)`.
3. **Status Transitions**: Valid state machine:
   - `scheduled` → `in_progress` → `completed`
   - `scheduled` → `postponed` (bulk weather cancellation)
   - `scheduled` → `cancelled` (permanent cancellation)
   - `postponed` → `scheduled` (via reschedule)
   - Invalid: `completed` → anything, `cancelled` → anything
4. **Conflict Detection Source of Truth**: The `ConflictDetectionService` is authoritative for scheduling validation. Reschedule APIs MUST call it before committing.
5. **Venue/Team/Scorekeeper Availability**: At scheduled_at time, a venue can host only ONE game, a team can play only ONE game, a scorekeeper can work only ONE game (within game_duration + buffer).
6. **Audit Trail**: Every reschedule/cancellation MUST record: timestamp, user_id, reason. These fields are NOT NULL after status change.
7. **Idempotency**: Reschedule operations are NOT idempotent by design (each creates new game record). Caller responsible for preventing duplicate requests.

### Invariants That Break Under Concurrency
1. **Venue Double-Booking**: Two concurrent reschedule requests could book same venue at same time.
   - **Mitigation**: Schedule rules check runs in transaction with SERIALIZABLE isolation OR application-level locking.
2. **Team Schedule Conflict**: Two concurrent reschedules could violate min_hours_between_games for same team.
   - **Mitigation**: Conflict check → write must be atomic.
3. **Reschedule Chain Race**: Two concurrent reschedules of same game could create multiple children.
   - **Mitigation**: Optimistic locking - check `status = 'scheduled'` in UPDATE WHERE clause.

## Database Schema Design

### Existing Schema (from migrations)

```sql
-- games table (from 20260125_add_league_id_to_games_and_stats.sql + 20260129_add_postponed_status.sql)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,

  -- Game participants
  home_team_id UUID NOT NULL REFERENCES teams(id),
  away_team_id UUID NOT NULL REFERENCES teams(id),
  venue_id UUID NOT NULL REFERENCES venues(id),
  scorekeeper_id UUID REFERENCES profiles(id),

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  status game_status NOT NULL DEFAULT 'scheduled', -- ENUM: scheduled, in_progress, completed, cancelled, postponed

  -- Scores (if completed)
  home_score INTEGER,
  away_score INTEGER,

  -- Reschedule tracking
  rescheduled_from UUID REFERENCES games(id) ON DELETE SET NULL,
  reschedule_reason TEXT,
  rescheduled_at TIMESTAMPTZ,
  rescheduled_by UUID REFERENCES profiles(id),

  -- Cancellation tracking
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  cancellation_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT games_different_teams CHECK (home_team_id <> away_team_id),
  CONSTRAINT games_valid_scores CHECK (
    (status = 'completed' AND home_score IS NOT NULL AND away_score IS NOT NULL)
    OR (status <> 'completed')
  )
);

-- Indexes
CREATE INDEX idx_games_league_id ON games(league_id);
CREATE INDEX idx_games_league_season ON games(league_id, season_id);
CREATE INDEX idx_games_league_status ON games(league_id, status);
CREATE INDEX idx_games_league_scheduled ON games(league_id, scheduled_at);
CREATE INDEX idx_games_rescheduled_from ON games(rescheduled_from) WHERE rescheduled_from IS NOT NULL;
CREATE INDEX idx_games_status_postponed ON games(status) WHERE status = 'postponed';
CREATE INDEX idx_games_postponed_queue ON games(league_id, status, scheduled_at) WHERE status = 'postponed';

-- RLS Policies
-- Users can view games in leagues they belong to
-- League admins can manage games
-- Captains can verify games (UPDATE only for their team's games)
```

### Schema Observations

**Strengths:**
- Good multi-tenant isolation via `league_id` + RLS
- Reschedule chain tracking via `rescheduled_from` (acyclic graph)
- Comprehensive audit fields
- Partial indexes for common admin queries (postponed queue)

**Potential Issues:**
1. **No unique constraint on rescheduled_from**: Multiple games could claim to be rescheduled versions of same original.
   - **Risk**: Race condition during concurrent reschedules.
   - **Mitigation**: Application logic checks `status = 'scheduled'` in WHERE clause + use optimistic locking pattern.

2. **No CHECK constraint on cancellation audit fields**: `status = 'cancelled'` doesn't guarantee `cancelled_at IS NOT NULL`.
   - **Risk**: Incomplete audit trail.
   - **Mitigation**: Database trigger `auto_set_cancellation_timestamp()` handles this BUT allows manual override.

3. **No exclusion constraint for venue/time conflicts**: Database allows double-booking.
   - **Risk**: Application conflict detection could have bugs.
   - **Mitigation**: Could add `EXCLUDE USING gist (venue_id WITH =, tstzrange(scheduled_at, scheduled_at + game_duration) WITH &&)` BUT this requires knowing game_duration at constraint time. Better: rely on conflict service + transactions.

## Transaction Boundaries & Isolation

### Critical Paths

#### 1. Reschedule Game (Single)
```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Step 1: Optimistic lock - check original game is reschedulable
UPDATE games
SET status = 'postponed',
    cancelled_at = NOW(),
    cancelled_by = $user_id,
    cancellation_reason = $reason
WHERE id = $original_game_id
  AND status = 'scheduled'  -- Optimistic lock
  AND league_id = $league_id -- Tenant safety
RETURNING *;
-- If rowCount = 0, game was already rescheduled/cancelled -> abort

-- Step 2: Run conflict detection (application logic)
-- ConflictDetectionService.checkGameConflicts(newGameData)
-- If conflicts with severity='error' -> ROLLBACK

-- Step 3: Create new game
INSERT INTO games (
  league_id, season_id, division_id,
  home_team_id, away_team_id, venue_id, scorekeeper_id,
  scheduled_at, status,
  rescheduled_from, reschedule_reason, rescheduled_at, rescheduled_by
) VALUES (...) RETURNING *;

COMMIT;
```

**Isolation Level**: `SERIALIZABLE` to prevent phantom reads during conflict check.
**Idempotency**: NOT idempotent. Caller must prevent duplicate submissions (client-side disabling, rate limiting).
**Race Condition**: Two concurrent reschedules both pass optimistic lock check before either commits.
  - **Resolution**: SERIALIZABLE isolation + conflict check reads will conflict → one transaction aborts with serialization failure → retry logic in API handler.

#### 2. Bulk Reschedule (Weather Cancellation)
```sql
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED; -- Lower isolation OK since we're only marking postponed

-- Step 1: Validate all games exist and are reschedulable
SELECT id, status FROM games
WHERE id = ANY($game_ids)
  AND league_id = $league_id
FOR UPDATE; -- Pessimistic lock to prevent concurrent modifications

-- Check all have status = 'scheduled'
-- If any don't exist or wrong status -> ROLLBACK with specific error

-- Step 2: Bulk update to postponed
UPDATE games
SET status = 'postponed',
    cancelled_at = NOW(),
    cancelled_by = $user_id,
    cancellation_reason = $reason
WHERE id = ANY($game_ids)
  AND league_id = $league_id;

COMMIT;
```

**Isolation Level**: `READ COMMITTED` sufficient (no conflict checks, just bulk status change).
**Atomicity**: All games postponed OR none (transaction boundary).
**Idempotency**: Safe to retry (status change is idempotent if already postponed).

#### 3. Cancel Game (Permanent)
```sql
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

UPDATE games
SET status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = $user_id,
    cancellation_reason = $reason,
    cancellation_notes = $notes
WHERE id = $game_id
  AND league_id = $league_id
  AND status IN ('scheduled', 'postponed') -- Can cancel postponed games
RETURNING *;
-- If rowCount = 0, game doesn't exist or already completed/cancelled

COMMIT;
```

**Isolation Level**: `READ COMMITTED` sufficient (single row operation).
**Idempotency**: Safe (setting cancelled status multiple times is harmless).

## Query Patterns & Indexes

### API Endpoint Access Patterns

#### GET /api/[tenant]/schedule
**Query**: Paginated list of games with filters
```sql
SELECT
  g.id, g.scheduled_at, g.status,
  ht.id as home_team_id, ht.name as home_team_name, ht.logo_url as home_team_logo,
  at.id as away_team_id, at.name as away_team_name, at.logo_url as away_team_logo,
  g.home_score, g.away_score,
  v.id as venue_id, v.name as venue_name,
  d.id as division_id, d.name as division_name
FROM games g
INNER JOIN teams ht ON g.home_team_id = ht.id
INNER JOIN teams at ON g.away_team_id = at.id
INNER JOIN venues v ON g.venue_id = v.id
LEFT JOIN divisions d ON g.division_id = d.id
WHERE g.league_id = $league_id
  AND ($division_id IS NULL OR g.division_id = $division_id)
  AND ($team_id IS NULL OR g.home_team_id = $team_id OR g.away_team_id = $team_id)
  AND ($venue_id IS NULL OR g.venue_id = $venue_id)
  AND ($status IS NULL OR g.status = $status)
  AND g.scheduled_at >= $start_date
  AND g.scheduled_at <= $end_date
ORDER BY g.scheduled_at ASC
LIMIT $limit OFFSET $offset;
```

**Indexes Used**:
- `idx_games_league_scheduled` (league_id, scheduled_at) - covers date range filter
- Potential N+1 risk: 4 joins per row. Consider:
  - **Option A**: Use `.select()` with joins (current approach, simple)
  - **Option B**: Fetch games, then batch fetch teams/venues (2 extra queries, fewer joins)
  - **Recommendation**: Option A for <1000 rows, Option B for large result sets.

**Additional Indexes Needed**:
```sql
-- For team_id filter (OR clause is not index-friendly)
CREATE INDEX idx_games_home_team ON games(home_team_id, league_id, scheduled_at);
CREATE INDEX idx_games_away_team ON games(away_team_id, league_id, scheduled_at);
-- OR use GIN index for array search:
-- CREATE INDEX idx_games_teams_array ON games USING GIN (ARRAY[home_team_id, away_team_id]);

-- For admin conflict check (admin view only)
CREATE INDEX idx_games_league_scheduled_status ON games(league_id, scheduled_at, status)
  WHERE status = 'scheduled';
```

#### GET /api/[tenant]/games/[gameId]
**Query**: Single game with full details
```sql
-- Main game query
SELECT
  g.*,
  ht.*, at.*, v.*, d.*,
  -- Team rosters (separate query or JOIN)
FROM games g
INNER JOIN teams ht ON g.home_team_id = ht.id
INNER JOIN teams at ON g.away_team_id = at.id
INNER JOIN venues v ON g.venue_id = v.id
LEFT JOIN divisions d ON g.division_id = d.id
WHERE g.id = $game_id
  AND g.league_id = $league_id; -- RLS enforces this, but explicit is safer

-- Player stats (separate query)
SELECT player_id, SUM(goals), SUM(assists), SUM(pim)
FROM game_stats
WHERE game_id = $game_id
GROUP BY player_id;

-- Reschedule history
SELECT * FROM get_game_reschedule_history($game_id);
```

**Index Used**: Primary key lookup (efficient).

### Hot Paths & Scale Considerations

**Hot Paths**:
1. Schedule query endpoint - hit on every page load of schedule UI
2. Conflict detection service - called during admin schedule creation

**Scale Estimates** (20-30 SMB clients, assume 10 teams/league, 20 games/season):
- Total games: ~600 per season across all leagues
- Peak load: Schedule page views during game nights (50 req/min)
- Conflict checks: Admin-only, infrequent (1-2 per day per league)

**Bottlenecks**:
1. **N+1 Queries**: Schedule endpoint joins 4 tables per row. At 100 games → 100 rows × 4 joins = overhead.
   - **Mitigation**: Supabase PostgREST optimizes joins. Monitor with EXPLAIN ANALYZE.
2. **Conflict Detection**: O(N) scans of team schedules, venue availability.
   - **Current Complexity**: For each game check, scans all games for 2 teams + venue + scorekeeper.
   - **At Scale**: 600 games, 2 teams → up to 1200 row scans per check (in-memory after index scan, but still).
   - **Mitigation**: Existing indexes (`idx_games_league_scheduled`, `idx_games_status_postponed`) cover this. No action needed at current scale.

## Scale, Caching, & Backpressure

### Caching Strategy

**Schedule Query Endpoint**:
- **TTL**: 60 seconds (schedule changes infrequently during normal operation)
- **Invalidation**: Invalidate on game create/update/delete for that league_id
- **Implementation**: Next.js App Router caching (revalidate: 60) + React Query client-side
- **Cache Key**: `schedule:{league_id}:{filters}:{pagination}`

**Game Detail Endpoint**:
- **TTL**: 300 seconds (5 min) for completed games, 30 seconds for upcoming/in-progress
- **Invalidation**: Invalidate on game update or stat entry
- **Cache Key**: `game:{game_id}`

**Conflict Detection**:
- **Do NOT cache**: Results are time-sensitive and specific to proposed game time.
- **Optimization**: Memoize schedule rules fetch per request (already done via React cache()).

### Async vs Sync

**Synchronous** (blocking API response):
- Reschedule game (must return new game_id to redirect user)
- Cancel game (immediate feedback required)
- Bulk reschedule (weather cancellation is time-sensitive, but...)

**Asynchronous** (queue-based):
- ~~Bulk reschedule for >10 games~~ - At current scale (20-30 leagues), even 50 games is <1s to update. Stay sync for simplicity.
- Email notifications after reschedule (definitely async)
- Audit log export (if implemented)

**Recommendation**: All endpoints remain synchronous. Add async email/notification worker later if needed.

### Rate Limiting

**Admin Endpoints** (reschedule, cancel):
- **Limit**: 10 requests/minute per league_id
- **Reason**: Prevent accidental bulk operations via script
- **Implementation**: Next.js middleware + Redis (or Upstash for serverless)

**Public Endpoints** (schedule query):
- **Limit**: 60 requests/minute per IP
- **Reason**: Prevent scraping, but allow mobile app refresh

## Migration Strategy

No schema changes required. All tables exist from migrations:
- `games` table: ✅ Complete
- `schedule_rules` table: ✅ Complete
- RLS policies: ✅ Configured

**Migration Steps**: None (API-only implementation)

## Failure Modes & Recovery

### What Can Go Wrong

#### 1. Network Partition During Reschedule Transaction
**Scenario**: Transaction commits, but client never receives response (network timeout).
**Result**: New game created, old game postponed, but client thinks it failed.
**Recovery**:
- Client retries → gets "Game already postponed" error (optimistic lock fails)
- Client must query game to find new rescheduled version
- **API Response Design**: Return both `newGameId` AND `originalGameId` so client can query reschedule history.

#### 2. Conflict Detection Service Throws Exception
**Scenario**: Bug in conflict detection code crashes during transaction.
**Result**: Transaction aborts (good), but client gets 500 error.
**Recovery**:
- Log error with full context (game data, user_id, league_id)
- Return 500 with safe error message: "Conflict check failed. Please try again."
- **Monitoring**: Alert if >3 conflict check failures in 5 minutes.

#### 3. Bulk Reschedule Partial Failure
**Scenario**: Transaction aborts after updating 5 of 10 games (e.g., database connection lost).
**Result**: Transaction rollback → 0 games updated (good).
**Recovery**: Client retries entire bulk operation. Idempotent status update.

#### 4. Duplicate Reschedule Requests (User Double-Click)
**Scenario**: User clicks "Reschedule" twice in 200ms.
**Result**: Two API requests, both pass optimistic lock check before first commits.
**Recovery**:
- SERIALIZABLE isolation causes second transaction to abort with serialization error.
- API catches serialization error, returns 409 Conflict: "Game was already rescheduled."
- Client shows friendly message: "Game has already been rescheduled."

#### 5. RLS Policy Bypass Attempt
**Scenario**: Attacker modifies tenant slug in URL to access other league's games.
**Result**: RLS policy blocks query (`league_id IN (SELECT league_id FROM league_memberships WHERE user_id = auth.uid())`).
**Recovery**: Supabase returns empty result set. API returns 404 Not Found (don't leak "league exists but you can't access it").

### Monitoring & Alerting

**Metrics to Track**:
1. **Reschedule API Latency**: p50, p95, p99 (target: <500ms)
2. **Conflict Check Duration**: Median, max (target: <200ms)
3. **Transaction Abort Rate**: Count of serialization failures (expect <1% of reschedule requests)
4. **Bulk Reschedule Size**: Histogram of game count per request (detect abuse)

**Alerts**:
- P1: Reschedule API error rate >5% for 5 minutes
- P2: Conflict check duration p95 >1s (indicates index problem)
- P2: Transaction abort rate >10% (indicates concurrency issue)

**Data Quality Checks** (daily cron job):
1. Games with `status = 'cancelled'` but `cancelled_at IS NULL` → should be 0
2. Games with `status = 'postponed'` but no rescheduled child → orphaned postponed games (expected during weather event, alert if >7 days old)
3. Reschedule chains longer than 3 deep → indicates problematic game, manual review

## Recommended Architecture

### API Routing Structure

```
/src/app/api/[tenant]/
├── schedule/
│   └── route.ts                    # GET - Schedule query endpoint
├── games/
│   ├── [gameId]/
│   │   ├── route.ts                # GET - Game detail endpoint
│   │   ├── reschedule/
│   │   │   └── route.ts            # POST - Reschedule single game
│   │   └── cancel/
│   │       └── route.ts            # POST - Cancel game
│   └── bulk-reschedule/
│       └── route.ts                # POST - Bulk reschedule (weather)
```

### Shared Utilities

```typescript
// /src/lib/api/tenant-validation.ts
export async function validateTenantAccess(
  tenantSlug: string,
  userId: string,
  requiredRole?: 'admin' | 'owner'
): Promise<{ leagueId: string } | null>;

// /src/lib/api/error-handling.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) { super(message); }
}

export function handleApiError(error: unknown): NextResponse;

// /src/lib/api/auth.ts
export async function requireAuth(): Promise<{ userId: string }>;
export async function requireLeagueAdmin(leagueId: string): Promise<boolean>;
```

### Sequence Diagrams

#### Reschedule Game (Happy Path)
```
Client -> API: POST /api/bmhl/games/123/reschedule
                { newScheduledAt, reason }
API -> Auth: Validate user is league admin
Auth -> API: userId
API -> DB: getLeagueBySlug('bmhl')
DB -> API: { leagueId: 'uuid-123' }
API -> DB: BEGIN TRANSACTION (SERIALIZABLE)
API -> DB: UPDATE games SET status='postponed' WHERE id=123 AND status='scheduled'
DB -> API: 1 row updated
API -> ConflictService: checkGameConflicts(newGameData, rules)
ConflictService -> DB: Query team schedule, venue availability
DB -> ConflictService: Existing games data
ConflictService -> API: { hasConflicts: false }
API -> DB: INSERT INTO games (..., rescheduled_from=123)
DB -> API: { id: 'new-uuid-456' }
API -> DB: COMMIT
API -> Client: 200 OK { newGameId: '456', conflicts: [] }
```

#### Reschedule with Conflict (Error Path)
```
Client -> API: POST /api/bmhl/games/123/reschedule
API -> ... (auth, transaction start)
API -> ConflictService: checkGameConflicts(newGameData, rules)
ConflictService -> API: { hasConflicts: true, conflicts: [{type: 'venue_overlap', severity: 'error'}] }
API -> DB: ROLLBACK
API -> Client: 409 Conflict {
                success: false,
                conflicts: [{ type: 'venue_overlap', message: '...', suggestion: '...' }]
              }
```

#### Bulk Reschedule (Weather Cancellation)
```
Client -> API: POST /api/bmhl/games/bulk-reschedule
                { gameIds: [1,2,3], reason: 'weather', action: 'postpone' }
API -> Auth: Validate user is league admin
API -> DB: BEGIN TRANSACTION
API -> DB: SELECT id, status FROM games WHERE id IN (1,2,3) FOR UPDATE
DB -> API: [{ id:1, status:'scheduled' }, { id:2, status:'scheduled' }, { id:3, status:'scheduled' }]
API: Validate all are 'scheduled'
API -> DB: UPDATE games SET status='postponed', cancelled_at=NOW(), cancelled_by=userId, cancellation_reason='weather'
           WHERE id IN (1,2,3)
DB -> API: 3 rows updated
API -> DB: COMMIT
API -> Client: 200 OK { success: true, postponedCount: 3, failedIds: [] }
```

## Testing Strategy

### Unit Tests
- Conflict detection service (mock Supabase client)
- Tenant validation helpers
- Error handling utilities

### Integration Tests
1. **Schedule Query**: Filter by division, team, date range, pagination
2. **Game Detail**: Full game data with stats, reschedule history
3. **Reschedule**: Happy path, conflict detection, concurrency (2 parallel requests)
4. **Bulk Reschedule**: All succeed, partial failure (1 game wrong status), transaction rollback
5. **Cancel Game**: Scheduled → cancelled, postponed → cancelled, completed → error

### Security Tests
1. **RLS Bypass**: Try accessing other league's games via tenant slug manipulation
2. **Authorization**: Non-admin tries to reschedule game
3. **SQL Injection**: Malicious input in filters (date range, team_id)

### Performance Tests
1. **Schedule Query**: 100 games, measure latency
2. **Bulk Reschedule**: 50 games, measure transaction time
3. **Conflict Check**: Game with 20 existing games for same team, measure check time

## Open Questions for Clarification

1. **Reschedule with Conflicts**: Should API allow reschedule if conflicts have `severity: 'warning'` (not 'error')? Or block all conflicts?
   - **Recommendation**: Block errors, allow warnings but return them in response.

2. **Bulk Reschedule New Dates**: Should `/bulk-reschedule` support immediately rescheduling to new dates, or just postpone and reschedule later via admin UI?
   - **Recommendation**: Phase 1 (MVP) only supports postpone. Phase 2 adds batch reschedule with conflict checks.

3. **Audit Log Visibility**: Should reschedule history be visible to all league members, or only admins?
   - **Recommendation**: All members can see reschedule history (transparency), but only admins see `cancelled_by` user_id.

4. **Notification System**: Should reschedule API trigger notifications (email/SMS to team captains)?
   - **Recommendation**: Yes, but async via queue (not in API transaction). Add webhook table entry for notification worker to process.
