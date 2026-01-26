# HockeyLifeHL - Multi-Tenant Hockey League Platform

A modern, full-featured SaaS platform for managing multiple hockey leagues with drafts, stats tracking, payments, and more.

## Overview

HockeyLifeHL is a comprehensive multi-tenant platform that enables hockey leagues to:
- Manage teams, players, and seasons
- Run drafts and track stats in real-time
- Process payments via Stripe Connect
- Discover and join leagues publicly
- Support both draft and non-draft registration flows
- Generate revenue through sponsor management

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL with Row Level Security)
- **Payments:** Stripe Connect
- **PWA:** Service workers for offline scorekeeper functionality
- **Deployment:** Vercel

## Key Features

### Multi-Tenant Architecture
- Fully isolated data per league using Row Level Security (RLS)
- League-aware helper functions for all database operations
- Automatic tenant context handling

### League Management
- Public league discovery and search
- Location-based league search
- Flexible registration types (draft, open registration, captain invite)
- Sponsor management (platform-wide and per-league)
- Feature flags per league

### Player Features
- Browse and search for leagues
- Request to join teams (non-draft leagues)
- Track personal stats across seasons
- View game schedules and standings

### Scorekeeper System
- Offline-first stat entry (PWA)
- Real-time sync when connection restored
- iPad-optimized interface
- Duplicate entry prevention
- Captain verification system

### Admin Features
- Complete league setup and configuration
- Team and player management
- Sponsor management
- Payment tracking
- Draft management

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account (for payments)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd HockeyLeague/HockeyLifeHL

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Stripe credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Variables

Required environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_SITE_URL=your_site_url
```

## Database Setup

### Initial Migration
All core multi-tenant migrations have been executed. For new features, see:
- `RUN_NEW_FEATURE_MIGRATIONS.md` - New sponsor, registration, and discovery features

### Type Generation
After running migrations, regenerate TypeScript types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/types/database.ts
```

## Documentation

- **MULTI_TENANT_PROGRESS_TRACKER.md** - Current project status and progress
- **RUN_NEW_FEATURE_MIGRATIONS.md** - Instructions for new feature migrations
- **DEPLOYMENT_GUIDE.md** - Production deployment instructions
- **SCOREKEEPER_SYSTEM_DESIGN.md** - Scorekeeper system architecture
- **GIT_WORKFLOW.md** - Git workflow and branch strategy
- **SECURITY.md** - Security best practices and RLS policies
- **UI_UX_GUIDE.md** - Design system and component guidelines
- **BHL-brand-kit.md** - Brand colors, fonts, and assets

For agent-specific prompts and feature details:
- See project root: `UPDATED_AGENT_PROMPTS_V2.md`, `COPY_PASTE_PROMPTS_V2.md`, `NEW_FEATURES_SUMMARY.md`

## Project Structure

```
HockeyLifeHL/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # League dashboard pages
│   │   ├── (public)/          # Public pages (league discovery)
│   │   ├── (scorekeeper)/     # Scorekeeper interface
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── admin/            # Admin-specific components
│   │   ├── leagues/          # League management components
│   │   ├── scorekeeper/      # Scorekeeper components
│   │   ├── sponsors/         # Sponsor display components
│   │   └── ui/               # Shared UI components
│   ├── lib/                   # Utility functions and actions
│   │   ├── admin/            # Admin server actions
│   │   ├── auth/             # Authentication helpers
│   │   ├── leagues/          # League management actions
│   │   ├── scorekeeper/      # Scorekeeper actions
│   │   ├── sponsors/         # Sponsor management actions
│   │   └── supabase/         # Supabase client utilities
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
├── supabase/                  # Database migrations
│   └── migrations/           # SQL migration files
└── docs/                      # Additional documentation
    └── archive/              # Archived reports and old docs
```

## Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Type Check
```bash
npx tsc --noEmit
```

## Current Status

**Overall Progress:** 65% Complete

**Completed:**
- ✅ Multi-tenant database architecture (100%)
- ✅ Core league management features
- ✅ Scorekeeper system with offline support
- ✅ Stripe Connect payment integration
- ✅ Player dashboard and stats tracking
- ✅ Admin panels

**In Progress:**
- 🔄 New feature migrations (sponsors, discovery, registration types)
- 🔄 Public league discovery pages
- 🔄 Non-draft registration flows
- 🔄 Sponsor display components

**Next Steps:**
1. Execute new feature migrations (see `RUN_NEW_FEATURE_MIGRATIONS.md`)
2. Regenerate TypeScript types
3. Build public league discovery UI
4. Implement sponsor management UI
5. Add non-draft team registration flow

See `MULTI_TENANT_PROGRESS_TRACKER.md` for detailed progress tracking.

## Contributing

This is a private project. For questions or issues, please contact the development team.

## License

Proprietary - All rights reserved
