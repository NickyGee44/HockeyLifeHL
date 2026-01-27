# Multi-Tenant Action Plan - Quick Reference

**Current Status:** 82% Complete
**Goal:** 100% Functional Multi-Tenant SaaS
**Estimated Time:** 35 hours total

---

## 🔴 CRITICAL (Do First - 4.5 hours)

These are blocking production launch for multiple leagues:

### 1. Connect League Signup Form (30 minutes)
**File:** `src/app/(marketing)/signup/league/page.tsx`
**Line:** 72
**Issue:** Form has TODO comment, doesn't actually call server action

**Fix:**
```typescript
// REPLACE THIS:
// TODO: Call createLeague server action
setIsSubmitting(false);
setShowSuccess(true);

// WITH THIS:
const result = await createLeague({
  name: formData.name,
  slug: formData.slug || generateSlug(formData.name),
  sport: formData.sport,
  email: formData.email,
  password: formData.password,
  // ... rest of form data
});

if (result.error) {
  setError(result.error);
  setIsSubmitting(false);
} else {
  setShowSuccess(true);
  setTimeout(() => {
    window.location.href = `/${result.league.slug}/onboarding`;
  }, 3000);
}
```

**Test:**
1. Go to `/signup/league`
2. Fill out form
3. Submit
4. Verify new league is created in database
5. Verify redirect to onboarding

---

### 2. Verify RLS Policies (1 hour)
**Issue:** Policies are defined in migrations but we haven't confirmed they're actually enforced

**Steps:**
```bash
# 1. Run verification script
psql -h <your-supabase-db> -U postgres -d postgres \
  -f supabase/migrations/20260126_verify_rls_policies.sql

# 2. Check output for any tables missing RLS
# Should see "RLS Enabled: true" for all tables

# 3. Test data isolation manually
```

**Manual Test:**
```sql
-- As user in League A, try to query League B data
-- Should return nothing

SELECT * FROM teams WHERE league_id = '<league-b-id>';
-- Expected: 0 rows (if RLS working)
```

**If RLS not enabled:**
```sql
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
-- ... for all tables
```

---

### 3. Security Audit (3 hours)
**Goal:** Verify no cross-league data leakage

**Test Plan:**
1. Create two test leagues (League A, League B)
2. Create test users in each
3. Create data in each (teams, games, etc.)
4. Try these attacks:

```typescript
// Test 1: Can user in League A see League B teams?
const { data } = await supabase
  .from('teams')
  .select('*')
  // Deliberately NOT filtering by league_id
  // RLS should still block League B data

// Expected: Only League A teams returned

// Test 2: Can user force-set League B as active?
await setActiveLeagueId('league-b-id');
// Expected: Error "You do not have access to this league"

// Test 3: Can admin see all leagues?
// Expected: Platform admin should see all, league admin only theirs

// Test 4: SQL injection attempt
await createTeam({
  name: "'; DROP TABLE teams; --"
});
// Expected: Name saved literally, no SQL execution
```

**Create Security Test Script:**
```typescript
// File: tests/security/multi-tenant-isolation.test.ts
describe('Multi-Tenant Security', () => {
  it('should not leak data between leagues', async () => {
    // Test implementation
  });

  it('should enforce role-based access', async () => {
    // Test implementation
  });

  it('should prevent SQL injection', async () => {
    // Test implementation
  });
});
```

---

### 4. Fix League Switcher Navigation (1 hour)
**File:** `src/components/league/league-switcher.tsx`
**Issue:** Switches active league but doesn't navigate to league subdomain

**Current Behavior:**
```typescript
const handleLeagueSwitch = async (league: LeagueOption) => {
  await setActiveLeagueId(league.id);
  setSelectedLeague(league);
  router.refresh(); // ← Just refreshes current page
};
```

**Fixed Behavior:**
```typescript
const handleLeagueSwitch = async (league: LeagueOption) => {
  const result = await setActiveLeagueId(league.id);

  if (result.error) {
    toast.error(`Failed to switch league: ${result.error}`);
    return;
  }

  setSelectedLeague(league);
  toast.success(`Switched to ${league.name}`);

  // Navigate to league subdomain OR league slug path
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'beerleaguehockey.ca';

  // Option 1: If league has subdomain, redirect there
  if (league.subdomain) {
    window.location.href = `https://${league.subdomain}.${platformDomain}`;
  }
  // Option 2: If on platform domain, redirect to /league path
  else {
    router.push(`/${league.slug}`);
    router.refresh();
  }
};
```

**Test:**
1. Create two leagues
2. Add yourself to both
3. Click league switcher
4. Select second league
5. Verify you're redirected to that league's home page

---

## 🟡 HIGH PRIORITY (Full Multi-Tenant - 13 hours)

These are needed to fully support multiple leagues:

### 5. Division Management UI (6 hours)

**Create Server Actions:**
```typescript
// File: src/lib/divisions/actions.ts
'use server';

export async function createDivision(data: DivisionInput) {
  const { leagueId } = await requireLeagueRole(['owner', 'admin']);

  const { data: division, error } = await supabase
    .from('divisions')
    .insert({
      league_id: leagueId,
      name: data.name,
      skill_level: data.skillLevel,
      max_teams: data.maxTeams,
      game_duration_minutes: data.gameDuration,
      period_count: data.periodCount,
    })
    .select()
    .single();

  return { division, error };
}

export async function getAllDivisions() {
  const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'player']);

  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .eq('league_id', leagueId)
    .order('skill_level', { ascending: false });

  return { data, error };
}

export async function updateDivision(id: string, data: Partial<DivisionInput>) {
  const { leagueId } = await requireLeagueRole(['owner', 'admin']);

  const { data: division, error } = await supabase
    .from('divisions')
    .update(data)
    .eq('id', id)
    .eq('league_id', leagueId)
    .select()
    .single();

  return { division, error };
}

export async function deleteDivision(id: string) {
  const { leagueId } = await requireLeagueRole(['owner', 'admin']);

  const { error } = await supabase
    .from('divisions')
    .delete()
    .eq('id', id)
    .eq('league_id', leagueId);

  return { error };
}
```

**Create Settings Page:**
```typescript
// File: src/app/(dashboard)/[league]/settings/divisions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getAllDivisions, createDivision, deleteDivision } from '@/lib/divisions/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DivisionsSettingsPage() {
  const [divisions, setDivisions] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    loadDivisions();
  }, []);

  async function loadDivisions() {
    const { data } = await getAllDivisions();
    setDivisions(data || []);
  }

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1>Divisions</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          Create Division
        </Button>
      </div>

      <div className="grid gap-4">
        {divisions.map(division => (
          <DivisionCard key={division.id} division={division} onDelete={loadDivisions} />
        ))}
      </div>

      <CreateDivisionDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={loadDivisions}
      />
    </div>
  );
}
```

**Add to Settings Navigation:**
```typescript
// File: src/app/(dashboard)/[league]/settings/layout.tsx
const navItems = [
  { name: "General", href: "/settings/general" },
  { name: "Branding", href: "/settings/branding" },
  { name: "Divisions", href: "/settings/divisions" }, // ← ADD THIS
  { name: "Members", href: "/settings/members" },
  // ... rest
];
```

---

### 6. Venue Management UI (6 hours)

**Structure same as divisions above:**

1. Create `src/lib/venues/actions.ts`
2. Create `src/app/(dashboard)/[league]/settings/venues/page.tsx`
3. Add to settings navigation
4. Integrate with game creation (venue dropdown)

**Bonus: Integrate with Games**
```typescript
// File: src/app/(dashboard)/admin/games/page.tsx
// Add venue selection to game creation dialog

<Select
  value={formData.venueId}
  onValueChange={(value) => setFormData({ ...formData, venueId: value })}
>
  <SelectTrigger>
    <SelectValue placeholder="Select venue" />
  </SelectTrigger>
  <SelectContent>
    {venues.map(venue => (
      <SelectItem key={venue.id} value={venue.id}>
        {venue.name} - {venue.city}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## 🟢 MEDIUM PRIORITY (Polish - 15 hours)

### 7. Scorekeeper Admin UI (8 hours)

**Create League Settings Page:**
```typescript
// File: src/app/(dashboard)/[league]/settings/scorekeepers/page.tsx

- List hired scorekeepers
- Invite new scorekeeper button
- Set individual pay rates
- View payment history per scorekeeper
- Remove scorekeeper action
```

**Add Game Assignment Interface:**
```typescript
// File: src/app/(dashboard)/admin/games/[gameId]/assign-scorekeeper.tsx

- Dropdown of available scorekeepers
- Show scorekeeper availability
- Assign to game button
- Send notification checkbox
```

**Create Payment Dashboard:**
```typescript
// File: src/app/(dashboard)/[league]/settings/scorekeepers/payments.tsx

- List all unpaid assignments
- "Mark as Paid" button
- Export to CSV
- Filter by date range
- Total owed summary
```

---

### 8. Custom Domain UX (3 hours)

**Create DNS Instructions Modal:**
```typescript
// File: src/components/domains/DNSInstructionsModal.tsx

1. Show CNAME record to add
2. Current verification status (pending/verified/failed)
3. Auto-refresh check every 30s
4. Copy-to-clipboard button for DNS values
5. Link to DNS provider help docs
```

**Add to League Settings:**
```typescript
// File: src/app/(dashboard)/[league]/settings/general/page.tsx

<FormField label="Custom Domain">
  <Input
    value={customDomain}
    placeholder="yourdomain.com"
    onChange={(e) => setCustomDomain(e.target.value)}
  />
  <Button onClick={verifyDomain}>
    Verify Domain
  </Button>
  <DNSInstructionsModal domain={customDomain} />
</FormField>
```

---

### 9. League Discovery Enhancements (4 hours)

**Add Location Search:**
```typescript
// File: src/app/(public)/discover/page.tsx

<div className="mb-6">
  <Label>Search by Location</Label>
  <Input
    placeholder="City, State or Postal Code"
    onChange={handleLocationSearch}
  />
  <Select value={radius} onValueChange={setRadius}>
    <SelectItem value="10">Within 10km</SelectItem>
    <SelectItem value="25">Within 25km</SelectItem>
    <SelectItem value="50">Within 50km</SelectItem>
  </Select>
</div>
```

**Add Team/Player Counts:**
```typescript
// Modify query to include counts
const { data: leagues } = await supabase
  .from('leagues')
  .select(`
    *,
    teams:teams(count),
    members:league_memberships(count)
  `)
  .eq('is_public', true);

// Display on card
<div className="text-sm text-muted-foreground">
  {league.teams[0].count} teams • {league.members[0].count} players
</div>
```

**Add Join Button:**
```typescript
<Button onClick={() => handleJoinLeague(league.id)}>
  Request to Join
</Button>

async function handleJoinLeague(leagueId: string) {
  // Create league membership request
  const { error } = await supabase
    .from('league_memberships')
    .insert({
      league_id: leagueId,
      user_id: user.id,
      role: 'player',
      status: 'invited', // Pending approval
    });

  if (!error) {
    toast.success('Join request sent! League owner will review.');
  }
}
```

---

## ⚪ LOW PRIORITY (Documentation - 3 hours)

### 10. Update Documentation (2 hours)

**Fix MULTI_TENANT_ARCHITECTURE.md:**
```markdown
# Change:
src/proxy.ts

# To:
middleware.ts
```

**Add Environment Variable Docs:**
```markdown
# Create: docs/ENVIRONMENT_VARIABLES.md

Required Environment Variables:
- NEXT_PUBLIC_PLATFORM_DOMAIN - Your platform domain (e.g., beerleaguehockey.ca)
- NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anonymous key
- SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (server only)
```

**Add Architecture Diagram:**
```markdown
# Create: docs/ARCHITECTURE.md

[Diagram showing]:
1. Request flow (subdomain → middleware → league context)
2. Database schema (leagues → teams → games)
3. Authorization flow (user → membership → role)
```

---

### 11. Add Code Comments (1 hour)

**Add JSDoc to Server Actions:**
```typescript
/**
 * Creates a new division for the active league
 *
 * @param data - Division configuration (name, skill level, max teams, etc.)
 * @returns The created division or an error
 *
 * @throws {Error} If user is not owner or admin of active league
 *
 * @example
 * const { division, error } = await createDivision({
 *   name: "Division 1",
 *   skillLevel: "intermediate",
 *   maxTeams: 8,
 * });
 */
export async function createDivision(data: DivisionInput) {
  // ...
}
```

**Document League Context Flow:**
```typescript
// File: src/lib/auth/league-context.ts

/**
 * MULTI-TENANT LEAGUE CONTEXT
 *
 * This module manages the active league context for authenticated users.
 *
 * FLOW:
 * 1. User signs in
 * 2. Middleware detects subdomain (e.g., pilot.beerleaguehockey.ca)
 * 3. Middleware looks up league by subdomain
 * 4. If user has membership, sets active_league_id cookie
 * 5. All dashboard queries filter by active_league_id
 *
 * SECURITY:
 * - Cookie is httpOnly, secure in production
 * - User membership verified before setting cookie
 * - All server actions use requireLeagueRole() for authorization
 */
```

---

## 📋 Quick Checklist

Use this to track progress:

### Critical (Week 1)
- [ ] Connect league signup form (30 min)
- [ ] Verify RLS policies (1 hour)
- [ ] Run security audit (3 hours)
- [ ] Fix league switcher navigation (1 hour)

### High Priority (Week 2)
- [ ] Create division server actions (2 hours)
- [ ] Build division settings page (4 hours)
- [ ] Create venue server actions (2 hours)
- [ ] Build venue settings page (4 hours)

### Medium Priority (Week 3)
- [ ] Build scorekeeper admin UI (8 hours)
- [ ] Add DNS instructions modal (3 hours)
- [ ] Enhance league discovery (4 hours)

### Low Priority (Week 4)
- [ ] Update documentation (2 hours)
- [ ] Add code comments (1 hour)

---

## 🎯 Success Criteria

**After completing critical items, you'll have:**
✅ Fully functional league signup
✅ Verified data isolation between leagues
✅ No security vulnerabilities
✅ Proper league navigation

**After completing high-priority items, you'll have:**
✅ Complete multi-tenant feature set
✅ Division management
✅ Venue management
✅ Professional admin interface

**After completing all items, you'll have:**
✅ Production-ready multi-tenant SaaS
✅ Polished user experience
✅ Comprehensive documentation
✅ Well-commented codebase

---

**Total Estimated Time: 35 hours**

**Breakdown:**
- Week 1 (Critical): 5.5 hours
- Week 2 (High): 12 hours
- Week 3 (Medium): 15 hours
- Week 4 (Low): 3 hours

**Start with Week 1 items - they're blocking production!**
