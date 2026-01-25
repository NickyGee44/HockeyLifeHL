# LeagueOS UI/UX Guide (formerly HockeyLifeHL)

## 1. Vision & Strategy

**Platform Name:** LeagueOS
**Current Instance:** HockeyLifeHL (The "Pilot" League)

**Goal:** Transform the single-tenant "HockeyLifeHL" application into a multi-tenant SaaS platform ("LeagueOS"). The current codebase will serve as the **Reference Implementation** and **Template** for all future leagues.

**Core UX Philosophy:**
*   **"League First" Identity:** The UI must adapt to the specific league's branding (Logo, Name, Colors, Slogan) without code changes.
*   **Professional yet Fun:** Maintain the "Arena" vibe but ensure the underlying structure is clean, responsive, and professional enough for any recreational league.
*   **Mobile-First Management:** Captains and Players primarily interact via mobile (locker room, bench). All key features (Stats, Schedule, Draft) must be perfect on mobile.

## 2. Current UI/UX Status

**Theme: Canadian Hockey (Pilot League Configuration)**
*   **Colors:** Mapped to CSS variables (`--primary`, `--secondary`, etc.) which allows for easy "Theming" by future tenants.
*   **Structure:** Next.js App Router with `Header` / `Footer` layout.

**Identified Issues for SaaS Scalability:**
*   **Hardcoded Branding:** "HockeyLifeHL" and specific slogans are hardcoded in components.
*   **Navigation Logic:** The `Header` component tightly couples navigation items with the layout.
*   **Mobile Experience:** Complex views (Draft Board, Schedule) need optimization for small screens.

## 3. Template Architecture Plan

To enable the "LeagueOS" vision, we are implementing a Configuration Pattern:

1.  **League Configuration:** A centralized config (e.g., `lib/league-config.ts`) will hold all branding and feature flags.
2.  **Dynamic Components:** `Header`, `Footer`, and other structural components will consume this config.
3.  **Theme Injection:** CSS variables will be set based on the league's configuration (future state).

## 4. Recommendations for Improvement

### Immediate Actions (Template Refactoring)
*   [ ] **Refactor Header/Footer:** Replace hardcoded strings with `currentLeague` config values.
*   [ ] **Mobile Responsiveness:** Polish `LiveDraftBoard` to be a "best-in-class" mobile experience.
*   [ ] **Consistency:** Ensure all components use `var(--primary)` instead of hardcoded colors.

### Long-term Goals
*   **Theme Editor:** A UI for League Admins to pick their primary/secondary colors and upload logos.
*   **Menu Builder:** Allow admins to toggle features (e.g., disable "News" if they don't use it).

## 5. AI Request Section

*Use this section to log requests for the AI to perform UI/UX specific tasks.*

### Pending Requests
*   **Refactor Header:** Update `src/components/layout/Header.tsx` to use `lib/league-config.ts`.
*   **Refactor Footer:** Update `src/components/layout/Footer.tsx` to use `lib/league-config.ts`.
*   **Mobile Polish:** Optimize `src/components/draft/LiveDraftBoard.tsx` for mobile.

### Completed Requests
*   **Initial Audit:** Completed review of `globals.css` and directory structure.
*   **Config Setup:** Created `src/lib/league-config.ts`.

## 6. Notes & Task Tracking

**Current Focus:** Finished comprehensive mobile/UX optimization across all core player and captain views. The "Reference Implementation" is now highly responsive and user-friendly for PWA usage.

**Task List:**
- [x] Analyze `globals.css` and Theme.
- [x] Map out component structure.
- [x] Create `league-config.ts`.
- [x] Refactor `Header.tsx` to use config.
- [x] Refactor `Footer.tsx` to use config.
- [x] Optimize `LiveDraftBoard.tsx` for mobile.
- [x] Optimize `GameStatEntryModal.tsx` for mobile.
- [x] Optimize `ScheduleView.tsx` for mobile.
- [x] Optimize `Standings` and `Stats` tables for mobile.
- [x] Optimize `DashboardPage` (Overview) for mobile.
- [x] Fixed mobile dialog scrolling issues across all Admin and Captain forms (Create Season, Team, etc.).

---
*Last Updated: January 24, 2026*
