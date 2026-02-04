# Monorepo Setup - Two-Platform Architecture

## Overview

We've successfully restructured the codebase into a **Turborepo monorepo** to support the two-platform architecture described in `NEW_PLAN.md`.

---

## Structure

```
HockeyLifeHL/
├── apps/
│   └── league-builder/          # Platform 1: Admin Dashboard
│       ├── src/
│       │   ├── app/             # Next.js 15 App Router
│       │   ├── components/      # Platform 1 components
│       │   └── lib/             # Platform 1 utilities
│       ├── package.json
│       ├── next.config.ts
│       └── tsconfig.json
│
├── packages/
│   ├── database/                # Shared Supabase client & types
│   │   ├── src/
│   │   │   ├── client.ts       # Supabase client factory
│   │   │   ├── types.ts        # Database TypeScript types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                      # Shared UI components
│   │   ├── src/
│   │   │   ├── button.tsx      # Button component
│   │   │   ├── card.tsx        # Card component
│   │   │   ├── utils.ts        # cn() utility
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── auth/                    # Shared auth utilities
│       ├── src/
│       │   └── index.ts        # Auth functions
│       └── package.json
│
├── turbo.json                   # Turborepo configuration
├── pnpm-workspace.yaml          # PNPM workspace configuration
├── package.json                 # Root package.json with workspace config
└── NEW_PLAN.md                  # Architecture plan document
```

---

## What's Been Created

### ✅ 1. Turborepo Monorepo
- `turbo.json` - Turborepo configuration for build caching and task orchestration
- `pnpm-workspace.yaml` - PNPM workspace definition
- Root `package.json` updated with workspace configuration

### ✅ 2. Platform 1: League Builder (`apps/league-builder`)
**Purpose:** Admin dashboard for league owners to create and manage their hockey leagues

**Tech Stack:**
- Next.js 16.1.1 (App Router)
- React 19.2.3
- TypeScript
- Tailwind CSS 4
- Shadcn/ui components

**Features Planned:**
- League creation wizard
- Branding & settings management
- Team & player management
- Schedule builder
- Analytics dashboard
- Custom domain deployment
- Billing & subscriptions

**Status:** Scaffold complete with:
- Basic Next.js setup
- Root layout with globals.css
- Homepage placeholder
- Tailwind configuration
- TypeScript configuration

### ✅ 3. Shared Packages

#### `@hockey-life/database`
**Purpose:** Shared Supabase client and database types

**Exports:**
- `supabase` - Configured Supabase client
- `createClient` - Client factory function
- `Database` - TypeScript types (to be generated from Supabase schema)

**Status:** Basic structure in place, types need to be generated

#### `@hockey-life/ui`
**Purpose:** Shared UI components across platforms

**Components:**
- `Button` - Reusable button with variants
- `Card` - Card component family
- `cn()` - Tailwind class name utility

**Status:** Basic components created, more will be added

#### `@hockey-life/auth`
**Purpose:** Shared authentication utilities

**Exports:**
- `getCurrentUser()`
- `signIn()`
- `signOut()`
- `AuthUser` type
- `UserRole` type

**Status:** Placeholder structure, implementations pending

---

## Next Steps

### Immediate (To Complete Platform 1 MVP)

1. **Add Environment Variables**
   - Copy `.env.local` to `apps/league-builder/.env.local`
   - Configure Supabase URLs and keys

2. **Generate Database Types**
   - Run Supabase type generation
   - Update `packages/database/src/types.ts`

3. **Add Organizations Schema**
   - Create `organizations` table
   - Create `league_ownerships` table
   - Add `organization_id` to `leagues` table
   - Update RLS policies

4. **Build Owner Authentication**
   - Create login page at `apps/league-builder/src/app/(auth)/login`
   - Create signup page
   - Implement owner-specific auth flow
   - Add organization creation on signup

5. **Move Admin Pages**
   - Copy admin pages from `src/app/(dashboard)/admin/*`
   - Update imports to use workspace packages
   - Remove dependencies on league context
   - Update to owner/organization context

6. **Test Platform 1**
   - Run `pnpm dev:builder`
   - Test authentication flow
   - Test league creation
   - Verify admin functionality

### After Platform 1 MVP

7. **Create Platform 2: League Website**
   - Create `apps/league-website` scaffold
   - Move player/public pages
   - Implement player authentication
   - Add custom domain support

8. **Deploy Both Platforms**
   - Deploy Platform 1 to `admin.hockeylife.com`
   - Deploy Platform 2 template
   - Configure DNS and domains

9. **Migrate Existing Leagues**
   - Gradual migration per NEW_PLAN.md
   - Run both systems in parallel
   - Archive old monolithic app

---

## Commands

### Development
```bash
# Run all apps in dev mode
pnpm dev

# Run Platform 1 only
pnpm dev:builder

# Run Platform 2 only (when created)
pnpm dev:website
```

### Build
```bash
# Build all apps
pnpm build

# Build specific app
turbo build --filter=@hockey-life/league-builder
```

### Type Checking
```bash
# Type check all packages
pnpm type-check
```

### Clean
```bash
# Clean all build artifacts and node_modules
pnpm clean
```

---

## Benefits of This Architecture

### 1. **True Separation of Concerns**
- League owners never see player interface
- Players never see admin dashboard
- Each platform optimized for its users

### 2. **Independent Deployment**
- Deploy admin updates without touching player sites
- Deploy player site updates independently
- Rollback issues on one platform without affecting the other

### 3. **White-Label Ready**
- Platform 2 can be fully branded per league
- No HockeyLife branding visible to players
- Custom domain support built in

### 4. **Shared Code Benefits**
- UI components reused across platforms
- Database types consistent
- Auth utilities shared
- Reduced code duplication

### 5. **Monorepo Advantages**
- Single repo for all platforms
- Atomic commits across platforms
- Shared tooling and dependencies
- Turborepo caching for faster builds

---

## Migration Strategy

According to NEW_PLAN.md, we're doing a **full cutover** approach:

1. Build Platform 1 (League Builder) completely
2. Build Platform 2 (League Website) completely
3. Test both platforms thoroughly
4. Deploy both platforms
5. Migrate existing leagues
6. Archive old monolithic app

This is more aggressive than parallel running but results in cleaner architecture.

---

## Status

- [x] Turborepo setup complete
- [x] Platform 1 scaffold created
- [x] Shared packages created
- [x] Dependencies installed
- [ ] Database schema updated
- [ ] Owner authentication built
- [ ] Admin pages migrated
- [ ] Platform 2 scaffold created
- [ ] Player pages migrated
- [ ] End-to-end testing
- [ ] Production deployment

---

**Last Updated:** 2026-01-30
**Status:** In Progress - Foundation Complete
**Next:** Add organizations schema and owner authentication
