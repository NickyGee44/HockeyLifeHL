# HockeyLifeHL - Claude Code Context

## Project Overview
Multi-tenant SaaS hockey league management platform (70% complete, live at beerleaguehockey.ca)

## Tech Stack
- Next.js 16.1.1 (App Router), React 19, TypeScript 5
- Supabase (PostgreSQL + RLS), Stripe Connect
- Turbo monorepo with pnpm 9.0.0
- next-intl for i18n (English + French)

## Critical Commands
```bash
pnpm dev:builder    # Start league-builder (port 3000)
pnpm dev:website    # Start league-sites (port 3001)
pnpm build          # Build all packages
pnpm type-check     # TypeScript validation
pnpm lint           # ESLint check
```

## Claude Code Skills
```bash
/audit              # Quick security audit on recent changes
/doctor             # Environment health check
/ship               # Pre-deployment checklist
/migrate            # Database migration workflow with RLS validation
/sync-types         # Regenerate & sync Supabase TypeScript types
/payments-check     # Stripe payment & billing audit
/cleanup            # Dead code, i18n gaps, and consistency scan
/review             # Self-review before commit
```

## Monorepo Structure
```
apps/
  league-builder/     # Admin platform - league owners & admins (port 3000)
  league-sites/       # Public websites for leagues (port 3001)
  player-companion/   # Player PWA - offline-first mobile experience
  blh/                # BMHL-specific implementation
packages/
  auth/               # Authentication utilities
  database/           # Supabase client and types (source of truth)
  ui/                 # Shared UI components (shadcn/ui based)
```

## i18n
- Translation files: `apps/league-builder/src/messages/{en,fr}.json`
- Always update BOTH en.json and fr.json when adding/changing UI strings
- Use `useTranslations` hook from next-intl for all user-facing text
- Never hardcode user-facing strings in components

## Database
- Supabase with Row Level Security (RLS)
- Always use RLS policies for new tables
- Types source of truth: `packages/database/src/types.ts`
- Generate types after migrations: `mcp__supabase__generate_typescript_types`
- Use `/migrate` skill for structured migration workflow
- Use `/sync-types` skill when types get out of sync

## Deployment
- Vercel (auto-deploy)
- `main` branch → Preview environment
- `production` branch → Production environment
- Never push directly to `production` - merge from `main`
- Use `/ship` skill before production deploys

## Known Issues & Gotchas
<!-- Update this section when Claude makes mistakes to prevent repeats -->
- domain.ts has TypeScript errors related to custom_domain column not in generated Supabase types
- Radix UI Select components cause hydration mismatch - use mounted state pattern to fix
- `packages/auth/node_modules/@hockey-life/database/src/types.ts` can go stale - run `pnpm install` to refresh symlinks after type changes
- Stripe SDK version mismatches between apps - keep versions aligned

## Key Features (Active Development)
- **Captain Dashboard** - roster management, join requests, import roster
- **Scorekeeper System** - offline-first PWA, real-time game scoring
- **Stripe Connect Payments** - registration fees (2.99% platform fee), chargebacks, refunds
- **Website Editor** - theme customization, custom domains, branding
- **Schedule Management** - game scheduling with conflict detection
- **League Setup Wizard** - 7-step guided league creation (see below)

## League Setup Wizard (7 Steps)
Location: `apps/league-builder/src/components/league-wizard/`

**Steps:**
1. League Info - name, location, branding (colors, logo)
2. Season Settings - dates, registration type, game settings
3. Teams - optional team creation
4. Registration Fees - enable/disable paid registration, early bird, late fees
5. Payment Setup - Stripe Connect integration (if fees enabled)
6. Website & Branding - visibility, theme, social links
7. Review & Launch - summary, warnings, create button

**Key Files:**
- `wizard-container.tsx` - Main container, state management, 7-step navigation
- `steps/step-{1-7}-*.tsx` - Individual step components
- `wizard-success.tsx` - Post-creation success screen with next steps
- `lib/schemas/league-wizard.ts` - Zod validation schemas
- `lib/actions/league-wizard.ts` - Server actions (saveDraft, createLeague)

## League Sites Templates (Platform 2)
Location: `apps/league-sites/`

**BMHL-Style Template Components:**
- `components/shared/TeamLogo.tsx` - Reusable logo with initial fallback
- `components/shared/ProgressBar.tsx` - Stats comparison bars
- `components/ScoreTicker.tsx` - Horizontal scrolling recent games
- `components/schedule/*` - Week picker, filters, table
- `components/game/*` - Game preview header, stats comparisons

**Key Pages:**
- `/[leagueSlug]/schedule` - Week-based schedule with filters
- `/[leagueSlug]/games/[gameId]` - Game preview with stats
- `/[leagueSlug]/me` - Player dashboard (upcoming games, results, team)
- `/[leagueSlug]/captain` - Captain duties and roster management

**CSS Variables for Theming:**
- `--league-primary`, `--league-secondary` - League colors
- `--home-team-color`, `--away-team-color` - Game-specific team colors
- All components fall back gracefully when branding is missing

## Pricing Model
- Platform is FREE forever
- 2.99% transaction fee on payment processing
- Custom domains - paid add-on (contact for quote)
- Historic data import - paid add-on (contact for quote)

## Coding Standards
- Always use RLS policies for new tables
- Follow existing patterns in codebase
- Commit after each logical chunk
- No half-finished code
- Use existing components from packages/ui before creating new ones
- Keep API routes in apps/league-builder/app/api/
- Always verify auth in server actions with `getServerSession`
- Use `/review` skill before committing to catch issues

## Git Workflow
- Work on `main` branch for development
- Merge `main` → `production` for production deploys
- Use worktrees for parallel feature/bugfix work

## Design System
- See `docs/BRAND-KIT.md` for full design system (colors, typography, spacing, components)
- Gold + neutral color palette with OKLCH values
- Inter font family, 4px spacing rhythm
- Dark and light mode support with CSS variables
- Multi-tenant theming via league-specific CSS custom properties
