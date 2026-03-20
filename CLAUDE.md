# HockeyLifeHL - Claude Code Context

---

## ABSOLUTE RULE: NO SECRETS IN GIT — ZERO TOLERANCE

**This is the single most important rule in this entire project. Violating it is an immediate, unrecoverable security incident.**

### NEVER commit, stage, write, or output ANY of the following:
- Supabase service role keys, JWTs, or anon keys (real values)
- Stripe secret keys, webhook secrets, or connect tokens
- Database connection strings or passwords
- API keys, tokens, or credentials of any kind
- `.env`, `.env.local`, `.env.production` files
- Any string that looks like `eyJ...`, `sk_live_...`, `sk_test_...`, `whsec_...`, `sbp_...`

### Mandatory behaviors:
1. **NEVER use `git add .` or `git add -A`** — always stage specific files by name
2. **Before every commit**, run `git diff --cached` and scan for secrets, keys, tokens, or credentials
3. **If a file path contains `.env`** — REFUSE to stage or commit it, no exceptions
4. **Environment variables go in `.env.local` only** (gitignored) — never in source code, config files, or markdown
5. **Use `.env.example` for templates** — placeholder values only (e.g., `your-key-here`), never real values
6. **Reference env vars by name only** in docs/code (e.g., "set `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local`")
7. **If you accidentally see a real secret value**, do NOT echo/output it — warn the user immediately

### If a secret is exposed:
1. **Rotate immediately** — the key is compromised the moment it hits any branch
2. Supabase: Dashboard → Settings → API → Regenerate keys
3. Stripe: Dashboard → Developers → API keys → Roll key
4. GitHub: Settings → Secrets → Update all affected secrets

---

## Project Overview
Multi-tenant SaaS hockey league management platform (live at beerleaguehockey.ca)

## Tech Stack
- Next.js 16.1.5 (App Router), React 19.2, TypeScript 5
- Supabase (PostgreSQL + RLS), Stripe Connect
- Turbo monorepo with pnpm 9.0.0
- next-intl for i18n (English + French)
- Zod 4 for schema validation
- Tailwind CSS 4, shadcn/ui components
- Framer Motion / Motion for animations
- Resend for transactional emails
- OpenAI for AI-powered features (news writer)

## Critical Commands
```bash
# Development
pnpm dev:builder    # Start league-builder (port 3000)
pnpm dev:website    # Start league-sites (port 3001)
pnpm dev:mobile     # Start Expo mobile app

# Build & Checks
pnpm build          # Build all packages
pnpm type-check     # TypeScript validation
pnpm lint           # ESLint check
pnpm test           # Run Jest unit tests
pnpm test:watch     # Jest watch mode

# Code Quality
pnpm knip           # Dead code detection

# Platform Audits
pnpm audit:platform       # Run all platform audits
pnpm audit:tenant-queries # Check multi-tenant query scoping
pnpm audit:content-health # Content health check
pnpm audit:idempotency    # Idempotency usage audit
pnpm audit:stripe-pricing # Validate Stripe pricing config
pnpm release:readiness    # Release readiness check
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
/wizard             # League wizard file paths and dev context
/sites              # League-sites templates and theming context
/checkpoint         # WIP save + push (crash resilience)
```

## Monorepo Structure
```
apps/
  league-builder/     # Admin platform - league owners & admins (port 3000)
  league-sites/       # Public websites for leagues (port 3001)
  player-companion/   # Player PWA - offline-first mobile experience
  mobile/             # Expo React Native app
packages/
  auth/               # Authentication utilities
  database/           # Supabase client and types (source of truth)
  ui/                 # Shared UI components (shadcn/ui based)
  data/               # Shared data layer (queries, hooks)
  ui-native/          # React Native UI components
scripts/              # Utility scripts (seeding, migrations, deployment, audits)
supabase/             # Supabase config, migrations, edge functions, seeds
docs/                 # Project documentation (see docs/INDEX.md)
.claude/              # Claude Code config, agents, commands, work logs
.github/              # CI/CD workflows
```

## App Routes

### League Builder (`apps/league-builder/src/app/`)
```
[locale]/
  (auth)/              # Auth pages (login, signup, etc.)
  dashboard/
    leagues/           # League management (list, [id] detail, new)
    seasons/           # Season management
    teams/             # Team management
    captain/           # Captain tools
    admin/             # Admin panel
    analytics/         # Analytics dashboard
    settings/          # User/org settings
    staff/             # Staff management
    staffing/          # Staffing operations
    company/           # Company/org settings
    payments/          # Payment management
  website-editor/      # League website WYSIWYG editor
  register/            # Registration flow
  pricing/             # Pricing page
  verify/              # Email verification
api/                   # API routes
register/              # Public registration
```

### League Sites (`apps/league-sites/src/app/`)
```
[leagueSlug]/
  schedule/            # Week-based schedule with filters
  games/               # Game details and previews
  scores/              # Score display
  standings/           # League standings
  stats/               # Player/team statistics
  players/             # Player profiles
  teams/               # Team pages
  playoffs/            # Playoff brackets
  news/                # News articles (AI-generated recaps)
  events/              # League events
  gallery/             # Photo galleries
  goalies/             # Goalie marketplace
  captain/             # Captain dashboard
  me/                  # Player personal dashboard
  scorekeeper/         # Scorekeeper PWA interface
  checkin/             # Game day check-in
  referee/             # Referee tools
  register/            # League registration
  venues/              # Venue information
  suspensions/         # Suspension tracking
  history/             # League history
  about/               # About the league
  contact/             # Contact page
  p/                   # Public player profiles
  verify/              # Verification flow
  privacy/             # Privacy policy
  terms/               # Terms of service
discover/              # League discovery/directory
api/                   # League sites API routes
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
- Migrations: `supabase/migrations/` (timestamped SQL files)
- Edge functions: `supabase/functions/`
- Seeds: `supabase/seeds/`
- Generate types after migrations: `mcp__supabase__generate_typescript_types`
- Use `/migrate` skill for structured migration workflow
- Use `/sync-types` skill when types get out of sync

## CI/CD
- **GitHub Actions** (`.github/workflows/`):
  - `ci.yml` — Lint, type-check, and unit tests on push/PR to `main`
  - `e2e-tests.yml` — End-to-end test suite
  - `gitleaks.yml` — Secret scanning (push, PR, daily scheduled scan)
- **Vercel** (auto-deploy):
  - `main` branch → Preview environment
  - `production` branch → Production environment
  - Never push directly to `production` - merge from `main`
  - Use `/ship` skill before production deploys
- Node.js 20 in CI

## Stripe Payments & Custom Domain
- **Custom Payment Domain**: `pay.beerleaguehockey.ca`
- Configured in Stripe Dashboard (Settings → Branding → Custom domain)
- Automatically used for all Checkout sessions and payment links
- No code changes required - handled by Stripe based on account settings
- **Documentation**: See `docs/STRIPE_CUSTOM_DOMAIN_SETUP.md` for full setup guide
- **Business Model**: 2.99% platform fee on all league registration payments
- Uses Stripe Connect Express for league accounts

## Known Issues & Gotchas
<!-- Update this section when Claude makes mistakes to prevent repeats -->
- domain.ts has TypeScript errors related to custom_domain column not in generated Supabase types
- Radix UI Select components cause hydration mismatch - use mounted state pattern to fix
- `packages/auth/node_modules/@hockey-life/database/src/types.ts` can go stale - run `pnpm install` to refresh symlinks after type changes
- Stripe SDK version mismatches between apps - keep versions aligned
- **Enum-to-Boolean Transformation Pattern**: Database uses enums (e.g., `leadership_role`), app layer transforms to booleans (e.g., `is_captain`). See `usePlayerProfile.ts` for canonical pattern.
- **PWA Query Validation**: Type-check doesn't catch database column mismatches in PWA queries. Always test PWA queries with actual database connection.
- **Trust Database Schema First**: If 99% of code works with schema, the schema is correct. Look for outlier bugs, not wholesale schema problems.
- **pnpm overrides**: Security patches and version fixes are managed via `pnpm.overrides` in root `package.json` — check there before debugging dependency version issues.

## Key Features (Active Development)
- **Captain Dashboard** - roster management, join requests, import roster
- **Scorekeeper System** - offline-first PWA, real-time game scoring
- **Stripe Connect Payments** - registration fees (2.99% platform fee), chargebacks, refunds
- **Website Editor** - theme customization, custom domains, branding
- **Schedule Management** - game scheduling with conflict detection
- **League Setup Wizard** - 9-step guided league creation (see below)
- **Goalie Marketplace** - goalie availability and request system
- **AI News Writer** - auto-generated game recaps and league news
- **Referee Tools** - referee management and payroll
- **Playoff Brackets** - playoff tournament management
- **Badge System** - player achievement badges
- **League Discovery** - public league directory

## League Setup Wizard (9 Steps)
Location: `apps/league-builder/src/components/league-wizard/`

**Steps:**
1. Org Info - organization/league owner details
2. League Info - name, location, branding (colors, logo)
3. Season & Scorekeeping - dates, game settings, scorekeeping config
4. Teams - optional team creation
5. Website & Pages - page visibility and content settings
6. Add-ons - premium feature selection
7. Registration & Payments - fees, Stripe Connect, early bird, late fees
8. Review - summary, warnings, create button
9. Next Steps - post-creation guidance and onboarding

**Key Files:**
- `wizard-container.tsx` - Main container, state management, navigation
- `wizard-navigation.tsx` - Step navigation controls
- `wizard-progress.tsx` - Progress indicator
- `steps/step-{1-9}-*.tsx` - Individual step components
- `lib/schemas/league-wizard.ts` - Zod validation schemas
- `lib/actions/league-wizard.ts` - Server actions (saveDraft, createLeague)

## League Sites Templates
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
- `/[leagueSlug]/standings` - League standings
- `/[leagueSlug]/stats` - Player and team statistics
- `/[leagueSlug]/playoffs` - Playoff brackets
- `/[leagueSlug]/me` - Player dashboard (upcoming games, results, team)
- `/[leagueSlug]/captain` - Captain duties and roster management
- `/[leagueSlug]/scorekeeper` - Live game scoring PWA
- `/[leagueSlug]/goalies` - Goalie marketplace
- `/[leagueSlug]/news` - League news and AI recaps
- `/[leagueSlug]/register` - League registration

**CSS Variables for Theming:**
- `--league-primary`, `--league-secondary` - League colors
- `--home-team-color`, `--away-team-color` - Game-specific team colors
- All components fall back gracefully when branding is missing

## Pricing Model
- Platform Monthly: $299.99/mo — hosting, maintenance, and all core features (no free tier)
- 2.99% transaction fee on payment processing (minimum $0.50 per transaction)
- Optional premium add-ons (billed monthly via Stripe):
  - Advanced Stats: $14.99/mo — deep analytics, player comparisons, league-wide stat tracking
  - AI News Writer: $14.99/mo — auto-generated game recaps, weekly roundups, player spotlights
- Custom domains — paid add-on (contact for quote)
- Historic data import — paid add-on (contact for quote, varies per league)

## Coding Standards
- **NEVER commit secrets, keys, tokens, or .env files** (see ABSOLUTE RULE above)
- **NEVER use `git add .` or `git add -A`** — stage specific files by name only
- Always use RLS policies for new tables
- Follow existing patterns in codebase
- Commit after each logical chunk
- No half-finished code
- Use existing components from packages/ui before creating new ones
- Keep API routes in `apps/league-builder/src/app/api/` and `apps/league-sites/src/app/api/`
- Always verify auth in server actions with `getServerSession`
- Use `/review` skill before committing to catch issues
- Use `@hockey-life/data` package for shared queries and hooks
- Database types are exported from `@hockey-life/database/types`

## Git Workflow
- Work on `main` branch for development
- Merge `main` → `production` for production deploys
- Use worktrees for parallel feature/bugfix work

## Documentation
- All docs live in `docs/` — see `docs/INDEX.md` for a categorized table of contents
- Key docs: `ARCHITECTURAL_DECISIONS.md`, `DEPLOYMENT_GUIDE.md`, `MONOREPO_SETUP.md`, `GIT_WORKFLOW.md`
- Work logs: `.claude/work-logs/` — daily session logs for multi-agent coordination
- Agent configs: `.claude/agents/` — agent role definitions (bugfix, feature-dev, validator)
- Skills: `.claude/commands/` — slash command definitions
- Templates: `.claude/templates/` — reusable templates

## Design System
- See `docs/BRAND-KIT.md` for full design system (colors, typography, spacing, components)
- Gold + neutral color palette with OKLCH values
- Inter font family, 4px spacing rhythm
- Dark and light mode support with CSS variables
- Multi-tenant theming via league-specific CSS custom properties

## Environment Variables
Required env vars (set in `.env.local`, referenced in `turbo.json`):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `STRIPE_SECRET_KEY` — Stripe secret key (server-only)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_WEBHOOK_SECRET_CONNECT` — Stripe Connect webhook secret
- `NEXT_PUBLIC_APP_URL` — League builder URL
- `NEXT_PUBLIC_SITE_URL` — League sites URL
- `RESEND_API_KEY` — Resend email API key
- `OPENAI_API_KEY` — OpenAI API key (for AI news writer)
- `SENTRY_AUTH_TOKEN` — Sentry error tracking token
- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
