# Architectural Decisions Log

**Project**: HockeyLifeHL
**Started**: 2026-02-11
**Purpose**: Document critical architectural decisions made during development

---

## Decision Log Format

Each decision includes:
- **Date**: When the decision was made
- **Context**: What problem we're solving
- **Decision**: What we decided to do
- **Rationale**: Why we chose this approach
- **Alternatives Considered**: What we didn't choose and why
- **Consequences**: Impact of this decision
- **Status**: Active | Superseded | Deprecated

---

## Decisions

### [APPROVED] AD-001: Database Schema vs Code Alignment Strategy
**Date**: 2026-02-11
**Context**: Critical mismatches discovered between database schema and application code in league-sites app. Must decide whether to change DB or change code.

**Decision**: **Change code to match database** (Option 1)

**Rationale**:
- Comprehensive schema analysis revealed database is well-designed and correctly implemented
- Only ONE code bug found: scorekeeper.ts queries non-existent columns
- All other code (99%+) correctly uses database schema
- No data migrations required, zero downtime, minimal risk

**Implementation**:
1. Fix scorekeeper.ts to query `leadership_role` instead of `is_captain`/`is_assistant_captain`
2. Transform enum to booleans in application layer (same pattern as usePlayerProfile.ts)
3. No database changes required

**Consequences**:
- ✅ Preserves existing data and schema
- ✅ Zero migration risk
- ✅ Single file to fix (minimal code changes)
- ✅ Consistent with 99% of existing codebase

**Status**: Active
**See**: SCHEMA_ANALYSIS_REPORT_2026-02-11.md for full details

---

### [APPROVED] AD-002: Team Roster Leadership Model
**Date**: 2026-02-11
**Context**: How to represent captain and alternate captain roles in team_rosters table.

**Decision**: **Use `leadership_role` enum** (NOT boolean columns)

**Enum Values**:
```sql
leadership_role: 'captain' | 'alternate_captain' | NULL
```

**Rationale**:
- Enum enforces mutual exclusivity (player cannot be both captain and alternate)
- More flexible for future roles (e.g., 'assistant_coach', 'team_manager')
- Single column is cleaner than multiple booleans
- Database already uses this pattern successfully
- Most code already transforms enum → booleans correctly

**Pattern to Follow** (from usePlayerProfile.ts):
```typescript
// Query the enum
from('team_rosters')
  .select('leadership_role')

// Transform to booleans in app layer
is_captain: item.leadership_role === 'captain',
is_alternate: item.leadership_role === 'alternate_captain',
```

**Consequences**:
- ✅ Enforces business rule: one leadership role per player
- ✅ Extensible for future roles
- ✅ Consistent with existing database
- ⚠️ Must transform enum to booleans in application layer (acceptable pattern)

**Status**: Active

---

### [APPROVED] AD-003: Player Name Storage Strategy
**Date**: 2026-02-11
**Context**: How to store player names in profiles table.

**Decision**: **Use `full_name` single column** (NOT first_name + last_name)

**Rationale**:
- Handles international names better (not all cultures use first/last pattern)
- Single column simplifies queries and reduces JOIN complexity
- Players can enter their name exactly as they prefer to be called
- Database already uses this pattern
- All code already uses `full_name` correctly

**Examples**:
- "Jean-Claude Van Damme" (hyphenated first name)
- "Elon Musk" (mononym)
- "José María García" (compound names)
- "名前 苗字" (Japanese surname-first order)

**Consequences**:
- ✅ More inclusive of international naming conventions
- ✅ Simpler schema and queries
- ✅ Player autonomy in name representation
- ⚠️ Sorting by last name requires string parsing or separate field (acceptable trade-off)

**Status**: Active

---

### [APPROVED] AD-004: Table Naming Conventions
**Date**: 2026-02-11
**Context**: Standardize table naming to avoid confusion between similar concepts.

**Decision**: **Use descriptive, specific table names**

**Approved Names**:
- ✅ `registration_submissions` (NOT `registrations`)
  - Rationale: Distinguishes submissions from approved registrations
  - Semantic clarity: these are pending/draft submissions

- ✅ `league_waiver_templates` (NOT `waivers`)
  - Rationale: These are templates, not signed waivers
  - Future: `waiver_signatures` table for actual signed waivers
  - Avoids confusion with database reserved words

**Naming Principles**:
1. Be specific and descriptive
2. Avoid ambiguity between similar concepts
3. Prefix with entity when multiple related tables exist
4. Avoid SQL reserved words

**Consequences**:
- ✅ Clear semantic meaning
- ✅ Reduces developer confusion
- ✅ Allows for future expansion (waiver_signatures, registration_approvals)
- ⚠️ Longer table names (acceptable for clarity)

**Status**: Active

---

### [APPROVED] AD-005: RPC Function Naming and Parameter Conventions
**Date**: 2026-02-11
**Context**: Standardize RPC function naming and parameter conventions for consistency.

**Decision**: **Use verb_noun naming + parameter prefixes**

**Function Naming Pattern**:
```sql
get_team_standings  -- ✅ verb_noun
get_stats_leaders   -- ✅ verb_noun
calculate_standings -- ✅ verb_noun
rollup_player_season_stats -- ✅ verb_noun_noun
```

**Parameter Prefix Convention**:
- `check_` prefix for filter/query parameters
  - Example: `check_league_id`, `check_season_id`, `check_division_id`
  - Use case: Filtering data, WHERE clause conditions

- `p_` prefix for data/operation parameters
  - Example: `p_stat_type`, `p_limit`, `p_team_id`
  - Use case: Configuration, limits, operation targets

**Examples**:
```sql
-- ✅ CORRECT
get_team_standings(check_league_id uuid, check_season_id uuid)
get_stats_leaders(p_league_id uuid, p_stat_type text, p_limit int, p_division_id uuid)

-- ❌ INCORRECT
teamStandings(league_id, season_id)  -- Wrong naming, no prefixes
```

**Rationale**:
- Consistent pattern makes code predictable
- Parameter prefixes clarify intent (filter vs data)
- Verified: All existing functions follow this pattern
- Reduces parameter naming collisions

**Consequences**:
- ✅ Predictable API across all RPC functions
- ✅ Self-documenting parameter purposes
- ✅ Easier code reviews and debugging
- ⚠️ Slightly more verbose (acceptable for clarity)

**Status**: Active

---

## Decision Review Schedule

- **Weekly**: Review active decisions for continued validity
- **Per Sprint**: Document new decisions made
- **Quarterly**: Archive superseded decisions

---

**Last Updated**: 2026-02-11
**Next Review**: After Phase 1 completion
