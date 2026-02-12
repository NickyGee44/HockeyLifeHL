# Draft Room UX Audit Report

**Date:** 2026-02-12
**Audit Agent:** agent-a1c63dc
**Scope:** Complete Draft Room feature analysis
**Files Analyzed:** 16 files in `/apps/league-builder/src/components/draft-room/`

---

## Executive Summary

The draft room is a feature-rich, architecturally sound implementation covering the complete lifecycle from setup through completion and export. The real-time infrastructure using Supabase Realtime with a reliability fallback layer (polling, drift detection, event deduplication) is notably well-engineered for a beer league app. However, there are several critical gaps: the `handleExport` function in `DraftRoom.tsx` is an empty shell, zero i18n coverage violates the project's bilingual (EN/FR) requirement, the pick clock uses a hardcoded 90-second total instead of reading from draft settings, and the entire layout is desktop-only with no responsive breakpoints for mobile or tablet users. Several RPC functions referenced throughout lack generated TypeScript types, creating runtime fragility.

---

## UX Flow Map

### Step 1: Draft Page Entry
**File:** `/apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/draft/page.tsx`

- Server component fetches league, season (must be `registration_type === 'draft'`), existing draft, teams, membership role, and captain status.
- Renders `DraftDashboard` which acts as a lifecycle state machine.
- **ISSUE:** If the season is not registration_type `draft`, it returns `notFound()`. There is no user-friendly message explaining why -- just a 404.

### Step 2: No Draft Exists
**Component:** `DraftDashboard` state: `no_draft`

- Admin sees a "Configure Draft" button with team list preview.
- Non-admins see "Waiting for league admin to set up the draft..." -- a dead-end with no indication of when to check back.
- Clicking "Configure Draft" renders `DraftSetupWizard`.

### Step 3: Draft Setup Wizard
**Component:** `DraftSetupWizard`

- 4-step wizard: Settings → Pick Timer → Options → Review.
- Well-designed with visual progress indicators, radio-style draft type selection, and slider controls.
- **ISSUE:** No validation on step 0 when clicking "Next" -- the name field is only validated at submit time (step 3). User can proceed through all steps with an empty name.
- **ISSUE:** No "Draft Order" step. The admin cannot set or randomize the pick order. The `setDraftOrder` server action exists but is never called from any UI.
- Calls `setup_draft` RPC directly from the client component, bypassing the existing `setupDraft` server action at `/apps/league-builder/src/lib/actions/draft.ts`. This is a code duplication and security concern (client-side RPC vs server action).

### Step 4: Draft Pending
**Component:** `DraftDashboard` state: `pending`

- Two action cards: "Populate Player Pool" and "Start Draft".
- **ISSUE:** No confirmation dialog before starting the draft. One misclick starts the live draft.
- **ISSUE:** No feedback on pool status. After clicking "Import from Registrations," the toast shows a count, but there's no persistent display of how many players are in the pool, their positions, or skill distribution. Admin is flying blind.
- **ISSUE:** No ability to preview or edit the draft order before starting.
- **ISSUE:** No ability to manually add players who aren't registered (walk-ins, late additions).

### Step 5: Active Draft
**Component:** `DraftRoom`

- Three-column layout: Player Pool (left, 320px) | Draft Board + Timer (center) | Chat (right, 320px).
- Header shows draft name, round/pick, connection status badge, admin controls, and "Your Pick!" indicator.
- Pick flow: Select player from pool → Player appears in center confirmation area → Click "Confirm Pick" → RPC `make_draft_pick` → Real-time event propagates to all clients.
- **ISSUE:** No confirmation dialog on "Confirm Pick." In a high-pressure draft, misclicks could pick the wrong player with no undo for non-admins.
- **ISSUE:** The "Confirm Pick" button and player selection area have no keyboard shortcut support.

### Step 6: Pick Clock Timeout

- Timer counts down from `current_pick_expires_at`.
- When it reaches 0, `handleTimeout` is called, which just refreshes data if auto-pick is enabled.
- **ISSUE:** The comment says "Auto-pick will be handled by the server/cron job," but there is no evidence of a cron job or database trigger. If the server-side auto-pick isn't implemented, the timer expires and nothing happens -- the draft just hangs.
- **ISSUE:** If auto-pick is disabled and the timer expires, there's no visible indication of what happens next. No skip, no penalty, just silence.

### Step 7: Draft Complete
**Component:** `DraftRoom` `isComplete` state

- Shows completion modal with confetti animation, stats grid (teams, avg pick time, auto-picks), team results, and export buttons.
- Below the modal: draft board and history.
- If `require_roster_confirmation` is enabled, captains see a roster confirmation panel.
- **ISSUE:** The export buttons in the `DraftCompleteModal` call `handleExport` which is an **empty function body** -- they do nothing. The actual working export is in the `DraftResultsExport` component rendered separately.
- **ISSUE:** The "View Full Results" button in the modal just calls `onClose` -- it doesn't navigate anywhere.

### Step 8: Draft Complete Dashboard
**Component:** `DraftDashboard` state: `complete`

- Shows a simple completion card with CSV/PDF export buttons.
- "View Draft Room" button sets status to `active` to re-render the DraftRoom in its complete state.
- **ISSUE:** `DraftResultsExport` is passed empty arrays for picks and teams (`picks={[]}`, `teams={teams.map(t => ({...t, picks: []}))}`). The export component fetches its own data via RPC so this works, but the picks/teams props are misleading dead data.

---

## Critical Issues (Must Fix)

### 1. Empty `handleExport` function
**File:** `/apps/league-builder/src/components/draft-room/DraftRoom.tsx` (lines 460-462)

```typescript
const handleExport = async (format: 'csv' | 'pdf') => {
  // Export is handled by DraftResultsExport component
};
```

This function is passed to `DraftCompleteModal` as `onExport`. When users click "CSV Spreadsheet" or "PDF Document" in the completion celebration modal, nothing happens. The buttons appear to work (they toggle a selected state via `setSelectedExport`) but no download occurs. This is a broken user experience at the most important moment -- the draft just finished and the commissioner wants the results.

**Fix:** Either delegate to `DraftResultsExport` methods or remove the duplicate export UI from the modal.

### 2. Pick Clock hardcoded total time
**File:** `/apps/league-builder/src/components/draft-room/PickClock.tsx` (line 46)

```typescript
const totalTime = 90; // Default, should come from draft settings
```

The progress ring calculation uses a hardcoded 90-second total regardless of the actual `pick_time_seconds` configured in the draft setup. If an admin sets 30-second picks, the ring will show 33% at the start. If they set 5-minute picks, the ring will overflow past 100% and then count down from there. The visual timer would be completely wrong for any non-default configuration.

**Fix:** Pass `pick_time_seconds` from draft settings as a prop to `PickClock`.

### 3. Auto-pick timeout is a no-op on the client side
**File:** `/apps/league-builder/src/components/draft-room/DraftRoom.tsx` (lines 386-392)

```typescript
const handleTimeout = useCallback(async () => {
  if (!isMyPick || !draft?.auto_pick_enabled) return;
  // Auto-pick will be handled by the server/cron job
  // Just refresh the state
  fetchDraftData();
}, [isMyPick, draft?.auto_pick_enabled, fetchDraftData]);
```

The client just refreshes data and hopes the server handled it. If there is no server-side cron/trigger implementing auto-pick, the draft will stall when a captain goes AFK. Additionally, if `auto_pick_enabled` is false, the `handleTimeout` is a complete no-op -- the timer expires with no visible consequence and no mechanism to advance the draft.

**Fix:** Implement server-side auto-pick (cron/trigger) or implement client-side auto-pick fallback.

### 4. No draft order management UI

The `setDraftOrder` server action exists at `/apps/league-builder/src/lib/actions/draft.ts` (line 449), but there is no UI anywhere to set, randomize, or modify the draft order. The `setup_draft` RPC presumably generates an order, but the admin cannot see, verify, or customize it before starting. For league commissioners, this is a non-negotiable requirement.

**Fix:** Build a draft order management UI (randomize, drag-and-drop, preview) using the existing `setDraftOrder` server action.

### 5. RosterConfirmation position grouping is broken
**File:** `/apps/league-builder/src/components/draft-room/RosterConfirmation.tsx` (lines 53-58)

```typescript
const pos = pick.player_name?.includes('(')
  ? pick.player_name.split('(')[1]?.replace(')', '')
  : 'Unknown';
```

Position grouping relies on parsing parenthetical position from the player name string (e.g., "John Smith (C)"). But `DraftPick` does not include position data at all in the type definition, and the `player_name` joined from `profiles.full_name` will never contain parenthetical position information. Every player will be grouped under "Unknown."

**Fix:** Add position data to `DraftPick` type or fetch it separately rather than parsing player names.

### 6. Race condition in `fetchDraftData` on connection recovery
**File:** `/apps/league-builder/src/components/draft-room/DraftRoom.tsx`

The `onConnectionChange` callback (line 81) and `onStateVersionMismatch` callback (line 78) both call `fetchDraftData()`, and the drift check timer in `useDraftReliability.ts` also calls `forceSync` every 30 seconds. On reconnection, multiple calls to `fetchDraftData` can fire simultaneously (reconnect + drift check + polling), each calling `setIsLoading(true)` and potentially overwriting state with stale responses. There's no abort controller or request deduplication.

**Fix:** Add abort controller to `fetchDraftData` to prevent concurrent overwrites.

---

## UX Issues (Should Fix)

### 7. No i18n -- all strings hardcoded in English

Zero usage of `useTranslations` across all 16 draft room files. The project mandates bilingual EN/FR support via next-intl. Every user-facing string in every component needs to be externalized. This includes:
- "Draft Room", "Available Players", "Captain Chat", "Draft History", "Draft Board"
- "Your Pick!", "Confirm Pick", "Waiting for...", "Draft Paused", "Draft Complete!"
- All setup wizard labels, all modal text, all export labels
- This is approximately 100+ hardcoded strings.

**Fix:** Add i18n support -- externalize all strings to `en.json`/`fr.json`.

### 8. No mobile/responsive layout

The main DraftRoom layout uses fixed-width sidebars (`w-80` = 320px each) with `flex-shrink-0`, consuming 640px minimum before the center content. On screens under ~1024px, the center draft board would be crushed or invisible. There are no `md:` or `lg:` breakpoints, no collapsible sidebars, no mobile-specific views. The setup wizard is somewhat responsive (`max-w-2xl`), but the actual draft room is desktop-only.

**Fix:** Make the layout responsive -- collapsible sidebars, stacked layout on mobile, or at minimum a "mobile not supported" message.

### 9. No confirmation before critical actions

- No confirm dialog before starting the draft (DraftDashboard `handleStartDraft`).
- No confirm dialog before making a pick (DraftRoom `handleMakePick`).
- No confirm dialog before undoing a pick (DraftRoom `handleUndoPick`).
- No confirm dialog before trading a pick (TradePickerModal has a preview but no "Are you sure?" step).

**Fix:** Add confirmation dialogs for start draft, make pick, and undo pick.

### 10. Player pool limited to 200 players
**File:** `/apps/league-builder/src/components/draft-room/DraftRoom.tsx` (line 140)

```typescript
const { data: playersData, error: playersError } = await supabase.rpc(
  'get_available_players',
  { p_draft_id: draftId, p_limit: 200 }
);
```

If a league has more than 200 registered players, the rest are invisible. No pagination, no "load more," no indication that players are missing. A large league with 250+ registrants would lose 50+ players from the draft pool UI.

**Fix:** Increase player pool limit beyond 200 or add pagination.

### 11. No sound/notification for "Your Pick"

When it becomes a captain's turn to pick, the only feedback is a colored badge and a text label. In a real draft room scenario (multiple tabs, distractions), an audio notification or browser notification would be expected. Fantasy draft platforms universally play a sound when it's your turn.

**Fix:** Add audio/browser notification when it's your turn to pick.

### 12. Chat is restricted to captains and admins only

Regular team members (players, spectators) cannot chat. This is a design decision but may be frustrating for leagues where the whole team is watching and wants to participate. There's also no spectator view concept at all -- non-captain, non-admin users who land on this page get a confusing partial experience.

**Fix:** Consider adding spectator view or allowing all team members to participate in chat.

### 13. DraftHistory "Show More" is display-only
**File:** `/apps/league-builder/src/components/draft-room/DraftHistory.tsx`

```typescript
{sortedPicks.length > maxDisplay && (
  <div className="border-t p-3 text-center">
    <span className="text-xs text-muted-foreground">
      +{sortedPicks.length - maxDisplay} more picks
    </span>
  </div>
)}
```

The "+N more picks" text at the bottom is static text, not a button. Users cannot expand to see the full history during the draft. In the main draft view, `maxDisplay` is 5, meaning only the last 5 picks are visible.

**Fix:** Make "Show More" interactive to expand the history.

### 14. CSV export does not escape commas or quotes
**File:** `/apps/league-builder/src/components/draft-room/DraftResultsExport.tsx`

```typescript
const csvContent = [
  `Draft: ${results.draft.name}`,
  ...
  headers.join(','),
  ...rows.map((row) => row.join(',')),
].join('\n');
```

If a team name or player name contains a comma (e.g., "Smith, John" or "Johnson, Jr."), the CSV will be malformed. Fields should be wrapped in double quotes with internal quotes escaped.

**Fix:** Fix CSV export to properly escape commas and quotes.

### 15. PDF export uses `window.open` + `print()`

The "PDF" export opens a new window with styled HTML and triggers `window.print()`. This relies on the browser's print-to-PDF capability, which is inconsistent across browsers and may trigger pop-up blockers. A proper PDF generation library (like jsPDF or server-side generation) would be more reliable.

**Fix:** Replace `window.print()` PDF with proper PDF generation.

---

## Missing Features (Nice to Have)

### 16. No draft order randomizer or display

Commissioners need to see, set, randomize, and announce the draft order. ESPN and Yahoo let you randomize or manually set the order with drag-and-drop. There's a `setDraftOrder` server action but zero UI for it.

### 17. No "watch list" or "queue" feature

In fantasy drafts (ESPN, Yahoo, Sleeper), users can build a personal queue of preferred players that updates in real-time as others are drafted. No such feature exists here.

### 18. No player detail view/stats

Clicking a player only selects them for drafting. There's no expanded view showing their full profile, past season stats, or other relevant information that would help captains make informed picks.

### 19. No "On the Clock" team identification for other participants

The header shows whose pick it is with `draftState?.current_pick?.team_name`, but there's no prominent, team-color-coded "On the Clock" banner like you'd see in NFL or fantasy draft rooms.

### 20. No draft board auto-scroll to current pick

The draft board can grow large (10+ rounds x 8+ teams). There's no auto-scroll behavior to keep the current pick visible. Users must manually scroll as the draft progresses.

### 21. No "keeper" or "protected player" support

Many beer leagues have keepers -- players retained from the previous season. There's no mechanism to exclude keepers from the pool or pre-assign them to teams before the draft begins.

### 22. No admin "pick for team" override

If a captain disconnects or is absent, the admin can only rely on auto-pick. There's no admin UI to manually make a pick on behalf of another team.

### 23. No draft invitation/lobby system

There's no way to send invitations, verify all captains are online, or show a "waiting room" before starting. The admin just clicks "Start Draft" and hopes everyone is ready.

### 24. No undo confirmation showing what player was restored

The undo function (`handleUndoPick`) refreshes all data but shows no user-facing feedback about which pick was undone or which player was restored. The RPC returns `restored_player` but it's not displayed.

### 25. No "draft clock" showing total elapsed time

There's no running clock showing how long the draft has been going. This is standard in fantasy draft rooms and useful for setting expectations.

---

## Code Quality Findings

### 26. Empty function body -- `handleExport`
**File:** `/apps/league-builder/src/components/draft-room/DraftRoom.tsx` (line 460)

Already covered as Critical Issue #1. The function has an explanatory comment but does nothing.

### 27. Duplicate Supabase client creation across components

Six components independently create Supabase clients via `useState(() => createClient())`:
- DraftRoom.tsx (line 39)
- DraftSetupWizard.tsx (line 43)
- TradePickerModal.tsx (line 18)
- RosterConfirmation.tsx (line 42)
- DraftResultsExport.tsx (line 16)
- useDraftReliability.ts (line 41)

These should share a single client instance via React context or prop drilling from `DraftRoom`.

### 28. Excessive `as any` type assertions

Multiple RPC calls use `(supabase.rpc as any)` because generated types are out of date:
- DraftSetupWizard.tsx line 77
- TradePickerModal.tsx line 45
- RosterConfirmation.tsx line 67
- DraftResultsExport.tsx lines 24, 92
- DraftRoom.tsx line 436
- useDraftReliability.ts line 70-74

Also `(supabase.from as any)` at DraftRoom.tsx line 478 and draft page.tsx line 57. These mask type errors and make refactoring dangerous. Running `pnpm sync-types` or `/sync-types` skill would resolve most of these.

### 29. `fetchDraftData` dependency array issues
**File:** `/apps/league-builder/src/components/draft-room/DraftRoom.tsx`

`fetchDraftData` is wrapped in `useCallback` with dependencies `[draftId, supabase]`, but it uses `setLocalStateVersion` from the reliability hook, which isn't in the dependency array. The `setLocalStateVersion` is a state setter so this is technically safe, but the function is referenced in multiple `useEffect` hooks and its stability matters.

### 30. Confetti particle state leak
**File:** `/apps/league-builder/src/components/draft-room/DraftCompleteModal.tsx`

```typescript
const [particles, setParticles] = useState<ConfettiParticle[]>([]);
```

The `particles` state is set but never read from state -- the animation loop uses `currentParticles` local variable. The `setParticles(initialParticles)` call at line 61 triggers an unnecessary re-render with no effect.

### 31. Missing `aria-label` attributes throughout

No ARIA labels on any interactive elements:
- Custom toggle buttons in DraftSetupWizard (lines 277-289, 307-320, 334-349) have no role="switch" or aria-checked
- Pick clock has no aria-live region for screen readers
- Chat messages have no semantic structure
- Draft board has no role="grid" or cell labels
- Connection status badge has no aria-label

### 32. DraftCompleteModal uses wrong confetti colors comment

```typescript
const CONFETTI_COLORS = [
  '#22D3EE', // Gold  <-- This is actually Cyan (rink-500)
```

The comment says "Gold" but `#22D3EE` is the project's cyan/teal brand color. Minor but misleading.

### 33. `setLocalStateVersion` could trigger unnecessary re-renders

In `useDraftReliability.ts`, `forceSync` compares `data.state_version !== localStateVersion` using a state variable. Since `forceSync` is in a `useCallback` depending on `localStateVersion`, every time the version changes, the callback reference changes, which causes the drift check `useEffect` (line 154) to re-create its interval.

### 34. DraftDashboard complete state passes dead props
**File:** `/apps/league-builder/src/components/dashboard/leagues/draft-dashboard.tsx` (line 328)

```typescript
<DraftResultsExport
  draftId={draftId}
  picks={[]}
  teams={teams.map((t) => ({ ...t, picks: [] }))}
/>
```

The `picks` and `teams` props are required by `DraftResultsExportProps` but meaningless because the component fetches its own data. This creates confusion about the component's data contract.

---

## Recommendations (Prioritized)

### P0 -- Must fix before any live draft:
1. Fix the empty `handleExport` function -- either delegate to `DraftResultsExport` methods or remove the duplicate export UI from the modal.
2. Pass `pick_time_seconds` from draft settings to `PickClock` and replace the hardcoded `totalTime = 90`.
3. Implement server-side auto-pick (cron/trigger) or implement client-side auto-pick fallback. Currently nothing happens when the timer expires.
4. Fix `RosterConfirmation` position grouping -- add position data to `DraftPick` type or fetch it separately rather than parsing player names.
5. Build a draft order management UI (randomize, drag-and-drop, preview) using the existing `setDraftOrder` server action.

### P1 -- Should fix for production quality:
6. Add confirmation dialogs for start draft, make pick, and undo pick.
7. Add i18n support -- externalize all ~100+ hardcoded strings to `en.json`/`fr.json`.
8. Make the layout responsive -- collapsible sidebars, stacked layout on mobile, or at minimum a "mobile not supported" message.
9. Regenerate Supabase TypeScript types to eliminate all `as any` casts.
10. Fix CSV export to properly escape commas and quotes.
11. Increase player pool limit beyond 200 or add pagination.
12. Add audio/browser notification when it's your turn to pick.
13. Add abort controller to `fetchDraftData` to prevent concurrent overwrites.

### P2 -- Nice to have for competitive parity with fantasy platforms:
14. Add a personal "watch list" or draft queue feature.
15. Add player detail expansion panel in the pool.
16. Add prominent "On the Clock" banner with team colors.
17. Add draft board auto-scroll to current pick.
18. Add a draft lobby/invitation system with online presence indicators.
19. Add admin "pick for team" override capability.
20. Add keeper/protected player support.
21. Add total elapsed time clock.
22. Replace `window.print()` PDF with proper PDF generation.

---

## Files Analyzed

All files in `/apps/league-builder/src/components/draft-room/`:
- DraftRoom.tsx (main container)
- DraftBoard.tsx
- DraftControls.tsx
- DraftSetupWizard.tsx
- PlayerPool.tsx
- PickClock.tsx
- ChatSidebar.tsx
- DraftHistory.tsx
- DraftCompleteModal.tsx
- TradePickerModal.tsx
- RosterConfirmation.tsx
- DraftResultsExport.tsx
- ConnectionStatus.tsx
- useDraftReliability.ts
- types.ts
- index.ts

Plus:
- `/apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/draft/page.tsx`
- `/apps/league-builder/src/components/dashboard/leagues/draft-dashboard.tsx`
- `/apps/league-builder/src/lib/actions/draft.ts`

---

**End of Report**
