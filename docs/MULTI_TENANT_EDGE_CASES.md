# Multi-Tenant Edge Cases & Best Practices

**Purpose:** Document edge cases, gotchas, and best practices for multi-tenant HockeyLifeHL
**Author:** Agent 1 - Database & Infrastructure
**Date:** January 25, 2026

---

## 🚨 Critical Edge Cases

### 1. User Switching Between Leagues

**Scenario:** User belongs to multiple leagues and switches between them

**Edge Cases:**
- Active league stored in session/cookie might get out of sync
- Cached data from previous league might be shown
- Pending operations from League A might execute in League B context

**Solution:**
```typescript
// ALWAYS re-fetch data when league changes
useEffect(() => {
  if (activeLeagueId) {
    // Clear stale data
    setTeams([]);
    setGames([]);
    // Re-fetch for new league
    fetchLeagueData(activeLeagueId);
  }
}, [activeLeagueId]);
```

**Best Practice:**
- Invalidate all cached data when league switches
- Re-fetch league-specific data
- Update URL to include league context (e.g., `/[league-slug]/teams`)

---

### 2. User in Multiple Leagues with Different Roles

**Scenario:** User is owner in League A, but member in League B

**Edge Cases:**
- UI might show admin features when user switches to League B
- Permission checks might use cached role from previous league
- User expects same permissions across all leagues

**Solution:**
```typescript
// Check role for CURRENT active league
const { data: membership } = await supabase
  .from('league_memberships')
  .select('role')
  .eq('league_id', currentLeagueId) // NOT cached league
  .eq('user_id', userId)
  .single();

// Update UI based on current league role
const canManageTeams = ['owner', 'admin'].includes(membership?.role);
```

**Best Practice:**
- Re-check permissions when league changes
- Don't cache user role globally - it's league-specific
- Show/hide features dynamically based on current league role

---

### 3. Foreign Key References Across Leagues

**Scenario:** Trying to create a game with teams from different leagues

**Edge Cases:**
- Home team from League A, Away team from League B
- Season from one league, teams from another
- Draft picks referencing players from wrong league

**Solution:**
```typescript
// ALWAYS verify foreign keys belong to same league
const { data: homeTeam } = await supabase
  .from('teams')
  .select('league_id')
  .eq('id', homeTeamId)
  .single();

const { data: awayTeam } = await supabase
  .from('teams')
  .select('league_id')
  .eq('id', awayTeamId)
  .single();

if (homeTeam.league_id !== leagueId || awayTeam.league_id !== leagueId) {
  throw new Error('Teams must belong to the same league');
}
```

**Best Practice:**
- Validate all foreign key references before INSERT/UPDATE
- Use database foreign key constraints to enforce referential integrity
- Return meaningful error messages for cross-league violations

---

### 4. Orphaned Records After League Deletion

**Scenario:** League is deleted, leaving orphaned data

**Edge Cases:**
- Teams, games, stats still exist but league is gone
- User memberships point to non-existent league
- Active league ID in session points to deleted league

**Solution:**
```sql
-- Use ON DELETE CASCADE for all foreign keys
ALTER TABLE teams
ADD CONSTRAINT fk_teams_league
FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;
```

**Best Practice:**
- All league_id foreign keys should have `ON DELETE CASCADE`
- Before deleting league, show confirmation with impact summary
- Archive leagues instead of deleting (set status = 'archived')

---

### 5. Duplicate Slugs Across Leagues

**Scenario:** Two leagues want the same slug (e.g., "warriors")

**Edge Cases:**
- Slug conflicts break subdomain routing
- Users can't access both leagues via subdomain
- SEO issues with duplicate slugs

**Solution:**
```sql
-- Enforce unique slugs globally
ALTER TABLE leagues
ADD CONSTRAINT unique_league_slug UNIQUE (slug);
```

**Validation:**
```typescript
// Check slug availability before creating league
const { data: existing } = await supabase
  .rpc('is_league_slug_available', { check_slug: slug });

if (!existing) {
  return { error: 'Slug already taken. Try: warriors-2026, warriors-elite' };
}
```

**Best Practice:**
- Slugs must be globally unique
- Suggest alternatives if slug is taken
- Allow custom domains as alternative to slugs

---

### 6. RLS Bypass with Service Role

**Scenario:** Service role operations don't respect RLS

**Edge Cases:**
- Background jobs might leak data across leagues
- Cron jobs return data from all leagues
- Admin panel shows all leagues' data

**Solution:**
```typescript
// ALWAYS filter by league_id, even with service role
const { data: stats } = await supabaseAdmin // service role client
  .from('player_stats')
  .select('*')
  .eq('league_id', leagueId); // CRITICAL: Still filter by league
```

**Best Practice:**
- Never rely solely on RLS for data isolation
- Always explicitly filter by league_id in queries
- Use service role only when necessary (migrations, cron jobs)

---

### 7. Scorekeeper Assigned to Multiple Leagues

**Scenario:** Scorekeeper works for multiple leagues

**Edge Cases:**
- Same person is scorekeeper in League A and League B
- Dashboard shows games from all leagues mixed together
- Payment calculations across leagues get confusing

**Solution:**
```typescript
// Filter scorekeeper assignments by active league
const { data: assignments } = await supabase
  .from('game_scorekeeper_assignments')
  .select('*')
  .eq('scorekeeper_id', userId)
  .eq('league_id', activeLeagueId) // Filter by active league
  .order('assigned_at', { ascending: false });
```

**Best Practice:**
- Scorekeeper dashboard should filter by active league
- Show league selector prominently
- Calculate payments per league separately

---

### 8. User Leaves League But Data Remains

**Scenario:** User leaves a league (status = 'left')

**Edge Cases:**
- User's stats/games still exist but they can't access them
- User can be re-invited to same league
- Historical data must be preserved

**Solution:**
```typescript
// On leave, set status = 'left', keep data
const { error } = await supabase
  .from('league_memberships')
  .update({ status: 'left', left_at: new Date().toISOString() })
  .eq('league_id', leagueId)
  .eq('user_id', userId);

// Don't delete membership or related data
// On re-invite, reactivate:
// UPDATE league_memberships SET status = 'active', left_at = NULL
```

**Best Practice:**
- Never DELETE memberships - use status = 'left'
- Preserve user's historical data (stats, games played)
- Allow re-inviting with status reactivation

---

### 9. League Owner Transfers Ownership

**Scenario:** Owner wants to transfer ownership to another admin

**Edge Cases:**
- Only one owner per league (constraint)
- New owner might not be an admin yet
- Old owner might want to stay as admin

**Solution:**
```typescript
// Transaction: demote old owner, promote new owner
const { error } = await supabase.rpc('transfer_league_ownership', {
  league_id: leagueId,
  old_owner_id: oldOwnerId,
  new_owner_id: newOwnerId,
  keep_old_owner_as_admin: true, // option
});

// SQL function with transaction:
CREATE OR REPLACE FUNCTION transfer_league_ownership(
  league_id UUID,
  old_owner_id UUID,
  new_owner_id UUID,
  keep_old_owner_as_admin BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  -- Promote new owner
  UPDATE league_memberships
  SET role = 'owner'
  WHERE league_id = league_id AND user_id = new_owner_id;

  -- Demote old owner
  UPDATE league_memberships
  SET role = CASE WHEN keep_old_owner_as_admin THEN 'admin' ELSE 'member' END
  WHERE league_id = league_id AND user_id = old_owner_id;
END;
$$ LANGUAGE plpgsql;
```

**Best Practice:**
- Use database transaction for ownership transfer
- Require confirmation from both users
- Log ownership changes in audit_logs table

---

### 10. Stat Entry Conflicts (Multiple People Editing)

**Scenario:** Captain and scorekeeper both entering stats for same game

**Edge Cases:**
- Duplicate stat entries
- Conflicting scores (captain says 3-2, scorekeeper says 4-2)
- Last write wins (data loss)

**Solution:**
```typescript
// Use optimistic locking with version/updated_at
const { data: game, error } = await supabase
  .from('games')
  .update({
    home_score: newHomeScore,
    updated_at: new Date().toISOString(),
  })
  .eq('id', gameId)
  .eq('updated_at', expectedUpdatedAt) // Optimistic lock
  .select()
  .single();

if (!game) {
  return { error: 'Game was modified by another user. Please refresh.' };
}
```

**Alternative: Realtime Presence**
```typescript
// Use Supabase Realtime to show who's currently editing
const channel = supabase.channel(`game:${gameId}`);
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    // Show "Scorekeeper is editing..." banner
  })
  .subscribe();
```

**Best Practice:**
- Implement optimistic locking for critical updates
- Use Supabase Realtime to show concurrent editors
- Log all stat changes in game_stat_entry_log for audit trail
- Prefer scorekeeper's entries over captain (configurable)

---

## 🔒 Security Best Practices

### 1. Never Trust Client-Provided league_id

```typescript
// ❌ BAD: Accept league_id from client
async function getTeams(leagueId: string) {
  return await supabase.from('teams').select('*').eq('league_id', leagueId);
}

// ✅ GOOD: Get active league from server session
async function getTeams(userId: string) {
  const activeLeagueId = await getActiveLeagueFromSession(userId);
  const hasAccess = await userHasLeagueAccess(userId, activeLeagueId);
  if (!hasAccess) throw new Error('Access denied');

  return await supabase.from('teams').select('*').eq('league_id', activeLeagueId);
}
```

### 2. Validate ALL Foreign Keys

```typescript
// Before creating a game, verify ALL references
const validations = await Promise.all([
  verifyBelongsToLeague('seasons', seasonId, leagueId),
  verifyBelongsToLeague('teams', homeTeamId, leagueId),
  verifyBelongsToLeague('teams', awayTeamId, leagueId),
  verifyBelongsToLeague('venues', venueId, leagueId),
]);

if (validations.some(v => !v)) {
  throw new Error('Invalid foreign key reference');
}
```

### 3. Use RLS as Defense-in-Depth

```typescript
// Even though RLS will block unauthorized access,
// ALWAYS check permissions explicitly in server actions

// Layer 1: Explicit permission check
if (!isLeagueAdmin(userId, leagueId)) {
  return { error: 'Unauthorized' };
}

// Layer 2: RLS will double-check
const { data, error } = await supabase
  .from('teams')
  .delete()
  .eq('id', teamId)
  .eq('league_id', leagueId);
```

---

## 📊 Performance Best Practices

### 1. Index All league_id Columns

```sql
-- Every table with league_id should have an index
CREATE INDEX idx_teams_league_id ON teams(league_id);
CREATE INDEX idx_games_league_id ON games(league_id);
-- etc.

-- Composite indexes for common query patterns
CREATE INDEX idx_games_league_season ON games(league_id, season_id);
CREATE INDEX idx_player_stats_league_player ON player_stats(league_id, player_id);
```

### 2. Use Helper Functions for Complex Queries

```typescript
// ❌ BAD: Complex aggregation in app code
const stats = await getAllPlayerStats(leagueId, seasonId);
const aggregated = stats.reduce((acc, stat) => {
  // Complex aggregation logic...
});

// ✅ GOOD: Use database function
const { data: stats } = await supabase
  .rpc('get_player_season_stats', {
    check_league_id: leagueId,
    check_season_id: seasonId,
  });
```

### 3. Batch Queries When Possible

```typescript
// ❌ BAD: N+1 query problem
for (const team of teams) {
  const stats = await getTeamStats(team.id);
}

// ✅ GOOD: Single query with JOIN
const { data: teamsWithStats } = await supabase
  .from('teams')
  .select(`
    *,
    games!games_home_team_id_fkey(count),
    games!games_away_team_id_fkey(count)
  `)
  .eq('league_id', leagueId);
```

---

## 🧪 Testing Best Practices

### 1. Test with Multiple Leagues

```typescript
describe('Team Management', () => {
  it('should not leak data between leagues', async () => {
    // Create two leagues
    const league1 = await createTestLeague('League 1');
    const league2 = await createTestLeague('League 2');

    // Create teams in each
    const team1 = await createTeam(league1.id, 'Team 1');
    const team2 = await createTeam(league2.id, 'Team 2');

    // User in League 1 should not see Team 2
    const teams = await getTeams(league1.id, user1.id);
    expect(teams).not.toContainObject(team2);
  });
});
```

### 2. Test Role-Based Permissions

```typescript
it('should enforce role-based access', async () => {
  const owner = await createUser('owner@test.com');
  const member = await createUser('member@test.com');

  await addUserToLeague(league.id, owner.id, 'owner');
  await addUserToLeague(league.id, member.id, 'member');

  // Owner can delete team
  const deleteAsOwner = await deleteTeam(team.id, league.id, owner.id);
  expect(deleteAsOwner.error).toBeNull();

  // Member cannot delete team
  const deleteAsMember = await deleteTeam(team.id, league.id, member.id);
  expect(deleteAsMember.error).toBe('Unauthorized');
});
```

### 3. Test League Switching

```typescript
it('should properly switch between leagues', async () => {
  const user = await createUser('test@test.com');
  await addUserToLeague(league1.id, user.id, 'admin');
  await addUserToLeague(league2.id, user.id, 'member');

  // Switch to League 1
  await setActiveLeague(user.id, league1.id);
  const teams1 = await getTeams(user.id);
  expect(teams1).toHaveLength(league1TeamCount);

  // Switch to League 2
  await setActiveLeague(user.id, league2.id);
  const teams2 = await getTeams(user.id);
  expect(teams2).toHaveLength(league2TeamCount);
});
```

---

## 📝 Documentation Best Practices

### 1. Document All Multi-Tenant Decisions

```typescript
/**
 * Creates a new game for a league
 *
 * MULTI-TENANT NOTES:
 * - Verifies all teams belong to the same league
 * - Requires admin role in the league
 * - Auto-sets league_id from season's league_id
 *
 * @param leagueId - Target league (verified against user membership)
 * @param seasonId - Must belong to same league
 * @param homeTeamId - Must belong to same league
 * @param awayTeamId - Must belong to same league
 */
export async function createGame(...) {
  // ...
}
```

### 2. Add Migration Comments

```sql
-- ==============================================================================
-- MULTI-TENANT MIGRATION: Add league_id to teams
-- ==============================================================================
-- BREAKING CHANGE: All queries must now filter by league_id
-- SECURITY: RLS policy enforces league isolation
-- PERFORMANCE: Index on league_id for fast filtering
-- ==============================================================================
```

---

## 🚀 Deployment Best Practices

### 1. Run Migrations in Correct Order

```bash
# 1. Core tables first
psql < 20260125_create_core_multi_tenant_tables.sql

# 2. Add league_id columns
psql < 20260125_add_league_id_to_core_tables.sql

# 3. Migrate existing data
psql < 20260125_migrate_existing_data_to_league_1.sql

# 4. Add NOT NULL constraints (after data migration)
# Already included in data migration script

# 5. Helper functions last
psql < 20260125_create_league_helper_functions.sql
```

### 2. Backup Before Migrations

```bash
# Always backup before adding league_id or modifying schema
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup_before_multitenant.sql
```

### 3. Test in Staging First

```bash
# Run migrations in staging environment
# Test with multiple leagues
# Verify RLS policies
# Check performance
# THEN deploy to production
```

---

## 🐛 Common Bugs & Solutions

### Bug: "User can see other league's data"

**Cause:** Forgot to filter by league_id in query

**Solution:** Add `.eq('league_id', leagueId)` to all queries

---

### Bug: "Permission denied for relation teams"

**Cause:** Using anon key instead of service role for migration

**Solution:** Use service_role_key for database migrations

---

### Bug: "Duplicate key value violates unique constraint"

**Cause:** Trying to create team with same name in different league, but unique constraint is global

**Solution:** Use composite unique constraint `UNIQUE(league_id, name)`

---

### Bug: "Stats showing 0 for all players"

**Cause:** Querying wrong league's stats

**Solution:** Verify activeLeagueId is correct, add league_id to WHERE clause

---

## 📚 Resources

- Database migrations: `supabase/migrations/`
- Verification queries: `supabase/verification/`
- Helper functions: `supabase/migrations/20260125_create_league_helper_functions.sql`
- Query examples: `docs/AGENT_2_QUERY_EXAMPLES.md`
- RLS testing: `supabase/verification/02_test_rls_policies.sql`

---

**For questions or to report new edge cases, contact Agent 1 or update this document.**
