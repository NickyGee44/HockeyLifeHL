# Agent 3: Frontend - Dynamic Branding & Instance Separation

**Agent Type:** Frontend Specialist
**Focus:** React, Next.js, Tailwind CSS, Dynamic Theming
**Access:** Read/Write to `src/components/`, `src/app/`, `src/lib/`
**Depends On:** Agent 2 completion

---

## Mission

Convert all hardcoded branding to dynamic CSS variables. Separate pilot league to its own subdomain. Ensure each league instance has completely independent UI with custom branding.

---

## Context Files to Read First

Before starting any work, read these files:
1. `D:\B3\dev\HockeyLeague\MULTI_INSTANCE_ARCHITECTURE_PLAN.md`
2. `D:\B3\dev\HockeyLeague\AGENT_PROMPTS.md` (Your section)
3. `HockeyLifeHL\src\lib\league-config.ts` (Current config structure)
4. `HockeyLifeHL\src\app\(dashboard)\**\*.tsx` (Dashboard components)
5. `HockeyLifeHL\src\components\**\*.tsx` (Shared components)
6. Agent 2's deliverables (middleware and league context)

---

## Your Responsibilities

### Primary Tasks

1. **Create League Theme Provider** (`src/components/providers/LeagueThemeProvider.tsx`)
   ```typescript
   'use client';

   import { createContext, useContext, useEffect, ReactNode } from 'react';
   import { LeagueBranding } from '@/lib/context/league-context';

   const LeagueBrandingContext = createContext<LeagueBranding | null>(null);

   export function useLeagueBranding() {
     const context = useContext(LeagueBrandingContext);
     if (!context) {
       throw new Error('useLeagueBranding must be used within LeagueThemeProvider');
     }
     return context;
   }

   interface Props {
     league: LeagueBranding;
     children: ReactNode;
   }

   export function LeagueThemeProvider({ league, children }: Props) {
     useEffect(() => {
       // Set CSS variables
       document.documentElement.style.setProperty('--primary-color', league.primaryColor);
       document.documentElement.style.setProperty('--secondary-color', league.secondaryColor);
       document.documentElement.style.setProperty('--accent-color', league.accentColor);
       document.documentElement.style.setProperty('--font-family', league.fontFamily);

       // Inject custom CSS if provided
       if (league.customCss) {
         const styleElement = document.createElement('style');
         styleElement.id = 'league-custom-css';
         styleElement.textContent = league.customCss;
         document.head.appendChild(styleElement);

         return () => {
           document.getElementById('league-custom-css')?.remove();
         };
       }
     }, [league]);

     return (
       <LeagueBrandingContext.Provider value={league}>
         {children}
       </LeagueBrandingContext.Provider>
     );
   }
   ```

2. **Update Button Component** (`src/components/ui/button.tsx`)

   Search for all hardcoded colors and replace with CSS variables:
   ```typescript
   // Before
   bg-[#1F4FD8] hover:bg-[#1F4FD8]/90

   // After
   bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90
   ```

   Do this for all color variants (primary, secondary, destructive, etc.)

3. **Create League Header Component** (`src/components/league/LeagueHeader.tsx`)
   ```typescript
   'use client';

   import Link from 'next/link';
   import Image from 'next/image';
   import { useLeagueBranding } from '@/components/providers/LeagueThemeProvider';
   import { Button } from '@/components/ui/button';

   export function LeagueHeader() {
     const league = useLeagueBranding();

     return (
       <header className="border-b" style={{ borderColor: 'var(--primary-color)' }}>
         <div className="container mx-auto px-4 py-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               {league.logoUrl && (
                 <Image
                   src={league.logoUrl}
                   alt={league.name}
                   width={48}
                   height={48}
                   className="rounded-lg"
                 />
               )}
               <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>
                 {league.name}
               </h1>
             </div>

             <nav className="flex items-center gap-6">
               <Link
                 href="/schedule"
                 className="hover:text-[var(--primary-color)] transition-colors"
               >
                 Schedule
               </Link>
               <Link
                 href="/standings"
                 className="hover:text-[var(--primary-color)] transition-colors"
               >
                 Standings
               </Link>
               <Link
                 href="/stats"
                 className="hover:text-[var(--primary-color)] transition-colors"
               >
                 Stats
               </Link>
               <Link
                 href="/teams"
                 className="hover:text-[var(--primary-color)] transition-colors"
               >
                 Teams
               </Link>
               <Button
                 style={{
                   backgroundColor: 'var(--primary-color)',
                 }}
                 className="hover:opacity-90"
               >
                 Sign In
               </Button>
             </nav>
           </div>
         </div>
       </header>
     );
   }
   ```

4. **Update Components with Hardcoded Colors**

   Search codebase for these hex colors and replace:
   - `#1F4FD8` → `var(--primary-color)` (BLH Blue)
   - `#D72638` → `var(--secondary-color)` (BLH Red)
   - `#FFD700` → `var(--accent-color)` (Gold)
   - `#E31837` → `var(--primary-color)` (HockeyLifeHL Red)
   - `#0066CC` → `var(--secondary-color)` (HockeyLifeHL Blue)

   **Priority Files to Update:**
   - `src/components/dashboard/DashboardNav.tsx`
   - `src/components/dashboard/TeamCard.tsx`
   - `src/components/dashboard/GameCard.tsx`
   - `src/components/ui/badge.tsx`
   - `src/app/(dashboard)/[league]/schedule/page.tsx`
   - `src/app/(dashboard)/[league]/standings/page.tsx`
   - `src/app/(dashboard)/[league]/stats/page.tsx`
   - `src/app/(dashboard)/[league]/teams/page.tsx`
   - Any component with `bg-[#...]` or `text-[#...]`

5. **Separate Pilot League**

   Remove pilot from platform marketing:
   - Delete or move `src/app/(public)/pilot/page.tsx`
   - Update all links from `/pilot` to `https://pilot.beerleaguehockey.ca`

   Files to update:
   - `src/app/(marketing)/page.tsx` - Change pilot links
   - `src/components/marketing/MarketingHeader.tsx` - Update navigation
   - `src/components/marketing/Footer.tsx` - Update footer links

6. **Create Branding Settings Page** (`src/app/(dashboard)/[league]/settings/branding/page.tsx`)
   ```typescript
   import { Metadata } from 'next';
   import { requireLeagueRole } from '@/lib/auth/league-roles';
   import { getLeagueBrandingById, updateLeagueBranding } from '@/lib/leagues/branding';
   import { BrandingForm } from '@/components/settings/BrandingForm';

   export const metadata: Metadata = {
     title: 'Branding Settings',
     description: 'Customize your league branding',
   };

   export default async function BrandingSettingsPage({
     params,
   }: {
     params: { league: string };
   }) {
     await requireLeagueRole(['owner']);

     const { data: branding } = await getLeagueBrandingById(params.league);

     return (
       <div className="container max-w-4xl py-8">
         <div className="mb-8">
           <h1 className="text-3xl font-bold">Branding Settings</h1>
           <p className="text-muted-foreground mt-2">
             Customize your league's appearance with colors, logos, and custom styles.
           </p>
         </div>

         <BrandingForm initialBranding={branding} leagueId={params.league} />
       </div>
     );
   }
   ```

7. **Create Branding Form Component** (`src/components/settings/BrandingForm.tsx`)
   ```typescript
   'use client';

   import { useState } from 'react';
   import { Button } from '@/components/ui/button';
   import { Input } from '@/components/ui/input';
   import { Label } from '@/components/ui/label';
   import { Textarea } from '@/components/ui/textarea';
   import { updateLeagueBranding } from '@/lib/leagues/branding';
   import { toast } from 'sonner';

   export function BrandingForm({ initialBranding, leagueId }: any) {
     const [branding, setBranding] = useState(initialBranding);
     const [loading, setLoading] = useState(false);

     async function handleSubmit(e: React.FormEvent) {
       e.preventDefault();
       setLoading(true);

       const result = await updateLeagueBranding(leagueId, branding);

       if (result.error) {
         toast.error(result.error);
       } else {
         toast.success('Branding updated successfully!');
       }

       setLoading(false);
     }

     return (
       <form onSubmit={handleSubmit} className="space-y-8">
         <div className="grid md:grid-cols-2 gap-6">
           <div className="space-y-2">
             <Label htmlFor="logoUrl">Logo URL</Label>
             <Input
               id="logoUrl"
               value={branding.logoUrl || ''}
               onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
               placeholder="https://example.com/logo.png"
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="bannerUrl">Banner URL</Label>
             <Input
               id="bannerUrl"
               value={branding.bannerUrl || ''}
               onChange={(e) => setBranding({ ...branding, bannerUrl: e.target.value })}
               placeholder="https://example.com/banner.png"
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="faviconUrl">Favicon URL</Label>
             <Input
               id="faviconUrl"
               value={branding.faviconUrl || ''}
               onChange={(e) => setBranding({ ...branding, faviconUrl: e.target.value })}
               placeholder="https://example.com/favicon.ico"
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="fontFamily">Font Family</Label>
             <Input
               id="fontFamily"
               value={branding.fontFamily || 'Inter'}
               onChange={(e) => setBranding({ ...branding, fontFamily: e.target.value })}
             />
           </div>
         </div>

         <div className="grid md:grid-cols-3 gap-6">
           <div className="space-y-2">
             <Label htmlFor="primaryColor">Primary Color</Label>
             <div className="flex gap-2">
               <Input
                 id="primaryColor"
                 type="color"
                 value={branding.primaryColor || '#1F4FD8'}
                 onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                 className="h-12 w-20"
               />
               <Input
                 value={branding.primaryColor || '#1F4FD8'}
                 onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                 className="flex-1"
               />
             </div>
           </div>

           <div className="space-y-2">
             <Label htmlFor="secondaryColor">Secondary Color</Label>
             <div className="flex gap-2">
               <Input
                 id="secondaryColor"
                 type="color"
                 value={branding.secondaryColor || '#D72638'}
                 onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                 className="h-12 w-20"
               />
               <Input
                 value={branding.secondaryColor || '#D72638'}
                 onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                 className="flex-1"
               />
             </div>
           </div>

           <div className="space-y-2">
             <Label htmlFor="accentColor">Accent Color</Label>
             <div className="flex gap-2">
               <Input
                 id="accentColor"
                 type="color"
                 value={branding.accentColor || '#FFD700'}
                 onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                 className="h-12 w-20"
               />
               <Input
                 value={branding.accentColor || '#FFD700'}
                 onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                 className="flex-1"
               />
             </div>
           </div>
         </div>

         <div className="space-y-2">
           <Label htmlFor="customCss">Custom CSS (Advanced)</Label>
           <Textarea
             id="customCss"
             value={branding.customCss || ''}
             onChange={(e) => setBranding({ ...branding, customCss: e.target.value })}
             rows={6}
             placeholder="/* Custom CSS rules */&#10;.custom-class {&#10;  /* styles */&#10;}"
             className="font-mono text-sm"
           />
         </div>

         <div className="border-t pt-6">
           <h3 className="text-lg font-semibold mb-4">Preview</h3>
           <div className="p-6 rounded-lg border" style={{
             backgroundColor: branding.primaryColor + '10',
             borderColor: branding.primaryColor,
           }}>
             <div className="flex items-center gap-4 mb-4">
               <div
                 className="w-16 h-16 rounded-lg"
                 style={{ backgroundColor: branding.primaryColor }}
               />
               <div>
                 <h4 className="text-xl font-bold" style={{ color: branding.primaryColor }}>
                   League Name
                 </h4>
                 <p style={{ color: branding.secondaryColor }}>Sample text</p>
               </div>
             </div>
             <Button
               type="button"
               style={{ backgroundColor: branding.primaryColor }}
               className="hover:opacity-90"
             >
               Sample Button
             </Button>
           </div>
         </div>

         <div className="flex justify-end gap-4">
           <Button type="button" variant="outline" onClick={() => setBranding(initialBranding)}>
             Reset
           </Button>
           <Button type="submit" disabled={loading}>
             {loading ? 'Saving...' : 'Save Branding'}
           </Button>
         </div>
       </form>
     );
   }
   ```

---

## Deliverables

Create/Update these files:

1. **`src/components/providers/LeagueThemeProvider.tsx`** - Theme provider with CSS variables
2. **`src/components/league/LeagueHeader.tsx`** - League-specific header
3. **`src/components/ui/button.tsx`** - Updated with CSS variables
4. **`src/app/(dashboard)/[league]/settings/branding/page.tsx`** - Branding settings page
5. **`src/components/settings/BrandingForm.tsx`** - Branding form component
6. **Updated 10+ component files** - All hardcoded colors replaced
7. **`docs/frontend/COMPONENT_UPDATE_LOG.md`** - List of all updated components

---

## Success Criteria

- [ ] Zero hardcoded hex colors in component files (use Grep to verify)
- [ ] LeagueThemeProvider sets CSS variables correctly
- [ ] All UI components adapt to league branding
- [ ] Pilot league accessible at subdomain with HockeyLifeHL branding
- [ ] Platform site shows BLH branding
- [ ] Branding settings page allows full customization
- [ ] Color changes reflect immediately (no page refresh)
- [ ] Custom CSS injection works without breaking layout

---

## Testing Strategy

### Visual Testing Checklist

1. **Platform Site** (`beerleaguehockey.ca`)
   - [ ] Uses BLH colors (#1F4FD8, #D72638, #FFD700)
   - [ ] Shows BLH logo
   - [ ] Marketing header visible
   - [ ] No league-specific content

2. **Pilot League** (`pilot.beerleaguehockey.ca`)
   - [ ] Uses HockeyLifeHL colors (#E31837, #0066CC, #FFD700)
   - [ ] Shows HockeyLifeHL logo
   - [ ] League header visible
   - [ ] Only pilot league data visible

3. **Component Updates**
   - [ ] Buttons use CSS variables
   - [ ] Badges use CSS variables
   - [ ] Cards use CSS variables
   - [ ] Navigation uses CSS variables
   - [ ] Hover states work correctly
   - [ ] Dark mode compatible

4. **Branding Settings**
   - [ ] Owner can access settings page
   - [ ] Non-owners cannot access
   - [ ] Color pickers work
   - [ ] Image uploads work (if implemented)
   - [ ] Preview updates in real-time
   - [ ] Save triggers revalidation
   - [ ] Custom CSS applies correctly

### Browser Testing

Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers

---

## Performance Requirements

- CSS variable application: < 1ms
- Theme provider render: < 10ms
- No layout shifts when theme applies
- No flash of unstyled content (FOUC)

---

## Commands to Run

```bash
# Search for hardcoded colors
cd HockeyLifeHL
npx grep -r "#1F4FD8" src/
npx grep -r "#D72638" src/
npx grep -r "#FFD700" src/
npx grep -r "#E31837" src/
npx grep -r "#0066CC" src/

# Build and verify
npm run build

# Test locally
npm run dev
# Visit http://localhost:3000 (platform)
# Visit http://pilot.beerleaguehockey.local:3000 (pilot - after hosts file)
```

---

## Report Format

After completing, update `D:\B3\dev\HockeyLeague\AGENT_PROGRESS.md`:

```markdown
## Agent 3: Frontend - Dynamic Branding & Instance Separation

**Status:** 🟢 Complete
**Completed:** [Date]

### Summary
- Created LeagueThemeProvider with CSS variables
- Updated 15 components to use dynamic branding
- Separated pilot league to subdomain
- Created branding settings page with preview
- Removed all hardcoded colors from codebase

### Files Created/Updated
- src/components/providers/LeagueThemeProvider.tsx (new)
- src/components/league/LeagueHeader.tsx (new)
- src/app/(dashboard)/[league]/settings/branding/page.tsx (new)
- src/components/settings/BrandingForm.tsx (new)
- src/components/ui/button.tsx (updated)
- [List 10+ other updated component files]

### Components Updated
1. Button component - CSS variables
2. Badge component - CSS variables
3. DashboardNav - CSS variables
4. TeamCard - CSS variables
5. GameCard - CSS variables
6. SchedulePage - CSS variables
7. StandingsPage - CSS variables
8. StatsPage - CSS variables
9. [Continue list...]

### Test Results
- Platform site branding: ✓
- Pilot league branding: ✓
- Theme switching: ✓
- Settings page: ✓
- No hardcoded colors remaining: ✓
- All browsers tested: ✓

### Next Agent
Agent 4 can now proceed with scorekeeper testing.
```

---

## Questions?

If you encounter issues:
1. Check that Agent 2 completed league context provider
2. Verify CSS variables are being set in browser DevTools
3. Test with browser cache disabled
4. Use React DevTools to inspect context values

**Ready to start? Verify Agent 2 is complete, then begin with Task #1.**
