# League Sites Development Context

> **Use when:** working on league-sites app (public-facing league websites), template components, or theming
> **Don't use when:** working on league-builder admin features (that's a different app) or the wizard (use `/wizard`)
> **Outputs:** context for league-sites development — no automated checks

---

Location: `apps/league-sites/`

## BMHL-Style Template Components
- `components/shared/TeamLogo.tsx` - Reusable logo with initial fallback
- `components/shared/ProgressBar.tsx` - Stats comparison bars
- `components/ScoreTicker.tsx` - Horizontal scrolling recent games
- `components/schedule/*` - Week picker, filters, table
- `components/game/*` - Game preview header, stats comparisons

## Key Pages
- `/[leagueSlug]/schedule` - Week-based schedule with filters
- `/[leagueSlug]/games/[gameId]` - Game preview with stats
- `/[leagueSlug]/me` - Player dashboard (upcoming games, results, team)
- `/[leagueSlug]/captain` - Captain duties and roster management

## CSS Variables for Theming
- `--league-primary`, `--league-secondary` - League colors
- `--home-team-color`, `--away-team-color` - Game-specific team colors
- All components fall back gracefully when branding is missing

## Multi-Tenant Theming
- Each league has custom colors stored in the database
- CSS custom properties are injected via a theme provider at the layout level
- Components should NEVER hardcode colors — always use CSS variables
- See `docs/MULTI_TENANT_BRANDING.md` for full theming architecture
