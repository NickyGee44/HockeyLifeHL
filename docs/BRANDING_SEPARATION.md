# Branding Separation: BLH vs HockeyLifeHL

## Overview

The application now has complete branding separation between:

1. **Beer League Hockey (BLH)** - The main platform
2. **HockeyLifeHL** - The first client/demo league

## Architecture

```
beerleaguehockey.ca (Main Platform)
├── BLH Branding (platformConfig)
├── Marketing pages
├── Admin panel
├── Dashboard
└── /pilot (Demo showcase of HockeyLifeHL)

pilot.beerleaguehockey.ca (League Subdomain)
├── HockeyLifeHL Branding (database)
├── League home page
├── Schedule, Standings, Stats, Teams
├── League-specific header & footer
└── Complete independent website
```

## Branding Sources

### Main Platform (BLH)
**Config:** `src/lib/league-config.ts` → `platformConfig`

```typescript
export const platformConfig = {
  name: "Beer League Hockey",
  domain: "beerleaguehockey.ca",
  slogan: "Built for the leagues we actually play in.",
  logo: "/BLH-logo.png",
  icon: "/BLH-icon.png",
  colors: {
    rinkBlue: "#1F4FD8",
    goalRed: "#D72638",
    midnight: "#0B1220",
  }
}
```

**Components:**
- Header: `src/components/layout/Header.tsx`
- Footer: `src/components/layout/Footer.tsx`
- Theme Manager: `src/components/layout/ThemeColorManager.tsx`

### League Instance (HockeyLifeHL)
**Config:** Database (`leagues` table)

```sql
name: 'HockeyLifeHL'
subdomain: 'pilot'
primary_color: '#E31837'  -- Canada Red
secondary_color: '#0066CC' -- Blue
accent_color: '#FFD700'    -- Gold
tagline: 'Where Beer League Legends Are Made'
```

**Components:**
- Header: `src/components/layout/LeagueHeader.tsx`
- Footer: `src/components/layout/LeagueFooter.tsx`
- Theme Provider: `src/components/providers/LeagueThemeProvider.tsx`
- Layout: `src/app/league/layout.tsx`

### Demo/Showcase (HockeyLifeHL)
**Config:** `src/lib/league-config.ts` → `currentLeague`

```typescript
export const currentLeague = {
  name: "HockeyLifeHL",
  shortName: "HLHL",
  slogan: "For Fun, For Beers, For Glory",
  logo: "/logo.png",
  colors: {
    primary: "#E31837",
    secondary: "#0066CC",
    accent: "#FFD700",
  },
}
```

**Component:** `src/components/layout/LandingPage.tsx` (used by `/pilot` page)

## Changed Files (Dark Mode + Branding Fix)

### 1. Dark Mode Implementation
- ✅ `src/components/ui/theme-toggle.tsx` (NEW)
- ✅ `src/app/layout.tsx` (Added ThemeProvider)
- ✅ `src/components/layout/Header.tsx` (Added ThemeToggle)

### 2. BLH Branding Restoration
- ✅ `src/components/layout/Header.tsx` (Changed to platformConfig)
- ✅ `src/components/layout/Footer.tsx` (Changed to platformConfig)
- ✅ `src/components/layout/ThemeColorManager.tsx` (Changed to platformConfig)

### 3. League Instance Setup
- ✅ `src/components/layout/LeagueHeader.tsx` (NEW - uses database branding)
- ✅ `src/components/layout/LeagueFooter.tsx` (NEW - uses database branding)
- ✅ `src/app/league/layout.tsx` (Added LeagueHeader and LeagueFooter)

### 4. Documentation
- ✅ `docs/SUBDOMAIN_SETUP.md` (NEW)
- ✅ `docs/BRANDING_SEPARATION.md` (THIS FILE)

## How It Works

### Platform Pages (/)
1. User visits `localhost:3000` or `beerleaguehockey.ca`
2. Middleware: No subdomain detected → Platform mode
3. Layout: Uses `src/app/layout.tsx` (root layout)
4. Header: `<Header />` uses `platformConfig` (BLH)
5. Footer: `<Footer />` uses `platformConfig` (BLH)
6. Colors: BLH blue (#1F4FD8) and red (#D72638)

### League Pages (/league/*)
1. User visits `pilot.localhost:3000` or `pilot.beerleaguehockey.ca`
2. Middleware: Detects subdomain `pilot`
   - Sets headers: `x-league-subdomain: pilot`
   - Rewrites to `/league/*` routes
3. Layout: `src/app/league/layout.tsx`
   - Calls `getLeagueFromHostname()` → Fetches from database
   - Wraps in `<LeagueThemeProvider league={league}>`
4. Header: `<LeagueHeader league={league} />` uses database branding
5. Footer: `<LeagueFooter league={league} />` uses database branding
6. Colors: HockeyLifeHL red (#E31837), blue (#0066CC), gold (#FFD700)

### Demo Page (/pilot)
1. User visits `localhost:3000/pilot` or `beerleaguehockey.ca/pilot`
2. Route: `src/app/pilot/page.tsx`
3. Component: `<LandingPage />` uses `currentLeague` config
4. Purpose: Showcase HockeyLifeHL to attract signups
5. Links to: `pilot.beerleaguehockey.ca` (full league site)

## Visual Differences

### BLH Platform
- **Logo:** BLH icon (shield-style)
- **Name:** "Beer League Hockey"
- **Colors:** Blue (#1F4FD8) and red (#D72638)
- **Slogan:** "Built for the leagues we actually play in."
- **Header:** Platform navigation (Dashboard, Admin, Captain)
- **Footer:** Platform branding and links

### HockeyLifeHL League
- **Logo:** HockeyLife logo (hockey player)
- **Name:** "HockeyLifeHL"
- **Colors:** Canada red (#E31837), blue (#0066CC), gold (#FFD700)
- **Slogan:** "Where Beer League Legends Are Made"
- **Header:** League navigation (Schedule, Standings, Stats, Teams)
- **Footer:** League branding and links

## Testing

### Local Development
```bash
# Start dev server
npm run dev

# Access sites:
# - Main platform: http://localhost:3000
# - Pilot league: http://pilot.localhost:3000
# - Demo page: http://localhost:3000/pilot
```

### Verification
1. **Platform pages** should show BLH branding
2. **League subdomain** should show HockeyLifeHL branding
3. **Demo page** should show HockeyLifeHL showcase
4. **Dark mode** should work on all pages
5. **Theme colors** should match branding

## Database Requirements

The pilot league must exist in the database:

```sql
-- Check if pilot league exists
SELECT name, subdomain, primary_color, secondary_color
FROM leagues
WHERE subdomain = 'pilot';

-- Create if missing (already in migrations)
-- See: supabase/migrations/20260126_enhance_league_branding.sql
```

## Future Leagues

To add more leagues:

1. **Insert into database:**
   ```sql
   INSERT INTO leagues (
     name, slug, subdomain,
     logo_url, primary_color, secondary_color, accent_color,
     tagline, status
   ) VALUES (
     'New League', 'new-league', 'newleague',
     '/new-logo.png', '#FF0000', '#00FF00', '#0000FF',
     'Our League Motto', 'active'
   );
   ```

2. **Access via subdomain:**
   - Local: `newleague.localhost:3000`
   - Production: `newleague.beerleaguehockey.ca`

3. **Or custom domain:**
   - Add `custom_domain = 'newleague.com'` in database
   - Configure DNS
   - Access via `newleague.com`

## Summary

✅ **Main platform** (`beerleaguehockey.ca`) uses BLH branding
✅ **Pilot league** (`pilot.beerleaguehockey.ca`) uses HockeyLifeHL branding
✅ **Demo page** (`/pilot`) showcases HockeyLifeHL
✅ **Dark mode** works across all pages
✅ **Complete separation** between platform and league instances
✅ **Scalable** for multiple leagues with unique branding
