# 🏒 Platform 1: League Builder - README

**Application:** HockeyLifeHL League Builder (Admin Platform)
**Framework:** Next.js 15+ with App Router
**Database:** Supabase (PostgreSQL + Realtime)
**Styling:** Tailwind CSS with custom brand colors
**Internationalization:** next-intl (English & French)

---

## 🎯 What Is Platform 1?

Platform 1 is the **admin/management platform** for league commissioners and organizers. It provides complete tools to:

- Create and manage hockey leagues
- Set up teams and rosters
- Generate schedules
- Manage player registrations
- Run live drafts
- Score games in real-time
- Track standings and stats
- Collect payments via Stripe Connect
- Customize branding and domains

**User Roles:**
- **League Owner** - Full admin access to organization and leagues
- **Team Captain** - Manages team roster and verifies game stats
- **Scorekeeper** - Enters live game scores and events
- **Platform Admin** - System administration and support

---

## 🗺️ Routing Structure

### Primary Routes (All under `/[locale]/`)

```
/en/ or /fr/                    Marketing homepage
├── (auth)/
│   ├── login                   Sign in
│   ├── signup                  Create account
│   ├── forgot-password         Request password reset
│   ├── reset-password          Reset password with token
│   ├── account-locked          Temporary lockout message
│   └── account-recovery        Contact support
│
├── dashboard/                  League Owner Dashboard
│   ├── /                       Dashboard home
│   ├── analytics/              Analytics dashboard
│   ├── leagues/
│   │   ├── /                   Leagues list
│   │   ├── new                 Create league (7-step wizard)
│   │   └── [id]/
│   │       ├── /               League detail
│   │       ├── billing         Stripe Connect setup
│   │       ├── games/          Game management
│   │       ├── registrations/  Player approval
│   │       ├── seasons/        Season management
│   │       └── teams/          Team creation
│   ├── seasons/[seasonId]/
│   │   ├── schedule            Schedule generation
│   │   └── standings           Live standings
│   ├── teams/
│   │   └── [teamId]/
│   │       ├── /               Team dashboard (roster, schedule, stats)
│   │       └── settings        Team settings
│   └── settings/               Organization Settings
│       ├── /                   Profile
│       ├── members             Team member management
│       ├── domains             Custom domain setup
│       ├── subscription        Plan management
│       ├── billing             Payment methods & invoices
│       ├── branding            Colors, logos, visual identity
│       ├── privacy             GDPR compliance
│       └── notifications       Email preferences
│
├── scorekeeper/                Scorekeeper Interface
│   ├── /                       Token entry
│   └── game/[gameId]           Live game scoring
│
└── verify/[token]              Email verification
```

### Public Routes (No locale prefix)

```
/                               Root → redirects to /en
/privacy                        Privacy policy
/terms                          Terms of service
/register/[leagueSlug]          Player registration (7-step wizard)
/register/[leagueSlug]/success  Registration confirmation
/unsubscribe                    Email unsubscribe
```

### API Routes

```
/api/
├── teams/[teamId]/
│   ├── roster                  Roster CRUD
│   └── staff                   Staff CRUD
├── leagues/[leagueId]/
│   └── players/search          Player search
├── stripe/webhooks/
│   ├── connect                 Stripe Connect events
│   └── subscriptions           Platform subscription events
├── webhooks/stripe/
│   └── player-payments         Player payment events
└── orchestrator/send-email     Email queue processing
```

---

## 🏗️ Component Organization

```
/apps/league-builder/src/components/
├── dashboard/                  Dashboard-specific components
│   ├── leagues/               League management UIs
│   ├── seasons/               Season/schedule UIs
│   ├── teams/                 Team management UIs
│   ├── settings/              Settings forms and tables
│   ├── settings-nav.tsx       Settings sidebar navigation
│   └── ...analytics components
│
├── auth/                       Auth forms and components
├── draft-room/                 Real-time draft interface
├── games/                      Game management UIs
├── league-wizard/              7-step league creation wizard
├── notifications/              Notification management
├── payments/                   Payment UIs (incomplete)
├── player-registration/        7-step registration wizard
├── schedule-wizard/            Schedule generation wizard
├── scorekeeper/                Live game scoring interface
├── standings/                  Standings display
├── subscription/               Subscription management UIs
├── teams/                      Team components
└── ui/                         Base UI components (shadcn/ui)
```

---

## 🔑 Key Features

### For League Owners
- ✅ Organization and league management
- ✅ 7-step league creation wizard with auto-save
- ✅ Team and roster management
- ✅ Player registration approval workflow
- ✅ Real-time draft system with chat
- ✅ Game management (reschedule, cancel, postpone)
- ⚠️ Schedule generation (needs DB functions)
- ⚠️ Subscription upgrades (needs UI)
- ⚠️ Player fee collection (needs Stripe Elements)
- ✅ Analytics and reporting
- ✅ Custom branding and domains
- ✅ Privacy and GDPR compliance

### For Team Captains
- ✅ View team roster
- ✅ Verify game stats (post-game)
- ✅ Confirm roster for draft
- ⚠️ Approve player join requests (no UI)
- 🔴 Manage team (blocked by permissions)
- 🔴 Send check-in requests (not implemented)
- 🔴 Invite substitutes (not implemented)

### For Scorekeepers
- ✅ Token-based game access
- ✅ Live score entry interface
- ✅ Event tracking (goals, penalties, saves)
- ✅ Undo functionality
- ✅ Game summary and submission
- ✅ Offline support structure

### For Players
- ✅ Self-registration (7-step wizard)
- ✅ Photo upload and waiver signing
- ⚠️ Payment processing (needs Stripe Elements)
- ✅ Registration status tracking
- ⚠️ Check-in system (not implemented)
- Public schedule/standings (in Platform 2)

---

## 🔒 Security Features

- ✅ Row Level Security (375+ policies across 48 tables)
- ✅ Tenant isolation (league-based)
- ✅ Audit logging (all changes tracked)
- ✅ Account lockout (5 failed attempts = 15min)
- ✅ Webhook signature verification
- ✅ GDPR compliance (data export, deletion)
- ✅ Consent management
- ✅ PCI compliance (Stripe handles cards)

---

## 🧪 Testing

### E2E Tests
**Framework:** Playwright
**Coverage:** 41 tests
**Pass Rate:** 100%
**Browsers:** Chromium, Firefox, Webkit, Mobile Chrome

**Test Suites:**
- Authentication flows
- League creation wizard
- Dashboard navigation
- Subscription management
- Payment flows (mocked)

**Run Tests:**
```bash
cd e2e
pnpm test                    # All browsers
pnpm test:chromium          # Chromium only
pnpm test:firefox           # Firefox only
pnpm verify-browsers        # Verify browser setup
```

---

## 🚀 Development

### Prerequisites
```bash
Node.js 20+
pnpm 9+
Supabase CLI
Stripe CLI (for webhook testing)
```

### Setup
```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Add Supabase and Stripe keys

# Run development server
cd apps/league-builder
pnpm dev

# Open http://localhost:3000/en
```

### Build
```bash
cd apps/league-builder
pnpm build          # Production build
pnpm start          # Run production server
```

---

## 📚 Key Documentation

**Architecture & Planning:**
- `PLATFORM1_COMPREHENSIVE_AUDIT.md` - Complete feature audit
- `MONOREPO_SETUP.md` - Monorepo structure
- `CLEANUP_SUCCESS_FINAL.md` - Routing cleanup results

**Security & Compliance:**
- `RLS_SECURITY_FIXES_2026-02-04.md` - Security hardening
- `PRIVACY_COMPLIANCE_IMPLEMENTATION.md` - GDPR compliance
- `MIGRATION_BREAKING_CHANGES.md` - API migrations

**Testing:**
- `e2e/README.md` - E2E testing guide
- `e2e/QUICK_START.md` - Quick reference
- `TEST_FIX_SUMMARY.md` - Test improvements

**Deployment:**
- `DEPLOYMENT_READY_2026-02-04.md` - Deployment checklist
- `PLATFORM1_NEXT_STEPS.md` - Feature roadmap

---

## 🎯 Current Status

**Version:** 1.0.0 (Beta)
**Status:** ✅ Core features production-ready
**Last Cleanup:** February 4, 2026
**Last Security Audit:** February 4, 2026

**Production Ready:**
- Core league management
- Scorekeeper system
- Draft system
- Game management

**In Development:**
- Captain access system
- Payment UI integration
- Schedule generation functions
- Player check-in system

---

## 👥 Contributing

**Branch Strategy:**
- `main` - Production-ready code
- `cleanup/platform1-routing-consolidation` - Recent cleanup (ready to merge)
- Feature branches for new development

**Coding Standards:**
- TypeScript strict mode
- ESLint + Prettier
- Tailwind CSS for styling
- next-intl for i18n
- Supabase for backend

---

## 📞 Support

**Issues:** GitHub Issues
**Discussions:** GitHub Discussions
**Security:** security@hockeylifehl.com

---

**Platform 1 is ready for the next phase of development!** 🚀
