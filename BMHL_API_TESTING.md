# BMHL Schedule Management API - Testing Guide

## Overview

This document provides comprehensive testing instructions for the BMHL Schedule Management API endpoints (Tasks 1.4-1.8).

**Implemented Endpoints:**
1. `GET /api/[tenant]/schedule` - Query game schedules
2. `GET /api/[tenant]/games/[gameId]` - Get full game details
3. `POST /api/[tenant]/games/[gameId]/reschedule` - Reschedule a game
4. `POST /api/[tenant]/games/bulk-reschedule` - Bulk postpone games
5. `POST /api/[tenant]/games/[gameId]/cancel` - Cancel a game

## Prerequisites

Before testing, ensure:
1. Database migrations are applied (schedule_rules, postponed status, reschedule tracking)
2. At least one active league exists with slug (e.g., 'bmhl')
3. Test user has league membership with 'admin' or 'owner' role
4. Sample games exist in 'scheduled' status
5. Schedule rules configured for the league

## Testing Tools

**Recommended:**
- **Postman** or **Insomnia** for API testing
- **Supabase Dashboard** for database inspection
- **Browser DevTools** for authentication cookies

**Authentication:**
All endpoints require authentication. You'll need:
- Valid Supabase session cookie from logged-in user
- User must be a member of the league (tenant)
- Admin/Owner role required for write operations (reschedule, cancel)

## Test Cases

### 1. Schedule Query API - `GET /api/[tenant]/schedule`

#### Test 1.1: Basic Schedule Query (Happy Path)
```http
GET /api/bmhl/schedule?limit=10&offset=0
Cookie: [Your Supabase auth cookies]
```

**Expected Response (200):**
```json
{
  "games": [
    {
      "id": "uuid",
      "scheduledAt": "2026-02-15T19:00:00Z",
      "status": "scheduled",
      "homeTeam": {
        "id": "uuid",
        "name": "Team A",
        "logoUrl": "https://...",
        "score": null
      },
      "awayTeam": {
        "id": "uuid",
        "name": "Team B",
        "logoUrl": "https://...",
        "score": null
      },
      "venue": {
        "id": "uuid",
        "name": "Ice Arena"
      },
      "division": {
        "id": "uuid",
        "name": "Division 1"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0
  }
}
```

**Verify:**
- Games are sorted by `scheduledAt` ascending
- All joined data (teams, venue, division) is populated
- Pagination metadata is correct

#### Test 1.2: Filter by Division
```http
GET /api/bmhl/schedule?division_id=<division-uuid>&limit=20
```

**Expected:** Only games in specified division returned

#### Test 1.3: Filter by Team
```http
GET /api/bmhl/schedule?team_id=<team-uuid>
```

**Expected:** Games where team is home OR away team

#### Test 1.4: Filter by Date Range
```http
GET /api/bmhl/schedule?start_date=2026-02-01&end_date=2026-02-28
```

**Expected:** Only games within date range

#### Test 1.5: Filter by Status
```http
GET /api/bmhl/schedule?status=completed
```

**Expected:** Only completed games (with scores populated)

#### Test 1.6: Pagination
```http
GET /api/bmhl/schedule?limit=5&offset=5
```

**Expected:** Second page of results (games 6-10)

#### Test 1.7: Invalid Tenant
```http
GET /api/nonexistent-league/schedule
```

**Expected Response (404):**
```json
{
  "error": {
    "code": "INVALID_TENANT",
    "message": "League not found or access denied"
  }
}
```

#### Test 1.8: Unauthorized User
```http
GET /api/bmhl/schedule
(No authentication cookies)
```

**Expected Response (401):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### Test 1.9: Invalid Parameters
```http
GET /api/bmhl/schedule?limit=500
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Limit must be between 1 and 100"
  }
}
```

---

### 2. Game Detail API - `GET /api/[tenant]/games/[gameId]`

#### Test 2.1: Game Detail (Happy Path)
```http
GET /api/bmhl/games/<game-uuid>
Cookie: [Your Supabase auth cookies]
```

**Expected Response (200):**
```json
{
  "id": "uuid",
  "scheduledAt": "2026-02-15T19:00:00Z",
  "status": "scheduled",
  "homeTeam": {
    "id": "uuid",
    "name": "Team A",
    "logoUrl": "https://...",
    "score": null,
    "roster": [
      {
        "id": "uuid",
        "name": "John Doe",
        "jerseyNumber": "7",
        "position": "Forward"
      }
    ]
  },
  "awayTeam": {
    "id": "uuid",
    "name": "Team B",
    "logoUrl": "https://...",
    "score": null,
    "roster": [...]
  },
  "venue": {
    "id": "uuid",
    "name": "Ice Arena",
    "address": "123 Main St",
    "city": "Boston",
    "stateProvince": "MA",
    "postalCode": "02101"
  },
  "division": {...},
  "scorekeeper": {...},
  "playerStats": {
    "homeTeam": [],
    "awayTeam": []
  },
  "teamRecords": {
    "homeTeamRecord": { "wins": 5, "losses": 3, "ties": 0 },
    "awayTeamRecord": { "wins": 4, "losses": 4, "ties": 0 },
    "seasonSeries": { "homeWins": 1, "awayWins": 0, "ties": 0 }
  }
}
```

**Verify:**
- Team rosters are populated
- Venue details include full address
- Player stats are empty for unplayed games
- Team records calculated correctly

#### Test 2.2: Game with Stats (Completed Game)
```http
GET /api/bmhl/games/<completed-game-uuid>
```

**Expected:**
- `status: "completed"`
- `homeScore` and `awayScore` populated
- `playerStats.homeTeam` and `playerStats.awayTeam` contain stat lines

#### Test 2.3: Game with Reschedule History
```http
GET /api/bmhl/games/<rescheduled-game-uuid>
```

**Expected:**
- `rescheduleHistory` array present
- History shows original game and rescheduled version(s)
- `isCurrent: true` for current game
- `isOriginal: true` for first game in chain

#### Test 2.4: Game Not Found
```http
GET /api/bmhl/games/00000000-0000-0000-0000-000000000000
```

**Expected Response (404):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Game not found"
  }
}
```

#### Test 2.5: Game in Different League (RLS Test)
```http
GET /api/bmhl/games/<game-from-different-league-uuid>
```

**Expected Response (404):**
Game exists but user doesn't have access → treated as 404

---

### 3. Reschedule Game API - `POST /api/[tenant]/games/[gameId]/reschedule`

#### Test 3.1: Reschedule Game (Happy Path)
```http
POST /api/bmhl/games/<game-uuid>/reschedule
Content-Type: application/json
Cookie: [Admin/Owner auth cookies]

{
  "newScheduledAt": "2026-03-01T18:00:00Z",
  "reason": "Venue maintenance"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "newGameId": "new-uuid",
  "warnings": []
}
```

**Verify in Database:**
1. Original game:
   - `status = 'postponed'`
   - `cancelled_at` set
   - `cancelled_by` = user_id
   - `cancellation_reason = 'Venue maintenance'`

2. New game created:
   - `scheduled_at = '2026-03-01T18:00:00Z'`
   - `status = 'scheduled'`
   - `rescheduled_from` = original game ID
   - `reschedule_reason = 'Venue maintenance'`
   - `rescheduled_at` set
   - `rescheduled_by` = user_id
   - Same teams, venue, division as original

#### Test 3.2: Reschedule with Venue Change
```http
POST /api/bmhl/games/<game-uuid>/reschedule
Content-Type: application/json

{
  "newScheduledAt": "2026-03-01T18:00:00Z",
  "reason": "Original venue unavailable",
  "venueId": "<different-venue-uuid>"
}
```

**Expected:** New game created with different venue

#### Test 3.3: Reschedule with Conflicts (Error)
```http
POST /api/bmhl/games/<game-uuid>/reschedule
Content-Type: application/json

{
  "newScheduledAt": "2026-02-20T19:00:00Z",
  "reason": "Weather"
}
```
(Assume venue is already booked at this time)

**Expected Response (409):**
```json
{
  "success": false,
  "conflicts": [
    {
      "type": "venue_overlap",
      "severity": "error",
      "message": "Venue is already booked at this time (game at 7:00 PM)",
      "affectedEntities": {
        "venueId": "uuid",
        "gameIds": ["conflicting-game-uuid"]
      },
      "suggestion": "Choose a different time slot or venue"
    }
  ],
  "warnings": []
}
```

**Verify:** Original game status unchanged (still 'scheduled')

#### Test 3.4: Reschedule with Warnings (Success with Warnings)
```http
POST /api/bmhl/games/<game-uuid>/reschedule
Content-Type: application/json

{
  "newScheduledAt": "2026-02-20T23:00:00Z",
  "reason": "Team request"
}
```
(Assume time is outside preferred window)

**Expected Response (200):**
```json
{
  "success": true,
  "newGameId": "new-uuid",
  "warnings": [
    {
      "type": "invalid_time_window",
      "severity": "info",
      "message": "Game is outside preferred time window (18:00 - 22:00)",
      "suggestion": "Schedule games between 18:00 and 22:00 on thursdays"
    }
  ]
}
```

**Verify:** Game rescheduled successfully despite warning

#### Test 3.5: Reschedule Completed Game (Error)
```http
POST /api/bmhl/games/<completed-game-uuid>/reschedule
Content-Type: application/json

{
  "newScheduledAt": "2026-03-01T18:00:00Z",
  "reason": "Test"
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "GAME_NOT_RESCHEDULABLE",
    "message": "Cannot reschedule game: Game is already completed"
  }
}
```

#### Test 3.6: Reschedule to Past Date (Error)
```http
POST /api/bmhl/games/<game-uuid>/reschedule
Content-Type: application/json

{
  "newScheduledAt": "2020-01-01T18:00:00Z",
  "reason": "Test"
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot reschedule game to a past date"
  }
}
```

#### Test 3.7: Concurrent Reschedule (Race Condition)
**Setup:**
1. Open two browser tabs
2. Both authenticated as admin
3. Both attempt to reschedule same game simultaneously

**Expected:**
- First request succeeds (200)
- Second request fails (409) with message "Game was modified by another user"

#### Test 3.8: Non-Admin User (Forbidden)
```http
POST /api/bmhl/games/<game-uuid>/reschedule
Cookie: [Member (non-admin) auth cookies]

{
  "newScheduledAt": "2026-03-01T18:00:00Z",
  "reason": "Test"
}
```

**Expected Response (403):**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

---

### 4. Bulk Reschedule API - `POST /api/[tenant]/games/bulk-reschedule`

#### Test 4.1: Bulk Postpone (Happy Path)
```http
POST /api/bmhl/games/bulk-reschedule
Content-Type: application/json
Cookie: [Admin/Owner auth cookies]

{
  "gameIds": [
    "game-uuid-1",
    "game-uuid-2",
    "game-uuid-3"
  ],
  "reason": "Weather - ice storm",
  "action": "postpone"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "postponedCount": 3,
  "failedIds": []
}
```

**Verify in Database:**
- All 3 games have `status = 'postponed'`
- All have `cancelled_at` set
- All have `cancellation_reason = 'Weather - ice storm'`

#### Test 4.2: Bulk Postpone with Invalid Game ID
```http
POST /api/bmhl/games/bulk-reschedule
Content-Type: application/json

{
  "gameIds": [
    "valid-game-uuid",
    "00000000-0000-0000-0000-000000000000"
  ],
  "reason": "Weather",
  "action": "postpone"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "postponedCount": 0,
  "failedIds": ["00000000-0000-0000-0000-000000000000"],
  "errors": [
    {
      "gameId": "00000000-0000-0000-0000-000000000000",
      "reason": "Game not found"
    }
  ]
}
```

**Verify:** Valid game NOT postponed (transaction rollback)

#### Test 4.3: Bulk Postpone with Completed Game
```http
POST /api/bmhl/games/bulk-reschedule
Content-Type: application/json

{
  "gameIds": [
    "scheduled-game-uuid",
    "completed-game-uuid"
  ],
  "reason": "Weather",
  "action": "postpone"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "postponedCount": 0,
  "failedIds": ["completed-game-uuid"],
  "errors": [
    {
      "gameId": "completed-game-uuid",
      "reason": "Game status is 'completed', must be 'scheduled'"
    }
  ]
}
```

**Verify:** Scheduled game NOT postponed (all-or-nothing)

#### Test 4.4: Bulk Postpone Empty Array
```http
POST /api/bmhl/games/bulk-reschedule
Content-Type: application/json

{
  "gameIds": [],
  "reason": "Weather",
  "action": "postpone"
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "gameIds array is required and must not be empty"
  }
}
```

#### Test 4.5: Bulk Postpone Too Many Games
```http
POST /api/bmhl/games/bulk-reschedule
Content-Type: application/json

{
  "gameIds": [/* 101 game IDs */],
  "reason": "Weather",
  "action": "postpone"
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot reschedule more than 100 games at once"
  }
}
```

#### Test 4.6: Unsupported Action (reschedule_later)
```http
POST /api/bmhl/games/bulk-reschedule
Content-Type: application/json

{
  "gameIds": ["game-uuid"],
  "reason": "Weather",
  "action": "reschedule_later"
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Action 'reschedule_later' not implemented. Use 'postpone' to mark games as postponed, then reschedule individually via admin UI."
  }
}
```

---

### 5. Cancel Game API - `POST /api/[tenant]/games/[gameId]/cancel`

#### Test 5.1: Cancel Game (Happy Path)
```http
POST /api/bmhl/games/<game-uuid>/cancel
Content-Type: application/json
Cookie: [Admin/Owner auth cookies]

{
  "reason": "venue_unavailable",
  "notes": "Venue closed for repairs indefinitely"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "gameId": "game-uuid",
  "status": "cancelled",
  "cancelledAt": "2026-01-29T12:34:56Z"
}
```

**Verify in Database:**
- Game has `status = 'cancelled'`
- `cancelled_at` set
- `cancelled_by` = user_id
- `cancellation_reason = 'venue_unavailable'`
- `cancellation_notes = 'Venue closed for repairs indefinitely'`

#### Test 5.2: Cancel Postponed Game
```http
POST /api/bmhl/games/<postponed-game-uuid>/cancel
Content-Type: application/json

{
  "reason": "team_forfeit",
  "notes": "Team withdrew from league"
}
```

**Expected Response (200):**
Status changes from 'postponed' to 'cancelled'

#### Test 5.3: Cancel Completed Game (Error)
```http
POST /api/bmhl/games/<completed-game-uuid>/cancel
Content-Type: application/json

{
  "reason": "other"
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot cancel a completed game"
  }
}
```

#### Test 5.4: Cancel Already Cancelled Game (Idempotent)
```http
POST /api/bmhl/games/<cancelled-game-uuid>/cancel
Content-Type: application/json

{
  "reason": "weather"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "gameId": "game-uuid",
  "status": "cancelled",
  "cancelledAt": "2026-01-29T12:34:56Z"
}
```

**Note:** Idempotent - returns success without modifying game

#### Test 5.5: Cancel Without Reason (Error)
```http
POST /api/bmhl/games/<game-uuid>/cancel
Content-Type: application/json

{
  "notes": "Some notes"
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "reason is required"
  }
}
```

#### Test 5.6: Cancel as Non-Admin (Forbidden)
```http
POST /api/bmhl/games/<game-uuid>/cancel
Cookie: [Member (non-admin) auth cookies]

{
  "reason": "weather"
}
```

**Expected Response (403):**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

---

## Integration Testing Scenarios

### Scenario 1: Weather Cancellation Workflow
1. **Bulk postpone** 5 games due to weather
2. **Query schedule** filtered by `status=postponed` - verify 5 games returned
3. **Reschedule** each game individually to new dates
4. **Query schedule** again - verify games now `status=scheduled` with new dates
5. **Check reschedule history** on one game - verify chain of original → rescheduled

### Scenario 2: Conflict Detection During Reschedule
1. Create 2 games at same venue, same time (manually via DB)
2. Attempt to **reschedule** a third game to same venue/time
3. Verify API returns 409 with venue_overlap conflict
4. **Reschedule** to different time - verify success

### Scenario 3: Team Schedule Validation
1. Create game for Team A at 6:00 PM
2. Attempt to **reschedule** another Team A game to 7:00 PM (violates min_hours_between_games = 24h)
3. Verify API returns 409 with back_to_back_violation conflict
4. **Reschedule** to next day - verify success

### Scenario 4: Concurrent Modifications
1. Two admin users simultaneously attempt to **reschedule** same game
2. First request succeeds
3. Second request fails with 409 "Game was modified"
4. Second user refreshes game detail, sees it's already postponed
5. Second user reschedules the NEW game (created by first user) successfully

### Scenario 5: Cancel vs Reschedule Decision
1. Game scheduled for Feb 15
2. Feb 10: Weather forecast bad → **postpone** via bulk API
3. Feb 12: Weather clears → **reschedule** to Feb 18
4. Feb 17: Team forfeits → **cancel** game permanently
5. Verify reschedule history shows: original → rescheduled → cancelled

---

## Performance Testing

### Load Test: Schedule Query
- **Goal:** Verify endpoint handles 100 concurrent requests
- **Setup:** 100 games in database
- **Test:** 100 simultaneous GET requests to `/api/bmhl/schedule`
- **Target:** All requests complete in <2 seconds, no errors

### Stress Test: Bulk Reschedule
- **Goal:** Verify transaction atomicity under load
- **Setup:** 50 games in database
- **Test:** Bulk postpone all 50 games
- **Target:** Complete in <3 seconds, all-or-nothing success

### Conflict Check Performance
- **Goal:** Verify conflict detection scales
- **Setup:** 200 games across 10 teams, 5 venues
- **Test:** Reschedule game (triggers conflict check across all 200 games)
- **Target:** Conflict check completes in <500ms

---

## Security Testing

### RLS Policy Validation
1. User A in League 1 attempts to access game in League 2
2. Verify 404 response (not "Forbidden" - don't leak league existence)

### Authorization Tests
1. Non-authenticated user → 401
2. Authenticated but not league member → 404 (RLS blocks)
3. League member (non-admin) → GET succeeds, POST returns 403
4. League admin/owner → All operations succeed

### SQL Injection Attempts
1. Try malicious input in query params:
   ```
   GET /api/bmhl/schedule?division_id='; DROP TABLE games; --
   ```
2. Verify Supabase parameterized queries prevent injection
3. Expected: 400 or safe handling (no DB damage)

### CSRF Protection
- Next.js App Router doesn't use traditional CSRF tokens
- Verify same-origin policy enforced
- Verify Supabase auth cookies have SameSite=Lax

---

## Database Verification Queries

After testing, run these SQL queries to verify data integrity:

```sql
-- 1. Check for games with invalid cancellation audit trail
SELECT id, status, cancelled_at, cancelled_by, cancellation_reason
FROM games
WHERE status IN ('cancelled', 'postponed')
  AND (cancelled_at IS NULL OR cancelled_by IS NULL OR cancellation_reason IS NULL);
-- Expected: 0 rows

-- 2. Check reschedule chains
SELECT
  g1.id as original_id,
  g1.status as original_status,
  g2.id as rescheduled_id,
  g2.status as rescheduled_status,
  g2.reschedule_reason
FROM games g1
LEFT JOIN games g2 ON g2.rescheduled_from = g1.id
WHERE g1.status = 'postponed';
-- Expected: Each postponed game has a rescheduled child (or is pending reschedule)

-- 3. Check for orphaned postponed games (>7 days old)
SELECT id, scheduled_at, cancelled_at, cancellation_reason
FROM games
WHERE status = 'postponed'
  AND cancelled_at < NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM games g2 WHERE g2.rescheduled_from = games.id
  );
-- Expected: 0-5 rows (depends on workflow)

-- 4. Verify no duplicate reschedule chains
SELECT rescheduled_from, COUNT(*)
FROM games
WHERE rescheduled_from IS NOT NULL
GROUP BY rescheduled_from
HAVING COUNT(*) > 1;
-- Expected: 0 rows (each game can only be rescheduled once at a time)
```

---

## Troubleshooting Common Issues

### Issue: 401 Unauthorized on all requests
**Cause:** Missing or invalid Supabase auth cookies
**Fix:**
1. Log in via UI to get valid session
2. Copy cookies from browser DevTools
3. Add to API client (Postman/Insomnia)

### Issue: 404 on valid game ID
**Cause:** RLS policy blocking access (user not in league)
**Fix:**
1. Verify user has active league membership: `SELECT * FROM league_memberships WHERE user_id = '...' AND league_id = '...'`
2. Verify league status is 'active'

### Issue: Conflict detection always returns no conflicts
**Cause:** Schedule rules not configured
**Fix:**
1. Check `SELECT * FROM schedule_rules WHERE league_id = '...'`
2. If missing, insert default rules (see migration)

### Issue: Reschedule fails with "Transaction aborted"
**Cause:** Concurrent modification or database constraint violation
**Fix:**
1. Check game status hasn't changed
2. Retry request
3. If persistent, check database logs

### Issue: Bulk reschedule fails silently
**Cause:** Some games in wrong status
**Fix:**
1. Check response `failedIds` and `errors` arrays
2. Verify all games are in 'scheduled' status
3. Remove invalid games from request

---

## Deployment Checklist

Before deploying to production:

- [ ] All migrations applied
- [ ] Schedule rules configured for each active league
- [ ] RLS policies verified
- [ ] Rate limiting configured (if applicable)
- [ ] Monitoring/alerts set up for API errors
- [ ] Database indexes verified (EXPLAIN ANALYZE on query endpoints)
- [ ] Authentication working end-to-end
- [ ] Error messages don't leak sensitive info (league existence, user IDs)
- [ ] API documented in Swagger/OpenAPI (optional)
- [ ] Client SDK updated with new endpoints (if applicable)

---

## Next Steps (Phase 2 Features)

Features not implemented in Phase 1 but planned:

1. **Batch Reschedule with New Dates**: Extend bulk-reschedule to support `reschedule_later` action with conflict checks per game
2. **Webhook Notifications**: Trigger notifications to team captains when games are rescheduled/cancelled
3. **Reschedule Approval Workflow**: Require captain confirmation before finalizing reschedule
4. **Admin Dashboard Query**: `/api/admin/postponed-queue` endpoint to list all postponed games needing reschedule
5. **Conflict Resolution Suggestions**: API returns alternative time slots when conflicts detected
6. **Undo Reschedule**: Allow admins to undo recent reschedule (restore original game, delete new game)

---

## Conclusion

This testing guide covers all critical paths, error cases, and security scenarios for the BMHL Schedule Management API. Follow this guide systematically to ensure production readiness.

For questions or issues, refer to `BMHL_API_ARCHITECTURE.md` for design rationale and database schema details.
