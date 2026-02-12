# Multi-Tenant Branding Architecture

## Overview

The Beer League Hockey platform uses a multi-tenant architecture where:

1. **Platform Domain** (beerleaguehockey.ca) - Main platform with platform branding
2. **League Subdomains** (pilot.beerleaguehockey.ca) - League-specific sites with league branding
3. **Custom Domains** (customleague.com) - League-specific sites with league branding

## Branding Configurations

### Platform Branding (`platformConfig`)

Used on: `beerleaguehockey.ca`, `www.beerleaguehockey.ca`, `localhost:3000`

```typescript
{
  name: "Beer League Hockey",
  domain: "beerleaguehockey.ca",
  slogan: "Built for the leagues we actually play in.",
  logo: "/BLH-logo.png",
  fontLogo: "/BLH-text-logo.png",
  icon: "/BLH-icon.png",
  banner: "/BLH-banner.png",
  colors: {
    iceWhite: "#F7FAFC",
    rinkBlue: "#1F4FD8",
    goalRed: "#D72638",
    midnight: "#0B1220",
    slate: "#7B8794",
    frostGrey: "#E6EBF2",
  }
}
```

### League Branding (`currentLeague` or database-stored)

Used on: Subdomains and custom domains

Each league has its own:
- Name, logo, colors
- Features configuration
- Role labels
- Contact information

## How Branding is Determined

### 1. Domain Detection (Middleware)

`src/middleware.ts` checks the incoming request hostname:

```typescript
if (isPlatformDomain(hostname)) {
  // Use platform branding, no league context
} else if (isSubdomain(hostname)) {
  // Extract league from subdomain, use league branding
} else if (isCustomDomain(hostname)) {
  // Look up league by custom domain, use league branding
}
```

### 2. League Context API

`/api/league/context` returns:

```json
// Platform domain
{ "league": null, "isPlatform": true }

// League subdomain
{
  "league": {
    "id": "uuid",
    "name": "Pilot League",
    "slug": "pilot"
  },
  "isPlatform": false
}
```

### 3. Client-Side League Hook

`useActiveLeague()` hook determines league context:

```typescript
// Priority order:
1. URL params [league] (for /[league]/dashboard routes)
2. Subdomain/custom domain (via /api/league/context)
3. User selection (LeagueSelector dropdown)

// Platform domain behavior:
- If isPlatform: true → leagueId = null
- NO auto-selection of user's first league
- User must explicitly select a league via dropdown
```

## Dashboard Behavior

### On Platform Domain (beerleaguehockey.ca/dashboard)

**Expected:** Platform branding, no league-specific data

1. Header shows platform logo and branding
2. No league badge/indicator
3. Dashboard shows welcome screen prompting:
   - Browse leagues (/discover)
   - Create a league
   - Select league from dropdown in header

### On League Subdomain (pilot.beerleaguehockey.ca/dashboard)

**Expected:** League branding, league-specific data

1. Header shows league logo and branding
2. League badge shows "Managing: Pilot League"
3. Dashboard shows user's stats for that league
4. All navigation uses league context

### On Custom Domain (customleague.com/dashboard)

**Expected:** League branding, league-specific data

Same as subdomain behavior.

## Route Structure

```
Platform Routes (beerleaguehockey.ca):
├── /                      → Marketing homepage (platform branding)
├── /login                 → Login page (platform branding)
├── /register              → Signup page (platform branding)
├── /discover              → Browse leagues (platform branding)
├── /dashboard             → User dashboard (platform branding, no league)
└── /admin                 → Super admin (platform branding)

League Routes (subdomain or custom domain):
├── /                      → League homepage (league branding)
├── /dashboard             → User dashboard (league branding, league-specific data)
├── /standings             → League standings (league branding)
├── /schedule              → League schedule (league branding)
└── /[league]/settings     → League settings (league branding)
```

## The Problem That Was Fixed

### Before Fix

When visiting `beerleaguehockey.ca/dashboard`:
- ❌ Showed "Pilot League" branding
- ❌ Auto-selected user's first league
- ❌ Platform domain looked like a league instance

**Root Cause:** `useActiveLeague()` was auto-selecting the user's first league membership even on the platform domain.

### After Fix

When visiting `beerleaguehockey.ca/dashboard`:
- ✅ Shows platform branding
- ✅ No league auto-selection
- ✅ Prompts user to select a league or browse leagues
- ✅ Platform domain remains distinct from league instances

## Implementation Details

### Key Files

1. **`src/middleware.ts`** - Domain detection and routing
2. **`src/app/api/league/context/route.ts`** - League context API endpoint
3. **`src/hooks/use-league.ts`** - Client-side league context hook
4. **`src/lib/league-config.ts`** - Platform and league branding configs
5. **`src/components/layout/Header.tsx`** - Adaptive header component
6. **`src/components/layout/LeagueSelector.tsx`** - League switching dropdown

### League Context Flow

```
User visits URL
     ↓
Middleware checks domain
     ↓
Sets headers: x-league-hostname, x-league-subdomain (if applicable)
     ↓
Page renders, useActiveLeague() hook runs
     ↓
Hook calls /api/league/context
     ↓
API reads headers, looks up league in database
     ↓
Returns { league, isPlatform }
     ↓
Hook sets leagueId (or null if platform)
     ↓
Components render with appropriate branding
```

## Testing Branding

### Test Platform Domain

Visit: `http://localhost:3000/dashboard`

**Expected:**
- Header shows "Beer League Hockey" logo
- No league badge
- Welcome screen with "Select a league" message

### Test League Subdomain

Visit: `http://pilot.localhost:3000/dashboard`

**Expected:**
- Header shows league branding
- "Managing: Pilot League" badge visible
- Dashboard shows league-specific stats

### Test League Selection

1. Visit `http://localhost:3000/dashboard`
2. Click league dropdown in header
3. Select "Pilot League"
4. Dashboard reloads with league-specific data

## Future Enhancements

1. **Dynamic Branding Database**
   - Store league colors, logos in database
   - Real-time branding updates without code changes

2. **Theme Customization UI**
   - League admins can customize their branding
   - Live preview of changes

3. **White Label Support**
   - Complete custom domains with no platform branding
   - League-specific email templates

4. **Multi-League Dashboard**
   - Aggregate stats across all user's leagues
   - Quick-switch between league contexts

## Troubleshooting

### Dashboard shows wrong branding

1. Check console for `[useActiveLeague]` logs
2. Verify `/api/league/context` response
3. Confirm domain is correctly detected by middleware

### League selector not showing

1. User must have at least one league membership
2. Check `getUserLeagues()` returns data
3. Verify authentication is working

### Subdomain not detecting league

1. Check DNS/hosts file for subdomain
2. Verify league has `subdomain` field in database
3. Check middleware domain matching logic

## References

- [PRODUCTION_FIX_GUIDE.md](./PRODUCTION_FIX_GUIDE.md) - Environment setup
- [FREE_AGENT_IMPLEMENTATION_PLAN.md](./FREE_AGENT_IMPLEMENTATION_PLAN.md) - Multi-tenant architecture
