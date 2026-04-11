# League Builder dashboard route manifest

Purpose: define the current dashboard route inventory and the canonical links the rebuilt IA should use. Compatibility redirects can stay in place, but navigation, command palette entries, and new links should point to the canonical targets below.

## Organization scope

| Current / legacy path | Canonical path | Notes |
| --- | --- | --- |
| `/dashboard` | `/dashboard` | Org dashboard home |
| `/dashboard/leagues` | `/dashboard/leagues` | League index |
| `/dashboard/staff` | `/dashboard/staff` | Org-level staff pool |
| `/dashboard/company` | `/dashboard/settings` | Keep redirect compatibility, stop linking to `/company` |
| `/dashboard/settings/billing` | `/dashboard/settings` | Billing remains nested, but org nav entry should land on settings |
| `/dashboard/staffing/*` | `/dashboard/staff` | Legacy staffing route family redirected in Next config |

## League scope

Canonical primary IA for a league:

- `/dashboard/leagues/[leagueId]` overview
- `/dashboard/leagues/[leagueId]/seasons`
- `/dashboard/leagues/[leagueId]/finance`
- `/dashboard/leagues/[leagueId]/settings`

Secondary league tools that should stay discoverable, but not dominate primary navigation:

- `/billing`
- `/website`
- `/integrations`
- `/news`
- `/pages`
- `/sponsors`
- `/gallery`
- `/events`
- `/awards`
- `/staff`
- `/contact-inbox`
- `/bugs`
- `/migration-center`

## Season scope

Canonical primary IA for a season:

- `/dashboard/leagues/[leagueId]/seasons/[seasonId]` overview
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/registrations`
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/teams`
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/schedule`
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/games`
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/standings`
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/playoffs`
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/draft`

Secondary season tools:

- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/scorekeeper-schedule`
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/ratings`
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/eligibility`
- `/dashboard/leagues/[leagueId]/seasons/[seasonId]/edit`

## Legacy season-selector shims to keep redirect-only

These routes still exist in the app and route helpers for compatibility or context switching, but they should not appear in navigation or the command palette as canonical destinations:

- `/dashboard/leagues/[leagueId]/schedule`
- `/dashboard/leagues/[leagueId]/registrations`
- `/dashboard/leagues/[leagueId]/teams`
- `/dashboard/leagues/[leagueId]/games`
- `/dashboard/leagues/[leagueId]/standings`
- `/dashboard/leagues/[leagueId]/playoffs`
- `/dashboard/leagues/[leagueId]/ratings`
- `/dashboard/leagues/[leagueId]/eligibility`
- `/dashboard/leagues/[leagueId]/draft`
- `/dashboard/leagues/[leagueId]/scorekeepers`
- `/dashboard/leagues/[leagueId]/scorekeepers/schedule`

## Rebuild rule of thumb

If a destination depends on the active season, link directly into the season workspace route, not the older league-scoped selector route.
