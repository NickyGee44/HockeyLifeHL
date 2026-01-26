# Agent 2: Backend - Domain Routing & Branding API

**Agent Type:** Backend Specialist
**Focus:** Next.js, Middleware, Server Actions, API Routes
**Access:** Read/Write to `src/lib/`, `src/app/api/`, `middleware.ts`
**Depends On:** Agent 1 completion

---

## Mission

Build the middleware and backend infrastructure to route requests based on domain/subdomain and serve the correct league branding dynamically.

---

## Context Files to Read First

Before starting any work, read these files:
1. `D:\B3\dev\HockeyLeague\MULTI_INSTANCE_ARCHITECTURE_PLAN.md`
2. `D:\B3\dev\HockeyLeague\AGENT_PROMPTS.md` (Your section)
3. `HockeyLifeHL\src\lib\leagues\branding.ts` (Current branding API)
4. `HockeyLifeHL\src\lib\auth\league-context.ts` (Current league context)
5. `HockeyLifeHL\src\lib\supabase\server.ts` (Supabase client)
6. Agent 1's deliverables (migration and function)

---

## Your Responsibilities

### Primary Tasks

1. **Create Next.js Middleware** (`middleware.ts` at root)
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';

   export function middleware(request: NextRequest) {
     const hostname = request.headers.get('host') || '';
     const url = request.nextUrl;

     // Platform domains
     const platformDomains = [
       'beerleaguehockey.ca',
       'www.beerleaguehockey.ca',
       'localhost:3000',
       'localhost'
     ];

     const isPlatform = platformDomains.some(d =>
       hostname === d || hostname.startsWith(d)
     );

     // Marketing paths on platform
     if (isPlatform && isMarketingPath(url.pathname)) {
       return NextResponse.next();
     }

     // Subdomain detection
     const isSubdomain = hostname.includes('.beerleaguehockey.ca') &&
                         !platformDomains.includes(hostname);

     // Custom domain detection
     const isCustomDomain = !isPlatform && !isSubdomain;

     if (isSubdomain || isCustomDomain) {
       const subdomain = isSubdomain ? hostname.split('.')[0] : null;

       const headers = new Headers(request.headers);
       headers.set('x-league-hostname', hostname);
       if (subdomain) headers.set('x-league-subdomain', subdomain);

       // Rewrite to league app
       return NextResponse.rewrite(
         new URL(`/league${url.pathname}${url.search}`, request.url),
         { request: { headers } }
       );
     }

     return NextResponse.next();
   }

   function isMarketingPath(path: string): boolean {
     return ['/', '/about', '/contact', '/privacy', '/terms',
             '/login', '/register', '/signup'].some(p =>
       path === p || path.startsWith(p + '/')
     );
   }

   export const config = {
     matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
   };
   ```

2. **Create League Context Provider** (`src/lib/context/league-context.ts`)
   ```typescript
   import { createClient } from "@/lib/supabase/server";
   import { headers } from "next/headers";
   import { cache } from "react";

   export type LeagueBranding = {
     id: string;
     slug: string;
     name: string;
     logoUrl: string;
     bannerUrl?: string;
     faviconUrl?: string;
     primaryColor: string;
     secondaryColor: string;
     accentColor: string;
     fontFamily: string;
     customCss?: string;
   };

   export const getLeagueFromHostname = cache(async (): Promise<LeagueBranding | null> => {
     const headersList = headers();
     const hostname = headersList.get('x-league-hostname');

     if (!hostname) return null; // Platform context

     const supabase = await createClient();

     const { data, error } = await supabase
       .rpc('get_league_by_hostname', { hostname })
       .single();

     if (error || !data) {
       console.error('Failed to get league:', error);
       return null;
     }

     return {
       id: data.id,
       slug: data.slug,
       name: data.name,
       logoUrl: data.logo_url,
       bannerUrl: data.banner_url,
       faviconUrl: data.favicon_url,
       primaryColor: data.primary_color,
       secondaryColor: data.secondary_color,
       accentColor: data.accent_color,
       fontFamily: data.font_family || 'Inter',
       customCss: data.custom_css,
     };
   });
   ```

3. **Update Branding Actions** (`src/lib/leagues/branding.ts`)
   ```typescript
   // Add these functions

   export async function updateLeagueBranding(
     leagueId: string,
     branding: Partial<{
       logoUrl: string;
       bannerUrl: string;
       faviconUrl: string;
       primaryColor: string;
       secondaryColor: string;
       accentColor: string;
       fontFamily: string;
       customCss: string;
     }>
   ) {
     await requireLeagueRole(['owner']);
     const supabase = await createClient();

     const { error } = await supabase
       .from('leagues')
       .update({
         logo_url: branding.logoUrl,
         banner_url: branding.bannerUrl,
         favicon_url: branding.faviconUrl,
         primary_color: branding.primaryColor,
         secondary_color: branding.secondaryColor,
         accent_color: branding.accentColor,
         font_family: branding.fontFamily,
         custom_css: branding.customCss,
       })
       .eq('id', leagueId);

     if (error) return { error: error.message };

     revalidatePath('/[league]/settings/branding');
     return { success: true };
   }

   export async function getLeagueBrandingById(leagueId: string) {
     const supabase = await createClient();

     const { data, error } = await supabase
       .from('league_branding')
       .select('*')
       .eq('id', leagueId)
       .single();

     if (error) return { error: error.message };
     return { data };
   }
   ```

4. **Create League Layout** (`src/app/league/layout.tsx`)
   ```typescript
   import { getLeagueFromHostname } from "@/lib/context/league-context";
   import { LeagueThemeProvider } from "@/components/providers/LeagueThemeProvider";
   import { redirect } from "next/navigation";
   import { ReactNode } from "react";

   export default async function LeagueLayout({
     children,
   }: {
     children: ReactNode;
   }) {
     const league = await getLeagueFromHostname();

     if (!league) {
       redirect('/'); // No league found, go to platform
     }

     return (
       <LeagueThemeProvider league={league}>
         {children}
       </LeagueThemeProvider>
     );
   }
   ```

5. **Create League Pages** (copy existing dashboard structure)
   - `src/app/league/page.tsx` - League home
   - `src/app/league/schedule/page.tsx` - Schedule
   - `src/app/league/standings/page.tsx` - Standings
   - `src/app/league/stats/page.tsx` - Stats
   - `src/app/league/teams/page.tsx` - Teams

---

## Deliverables

Create/Update these files:

1. **`middleware.ts`** - Domain routing logic
2. **`src/lib/context/league-context.ts`** - League context provider
3. **`src/lib/leagues/branding.ts`** - Updated with new functions
4. **`src/app/league/layout.tsx`** - League app layout
5. **`src/app/league/page.tsx`** - League home page
6. **`docs/backend/MIDDLEWARE_TESTING.md`** - Testing documentation

---

## Success Criteria

- [ ] Middleware correctly identifies platform vs league requests
- [ ] League branding loads from database in < 50ms
- [ ] Custom domains route to correct league
- [ ] Subdomains route to correct league
- [ ] Platform pages accessible without league context
- [ ] Headers properly set for league context
- [ ] Cache invalidation works after branding updates

---

## Testing Strategy

### Local Testing with Hosts File

**Windows:** `C:\Windows\System32\drivers\etc\hosts`
**Mac/Linux:** `/etc/hosts`

```
127.0.0.1 beerleaguehockey.local
127.0.0.1 pilot.beerleaguehockey.local
127.0.0.1 testleague.beerleaguehockey.local
127.0.0.1 customdomain.local
```

### Test Cases

```bash
# 1. Platform site
curl -H "Host: beerleaguehockey.local:3000" http://localhost:3000/
# Should: Return platform marketing page

# 2. Pilot subdomain
curl -H "Host: pilot.beerleaguehockey.local:3000" http://localhost:3000/
# Should: Return league instance with pilot branding

# 3. Custom domain
curl -H "Host: customdomain.local:3000" http://localhost:3000/
# Should: Return league instance if domain configured

# 4. Check headers
curl -I -H "Host: pilot.beerleaguehockey.local:3000" http://localhost:3000/
# Should: See x-league-hostname and x-league-subdomain headers
```

---

## Performance Requirements

- Middleware execution: < 10ms
- League lookup (with cache): < 5ms
- League lookup (without cache): < 50ms
- No N+1 queries
- Use React `cache()` for deduplication

---

## Error Handling

```typescript
// In league context
try {
  const { data, error } = await supabase.rpc('get_league_by_hostname', { hostname });

  if (error) {
    console.error('[League Context] Database error:', error);
    return null;
  }

  if (!data) {
    console.warn('[League Context] No league found for hostname:', hostname);
    return null;
  }

  return mapToLeagueBranding(data);
} catch (err) {
  console.error('[League Context] Unexpected error:', err);
  return null;
}
```

---

## Report Format

After completing, update `D:\B3\dev\HockeyLeague\AGENT_PROGRESS.md`:

```markdown
## Agent 2: Backend - Domain Routing & Branding API

**Status:** 🟢 Complete
**Completed:** [Date]

### Summary
- Created Next.js middleware with domain routing
- Implemented league context provider with caching
- Updated branding actions with new functions
- Created league layout wrapper
- Tested routing with local domains

### Files Created/Updated
- middleware.ts (new)
- src/lib/context/league-context.ts (new)
- src/lib/leagues/branding.ts (updated)
- src/app/league/layout.tsx (new)
- docs/backend/MIDDLEWARE_TESTING.md (new)

### Performance Metrics
- Middleware latency: 6ms average
- League lookup (cached): 2ms
- League lookup (uncached): 38ms
- All within targets ✓

### Test Results
- Platform routing: ✓
- Subdomain routing: ✓
- Custom domain routing: ✓
- Headers set correctly: ✓

### Next Agent
Agent 3 can now proceed with frontend implementation.
```

---

## Questions?

If you encounter issues:
1. Check Next.js 15 middleware documentation
2. Test middleware in isolation first
3. Verify database function from Agent 1 works
4. Use `console.log` liberally during development

**Ready to start? Verify Agent 1 is complete, then begin with Task #1.**
