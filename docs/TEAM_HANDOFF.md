# Team Handoff Documentation - HockeyLifeHL Platform 1
**Date:** February 5, 2026
**Status:** Production Ready

---

## Executive Summary

Platform 1 (League Builder) is now **100% feature-complete and production-ready**. This document provides everything needed for the team to maintain, deploy, and extend the platform.

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js (App Router) | 16.1.1 |
| UI Components | shadcn/ui + Tailwind CSS | Latest |
| State Management | React Server Components + Server Actions | - |
| Database | Supabase (PostgreSQL) | Latest |
| Authentication | Supabase Auth | Latest |
| Payments | Stripe (Connect + Elements) | Latest |
| Email | Resend | Latest |
| Hosting | Vercel | - |
| Monorepo | Turborepo + pnpm | - |

### Project Structure

```
HockeyLifeHL/
├── apps/
│   ├── league-builder/     # Platform 1 - Main application
│   ├── league-site/        # Platform 2 - Public league websites
│   └── player-companion/   # Platform 3 - Player mobile app (future)
├── packages/
│   ├── database/           # Shared database types
│   └── ui/                 # Shared UI components (future)
├── supabase/
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
├── scripts/                # Deployment scripts
├── docs/                   # Documentation
└── e2e/                    # End-to-end tests
```

### Key Directories in league-builder

```
apps/league-builder/src/
├── app/
│   ├── [locale]/           # Locale-based routing (en/fr)
│   │   ├── dashboard/      # Admin dashboard pages
│   │   ├── scorekeeper/    # Scorekeeper interface
│   │   └── (auth)/         # Authentication pages
│   ├── api/                # API routes
│   └── register/           # Player registration
├── components/
│   ├── ui/                 # Base UI components (shadcn)
│   ├── dashboard/          # Dashboard-specific components
│   ├── league-wizard/      # League creation wizard
│   ├── schedule-wizard/    # Schedule generation wizard
│   └── scorekeeper/        # Game scoring components
├── lib/
│   ├── actions/            # Server actions
│   ├── email/              # Email templates
│   ├── payments/           # Payment processing
│   ├── schedule/           # Schedule generation
│   ├── stripe/             # Stripe integration
│   └── supabase/           # Supabase clients
└── messages/               # i18n translations
```

---

## Features Overview

### For League Owners

| Feature | Status | Location |
|---------|--------|----------|
| League Creation Wizard | Complete | `/dashboard/leagues/new` |
| Team Management | Complete | `/dashboard/leagues/[id]` |
| Season Management | Complete | `/dashboard/leagues/[id]/seasons` |
| Schedule Generation | Complete | `/dashboard/seasons/[id]/schedule` |
| Payment Collection | Complete | `/dashboard/leagues/[id]/payments` |
| Subscription Billing | Complete | `/dashboard/settings/subscription` |
| Scorekeeper Assignment | Complete | Via game management |
| Draft System | Complete | `/dashboard/leagues/[id]/draft` |

### For Team Captains

| Feature | Status | Location |
|---------|--------|----------|
| Captain Dashboard | Complete | `/dashboard/captain/[teamId]` |
| Roster Management | Complete | Via captain dashboard |
| Join Request Approval | Complete | Via captain dashboard |
| Game Stat Verification | Complete | Via scorekeeper interface |

### For Players

| Feature | Status | Location |
|---------|--------|----------|
| Registration Wizard | Complete | `/register/[leagueSlug]` |
| Payment Processing | Complete | Via Stripe Elements |
| Team Selection | Complete | During registration |

### For Scorekeepers

| Feature | Status | Location |
|---------|--------|----------|
| Token Access | Complete | `/scorekeeper` |
| Live Game Scoring | Complete | `/scorekeeper/game/[gameId]` |
| Goal/Penalty Entry | Complete | Via scoring interface |

---

## Database Schema

### Core Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `organizations` | Multi-tenant root | Yes |
| `leagues` | League configuration | Yes |
| `seasons` | Season periods | Yes |
| `teams` | Team records | Yes |
| `roster_entries` | Player-team assignments | Yes |
| `games` | Game schedule | Yes |
| `game_events` | Goals, penalties, etc. | Yes |
| `player_payments` | Fee tracking | Yes |
| `registrations` | Player signups | Yes |

### Key Database Functions

| Function | Purpose |
|----------|---------|
| `save_schedule_games` | Atomic schedule saving with locking |
| `process_checkout_completed` | Atomic payment processing |
| `process_refund` | Atomic refund handling |
| `record_chargeback` | Chargeback tracking |
| `validate_scorekeeper_token` | Secure token validation |
| `calculate_standings` | League standings calculation |

---

## API Routes

### Stripe Webhooks

| Endpoint | Purpose |
|----------|---------|
| `/api/stripe/webhooks/subscriptions` | Organization subscriptions |
| `/api/webhooks/stripe/player-payments` | Player fee payments |
| `/api/stripe/webhooks/connect` | Stripe Connect events |

### Internal APIs

| Endpoint | Purpose |
|----------|---------|
| `/api/stripe/create-checkout-session` | Payment initiation |
| `/api/teams/[teamId]/roster` | Roster management |
| `/api/orchestrator/send-email` | Email dispatch |

---

## Security Measures

### Implemented Security

- **Row Level Security (RLS)** - All tables have RLS policies
- **Atomic Operations** - Payment operations use database transactions
- **Rate Limiting** - Scorekeeper token validation (5 attempts/min)
- **Crypto-secure Tokens** - Using `crypto.randomBytes`
- **Token Expiration** - 24-hour TTL on scorekeeper tokens
- **Webhook Verification** - Stripe signature validation
- **Advisory Locks** - Prevent concurrent schedule generation

### Security Monitoring

Run security check before each deployment:
```bash
# Via Supabase MCP
mcp__supabase__get_advisors(type: "security")
```

Current status: **0 CRITICAL issues**

---

## Testing

### Test Structure

```
e2e/
├── tests/
│   ├── auth.spec.ts              # Authentication tests
│   ├── league-wizard.spec.ts     # League creation
│   ├── captain.spec.ts           # Captain workflows
│   ├── subscription.spec.ts      # Billing tests
│   └── schedule-generation.spec.ts # Schedule tests
├── fixtures/
│   └── test-data.ts              # Test data generators
└── page-objects/
    └── *.po.ts                   # Page object models
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific suite
pnpm test captain.spec.ts

# Run with UI
pnpm test:ui
```

### Test Coverage

| Area | Scenarios |
|------|-----------|
| Authentication | 41 |
| Captain Workflows | 75 |
| Scorekeeper Admin | 50 |
| Subscription | 60 |
| Player Payments | 70 |
| Schedule Generation | 55 |
| **Total** | **351** |

---

## Deployment

### Scripts

```bash
# Staging deployment
./scripts/deploy-staging.sh

# Production deployment
./scripts/deploy-production.sh

# Emergency rollback
vercel rollback
```

### Environment Variables

See `docs/DEPLOYMENT_RUNBOOK.md` for complete list.

---

## Common Development Tasks

### Adding a New Feature

1. Create server action in `lib/actions/`
2. Add UI component in `components/`
3. Create page in `app/[locale]/dashboard/`
4. Add tests in `e2e/tests/`
5. Update TypeScript types if needed

### Adding a Database Migration

1. Create migration file: `supabase/migrations/YYYYMMDD_description.sql`
2. Test locally with Supabase CLI
3. Apply via Supabase MCP or dashboard
4. Regenerate types: `pnpm db:generate-types`

### Adding an Email Template

1. Add function to `lib/email/payment-emails.ts` (or create new file)
2. Follow existing template patterns
3. Test with Resend's email preview

### Debugging Payment Issues

1. Check Stripe Dashboard → Webhooks
2. Check Supabase logs for function errors
3. Review `payment_transactions` and `player_payment_audit_log` tables
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe/player-payments`

---

## Known Issues & Future Work

### Minor Technical Debt

1. **Duplicate Indexes** - 7 duplicate indexes could be cleaned up
2. **RLS Optimization** - 272 policies could use `(select auth.uid())` pattern
3. **Middleware Deprecation** - Next.js middleware should migrate to proxy

### Future Features (Platform 1)

- [ ] Player check-in system
- [ ] Substitute player management
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support
- [ ] Mobile-optimized scorekeeper

### Platform 2 & 3

- Platform 2 (League Sites) - Basic setup complete
- Platform 3 (Player Companion) - Not started

---

## Support & Contacts

### Documentation

| Document | Purpose |
|----------|---------|
| `DEPLOYMENT_RUNBOOK.md` | Deployment procedures |
| `FINAL_DEPLOYMENT_PLAN.md` | Complete deployment checklist |
| `PLATFORM1_COMPREHENSIVE_AUDIT.md` | Feature audit |
| `ALL_PROMISES_COMPLETE.md` | Session achievements |

### External Resources

- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Resend Docs](https://resend.com/docs)

---

## Appendix: Quick Reference Commands

```bash
# Development
pnpm dev                    # Start development server
pnpm build                  # Build for production
pnpm typecheck              # Type checking
pnpm lint                   # Lint code

# Database
pnpm db:generate-types      # Regenerate TypeScript types
pnpm db:push               # Push schema changes (dev only)

# Testing
pnpm test                   # Run all tests
pnpm test:ui               # Run with Playwright UI

# Deployment
./scripts/deploy-staging.sh    # Deploy to staging
./scripts/deploy-production.sh # Deploy to production
vercel rollback                # Rollback if needed
```

---

**Platform 1 is ready for production. Follow the deployment runbook for launch procedures.**
