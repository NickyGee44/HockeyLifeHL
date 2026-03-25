# BLH Agent-Assisted Migration Pipeline — Scope Brief

Date: 2026-03-23
Project: BeerLeagueHockey / HockeyLifeHL
Primary migration #1: Hockey Life
Owner approval model: Nick/admin must approve before any import writes

## Goal
Build a V1 migration pipeline that lets a league submit migration files in mixed formats, have the system validate and analyze them, produce an agent-assisted mapping/import proposal, and then let an admin explicitly approve and run a league-scoped import into BLH.

This is not a fully autonomous importer.
The agent proposes. Admin approves. Import writes only to the submitting league.

---

## Product Intent
Leagues may upload SQL dumps, CSVs, spreadsheets, exports, PDFs, text notes, screenshots, or mixed files.

The system should:
1. accept the files
2. let the submitting league annotate each file with a note
3. validate the files as untrusted input
4. analyze what each file likely contains
5. propose entity + field mappings and import order
6. surface blockers/confidence in admin UI
7. require explicit admin approval before execution
8. execute import only into that league’s scope
9. retain an audit trail and import run report

Hockey Life is the first real migration case and should validate the design.

---

## V1 Scope

### Intake
- A league owner/admin can create a migration request tied to their league
- A request can contain one or more uploaded files
- Each file can store:
  - original filename
  - mime type / extension
  - size
  - upload timestamp
  - submitter
  - note/label entered by user (required or strongly encouraged)
  - storage path / preview metadata

### Validation
Perform pre-analysis checks before any agent mapping:
- file exists and is readable
- size within allowed limits
- type/extension captured
- parseability/readability smoke test where possible
- obvious junk/empty/corrupt rejection
- malicious or unsafe handling posture for untrusted files
- request/file tied to the correct submitting league

Validation result should be stored per file with status + reason.

### Agent Analysis / Mapping Proposal
Spawn or invoke an agent-assisted analysis step that:
- classifies what each file is likely to contain
- identifies candidate entities:
  - seasons
  - teams
  - arenas/venues
  - players
  - games
  - standings/stats/points
  - any unsupported/unknown entities
- proposes destination models/tables in BLH
- proposes key field mappings
- identifies inferred relationships/dependencies
- recommends import order
- outputs confidence + blockers + assumptions
- never writes production data directly during analysis

### Admin Review Layer
Platform admin dashboard must show:
- migration request status
- uploaded files + user notes
- validation results
- analysis summary
- proposed mappings
- import order
- blockers/warnings
- ability to:
  - approve
  - reject
  - request re-analysis
  - optionally edit/override key mapping decisions if minimal UI is feasible in V1

### Import Execution
After admin approval only:
- import runs are league-scoped only
- import path executes in a controlled order
- V1 preferred order:
  1. seasons
  2. teams
  3. arenas/venues
  4. players
  5. games
  6. standings/stats/points if cleanly supported
- execution should reuse existing import logic where possible
- no cross-league writes
- no auto-import on upload
- no silent destructive merge behavior

### Audit / Reporting
Store and surface:
- who submitted request/files
- who approved or rejected
- when analysis was run
- when import ran
- import run summary by entity:
  - created
  - updated
  - skipped
  - failed
- error details and blockers
- raw analysis artifact or structured snapshot for traceability

---

## Hockey Life V1 Target
Use Hockey Life as the first end-to-end migration under this workflow.

Known desired import order:
1. seasons
2. teams
3. arenas
4. players
5. games
6. points/stats

Expected deliverable for Hockey Life in V1:
- files classified correctly
- proposal generated for all 6 SQL dumps
- admin can review/approve
- import executes league-scoped into Hockey Life’s BLH league record
- report shows what landed and what needs cleanup

---

## Guardrails
- All uploads are untrusted input
- Agent analysis is advisory, not final write authority
- Human approval required before execution
- Imports must be league-scoped only
- Prefer append/create/update with explicit logic over broad destructive rewrites
- If rollback is not fully supported, say so clearly in UI/reporting
- No fake “AI confidence theater” without showing actual blockers/uncertainty

---

## What is In Scope for This Build
- tighten and complete the current migration center around this workflow
- reuse existing `league_migration_requests`, upload plumbing, analysis/mapping suggestions, and import logic if already present
- add missing approval boundary
- add import run/report model and persistence
- wire actual admin-only execution path
- make Hockey Life the first working example

## Out of Scope for V1
- fully generic autonomous import for every weird format
- perfect schema inference for arbitrary files
- automatic writes without admin approval
- self-healing mapping engine
- broad rollback engine across all entities unless already cheap to support
- support for every media type beyond classification/attachment in V1

---

## Codex Implementation Best Practices
- inspect existing repo state first; do not rebuild what already exists
- prefer small composable additions over sweeping rewrites
- write/update a concise implementation plan in-repo before coding if needed
- reuse admin auth, queue, audit, and import patterns already in BLH
- keep changes limited to migration pipeline surfaces
- validate touched surfaces with relevant commands before finishing
- commit materially complete work with a clear message
- final report must include files changed, commands run, results, commit SHA, and known limitations

---

## Definition of Done
Done means:
1. a league can submit a migration request with files + notes
2. files are validated and analyzed
3. admin can review proposal and approve/reject
4. approved request can execute import into the correct league only
5. import run/report is persisted and visible enough to inspect outcome
6. Hockey Life is usable as migration #1 under this workflow
7. work is committed with evidence of what passed/failed
