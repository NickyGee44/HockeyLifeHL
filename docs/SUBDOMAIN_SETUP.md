# Subdomain Setup Guide

This guide explains how to set up local subdomain testing for the HockeyLifeHL pilot league.

## Architecture Overview

The application has two separate instances:

1. **Main Platform** (`beerleaguehockey.ca` / `localhost:3000`)
   - Beer League Hockey branding (BLH)
   - Platform homepage, marketing pages, admin panel
   - Uses `platformConfig` for branding

2. **League Instance** (`pilot.beerleaguehockey.ca` / `pilot.localhost`)
   - HockeyLifeHL branding (from database)
   - Complete league website with own header, footer, pages
   - Uses database branding via `LeagueThemeProvider`
   - Routes: `/league/*` (rewritten by middleware)

3. **Demo/Showcase** (`beerleaguehockey.ca/pilot`)
   - Landing page showcasing HockeyLifeHL
   - Uses `currentLeague` config
   - Links to the full pilot league subdomain

## Local Development Setup

### Option 1: Using `pilot.localhost` (Recommended)

Most browsers support `.localhost` subdomains without any configuration.

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Access the sites:
   - Main platform: `http://localhost:3000`
   - Pilot league: `http://pilot.localhost:3000`
   - Demo page: `http://localhost:3000/pilot`

### Option 2: Using Hosts File (If .localhost doesn't work)

If your browser doesn't support `.localhost` subdomains, add entries to your hosts file:

**Windows:**
```
C:\Windows\System32\drivers\etc\hosts
```

**Mac/Linux:**
```
/etc/hosts
```

**Add these lines:**
```
127.0.0.1 pilot.localhost
127.0.0.1 beerleaguehockey.local
127.0.0.1 pilot.beerleaguehockey.local
```

Then access:
- Main platform: `http://beerleaguehockey.local:3000`
- Pilot league: `http://pilot.beerleaguehockey.local:3000`

## How Subdomain Routing Works

The middleware (`src/proxy.ts`) handles subdomain routing:

1. **Request arrives** at `pilot.localhost:3000/schedule`
2. **Middleware detects** subdomain: `pilot`
3. **Sets headers:**
   - `x-league-hostname`: `pilot.localhost`
   - `x-league-subdomain`: `pilot`
4. **Rewrites path** to `/league/schedule` (internally)
5. **Browser shows** `pilot.localhost:3000/schedule` (unchanged)

## Database Configuration

The pilot league must exist in the database with:

```sql
INSERT INTO leagues (
  name,
  slug,
  subdomain,
  logo_url,
  primary_color,
  secondary_color,
  accent_color,
  tagline,
  -- ... other fields
) VALUES (
  'HockeyLifeHL',
  'pilot',
  'pilot',  -- This matches the subdomain
  '/logo.png',
  '#E31837',  -- Canada Red
  '#0066CC',  -- Blue
  '#FFD700',  -- Gold
  'Where Beer League Legends Are Made'
);
```

This data is loaded by `getLeagueFromHostname()` which queries the database for a league with subdomain = 'pilot'.

## Branding Components

### Platform Pages (BLH)
- **Header:** `src/components/layout/Header.tsx` (uses `platformConfig`)
- **Footer:** `src/components/layout/Footer.tsx` (uses `platformConfig`)
- **Colors:** BLH brand colors

### League Pages (HockeyLifeHL)
- **Header:** `src/components/layout/LeagueHeader.tsx` (uses database branding)
- **Footer:** `src/components/layout/LeagueFooter.tsx` (uses database branding)
- **Colors:** League colors from database via `LeagueThemeProvider`
- **Layout:** `src/app/league/layout.tsx`

### Demo Page
- **Component:** `src/components/layout/LandingPage.tsx`
- **Uses:** `currentLeague` config (HockeyLifeHL)
- **Purpose:** Showcase page at `/pilot` on main platform

## Testing Checklist

### Main Platform (`localhost:3000`)
- [ ] Shows "Beer League Hockey" logo and name
- [ ] Header uses BLH branding (blue/red colors)
- [ ] Footer shows "Beer League Hockey"
- [ ] Dashboard, admin, and public pages work
- [ ] Dark mode toggle works

### Pilot League (`pilot.localhost:3000`)
- [ ] Shows "HockeyLifeHL" logo and name
- [ ] Header uses HockeyLifeHL branding (red/blue/gold)
- [ ] Footer shows "HockeyLifeHL"
- [ ] League pages work: `/` `/schedule` `/standings` `/stats` `/teams`
- [ ] Theme colors match database branding
- [ ] Dark mode toggle works

### Demo Page (`localhost:3000/pilot`)
- [ ] Shows HockeyLifeHL branding
- [ ] Links to pilot league subdomain
- [ ] Displays league showcase content

## Troubleshooting

### "League not found" error on subdomain
- Check database has pilot league with `subdomain = 'pilot'`
- Run migrations: `npm run db:migrate`
- Check middleware is working: look for rewrite in Network tab

### Wrong branding showing
- **Platform pages:** Should use `platformConfig` (BLH)
- **League pages:** Should use database branding (HockeyLifeHL)
- Check which layout/header is being used

### Subdomain not resolving
- Try `pilot.localhost` instead of `pilot.localhost:3000`
- Check hosts file configuration
- Clear browser cache
- Try different browser (Chrome works best with .localhost)

### Database connection issues
- Check `.env.local` has correct Supabase credentials
- Verify Supabase project is running
- Check RLS policies allow reading league branding

## Production Deployment

In production:
- Main platform: `beerleaguehockey.ca`
- Pilot league: `pilot.beerleaguehockey.ca`
- Demo page: `beerleaguehockey.ca/pilot`

DNS Configuration:
- A record: `beerleaguehockey.ca` → Server IP
- CNAME record: `*.beerleaguehockey.ca` → `beerleaguehockey.ca`
- Or A record: `pilot.beerleaguehockey.ca` → Server IP

SSL Certificates:
- Wildcard cert: `*.beerleaguehockey.ca` (recommended)
- Or separate certs for each subdomain

## Custom Domains

For custom league domains (e.g., `hockeylifehl.com`):

1. League admin adds custom domain in settings
2. DNS: Point custom domain to platform
3. Platform verifies DNS ownership
4. SSL certificate provisioned
5. Middleware routes custom domain to league

The middleware already supports custom domains via `isCustomDomain()` check.
