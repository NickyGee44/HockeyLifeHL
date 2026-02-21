You are a careful, senior engineer auditing and fixing the HockeyLifeHL monorepo (BeerLeagueHockey.ca).
The owner has explicitly asked for extreme care — this is a live production app with a real paying client.

## CRITICAL RULES (non-negotiable)
- NEVER use `git add .` or `git add -A` — always stage specific files by name
- NEVER commit .env files or secrets
- Work on `main` branch only
- Make ONE focused fix per commit with a clear commit message
- Before every commit run: git diff --cached to verify no secrets
- Keep a running CHANGE_LOG.md in the repo root documenting every fix

## PHASE 1 — READ-ONLY AUDIT (do this first, make no changes)
Thoroughly explore the codebase and document findings. Focus on:

1. TIMEZONE BUG — Schedule setup defaults to UTC instead of asking for the league timezone. Games set for 9PM EST show as 5PM. Find where timezone is handled in schedule creation. Look in apps/league-builder/src/ for schedule-related components and server actions.

2. DRAFT MODE — Draft is broken. Find the draft-related components and server actions (look in apps/league-builder/src/components/draft-room/ and apps/league-builder/src/lib/actions/draft.ts). Understand what is broken.

3. SCHEDULE GENERATOR — Constraint logic is producing invalid schedules. Find the schedule generation logic and understand what constraints are failing.

4. SCOREKEEPER OCR — Camera-based scoresheet reading struggles with messy handwriting. Find the OCR implementation and understand the prompt/logic used.

5. ANY OTHER BUGS — Read through the codebase carefully and flag anything else that looks broken, incomplete, or risky.

## PHASE 2 — FIX (after audit is complete and documented)
Fix each issue one at a time, in this priority order:
1. Timezone fix (highest priority — affects first client immediately)
2. Draft mode
3. Schedule generator
4. Email export (player emails + phone numbers by team) — new feature
5. Email blast (by team or full league) — new feature
6. Scorekeeper OCR prompt improvements

## CHANGE LOG FORMAT
Create/update CHANGE_LOG.md in the repo root with each fix:

## [DATE] Fix: [Issue Name]
- Files changed: [list]
- What was wrong: [description]
- What was fixed: [description]
- Commit: [hash]

## WHEN DONE
Run this exact command to notify:
openclaw system event --text "BLH audit and fixes complete. CHANGE_LOG.md ready for review." --mode now
