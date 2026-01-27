# Implementation Summary: League Signup and Discovery Server Actions

**Date:** January 26, 2026
**Agent:** Agent 2 - Backend Development
**Status:** Complete

---

## Files Created

### 1. League Signup Actions
**File:** `src/lib/leagues/signup-actions.ts`

**Purpose:** Handle new league signup with owner account creation in a single atomic transaction.

**Key Function:** `signupLeagueWithOwner()`

**Features:**
- Validates all inputs (league name, email, password, full name, sport)
- Generates unique slug with automatic alternatives if taken
- Creates user account via Supabase Auth
- Creates league record with default branding
- Creates profile record (via database trigger or manual)
- Creates league membership with 'owner' role
- Creates default league settings
- Full transaction rollback on any failure
- Returns subdomain for redirect

**Validation Rules:**
- League name: 3-100 characters, HTML stripped
- Email: valid format, lowercase
- Password: minimum 6 characters
- Slug: unique, follows slug-utils validation
- Automatic slug alternatives: `{slug}-{sport}`, `{slug}-league`, `{slug}-{n}`

**Error Handling:**
- User-friendly error messages
- Comprehensive rollback on failure
- Duplicate email/slug detection
- Up to 10 slug generation attempts

---

### 2. Discovery Actions
**File:** `src/lib/leagues/discovery-actions.ts`

**Purpose:** Public league discovery and search (no authentication required).

**Key Functions:**

#### `getPublicLeagues(filters?)`
**Search Modes:**
1. **Location-based search** (lat/lon + radius)
   - Uses `search_nearby_leagues()` database function
   - Default 50km radius
   - Returns leagues sorted by distance

2. **Keyword search** (name, description, city, keywords)
   - Uses `search_leagues_by_keyword()` database function
   - Relevance scoring
   - Returns leagues sorted by relevance

3. **General browse** (no filters)
   - Returns all public leagues
   - Sorted by creation date (newest first)

**Filters:**
- `keyword`: Search term
- `latitude`, `longitude`, `radius_km`: Location-based search
- `sport`: Filter by sport type
- `limit`, `offset`: Pagination

**Returns:**
```typescript
{
  leagues: PublicLeague[];
  total: number;
  error?: string;
}
```

#### `getLeaguePublicProfile(slug)`
**Returns:**
- Full league details
- List of teams (names only, no rosters)
- Upcoming games (next 5)
- Stats (team count, upcoming game count)

**Access:** Public (no auth required)

#### `getLeaguesByLocation(filters)`
**Filters:**
- `city`, `state`, `country`
- `limit`, `offset`

**Uses:** `get_leagues_by_location()` database function

---

### 3. Join Request Actions
**File:** `src/lib/leagues/join-request-actions.ts`

**Purpose:** Handle user requests to join public leagues.

**Key Functions:**

#### `requestJoinLeague(data)`
**Validation:**
- User must be authenticated
- League must be public and active
- User not already a member
- No existing pending request
- If rejected recently (< 30 days), prevents resubmission

**Creates:** Join request record with optional message

**Returns:**
```typescript
{
  success?: boolean;
  requestId?: string;
  status?: 'pending' | 'approved' | 'rejected';
  error?: string;
}
```

#### `getMyJoinRequestStatus(leagueId)`
**Returns:** Current user's join request status for a league
- Uses `get_user_league_join_status()` database function

#### `withdrawJoinRequest(requestId)`
**Allows:** Users to cancel their own pending requests

#### `getPendingJoinRequests(leagueId)` (Admin only)
**Returns:** All pending join requests for a league
- Requires owner or admin role
- Uses `get_league_pending_join_requests()` database function

#### `approveJoinRequest(requestId)` (Admin only)
**Action:** Approves a join request
- Database trigger automatically adds user to league with 'member' role
- Requires owner or admin role

#### `rejectJoinRequest(requestId, reason?)` (Admin only)
**Action:** Rejects a join request
- Optional rejection reason (max 500 chars)
- Prevents resubmission for 30 days
- Requires owner or admin role

---

## Database Migration Required

### File: `supabase/migrations/20260126_create_league_join_requests.sql`

**Creates:**
- `league_join_requests` table
- Indexes for performance
- RLS policies
- Database triggers:
  - Auto-update `updated_at`
  - Auto-set `reviewed_at` and `reviewed_by` on status change
  - Auto-add user to league when approved
- Helper functions:
  - `get_league_pending_join_requests(league_id)`
  - `get_user_league_join_status(user_id, league_id)`

**Table Schema:**
```sql
league_join_requests (
  id UUID PRIMARY KEY,
  league_id UUID REFERENCES leagues,
  user_id UUID REFERENCES profiles,
  message TEXT,
  status TEXT, -- pending, approved, rejected
  reviewed_by UUID REFERENCES profiles,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(league_id, user_id)
)
```

**RLS Policies:**
- Users can view their own requests
- Users can create requests for public leagues
- League admins/owners can view/update requests for their league
- Users can delete their own pending requests

---

## Usage Examples

### 1. League Signup Flow

```typescript
// In your signup form component
import { signupLeagueWithOwner } from '@/lib/leagues/signup-actions';

const result = await signupLeagueWithOwner({
  leagueName: 'Winter Warriors Hockey',
  email: 'owner@example.com',
  password: 'securePassword123',
  fullName: 'John Smith',
  sport: 'hockey'
});

if (result.success) {
  // Redirect to league subdomain
  window.location.href = `https://${result.subdomain}.hockeylifehl.app`;
} else {
  // Show error
  console.error(result.error);
}
```

### 2. Public League Discovery

```typescript
// Search nearby leagues
import { getPublicLeagues } from '@/lib/leagues/discovery-actions';

const result = await getPublicLeagues({
  latitude: 40.7128,
  longitude: -74.0060,
  radius_km: 25,
  sport: 'hockey',
  limit: 10,
  offset: 0
});

// Keyword search
const searchResult = await getPublicLeagues({
  keyword: 'winter',
  sport: 'hockey',
  limit: 10
});

// General browse
const browseResult = await getPublicLeagues({
  sport: 'hockey',
  limit: 20
});
```

### 3. Join Request Flow

```typescript
// User requests to join league
import { requestJoinLeague } from '@/lib/leagues/join-request-actions';

const result = await requestJoinLeague({
  leagueId: 'league-uuid',
  message: 'I would like to join your league!'
});

// Admin approves request
import { approveJoinRequest } from '@/lib/leagues/join-request-actions';

const approveResult = await approveJoinRequest('request-uuid');

// Admin rejects request
import { rejectJoinRequest } from '@/lib/leagues/join-request-actions';

const rejectResult = await rejectJoinRequest(
  'request-uuid',
  'Sorry, we are not accepting new members at this time.'
);
```

---

## TypeScript Considerations

**Note:** The `league_join_requests` table is new and not yet in the generated TypeScript types from Supabase. Current implementation uses `as any` type assertions for:
- `league_join_requests` table queries
- `league_settings` table queries (if not in types)
- New RPC functions (`get_user_league_join_status`, `get_league_pending_join_requests`)

**Action Required:**
After running the migration, regenerate TypeScript types:

```bash
npx supabase gen types typescript --project-id ntplczcmhvfkijjxavdl --schema public > src/types/database.ts
```

Then remove `as any` assertions from the code for better type safety.

---

## Security Features

### Input Validation
- All user inputs sanitized with `stripHtml()`
- Email format validation
- Password length validation
- Message length limits (500 chars)
- Slug uniqueness checks

### Authentication
- Signup actions create proper Supabase Auth users
- Join requests require authentication
- Admin actions verify league membership and role

### Authorization (RLS)
- Public leagues visible to all
- Join requests visible only to:
  - Request author
  - League admins/owners
- Only admins/owners can approve/reject requests

### Data Integrity
- Unique constraints prevent duplicate requests
- Foreign key constraints ensure referential integrity
- Database triggers ensure automatic user addition on approval
- Transaction rollback on failures

---

## Error Handling

All functions follow consistent error handling patterns:

```typescript
{
  error?: string;  // User-friendly error message
  success?: boolean;  // Explicit success flag
  // Additional data on success
}
```

**Error Categories:**
1. **Authentication errors:** "Not authenticated"
2. **Authorization errors:** "Only league owners can..."
3. **Validation errors:** "League name must be..."
4. **Duplicate errors:** "You already have a pending request"
5. **Not found errors:** "League not found"
6. **System errors:** "Failed to... Please try again."

All errors are:
- User-friendly
- Specific enough to guide action
- Never expose internal implementation details
- Logged to console for debugging

---

## Testing Checklist

### League Signup
- [ ] Create league with valid data
- [ ] Handle duplicate email
- [ ] Handle duplicate slug (test auto-alternatives)
- [ ] Validate all input fields
- [ ] Verify transaction rollback on failure
- [ ] Verify user account created
- [ ] Verify league membership created
- [ ] Verify league settings created

### Discovery
- [ ] Search nearby leagues with valid coordinates
- [ ] Search by keyword
- [ ] Browse all public leagues
- [ ] Filter by sport
- [ ] Pagination works correctly
- [ ] No results scenarios
- [ ] Get league public profile
- [ ] Verify only public leagues shown

### Join Requests
- [ ] Create join request
- [ ] Prevent duplicate requests
- [ ] Withdraw pending request
- [ ] Admin view pending requests
- [ ] Admin approve request (verify user added to league)
- [ ] Admin reject request (with reason)
- [ ] Prevent resubmission after rejection (< 30 days)
- [ ] Verify RLS policies

---

## Performance Considerations

### Database Indexes
All database functions use optimized indexes:
- Location-based search uses spatial indexes
- Keyword search uses GIN indexes on search_keywords
- Join requests indexed by league_id and status
- Composite indexes for common query patterns

### Pagination
All list functions support `limit` and `offset` for pagination:
- Default limit: 20 items
- Maximum recommended: 100 items per page

### Caching Recommendations
Consider caching:
- Public league list (5-10 minute TTL)
- League public profiles (2-5 minute TTL)
- Search results (1-2 minute TTL)

---

## Next Steps

### 1. Run Migration
```bash
# Copy and run in Supabase SQL Editor
supabase/migrations/20260126_create_league_join_requests.sql
```

### 2. Regenerate Types
```bash
npx supabase gen types typescript --project-id ntplczcmhvfkijjxavdl --schema public > src/types/database.ts
```

### 3. Update Type Assertions
Remove `as any` assertions after types are regenerated.

### 4. Build Frontend Components
- League signup form
- League discovery/search page
- League public profile page
- Join request button
- Admin join request management

### 5. Add Email Notifications (Optional)
- Welcome email on league creation
- Join request received (to admins)
- Join request approved/rejected (to user)

---

## Related Files

**Existing Files Used:**
- `src/lib/supabase/server.ts` - Supabase client
- `src/lib/input-sanitization.ts` - Input validation
- `src/lib/leagues/slug-utils.ts` - Slug generation/validation
- `src/lib/admin/league-management.ts` - Admin patterns reference

**Database Functions Used:**
- `search_nearby_leagues(lat, lon, radius_km)`
- `search_leagues_by_keyword(query, limit)`
- `get_leagues_by_location(city, state, country)`
- `get_league_pending_join_requests(league_id)` [NEW]
- `get_user_league_join_status(user_id, league_id)` [NEW]

**Dependencies:**
- `@supabase/ssr` - Supabase client
- Next.js 16.1.1
- TypeScript

---

## Conclusion

All three server action files have been implemented with:
- Comprehensive input validation
- User-friendly error messages
- Proper authentication/authorization
- Transaction safety
- Performance optimization
- Security best practices

The implementation follows existing patterns from `league-management.ts` and `actions.ts`, ensuring consistency with the codebase.

**Build Status:** TypeScript compiles successfully (excluding existing admin page issues unrelated to this implementation)

**Ready for:** Frontend integration and testing
