# Middleware Testing Guide

**Document:** Backend Domain Routing Testing
**Agent:** Agent 2 - Backend Domain Routing & Branding API
**Date:** January 26, 2026

---

## Overview

This document provides comprehensive testing procedures for the multi-instance domain routing middleware. The middleware handles three routing scenarios:

1. **Platform domains** - Marketing site (beerleaguehockey.ca)
2. **Subdomains** - League instances (pilot.beerleaguehockey.ca)
3. **Custom domains** - Custom league domains (customleague.com)

---

## Local Development Setup

### 1. Hosts File Configuration

To test domain routing locally, modify your system's hosts file.

#### Windows
File location: `C:\Windows\System32\drivers\etc\hosts`

```
# Add these lines:
127.0.0.1 beerleaguehockey.local
127.0.0.1 pilot.beerleaguehockey.local
127.0.0.1 testleague.beerleaguehockey.local
127.0.0.1 customdomain.local
127.0.0.1 hockeylifehl.local
```

**Note:** Edit with Administrator privileges (Run Notepad as Administrator)

#### Mac/Linux
File location: `/etc/hosts`

```bash
sudo nano /etc/hosts

# Add these lines:
127.0.0.1 beerleaguehockey.local
127.0.0.1 pilot.beerleaguehockey.local
127.0.0.1 testleague.beerleaguehockey.local
127.0.0.1 customdomain.local
127.0.0.1 hockeylifehl.local
```

### 2. Update Middleware for Local Testing

The middleware includes support for `.localhost` domains by default. For `.local` domains, ensure the middleware patterns include them:

```typescript
// Already included in middleware.ts
const subdomainPatterns = [
  /^[a-z0-9-]+\.beerleaguehockey\.ca$/,
  /^[a-z0-9-]+\.localhost$/,
  /^[a-z0-9-]+\.127\.0\.0\.1$/,
];
```

### 3. Start Development Server

```bash
cd HockeyLifeHL
npm run dev
```

The server will start on `http://localhost:3000`

---

## Testing Procedures

### Test Case 1: Platform Domain

**Purpose:** Verify platform marketing site is accessible without league context.

**URL:** `http://localhost:3000/`

**Expected Behavior:**
- Shows platform marketing page
- No league-specific branding
- No `x-league-hostname` header set

**Curl Commands:**

```bash
# Test root path
curl -v -H "Host: localhost:3000" http://localhost:3000/

# Test marketing paths
curl -v -H "Host: localhost:3000" http://localhost:3000/about
curl -v -H "Host: localhost:3000" http://localhost:3000/login
curl -v -H "Host: localhost:3000" http://localhost:3000/register

# Test with beerleaguehockey.ca (simulated)
curl -v -H "Host: beerleaguehockey.ca" http://localhost:3000/
```

**Verification:**
- Response status: 200 OK
- No redirect to /league path
- Platform content displayed

---

### Test Case 2: Subdomain Routing (Pilot League)

**Purpose:** Verify subdomain requests route to league instance with correct headers.

**URL:** `http://pilot.localhost:3000/`

**Expected Behavior:**
- Rewrites internally to `/league/`
- Sets `x-league-hostname: pilot.localhost:3000`
- Sets `x-league-subdomain: pilot`
- Loads pilot league branding from database

**Curl Commands:**

```bash
# Test pilot subdomain root
curl -v -H "Host: pilot.localhost:3000" http://localhost:3000/

# Test pilot subdomain pages
curl -v -H "Host: pilot.localhost:3000" http://localhost:3000/schedule
curl -v -H "Host: pilot.localhost:3000" http://localhost:3000/standings
curl -v -H "Host: pilot.localhost:3000" http://localhost:3000/stats
curl -v -H "Host: pilot.localhost:3000" http://localhost:3000/teams

# Test with production subdomain format (simulated)
curl -v -H "Host: pilot.beerleaguehockey.ca" http://localhost:3000/
```

**Verification:**
- Response status: 200 OK
- Content includes pilot league branding (HockeyLifeHL)
- CSS variables set: `--league-primary-color`, `--league-secondary-color`, etc.
- League context loaded from database

---

### Test Case 3: Custom Domain Routing

**Purpose:** Verify custom domain requests route to league instance.

**URL:** `http://customdomain.local:3000/`

**Expected Behavior:**
- Rewrites internally to `/league/`
- Sets `x-league-hostname: customdomain.local:3000`
- No `x-league-subdomain` header (custom domains don't have subdomains)
- Looks up league by custom domain in database

**Curl Commands:**

```bash
# Test custom domain root
curl -v -H "Host: customdomain.local:3000" http://localhost:3000/

# Test custom domain pages
curl -v -H "Host: customdomain.local:3000" http://localhost:3000/schedule
```

**Note:** For custom domain testing to work, you need a league in the database with:
- `custom_domain = 'customdomain.local'` or `custom_domain = 'customdomain.local:3000'`
- `custom_domain_verified = true`

If no matching league is found, the user should be redirected to the platform root.

---

### Test Case 4: Header Verification

**Purpose:** Verify correct headers are set by middleware.

**Curl Commands:**

```bash
# Check headers for subdomain
curl -I -H "Host: pilot.localhost:3000" http://localhost:3000/

# Check headers for custom domain
curl -I -H "Host: customdomain.local:3000" http://localhost:3000/

# Check headers for platform (should NOT have league headers)
curl -I -H "Host: localhost:3000" http://localhost:3000/
```

**Expected Headers for League Context:**
- `x-league-hostname: <hostname>`
- `x-league-subdomain: <subdomain>` (only for subdomains)

**Expected Headers for Platform:**
- No `x-league-hostname`
- No `x-league-subdomain`

---

### Test Case 5: Invalid Domain Handling

**Purpose:** Verify graceful handling of invalid/unknown domains.

**Curl Commands:**

```bash
# Non-existent subdomain
curl -v -H "Host: nonexistent.localhost:3000" http://localhost:3000/

# Unknown custom domain
curl -v -H "Host: unknown.com:3000" http://localhost:3000/
```

**Expected Behavior:**
- Middleware sets headers
- League context returns null
- Layout redirects to platform root (`/`)

---

### Test Case 6: Static Assets

**Purpose:** Verify static assets bypass middleware.

**Curl Commands:**

```bash
# Static files should not be affected by middleware
curl -v -H "Host: pilot.localhost:3000" http://localhost:3000/_next/static/chunks/main.js
curl -v -H "Host: pilot.localhost:3000" http://localhost:3000/favicon.ico
curl -v -H "Host: pilot.localhost:3000" http://localhost:3000/logo.png
```

**Expected Behavior:**
- Static assets served directly
- No URL rewriting
- Fast response (middleware bypass)

---

### Test Case 7: API Routes

**Purpose:** Verify API routes work correctly with league context.

**Curl Commands:**

```bash
# API routes should pass through normally but with headers
curl -v -H "Host: pilot.localhost:3000" http://localhost:3000/api/health
```

**Expected Behavior:**
- API routes accessible
- League headers available in API route handlers

---

## Browser Testing

### Manual Browser Tests

1. **Platform Site:**
   - Open `http://localhost:3000/`
   - Verify platform marketing page loads
   - Check Developer Tools > Network > Headers for requests

2. **Subdomain League:**
   - Open `http://pilot.localhost:3000/`
   - Verify league home page loads with pilot branding
   - Check colors match pilot league (Primary: #E31837, Secondary: #0066CC)
   - Navigate to /schedule, /standings, /stats, /teams
   - Verify all pages use league branding

3. **Custom Domain (requires hosts file):**
   - Open `http://customdomain.local:3000/`
   - Verify league loads (if configured in database)
   - Or verify redirect to platform (if not configured)

### Chrome DevTools Verification

1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Click on document request
5. Check Request Headers for `host`
6. Check Response body for league branding CSS variables

---

## Database Setup for Testing

### Verify Pilot League Exists

```sql
SELECT id, name, slug, subdomain, custom_domain, custom_domain_verified,
       primary_color, secondary_color, accent_color
FROM leagues
WHERE slug = 'pilot';
```

**Expected Result:**
- name: HockeyLifeHL
- slug: pilot
- subdomain: pilot
- primary_color: #E31837
- secondary_color: #0066CC
- accent_color: #FFD700

### Create Test Custom Domain League

```sql
-- Create a test league with custom domain
INSERT INTO leagues (
  name, slug, subdomain, custom_domain, custom_domain_verified,
  primary_color, secondary_color, accent_color, status, is_public
) VALUES (
  'Test Custom Domain League',
  'test-custom',
  NULL,
  'customdomain.local',
  true,
  '#1E40AF',
  '#3B82F6',
  '#F59E0B',
  'active',
  true
);
```

### Test Domain Lookup Function

```sql
-- Test subdomain lookup
SELECT * FROM get_league_by_hostname('pilot.localhost:3000');
SELECT * FROM get_league_by_hostname('pilot.beerleaguehockey.ca');

-- Test custom domain lookup
SELECT * FROM get_league_by_hostname('customdomain.local');

-- Test platform domain (should return NULL)
SELECT * FROM get_league_by_hostname('localhost:3000');
SELECT * FROM get_league_by_hostname('beerleaguehockey.ca');
```

---

## Performance Testing

### Middleware Latency

**Target:** < 10ms

Test with timing:

```bash
# Time middleware response
time curl -s -o /dev/null -w "%{time_total}s" -H "Host: pilot.localhost:3000" http://localhost:3000/

# Multiple requests to check consistency
for i in {1..10}; do
  curl -s -o /dev/null -w "%{time_total}s\n" -H "Host: pilot.localhost:3000" http://localhost:3000/
done
```

### League Lookup Latency

**Target:**
- Cached: < 5ms
- Uncached: < 50ms

The React `cache()` function ensures that multiple calls to `getLeagueFromHostname()` within the same request are deduplicated.

---

## Troubleshooting

### Common Issues

#### 1. Hosts file not working

**Windows:**
- Ensure file saved with ANSI encoding, no file extension
- Flush DNS: `ipconfig /flushdns`
- Restart browser

**Mac/Linux:**
- Check file permissions: `ls -la /etc/hosts`
- Flush DNS: `sudo dscacheutil -flushcache` (Mac) or `systemd-resolve --flush-caches` (Linux)

#### 2. Subdomain not routing

- Verify middleware is running (check console logs)
- Verify subdomain pattern matches hostname
- Check that host header is being sent correctly

#### 3. League not found

- Verify league exists in database with correct subdomain/custom_domain
- For custom domains, verify `custom_domain_verified = true`
- Check `get_league_by_hostname()` function directly in database

#### 4. CSS variables not applied

- Verify league branding data is returned from database
- Check browser DevTools for CSS variable values
- Ensure layout.tsx is applying styles correctly

---

## Test Checklist

### Pre-deployment Checklist

- [ ] Platform domain accessible (localhost:3000)
- [ ] Platform marketing pages work
- [ ] Platform login/register work
- [ ] Subdomain routing works (pilot.localhost:3000)
- [ ] League branding loads from database
- [ ] League pages render with branding
- [ ] Custom domain routing works (if configured)
- [ ] Invalid domains handled gracefully
- [ ] Static assets bypass middleware
- [ ] API routes work with league context
- [ ] Middleware latency < 10ms
- [ ] No console errors
- [ ] No TypeScript errors

### Post-deployment Verification

- [ ] Production platform domain works
- [ ] Production subdomains work
- [ ] Custom domains verified and working
- [ ] SSL certificates valid for all domains
- [ ] Performance metrics acceptable

---

## Next Steps for Agent 3

Agent 3 should:

1. Create `LeagueThemeProvider` component
2. Replace inline styles in `league/layout.tsx` with proper theme provider
3. Update button and UI components to use CSS variables
4. Add `useLeagueBranding()` client hook for client components

---

**Document End**
