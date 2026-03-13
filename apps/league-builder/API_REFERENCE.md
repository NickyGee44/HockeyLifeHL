# Platform 1 (League Builder) API Reference

**Version:** 1.0.0
**Last Updated:** 2026-01-31

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Server Actions](#server-actions)
  - [Authentication Actions](#authentication-actions)
  - [Organization Actions](#organization-actions)
  - [League Wizard Actions](#league-wizard-actions)
  - [Roster Actions](#roster-actions)
  - [Subscription Actions](#subscription-actions)
  - [Dashboard Actions](#dashboard-actions)
- [REST API Routes](#rest-api-routes)
  - [Team Roster Endpoints](#team-roster-endpoints)
  - [Team Staff Endpoints](#team-staff-endpoints)
  - [Stripe Webhooks](#stripe-webhooks)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Security Considerations](#security-considerations)

---

## Overview

Platform 1 (League Builder) is a Next.js application that uses **Server Actions** as the primary API pattern instead of traditional REST endpoints. Server Actions provide type-safe, server-side functions that can be called directly from React components with automatic serialization and CSRF protection.

### Key Features

- **Server Actions**: Type-safe, server-side functions with automatic serialization
- **Supabase RLS**: Row-Level Security enforces authorization at the database level
- **Stripe Integration**: Comprehensive subscription management with webhook support
- **Real-time Updates**: Cache revalidation via Next.js revalidatePath/revalidateTag
- **GDPR/CCPA Compliance**: User consent tracking and account deletion support

---

## Architecture

### Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth
- **Payment Processing**: Stripe
- **Caching**: Next.js unstable_cache with revalidation

### API Patterns

1. **Server Actions**: Primary pattern for mutations and data fetching
   - Located in `apps/league-builder/src/lib/actions/`
   - Use `'use server'` directive
   - Return `{ success: boolean, data?: T, error?: string }`

2. **REST API Routes**: Limited use for external integrations
   - Located in `apps/league-builder/src/app/api/`
   - Used for Stripe webhooks and potential third-party integrations
   - Return standard HTTP responses

---

## Authentication

All Server Actions and API routes require authentication unless explicitly noted.

### Session Management

Authentication is handled by Supabase Auth with cookie-based sessions:

```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return { error: 'Not authenticated' };
}
```

### Token-Based Authentication (API Routes)

For REST API routes, authentication is validated via Supabase:

```typescript
const authHeader = request.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const { data: { user }, error } = await supabase.auth.getUser(token);
```

---

## Authorization

Authorization is enforced at **three layers**:

### 1. Row-Level Security (RLS)

All database tables have RLS policies enabled:

```sql
-- Example: Only organization owners can update their organization
CREATE POLICY "Users can update their own organization"
ON organizations FOR UPDATE
USING (auth.uid() = owner_user_id);
```

### 2. Server Action Checks

Actions verify ownership before operations:

```typescript
// Verify organization ownership
const { data: org } = await supabase
  .from('organizations')
  .select('owner_user_id')
  .eq('id', organizationId)
  .single();

if (org.owner_user_id !== user.id) {
  return { error: 'Not authorized' };
}
```

### 3. Database Functions (SECURITY DEFINER)

Critical operations use PostgreSQL functions with explicit permission checks:

```sql
CREATE OR REPLACE FUNCTION get_user_dashboard_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  -- ... rest of function
END;
$$;
```

---

## Server Actions

Server Actions are the primary API pattern for Platform 1. They provide type-safe, server-side functions callable from React components.

### Common Response Format

All Server Actions return a consistent response format:

```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

---

## Authentication Actions

**File:** `apps/league-builder/src/lib/actions/auth.ts`

### signUp

Creates a new user account with organization.

**Function Signature:**
```typescript
async function signUp(formData: FormData): Promise<ActionResult<void>>
```

**Parameters (FormData):**
- `email` (string, required): User's email address
- `password` (string, required): Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
- `fullName` (string, required): User's full name
- `organizationName` (string, required): Name of the organization to create
- `acceptTerms` (boolean, required): Must be `on` to accept Terms of Service
- `acceptPrivacy` (boolean, required): Must be `on` to accept Privacy Policy
- `marketingEmails` (boolean, optional): Opt-in for marketing emails
- `analyticsTracking` (boolean, optional): Opt-in for analytics tracking

**Response:**
- **Success**: Redirects to `/dashboard`
- **Error**: `{ error: string }`

**Process:**
1. Validates password strength
2. Checks GDPR/CCPA consents
3. Creates user with service role (auto-confirms email)
4. Creates profile with 'owner' role
5. Stores user consents
6. Creates organization with 14-day trial
7. Signs in user and redirects

**Security:**
- Uses service role client for atomic operation
- Validates password complexity
- Requires consent acceptance
- Cleans up on failure (deletes user/profile/org)

**Example Usage:**
```typescript
'use client';

import { signUp } from '@/lib/actions/auth';

export function SignUpForm() {
  async function handleSubmit(formData: FormData) {
    const result = await signUp(formData);
    if (result?.error) {
      console.error(result.error);
    }
    // On success, user is redirected to /dashboard
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <input name="fullName" type="text" required />
      <input name="organizationName" type="text" required />
      <input name="acceptTerms" type="checkbox" required />
      <input name="acceptPrivacy" type="checkbox" required />
      <input name="marketingEmails" type="checkbox" />
      <input name="analyticsTracking" type="checkbox" />
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

**RLS Policies:**
- None (uses service role client)
- Auth user is created via Supabase Admin API

**Rate Limiting:**
- Consider implementing rate limiting on signup to prevent abuse
- Recommended: 5 signups per IP per hour

---

### signIn

Authenticates an existing user.

**Function Signature:**
```typescript
async function signIn(formData: FormData): Promise<ActionResult<void>>
```

**Parameters (FormData):**
- `email` (string, required): User's email address
- `password` (string, required): User's password

**Response:**
- **Success**: Redirects to `/dashboard`
- **Error**: `{ error: string }`

**Example Usage:**
```typescript
'use client';

import { signIn } from '@/lib/actions/auth';

export function SignInForm() {
  async function handleSubmit(formData: FormData) {
    const result = await signIn(formData);
    if (result?.error) {
      alert(result.error);
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

**Security:**
- Uses Supabase Auth signInWithPassword
- Protects against brute force via Supabase rate limiting

**Rate Limiting:**
- Supabase default: 30 attempts per hour per IP

---

### signOut

Signs out the current user.

**Function Signature:**
```typescript
async function signOut(): Promise<void>
```

**Parameters:** None

**Response:**
- Redirects to `/login`

**Example Usage:**
```typescript
'use client';

import { signOut } from '@/lib/actions/auth';

export function SignOutButton() {
  return (
    <button onClick={() => signOut()}>
      Sign Out
    </button>
  );
}
```

---

### getCurrentUser

Retrieves the current authenticated user with profile.

**Function Signature:**
```typescript
async function getCurrentUser(): Promise<{
  user: User;
  profile: Profile;
} | null>
```

**Parameters:** None

**Response:**
```typescript
{
  user: {
    id: string;
    email: string;
    // ... Supabase User object
  };
  profile: {
    id: string;
    email: string;
    full_name: string;
    role: 'owner' | 'admin' | 'member';
    // ... other profile fields
  }
} | null
```

**Example Usage:**
```typescript
import { getCurrentUser } from '@/lib/actions/auth';

export default async function ProfilePage() {
  const userData = await getCurrentUser();

  if (!userData) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <h1>Welcome, {userData.profile.full_name}</h1>
      <p>Email: {userData.user.email}</p>
    </div>
  );
}
```

**RLS Policies:**
- `profiles`: Users can read their own profile

---

### getUserOrganizations

Retrieves all organizations owned by the current user.

**Function Signature:**
```typescript
async function getUserOrganizations(): Promise<Organization[]>
```

**Parameters:** None

**Response:**
```typescript
Organization[] // Array of organization objects
```

**Example Usage:**
```typescript
import { getUserOrganizations } from '@/lib/actions/auth';

export default async function OrganizationsPage() {
  const organizations = await getUserOrganizations();

  return (
    <div>
      <h1>My Organizations</h1>
      {organizations.map(org => (
        <div key={org.id}>
          <h2>{org.name}</h2>
          <p>Tier: {org.subscription_tier}</p>
        </div>
      ))}
    </div>
  );
}
```

**Security:**
- Only returns organizations where user is owner
- Uses authenticated session to get user ID (prevents IDOR)

**RLS Policies:**
- `organizations`: Users can read organizations they own

---

## Organization Actions

**File:** `apps/league-builder/src/lib/actions/organization.ts`

### updateOrganizationProfile

Updates organization name and slug.

**Function Signature:**
```typescript
async function updateOrganizationProfile(
  formData: FormData
): Promise<ActionResult<void>>
```

**Parameters (FormData):**
- `organizationId` (string, required): Organization UUID
- `name` (string, required): New organization name
- `slug` (string, required): URL-safe slug (lowercase, alphanumeric, hyphens)

**Response:**
```typescript
{ success: true } | { success: false; error: string }
```

**Validation:**
- Slug must match regex: `/^[a-z0-9-]+$/`
- Slug must be unique across all organizations
- User must be organization owner

**Example Usage:**
```typescript
'use client';

import { updateOrganizationProfile } from '@/lib/actions/organization';

export function OrganizationSettingsForm({ org }) {
  async function handleSubmit(formData: FormData) {
    const result = await updateOrganizationProfile(formData);
    if (result.success) {
      alert('Organization updated!');
    } else {
      alert(result.error);
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="organizationId" value={org.id} />
      <input name="name" defaultValue={org.name} required />
      <input name="slug" defaultValue={org.slug} required />
      <button type="submit">Update</button>
    </form>
  );
}
```

**Cache Invalidation:**
- Revalidates `/dashboard` and `/dashboard/settings`

**RLS Policies:**
- `organizations`: Only owner can update

---

### getOrganization

Retrieves a single organization by ID.

**Function Signature:**
```typescript
async function getOrganization(
  organizationId: string
): Promise<Organization | null>
```

**Parameters:**
- `organizationId` (string): Organization UUID

**Response:**
```typescript
Organization | null
```

**Example Usage:**
```typescript
import { getOrganization } from '@/lib/actions/organization';

export default async function OrganizationPage({ params }) {
  const org = await getOrganization(params.orgId);

  if (!org) {
    return <div>Organization not found</div>;
  }

  return <div>{org.name}</div>;
}
```

**Authorization:**
- Only returns organization if current user is owner

---

### getOrganizationMembers

Retrieves all members of an organization.

**Function Signature:**
```typescript
async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[] | null>
```

**Parameters:**
- `organizationId` (string): Organization UUID

**Response:**
```typescript
OrganizationMember[] | null

type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'active';
  invited_by: string | null;
  created_at: string;
  profiles: {
    email: string;
    full_name: string;
  };
}
```

**Example Usage:**
```typescript
import { getOrganizationMembers } from '@/lib/actions/organization';

export default async function MembersPage({ params }) {
  const members = await getOrganizationMembers(params.orgId);

  return (
    <ul>
      {members?.map(member => (
        <li key={member.id}>
          {member.profiles.full_name} ({member.role})
        </li>
      ))}
    </ul>
  );
}
```

**RLS Policies:**
- `organization_members`: Members can read other members

---

### inviteOrganizationMember

Invites a user to join an organization.

**Function Signature:**
```typescript
async function inviteOrganizationMember(
  formData: FormData
): Promise<ActionResult<void>>
```

**Parameters (FormData):**
- `organizationId` (string, required): Organization UUID
- `email` (string, required): Email of user to invite
- `role` (string, required): Role to assign ('admin' | 'member')

**Response:**
```typescript
{ success: true } | { success: false; error: string }
```

**Process:**
1. Verifies inviter has permission (owner or admin)
2. Checks if user with email exists (must have account)
3. Checks if user is already a member
4. Creates organization_members record with status='pending'

**Example Usage:**
```typescript
'use client';

import { inviteOrganizationMember } from '@/lib/actions/organization';

export function InviteMemberForm({ orgId }) {
  async function handleSubmit(formData: FormData) {
    const result = await inviteOrganizationMember(formData);
    if (result.success) {
      alert('Invitation sent!');
    } else {
      alert(result.error);
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="organizationId" value={orgId} />
      <input name="email" type="email" required />
      <select name="role">
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit">Invite</button>
    </form>
  );
}
```

**Cache Invalidation:**
- Revalidates `/dashboard/settings/members`

**RLS Policies:**
- `organization_members`: Admin/owner can insert

---

### updateMemberRole

Updates a member's role in the organization.

**Function Signature:**
```typescript
async function updateMemberRole(
  formData: FormData
): Promise<ActionResult<void>>
```

**Parameters (FormData):**
- `organizationId` (string, required): Organization UUID
- `memberId` (string, required): Organization member record ID
- `role` (string, required): New role ('admin' | 'member')

**Authorization:**
- Only organization owner can change roles

**Example Usage:**
```typescript
'use client';

import { updateMemberRole } from '@/lib/actions/organization';

export function UpdateRoleForm({ orgId, memberId, currentRole }) {
  async function handleSubmit(formData: FormData) {
    const result = await updateMemberRole(formData);
    // Handle result
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="organizationId" value={orgId} />
      <input type="hidden" name="memberId" value={memberId} />
      <select name="role" defaultValue={currentRole}>
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit">Update Role</button>
    </form>
  );
}
```

**Cache Invalidation:**
- Revalidates `/dashboard/settings/members`

---

### removeOrganizationMember

Removes a member from the organization.

**Function Signature:**
```typescript
async function removeOrganizationMember(
  formData: FormData
): Promise<ActionResult<void>>
```

**Parameters (FormData):**
- `organizationId` (string, required): Organization UUID
- `memberId` (string, required): Organization member record ID

**Authorization:**
- Only organization owner can remove members
- Cannot remove the owner

**Example Usage:**
```typescript
'use client';

import { removeOrganizationMember } from '@/lib/actions/organization';

export function RemoveMemberButton({ orgId, memberId }) {
  async function handleRemove() {
    const formData = new FormData();
    formData.append('organizationId', orgId);
    formData.append('memberId', memberId);

    const result = await removeOrganizationMember(formData);
    // Handle result
  }

  return <button onClick={handleRemove}>Remove</button>;
}
```

**Cache Invalidation:**
- Revalidates `/dashboard/settings/members`

---

## League Wizard Actions

**File:** `apps/league-builder/src/lib/actions/league-wizard.ts`

### saveDraft

Saves league wizard progress as a draft.

**Function Signature:**
```typescript
async function saveDraft(
  data: Partial<WizardFormData>
): Promise<ActionResult<{ draftId: string }>>
```

**Parameters:**
```typescript
type WizardFormData = {
  // Step 1: League Information
  name?: string;
  description?: string;
  city?: string;
  state_province?: string;
  country?: string;
  timezone?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;

  // Step 2: Season Settings
  season_name?: string;
  season_start_date?: string;
  season_end_date?: string;
  registration_type?: 'open' | 'approval_required' | 'invite_only';
  registration_opens?: string;
  registration_closes?: string;
  game_duration_minutes?: number;
  period_count?: number;

  // Step 3: Teams
  teams?: Array<{
    name: string;
    short_name?: string;
    color?: string;
  }>;
}
```

**Response:**
```typescript
{ success: true; data: { draftId: string } } | { success: false; error: string }
```

**Process:**
1. Gets user's organization
2. Checks for existing draft (one draft per user)
3. Creates or updates draft league with status='draft'
4. Stores wizard data in league.settings JSONB field

**Example Usage:**
```typescript
'use client';

import { saveDraft } from '@/lib/actions/league-wizard';

export function LeagueWizard() {
  async function handleSaveDraft(data: Partial<WizardFormData>) {
    const result = await saveDraft(data);

    if (result.success) {
      console.log('Draft saved:', result.data.draftId);
    }
  }

  return (
    <button onClick={() => handleSaveDraft({ name: 'My League' })}>
      Save Draft
    </button>
  );
}
```

**RLS Policies:**
- `leagues`: Users can insert/update their own drafts

---

### getDraft (not exported, internal)

Retrieves user's current draft league.

**Function Signature:**
```typescript
async function getDraft(): Promise<ActionResult<Partial<WizardFormData> | null>>
```

**Parameters:** None

**Response:**
```typescript
{ success: true; data: WizardFormData | null } | { success: false; error: string }
```

**Note:** This function is used internally by the wizard component.

---

### deleteDraft

Deletes a draft league.

**Function Signature:**
```typescript
async function deleteDraft(
  draftId: string
): Promise<ActionResult<void>>
```

**Parameters:**
- `draftId` (string): Draft league UUID

**Response:**
```typescript
{ success: true } | { success: false; error: string }
```

**Authorization:**
- User must own the draft
- Draft must have status='draft'

**Example Usage:**
```typescript
import { deleteDraft } from '@/lib/actions/league-wizard';

async function handleDeleteDraft(draftId: string) {
  const result = await deleteDraft(draftId);

  if (result.success) {
    console.log('Draft deleted');
  }
}
```

---

### createLeague (publishLeague)

Atomically creates a complete league with all related records.

**Function Signature:**
```typescript
async function createLeague(
  formData: WizardFormData
): Promise<ActionResult<{
  leagueId: string;
  slug: string;
  seasonId: string;
}>>
```

**Parameters:**
```typescript
type WizardFormData = {
  // All fields required (validated by wizardSchema)
  name: string;
  description?: string;
  city: string;
  state_province: string;
  country: string;
  timezone: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  season_name: string;
  season_start_date: string;
  season_end_date: string;
  registration_type: 'open' | 'approval_required' | 'invite_only';
  registration_opens?: string;
  registration_closes?: string;
  game_duration_minutes: number;
  period_count: number;
  teams?: Array<{
    name: string;
    short_name?: string;
    color?: string;
  }>;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    leagueId: string;
    slug: string;
    seasonId: string;
  }
} | {
  success: false;
  error: string;
}
```

**Atomic Process:**
1. Validates form data with Zod schema
2. Gets user's organization
3. Generates unique slug with collision detection
4. Creates league (status='active')
5. Creates league_membership (role='owner')
6. Creates season
7. Creates teams (if provided)
8. Deletes draft (if exists)
9. **Rollback**: Deletes league on any error (cascades to all related)

**Example Usage:**
```typescript
'use client';

import { createLeague } from '@/lib/actions/league-wizard';

export function PublishLeagueButton({ wizardData }) {
  async function handlePublish() {
    const result = await createLeague(wizardData);

    if (result.success) {
      console.log('League created:', result.data.leagueId);
      // Redirect to league page
      window.location.href = `/leagues/${result.data.slug}`;
    } else {
      alert(result.error);
    }
  }

  return <button onClick={handlePublish}>Publish League</button>;
}
```

**Cache Invalidation:**
- Revalidates `/dashboard` and `/dashboard/leagues`

**Security:**
- Uses service role client for atomic operation
- All authorization enforced via organization ownership
- Rollback on failure ensures data consistency

**RLS Policies:**
- Bypassed via service role for atomic operations

---

## Roster Actions

**File:** `apps/league-builder/src/lib/actions/roster.ts`

### addPlayerToRoster

Adds a player to a team roster with jersey number validation.

**Function Signature:**
```typescript
async function addPlayerToRoster(params: {
  teamId: string;
  playerId: string;
  seasonId: string;
  jerseyNumber: number;
  position: 'forward' | 'defense' | 'goalie';
  leadershipRole?: 'captain' | 'alternate' | null;
}): Promise<ActionResult<TeamRoster>>
```

**Parameters:**
- `teamId` (string): Team UUID
- `playerId` (string): Player UUID
- `seasonId` (string): Season UUID
- `jerseyNumber` (number): Jersey number (1-99)
- `position` ('forward' | 'defense' | 'goalie'): Player position
- `leadershipRole` ('captain' | 'alternate' | null): Optional leadership role

**Response:**
```typescript
{
  success: true;
  data: {
    id: string;
    team_id: string;
    player_id: string;
    season_id: string;
    division_id: string;
    jersey_number: number;
    position: string;
    status: string;
    leadership_role: string | null;
    start_date: string;
    end_date: string | null;
  }
} | {
  success: false;
  error: string;
}
```

**Validation:**
- Jersey number must be available (checked via RPC `is_jersey_available`)
- Only one captain per team per season
- Player cannot be on multiple teams in same division

**Example Usage:**
```typescript
import { addPlayerToRoster } from '@/lib/actions/roster';

async function handleAddPlayer() {
  const result = await addPlayerToRoster({
    teamId: 'team-uuid',
    playerId: 'player-uuid',
    seasonId: 'season-uuid',
    jerseyNumber: 99,
    position: 'forward',
    leadershipRole: 'captain'
  });

  if (result.success) {
    console.log('Player added:', result.data);
  }
}
```

**Cache Invalidation:**
- Revalidates `/teams/${teamId}`

**Authorization:**
- User must own the organization that owns the league
- Verified via `verifyTeamAccess` helper

**RLS Policies:**
- `team_rosters`: Insert requires team ownership

---

### updateJerseyNumber

Updates a player's jersey number (creates new temporal record).

**Function Signature:**
```typescript
async function updateJerseyNumber(params: {
  rosterId: string;
  newJerseyNumber: number;
}): Promise<ActionResult<TeamRoster>>
```

**Parameters:**
- `rosterId` (string): Team roster record UUID
- `newJerseyNumber` (number): New jersey number (1-99)

**Process:**
1. Gets current roster entry
2. Validates new jersey number is available
3. Sets end_date on current roster entry
4. Creates new roster entry with new jersey number

**Example Usage:**
```typescript
import { updateJerseyNumber } from '@/lib/actions/roster';

async function handleUpdateJersey(rosterId: string) {
  const result = await updateJerseyNumber({
    rosterId,
    newJerseyNumber: 88
  });

  if (result.success) {
    console.log('Jersey updated:', result.data);
  }
}
```

**Cache Invalidation:**
- Revalidates `/teams/${teamId}`

---

### assignCaptain

Assigns or removes captain/alternate captain designation.

**Function Signature:**
```typescript
async function assignCaptain(params: {
  teamId: string;
  playerId: string;
  seasonId: string;
  role: 'captain' | 'alternate' | null;
}): Promise<ActionResult<TeamRoster>>
```

**Parameters:**
- `teamId` (string): Team UUID
- `playerId` (string): Player UUID
- `seasonId` (string): Season UUID
- `role` ('captain' | 'alternate' | null): Leadership role

**Process:**
- If assigning captain, removes current captain first
- Updates player's leadership_role

**Example Usage:**
```typescript
import { assignCaptain } from '@/lib/actions/roster';

async function handleAssignCaptain() {
  const result = await assignCaptain({
    teamId: 'team-uuid',
    playerId: 'player-uuid',
    seasonId: 'season-uuid',
    role: 'captain'
  });

  if (result.success) {
    console.log('Captain assigned');
  }
}
```

**Cache Invalidation:**
- Revalidates `/teams/${teamId}`

---

### updatePlayerStatus

Updates a player's roster status.

**Function Signature:**
```typescript
async function updatePlayerStatus(params: {
  rosterId: string;
  status: 'active' | 'inactive' | 'injured' | 'suspended' | 'traded';
}): Promise<ActionResult<TeamRoster>>
```

**Parameters:**
- `rosterId` (string): Team roster record UUID
- `status` (RosterStatus): New status

**Example Usage:**
```typescript
import { updatePlayerStatus } from '@/lib/actions/roster';

async function handleMarkInjured(rosterId: string) {
  const result = await updatePlayerStatus({
    rosterId,
    status: 'injured'
  });

  if (result.success) {
    console.log('Status updated');
  }
}
```

**Cache Invalidation:**
- Revalidates `/teams/${teamId}`

---

### removePlayerFromRoster

Removes a player from roster (sets end_date).

**Function Signature:**
```typescript
async function removePlayerFromRoster(
  rosterId: string
): Promise<ActionResult<void>>
```

**Parameters:**
- `rosterId` (string): Team roster record UUID

**Process:**
- Sets end_date to current timestamp (temporal data pattern)

**Example Usage:**
```typescript
import { removePlayerFromRoster } from '@/lib/actions/roster';

async function handleRemovePlayer(rosterId: string) {
  const result = await removePlayerFromRoster(rosterId);

  if (result.success) {
    console.log('Player removed from roster');
  }
}
```

**Cache Invalidation:**
- Revalidates `/teams/${teamId}`

---

### addStaffMember

Adds a staff member to a team.

**Function Signature:**
```typescript
async function addStaffMember(params: {
  teamId: string;
  personId: string;
  seasonId: string;
  role: 'head_coach' | 'assistant_coach' | 'goalie_coach' | 'manager' | 'trainer' | 'equipment_manager';
}): Promise<ActionResult<TeamStaff>>
```

**Parameters:**
- `teamId` (string): Team UUID
- `personId` (string): User UUID
- `seasonId` (string): Season UUID
- `role` (StaffRole): Staff role

**Example Usage:**
```typescript
import { addStaffMember } from '@/lib/actions/roster';

async function handleAddCoach() {
  const result = await addStaffMember({
    teamId: 'team-uuid',
    personId: 'user-uuid',
    seasonId: 'season-uuid',
    role: 'head_coach'
  });

  if (result.success) {
    console.log('Staff added:', result.data);
  }
}
```

**Cache Invalidation:**
- Revalidates `/teams/${teamId}`

---

### removeStaffMember

Removes a staff member from team (sets end_date).

**Function Signature:**
```typescript
async function removeStaffMember(
  staffId: string
): Promise<ActionResult<void>>
```

**Parameters:**
- `staffId` (string): Team staff record UUID

**Example Usage:**
```typescript
import { removeStaffMember } from '@/lib/actions/roster';

async function handleRemoveStaff(staffId: string) {
  const result = await removeStaffMember(staffId);

  if (result.success) {
    console.log('Staff removed');
  }
}
```

**Cache Invalidation:**
- Revalidates `/teams/${teamId}`

---

### getTeamRoster

Retrieves current team roster (active players).

**Function Signature:**
```typescript
async function getTeamRoster(
  teamId: string,
  seasonId: string
): Promise<ActionResult<TeamRosterPlayer[]>>
```

**Parameters:**
- `teamId` (string): Team UUID
- `seasonId` (string): Season UUID

**Response:**
```typescript
{
  success: true;
  data: TeamRosterPlayer[]
} | {
  success: false;
  error: string;
}
```

**Example Usage:**
```typescript
import { getTeamRoster } from '@/lib/actions/roster';

export default async function RosterPage({ params }) {
  const result = await getTeamRoster(params.teamId, params.seasonId);

  if (!result.success) {
    return <div>Error: {result.error}</div>;
  }

  return (
    <ul>
      {result.data.map(player => (
        <li key={player.id}>
          #{player.jersey_number} {player.full_name} ({player.position})
        </li>
      ))}
    </ul>
  );
}
```

**RLS Policies:**
- `team_rosters`: Public read access

---

### getTeamStaff

Retrieves team staff members.

**Function Signature:**
```typescript
async function getTeamStaff(
  teamId: string,
  seasonId: string
): Promise<ActionResult<TeamStaffMember[]>>
```

**Parameters:**
- `teamId` (string): Team UUID
- `seasonId` (string): Season UUID

**Example Usage:**
```typescript
import { getTeamStaff } from '@/lib/actions/roster';

export default async function StaffPage({ params }) {
  const result = await getTeamStaff(params.teamId, params.seasonId);

  if (!result.success) {
    return <div>Error: {result.error}</div>;
  }

  return (
    <ul>
      {result.data.map(staff => (
        <li key={staff.id}>
          {staff.profiles.full_name} - {staff.role}
        </li>
      ))}
    </ul>
  );
}
```

**RLS Policies:**
- `team_staff`: Public read access

---

## Subscription Actions

**File:** `apps/league-builder/src/lib/actions/subscription.ts`

### getCurrentSubscription

Retrieves the current organization subscription.

**Function Signature:**
```typescript
async function getCurrentSubscription(): Promise<ActionResult<OrganizationSubscription>>
```

**Parameters:** None

**Response:**
```typescript
{
  success: true;
  data: {
    tier: 'starter' | 'professional' | 'enterprise';
    status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    trialEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
    // ... other fields
  }
} | {
  success: false;
  error: string;
}
```

**Example Usage:**
```typescript
import { getCurrentSubscription } from '@/lib/actions/subscription';

export default async function SubscriptionPage() {
  const result = await getCurrentSubscription();

  if (!result.success) {
    return <div>Error loading subscription</div>;
  }

  return (
    <div>
      <h1>Current Plan: {result.data.tier}</h1>
      <p>Status: {result.data.status}</p>
    </div>
  );
}
```

**Security:**
- Fetches latest data from Stripe if subscription exists
- Only returns subscription for authenticated user's organization

---

### createOrganizationSubscription

Creates a new subscription for the organization.

**Function Signature:**
```typescript
async function createOrganizationSubscription(
  tier: 'starter' | 'professional' | 'enterprise',
  paymentMethodId?: string,
  trialDays: number = 14
): Promise<ActionResult<{
  subscriptionId: string;
  clientSecret?: string;
  requiresAction: boolean;
}>>
```

**Parameters:**
- `tier` (SubscriptionTier): Subscription tier
- `paymentMethodId` (string, optional): Stripe payment method ID
- `trialDays` (number, default: 14): Trial period days

**Response:**
```typescript
{
  success: true;
  data: {
    subscriptionId: string;
    clientSecret?: string; // If payment requires action
    requiresAction: boolean;
  }
} | {
  success: false;
  error: string;
}
```

**Process:**
1. Gets user's organization
2. Creates Stripe customer (if needed)
3. Checks trial eligibility (prevents abuse)
4. Attaches payment method (if provided)
5. Creates subscription with trial
6. Updates organization record
7. Logs subscription event

**Security:**
- Trial abuse prevention via customer history check
- Idempotency keys prevent duplicate subscriptions
- Service role used for database updates

**Example Usage:**
```typescript
'use client';

import { createOrganizationSubscription } from '@/lib/actions/subscription';

async function handleSubscribe(paymentMethodId: string) {
  const result = await createOrganizationSubscription(
    'professional',
    paymentMethodId,
    14
  );

  if (result.success) {
    if (result.data.requiresAction && result.data.clientSecret) {
      // Handle 3D Secure authentication
      const stripe = await loadStripe(publishableKey);
      await stripe.confirmPayment({
        clientSecret: result.data.clientSecret
      });
    } else {
      console.log('Subscription created!');
    }
  }
}
```

---

### upgradeSubscription

Upgrades subscription to a higher tier (immediate with proration).

**Function Signature:**
```typescript
async function upgradeSubscription(
  newTier: 'professional' | 'enterprise'
): Promise<ActionResult<void>>
```

**Parameters:**
- `newTier` (SubscriptionTier): New subscription tier

**Process:**
1. Validates subscription exists
2. Updates Stripe subscription with proration
3. Updates organization record with optimistic locking
4. Logs upgrade event

**Security:**
- Optimistic locking prevents concurrent modification
- Idempotency key includes version number

**Example Usage:**
```typescript
import { upgradeSubscription } from '@/lib/actions/subscription';

async function handleUpgrade() {
  const result = await upgradeSubscription('enterprise');

  if (result.success) {
    console.log('Upgraded to enterprise!');
  } else {
    alert(result.error);
  }
}
```

---

### downgradeSubscription

Downgrades subscription to a lower tier (effective at period end).

**Function Signature:**
```typescript
async function downgradeSubscription(
  newTier: 'starter' | 'professional'
): Promise<ActionResult<{ effectiveDate: Date }>>
```

**Parameters:**
- `newTier` (SubscriptionTier): New subscription tier

**Response:**
```typescript
{
  success: true;
  data: { effectiveDate: Date }
} | {
  success: false;
  error: string;
}
```

**Process:**
- Schedules downgrade for end of billing period (no proration)
- Updates subscription with optimistic locking
- Logs downgrade event

**Example Usage:**
```typescript
import { downgradeSubscription } from '@/lib/actions/subscription';

async function handleDowngrade() {
  const result = await downgradeSubscription('starter');

  if (result.success) {
    console.log('Downgrade scheduled for:', result.data.effectiveDate);
  }
}
```

---

### cancelSubscription

Cancels the organization subscription.

**Function Signature:**
```typescript
async function cancelSubscription(
  cancelImmediately: boolean = false,
  reason?: string,
  feedback?: string
): Promise<ActionResult<{ effectiveDate: Date }>>
```

**Parameters:**
- `cancelImmediately` (boolean, default: false): Cancel now vs. at period end
- `reason` (string, optional): Cancellation reason
- `feedback` (string, optional): User feedback

**Response:**
```typescript
{
  success: true;
  data: { effectiveDate: Date }
} | {
  success: false;
  error: string;
}
```

**Example Usage:**
```typescript
import { cancelSubscription } from '@/lib/actions/subscription';

async function handleCancel() {
  const result = await cancelSubscription(
    false, // Cancel at period end
    'too_expensive',
    'Great product, but we need to reduce costs'
  );

  if (result.success) {
    console.log('Subscription will end on:', result.data.effectiveDate);
  }
}
```

---

### reactivateSubscription

Reactivates a subscription scheduled for cancellation.

**Function Signature:**
```typescript
async function reactivateSubscription(): Promise<ActionResult<void>>
```

**Parameters:** None

**Process:**
- Clears cancel_at_period_end flag
- Updates organization record with optimistic locking
- Logs reactivation event

**Example Usage:**
```typescript
import { reactivateSubscription } from '@/lib/actions/subscription';

async function handleReactivate() {
  const result = await reactivateSubscription();

  if (result.success) {
    console.log('Subscription reactivated!');
  }
}
```

---

### updatePaymentMethod

Updates the default payment method for the organization.

**Function Signature:**
```typescript
async function updatePaymentMethod(
  paymentMethodId: string
): Promise<ActionResult<void>>
```

**Parameters:**
- `paymentMethodId` (string): Stripe payment method ID

**Security:**
- Verifies payment method exists and isn't attached to another customer
- Uses idempotency keys for attach and update operations

**Example Usage:**
```typescript
'use client';

import { updatePaymentMethod } from '@/lib/actions/subscription';
import { loadStripe } from '@stripe/stripe-js';

async function handleUpdateCard() {
  const stripe = await loadStripe(publishableKey);
  const { paymentMethod } = await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement
  });

  if (paymentMethod) {
    const result = await updatePaymentMethod(paymentMethod.id);

    if (result.success) {
      console.log('Payment method updated!');
    }
  }
}
```

---

### createBillingPortalSession

Creates a Stripe billing portal session.

**Function Signature:**
```typescript
async function createBillingPortalSession(
  returnUrl: string
): Promise<ActionResult<{ url: string }>>
```

**Parameters:**
- `returnUrl` (string): URL to return to after portal session

**Response:**
```typescript
{
  success: true;
  data: { url: string }
} | {
  success: false;
  error: string;
}
```

**Example Usage:**
```typescript
import { createBillingPortalSession } from '@/lib/actions/subscription';

async function handleOpenBillingPortal() {
  const result = await createBillingPortalSession(
    window.location.href
  );

  if (result.success) {
    window.location.href = result.data.url;
  }
}
```

---

### getBillingHistory

Retrieves billing history (invoices).

**Function Signature:**
```typescript
async function getBillingHistory(): Promise<ActionResult<{ invoices: Invoice[] }>>
```

**Parameters:** None

**Response:**
```typescript
{
  success: true;
  data: {
    invoices: Array<{
      id: string;
      amount: number;
      status: string;
      paidAt: Date | null;
      dueDate: Date | null;
      invoicePdf: string | null;
      invoiceUrl: string | null;
      description: string | null;
      currency: string;
    }>
  }
} | {
  success: false;
  error: string;
}
```

**Example Usage:**
```typescript
import { getBillingHistory } from '@/lib/actions/subscription';

export default async function InvoicesPage() {
  const result = await getBillingHistory();

  if (!result.success) {
    return <div>Error loading invoices</div>;
  }

  return (
    <ul>
      {result.data.invoices.map(invoice => (
        <li key={invoice.id}>
          ${invoice.amount / 100} - {invoice.status}
          {invoice.invoicePdf && (
            <a href={invoice.invoicePdf} target="_blank">PDF</a>
          )}
        </li>
      ))}
    </ul>
  );
}
```

---

### getProrationPreview

Previews proration amount for subscription change.

**Function Signature:**
```typescript
async function getProrationPreview(
  newTier: SubscriptionTier
): Promise<ActionResult<{
  amountDue: number;
  currentPeriodEnd: Date;
  nextInvoiceDate: Date;
  prorationDate: Date;
}>>
```

**Parameters:**
- `newTier` (SubscriptionTier): Tier to preview

**Response:**
```typescript
{
  success: true;
  data: {
    amountDue: number; // In cents
    currentPeriodEnd: Date;
    nextInvoiceDate: Date;
    prorationDate: Date;
  }
} | {
  success: false;
  error: string;
}
```

**Example Usage:**
```typescript
import { getProrationPreview } from '@/lib/actions/subscription';

async function showUpgradePreview() {
  const result = await getProrationPreview('enterprise');

  if (result.success) {
    console.log(`You'll be charged $${result.data.amountDue / 100} today`);
  }
}
```

---

## Dashboard Actions

**File:** `apps/league-builder/src/lib/actions/dashboard.ts`

### getCachedDashboardData

Retrieves dashboard data with caching.

**Function Signature:**
```typescript
async function getCachedDashboardData(): Promise<DashboardData | null>
```

**Parameters:** None

**Response:**
```typescript
{
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    subscription_status: string;
    trial_ends_at: string | null;
    created_at: string;
    league_count: number;
    leagues: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      created_at: string;
      team_count: number;
      player_count: number;
    }>;
  }>;
  totals: {
    total_organizations: number;
    total_leagues: number;
    total_teams: number;
    total_players: number;
  };
} | null
```

**Caching:**
- TTL: 60 seconds
- Tag: `dashboard-${userId}`
- Uses Next.js unstable_cache
- Revalidated on mutations

**Security:**
- Uses secure RPC function with SECURITY DEFINER
- RPC validates user exists in auth.users
- Explicit permission checks in database function

**Example Usage:**
```typescript
import { getCachedDashboardData } from '@/lib/actions/dashboard';

export default async function Dashboard() {
  const data = await getCachedDashboardData();

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Total Leagues: {data.totals.total_leagues}</h1>
      <h2>Total Teams: {data.totals.total_teams}</h2>
      <h3>Total Players: {data.totals.total_players}</h3>
    </div>
  );
}
```

---

### revalidateDashboardCache

Revalidates dashboard cache for a user.

**Function Signature:**
```typescript
async function revalidateDashboardCache(userId: string): Promise<void>
```

**Parameters:**
- `userId` (string): User UUID

**Usage:**
Called from mutation actions to invalidate cache:

```typescript
import { revalidateDashboardCache } from '@/lib/actions/dashboard';

async function createLeague(data: LeagueData) {
  // Create league...

  // Invalidate dashboard cache
  await revalidateDashboardCache(userId);
}
```

---

## REST API Routes

Platform 1 has limited REST API routes, primarily for external integrations.

---

## Team Roster Endpoints

**File:** `apps/league-builder/src/app/api/teams/[teamId]/roster/route.ts`

### GET /api/teams/:teamId/roster

Retrieves team roster.

**HTTP Method:** GET

**Parameters:**
- **Path**: `teamId` (string) - Team UUID
- **Query**: `seasonId` (string, required) - Season UUID

**Response:**
```json
[
  {
    "id": "uuid",
    "team_id": "uuid",
    "player_id": "uuid",
    "season_id": "uuid",
    "jersey_number": 99,
    "position": "forward",
    "status": "active",
    "leadership_role": "captain",
    "full_name": "John Doe"
  }
]
```

**Example:**
```bash
curl -X GET "https://leaguebuilder.example.com/api/teams/team-uuid/roster?seasonId=season-uuid" \
  -H "Authorization: <YOUR_ACCESS_TOKEN>"
```

**Error Responses:**
- `400`: Missing seasonId parameter
- `401`: Unauthorized
- `404`: Team not found

---

### POST /api/teams/:teamId/roster

Adds a player to the roster.

**HTTP Method:** POST

**Parameters:**
- **Path**: `teamId` (string) - Team UUID
- **Body** (JSON):
  ```json
  {
    "playerId": "uuid",
    "seasonId": "uuid",
    "jerseyNumber": 99,
    "position": "forward",
    "leadershipRole": "captain" // optional
  }
  ```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "team_id": "uuid",
  "player_id": "uuid",
  "season_id": "uuid",
  "jersey_number": 99,
  "position": "forward",
  "status": "active",
  "leadership_role": "captain"
}
```

**Example:**
```bash
curl -X POST "https://leaguebuilder.example.com/api/teams/team-uuid/roster" \
  -H "Authorization: <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player-uuid",
    "seasonId": "season-uuid",
    "jerseyNumber": 99,
    "position": "forward"
  }'
```

**Validation:**
- `jerseyNumber`: 1-99
- `position`: 'forward' | 'defense' | 'goalie'
- `leadershipRole`: 'captain' | 'alternate' (optional)

**Error Responses:**
- `400`: Missing required fields or validation error
- `401`: Unauthorized
- `409`: Jersey number already in use

---

### PATCH /api/teams/:teamId/roster/:rosterId

Updates roster entry.

**HTTP Method:** PATCH

**Parameters:**
- **Path**: `teamId` (string), `rosterId` (string)
- **Body** (JSON) - one of:
  ```json
  // Update jersey number
  { "jerseyNumber": 88 }

  // Update status
  { "status": "injured" }

  // Update leadership role
  {
    "leadershipRole": "captain",
    "playerId": "uuid",
    "seasonId": "uuid"
  }
  ```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "team_id": "uuid",
  // ... updated roster entry
}
```

**Example:**
```bash
curl -X PATCH "https://leaguebuilder.example.com/api/teams/team-uuid/roster/roster-uuid" \
  -H "Authorization: <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "injured" }'
```

**Error Responses:**
- `400`: Invalid update fields
- `401`: Unauthorized
- `404`: Roster entry not found

---

### DELETE /api/teams/:teamId/roster/:rosterId

Removes player from roster.

**HTTP Method:** DELETE

**Parameters:**
- **Path**: `teamId` (string), `rosterId` (string)

**Response:** `200 OK`
```json
{ "success": true }
```

**Example:**
```bash
curl -X DELETE "https://leaguebuilder.example.com/api/teams/team-uuid/roster/roster-uuid" \
  -H "Authorization: <YOUR_ACCESS_TOKEN>"
```

**Error Responses:**
- `401`: Unauthorized
- `404`: Roster entry not found

---

## Team Staff Endpoints

**File:** `apps/league-builder/src/app/api/teams/[teamId]/staff/route.ts`

### GET /api/teams/:teamId/staff

Retrieves team staff.

**HTTP Method:** GET

**Parameters:**
- **Path**: `teamId` (string) - Team UUID
- **Query**: `seasonId` (string, required) - Season UUID

**Response:**
```json
[
  {
    "id": "uuid",
    "team_id": "uuid",
    "person_id": "uuid",
    "season_id": "uuid",
    "role": "head_coach",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": null,
    "profiles": {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

---

### POST /api/teams/:teamId/staff

Adds a staff member.

**HTTP Method:** POST

**Parameters:**
- **Path**: `teamId` (string) - Team UUID
- **Body** (JSON):
  ```json
  {
    "personId": "uuid",
    "seasonId": "uuid",
    "role": "head_coach"
  }
  ```

**Valid Roles:**
- `head_coach`
- `assistant_coach`
- `goalie_coach`
- `manager`
- `trainer`
- `equipment_manager`

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "team_id": "uuid",
  "person_id": "uuid",
  "season_id": "uuid",
  "role": "head_coach",
  "start_date": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**
- `400`: Missing required fields or invalid role
- `401`: Unauthorized

---

### DELETE /api/teams/:teamId/staff/:staffId

Removes staff member.

**HTTP Method:** DELETE

**Parameters:**
- **Path**: `teamId` (string), `staffId` (string)

**Response:** `200 OK`
```json
{ "success": true }
```

---

## Stripe Webhooks

**File:** `apps/league-builder/src/app/api/stripe/webhooks/subscriptions/route.ts`

### POST /api/stripe/webhooks/subscriptions

Handles Stripe webhook events for organization subscriptions.

**HTTP Method:** POST

**Headers:**
- `stripe-signature` (required): Webhook signature for verification

**Supported Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_method.attached`

**Security:**
- Verifies webhook signature using Stripe SDK
- Checks for duplicate events (idempotent)
- Verifies event ordering (timestamps)
- Uses optimistic locking for updates

**Event Processing:**

1. **customer.subscription.created**
   - Creates subscription record
   - Updates organization tier and status
   - Logs event

2. **customer.subscription.updated**
   - Determines event type (upgraded/downgraded/updated)
   - Updates organization
   - Logs event

3. **customer.subscription.deleted**
   - Downgrades to free tier
   - Sets status to 'canceled'
   - Logs event

4. **invoice.paid**
   - Restores subscription if was past_due
   - Logs payment success

5. **invoice.payment_failed**
   - Sets subscription to past_due
   - Logs payment failure

6. **payment_method.attached**
   - Updates default payment method
   - Stores card last4 and brand

**Configuration:**

Required environment variable:
```bash
STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_...
```

**Testing with Stripe CLI:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks/subscriptions
stripe trigger customer.subscription.created
```

**Response:**
```json
{ "received": true }
```

**Error Responses:**
- `400`: Missing signature or invalid signature
- `500`: Webhook processing failed

---

## Error Handling

### Server Action Error Format

All Server Actions return errors in a consistent format:

```typescript
{
  success: false;
  error: string; // Human-readable error message
}
```

### REST API Error Format

REST endpoints return standard HTTP status codes with JSON body:

```json
{
  "error": "Human-readable error message"
}
```

### Common Error Codes

#### Server Actions
- `Not authenticated` - User not logged in
- `Not authorized` - User lacks permission
- `Organization not found` - Organization doesn't exist or user doesn't have access
- `Validation failed` - Input validation error

#### REST API
- `400 Bad Request` - Validation error or missing parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but lacks permission
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource (e.g., jersey number)
- `500 Internal Server Error` - Unexpected server error

### Error Handling Best Practices

**Client-Side:**
```typescript
const result = await someAction(data);

if (!result.success) {
  // Show error to user
  toast.error(result.error);
  return;
}

// Handle success
toast.success('Action completed!');
console.log(result.data);
```

**Server-Side:**
```typescript
try {
  // Perform action
  const data = await someOperation();
  return { success: true, data };
} catch (error) {
  console.error('Action error:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}
```

---

## Rate Limiting

### Current Status

Platform 1 does not currently implement application-level rate limiting.

### Supabase Default Limits

Supabase enforces default rate limits:
- **Auth**: 30 requests/hour per IP (signIn, signUp)
- **Database**: Based on plan tier
- **Storage**: Based on plan tier

### Recommended Implementation

For production, implement rate limiting on sensitive actions:

**Sign Up:**
- 5 signups per IP per hour
- 3 signups per email per day

**Authentication:**
- 30 login attempts per IP per hour
- 5 failed attempts per email per 15 minutes

**API Routes:**
- 1000 requests per IP per hour
- 100 requests per user per minute

**Stripe Webhooks:**
- No limit (verified by signature)

### Implementation Example

```typescript
import { ratelimit } from '@/lib/redis';

export async function signUp(formData: FormData) {
  const ip = headers().get('x-forwarded-for') || 'unknown';

  const { success } = await ratelimit.limit(
    `signup:${ip}`,
    5, // 5 requests
    3600 // per hour
  );

  if (!success) {
    return { error: 'Too many signup attempts. Please try again later.' };
  }

  // ... rest of signup logic
}
```

---

## Security Considerations

### Authentication

1. **Session-Based Auth**: All requests use Supabase session cookies
2. **Token Expiry**: Sessions expire after inactivity
3. **Refresh Tokens**: Automatically refreshed by Supabase client
4. **Password Requirements**: Min 8 chars, uppercase, lowercase, number, special char

### Authorization

1. **Row-Level Security (RLS)**: All database tables have RLS enabled
2. **Explicit Checks**: Server Actions verify ownership before operations
3. **SECURITY DEFINER**: Database functions with explicit permission checks
4. **No Parameter Injection**: User IDs from session, never from parameters (prevents IDOR)

### Data Protection

1. **GDPR/CCPA Compliance**:
   - User consent tracking
   - Data export functionality
   - Account deletion with cascading

2. **PCI Compliance**:
   - No card data touches our servers
   - Stripe.js handles all payment data
   - PCI SAQ-A compliant

3. **Encryption**:
   - HTTPS/TLS for all traffic
   - Database encryption at rest (Supabase)
   - Secrets stored in environment variables

### API Security

1. **CSRF Protection**: Server Actions have built-in CSRF protection
2. **Input Validation**: All inputs validated with Zod schemas
3. **SQL Injection**: Prevented by Supabase parameterized queries
4. **XSS Prevention**: React auto-escapes output

### Stripe Integration Security

1. **Webhook Verification**: All webhooks verified with signature
2. **Idempotency**: Prevents duplicate charges
3. **Optimistic Locking**: Prevents concurrent modification races
4. **Event Ordering**: Ensures events processed in order
5. **Trial Abuse Prevention**: Checks customer history before allowing trial

### Best Practices

1. **Never Trust Client Input**: Validate all inputs server-side
2. **Least Privilege**: Users only access what they own
3. **Defense in Depth**: Multiple layers of authorization
4. **Audit Logging**: All subscription events logged
5. **Error Messages**: Generic errors in production (no sensitive data)
6. **Secrets Management**: Never commit secrets, use environment variables

### Security Headers

Implement these headers for production:

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
};
```

---

## Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Next.js Server Actions**: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- **Stripe API**: https://stripe.com/docs/api
- **Type Definitions**: See `apps/league-builder/api-types.ts`
- **OpenAPI Spec**: See `apps/league-builder/openapi.yaml`
- **Postman Collection**: See `apps/league-builder/postman-collection.json`

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-31
**Maintainer:** Platform 1 Team
