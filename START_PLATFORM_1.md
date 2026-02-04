# How to Start Platform 1 (League Builder)

## Quick Start

### Option 1: From Root Directory
```bash
cd D:\B3\dev\HockeyLeague\HockeyLifeHL
pnpm dev:builder
```

### Option 2: From Platform 1 Directory
```bash
cd D:\B3\dev\HockeyLeague\HockeyLifeHL\apps\league-builder
pnpm dev
```

### Option 3: Direct Next.js (if pnpm issues)
```bash
cd D:\B3\dev\HockeyLeague\HockeyLifeHL\apps\league-builder
npx next dev --port 3000
```

---

## What to Expect

When the server starts, you should see:
```
▲ Next.js 16.1.1
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 3.2s
```

---

## Test the Application

### 1. Open Browser
Navigate to: **http://localhost:3000**

### 2. You Should See
- Clean login page
- "HockeyLife" heading
- "League Builder Platform" subtitle
- Email and password fields
- "Create one" link for signup

### 3. Create an Account
Click "Create one" and fill in:
- **Full Name:** Test Owner
- **Email:** owner@test.com
- **Password:** testpass123
- **Organization Name:** My Test Hockey Org

Click "Create Account"

### 4. View Dashboard
After signup, you should be redirected to `/dashboard` and see:
- "Welcome back, Test Owner!" message
- Statistics cards showing:
  - Organizations: 1
  - Leagues: 0
  - Trial Status: 14 days
- Your organization listed with subscription tier

---

## Verify in Database

Check Supabase to confirm data was created:

### 1. Check User Profile
```sql
SELECT * FROM profiles
WHERE email = 'owner@test.com';
```

Should show `role = 'owner'`

### 2. Check Organization
```sql
SELECT * FROM organizations
WHERE slug = 'my-test-hockey-org';
```

Should show:
- `subscription_tier = 'starter'`
- `subscription_status = 'trialing'`
- `trial_ends_at` = 14 days from now

### 3. Check RLS Working
Try querying with a different user_id to verify they can't see your organization.

---

## Troubleshooting

### "Port 3000 already in use"
Kill existing processes:
```bash
# Windows
taskkill /F /IM node.exe

# Or use different port
pnpm dev -- --port 3001
```

### "Cannot find module '@hockey-life/database'"
Install dependencies:
```bash
cd D:\B3\dev\HockeyLeague\HockeyLifeHL
pnpm install
```

### "Missing Supabase environment variables"
Check `.env.local` exists in `apps/league-builder/`:
```bash
cd apps/league-builder
ls -la .env.local
```

Should contain:
```
NEXT_PUBLIC_SUPABASE_URL=https://ntplczcmhvfkijjxavdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### "Organization already exists" error
The slug is generated from the organization name. Use a different name or check existing organizations:
```sql
SELECT * FROM organizations;
```

### Page shows old app (BLH logos, etc)
Make sure you're in the correct directory:
```bash
pwd
# Should show: /d/B3/dev/HockeyLeague/HockeyLifeHL/apps/league-builder

ls -la src/app/page.tsx
# Should show: import { redirect } from 'next/navigation';
```

If you see the old app, you're running the wrong directory.

---

## Features to Test

### ✅ Authentication
- [ ] Sign up creates organization
- [ ] Sign up creates profile with role=owner
- [ ] Sign up sets 14-day trial
- [ ] Login redirects to dashboard
- [ ] Protected routes require auth
- [ ] Logout works (need to add button)

### ✅ Dashboard
- [ ] Shows welcome message with name
- [ ] Shows organization count
- [ ] Lists organizations with subscription tier
- [ ] Shows trial status
- [ ] Quick actions visible (placeholders)

### ✅ Security
- [ ] Can't access dashboard without login
- [ ] RLS prevents seeing other orgs
- [ ] Session persists on refresh
- [ ] Middleware validates auth

---

## Architecture Review

### File Structure
```
apps/league-builder/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx      ← Login form
│   │   │   ├── signup/page.tsx     ← Signup with org
│   │   │   └── layout.tsx          ← Auth layout
│   │   ├── dashboard/
│   │   │   └── page.tsx            ← Owner dashboard
│   │   ├── layout.tsx              ← Root layout
│   │   ├── page.tsx                ← Redirects to /login
│   │   └── globals.css
│   ├── lib/
│   │   ├── actions/
│   │   │   └── auth.ts             ← signUp, signIn, etc
│   │   └── supabase/
│   │       ├── server.ts           ← Server Supabase client
│   │       └── client.ts           ← Browser Supabase client
│   └── middleware.ts               ← Auth middleware
├── .env.local                      ← Environment variables
└── package.json
```

### Database Tables
- **organizations** - League owner companies
- **league_ownerships** - User access to leagues
- **leagues** - Updated with organization_id
- **profiles** - User profiles (role=owner for Platform 1)

### Shared Packages
- **@hockey-life/database** - Supabase client & types
- **@hockey-life/ui** - Button, Card, etc
- **@hockey-life/auth** - Auth utilities

---

## What's Different from Old App?

| Aspect | Old Monolithic App | Platform 1 (New) |
|--------|-------------------|------------------|
| **Users** | Mixed (owners + players) | Owners only |
| **Signup** | Creates player profile | Creates owner + organization |
| **Auth Context** | League-based | Organization-based |
| **Domain** | Single domain | admin.hockeylife.com (future) |
| **Purpose** | Everything | Admin dashboard only |

---

## Next Steps After Testing

Once you've confirmed Platform 1 works:

1. **Move Admin Pages**
   - Copy pages from `src/app/(dashboard)/admin/`
   - Update to use organization context
   - Remove league-specific dependencies

2. **Add Features**
   - League creation wizard
   - Team management
   - Analytics dashboard
   - Billing integration

3. **Create Platform 2**
   - Scaffold `apps/league-website`
   - Move player/public pages
   - Implement player auth
   - Add custom domain support

---

## Questions?

- **MONOREPO_SETUP.md** - Architecture overview
- **PLATFORM_1_COMPLETE.md** - Detailed guide
- **PROGRESS_SUMMARY.md** - What's been done
- **NEW_PLAN.md** - Original vision

---

**Ready to test!** 🚀
