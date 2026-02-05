# League Sites Homepage Premium Redesign Plan

## Executive Summary

This document outlines a comprehensive redesign plan for the `league-sites` homepage template to create a premium, professional experience comparable to ESPN, NHL.com, and TheScore. The redesign focuses on modern visual design, smooth animations, and an ESPN-style score ticker while maintaining the existing multi-tenant theming system.

**Current State:** Basic functional homepage with hero section, game cards, standings widget, and quick links.

**Target State:** Premium sports media experience with animated hero, ESPN-style score ticker, card-based game layouts, interactive standings, stats leader carousel, and mobile-first responsive design.

---

## Table of Contents

1. [Hero Section Redesign](#1-hero-section-redesign)
2. [Premium Score Ticker](#2-premium-score-ticker)
3. [Games Section](#3-games-section)
4. [Standings Widget](#4-standings-widget)
5. [Stats Leaders Section](#5-stats-leaders-section)
6. [News/Announcements](#6-newsannouncements)
7. [Mobile Optimization](#7-mobile-optimization)
8. [Implementation Phases](#8-implementation-phases)
9. [Technical Architecture](#9-technical-architecture)

---

## 1. Hero Section Redesign

### Current Implementation
**File:** `apps/league-sites/src/app/[leagueSlug]/page.tsx` (Lines 33-108)

The current hero section includes:
- Gradient background with league colors
- Optional banner image overlay (20% opacity)
- Centered league logo and name
- Description text
- 4-column stats grid (Teams, Players, Games Played, Upcoming)

### Proposed Redesign

#### Visual Design
```
+------------------------------------------------------------------+
|  [ANIMATED PARTICLE BACKGROUND WITH LEAGUE COLORS]               |
|                                                                  |
|     +--------+                                                   |
|     | LOGO   |   LEAGUE NAME                                     |
|     +--------+   "Tagline or Description"                        |
|                                                                  |
|   +----------+  +----------+  +----------+  +----------+         |
|   |   42     |  |   386    |  |   128    |  |   24     |         |
|   |  Teams   |  | Players  |  |  Games   |  | Upcoming |         |
|   +----------+  +----------+  +----------+  +----------+         |
|          [ANIMATED COUNTERS - COUNT UP ON SCROLL]                |
|                                                                  |
|   [ Register Your Team ]   [ View Schedule ]                     |
|        (Primary CTA)         (Secondary CTA)                     |
|                                                                  |
+------------------------------------------------------------------+
```

#### New Features

1. **Animated Stats Counters**
   - Count-up animation triggered on viewport entry
   - Uses `framer-motion` or CSS counters
   - Staggered animation delays for visual interest

2. **Dynamic Background**
   - Subtle animated gradient shift
   - Optional video background support
   - Particle effect overlay (optional, performance-conscious)

3. **Call-to-Action Buttons**
   - Primary: "Register Your Team" / "Join the League"
   - Secondary: "View Schedule" / "See Standings"
   - Configurable per-league via database

4. **Responsive Typography**
   - Fluid typography scaling with `clamp()`
   - Better hierarchy with weighted fonts

#### Component Structure

```
apps/league-sites/src/components/home/
  HeroSection.tsx           # Main hero container
  AnimatedCounter.tsx       # Reusable animated number component
  HeroBackground.tsx        # Animated gradient/particle background
  HeroCTA.tsx              # Call-to-action button group
```

#### Complexity: Medium
- Estimated effort: 8-12 hours
- Dependencies: `framer-motion` (optional), Intersection Observer API

---

## 2. Premium Score Ticker

### Current Implementation
**File:** `apps/league-sites/src/components/ScoreTicker.tsx` (341 lines)

Current features:
- Horizontal scrolling with CSS animation
- Game cards showing date, venue, teams, scores
- Live game indicator with pulsing dot
- Pause on hover
- Left/right navigation arrows

### Proposed Redesign

#### Visual Design (ESPN-Style)
```
+------------------------------------------------------------------+
| < | [LIVE] BOS 3 - 2 NYR | Final: CHI 4-1 DET | 7:30 PM: LA @ SF | > |
+------------------------------------------------------------------+
    [Click to expand for game details]
```

**Expanded Card View:**
```
+---------------------------+
| Jan 15 | Madison Arena    |
|-------------------------- |
|   [Logo] Bruins      3    |
|   [Logo] Rangers     2    |
|---------------------------|
| LIVE - 2nd Period 12:34   |
|---------------------------|
| [Box Score] [Game Center] |
+---------------------------+
```

#### New Features

1. **Live Game Highlighting**
   - Pulsing red "LIVE" badge
   - Real-time score updates (WebSocket ready)
   - Period/time display for live games
   - Flashing animation on score changes

2. **Click-to-Expand Details**
   - Modal or dropdown expansion
   - Quick box score preview
   - Link to full game page
   - Three stars of the game (if available)

3. **Smart Auto-Scroll**
   - Prioritize live games (appear first)
   - Pause when user interacts
   - Smooth infinite scroll with duplicated content
   - Keyboard navigation support (accessibility)

4. **Compact vs Full Mode**
   - Compact: Single line with scores only
   - Full: Current card-based view
   - User preference toggle

#### Component Structure

```
apps/league-sites/src/components/ticker/
  ScoreTickerV2.tsx         # Main ticker container
  TickerGameCard.tsx        # Individual game card
  TickerExpandedView.tsx    # Expanded game details modal
  LiveIndicator.tsx         # Animated live game badge
  TickerControls.tsx        # Navigation and settings
```

#### API Additions

```typescript
// lib/types.ts - Extended TickerGame type
interface TickerGameExtended extends TickerGame {
  three_stars?: {
    first: { player_name: string; team_id: string };
    second: { player_name: string; team_id: string };
    third: { player_name: string; team_id: string };
  } | null;
  goals_summary?: {
    period: number;
    time: string;
    scorer: string;
    team_id: string;
  }[];
}
```

#### Complexity: High
- Estimated effort: 16-20 hours
- Dependencies: Intersection Observer, potential WebSocket for real-time
- Performance considerations: Virtualization for many games

---

## 3. Games Section

### Current Implementation
**Files:**
- `apps/league-sites/src/app/[leagueSlug]/page.tsx` (Lines 110-189)
- `apps/league-sites/src/components/GameCard.tsx` (131 lines)

Current features:
- Two-column layout (games | sidebar)
- Upcoming Games section with GameCard components
- Recent Results section
- Simple card-based design

### Proposed Redesign

#### Visual Design
```
UPCOMING GAMES                              [View All Schedule >]
+-------------------+  +-------------------+  +-------------------+
| SAT JAN 15        |  | SUN JAN 16        |  | MON JAN 17        |
| 7:30 PM           |  | 3:00 PM           |  | 8:00 PM           |
|-------------------|  |-------------------|  |-------------------|
| [BOS]   vs  [NYR] |  | [CHI]   @  [DET] |  | [LA]   vs  [SF]  |
| Bruins    Rangers |  | Hawks     Wings   |  | Kings    Giants  |
|-------------------|  |-------------------|  |-------------------|
| Madison Arena     |  | United Center     |  | Staples Center   |
| Division A        |  | Division B        |  | Playoffs R1 G3   |
+-------------------+  +-------------------+  +-------------------+

RECENT RESULTS                              [View All Results >]
+-------------------+  +-------------------+  +-------------------+
| FINAL             |  | FINAL             |  | FINAL - OT        |
| Jan 14            |  | Jan 13            |  | Jan 12            |
|-------------------|  |-------------------|  |-------------------|
| [BOS]  4  -  2    |  | [CHI]  1  -  4    |  | [LA]   3  -  2    |
| Bruins    Rangers |  | Hawks     Wings   |  | Kings    Giants  |
|-------------------|  |-------------------|  |-------------------|
| 3 Stars: Smith,   |  | 3 Stars: Jones,   |  | GWG: Johnson      |
| Johnson, Williams |  | Brown, Davis      |  | (2nd OT)          |
+-------------------+  +-------------------+  +-------------------+
```

#### New Features

1. **Card-Based Horizontal Scroll**
   - Swipeable on mobile
   - Snap scrolling for clean stops
   - Peek effect showing partial next card

2. **Rich Game Information**
   - Game type badges (Regular, Playoffs, Exhibition)
   - Division/Conference context
   - Overtime/Shootout indicators
   - Three stars summary for completed games

3. **Quick Actions**
   - "Preview" button for upcoming games
   - "Box Score" button for completed games
   - Add to calendar (ICS export)
   - Share game link

4. **Visual Enhancements**
   - Team colors as accent borders/gradients
   - Hover animations with score preview
   - Winning team highlight

#### Component Structure

```
apps/league-sites/src/components/home/
  GamesSection.tsx          # Container with tabs/sections
  UpcomingGamesRow.tsx      # Horizontal scroll container
  RecentResultsRow.tsx      # Horizontal scroll container
  GameCardV2.tsx            # Enhanced game card
  GameCardSkeleton.tsx      # Loading state
  GameQuickActions.tsx      # Action buttons overlay
```

#### Complexity: Medium
- Estimated effort: 12-16 hours
- Dependencies: `embla-carousel` (optional) for smooth scrolling

---

## 4. Standings Widget

### Current Implementation
**File:** `apps/league-sites/src/components/StandingsWidget.tsx` (75 lines)

Current features:
- Simple table showing top 5 teams
- Team logo, name, W, L, PTS columns
- League primary color for points

### Proposed Redesign

#### Visual Design
```
STANDINGS                          [Full Standings >]
+--------------------------------------------------+
| [Division A] [Division B] [League]               |
+--------------------------------------------------+
| #  | Team              | W  | L | OTL | PTS | GB |
|----|-------------------|----|----|-----|-----|---|
| 1  | [Logo] Bruins     | 24 | 8 | 3   | 51  | -  |
|    |        +2 (up)    |    |   |     |     |    |
|----|-------------------|----|----|-----|-----|---|
| 2  | [Logo] Rangers    | 22 | 10| 2   | 46  | 5  |
|    |        -- (same)  |    |   |     |     |    |
|----|-------------------|----|----|-----|-----|---|
| 3  | [Logo] Hawks      | 20 | 12| 3   | 43  | 8  |
|    |        -1 (down)  |    |   |     |     |    |
+--------------------------------------------------+
```

#### New Features

1. **Division Tabs**
   - Tab navigation for multi-division leagues
   - "League" tab for overall standings
   - Animated tab switching

2. **Rank Change Indicators**
   - Green up arrow for moved up
   - Red down arrow for moved down
   - Gray dash for no change
   - Animated entrance for rank changes

3. **Enhanced Stats**
   - Games Back (GB) column
   - Win streak indicator
   - Last 10 games record
   - Hover to show full stats

4. **Visual Polish**
   - Playoff position line (top 8 highlighted)
   - Clinched playoff indicator
   - Eliminated indicator (faded)
   - Row hover with full stats tooltip

#### Component Structure

```
apps/league-sites/src/components/home/
  StandingsWidgetV2.tsx     # Main widget container
  StandingsTabs.tsx         # Division/league tabs
  StandingsRow.tsx          # Individual team row
  RankChangeIndicator.tsx   # Up/down/same animation
  PlayoffLine.tsx           # Visual playoff cutoff
```

#### Data Additions

```typescript
// lib/types.ts - Extended TeamStanding
interface TeamStandingExtended extends TeamStanding {
  rank_change: number;        // +2, -1, 0
  games_back: number | null;
  playoff_position: 'clinched' | 'in' | 'out' | null;
  last_10_wins: number;
  last_10_losses: number;
}
```

#### Complexity: Medium
- Estimated effort: 10-14 hours
- Dependencies: None additional

---

## 5. Stats Leaders Section

### Current Implementation
**File:** `apps/league-sites/src/components/StatsLeadersTabs.tsx` (137 lines)

Current features:
- Tab navigation (Points, Goals, Assists)
- Table-based display
- Medal icons for top 3
- Hidden columns on mobile

### Proposed Redesign

#### Visual Design
```
STATS LEADERS                      [Full Stats >]
+--------------------------------------------------+
| [Points] [Goals] [Assists] [Goalies]             |
+--------------------------------------------------+
|  +--------+   +--------+   +--------+            |
|  | [Photo]|   | [Photo]|   | [Photo]|            |
|  | #1     |   | #2     |   | #3     |            |
|  | Smith  |   | Jones  |   | Brown  |            |
|  | Bruins |   | Rangers|   | Hawks  |            |
|  |  42    |   |  38    |   |  35    |  <<<       |
|  | points |   | points |   | points |            |
|  +--------+   +--------+   +--------+            |
+--------------------------------------------------+
           [ < ]  [1] [2] [3]  [ > ]
```

#### New Features

1. **Player Card Carousel**
   - Swipeable cards with player photos
   - Team colors as card accents
   - Dot pagination or number indicators
   - Auto-advance (optional)

2. **Rich Player Data**
   - Player photo with fallback avatar
   - Jersey number display
   - Team logo alongside name
   - Key stat prominently displayed

3. **Category Tabs**
   - Points, Goals, Assists (Skaters)
   - Wins, GAA, Save% (Goalies)
   - Smooth tab transitions

4. **Interactive Elements**
   - Click card for player profile
   - Hover for quick stats popup
   - "Compare Players" feature (future)

#### Component Structure

```
apps/league-sites/src/components/home/
  StatsLeadersSection.tsx   # Main container
  StatsCarousel.tsx         # Embla carousel wrapper
  PlayerLeaderCard.tsx      # Individual player card
  GoalieLeaderCard.tsx      # Goalie-specific card
  StatsCategoryTabs.tsx     # Category navigation
```

#### Complexity: Medium-High
- Estimated effort: 12-16 hours
- Dependencies: `embla-carousel-react` for carousel

---

## 6. News/Announcements

### Current Implementation
**Not currently implemented** - Quick Links section exists but no news feed.

### Proposed Design

#### Visual Design
```
LEAGUE NEWS                        [All News >]
+--------------------------------------------------+
| FEATURED                                         |
| +----------------------------------------------+ |
| | [Banner Image]                               | |
| | Playoffs Begin Next Week!                    | |
| | The excitement builds as 8 teams prepare...  | |
| | Jan 15, 2024                                 | |
| +----------------------------------------------+ |
|                                                  |
| RECENT                                           |
| +--------------------+  +--------------------+   |
| | Trade Deadline     |  | All-Star Roster    |  |
| | Recap              |  | Announced          |  |
| | Jan 14, 2024       |  | Jan 13, 2024       |  |
| +--------------------+  +--------------------+   |
+--------------------------------------------------+

SOCIAL FEED (Optional)              [@LeagueName]
+--------------------------------------------------+
| [Twitter/X embed or custom feed]                 |
+--------------------------------------------------+
```

#### New Features

1. **League Announcements**
   - Featured announcement with image
   - Recent announcements list
   - Markdown content support
   - Category tags (News, Events, Rules)

2. **Social Media Integration**
   - Twitter/X timeline embed
   - Instagram feed preview
   - Custom social links

3. **Event Calendar Preview**
   - Upcoming events widget
   - Registration deadlines
   - Important dates

#### Component Structure

```
apps/league-sites/src/components/home/
  NewsSection.tsx           # Main news container
  FeaturedAnnouncement.tsx  # Hero announcement card
  AnnouncementCard.tsx      # Small announcement card
  SocialFeed.tsx            # Social media embed
  UpcomingEvents.tsx        # Events calendar widget
```

#### Database Additions

```sql
-- New table for league announcements
CREATE TABLE league_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'news',
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Complexity: Medium
- Estimated effort: 10-14 hours
- Dependencies: Social embed libraries (optional)

---

## 7. Mobile Optimization

### Current Implementation
- Basic responsive design with Tailwind breakpoints
- Single-column layout on mobile
- Hamburger menu navigation

### Proposed Enhancements

#### Touch-Friendly Interactions

1. **Swipe Gestures**
   - Swipe score ticker left/right
   - Swipe game cards in carousel
   - Pull-to-refresh (PWA consideration)

2. **Touch Targets**
   - Minimum 44x44px for all interactive elements
   - Adequate spacing between buttons
   - Larger tap areas for cards

3. **Collapsible Sections**
   - Accordion pattern for dense content
   - "Show More" for standings
   - Expandable game details

#### Bottom Navigation Consideration

```
+--------------------------------------------------+
|                  [Page Content]                  |
+--------------------------------------------------+
| [Home] [Schedule] [Standings] [Teams] [More]     |
+--------------------------------------------------+
```

- Fixed bottom nav for key sections
- Replaces hamburger menu on mobile
- Active state with league primary color

#### Component Structure

```
apps/league-sites/src/components/mobile/
  BottomNavigation.tsx      # Fixed bottom nav
  SwipeableCarousel.tsx     # Touch-optimized carousel
  CollapsibleSection.tsx    # Accordion component
  PullToRefresh.tsx         # PWA refresh pattern
```

#### Complexity: Medium
- Estimated effort: 8-12 hours
- Dependencies: Touch gesture library (optional)

---

## 8. Implementation Phases

### Phase 1: Core Experience (Weeks 1-2)
**Focus:** Score ticker + Hero section

| Component | File Path | Effort | Priority |
|-----------|-----------|--------|----------|
| ScoreTickerV2 | `components/ticker/ScoreTickerV2.tsx` | 16h | P0 |
| HeroSection | `components/home/HeroSection.tsx` | 8h | P0 |
| AnimatedCounter | `components/home/AnimatedCounter.tsx` | 4h | P1 |
| HeroBackground | `components/home/HeroBackground.tsx` | 4h | P2 |

**Deliverables:**
- Upgraded score ticker with ESPN-style design
- Animated hero section with count-up stats
- CTA buttons with configurable links

**Testing:**
- Visual regression tests
- Mobile responsiveness
- Performance benchmarks (Core Web Vitals)

### Phase 2: Games + Standings (Weeks 3-4)
**Focus:** Card-based games layout + interactive standings

| Component | File Path | Effort | Priority |
|-----------|-----------|--------|----------|
| GameCardV2 | `components/home/GameCardV2.tsx` | 8h | P0 |
| GamesSection | `components/home/GamesSection.tsx` | 6h | P0 |
| StandingsWidgetV2 | `components/home/StandingsWidgetV2.tsx` | 10h | P0 |
| StandingsTabs | `components/home/StandingsTabs.tsx` | 4h | P1 |

**Deliverables:**
- Horizontal scrolling game cards
- Division tabs for standings
- Rank change animations
- Quick action buttons

**Testing:**
- Multi-division league testing
- Empty state handling
- Scroll performance on mobile

### Phase 3: Stats + News (Weeks 5-6)
**Focus:** Stats leaders carousel + news/announcements

| Component | File Path | Effort | Priority |
|-----------|-----------|--------|----------|
| StatsLeadersSection | `components/home/StatsLeadersSection.tsx` | 12h | P0 |
| PlayerLeaderCard | `components/home/PlayerLeaderCard.tsx` | 6h | P0 |
| NewsSection | `components/home/NewsSection.tsx` | 10h | P1 |
| AnnouncementCard | `components/home/AnnouncementCard.tsx` | 4h | P1 |

**Database Migration:**
```sql
-- Phase 3 migration
CREATE TABLE league_announcements (...);
ALTER TABLE leagues ADD COLUMN social_links JSONB;
```

**Deliverables:**
- Player card carousel
- Goalie stats support
- News/announcement feed
- Social media integration

### Phase 4: Mobile Polish (Week 7)
**Focus:** Mobile-first refinements

| Component | File Path | Effort | Priority |
|-----------|-----------|--------|----------|
| BottomNavigation | `components/mobile/BottomNavigation.tsx` | 6h | P1 |
| SwipeableCarousel | `components/mobile/SwipeableCarousel.tsx` | 4h | P1 |
| CollapsibleSection | `components/mobile/CollapsibleSection.tsx` | 4h | P2 |

**Deliverables:**
- Bottom navigation bar
- Touch-optimized carousels
- Collapsible sections
- Performance optimization

---

## 9. Technical Architecture

### File Structure (Final)

```
apps/league-sites/src/
  app/
    [leagueSlug]/
      page.tsx                    # Updated homepage
      layout.tsx                  # Unchanged
  components/
    home/
      HeroSection.tsx
      HeroBackground.tsx
      HeroCTA.tsx
      AnimatedCounter.tsx
      GamesSection.tsx
      GameCardV2.tsx
      StandingsWidgetV2.tsx
      StandingsTabs.tsx
      StandingsRow.tsx
      StatsLeadersSection.tsx
      StatsCarousel.tsx
      PlayerLeaderCard.tsx
      GoalieLeaderCard.tsx
      NewsSection.tsx
      FeaturedAnnouncement.tsx
      AnnouncementCard.tsx
    ticker/
      ScoreTickerV2.tsx
      TickerGameCard.tsx
      TickerExpandedView.tsx
      LiveIndicator.tsx
      TickerControls.tsx
    mobile/
      BottomNavigation.tsx
      SwipeableCarousel.tsx
      CollapsibleSection.tsx
    shared/
      TeamLogo.tsx               # Existing
      ProgressBar.tsx            # Existing
  lib/
    types.ts                     # Extended types
    data.ts                      # New data fetching functions
    animations.ts                # Shared animation configs
```

### New Dependencies

```json
{
  "dependencies": {
    "framer-motion": "^10.x",        // Animations
    "embla-carousel-react": "^8.x",  // Carousels
    "@radix-ui/react-tabs": "^1.x",  // Accessible tabs
    "@radix-ui/react-accordion": "^1.x" // Collapsible sections
  }
}
```

### CSS Variables Additions

```css
/* globals.css additions */
:root {
  /* Animation timing */
  --animation-fast: 150ms;
  --animation-normal: 300ms;
  --animation-slow: 500ms;

  /* Carousel/scroll */
  --scroll-snap-type: x mandatory;
  --scroll-snap-align: start;

  /* Mobile bottom nav */
  --bottom-nav-height: 64px;
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
}
```

### Performance Considerations

1. **Lazy Loading**
   - Below-fold sections load on scroll
   - Images use Next.js `Image` with lazy loading
   - Stats/standings fetch on viewport entry

2. **Code Splitting**
   - Dynamic imports for heavy components
   - Route-based splitting (already in place)

3. **Caching Strategy**
   - ISR for league data (revalidate: 60)
   - Client-side SWR for real-time data
   - Score ticker polling (30s interval)

4. **Bundle Size**
   - Tree-shake unused Framer Motion features
   - Use CSS animations where possible
   - Consider Preact for ticker (if needed)

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Performance | ~75 | 90+ |
| First Contentful Paint | ~2.5s | <1.5s |
| Largest Contentful Paint | ~4.0s | <2.5s |
| Cumulative Layout Shift | ~0.15 | <0.1 |
| Time to Interactive | ~5.0s | <3.5s |
| Mobile Usability Score | 85% | 100% |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Animation performance on low-end devices | High | Use `prefers-reduced-motion`, CSS fallbacks |
| Bundle size increase | Medium | Code splitting, dynamic imports |
| Breaking existing themes | High | Preserve CSS variable system, QA all leagues |
| Data fetching complexity | Medium | Incremental adoption, fallback to current |
| Timeline overrun | Medium | Phased delivery, MVP each phase |

---

## Appendix: Current File References

### Files to Modify
- `apps/league-sites/src/app/[leagueSlug]/page.tsx` - Homepage
- `apps/league-sites/src/app/[leagueSlug]/layout.tsx` - Layout (score ticker position)
- `apps/league-sites/src/app/globals.css` - New CSS variables and animations
- `apps/league-sites/src/lib/types.ts` - Extended type definitions
- `apps/league-sites/src/lib/data.ts` - New data fetching functions

### Files to Create
See [File Structure (Final)](#file-structure-final) section above.

### Files to Deprecate (After Migration)
- `apps/league-sites/src/components/ScoreTicker.tsx` - Replace with V2
- `apps/league-sites/src/components/StandingsWidget.tsx` - Replace with V2
- `apps/league-sites/src/components/GameCard.tsx` - Replace with V2

---

*Document Version: 1.0*
*Last Updated: February 5, 2026*
*Author: Claude Code*
