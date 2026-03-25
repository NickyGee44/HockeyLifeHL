# Legacy All-Time Stats Source Of Truth

## Canonical source

The legacy aggregate all-time player stats already stored in the database live in `public.legacy_players`.

This is the canonical baseline for the imported HockeyLifeHL legacy totals. It is the table that existing migration and rebuild code reads before projecting the data into synthetic season/game rows.

Relevant repo references:

- [scripts/rebuild-historical-baseline-from-legacy.js](/Users/novagrossi/dev/HockeyLifeHL/scripts/rebuild-historical-baseline-from-legacy.js)
- [scripts/finalize-hockey-life-import.js](/Users/novagrossi/dev/HockeyLifeHL/scripts/finalize-hockey-life-import.js)
- [packages/database/src/types.ts](/Users/novagrossi/dev/HockeyLifeHL/packages/database/src/types.ts)

## Exact table and fields

Source table: `public.legacy_players`

Identity and linkage fields:

- `id`
- `first_name`
- `last_name`
- `full_name`
- `is_goalie`
- `matched_to_profile_id`
- `matched_at`

Aggregate skater stat fields:

- `games_played`
- `goals`
- `assists`
- `points`
- `points_per_game`
- `wins`
- `ties`
- `win_percentage`
- `moosehead_cup_wins`

Aggregate goalie stat fields:

- `games_played`
- `wins`
- `ties`
- `win_percentage`
- `saves`
- `goals_against`
- `goals_against_average`
- `shutouts`
- `save_percentage`

Provenance and audit fields:

- `imported_from`
- `created_at`
- `updated_at`

## What is derived, not canonical

These are downstream projections and should not be treated as source-of-truth for the legacy aggregate baseline:

- `player_stats`
- `goalie_stats`
- `player_season_stats`
- `goalie_season_stats`
- the all-time leader aggregation in [apps/league-sites/src/lib/data.ts](/Users/novagrossi/dev/HockeyLifeHL/apps/league-sites/src/lib/data.ts)

Why:

- [scripts/rebuild-historical-baseline-from-legacy.js](/Users/novagrossi/dev/HockeyLifeHL/scripts/rebuild-historical-baseline-from-legacy.js) reads from `legacy_players` first, then inserts synthetic `games`, `team_rosters`, `player_stats`, and `goalie_stats`.
- [supabase/migrations_archive/legacy-short-version-collisions/20260215/20260215_insert_all_legacy_stats.sql](/Users/novagrossi/dev/HockeyLifeHL/supabase/migrations_archive/legacy-short-version-collisions/20260215/20260215_insert_all_legacy_stats.sql) does the same thing in SQL.
- [supabase/utilities/schema.sql](/Users/novagrossi/dev/HockeyLifeHL/supabase/utilities/schema.sql) shows `player_season_stats` and `goalie_season_stats` are views built from `player_stats` / `goalie_stats`, with completed-and-verified game filters.

That means the season views and public history page can drift from the raw imported aggregate baseline if synthetic legacy games are missing, rebuilt, or filtered by verification status.

## Durable extractor

Use the extractor script below to pull the current DB baseline cleanly and normalize it into repo artifacts:

```bash
pnpm exec tsx scripts/export-legacy-all-time-player-stats.ts
```

Default outputs:

- `artifacts/legacy/legacy-all-time-player-stats.normalized.json`
- `artifacts/legacy/legacy-all-time-player-stats.summary.json`

The script:

- loads `.env.local`
- reads `public.legacy_players` with the existing Supabase service-role pattern already used across repo scripts
- validates the DB rows with `zod`
- normalizes skaters and goalies into one stable `players[]` artifact
- writes a summary with row counts, key fields, and repo-backed expected counts

## Repo-backed expected counts

The repo contains explicit validation expectations for this dataset in [supabase/migrations_archive/legacy-short-version-collisions/20260215/20260215_validate_legacy_migration.sql](/Users/novagrossi/dev/HockeyLifeHL/supabase/migrations_archive/legacy-short-version-collisions/20260215/20260215_validate_legacy_migration.sql):

- total legacy rows: `923`
- skaters: `795`
- goalies: `128`

Those numbers are useful as a consistency check when rerunning the extractor against the live database.
