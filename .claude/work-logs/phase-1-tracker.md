# Phase 1: Quick Wins & Bug Fixes — Central Tracker
**Started**: 2026-02-17
**Team**: phase-1-overhaul
**Status**: COMPLETE

---

## Task Overview

| ID | Task | Agent | Status | Notes |
|----|------|-------|--------|-------|
| 1 | Git Audit — check last 24h for overwrites | git-auditor | COMPLETED | ALL CLEAR |
| 2 | 1A: Fix Website Editor Navigation | editor-fixer | COMPLETED | League selection + preview fallback |
| 3 | 1B: Fix Settings/Branding League Picker | branding-fixer | COMPLETED | Removed draft filter + added membership fallback |
| 4 | 1C: Rename Standings → Completed Games | standings-agent | COMPLETED | Sidebar + mobile nav renamed, tabbed UI with penalties/suspensions/ref notes |
| 5 | 1D+1E: Constraint UX Improvements | constraint-agent | COMPLETED | Max label clarified + venue availability callout added |
| 6 | i18n Updates (en.json + fr.json) | team-lead | COMPLETED | en + fr keys added, JSON valid |
| 7 | Validation — type-check + lint | team-lead | COMPLETED | 9/9 packages pass |

---

## Detailed Task Specs

### Task 1: Git Audit
- Scan last 24h of commits for any code that was overwritten
- Check for files modified in multiple commits (potential conflicts)
- Report any regressions or lost changes
- **Output**: List of concerns or "ALL CLEAR"

### Task 2: 1A — Fix Website Editor Navigation
- **Problem**: Website editor doesn't load regardless of which button is clicked
- **Files**: `apps/league-builder/src/components/website-editor/WebsiteEditorClient.tsx`, route files
- **Root cause (likely)**: iFrame preview requires `NEXT_PUBLIC_LEAGUE_SITES_URL` + league-sites running
- **Fix**: Debug navigation path, ensure editor page loads, add fallback UI when preview unavailable

### Task 3: 1B — Fix Settings/Branding League Picker
- **Problem**: Settings/branding page shows "Create a League" instead of existing leagues
- **Files**: `apps/league-builder/src/app/[locale]/dashboard/settings/branding/page.tsx`
- **Fix**: Ensure org → leagues query works; check `organization_id` linkage

### Task 4: 1C — Rename Standings Tab + Add Sections
- **Problem**: "Standings" label is misleading; should show completed games, infractions, ref notes, suspensions
- **Files**: `apps/league-builder/src/app/[locale]/dashboard/seasons/[seasonId]/standings/`
- **Fix**: Rename tab label, add sections for infractions/suspensions/notes/score adjustments

### Task 5: 1D+1E — Constraint UX
- **1D Problem**: "Max" in venue constraints is unclear
- **1D Fix**: Change to "Max Games Per Venue Per Day" with helper text
- **1E Problem**: Venue availability hidden in constraints tab
- **1E Fix**: Add clear callout on Step 1: "Venue availability configured in next step"
- **Files**: `VenueConstraintsTab.tsx`, `ScheduleConfigStep.tsx`, `EnhancedConstraintStep.tsx`

### Task 6: i18n Updates
- Update `apps/league-builder/src/messages/en.json` and `fr.json`
- All new/changed UI strings from Tasks 2-5
- BLOCKED BY: Tasks 2-5 completion

### Task 7: Validation
- Run `pnpm type-check` (must pass 9/9 packages)
- Run `pnpm lint` (check for new errors only)
- BLOCKED BY: Task 6 completion

---

## Update Log

### 2026-02-17 — Session Start
- Team created: phase-1-overhaul
- All tasks defined and agents being spawned
- Git is up to date with origin/main

### 2026-02-17 — Git Audit Complete (Task 1)
- **Result: ALL CLEAR — no overwrites or regressions detected**
- 30 commits in last 24h, all well-described and intentional
- Most-modified file: `data.ts` (6 commits) — all additive, different sections, no conflicts
- `ChampionsTimeline.tsx` (3 commits) — iterative improvement, no regressions
- Deleted files: intentional (scorekeeper port, orphaned components, duplicate images)
- Secrets scan: clean (only documentation reference to `sk_live_` prefix, no real keys)
- Production branch: no divergent commits from main

### 2026-02-17 — Constraint UX Complete (Task 5)
- **1D**: Clarified per-slot "Max:" → "Max games:" (responsive, with tooltip). Added icon + expanded description to section-level "Maximum Games Per Venue Per Day".
- **1E**: Added info callout on Step 1 (ScheduleConfigStep) before Advanced Options, telling users about venue availability/constraints in next step.
- **Files modified**: `VenueConstraintsTab.tsx`, `ScheduleConfigStep.tsx`
- **No new i18n keys needed** — strings are hardcoded pending i18n agent's pass (Task 6)

### 2026-02-17 — Branding League Picker Fixed (Task 3)
- **Root cause**: Two issues — (1) `getOrganizationLeagues` filtered `.neq('status', 'draft')`, excluding draft leagues; (2) no fallback for leagues connected via `league_memberships` instead of `organization_id`
- **Fix**: Removed draft status filter from `getOrganizationLeagues` (both callers need all leagues). Added `getUserLeaguesViaMembership()` function + fallback in both branding page and website-editor page.
- **Files modified**: `organization.ts` (removed draft filter, added membership fallback fn), `branding/page.tsx` (added fallback path), `website-editor/page.tsx` (added fallback path)
- **No new i18n keys added** — existing strings cover all UI states
- **Type-check**: passes cleanly

### 2026-02-17 — Website Editor Navigation Fixed (Task 2)
- **Root causes**: (1) Page ignored `?league=` query param from sidebar, always loading first league; (2) Preview iframe had no timeout/fallback — permanent spinner when league-sites not running
- **Fix 1**: Added `searchParams` to page.tsx, reads `?league=` and passes `initialLeagueId` through to `EditorProvider` for correct league selection
- **Fix 2**: Added 8-second timeout in `EditorPreview` — after timeout, shows helpful fallback UI with `pnpm dev:website` command and retry button instead of infinite spinner
- **Fix 3**: Handled nullable `organization` in page.tsx (from branding-fixer's membership fallback changes)
- **Files modified**: `website-editor/page.tsx`, `WebsiteEditorClient.tsx`, `EditorContext.tsx`, `EditorPreview.tsx`
- **New i18n keys**: `websiteEditor.previewUnavailable`, `websiteEditor.previewUnavailableDescription`, `websiteEditor.retryPreview`

### 2026-02-17 — Completed Games Rename & Tabs (Task 4)
- **Changes**: Renamed "Standings" → "Completed Games" in sidebar + mobile nav. Added tabbed UI to the games page with 4 tabs: Games, Penalties, Suspensions, Referee Notes.
- **Sidebar**: Changed icon from `Trophy` to `CheckCircle2`, i18n key from `standings` to `completedGames`
- **Page**: Restructured games page with `CompletedGamesTabs` component, fetches suspensions + game_events (penalties) + scorekeeper_notes in parallel
- **Empty states**: Clean empty states for all tabs when no data exists
- **Season detail page**: Updated "Standings" action card → "Completed Games", now links to league games page
- **Files modified**: `HierarchicalSidebar.tsx`, `MobileBottomNav.tsx`, `leagues/[id]/games/page.tsx`, `leagues/[id]/seasons/[seasonId]/page.tsx`
- **Files created**: `components/games/completed-games-tabs.tsx`
- **Files updated**: `components/games/index.ts`
- **New i18n keys needed**: `navigation.completedGames`, `completedGames.pageTitle`, `completedGames.pageDescription`, `completedGames.backToLeague`, `completedGames.scheduleGames`, `completedGames.stats.totalGames`, `completedGames.stats.scheduled`, `completedGames.stats.completed`, `completedGames.stats.cancelledPostponed`, `completedGames.tabs.games`, `completedGames.tabs.penalties`, `completedGames.tabs.suspensions`, `completedGames.tabs.refereeNotes`, `completedGames.penalties.emptyTitle`, `completedGames.penalties.emptyDescription`, `completedGames.penalties.player`, `completedGames.penalties.team`, `completedGames.penalties.type`, `completedGames.penalties.pim`, `completedGames.penalties.period`, `completedGames.penalties.game`, `completedGames.suspensions.emptyTitle`, `completedGames.suspensions.emptyDescription`, `completedGames.suspensions.started`, `completedGames.suspensions.ends`, `completedGames.suspensions.gamesLeft`, `completedGames.refereeNotes.emptyTitle`, `completedGames.refereeNotes.emptyDescription`
- **Type-check**: passes cleanly
