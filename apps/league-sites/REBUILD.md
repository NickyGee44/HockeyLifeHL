# League Sites UI Rebuild

This branch intentionally replaces the rendered `apps/league-sites` page layer with a neutral route-by-route rebuild shell. The production implementation remains available in git history and the pre-rebuild backup artifacts. Backend actions, data helpers, middleware, API/route handlers, database code, shared packages, and other apps are not part of this strip-down.

## Start locally

```bash
cd /Users/tonysoprano/workspaces/tony/projects/BeerLeagueHockey-league-sites-ui-rebuild
pnpm --filter @hockey-life/league-sites dev
```

The shell is intentionally offline-friendly. Use any route pattern with sample parameters, for example `/demo-league/schedule`.

## Work one page at a time

1. Open `src/rebuild/route-manifest.json`.
2. Pick a route ID and set its status from `not-started` to `in-progress`.
3. Rebuild that page while preserving its listed sections, interactions, states, and contract IDs.
4. Reconnect existing non-visual code deliberately; do not copy the legacy presentation wholesale.
5. Set the status to `review`, generate the checklist, and verify desktop/mobile plus all applicable states.
6. Set `complete` only after acceptance.

## Keep the tracker current

```bash
pnpm --filter @hockey-life/league-sites rebuild:test
pnpm --filter @hockey-life/league-sites rebuild:tracker
pnpm --filter @hockey-life/league-sites rebuild:check
```

- Machine source of truth: `src/rebuild/route-manifest.json`
- Human tracker: `../../docs/LEAGUE-SITES-UI-REBUILD-CHECKLIST.md`
- Coverage verifier: `scripts/verify-rebuild-routes.mjs`

Do not hand-edit generated route rows in the Markdown tracker. Update the manifest, then run `rebuild:tracker`.
