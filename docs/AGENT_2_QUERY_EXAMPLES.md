# Agent 2: Server Action Query Examples

**Purpose:** Example queries for building league-aware server actions
**Author:** Agent 1 - Database & Infrastructure
**Date:** January 25, 2026

---

## 🎯 Critical Requirements

**EVERY query in server actions MUST:**
1. Filter by `league_id`
2. Check user's league membership
3. Verify user's role/permissions
4. Use RLS-enabled tables (RLS will double-check, but explicit filtering is required)

---

## 📋 Common Query Patterns

### Pattern 1: Get All Records for a League

```typescript
// Get all teams for a league
const { data: teams, error } = await supabase
  .from('teams')
  .select('*')
  .eq('league_id', leagueId)
  .order('name');
```

### Pattern 2: Get Single Record with League Check

```typescript
// Get a specific team, ensuring it belongs to the league
const { data: team, error } = await supabase
  .from('teams')
  .select('*')
  .eq('id', teamId)
  .eq('league_id', leagueId)
  .single();
```

### Pattern 3: Check User's League Membership

```typescript
// Check if user is a member of the league
const { data: membership, error } = await supabase
  .from('league_memberships')
  .select('role, status')
  .eq('league_id', leagueId)
  .eq('user_id', userId)
  .eq('status', 'active')
  .single();

if (!membership) {
  return { error: 'User is not a member of this league' };
}
```

### Pattern 4: Check User's Role/Permissions

```typescript
// Verify user is owner or admin
const { data: membership, error } = await supabase
  .from('league_memberships')
  .select('role')
  .eq('league_id', leagueId)
  .eq('user_id', userId)
  .eq('status', 'active')
  .single();

if (!membership || !['owner', 'admin'].includes(membership.role)) {
  return { error: 'Unauthorized: Requires owner or admin role' };
}
```

### Pattern 5: Insert with League ID

```typescript
// Create a new team
const { data: newTeam, error } = await supabase
  .from('teams')
  .insert({
    league_id: leagueId,
    name: teamName,
    short_name: shortName,
    // ... other fields
  })
  .select()
  .single();
```

### Pattern 6: Update with League Verification

```typescript
// Update a team (ensuring it belongs to the league)
const { data: updatedTeam, error } = await supabase
  .from('teams')
  .update({
    name: newName,
    logo_url: newLogoUrl,
  })
  .eq('id', teamId)
  .eq('league_id', leagueId) // CRITICAL: Ensure team belongs to league
  .select()
  .single();
```

### Pattern 7: Delete with League Verification

```typescript
// Delete a team (ensuring it belongs to the league)
const { error } = await supabase
  .from('teams')
  .delete()
  .eq('id', teamId)
  .eq('league_id', leagueId); // CRITICAL: Ensure team belongs to league
```

---

## 🔍 Example Server Actions

### Example 1: Get User's Leagues

```typescript
export async function getUserLeagues(userId: string) {
  const supabase = createServerClient();

  const { data: memberships, error } = await supabase
    .from('league_memberships')
    .select(`
      league_id,
      role,
      status,
      joined_at,
      leagues (
        id,
        name,
        slug,
        logo_url,
        primary_color,
        secondary_color,
        subscription_tier,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: memberships };
}
```

### Example 2: Create League

```typescript
export async function createLeague(data: {
  name: string;
  slug: string;
  description?: string;
  userId: string;
}) {
  const supabase = createServerClient();

  // 1. Create the league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description,
      created_by: data.userId,
    })
    .select()
    .single();

  if (leagueError) {
    return { error: leagueError.message };
  }

  // 2. Create owner membership for the creator
  const { error: membershipError } = await supabase
    .from('league_memberships')
    .insert({
      league_id: league.id,
      user_id: data.userId,
      role: 'owner',
      status: 'active',
    });

  if (membershipError) {
    return { error: membershipError.message };
  }

  return { data: league };
}
```

### Example 3: Get Teams for League

```typescript
export async function getLeagueTeams(leagueId: string, userId: string) {
  const supabase = createServerClient();

  // 1. Verify user has access to this league
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership) {
    return { error: 'User is not a member of this league' };
  }

  // 2. Get all teams for the league
  const { data: teams, error } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      short_name,
      logo_url,
      primary_color,
      secondary_color,
      captain_id,
      created_at
    `)
    .eq('league_id', leagueId)
    .order('name');

  if (error) {
    return { error: error.message };
  }

  return { data: teams };
}
```

### Example 4: Update League (Owner/Admin Only)

```typescript
export async function updateLeague(
  leagueId: string,
  userId: string,
  updates: Partial<League>
) {
  const supabase = createServerClient();

  // 1. Verify user is owner or admin
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Unauthorized: Requires owner or admin role' };
  }

  // 2. Update the league
  const { data: updatedLeague, error } = await supabase
    .from('leagues')
    .update(updates)
    .eq('id', leagueId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: updatedLeague };
}
```

### Example 5: Get Player Stats for League/Season

```typescript
export async function getPlayerStats(
  leagueId: string,
  seasonId: string,
  userId: string
) {
  const supabase = createServerClient();

  // 1. Verify user has access to this league
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership) {
    return { error: 'User is not a member of this league' };
  }

  // 2. Use the helper function (recommended)
  const { data: stats, error } = await supabase
    .rpc('get_player_season_stats', {
      check_league_id: leagueId,
      check_season_id: seasonId,
    });

  if (error) {
    return { error: error.message };
  }

  return { data: stats };
}
```

### Example 6: Create Game (Admin Only)

```typescript
export async function createGame(
  leagueId: string,
  userId: string,
  gameData: {
    seasonId: string;
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: string;
    location?: string;
  }
) {
  const supabase = createServerClient();

  // 1. Verify user is owner or admin
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Unauthorized: Requires owner or admin role' };
  }

  // 2. Verify all referenced entities belong to the league
  const { data: season } = await supabase
    .from('seasons')
    .select('league_id')
    .eq('id', gameData.seasonId)
    .single();

  if (!season || season.league_id !== leagueId) {
    return { error: 'Season does not belong to this league' };
  }

  const { data: homeTeam } = await supabase
    .from('teams')
    .select('league_id')
    .eq('id', gameData.homeTeamId)
    .single();

  if (!homeTeam || homeTeam.league_id !== leagueId) {
    return { error: 'Home team does not belong to this league' };
  }

  const { data: awayTeam } = await supabase
    .from('teams')
    .select('league_id')
    .eq('id', gameData.awayTeamId)
    .single();

  if (!awayTeam || awayTeam.league_id !== leagueId) {
    return { error: 'Away team does not belong to this league' };
  }

  // 3. Create the game
  const { data: newGame, error } = await supabase
    .from('games')
    .insert({
      league_id: leagueId,
      season_id: gameData.seasonId,
      home_team_id: gameData.homeTeamId,
      away_team_id: gameData.awayTeamId,
      scheduled_at: gameData.scheduledAt,
      location: gameData.location,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: newGame };
}
```

### Example 7: Invite User to League (Admin Only)

```typescript
export async function inviteUserToLeague(
  leagueId: string,
  inviterUserId: string,
  inviteeEmail: string,
  role: 'admin' | 'scorekeeper' | 'member' | 'player'
) {
  const supabase = createServerClient();

  // 1. Verify inviter is owner or admin
  const { data: inviterMembership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', inviterUserId)
    .eq('status', 'active')
    .single();

  if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
    return { error: 'Unauthorized: Requires owner or admin role' };
  }

  // 2. Find user by email
  const { data: inviteeProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', inviteeEmail)
    .single();

  if (!inviteeProfile) {
    return { error: 'User not found with that email' };
  }

  // 3. Check if user is already a member
  const { data: existingMembership } = await supabase
    .from('league_memberships')
    .select('id, status')
    .eq('league_id', leagueId)
    .eq('user_id', inviteeProfile.id)
    .single();

  if (existingMembership) {
    if (existingMembership.status === 'active') {
      return { error: 'User is already a member of this league' };
    }
    // Reactivate if they left
    const { data: reactivated, error } = await supabase
      .from('league_memberships')
      .update({ status: 'active', role })
      .eq('id', existingMembership.id)
      .select()
      .single();

    return { data: reactivated, error: error?.message };
  }

  // 4. Create new membership
  const { data: newMembership, error } = await supabase
    .from('league_memberships')
    .insert({
      league_id: leagueId,
      user_id: inviteeProfile.id,
      role,
      status: 'active',
      invited_by: inviterUserId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // 5. TODO: Send invitation email (via Resend)

  return { data: newMembership };
}
```

---

## 🔒 Using Helper Functions

### Using `is_league_owner()`

```typescript
// Check if user is owner (in SQL query)
const { data: canDelete } = await supabase
  .rpc('is_league_owner', {
    user_uuid: userId,
    check_league_id: leagueId,
  });

if (!canDelete) {
  return { error: 'Only league owners can delete the league' };
}
```

### Using `is_league_admin()`

```typescript
// Check if user is owner or admin
const { data: canManage } = await supabase
  .rpc('is_league_admin', {
    user_uuid: userId,
    check_league_id: leagueId,
  });

if (!canManage) {
  return { error: 'Requires owner or admin role' };
}
```

### Using `get_user_league_ids()`

```typescript
// Get all leagues user belongs to
const { data: leagueIds } = await supabase
  .rpc('get_user_league_ids', {
    user_uuid: userId,
  });

// Returns: [{ league_id: '...' }, { league_id: '...' }]
```

### Using `get_team_standings()`

```typescript
// Get team standings for a league and season
const { data: standings } = await supabase
  .rpc('get_team_standings', {
    check_league_id: leagueId,
    check_season_id: seasonId,
  });

// Returns complete standings with wins, losses, points, etc.
```

---

## ⚠️ Common Pitfalls to Avoid

### ❌ DON'T: Query without league_id filter

```typescript
// WRONG: No league_id filter
const { data: teams } = await supabase
  .from('teams')
  .select('*');
// This might return teams from other leagues (RLS will block, but explicit filter is required)
```

### ✅ DO: Always filter by league_id

```typescript
// CORRECT: Explicit league_id filter
const { data: teams } = await supabase
  .from('teams')
  .select('*')
  .eq('league_id', leagueId);
```

### ❌ DON'T: Skip permission checks

```typescript
// WRONG: No permission check
async function deleteTeam(teamId: string, leagueId: string) {
  return await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)
    .eq('league_id', leagueId);
}
```

### ✅ DO: Verify user permissions first

```typescript
// CORRECT: Check permissions
async function deleteTeam(teamId: string, leagueId: string, userId: string) {
  // Verify user is admin
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Unauthorized' };
  }

  return await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)
    .eq('league_id', leagueId);
}
```

### ❌ DON'T: Trust user-provided league_id without verification

```typescript
// WRONG: Use league_id from client without verification
async function getTeam(teamId: string, leagueId: string) {
  // User could send ANY league_id
  return await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .eq('league_id', leagueId)
    .single();
}
```

### ✅ DO: Verify user has access to the league

```typescript
// CORRECT: Verify league membership first
async function getTeam(teamId: string, leagueId: string, userId: string) {
  // 1. Verify user is member of league
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership) {
    return { error: 'Access denied' };
  }

  // 2. Get the team
  return await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .eq('league_id', leagueId)
    .single();
}
```

---

## 📚 Best Practices

1. **Always verify league membership** before returning data
2. **Always filter by league_id** in queries
3. **Always check user role** for write operations
4. **Use helper functions** for common checks
5. **Validate foreign keys** belong to the same league
6. **Return meaningful errors** for authorization failures
7. **Use transactions** for multi-step operations
8. **Test with multiple leagues** to ensure isolation

---

## 🔗 Related Documentation

- Database schema: `supabase/migrations/`
- Helper functions: `supabase/migrations/20260125_create_league_helper_functions.sql`
- RLS policies: `supabase/migrations/20260125_create_core_multi_tenant_tables.sql`
- Testing: `supabase/verification/02_test_rls_policies.sql`

---

**Questions?** Ask Agent 1 for clarification or additional query examples.
