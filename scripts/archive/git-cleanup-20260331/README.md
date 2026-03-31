# Git cleanup archive — 2026-03-31

Archived before local cleanup:
- `cleanup/format-and-simplify` — stale full-repo formatting branch
- `fix/mobile-lint-apostrophes` — mislabeled branch containing broader scorekeeper work
- `stash@{0}` — pre-merge local stash snapshot

Purpose:
- preserve recovery artifacts before deleting stale local refs
- keep repo working state clean while retaining manual restore paths

Restore examples:
- inspect patch: `less scripts/archive/git-cleanup-20260331/<name>.patch`
- recreate branch from patch: `git checkout -b restore/<name> main && git apply <patch>`
