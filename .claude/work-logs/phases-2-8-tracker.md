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
| 5 | News & AI Articles | IN PROGRESS |
| 6 | Awards & Suspensions | PENDING |
| 7 | Billing & Pricing Restructure | PENDING |
| 8 | Navigation & Hierarchy Cleanup | PENDING |

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
| 4B | Referee System | referee-sys | COMPLETED | referee-management.ts actions + 5 referee components (card, list, assign modal, management client) using game_officials table |
| 4C | Scorekeeper & Referee Dashboard | staff-dash | COMPLETED | StaffDashboardPanel with mini calendar, assignment list, stats — integrated on dashboard page |
| 4D | Staff Addition from Multiple Contexts | quick-staff | COMPLETED | QuickAddStaffModal with defaultRole prop, available from staff page + schedule |

## Phase 5: News & AI Articles

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 5A | AI Article Generation | TBD | PENDING | Claude API integration |
| 5B | Smart Entity Linking | TBD | PENDING | Auto-link teams/players |

## Phase 6: Awards & Suspensions

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 6A | Awards — Player Voting | TBD | PENDING | Voting system |
| 6B | Awards — Profile Persistence | TBD | PENDING | Player profile display |
| 6C | Suspension Notifications | TBD | PENDING | Email + in-app |

## Phase 7: Billing & Pricing Restructure

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 7A | New Pricing Tiers ($199/$299) | TBD | PENDING | Define later |
| 7B | Merge Subscription + Billing Tabs | TBD | PENDING | UI consolidation |
| 7C | Remove Redundant Team Members | TBD | PENDING | Evaluate and merge |

## Phase 8: Navigation & Hierarchy Cleanup

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 8A | Consistent Terminology | TBD | PENDING | Org → League → Season |
| 8B | League Builder Structure Review | TBD | PENDING | IA audit + consolidation |

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
- All 4 tasks done
- Staff roles expansion, referee system, staff dashboard, quick-add modal
- Session crashed mid-phase but all code was written; recovered and committed
