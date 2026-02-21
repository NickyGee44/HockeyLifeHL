# Task: BLH Tests, Lint Fixes & Improvements

You are working on HockeyLifeHL — a turborepo monorepo with 4 apps (league-builder, league-sites, mobile, player-companion) and 5 packages (auth, data, database, ui, ui-native).

## PRIORITY 1: Fix CI-Blocking Lint Errors (14 errors in league-sites)

The CI workflow fails because of 14 lint errors in `apps/league-sites`. Fix ALL of them:

### Error Type 1: "Calling setState synchronously within an effect" (12 occurrences)
These are React 19 strict mode violations. The fix is to NOT call setState directly inside useEffect — instead:
- Wrap in a microtask: `queueMicrotask(() => setState(...))`
- Or use `startTransition(() => setState(...))`
- Or restructure to derive state from props/other state (preferred when possible)

Find all files with this error pattern and fix them. They're all in `apps/league-sites/`.

### Error Type 2: "React Hook called conditionally" (2 occurrences)
`useClientDate` and `useClientTime` are called after an early return. Move all hook calls ABOVE any early returns or conditional logic. This is a fundamental React hooks rule.

### Also fix the 234 warnings if quick:
- `@typescript-eslint/no-explicit-any` — replace `any` with proper types or `unknown`
- `@typescript-eslint/no-unused-vars` — remove unused vars or prefix with `_`

Verify fix by running:
```bash
cd apps/league-sites && pnpm run lint
```

## PRIORITY 2: Write Unit Tests

### league-builder tests (Jest already configured)
Existing tests: `src/lib/stripe/__tests__/webhooks.test.ts`, `client.test.ts`

Write NEW tests for the recently shipped features:

1. **Timezone handling** (`src/lib/timezone.ts` or wherever timezone logic lives)
   - Test converting UTC to league timezone
   - Test default timezone behavior
   - Test timezone display in schedules

2. **Draft mode** (`src/lib/draft/` or relevant files)
   - Test idempotency key generation
   - Test skill-based auto-pick fallback
   - Test draft round ordering

3. **Schedule generator** (`src/lib/schedule/` or relevant files)
   - Test constraint validation (no back-to-back games, balanced home/away)
   - Test schedule generation for various team counts (4, 6, 8, 10, 12)
   - Test round-robin and divisional formats

4. **Player export** (CSV generation)
   - Test CSV format output
   - Test export by team
   - Test export for full league

5. **Email blast** (using Resend)
   - Test email template rendering
   - Test recipient filtering (by team, full league)
   - Mock Resend API calls

### league-sites tests
Set up Jest or Vitest for league-sites if not configured, then write:

1. **Scoresheet OCR** (if client-side processing exists)
   - Test score extraction from structured data
   - Test fallback to manual entry

2. **Registration flow** (if testable components exist)
   - Test form validation
   - Test payment integration mocks

### Package tests
Write tests for shared packages:

1. **@hockey-life/data** — test any utility functions, data transformers
2. **@hockey-life/database** — test query builders, type exports
3. **@hockey-life/auth** — test auth helpers, session utilities

## PRIORITY 3: Improvements

Look for and fix:
1. **Dead code** — unused imports, unreachable code, commented-out blocks
2. **Type safety** — replace `any` with proper types where feasible
3. **Error handling** — add try/catch where missing, especially in API routes
4. **Performance** — obvious wins like missing `React.memo`, unnecessary re-renders
5. **Accessibility** — missing alt text, aria labels on interactive elements

## Rules
- Install test dependencies if needed (`pnpm add -D vitest @testing-library/react` etc.)
- Follow existing code patterns
- Don't break any existing functionality
- Commit after each priority level (lint fixes, then tests, then improvements)
- Run `pnpm run lint` after fixes to verify zero errors
- Run `pnpm test` to verify tests pass

When completely finished, run: `openclaw system event --text "Done: BLH — lint fixes, unit tests, code improvements" --mode now`
