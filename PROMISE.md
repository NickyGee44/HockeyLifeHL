# PROMISE.md - Orchestration State File

**Last Updated:** 2026-02-04
**Session:** Active
**Mode:** Single-Orchestrator (5 parallel agents)
**Sprint:** Platform 2 League Sites UI/UX Overhaul

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (Main Claude Code Session)                   │
│  - Coordinates 5 parallel agents                           │
│  - Manages task queue                                      │
│  - Merges results and resolves conflicts                   │
├─────────────────────────────────────────────────────────────┤
│  Agent 1: Layout & ScoreTicker (ticker above nav)          │
│  Agent 2: Schedule Page (BMHL centered card layout)        │
│  Agent 3: ScheduleTable + WeekPicker components            │
│  Agent 4: Branding (Beer League Hockey everywhere)         │
│  Agent 5: CSS + HomePage + Pages polish                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Brand Identity

- **Product Name:** Beer League Hockey (NOT HockeyLifeHL)
- **Domain:** beerleaguehockey.ca
- **Logo:** /public/logo.png
- **Icons/Favicons:** /public/icons/
- **Design System:** .claude/BRAND-KIT.md v2.0
- **Colors:** Gold (#D4AF37) + Black (#0a0a0a) premium palette
- **Font:** Inter

---

## Current Sprint: Platform 2 UI/UX Overhaul

### Design Spec (BMHL-Style)

The schedule/game pages follow a 3-zone architecture:
- **Zone A:** Score ticker (ABOVE navigation bar) - horizontal scroll of recent/live games
- **Zone B:** Navigation bar - league logo left, nav center, actions right
- **Zone C:** Content - centered card with filters + schedule table

### Task Queue

| # | Task | Agent | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Move ScoreTicker ABOVE LeagueHeader in layout | Agent 1 | `completed` | Per BMHL spec |
| 2 | Redesign ScoreTicker with rink/division/status | Agent 1 | `completed` | 3-row card layout |
| 3 | Redesign Schedule page as centered card | Agent 2 | `completed` | Elevated card, shadow, rounded |
| 4 | Add date-grouped daily schedule | Agent 2 | `completed` | Full date dividers |
| 5 | Redesign ScheduleTable with matchup rows | Agent 3 | `completed` | Away @ Home, gold header |
| 6 | Redesign WeekPicker as date range + day summary | Agent 3 | `completed` | Split into WeekRangeNav + WeekDaySummary |
| 7 | Rename all HockeyLifeHL → Beer League Hockey | Agent 4 | `completed` | 7 files updated, 0 remaining |
| 8 | Update globals.css with new schedule styles | Agent 5 | `completed` | 9 new CSS sections |
| 9 | Polish HomePage with updated components | Agent 5 | `completed` | View Full Schedule CTA added |
| 10 | Update ScheduleFilters with inline dropdowns | Agent 3 | `completed` | Equal width native selects |

---

## Key Files (Platform 2 - league-sites)

### Layout
- `apps/league-sites/src/app/[leagueSlug]/layout.tsx` - Main layout (ticker + nav + content)
- `apps/league-sites/src/components/LeagueHeader.tsx` - Navigation bar
- `apps/league-sites/src/components/LeagueFooter.tsx` - Footer
- `apps/league-sites/src/components/ScoreTicker.tsx` - Score ticker

### Schedule
- `apps/league-sites/src/app/[leagueSlug]/schedule/page.tsx` - Schedule page
- `apps/league-sites/src/components/schedule/ScheduleTable.tsx` - Game table
- `apps/league-sites/src/components/schedule/WeekPicker.tsx` - Week navigation
- `apps/league-sites/src/components/schedule/ScheduleFilters.tsx` - Dropdown filters

### Data & Types
- `apps/league-sites/src/lib/data.ts` - Data fetching functions
- `apps/league-sites/src/lib/types.ts` - TypeScript types
- `apps/league-sites/src/app/globals.css` - Global styles with CSS variables

### Assets
- `/public/logo.png` - Beer League Hockey logo
- `/public/icons/` - Icons and favicons

---

## Design Rules (DO NOT CHANGE)

1. ❌ Do not convert to monthly calendar
2. ❌ Do not hide sponsor slot area
3. ❌ Do not collapse weekday summary
4. ❌ Do not merge ticker + schedule into one component
5. ❌ Do not over-compact game rows
6. ✅ Keep information hierarchy: ticker → nav → filters → schedule
7. ✅ Week-based navigation (not month-based)
8. ✅ Chronological feed grouped by date
9. ✅ Centered card layout for main content
10. ✅ Use "@" symbol instead of "vs" in matchups

---

## Completed Today (2026-02-04)

- [x] Read all context files (CLAUDE.md, PROMISE.md, BRAND-KIT.md)
- [x] Analyzed existing league-sites components
- [x] Created orchestration plan
- [x] Agent 1: Layout + ScoreTicker redesign (ticker above nav, 3-row cards, arrow nav)
- [x] Agent 2: Schedule page redesign (centered card, date grouping, date range nav)
- [x] Agent 3: ScheduleTable + WeekPicker + ScheduleFilters redesign (gold headers, @ matchups, split week picker)
- [x] Agent 4: Beer League Hockey branding (7 files, 0 remaining HockeyLifeHL refs)
- [x] Agent 5: CSS + pages polish (9 new CSS sections, home CTA, pages verified)
- [x] TypeScript build verification: PASS (0 errors)

---
