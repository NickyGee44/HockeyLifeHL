# Season Opt-In and Player Approval System

## Overview

This system implements:
1. **Season Opt-In**: Players must opt in before each season as either "full-time" or "call-up"
2. **Player Approval**: New players must be approved by the owner, or auto-approved via captain invite codes
3. **Draft Filtering**: Only approved, full-time opted-in players appear in drafts

## Database Schema

### Tables Created

1. **`season_opt_ins`**
   - `player_id` - Player who opted in
   - `season_id` - Season they opted into
   - `opt_in_type` - `'full_time'` or `'call_up'`
   - `opted_in_at` - When they opted in

2. **`player_approvals`**
   - `player_id` - Approved player
   - `approved_by` - Owner who approved (or NULL if auto-approved)
   - `approval_method` - `'owner'`, `'invite'`, or `'auto'`
   - `invite_code_id` - Link to invite code if approved via invite

3. **`invite_codes`**
   - `code` - Unique 8-character code
   - `created_by` - Captain/owner who created it
   - `team_id` - Optional: specific team
   - `season_id` - Optional: for specific season
   - `expires_at` - Optional expiration
   - `max_uses` - How many times it can be used
   - `current_uses` - Current usage count
   - `auto_approve` - Whether to auto-approve users

### Database Functions

- `generate_invite_code()` - Generates unique 8-character code
- `is_invite_code_valid(code)` - Validates invite code
- `use_invite_code(code, user_id)` - Uses an invite code and auto-approves if enabled

## Server Actions

### Season Opt-In (`src/lib/seasons/opt-in-actions.ts`)

- `optInToSeason(seasonId, optInType)` - Player opts in as full-time or call-up
- `optOutOfSeason(seasonId)` - Player opts out
- `getPlayerOptInStatus(seasonId)` - Get player's opt-in status
- `getSeasonOptIns(seasonId, optInType?)` - Get all opt-ins for a season (owner/captain)
- `getDraftablePlayers(seasonId)` - Get only full-time opted-in, approved players

### Player Approval (`src/lib/admin/approval-actions.ts`)

- `approvePlayer(playerId, notes?)` - Owner approves a player
- `removePlayerApproval(playerId)` - Owner removes approval
- `getPendingApprovals()` - Get players waiting for approval
- `getApprovedPlayers()` - Get all approved players

### Invite Codes (`src/lib/teams/invite-actions.ts`)

- `createInviteCode(teamId?, seasonId?, expiresAt?, maxUses?, autoApprove?, notes?)` - Create invite code
- `useInviteCode(code)` - Use invite code during registration
- `validateInviteCode(code)` - Check if code is valid (without using it)
- `getInviteCodes(teamId?)` - Get all invite codes (filtered by team if captain)
- `deleteInviteCode(inviteId)` - Delete an invite code

## Workflow

### For Players

1. **Registration:**
   - Player creates account
   - If they have an invite code, they enter it during registration
   - If code is valid and `auto_approve = true`, they're automatically approved
   - Otherwise, they wait for owner approval

2. **Season Opt-In:**
   - Before a new season starts, players must opt in
   - Choose "Full-Time" (can be drafted) or "Call-Up" (emergency/substitute only)
   - Only full-time opted-in players appear in drafts

### For Captains

1. **Creating Invite Codes:**
   - Navigate to team management page
   - Generate invite code for call-ups/guests
   - Set expiration, max uses, auto-approve settings
   - Share code with player

2. **Viewing Opt-Ins:**
   - See who has opted in for the upcoming season
   - See full-time vs call-up breakdown

### For Owners

1. **Approving Players:**
   - View pending approvals
   - Approve or reject new players
   - See approval history

2. **Managing Invites:**
   - View all invite codes
   - See usage statistics
   - Delete expired/unused codes

## Draft Integration

The draft system has been updated to:
- Only show players who opted in as "full-time"
- Only show approved players
- Filter out already drafted players

## UI Components Needed

### Player Pages

1. **`/dashboard/opt-in`** - Season opt-in page
   - Show upcoming season
   - Radio buttons: Full-Time / Call-Up
   - Opt-in button
   - Show current opt-in status

2. **Registration Page Enhancement**
   - Add optional "Invite Code" field
   - Validate code on submit
   - Show auto-approval message if code is valid

### Captain Pages

1. **`/captain/team`** - Add invite code section
   - List of team invite codes
   - Create new invite code button
   - Show usage stats
   - Delete expired codes

2. **`/captain/opt-ins`** - View season opt-ins
   - List of players who opted in
   - Filter by full-time/call-up
   - See opt-in status

### Owner Pages

1. **`/admin/approvals`** - Player approval dashboard
   - Pending approvals list
   - Approve/Reject buttons
   - Approval history
   - Search/filter

2. **`/admin/invites`** - Invite code management
   - All invite codes across league
   - Usage statistics
   - Create/delete codes

3. **`/admin/opt-ins`** - Season opt-in overview
   - All opt-ins for current/upcoming season
   - Full-time vs call-up breakdown
   - Export list for draft

## Registration Flow with Invite Code

```
1. User visits /auth/register
2. Fills out registration form
3. Optional: Enters invite code
4. On submit:
   - If invite code provided:
     - Validate code
     - If valid and auto_approve = true:
       - Create account
       - Use invite code (increments usage)
       - Auto-approve player
     - If valid but auto_approve = false:
       - Create account
       - Use invite code
       - Still requires owner approval
     - If invalid:
       - Show error, don't create account
   - If no invite code:
     - Create account
     - Player waits for owner approval
5. After registration:
   - If approved (auto or manual):
     - Player can opt in to seasons
     - Player can be drafted
   - If not approved:
     - Player sees "Pending Approval" message
     - Cannot opt in or participate
```

## RLS Policies

- **Season Opt-Ins**: Players can manage their own, owners can manage all
- **Player Approvals**: Viewable by all, manageable by owners only
- **Invite Codes**: Viewable by creator and owners, manageable by creator and owners

## Next Steps

1. Run database migration: `supabase/SQL_EDITOR_SEASON_OPT_IN_AND_APPROVAL.sql`
2. Update registration page to include invite code field
3. Create opt-in UI for players
4. Create approval dashboard for owners
5. Create invite code management for captains
6. Test full workflow: registration → approval → opt-in → draft

---

**Files Created:**
- `supabase/SQL_EDITOR_SEASON_OPT_IN_AND_APPROVAL.sql` - Database migration
- `src/lib/seasons/opt-in-actions.ts` - Opt-in server actions
- `src/lib/admin/approval-actions.ts` - Approval server actions
- `src/lib/teams/invite-actions.ts` - Invite code server actions
- Updated `src/lib/draft/actions.ts` - Filter by opt-in and approval
