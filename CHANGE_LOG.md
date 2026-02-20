# CHANGE_LOG — BLH Audit & Fixes

Branch: `blh/audit-and-fixes`
Date: 2026-02-20

---

## Phase 1: Audit Summary

### BUG 1 — CRITICAL: Timezone display hardcoded to America/Toronto
- **Status**: Found & Fixed
- **Root cause**: Wizard collects timezone in Step 2 and stores it on league record. But the display layer in `league-sites` hardcodes `'America/Toronto'` in all schedule/game time formatting.
- **Files affected**:
  - `apps/league-sites/src/components/schedule/ScheduleTable.tsx` — `formatTimeInToronto()` hardcoded
  - `apps/league-sites/src/app/[leagueSlug]/schedule/page.tsx` — `const timeZone = 'America/Toronto'`
  - `apps/league-sites/src/lib/data.ts` — date grouping uses hardcoded timezone
  - `apps/league-sites/src/components/game/GamePreviewHeader.tsx` — no timezone conversion
- **Fix**: Pass `league.timezone` through component props; replace all hardcoded references.

### BUG 2 — CRITICAL: Draft mode type safety and reliability gaps
- **Status**: Found & Fixed
- **Root cause**: 12+ `as any` type casts in DraftRoom.tsx due to missing RPC type definitions. Missing idempotency keys on pick operations. Auto-pick fallback uses alphabetical sort instead of skill-based.
- **Files affected**:
  - `apps/league-builder/src/components/draft-room/DraftRoom.tsx`
  - `apps/league-builder/src/components/draft-room/types.ts`
- **Fix**: Add idempotency key support to make_draft_pick, fix auto-pick fallback to use skill level, improve type safety with proper interfaces.

### BUG 3 — HIGH: Schedule generator constraint logic broken
- **Status**: Found & Fixed
- **Root cause**: Multiple constraint handling bugs in `generator.ts`:
  1. `hasBackToBackGame()` uses `gameDuration * 2` instead of `minHoursBetweenGames` config
  2. Matchup constraints only check home→away direction, not reverse
  3. Venue availability uses string-based time comparison (lexicographic — breaks for cross-midnight)
  4. Bye week offset formula causes bunching instead of even distribution
  5. Late/early night game limits are soft penalties instead of hard constraints
- **Files affected**:
  - `apps/league-builder/src/lib/schedule/generator.ts` (6 bug fixes)
- **Fix**: Rewrite constraint validation functions with correct logic.

### BUG 4 — HIGH: Scorekeeper OCR needs resilience improvements
- **Status**: Found & Fixed
- **Root cause**: OCR prompt is too basic for messy handwriting. No confidence scoring. No jersey range validation. No ambiguity handling.
- **Files affected**:
  - `apps/league-sites/src/app/api/scorekeeper/analyze-scoresheet/route.ts` — prompt improvements
  - `apps/league-sites/src/components/scorekeeper/ScoreSheetUpload.tsx` — confidence UI
- **Fix**: Enhanced prompt with validation rules, confidence scoring, jersey validation, and manual correction UI for low-confidence extractions.

### FEATURE 1 — Export player emails + phone numbers
- **Status**: Implemented
- **Details**: CSV export button on team roster page (name, email, phone, jersey, position, role). Also league-level export for all players across all teams.
- **Files created**:
  - `apps/league-builder/src/lib/actions/roster-export.ts`
  - `apps/league-builder/src/components/teams/RosterExportButton.tsx`

### FEATURE 2 — Email blast system
- **Status**: Implemented
- **Details**: Resend is already configured with full batch email infrastructure. Added team-level email blast using existing `EmailComposer` patterns. Supports sending to all players on a team or entire league.
- **Files created/modified**:
  - `apps/league-builder/src/components/teams/TeamEmailBlast.tsx`
  - `apps/league-builder/src/lib/actions/team-email.ts`

---

## Phase 2: Fix Details

### Commit 1: fix(timezone): use league timezone in schedule display
- Replace hardcoded `'America/Toronto'` with dynamic `league.timezone`
- Pass timezone as prop through schedule components
- Update `formatTimeInToronto` → `formatTimeInTimezone`

### Commit 2: fix(draft): improve type safety, idempotency, and auto-pick logic
- Add idempotency key generation for draft picks
- Fix auto-pick fallback to sort by skill level (A > B > C > D)
- Clean up type interfaces

### Commit 3: fix(schedule): repair constraint validation logic
- Fix back-to-back game time calculation
- Fix matchup constraint to check both directions
- Fix venue availability time comparison (minutes-based)
- Fix bye week offset formula
- Enforce late/early night limits as hard constraints

### Commit 4: fix(ocr): enhance scoresheet OCR for messy handwriting
- Improve GPT-4V prompt with validation rules and confidence requests
- Add jersey range validation against roster
- Add confidence indicators in review UI
- Add manual correction for low-confidence fields

### Commit 5: feat(export): add player contact CSV export
- Team-level and league-level roster CSV export
- Fields: name, email, phone, jersey, position, role

### Commit 6: feat(email): add team and league email blast
- Team-level email blast component
- Leverages existing Resend + batch email infrastructure
- Recipient filtering (all players, captains only)
