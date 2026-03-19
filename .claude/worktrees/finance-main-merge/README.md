# HockeyLifeHL - Multi-Tenant Hockey League Platform

A modern SaaS platform for managing hockey leagues -- teams, drafts, stats, payments, schedules, and public league websites. Live at [beerleaguehockey.ca](https://beerleaguehockey.ca). Approximately 70% complete.

## Tech Stack

- **Framework:** Next.js 16.1.1 (App Router), React 19, TypeScript 5
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Payments:** Stripe Connect (2.99% platform fee)
- **Monorepo:** Turbo with pnpm 9.0.0
- **i18n:** next-intl (English + French)
- **Deployment:** Vercel (auto-deploy from `main` and `production` branches)

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
  data/               # Shared data layer
  ui/                 # Shared UI components (shadcn/ui)
  ui-native/          # React Native UI components
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Stripe credentials

# Start development servers
pnpm dev:builder    # Admin platform on http://localhost:3000
pnpm dev:website    # Public league sites on http://localhost:3001
```

### Other Commands

```bash
pnpm build          # Build all packages
pnpm type-check     # TypeScript validation
pnpm lint           # ESLint check
```

## Key Features

- **Multi-Tenant Architecture** -- fully isolated data per league via RLS
- **League Setup Wizard** -- 7-step guided league creation
- **Team & Player Management** -- rosters, captains, join requests, imports
- **Draft System** -- real-time draft room with reliability tracking
- **Schedule Management** -- game scheduling with conflict detection
- **Scorekeeper System** -- offline-first PWA for real-time game scoring
- **Stripe Connect Payments** -- registration fees, early bird pricing, refunds
- **Public League Websites** -- customizable themes, standings, schedules, stats
- **Player Companion PWA** -- RSVP, gallery, calendar export, news
- **Sponsor Management** -- banners and footer strips for league sites
- **Notification System** -- event-driven email notifications to captains and players
- **i18n** -- full English and French language support

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) -- Full development context: coding standards, git workflow, skills, known issues
- [`docs/INDEX.md`](./docs/INDEX.md) -- Documentation index
- [`docs/BRAND-KIT.md`](./docs/BRAND-KIT.md) -- Design system (colors, typography, spacing)

## Development

See [`CLAUDE.md`](./CLAUDE.md) for full coding standards, git workflow, deployment process, and project conventions.

Key points:

- Work on `main` branch for development; merge to `production` for production deploys
- Always use RLS policies for new database tables
- Update both `en.json` and `fr.json` when adding UI strings
- Never commit secrets or `.env` files -- see CLAUDE.md for details

## License

Proprietary -- All rights reserved
