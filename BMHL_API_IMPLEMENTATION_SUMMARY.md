# BMHL Schedule Management API - Implementation Summary

## Overview

Successfully implemented all 5 API endpoints for BMHL Schedule Management (Tasks 1.4-1.8), with complete conflict detection integration, multi-tenant isolation, and comprehensive error handling.

**Implementation Date:** January 29, 2026
**Status:** ✅ Complete - Ready for Testing

---

## Implemented Endpoints

### 1. Schedule Query API
**Endpoint:** `GET /api/[tenant]/schedule`
**File:** `src/app/api/[tenant]/schedule/route.ts`

**Features:**
- Multi-tenant routing with league slug validation
- Query filters: division_id, team_id, venue_id, start_date, end_date, status
- Pagination support (limit 1-100, offset)
- Returns games with full team, venue, division details
- Admin users get conflict indicators (hasConflicts field)
- Sorted by scheduled_at ascending

**Query Parameters:**
- `division_id` (optional): UUID
- `team_id` (optional): UUID - matches home OR away team
- `venue_id` (optional): UUID
- `start_date` (optional): ISO date string
- `end_date` (optional): ISO date string
- `status` (optional): scheduled | in_progress | completed | cancelled | postponed
- `limit` (optional): 1-100, default 50
- `offset` (optional): default 0

**Response Format:**
```typescript
{
  games: GameResponse[];
  pagination: { total: number; limit: number; offset: number };
}
```

---

### 2. Game Detail API
**Endpoint:** `GET /api/[tenant]/games/[gameId]`
**File:** `src/app/api/[tenant]/games/[gameId]/route.ts`

**Features:**
- Full game details with all relationships
- Team rosters (active players with jersey numbers, positions)
- Player stats aggregated by team (goals, assists, points, PIM, shots, saves)
- Venue with full address details
- Reschedule history (uses `get_game_reschedule_history()` DB function)
- Team season records (wins, losses, ties)
- Head-to-head season series

**Response Includes:**
- Basic game info (id, scheduledAt, status, scores)
- Home/away team details with rosters
- Venue with address
- Division (optional)
- Scorekeeper (optional)
- Player stats by team
- Reschedule history (if rescheduled)
- Team records and season series stats

**Use Case:** Powers MatchupHeader and PlayerStatsComparison UI components

---

### 3. Reschedule Game API
**Endpoint:** `POST /api/[tenant]/games/[gameId]/reschedule`
**File:** `src/app/api/[tenant]/games/[gameId]/reschedule/route.ts`

**Features:**
- Reschedules single game to new date/time
- Integrated conflict detection via ConflictDetectionService
- Returns 409 if conflicts with severity='error' detected
- Allows reschedule with warnings (severity='warning' or 'info')
- Optimistic locking pattern (checks status='scheduled' in WHERE clause)
- Optional venue/scorekeeper change during reschedule
- Creates audit trail (rescheduled_from, reschedule_reason, rescheduled_at, rescheduled_by)

**Request Body:**
```typescript
{
  newScheduledAt: string; // ISO 8601
  reason: string; // Required
  venueId?: string; // Optional: change venue
  scorekeeperId?: string; // Optional: change scorekeeper
}
```

**Response:**
```typescript
{
  success: boolean;
  newGameId?: string; // If successful
  conflicts?: SchedulingConflict[]; // If errors
  warnings?: SchedulingConflict[]; // If warnings
}
```

**Transaction Flow:**
1. Validate game is in 'scheduled' status
2. Fetch schedule rules
3. Run conflict detection on new proposed time
4. If error conflicts, return 409 and abort
5. Mark original game as 'postponed' (optimistic lock)
6. Create new game with rescheduled_from pointer
7. Return new game ID

**Authorization:** League admin or owner only

---

### 4. Bulk Reschedule API
**Endpoint:** `POST /api/[tenant]/games/bulk-reschedule`
**File:** `src/app/api/[tenant]/games/bulk-reschedule/route.ts`

**Features:**
- Bulk postpone multiple games (e.g., weather cancellation)
- Atomic transaction: ALL succeed or ALL fail
- Validates all games exist and are in 'scheduled' status
- Maximum 100 games per request (rate limiting)
- Returns detailed error report for failed games

**Request Body:**
```typescript
{
  gameIds: string[]; // Array of game UUIDs
  reason: string; // Required
  action: "postpone" | "reschedule_later"; // Only 'postpone' implemented in Phase 1
}
```

**Response:**
```typescript
{
  success: boolean;
  postponedCount?: number;
  failedIds?: string[];
  errors?: Array<{ gameId: string; reason: string }>;
}
```

**Use Case:** Weather cancellation - postpone 10 games at once, reschedule later via admin UI

**Phase 2 Enhancement:** `reschedule_later` action with batch rescheduling + conflict checks

**Authorization:** League admin or owner only

---

### 5. Cancel Game API
**Endpoint:** `POST /api/[tenant]/games/[gameId]/cancel`
**File:** `src/app/api/[tenant]/games/[gameId]/cancel/route.ts`

**Features:**
- Permanently cancels a game (no reschedule)
- Can cancel 'scheduled' or 'postponed' games
- Cannot cancel 'completed' games
- Idempotent (safe to retry on already-cancelled game)
- Auto-triggers `auto_set_cancellation_timestamp()` DB trigger
- Records cancellation audit trail

**Request Body:**
```typescript
{
  reason: string; // Required (e.g., 'weather', 'venue_unavailable', 'team_forfeit')
  notes?: string; // Optional additional details
}
```

**Response:**
```typescript
{
  success: boolean;
  gameId: string;
  status: string; // "cancelled"
  cancelledAt: string;
}
```

**Valid Status Transitions:**
- ✅ scheduled → cancelled
- ✅ postponed → cancelled
- ❌ completed → cancelled (error)
- ✅ cancelled → cancelled (idempotent)

**Authorization:** League admin or owner only

---

## Supporting Infrastructure

### Shared Utilities

#### 1. Tenant Validation (`src/lib/api/tenant-validation.ts`)
- `validateTenantAccess()`: Validates user has access to league (tenant)
- `isLeagueAdmin()`: Checks if user is admin/owner
- Returns league ID and name for use in queries

#### 2. Authentication (`src/lib/api/auth.ts`)
- `requireAuth()`: Validates Supabase session, returns user ID
- `requireLeagueAdmin()`: Validates user is league admin/owner
- Throws ApiError if unauthorized

#### 3. Error Handling (`src/lib/api/error-handling.ts`)
- `ApiError` class: Structured error with status code, error code, message
- `handleApiError()`: Catches and formats errors for JSON response
- `ErrorResponses`: Predefined error factories (unauthorized, forbidden, notFound, etc.)

---

## Architecture Highlights

### Multi-Tenant Isolation
- All endpoints validate tenant slug from URL: `/api/[tenant]/...`
- Queries scoped by `league_id` (validated via league_memberships table)
- RLS policies enforce tenant boundaries at database level
- Returns 404 for invalid tenant (doesn't leak league existence)

### Conflict Detection Integration
- Reschedule endpoint uses ConflictDetectionService
- Checks: team overlaps, venue double-booking, scorekeeper conflicts, schedule rule violations
- Blocks reschedule if conflicts with severity='error'
- Allows reschedule if only warnings/info (returns warnings in response)

### Transaction Safety
- **Reschedule**: Optimistic locking (WHERE status='scheduled')
- **Bulk Reschedule**: Atomic bulk update (all-or-nothing)
- **Cancel**: Idempotent (safe to retry)
- Handles concurrent modifications gracefully (returns 409 Conflict)

### Authorization Model
- **Read Operations** (GET): Any league member
- **Write Operations** (POST): League admin or owner only
- Authentication via Supabase session cookies
- RLS policies provide defense-in-depth

### Error Handling
- 400 Bad Request: Invalid input
- 401 Unauthorized: Not logged in
- 403 Forbidden: Not a league admin
- 404 Not Found: Resource doesn't exist or no access
- 409 Conflict: Scheduling conflicts or concurrent modification
- 500 Internal Server Error: Database errors

---

## Database Schema Dependencies

### Required Tables (Already Exist)
- ✅ `games` - Core game data
- ✅ `teams` - Team details
- ✅ `venues` - Venue details with address
- ✅ `divisions` - Division info
- ✅ `leagues` - League/tenant data
- ✅ `league_memberships` - User access control
- ✅ `schedule_rules` - Conflict detection rules
- ✅ `game_stats` - Player stats
- ✅ `team_memberships` - Team rosters

### Required Migrations (Already Applied)
- ✅ `20260129_add_postponed_status.sql` - Adds postponed status, reschedule/cancel tracking fields
- ✅ `20260129_create_schedule_rules.sql` - Schedule rules table
- ✅ Database function: `get_game_reschedule_history(game_id)`
- ✅ Database function: `get_postponed_games_queue(league_id)`
- ✅ Trigger: `auto_set_cancellation_timestamp()` - Auto-sets cancelled_at/cancelled_by

### Key Indexes Used
- `idx_games_league_scheduled` - Schedule query date range filter
- `idx_games_postponed_queue` - Admin postponed games queue
- `idx_games_rescheduled_from` - Reschedule history lookups
- `idx_games_league_season` - Team record calculations

---

## Testing

### Test Coverage
Comprehensive test cases documented in `BMHL_API_TESTING.md`:
- ✅ Happy path scenarios for all 5 endpoints
- ✅ Error cases (invalid input, unauthorized, not found)
- ✅ Conflict detection scenarios
- ✅ Concurrent modification handling
- ✅ RLS policy validation
- ✅ Authorization tests (admin vs member)
- ✅ Edge cases (idempotency, cancelling completed games, etc.)

### Integration Scenarios
1. Weather cancellation workflow (bulk postpone → reschedule individually)
2. Conflict detection during reschedule (venue overlap, team back-to-back)
3. Concurrent modifications (two admins reschedule same game)
4. Cancel vs reschedule decision tree
5. Reschedule chain validation (original → rescheduled → rescheduled again)

### Performance Targets
- Schedule query: <500ms for 100 games
- Game detail: <300ms with full stats
- Conflict check: <200ms for 200 game scan
- Reschedule: <1s end-to-end
- Bulk reschedule: <3s for 50 games

---

## Security Considerations

### Authentication & Authorization
- All endpoints require Supabase authentication
- Write operations restricted to league admin/owner
- RLS policies enforce tenant isolation at DB level
- No sensitive data leaked in error messages

### SQL Injection Protection
- Supabase client uses parameterized queries
- All inputs validated before use
- No raw SQL concatenation

### Rate Limiting
- Bulk operations limited to 100 games per request
- Recommended: Add IP-based rate limiting (10 req/min for write endpoints)

### Audit Trail
- All reschedules/cancellations tracked with:
  - Timestamp (rescheduled_at, cancelled_at)
  - User ID (rescheduled_by, cancelled_by)
  - Reason (reschedule_reason, cancellation_reason)
- Immutable reschedule chain (rescheduled_from pointer)

---

## Files Created

### API Route Handlers
1. `src/app/api/[tenant]/schedule/route.ts` - Schedule query
2. `src/app/api/[tenant]/games/[gameId]/route.ts` - Game detail
3. `src/app/api/[tenant]/games/[gameId]/reschedule/route.ts` - Reschedule
4. `src/app/api/[tenant]/games/[gameId]/cancel/route.ts` - Cancel
5. `src/app/api/[tenant]/games/bulk-reschedule/route.ts` - Bulk reschedule

### Shared Utilities
6. `src/lib/api/tenant-validation.ts` - Multi-tenant access control
7. `src/lib/api/auth.ts` - Authentication helpers
8. `src/lib/api/error-handling.ts` - Error response formatting

### Documentation
9. `BMHL_API_ARCHITECTURE.md` - Comprehensive architecture design doc
10. `BMHL_API_TESTING.md` - Complete testing guide
11. `BMHL_API_IMPLEMENTATION_SUMMARY.md` - This file

**Total:** 11 files created

---

## Next Steps

### Immediate (Required Before Production)
1. **Test all endpoints** - Follow `BMHL_API_TESTING.md` systematically
2. **Verify RLS policies** - Test with non-admin users
3. **Run database verification queries** - Check data integrity
4. **Add monitoring** - Track API errors, latency, conflict check duration
5. **Deploy to staging** - Test with real league data

### Phase 2 Enhancements (Future)
1. **Batch reschedule with dates** - Extend bulk-reschedule to support `reschedule_later` with conflict checks
2. **Webhook notifications** - Notify team captains when games rescheduled/cancelled
3. **Reschedule approval workflow** - Require captain confirmation
4. **Admin dashboard** - Postponed games queue UI
5. **Conflict resolution suggestions** - Auto-suggest alternative time slots
6. **Undo reschedule** - Allow admins to revert recent reschedules

### Performance Optimizations (If Needed)
1. **Add caching** - Cache schedule queries for 60s
2. **Batch queries** - Reduce N+1 in game detail roster fetching
3. **Database views** - Materialized view for team records
4. **Read replicas** - Offload schedule queries to read replica

---

## Open Questions (For Product Team)

1. **Reschedule with warnings:** Should API block reschedule if conflicts have severity='warning'? Currently allows with warnings returned.
   - **Recommendation:** Allow, but show warnings prominently in UI.

2. **Bulk reschedule new dates:** Should Phase 1 support immediate batch rescheduling to new dates, or just postpone?
   - **Decision:** Phase 1 only supports postpone. Phase 2 adds batch reschedule with conflict checks.

3. **Notification system:** Should reschedule API trigger notifications, or handle via separate webhook worker?
   - **Recommendation:** Async via queue (not in API transaction). Add webhook event logging.

4. **Reschedule history visibility:** Should all league members see reschedule history, or only admins?
   - **Recommendation:** All members (transparency), but hide cancelled_by user_id from non-admins.

---

## Conclusion

All 5 BMHL Schedule Management API endpoints are implemented with:
- ✅ Full conflict detection integration
- ✅ Multi-tenant isolation via RLS
- ✅ Comprehensive error handling
- ✅ Authorization checks (admin-only for writes)
- ✅ Audit trail for all state changes
- ✅ Transaction safety (optimistic locking, atomic bulk updates)
- ✅ Detailed documentation and testing guides

**Ready for systematic testing and staging deployment.**

For questions or issues:
- Architecture details → `BMHL_API_ARCHITECTURE.md`
- Testing procedures → `BMHL_API_TESTING.md`
- Schema/migrations → `supabase/migrations/20260129_*.sql`
- Conflict detection → `src/lib/games/conflict-detection.service.ts`
