# Phases 2-8: League Builder Overhaul — Central Tracker
**Started**: 2026-02-17
**Status**: IN PROGRESS

---

## Phase Overview

| Phase | Description | Status |
|-------|-------------|--------|
| 2 | Schedule Generation Overhaul | COMPLETED |
| 3 | Playoff & Division Management | COMPLETED |
| 4 | Staff Roles & Game Officials | COMPLETED |
| 5 | News & AI Articles | COMPLETED |
| 6 | Awards & Suspensions | COMPLETED |
| 7 | Billing & Pricing Restructure | IN PROGRESS |
| 8 | Navigation & Hierarchy Cleanup | IN PROGRESS |

---

## Phase 2: Schedule Generation Overhaul

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 2A | Division-Aware Schedule Generation | division-gen | COMPLETED | Intra-division round-robin + cross-division pollination |
| 2B | Bye Week Support | venue-move | COMPLETED | Config + generator logic + UI toggle (staggered distribution) |
| 2C | Venue Cancellation → Venue Move Flow | venue-move | COMPLETED | 4-step wizard with date range, game review, destination |
| 2D | Odd Ice Time Slots | ice-time | COMPLETED | One-off ice time form + list in VenueConstraintsTab |
| 2E | Ice Time Upload/Import | ice-time | COMPLETED | CSV parser with preview/validation + dedup on import |
| 2F | Venue Blackout "All Venues" Option | blackout-fix | COMPLETED | "All Venues" option added to picker + generator |

## Phase 3: Playoff & Division Management

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 3A | Playoff Generator — % Support | playoff-pct | COMPLETED | count/percentage toggle, per-division preview, min 2 teams |
| 3B | Division Shuffle Tool | div-shuffle | COMPLETED | Health dashboard, outlier detection, swap suggestions, move confirmation with affected games |
| 3C | Schedule Adjustment After Shuffle | div-shuffle | COMPLETED | 3 options: keep as-is, update division_id, cancel affected games; i18n for radio labels |

## Phase 4: Staff Roles & Game Officials

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 4A | Expand Staff Roles | staff-roles | COMPLETED | 8 standard roles with color badges, role dropdown, filter, hydration-safe Select |
| 4B | Referee System | referee-sys | COMPLETED | referee-management.ts actions + 5 referee components using game_officials table |
| 4C | Scorekeeper & Referee Dashboard | staff-dash | COMPLETED | StaffDashboardPanel with mini calendar, assignment list, stats |
| 4D | Staff Addition from Multiple Contexts | quick-staff | COMPLETED | QuickAddStaffModal with defaultRole prop |

## Phase 5: News & AI Articles

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 5A | AI Article Generation | ai-article | COMPLETED | /api/ai/generate-article route, Claude API integration, prompt UI on new article page |
| 5B | Smart Entity Linking | lead | COMPLETED | entity-linker.ts utility + entity-linking.ts server action, team/player markdown links |

## Phase 6: Awards & Suspensions

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 6A | Awards — Player Voting | awards-agent | COMPLETED | Winner selection UI, category styling, past winners tab, getLeaguePlayersForSeason |
| 6B | Awards — Profile Persistence | awards-agent | COMPLETED | AwardBadges component (compact + full modes), getPlayerAwards action |
| 6C | Suspension Notifications | suspension-agent | COMPLETED | suspension-issued email template, sendSuspensionNotification, fire-and-forget integration |

## Phase 7: Billing & Pricing Restructure

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 7A | New Pricing Tiers ($199/$299) | — | SKIPPED | User said "Define later" |
| 7B | Merge Subscription + Billing Tabs | billing-agent | IN PROGRESS | Consolidating into single /settings/billing |
| 7C | Remove Redundant Team Members | billing-agent | IN PROGRESS | Evaluating /settings/members |

## Phase 8: Navigation & Hierarchy Cleanup

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 8A | Consistent Terminology | nav-agent | IN PROGRESS | Org → League → Season audit |
| 8B | League Builder Structure Review | nav-agent | IN PROGRESS | Sidebar grouping + consolidation |

---

## Update Log

### 2026-02-17 — Phase 1 Complete
- All 5 Phase 1 items done (commit 65a394f)
- Pushed to main + production

### 2026-02-17 — Phase 2 Complete
- All 6 tasks done (commit 1f9bd0f)
- Division-aware scheduling, bye weeks, venue moves, ice time, blackouts
- Pushed to main + production

### 2026-02-17 — Phase 3 Complete
- All 3 tasks done (commit 7cd26d7)
- Playoff % support, division shuffle tool, schedule adjustment
- Pushed to main + production

### 2026-02-17 — Phase 4 Complete
- All 4 tasks done (commit 58295d8)
- Staff roles expansion, referee system, staff dashboard, quick-add modal
- Pushed to main + production

### 2026-02-17 — Phase 5+6 Complete
- All 5 tasks done (commit 769a5d9)
- AI article generation, entity linking, awards voting, award badges, suspension notifications
- Pushed to main + production

### 2026-02-17 — Phase 7+8 In Progress
- Billing merge + nav cleanup agents running
