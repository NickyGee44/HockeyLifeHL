# Documentation Index

> All project documentation lives in `docs/`. For development instructions, see [CLAUDE.md](../CLAUDE.md).

---

## Architecture & Setup

| Document | Description |
|----------|-------------|
| [ARCHITECTURAL_DECISIONS](ARCHITECTURAL_DECISIONS.md) | Key architecture choices and rationale |
| [MONOREPO_SETUP](MONOREPO_SETUP.md) | Turbo monorepo configuration and workspace setup |
| [PROJECT_MASTER](PROJECT_MASTER.md) | Comprehensive project plan and status tracker |
| [GIT_WORKFLOW](GIT_WORKFLOW.md) | Branch strategy, worktrees, deployment flow |
| [TEAM_HANDOFF](TEAM_HANDOFF.md) | Onboarding guide for new team members |

## Design System & Branding

| Document | Description |
|----------|-------------|
| [BRAND-KIT](BRAND-KIT.md) | Full design system: colors (OKLCH), typography, spacing, tokens |
| [BHL-brand-kit](BHL-brand-kit.md) | BHL-specific brand assets and colors |
| [UI_UX_GUIDE](UI_UX_GUIDE.md) | UI/UX patterns, component guidelines |
| [TEMPLATE_SYSTEM](TEMPLATE_SYSTEM.md) | League site template architecture |
| [MULTI_TENANT_BRANDING](MULTI_TENANT_BRANDING.md) | Multi-tenant theme system with CSS variables |
| [BRANDING_SEPARATION](BRANDING_SEPARATION.md) | BLH vs HockeyLifeHL brand separation |

## Deployment & Infrastructure

| Document | Description |
|----------|-------------|
| [DEPLOYMENT_GUIDE](DEPLOYMENT_GUIDE.md) | Production deployment instructions |
| [DEPLOYMENT_RUNBOOK](DEPLOYMENT_RUNBOOK.md) | Operational runbook: rollback, monitoring, incidents |
| [PRODUCTION_SUBDOMAIN_SETUP](PRODUCTION_SUBDOMAIN_SETUP.md) | Custom subdomain configuration for leagues |
| [SUBDOMAIN_SETUP](SUBDOMAIN_SETUP.md) | DNS and subdomain routing setup |

## Features

| Document | Description |
|----------|-------------|
| [CAPTAIN_DASHBOARD_USER_GUIDE](CAPTAIN_DASHBOARD_USER_GUIDE.md) | End-user guide for captain features |
| [CAPTAIN_VERIFICATION_SYSTEM_DESIGN](CAPTAIN_VERIFICATION_SYSTEM_DESIGN.md) | Captain identity verification architecture |
| [DIVISION_MANAGEMENT](DIVISION_MANAGEMENT.md) | Division feature overview |
| [DIVISION_MANAGEMENT_ARCHITECTURE](DIVISION_MANAGEMENT_ARCHITECTURE.md) | Division system technical architecture |
| [DRAFT_ROOM_UX_AUDIT](DRAFT_ROOM_UX_AUDIT.md) | Comprehensive UX audit of draft room feature (34 issues identified) |
| [PHASE_1C_ADMIN_OPS_CONSOLE_SPEC](PHASE_1C_ADMIN_OPS_CONSOLE_SPEC.md) | Admin ops console specification (Phase 1C) |
| [MULTI_TENANT_EDGE_CASES](MULTI_TENANT_EDGE_CASES.md) | Multi-tenancy edge cases and solutions |

## Mobile App

| Document | Description |
|----------|-------------|
| [MOBILE-APP-PLAN](MOBILE-APP-PLAN.md) | Expo React Native app architecture and plan |
| [MOBILE-APP-PROGRESS](MOBILE-APP-PROGRESS.md) | Mobile app implementation progress tracker |

## Payments & Stripe

| Document | Description |
|----------|-------------|
| [PAYMENT_DASHBOARD_DEVELOPER_GUIDE](PAYMENT_DASHBOARD_DEVELOPER_GUIDE.md) | Payment system developer reference |
| [PAYMENT_DASHBOARD_USER_GUIDE](PAYMENT_DASHBOARD_USER_GUIDE.md) | Payment dashboard end-user guide |
| [STRIPE_CUSTOM_DOMAIN_SETUP](STRIPE_CUSTOM_DOMAIN_SETUP.md) | Stripe custom domain (pay.beerleaguehockey.ca) setup |
| [STRIPE_CLI_TESTING_GUIDE](STRIPE_CLI_TESTING_GUIDE.md) | Stripe webhook testing with CLI |
| [STRIPE_ELEMENTS_FLOW_DIAGRAM](STRIPE_ELEMENTS_FLOW_DIAGRAM.md) | Stripe Elements payment flow diagram |

## Scorekeeper

| Document | Description |
|----------|-------------|
| [SCOREKEEPER_ADMIN_GUIDE](SCOREKEEPER_ADMIN_GUIDE.md) | Admin guide for scorekeeper management |
| [SCOREKEEPER_MANUAL_TESTING_CHECKLIST](SCOREKEEPER_MANUAL_TESTING_CHECKLIST.md) | Manual QA checklist for scorekeeper features |
| [SCOREKEEPER_TEST_SCENARIOS](SCOREKEEPER_TEST_SCENARIOS.md) | Test scenarios for scorekeeper system |
| [OFFLINE_SYNC_TESTING_GUIDE](OFFLINE_SYNC_TESTING_GUIDE.md) | Offline-first sync testing procedures |

## Security & Compliance

| Document | Description |
|----------|-------------|
| [SECURITY_HARDENING_20260127](SECURITY_HARDENING_20260127.md) | Security audit findings and fixes (Jan 2026) |
| [ACCOUNT_DELETION_GDPR](ACCOUNT_DELETION_GDPR.md) | GDPR account deletion implementation |
| [RATE_LIMITING](RATE_LIMITING.md) | Rate limiting strategy and configuration |

## BMHL Integration

| Document | Description |
|----------|-------------|
| [BMHL_API_ARCHITECTURE](BMHL_API_ARCHITECTURE.md) | BMHL API architecture and design |
| [BMHL_API_IMPLEMENTATION_SUMMARY](BMHL_API_IMPLEMENTATION_SUMMARY.md) | BMHL API implementation details |
| [BMHL_API_TESTING](BMHL_API_TESTING.md) | BMHL API test coverage and procedures |
| [BMHL_GAP_ANALYSIS](BMHL_GAP_ANALYSIS.md) | Feature gap analysis for BMHL |
| [BMHL_UI_REQUIREMENTS](BMHL_UI_REQUIREMENTS.md) | BMHL UI/UX requirements |

## Database

| Document | Description |
|----------|-------------|
| [database/README](database/README.md) | Database schema, migrations, and operations guide |

## Work Logs

Session logs for multi-agent coordination live in `.claude/work-logs/`:
- [2026-11-02 Cleanup Sprint](2026-11-02-cleanup.md)

---

*Last updated: 2026-02-12*
