## BLH Admin Import Pipeline V1

Scope: implement the admin-only assisted migration/import path for league-scoped BLH migrations, reusing the existing migration request, asset upload, analysis, and import-mapping surfaces where credible.

Planned work:
1. Extend the migration data model with explicit admin approval fields plus import run/report tables for auditable execution history.
2. Upgrade migration asset metadata and validation so uploaded files can carry short labels/notes and are treated as untrusted input with basic type/size/readability/junk rejection.
3. Expand analysis output to include clearer import suggestions, confidence, blockers, and a recommended execution order for Hockey Life-style imports.
4. Add platform-admin actions/UI to create or open a migration intake for a league, review the generated plan, approve it, and execute imports.
5. Implement an admin-only execution path that stays league-scoped, records audit events, and reuses existing team/player/schedule import logic where possible, with minimal support for seasons and venues needed for Hockey Life V1.
6. Add focused tests for the new approval and execution behavior, then run practical validation before committing.
