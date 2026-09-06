# League Sites UI Rebuild

The `apps/league-sites` route-by-route UI rebuild is implemented and integrated with the existing production data and interaction contracts. Backend actions, data helpers, middleware, API/route handlers, database code, shared packages, and other apps remain outside the visual rebuild scope.

## Start locally

```bash
cd /Users/tonysoprano/workspaces/tony/projects/BeerLeagueHockey-league-sites-ui-rebuild
pnpm --filter @hockey-life/league-sites dev
```

Use a real local league slug when reviewing data-backed routes, for example `/demo-league/schedule` when that fixture is available.

## Review and acceptance

1. Use `src/rebuild/route-manifest.json` to confirm route and contract coverage.
2. Run the automated rebuild checks before design review.
3. Review desktop and mobile layouts plus loading, empty, error, and interactive states where applicable.
4. Record acceptance evidence in the generated checklist and keep the manifest status aligned with the reviewed result.

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
