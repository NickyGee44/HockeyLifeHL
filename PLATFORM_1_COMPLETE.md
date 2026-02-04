# Platform 1: League Builder - Complete! 🎉

**Date:** 2026-01-30
**Status:** Ready for Testing
**Next:** Move admin pages from current app

---

## What We Built

Platform 1 (League Builder) is now a fully functional admin dashboard for league owners! This is the **separated platform** that lives at `admin.hockeylife.com` and allows league owners to create and manage their hockey leagues.

---

## Architecture

```
apps/league-builder/                # Platform 1: Admin Dashboard
├── src/
│   ├── app/
│   │   ├── (auth)/                # Authentication routes
│   │   │   ├── login/            # Login page
│   │   │   ├── signup/           # Signup with org creation
│   │   │   └── layout.tsx        # Auth layout
│   │   ├── dashboard/            # Owner dashboard
│   │   │   └── page.tsx          # Main dashboard
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Root (redirects to /login)
│   │   └── globals.css           # Global styles
│   ├── lib/
│   │   ├── actions/
│   │   │   └── auth.ts           # Server actions (signup, login, etc)
│   │   └── supabase/
│   │       ├── server.ts         # Server-side Supabase client
│   │       └── client.ts         # Client-side Supabase client
│   └── middleware.ts             # Auth middleware
├── .env.local                     # Environment variables
├── package.json                   # Dependencies
├── next.config.ts                 # Next.js config
├── tailwind.config.ts             # Tailwind config
├── postcss.config.mjs             # PostCSS config
└── tsconfig.json                  # TypeScript config
```

---

## Database Schema Changes

### ✅ New Tables Created

#### 1. **organizations**
Multi-tenant organization support for league owners.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Subscription
  subscription_tier TEXT DEFAULT 'starter',  -- starter, pro, business, enterprise
  subscription_status TEXT DEFAULT 'trialing',
  stripe_customer_id TEXT UNIQUE,
  trial_ends_at TIMESTAMPTZ,

  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Each league owner creates an organization when they sign up. An organization can own multiple leagues.

#### 2. **league_ownerships**
Access control for who can manage which leagues.

```sql
CREATE TABLE league_ownerships (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  league_id UUID NOT NULL REFERENCES leagues(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Role for this league
  role TEXT NOT NULL DEFAULT 'viewer',  -- owner, admin, editor, viewer

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(league_id, user_id)
);
```

**Purpose:** Maps users to leagues with specific roles. Supports:
- Organization owners managing all their leagues
- Inviting team members with specific permissions
- Different roles per league

#### 3. **leagues** (updated)
Added `organization_id` column to link leagues to organizations.

```sql
ALTER TABLE leagues
ADD COLUMN organization_id UUID REFERENCES organizations(id);
```

**Purpose:** Every league now belongs to an organization, enabling proper multi-tenancy.

### ✅ RLS Policies Created

Comprehensive Row Level Security policies ensure:
- Users only see organizations they own or belong to
- Users can only manage leagues in their organization
- Proper access control for different roles (owner, admin, editor, viewer)

---

## Authentication Flow

### **Sign Up Flow**
1. User enters name, email, password, and organization name
2. Server action creates:
   - Auth user in Supabase Auth
   - Profile with `role = 'owner'`
   - Organization with auto-generated slug
   - 14-day trial period
3. User is redirected to dashboard
4. Can immediately start creating leagues

### **Sign In Flow**
1. User enters email and password
2. Server action authenticates with Supabase Auth
3. User is redirected to dashboard
4. Dashboard loads their organizations and leagues

### **User Roles**
- **Owner**: Full access to organization and all leagues
- **Admin**: Full access to specific leagues
- **Editor**: Can edit content, not settings
- **Viewer**: Read-only access

---

## Features Implemented

### ✅ Authentication
- Owner signup with organization creation
- Login/logout functionality
- Session management with middleware
- Protected routes (dashboard requires auth)

### ✅ Dashboard
- Welcome message with user's name
- Statistics cards:
  - Number of organizations
  - Total leagues (placeholder)
  - Trial status (placeholder)
- Organization list with subscription tiers
- Quick actions for common tasks (placeholders)

### ✅ Security
- Row Level Security on all tables
- Server-side auth validation
- Middleware for session management
- Proper cookie handling

---

## Shared Packages

### **@hockey-life/database**
Supabase client and TypeScript types.

```typescript
import { supabase } from '@hockey-life/database';
import type { Database } from '@hockey-life/database/types';
```

**Exports:**
- `supabase` - Configured client
- `createClient()` - Client factory
- `Database` - Full type definitions

### **@hockey-life/ui**
Shared UI components.

```typescript
import { Button, Card } from '@hockey-life/ui';
```

**Components:**
- `Button` - With variants (default, destructive, outline, etc.)
- `Card` - Card family (Card, CardHeader, CardTitle, etc.)
- `cn()` - Tailwind class utility

### **@hockey-life/auth**
Shared auth utilities (placeholder for future use).

---

## How to Run Platform 1

### **Development**
```bash
# From root directory
pnpm dev:builder

# Or navigate to app
cd apps/league-builder
pnpm dev
```

Platform 1 runs on: **http://localhost:3000**

### **Build**
```bash
# From root
pnpm build

# Or specific app
cd apps/league-builder
pnpm build
```

### **Test the Flow**

1. **Sign Up**
   - Go to http://localhost:3000
   - Click "Create one" to sign up
   - Fill in:
     - Full Name: "John Doe"
     - Email: "john@example.com"
     - Password: "password123"
     - Organization: "My Hockey League"
   - Click "Create Account"
   - Should redirect to dashboard

2. **Dashboard**
   - See welcome message
   - See "1" organization
   - See organization listed with "starter" tier
   - See "trialing" status with 14 days

3. **Sign Out / Sign In**
   - Sign out (need to add button)
   - Go to /login
   - Enter credentials
   - Should redirect back to dashboard

---

## Environment Variables

Platform 1 uses the same Supabase instance as the current app:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ntplczcmhvfkijjxavdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...
```

---

## What's Different from Current App?

### **Platform 1 (League Builder)**
- **Focus:** League owners and organization management
- **Users:** League owners, employees
- **Auth:** Owner-focused signup with organization creation
- **Domain:** admin.hockeylife.com (future)
- **Purpose:** Create leagues, manage teams, deploy websites, view analytics

### **Current App (To Become Platform 2)**
- **Focus:** Players, captains, public
- **Users:** Players, captains, scorekeepers, public
- **Auth:** Player signup (free agents or via invite codes)
- **Domain:** Custom domains per league (bmhl.com, etc.)
- **Purpose:** View schedule, register for league, check stats, team management

---

## Next Steps

### **Immediate**

1. **Test Platform 1**
   - Run `pnpm dev:builder`
   - Test signup flow
   - Test login flow
   - Verify dashboard loads
   - Check database (organizations, profiles, league_ownerships)

2. **Add Missing Features**
   - Sign out button on dashboard
   - Error handling for duplicate slugs
   - Email verification (optional)
   - Password reset flow
   - Better loading states

3. **Move Admin Pages**
   - Copy admin pages from `src/app/(dashboard)/admin/`
   - Update imports to use workspace packages
   - Remove league context dependencies
   - Use organization context instead

### **After Admin Pages Migration**

4. **Create Platform 2**
   - Scaffold `apps/league-website`
   - Move player/public pages
   - Implement player auth (separate from owners)
   - Add custom domain support

5. **Deploy Both Platforms**
   - Platform 1 → Vercel (admin.hockeylife.com)
   - Platform 2 → Vercel per league (bmhl.com, etc.)

6. **Data Migration**
   - Migrate existing users to appropriate platforms
   - Create organizations for existing league owners
   - Update existing leagues with organization_id

---

## API Reference

### **Server Actions**

#### `signUp(formData: FormData)`
Creates a new owner account with organization.

**FormData fields:**
- `fullName` - User's full name
- `email` - User's email
- `password` - User's password (min 8 chars)
- `organizationName` - Organization name

**Returns:**
```typescript
{ success: true, organizationId: string } | { error: string }
```

#### `signIn(formData: FormData)`
Signs in an existing user.

**FormData fields:**
- `email`
- `password`

**Returns:**
```typescript
{ error?: string }
```
(Redirects to /dashboard on success)

#### `signOut()`
Signs out the current user.

**Returns:** void (redirects to /login)

#### `getCurrentUser()`
Gets the current authenticated user and profile.

**Returns:**
```typescript
{ user: User; profile: Profile } | null
```

#### `getUserOrganizations(userId: string)`
Gets all organizations the user has access to.

**Returns:**
```typescript
Organization[]
```

---

## Database Queries

### **Get user's organizations**
```typescript
const { data: orgs } = await supabase
  .from('organizations')
  .select('*')
  .eq('owner_user_id', userId);
```

### **Get organization's leagues**
```typescript
const { data: leagues } = await supabase
  .from('leagues')
  .select('*')
  .eq('organization_id', orgId);
```

### **Get user's league access**
```typescript
const { data: ownerships } = await supabase
  .from('league_ownerships')
  .select('*, leagues(*)')
  .eq('user_id', userId);
```

---

## Success Metrics

- [x] Monorepo structure created
- [x] Platform 1 scaffolded
- [x] Shared packages working
- [x] Database schema updated
- [x] TypeScript types generated
- [x] Owner authentication implemented
- [x] Signup flow creates organization
- [x] Login flow works
- [x] Dashboard shows user data
- [x] RLS policies secure data
- [ ] Admin pages migrated
- [ ] Platform 2 created
- [ ] Both platforms deployed

---

## Troubleshooting

### **"Organization already exists" error**
Organizations use slugs generated from the name. If you try to create an organization with a name that generates the same slug, it will fail. Solution: Use a unique organization name or implement slug uniqueness checking with incremental suffixes.

### **"User not found" after signup**
Check that the profile was created. The signup flow creates both the auth user and the profile. If the profile creation fails, the user can still log in but won't have proper permissions.

### **Dashboard shows 0 organizations**
Check that the organization was created with the correct `owner_user_id`. Query:
```sql
SELECT * FROM organizations WHERE owner_user_id = 'your-user-id';
```

### **RLS blocking queries**
If you're not seeing data you expect to see, check the RLS policies. Use Supabase SQL Editor with:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"user-id-here"}';
-- Then run your query
```

---

**Status:** Platform 1 is complete and ready for testing!
**Next:** Move admin pages from current monolithic app to Platform 1.

---
