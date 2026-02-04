# Captain Dashboard Implementation

**Date:** February 5, 2026
**Status:** ✅ Complete
**Framework:** DEVELOPMENT_WORKFLOW.md

---

## Overview

Implemented a dedicated captain dashboard route that provides team captains with a focused interface to manage their team roster, review join requests, view upcoming games, and access team statistics.

---

## Implementation Summary

### 1. Server Actions (`apps/league-builder/src/lib/actions/captain.ts`)

Created comprehensive server-side functions for captain operations:

**Authorization:**
- `verifyCaptainAccess(teamId)` - Verifies user is captain of specified team
- Secure RLS policy enforcement through Supabase

**Data Fetching:**
- `getCaptainTeams()` - Get all teams where user is captain
- `getCaptainDashboard(teamId)` - Get detailed team overview with stats
- `getTeamJoinRequests(teamId, status?)` - Fetch join requests (pending/approved/rejected)
- `getCaptainTeamRoster(teamId)` - Get team roster with player details

**Team Management:**
- `approveJoinRequest(requestId, jerseyNumber?)` - Approve player join request
  - Auto-adds player to roster via database trigger
  - Optional jersey number assignment
- `rejectJoinRequest(requestId, reason?)` - Reject player join request
- `removePlayerFromRoster(teamId, playerId)` - Remove player from roster (soft delete)

**Security:**
- All functions verify captain authorization before operations
- Uses Supabase RLS policies for data access control
- Sanitized error logging in development mode
- No captain can access other teams' data

---

### 2. Captain Dashboard Page (`apps/league-builder/src/app/[locale]/dashboard/captain/[teamId]/page.tsx`)

**Features:**
- Server-side rendered with authorization check
- Team header with logo, colors, and quick stats
- Beautiful color gradient bar using team colors
- Displays:
  - Roster count (current/max)
  - Pending join requests count
  - Upcoming games count
- Access denied page for non-captains
- SEO-optimized metadata

**Authorization:**
- Redirects to login if not authenticated
- Shows access denied page if not team captain
- Graceful error handling with user-friendly messages

---

### 3. Main Dashboard Component (`apps/league-builder/src/components/captain/CaptainDashboard.tsx`)

**Tab Structure:**
1. **Overview Tab**
   - Quick stats grid (roster size, pending requests, upcoming games)
   - Upcoming games list with matchup details
   - Quick action cards to jump to requests or roster

2. **Roster Tab**
   - Full roster table with search
   - Player contact information
   - Jersey numbers
   - Position assignments
   - Captain badge indicator
   - Remove player functionality

3. **Join Requests Tab**
   - Filter by status (pending/approved/rejected)
   - Player information display
   - Optional message from player
   - Approve/Reject actions with jersey number input

4. **Schedule Tab**
   - Shows upcoming games
   - Links to full season schedule

5. **Statistics Tab**
   - Team win/loss/tie records
   - Placeholder for future stats integration

**UI Features:**
- Tab-based navigation with URL params
- Responsive design (mobile-friendly)
- Real-time badge indicators for pending requests
- Loading states and error handling
- Confirmation dialogs for destructive actions

---

### 4. Join Requests Manager (`apps/league-builder/src/components/captain/JoinRequestsManager.tsx`)

**Features:**
- Filter tabs (pending/approved/rejected)
- Player information cards with:
  - Name, email, phone
  - Request date/time
  - Optional message from player
- Approve action:
  - Optional jersey number input
  - Confirmation state
  - Auto-refresh on success
- Reject action:
  - Confirmation dialog
  - Auto-refresh on success
- Empty states for each filter
- Error messages with retry capability

**UX Enhancements:**
- Loading spinner during operations
- Disabled buttons during processing
- Real-time list updates
- Search/filter capabilities

---

### 5. Roster Manager (`apps/league-builder/src/components/captain/CaptainRosterManager.tsx`)

**Features:**
- Sortable table view of roster
- Columns:
  - Jersey number
  - Player name
  - Position
  - Contact info (email, phone)
  - Actions
- Special captain indicator (shield badge)
- Search players by name or email
- Remove player action (cannot remove captain)
- Empty states with helpful messages

**Security:**
- Captain cannot remove themselves
- Confirmation before player removal
- Soft delete (preserves data)

---

### 6. Dashboard Sidebar Update

**New Component:** `apps/league-builder/src/components/dashboard/DashboardSidebar.tsx`
- Client component for sidebar navigation
- Accepts captain teams as props

**Layout Update:** `apps/league-builder/src/app/[locale]/dashboard/layout.tsx`
- Changed from client to server component
- Fetches captain teams on server
- Passes data to sidebar component

**Sidebar Features:**
- "My Teams" section for captain teams
- Shield icon for captain teams
- Badge indicator for pending join requests
- Tooltip on hover (collapsed state)
- Highlights active captain dashboard
- Responsive (collapses on mobile)

---

## Database Integration

Uses existing tables created in migration `20260126_create_team_join_requests.sql`:

**Tables:**
- `team_join_requests` - Player join requests
- `team_rosters` - Team roster entries
- `teams` - Team information
- `profiles` - Player profiles

**RLS Policies:**
- Captains can view/manage requests for their teams
- Captains can view roster for their teams
- Captains can remove players (except themselves)
- All operations are organization-scoped

**Triggers:**
- Auto-add player to roster when request approved
- Auto-set reviewed_at and reviewed_by
- Validate league_id consistency

**Helper Functions:**
- `get_team_pending_requests(team_id)` - Used by dashboard
- `get_player_request_status(player_id, team_id, season_id)` - Status checks

---

## Routes Created

1. **Captain Dashboard:**
   - Route: `/dashboard/captain/[teamId]`
   - Access: Team captains only
   - Dynamic route with team ID

2. **Navigation:**
   - Sidebar: "My Teams" section
   - Direct links to each team captain manages
   - Badge indicators for action items

---

## User Experience

### Captain Workflow:

1. **Login** → Dashboard
2. **Sidebar** → See "My Teams" section with badge if pending requests
3. **Click Team** → Captain Dashboard Overview
4. **Review Requests Tab:**
   - See all pending join requests
   - Review player info and optional message
   - Enter jersey number (optional)
   - Approve or reject
5. **Manage Roster Tab:**
   - View all players
   - Search players
   - Remove players if needed
6. **View Schedule Tab:**
   - See upcoming games
   - Jump to full schedule
7. **Check Stats Tab:**
   - View team performance (when available)

### Access Control:

- Only team captains can access their team dashboard
- Non-captains see "Access Denied" message
- Cannot access other teams' dashboards
- All operations verified server-side

---

## Success Criteria Met

✅ **Captains can access their team dashboard**
- Direct sidebar navigation
- URL-based access
- Mobile-friendly

✅ **Can view and approve join requests**
- Filter by status
- Approve with optional jersey number
- Reject with confirmation

✅ **Can view roster**
- Full player list
- Search functionality
- Contact information

✅ **Can manage roster (with remove action)**
- Remove players via action button
- Soft delete (preserves history)
- Confirmation required
- Cannot remove captain

✅ **Cannot access other teams**
- Server-side authorization
- RLS policy enforcement
- Clear error messages

✅ **Clean, focused interface for captain role**
- Tab-based navigation
- Action-oriented design
- Real-time updates
- Badge indicators for attention items

---

## Security Features

1. **Authorization:**
   - Server-side captain verification on every request
   - RLS policies enforce data access
   - Cannot bypass via URL manipulation

2. **Data Protection:**
   - No PII exposed in URLs
   - Sensitive operations require confirmation
   - Audit trail via reviewed_by field

3. **Input Validation:**
   - Jersey number validation (0-99)
   - SQL injection prevention via Supabase
   - XSS protection via React

4. **Error Handling:**
   - Sanitized error messages
   - No stack traces in production
   - User-friendly error states

---

## Performance Optimizations

1. **Data Fetching:**
   - Server-side data fetching (no client waterfalls)
   - Parallel queries where possible
   - Efficient database indexes on captain_id

2. **UI Updates:**
   - Optimistic UI updates
   - Local state management
   - Minimal re-renders

3. **Caching:**
   - Next.js page caching
   - Revalidation on mutations
   - Browser caching for static assets

---

## Testing Recommendations

### Manual Testing:

1. **As Captain:**
   - Access captain dashboard
   - Approve/reject join requests
   - View roster
   - Remove players
   - View upcoming games

2. **As Non-Captain:**
   - Try accessing captain dashboard (should see access denied)
   - Verify cannot manipulate URL to access

3. **Edge Cases:**
   - Captain with multiple teams
   - Team with no pending requests
   - Empty roster
   - Full roster (cannot add more)

### Automated Testing (Future):

```typescript
// Suggested E2E tests
describe('Captain Dashboard', () => {
  it('should allow captain to approve join request', async () => {
    // Test approval flow
  });

  it('should prevent non-captain access', async () => {
    // Test authorization
  });

  it('should allow captain to remove player', async () => {
    // Test roster management
  });
});
```

---

## Future Enhancements

### Potential Additions:

1. **Bulk Actions:**
   - Approve multiple requests at once
   - Export roster to CSV

2. **Communication:**
   - Email templates for approved/rejected requests
   - In-app messaging to players

3. **Advanced Roster Management:**
   - Edit player positions
   - Update jersey numbers
   - Add custom notes per player

4. **Team Settings:**
   - Captain-editable team info (within limits)
   - Team announcements
   - Team documents/forms

5. **Statistics Enhancement:**
   - Real-time game stats
   - Player performance tracking
   - Team analytics dashboard

6. **Mobile App:**
   - Native mobile app for captains
   - Push notifications for join requests
   - Quick access to roster

---

## Files Created/Modified

### New Files:

1. `apps/league-builder/src/lib/actions/captain.ts` - Server actions
2. `apps/league-builder/src/app/[locale]/dashboard/captain/[teamId]/page.tsx` - Page component
3. `apps/league-builder/src/components/captain/CaptainDashboard.tsx` - Main dashboard
4. `apps/league-builder/src/components/captain/JoinRequestsManager.tsx` - Join requests UI
5. `apps/league-builder/src/components/captain/CaptainRosterManager.tsx` - Roster management
6. `apps/league-builder/src/components/dashboard/DashboardSidebar.tsx` - Sidebar with captain teams

### Modified Files:

1. `apps/league-builder/src/app/[locale]/dashboard/layout.tsx` - Updated to server component with captain teams

---

## Dependencies

**Existing:**
- Supabase (database + auth)
- Next.js 14+ (app router)
- React 18+
- Tailwind CSS
- Lucide React (icons)
- next-intl (i18n)

**No New Dependencies Added** ✅

---

## Integration Points

1. **Team Join Requests System:**
   - Uses existing migration `20260126_create_team_join_requests.sql`
   - Integrates with player registration flow

2. **Team Roster System:**
   - Uses existing `team_rosters` table
   - Compatible with existing roster management

3. **Dashboard Navigation:**
   - Integrates with existing sidebar
   - Uses existing routing patterns

4. **Permission System:**
   - Compatible with future permission enhancements
   - Uses captain_id column on teams table

---

## Documentation

**User-Facing:**
- In-app tooltips and help text
- Empty states with guidance
- Error messages with next steps

**Developer-Facing:**
- Inline code comments
- TypeScript types for all data structures
- This implementation document

---

## Deployment Notes

### Pre-Deployment Checklist:

- [ ] Ensure `20260126_create_team_join_requests.sql` migration applied
- [ ] Verify RLS policies enabled on all tables
- [ ] Test captain access with real data
- [ ] Test non-captain access denial
- [ ] Verify email notifications (if implemented)
- [ ] Test on mobile devices
- [ ] Performance test with large rosters (50+ players)
- [ ] Security audit of captain endpoints

### Environment Variables:

No new environment variables required. Uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

---

## Support & Maintenance

### Common Issues:

1. **"Access Denied" for captains:**
   - Verify `captain_id` set correctly on `teams` table
   - Check RLS policies are enabled
   - Verify user is authenticated

2. **Join requests not showing:**
   - Check `team_join_requests` table has data
   - Verify RLS policies allow captain access
   - Check status filter (default is 'pending')

3. **Cannot remove player:**
   - Verify player is not the captain
   - Check `team_rosters` has active record
   - Verify RLS policies allow update

### Monitoring:

- Monitor error logs for authorization failures
- Track join request approval/rejection rates
- Monitor page load times for captain dashboard
- Track captain engagement metrics

---

## Conclusion

The captain dashboard provides a focused, secure interface for team captains to manage their teams. It follows the DEVELOPMENT_WORKFLOW.md framework, uses existing database infrastructure, and integrates seamlessly with the existing application.

The implementation prioritizes:
- **Security** - Server-side authorization on all operations
- **User Experience** - Clean, intuitive interface with clear actions
- **Performance** - Efficient data fetching and minimal re-renders
- **Maintainability** - Well-structured code with clear separation of concerns

Team captains can now efficiently manage their roster, review join requests, and stay informed about their team's schedule and statistics.

---

**Next Steps:**
1. Add email notifications when join requests are approved/rejected
2. Implement captain-editable team settings
3. Add bulk operations for roster management
4. Create mobile-optimized views
5. Add real-time game statistics integration
