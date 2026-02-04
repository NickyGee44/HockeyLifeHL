# HockeyLifeHL - Claude Code Context

## Project Overview
Multi-tenant SaaS hockey league management platform (70% complete, live at beerleaguehockey.ca)

## Tech Stack
- Next.js 16.1.1 (App Router), React 19, TypeScript 5
- Supabase (PostgreSQL + RLS), Stripe Connect
- Turbo monorepo with pnpm 9.0.0

## Critical Commands
```bash
pnpm dev:builder    # Start league-builder (port 3000)
pnpm dev:website    # Start league-sites (port 3001)
pnpm build          # Build all packages
pnpm type-check     # TypeScript validation
pnpm lint           # ESLint check
```

## Monorepo Structure
```
apps/
  league-builder/   # Main platform (@hockey-life/league-builder)
  league-sites/     # Public website generator (@hockey-life/league-sites)
packages/
  auth/             # Authentication utilities
  database/         # Supabase client and types
  ui/               # Shared UI components
```

## Database
- Supabase with Row Level Security (RLS)
- Always use RLS policies for new tables
- Generate types after migrations: `mcp__supabase__generate_typescript_types`

## Deployment
- Vercel (auto-deploy)
- `main` branch → Preview environment
- `production` branch → Production environment
- Never push directly to `production` - merge from `main`

## Known Issues & Gotchas
<!-- Update this section when Claude makes mistakes to prevent repeats -->
- domain.ts has TypeScript errors related to custom_domain column not in generated Supabase types
- Radix UI Select components cause hydration mismatch - use mounted state pattern to fix

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

**Features:**
- Auto-save drafts (2s debounce)
- Draft persistence and resume
- Atomic league creation with rollback
- Stripe Connect OAuth flow for paid leagues
- Post-creation success screen with guided next steps

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

## Git Workflow
- Work on `main` branch for development
- Merge `main` → `production` for production deploys
- Use worktrees for parallel feature/bugfix work
